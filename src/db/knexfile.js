const config = (() => {
  try { return require("../config"); } catch (e) { return {}; }
})();

const envDatabaseUrl = process.env.DATABASE_URL || config.databaseUrl;

const connection = envDatabaseUrl || {
  host: process.env.DB_HOST || process.env.POSTGRES_HOST || "postgres",
  port: process.env.DB_PORT || process.env.POSTGRES_PORT || 5432,
  user: process.env.DB_USER || process.env.POSTGRES_USER || "postgres",
  password: process.env.DB_PASSWORD || process.env.POSTGRES_PASSWORD || "postgres",
  database: process.env.DB_NAME || process.env.POSTGRES_DB || "analytics"
};

module.exports = {
  client: "pg",
  connection,
  pool: { min: 2, max: 10 },
  migrations: { directory: __dirname + "/migrations" }
};
