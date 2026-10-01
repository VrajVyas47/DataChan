import { Router } from 'express';
import { createSession, getMe, syncUser, logout } from './authController';
import { authMiddleware } from '../../middleware/auth';

const router = Router();

// Public Session Exchange: Exchange Firebase ID Token for secure HttpOnly session cookie
router.post('/session', createSession);

// Protected Authentication Endpoints
router.use(authMiddleware);
router.get('/me', getMe);
router.post('/logout', logout);
router.post('/sync', syncUser);

export default router;
