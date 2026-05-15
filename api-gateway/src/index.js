const express = require('express');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

const app = express();
app.use(express.json()); 

const PROTO_PATH = path.join(__dirname, '../../proto/rate_limiter.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true, longs: String, enums: String, defaults: true, oneofs: true
});
const ratelimiter = grpc.loadPackageDefinition(packageDefinition).ratelimiter;
const grpcClient = new ratelimiter.RateLimiter('localhost:50051', grpc.credentials.createInsecure());

app.post('/v1/check', (req, res) => {
    const { apiKey, targetKey } = req.body; 

    if (!apiKey) return res.status(401).json({ error: 'Missing SaaS API Key' });

    grpcClient.checkLimit({ key: targetKey }, (err, response) => {
        if (err) {
            console.error('gRPC Error:', err);
            return res.json({ allowed: true, remaining: 0 }); 
        }
        return res.json({
            allowed: response.allowed,
            remaining: response.remaining
        });
    });
});

const PORT = 3000;
app.listen(PORT, () => console.log(`Public API Gateway running on http://localhost:${PORT}`));