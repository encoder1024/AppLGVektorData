import express from 'express';
import actuatorController from '../controllers/actuatorController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.get('/', actuatorController.getActuators);
router.get('/sync', actuatorController.syncActuators);
router.post('/:id/control', authorize('ADMIN', 'DEVELOPER', 'LIDER', 'TECHNICIAN'), actuatorController.controlActuator);

// Solo ADMIN y DEVELOPER pueden gestionar la configuracion fisica de actuadores
router.post('/', authorize('ADMIN', 'DEVELOPER'), actuatorController.createActuator);
router.put('/:id', authorize('ADMIN', 'DEVELOPER'), actuatorController.updateActuator);
router.delete('/:id', authorize('ADMIN', 'DEVELOPER'), actuatorController.deleteActuator);

export default router;
