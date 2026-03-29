import express from 'express';
import cors from 'cors';
import 'dotenv/config'; 
import db from './config/db.js';

// Importación de rutas (las dejamos aquí arriba pero las usaremos después)
import authRoutes from './routes/authRoutes.js';
import plcRoutes from './routes/plcRoutes.js';
import calibrationRoutes from './routes/calibrationRoutes.js';
import sensorRoutes from './routes/sensorRoutes.js';
import actuatorRoutes from './routes/actuatorRoutes.js';

const app = express();
const port = process.env.PORT || 3000;

app.use(cors()); 
app.use(express.json());

// 1. LOGGER ABSOLUTO (Debe ser lo primero)
app.use((req, res, next) => {
  console.log(`DEBUG: Recibida petición ${req.method} en ${req.url}`);
  next();
});

// 2. RUTAS DE PRUEBA ULTRA-SIMPLES (Antes que los Routers)
app.get('/api/test_directo', (req, res) => res.json({ message: 'OK DIRECTO' }));

app.get('/api/status', async (req, res) => {
  try {
    const result = await db.raw('SELECT NOW() as now');
    res.json({ 
      status: 'Online', 
      db_time: result.rows[0].now,
      message: 'Hola Knex OK' 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. REGISTRO DE ROUTERS (Aquí podría estar el error)
console.log('📡 Registrando rutas de la API...');
app.use('/api/auth', authRoutes);
app.use('/api/plcs', plcRoutes);
app.use('/api/calibration', calibrationRoutes);
app.use('/api/sensors', sensorRoutes);
app.use('/api/actuators', actuatorRoutes);
console.log('✅ Rutas registradas.');

async function initDB(retries = 15) {
  while (retries > 0) {
    try {
      await db.raw('SELECT 1');
      await db.migrate.latest();
      await db.seed.run();
      console.log('🚀 Base de datos industrial lista.');
      return; 
    } catch (err) {
      retries -= 1;
      console.log(`⚠️ Esperando DB... (${retries})`);
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
  }
}

const HOST = '0.0.0.0';
initDB().then(() => {
  app.listen(port, HOST, () => {
    console.log(`🚀 Servidor en puerto ${port}`);
  });
});
