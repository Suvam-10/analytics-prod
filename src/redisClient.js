const Redis = require("ioredis");
const config = require("./config");

const redisUrl = config && config.redisUrl ? config.redisUrl : (process.env.REDIS_URL || "redis://redis:6379");

const isTest = (process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'testing');

// In test environment avoid immediate connection and noisy console logs.
// Use lazyConnect so tests that don't need Redis won't trigger network errors.
const clientOptions = {
  retryStrategy: (times) => Math.min(times * 50, 2000),
  reconnectOnError: (err) => {
    const targetError = 'READONLY';
    return err && err.message && err.message.includes && err.message.includes(targetError);
  },
  enableReadyCheck: false,
  enableOfflineQueue: false,
  maxRetriesPerRequest: 3,
  lazyConnect: !!isTest
};

const client = new Redis(redisUrl, clientOptions);

if (!isTest) {
  client.on("error", (err) => console.warn("Redis Client Error (non-blocking):", err.message));
  client.on("connect", () => console.log("Connected to Redis at", redisUrl));
  client.on("reconnecting", () => console.log("Reconnecting to Redis..."));
}

module.exports = client;
