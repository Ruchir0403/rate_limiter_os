const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

const PROTO_PATH = path.join(__dirname, '../proto/rate_limiter.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true, longs: String, enums: String, defaults: true, oneofs: true
});
const ratelimiter = grpc.loadPackageDefinition(packageDefinition).ratelimiter;

const client = new ratelimiter.RateLimiter('localhost:50051', grpc.credentials.createInsecure());

console.log('Firing 7 rapid requests to test rate limiting...');

for (let i = 1; i <= 7; i++) {
    setTimeout(() => {
        client.checkLimit({ key: 'user_42', tier: 'PRO' }, (err, response) => {
            if (err) {
                console.error(`Request ${i} Error:`, err);
                return;
            }
            console.log(`Request ${i} -> Allowed: ${response.allowed}, Remaining: ${response.remaining}`);
        });
    }, i * 100); 
}