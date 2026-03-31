import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import { createServer } from 'http';
import { Server } from 'socket.io';
import db from './config/db.js';

import authRoutes from './routes/authRoutes.js';
import plcRoutes from './routes/plcRoutes.js';
import calibrationRoutes from './routes/calibrationRoutes.js';
import sensorRoutes from './routes/sensorRoutes.js';
import actuatorRoutes from './routes/actuatorRoutes.js';
import auditLogsRoutes from './routes/auditLogsRoutes.js';
import sensorEventsRoutes from './routes/sensorEventsRoutes.js';
import actuatorActionsRoutes from './routes/actuatorActionsRoutes.js';
import systemHealthRoutes from './routes/systemHealthRoutes.js';
import userRoutes from './routes/userRoutes.js';
import appConfigRoutes from './routes/appConfigRoutes.js';
import plcManager from './services/plcManager.js';
import systemHealthService from './services/systemHealthService.js';

const app = express();
const httpServer = createServer(app);
const port = process.env.PORT || 3000;

const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  console.log(`DEBUG: Recibida petición ${req.method} en ${req.url}`);
  next();
});

app.use('/api/auth', authRoutes);
app.use('/api/plcs', plcRoutes);
app.use('/api/calibration', calibrationRoutes);
app.use('/api/sensors', sensorRoutes);
app.use('/api/actuators', actuatorRoutes);
app.use('/api/audit-logs', auditLogsRoutes);
app.use('/api/sensor-events', sensorEventsRoutes);
app.use('/api/actuator-actions', actuatorActionsRoutes);
app.use('/api/system-health', systemHealthRoutes);
app.use('/api/users', userRoutes);
app.use('/api/config', appConfigRoutes);

async function initSystem() {
  let retries = 15;

  while (retries > 0) {
    try {
      await db.raw('SELECT 1');
      await db.migrate.latest();
      await db.seed.run();
      console.log('Base de datos industrial lista.');

      plcManager.setIO(io);
      await plcManager.initAll();
      console.log('Motor de adquisición PLC iniciado.');

      await systemHealthService.start();
      console.log('Motor de housekeeping de salud iniciado.');
      return;
    } catch (err) {
      retries -= 1;
      console.log(`Esperando DB... (${retries})`);
      await new Promise((resolve) => setTimeout(resolve, 10000));
    }
  }
}

io.on('connection', (socket) => {
  console.log(`Cliente conectado: ${socket.id}`);
  socket.on('disconnect', () => console.log('Cliente desconectado'));
});

const HOST = '0.0.0.0';
initSystem().then(() => {
  httpServer.listen(port, HOST, () => {
    console.log(`Servidor Industrial Full-Stack en puerto ${port}`);
  });
});
