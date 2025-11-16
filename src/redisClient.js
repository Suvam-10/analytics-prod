const Redis = require("ioredis");
const config = require("./config");

const redisUrl = config && config.redisUrl ? config.redisUrl : (process.env.REDIS_URL || "redis://redis:6379");

const client = new Redis(redisUrl);

client.on("error", (err) => console.error("Redis Client Error", err));
client.on("connect", () => console.log("Connected to Redis at", redisUrl));

module.exports = client;
