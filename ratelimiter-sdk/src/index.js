const RateLimiterClient = require('./client');
const expressMiddleware = require('./express');

class RateLimiter {
    constructor(options) {
        this.client = new RateLimiterClient(options);
    }

    async check(targetKey) {
        return await this.client.check(targetKey);
    }

    express(options) {
        return expressMiddleware(this.client, options);
    }
}

module.exports = RateLimiter;