import express from 'express';
import sensorController from '../controllers/sensorController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.get('/', sensorController.getSensors);

// Solo ADMIN, DEVELOPER y LIDER pueden realizar ajustes de señales
router.post('/', authorize('ADMIN', 'DEVELOPER', 'LIDER'), sensorController.createSensor);
router.put('/:id', authorize('ADMIN', 'DEVELOPER', 'LIDER'), sensorController.updateSensor);
router.delete('/:id', authorize('ADMIN', 'DEVELOPER', 'LIDER'), sensorController.deleteSensor);

export default router;
