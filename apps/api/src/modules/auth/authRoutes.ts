import { Router } from 'express';
import { getMe, syncUser } from './authController';
import { authMiddleware } from '../../middleware/auth';

const router = Router();

router.use(authMiddleware);

router.get('/me', getMe);
router.post('/sync', syncUser);

export default router;
