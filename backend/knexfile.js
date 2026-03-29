import 'dotenv/config';

export default {
  client: 'pg',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: parseInt(process.env.DB_PORT, 10) || 5432,
  },
  migrations: {
    directory: './src/migrations',
    extension: 'js',
    tableName: 'knex_migrations'
  },
  seeds: {
    directory: './src/seeds',
    extension: 'js'
  }
};
