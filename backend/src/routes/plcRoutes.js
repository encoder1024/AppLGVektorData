import express from 'express';
import plcController from '../controllers/plcController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// Todas las rutas de PLC requieren autenticación
router.use(protect);

// Obtener PLCs (Accesible para todos los roles autenticados)
router.get('/', plcController.getPLCs);
router.get('/:id', plcController.getPLCById);

// Modificar PLCs (Solo ADMIN y DEVELOPER)
router.post('/', authorize('ADMIN', 'DEVELOPER'), plcController.createPLC);
router.put('/:id', authorize('ADMIN', 'DEVELOPER'), plcController.updatePLC);
router.delete('/:id', authorize('ADMIN', 'DEVELOPER'), plcController.deletePLC);

export default router;
