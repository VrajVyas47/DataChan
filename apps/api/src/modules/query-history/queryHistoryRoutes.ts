import { Router } from 'express';
import { getQueryHistory, clearQueryHistory } from './queryHistoryController';
import { authMiddleware } from '../../middleware/auth';

const router = Router();

router.use(authMiddleware);

router.get('/', getQueryHistory);
router.delete('/', clearQueryHistory);

export default router;
