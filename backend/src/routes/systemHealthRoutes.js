import express from 'express';
import systemHealthController from '../controllers/systemHealthController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);
router.get('/latest', authorize('ADMIN', 'DEVELOPER'), systemHealthController.getLatestSystemHealth);

export default router;
