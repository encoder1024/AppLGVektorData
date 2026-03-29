import express from 'express';
import cors from 'cors';
import 'dotenv/config'; 
import db from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import plcRoutes from './routes/plcRoutes.js';
import calibrationRoutes from './routes/calibrationRoutes.js';
import sensorRoutes from './routes/sensorRoutes.js';

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors()); 
app.use(express.json());

// Registro de Rutas
app.use('/api/auth', authRoutes);
app.use('/api/plcs', plcRoutes);
app.use('/api/calibration', calibrationRoutes);
app.use('/api/sensors', sensorRoutes);

// Función de Inicialización de Base de Datos con Reintentos Robustos
async function initDB(retries = 15) {
  while (retries > 0) {
    try {
      console.log(`🛠️ Verificando conexión a base de datos... (${retries} intentos restantes)`);

      // Intentar una consulta simple para ver si la DB responde
      await db.raw('SELECT 1');

      console.log('📡 Conexión establecida. Ejecutando migraciones...');
      await db.migrate.latest();
      console.log('✅ Estructura de tablas actualizada.');

      await db.seed.run();
      console.log('✅ Datos iniciales (seeds) procesados.');

      console.log('🚀 Base de datos industrial lista y persistente.');
      return; 
    } catch (err) {
      retries -= 1;
      console.log(`⚠️ Base de datos no disponible (${err.code || 'Buscando...'}). Reintentando en 10s...`);

      if (retries === 0) {
        console.error('❌ Error fatal: No se pudo conectar a la base de datos después de varios minutos.', err);
        process.exit(1);
      }

      // Espera bloqueante de 10 segundos
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
  }
}


// Rutas de prueba básicas
app.get('/api/status', async (req, res) => {
  try {
    const result = await db.raw('SELECT NOW() as now');
    res.json({ 
      status: 'Online', 
      node_env: process.env.NODE_ENV,
      db_time: result.rows[0].now,
      message: 'Sistema de persistencia Knex OK' 
    });
  } catch (err) {
    res.status(500).json({ status: 'Error', error: err.message });
  }
});

const HOST = '0.0.0.0';

// Iniciar base de datos y luego el servidor
initDB().then(() => {
  app.listen(port, HOST, () => {
    console.log(`🚀 Backend industrial (Knex) corriendo en http://localhost:${port}`);
  });
});
