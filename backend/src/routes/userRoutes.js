import express from 'express';
import userController from '../controllers/userController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// Todas las rutas de usuario requieren ser ADMIN
router.use(protect);
router.use(authorize('ADMIN'));

router.get('/', userController.getAllUsers);
router.put('/:id/role', userController.updateUserRole);
router.put('/:id/status', userController.toggleUserStatus);

export default router;
