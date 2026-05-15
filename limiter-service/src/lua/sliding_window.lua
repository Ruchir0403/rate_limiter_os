local key = KEYS[1]
local now = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])

local clearBefore = now - window

redis.call('ZREMRANGEBYSCORE', key, 0, clearBefore)

local requestCount = redis.call('ZCARD', key)

if requestCount < limit then
    redis.call('ZADD', key, now, now)
    redis.call('PEXPIRE', key, window)
    return {1, limit - requestCount - 1}
else
    return {0, 0}
end