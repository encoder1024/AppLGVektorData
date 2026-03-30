import express from 'express';
import cors from 'cors';
import 'dotenv/config'; 
import { createServer } from 'http';
import { Server } from 'socket.io';
import db from './config/db.js';

// Importación de rutas
import authRoutes from './routes/authRoutes.js';
import plcRoutes from './routes/plcRoutes.js';
import calibrationRoutes from './routes/calibrationRoutes.js';
import sensorRoutes from './routes/sensorRoutes.js';
import actuatorRoutes from './routes/actuatorRoutes.js';

// Importación de las nuevas rutas
import auditLogsRoutes from './routes/auditLogsRoutes.js';
import sensorEventsRoutes from './routes/sensorEventsRoutes.js';
import actuatorActionsRoutes from './routes/actuatorActionsRoutes.js';

// Importación de Motor Industrial
import plcManager from './services/plcManager.js';

const app = express();
const httpServer = createServer(app);
const port = process.env.PORT || 3000;

// Configuración de WebSockets (Socket.io)
const io = new Server(httpServer, {
  cors: {
    origin: "*", // En producción, especificar la URL del frontend
    methods: ["GET", "POST"]
  }
});

app.use(cors()); 
app.use(express.json());

// Logger de peticiones (Debug)
app.use((req, res, next) => {
  console.log(`DEBUG: Recibida petición ${req.method} en ${req.url}`);
  next();
});

// Registro de Rutas existentes
app.use('/api/auth', authRoutes);
app.use('/api/plcs', plcRoutes);
app.use('/api/calibration', calibrationRoutes);
app.use('/api/sensors', sensorRoutes);
app.use('/api/actuators', actuatorRoutes);

// Registro de las nuevas rutas
app.use('/api/audit-logs', auditLogsRoutes);
app.use('/api/sensor-events', sensorEventsRoutes);
app.use('/api/actuator-actions', actuatorActionsRoutes);

// Función de Inicialización de Base de Datos y Motor Industrial
async function initSystem() {
  let retries = 15;
  while (retries > 0) {
    try {
      await db.raw('SELECT 1');
      
      // 1. Base de Datos
      await db.migrate.latest();
      await db.seed.run();
      console.log('🚀 Base de datos industrial lista.');

      // 2. Inicializar Motor PLC
      plcManager.setIO(io);
      await plcManager.initAll();
      console.log('🧠 Motor de Adquisición PLC iniciado.');

      return; 
    } catch (err) {
      retries -= 1;
      console.log(`⚠️ Esperando DB... (${retries})`);
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
  }
}

// Socket.io eventos
io.on('connection', (socket) => {
  console.log(`🔌 Cliente conectado: ${socket.id}`);
  socket.on('disconnect', () => console.log('🔌 Cliente desconectado'));
});

const HOST = '0.0.0.0';
initSystem().then(() => {
  httpServer.listen(port, HOST, () => {
    console.log(`🚀 Servidor Industrial Full-Stack en puerto ${port}`);
  });
});
