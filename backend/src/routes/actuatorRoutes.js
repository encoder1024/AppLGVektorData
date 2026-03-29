import express from 'express';
import actuatorController from '../controllers/actuatorController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.get('/', actuatorController.getActuators);

// Solo ADMIN y DEVELOPER pueden gestionar la configuración física de actuadores
router.post('/', authorize('ADMIN', 'DEVELOPER'), actuatorController.createActuator);
router.put('/:id', authorize('ADMIN', 'DEVELOPER'), actuatorController.updateActuator);
router.delete('/:id', authorize('ADMIN', 'DEVELOPER'), actuatorController.deleteActuator);

export default router;
