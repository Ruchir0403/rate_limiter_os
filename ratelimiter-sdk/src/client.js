class RateLimiterClient {
    constructor(options = {}) {
        if (!options.apiKey) {
            throw new Error('RateLimiter SDK requires an apiKey');
        }
        this.apiKey = options.apiKey;
        this.baseUrl = options.baseUrl || 'http://localhost:3000'; 
    }

    async check(targetKey) {
        try {
            const response = await fetch(`${this.baseUrl}/v1/check`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({ 
                    apiKey: this.apiKey, 
                    targetKey: targetKey 
                })
            });

            if (!response.ok) {
                // Fail open
                return { allowed: true, remaining: 0 };
            }

            return await response.json();
        } catch (error) {
            console.error('[RateLimiter SDK] Network error, failing open.');
            return { allowed: true, remaining: 0 };
        }
    }
}

module.exports = RateLimiterClient;