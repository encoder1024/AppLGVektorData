import express from 'express';
import appConfigController from '../controllers/appConfigController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// GET configs es accesible por todos los autenticados (al menos para ver el modo de conexion)
// Pero POST/PUT requiere ser ADMIN
router.use(protect);

router.get('/', appConfigController.getAllConfigs);
router.get('/:key', appConfigController.getConfigByKey);
router.post('/', authorize('ADMIN'), appConfigController.updateConfig);

export default router;
