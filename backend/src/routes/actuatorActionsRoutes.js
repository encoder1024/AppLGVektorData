import express from 'express'; // Import express as ES module
const router = express.Router();
import { getAllActuatorActions } from '../controllers/actuatorActionsController.js'; // Import controller as ES module

// Ruta para obtener acciones de actuadores (con filtros opcionales)
router.get('/', getAllActuatorActions);

export default router; // Export router as default ES module
