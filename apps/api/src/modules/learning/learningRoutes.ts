import { Router } from 'express';
import {
  listLessons,
  getLesson,
  createLesson,
  updateLesson,
  deleteLesson,
  reorderLessons,
  completeLesson,
  runPractical,
} from './learningController';
import { authMiddleware, requireRole } from '../../middleware/auth';

const router = Router();

router.use(authMiddleware);

router.get('/', listLessons);
router.post('/run-practical', runPractical);
router.post('/reorder', requireRole('faculty', 'admin'), reorderLessons);
router.get('/:id', getLesson);
router.post('/:id/complete', completeLesson);

// Faculty & Admin authoring endpoints
router.post('/', requireRole('faculty', 'admin'), createLesson);
router.patch('/:id', requireRole('faculty', 'admin'), updateLesson);
router.put('/:id', requireRole('faculty', 'admin'), updateLesson);
router.delete('/:id', requireRole('faculty', 'admin'), deleteLesson);

export default router;
