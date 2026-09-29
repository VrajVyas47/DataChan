import { Router } from 'express';
import { executeQuery } from './playgroundController';
import { authMiddleware } from '../../middleware/auth';

const router = Router();

router.use(authMiddleware);

router.post('/query', executeQuery);

export default router;
