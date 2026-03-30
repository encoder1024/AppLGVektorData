import express from 'express'; // Import express as ES module
const router = express.Router();
import { getAllSensorEvents } from '../controllers/sensorEventsController.js'; // Import controller as ES module

// Ruta para obtener eventos de sensores (con filtros opcionales)
router.get('/', getAllSensorEvents);

export default router; // Export router as default ES module
