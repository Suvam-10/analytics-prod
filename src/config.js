require("dotenv").config();
module.exports = {
  port: process.env.PORT || 8080,
  databaseUrl: process.env.DATABASE_URL || "postgresql://postgres:postgres@postgres:5432/analytics",
  redisUrl: process.env.REDIS_URL || "redis://redis:6379",
  apiKeySecret: process.env.API_KEY_SECRET || "changeme",
  jwtSecret: process.env.JWT_SECRET || "changeme2",
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "60000", 10),
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || "1000", 10)
};
