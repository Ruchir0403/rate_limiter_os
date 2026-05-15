function expressMiddleware(client, options = {}) {
    return async (req, res, next) => {
        const targetKey = req.ip || req.connection.remoteAddress;

        const result = await client.check(targetKey);

        res.setHeader('X-RateLimit-Remaining', result.remaining);

        if (result.allowed) {
            return next(); 
        } else {
            return res.status(429).json({
                error: 'Too Many Requests',
                message: options.errorMessage || 'You have exceeded your rate limit.'
            });
        }
    };
}

module.exports = expressMiddleware;