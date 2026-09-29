import { Router } from 'express';
import { getMe, syncUser, login } from './authController';
import { authMiddleware } from '../../middleware/auth';

const router = Router();

// Public auth endpoints
router.post('/login', login);

// Authenticated auth endpoints
router.use(authMiddleware);
router.get('/me', getMe);
router.post('/sync', syncUser);

export default router;
