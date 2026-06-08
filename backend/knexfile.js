import "dotenv/config";

export default {
  client: 'pg',
  connection: process.env.DATABASE_URL ? {
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false } // 👈 CRÍTICO: Requerido por Render
  } : {
    // Configuración local
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 5432,
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
