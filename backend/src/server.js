import express from 'express';
import pg from 'pg';
import cors from 'cors';
import 'dotenv/config'; // Carga las variables de entorno de .env automáticamente

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors()); // Permite consultas desde el frontend
app.use(express.json());

// Configuración del Pool de Conexión (Ticket 1.1)
const pool = new pg.Pool({
  // Prioridad: 1. Variable de Docker, 2. DB_HOST del .env, 3. localhost como fallback
  host: process.env.DB_HOST || 'localhost', 
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT, 10) || 5432,
});

console.log('--- Configuración de Conexión ---');
console.log('Modo:', process.env.NODE_ENV);
console.log('Host DB:', pool.options.host);
console.log('Database:', pool.options.database);
console.log('---------------------------------');

// Ruta de prueba para verificar la conexión
app.get('/api/status', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW() as now');
    res.json({ 
      status: 'Online', 
      node_env: process.env.NODE_ENV,
      db_time: result.rows[0].now,
      message: 'Conexión exitosa con TimescaleDB' 
    });
  } catch (err) {
    console.error('Error de conexión:', err.message);
    res.status(500).json({ status: 'Error', error: err.message });
  }
});

// Rutas de API iniciales
app.get('/api/data', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM sensor_readings LIMIT 10');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const HOST = '0.0.0.0'; // Escuchar en todas las interfaces para Docker/Red Local

app.listen(port, HOST, () => {
  console.log(`🚀 Backend industrial corriendo en http://localhost:${port}`);
});
