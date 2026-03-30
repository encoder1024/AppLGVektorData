import express from 'express'; // Import express as ES module
const router = express.Router();
import { getAllAuditLogs } from '../controllers/auditLogsController.js'; // Import controller as ES module

// Ruta para obtener todos los logs de auditoría (con filtros opcionales de fecha)
router.get('/', getAllAuditLogs);

export default router; // Export router as default ES module
