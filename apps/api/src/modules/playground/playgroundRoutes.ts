import { Router } from 'express';
import { executeQuery, analyzeQuery, getPlaygroundStatus } from './playgroundController';
import { authMiddleware } from '../../middleware/auth';

const router = Router();

router.use(authMiddleware);

router.post('/query', executeQuery);
router.post('/analyze', analyzeQuery);
router.get('/status', getPlaygroundStatus);

export default router;
