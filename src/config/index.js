module.exports = {
  port: process.env.PORT || 8080,
  db: {
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/analytics'
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379'
  },
  apiKey: {
    defaultTtlDays: parseInt(process.env.API_KEY_TTL_DAYS || '365', 10)
  }
};
