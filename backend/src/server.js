import express from 'express';
import pg from 'pg';
import cors from 'cors';

const app = express();
const port = 3000;

// Middleware
app.use(cors()); // Permite que el Frontend (puerto 5173) consulte al Backend (3000)
app.use(express.json());

console.log("El host es:", process.env.VITE_DB_HOST);

// backend/server.js

const pool = new pg.Pool({
  // Prioridad: 1. Variable de Docker, 2. El nombre del servicio, 3. localhost (solo para local)
  host: process.env.DB_HOST || 'timescaledb', 
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: 5432,
});

// Agregá este log para debuguear en la terminal de Docker
console.log('Intentando conectar a la DB en:', pool.options.host);


// Ruta de prueba para verificar la conexión
app.get('/api/status', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW() as now');
    res.json({ 
      status: 'Online', 
      db_time: result.rows[0].now,
      message: 'Conexión exitosa con TimescaleDB' 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'Error', error: err.message });
  }
});

// Ejemplo de ruta para obtener datos (ajustá según tu tabla)
app.get('/api/data', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM tu_tabla LIMIT 10');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const HOST = '0.0.0.0'; // Escuchar en todas las interfaces de red del contenedor

app.listen(port, HOST, () => {
  console.log(`🚀 Backend corriendo en http://localhost:${port}`);
});
