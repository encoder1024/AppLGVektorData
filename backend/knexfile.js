import "dotenv/config";

export default {
  client: "pg",
  connection: {
    host: import.meta.env.DB_HOST || "localhost",
    user: import.meta.env.DB_USER,
    password: import.meta.env.DB_PASSWORD,
    database: import.meta.env.DB_NAME,
    port: parseInt(import.meta.env.DB_PORT, 10) || 5432,
  },
  migrations: {
    directory: "./src/migrations",
    extension: "js",
    tableName: "knex_migrations",
  },
  seeds: {
    directory: "./src/seeds",
    extension: "js",
  },
};
