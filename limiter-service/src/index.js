const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const fs = require('fs');
const Redis = require('ioredis');

const { pool, initializeDB } = require('./config/db'); 
const { connectProducer, logUsageEvent } = require('./config/kafka'); 

const redis = new Redis({ host: '127.0.0.1', port: 6379 });

const luaScript = fs.readFileSync(path.join(__dirname, 'lua', 'sliding_window.lua'), 'utf8');
redis.defineCommand('slidingWindowRateLimit', {
  numberOfKeys: 1,
  lua: luaScript,
});

const PROTO_PATH = path.join(__dirname, '../../proto/rate_limiter.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true, longs: String, enums: String, defaults: true, oneofs: true
});
const ratelimiter = grpc.loadPackageDefinition(packageDefinition).ratelimiter;

const ruleCache = new Map();
const keyCache = new Map();

async function loadRulesIntoCache() {
    console.log('⏳ Loading rules into local memory cache...');
    const tiersRes = await pool.query('SELECT * FROM tiers');
    tiersRes.rows.forEach(row => {
        ruleCache.set(row.name, { limit: row.request_limit, windowMs: row.window_ms });
    });

    const keysRes = await pool.query('SELECT * FROM api_keys');
    keysRes.rows.forEach(row => {
        keyCache.set(row.key, row.tier_name);
    });
    console.log('Cache loaded from DB');
}

async function checkLimit(call, callback) {
    const { key } = call.request; 
    
    const userTier = keyCache.get(key) || 'FREE'; 
    const rules = ruleCache.get(userTier);
    
    const now = Date.now();
    const redisKey = `rate:${key}`;

    try {
        const [allowedFlag, remaining] = await redis.slidingWindowRateLimit(
            redisKey, now, rules.windowMs, rules.limit
        );

        const isAllowed = allowedFlag === 1;

        logUsageEvent(key, isAllowed, remaining);

        callback(null, { allowed: isAllowed, remaining: remaining });
    } catch (err) {
        console.error("Redis Error:", err);
        callback(null, { allowed: true, remaining: 0 }); 
    }
}

async function main() {
    await initializeDB();
    await loadRulesIntoCache();
    
    setInterval(loadRulesIntoCache, 60000); 

    await connectProducer(); 

    const server = new grpc.Server();
    server.addService(ratelimiter.RateLimiter.service, { checkLimit: checkLimit });
    
    const address = '0.0.0.0:50051';
    server.bindAsync(address, grpc.ServerCredentials.createInsecure(), (err, port) => {
        if (err) return console.error(err);
        console.log(`gRPC Rate Limiter Server running at ${address}`);
    });
}

main();