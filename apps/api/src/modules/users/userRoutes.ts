import { Router } from 'express';
import { getMe, syncUser } from '../auth/authController';
import { authMiddleware } from '../../middleware/auth';

const router = Router();

router.use(authMiddleware);

router.get('/', getMe);
router.patch('/preferences', syncUser);

export default router;
