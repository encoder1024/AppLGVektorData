import pg from 'pg';

const pool = new pg.Pool({
  host: import.meta.env.DB_HOST,
  user: import.meta.env.DB_USER,
  password: import.meta.env.DB_PASSWORD,
  database: import.meta.env.DB_NAME,
  port: 5432,
});

console.log('Database connection pool created with config:', {
  host: import.meta.env.DB_HOST,
  user: import.meta.env.DB_USER,}, pool);

export default pool;