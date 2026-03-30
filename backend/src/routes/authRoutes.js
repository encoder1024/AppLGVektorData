import express from 'express';
import authController from '../controllers/authController.js';

const router = express.Router();

// Endpoints de autenticación (Ticket 1.2)
router.post('/signup', authController.signup);
router.post('/login', authController.login);

export default router;
