import { Router } from 'express';
import { listLessons, getLesson, completeLesson } from './learningController';
import { authMiddleware } from '../../middleware/auth';

const router = Router();

router.use(authMiddleware);

router.get('/', listLessons);
router.get('/:id', getLesson);
router.post('/:id/complete', completeLesson);

export default router;
