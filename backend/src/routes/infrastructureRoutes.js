import express from 'express';
import infraController from '../controllers/infrastructureController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', protect, infraController.getNodes);
router.post('/', protect, infraController.createNode);
router.put('/:id', protect, infraController.updateNode);
router.delete('/:id', protect, infraController.deleteNode);

// Conexiones de infraestructura
router.get('/connections', protect, infraController.getConnections);
router.post('/connections', protect, infraController.createConnection);
router.put('/connections/:id', protect, infraController.updateConnection);
router.delete('/connections/:id', protect, infraController.deleteConnection);

export default router;
