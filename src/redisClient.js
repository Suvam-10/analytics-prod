const Redis = require("ioredis");
const config = require("./config");

const redisUrl = config && config.redisUrl ? config.redisUrl : (process.env.REDIS_URL || "redis://redis:6379");

// Create Redis client with error handling and auto-reconnect
const client = new Redis(redisUrl, {
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  reconnectOnError: (err) => {
    const targetError = 'READONLY';
    if (err.message.includes(targetError)) {
      return true;
    }
    return false;
  },
  enableReadyCheck: false,
  enableOfflineQueue: false,
  maxRetriesPerRequest: 3
});

client.on("error", (err) => console.warn("Redis Client Error (non-blocking):", err.message));
client.on("connect", () => console.log("Connected to Redis at", redisUrl));
client.on("reconnecting", () => console.log("Reconnecting to Redis..."));

module.exports = client;
