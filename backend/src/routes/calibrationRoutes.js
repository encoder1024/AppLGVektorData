import express from 'express';
import calibrationController from '../controllers/calibrationController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.get('/', calibrationController.getProfiles);

// Solo ADMIN y DEVELOPER pueden gestionar perfiles matemáticos
router.post('/', authorize('ADMIN', 'DEVELOPER'), calibrationController.createProfile);
router.put('/:id', authorize('ADMIN', 'DEVELOPER'), calibrationController.updateProfile);
router.delete('/:id', authorize('ADMIN', 'DEVELOPER'), calibrationController.deleteProfile);

export default router;
