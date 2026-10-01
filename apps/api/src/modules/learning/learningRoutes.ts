import { Router } from 'express';
import { listLessons, getLesson, completeLesson, runPractical } from './learningController';
import { authMiddleware } from '../../middleware/auth';

const router = Router();

router.use(authMiddleware);

router.get('/', listLessons);
router.post('/run-practical', runPractical);
router.get('/:id', getLesson);
router.post('/:id/complete', completeLesson);

export default router;
