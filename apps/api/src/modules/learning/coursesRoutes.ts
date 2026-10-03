import { Router } from 'express';
import {
  listCourses,
  getCourse,
  createCourse,
  updateCourse,
  deleteCourse,
} from './coursesController';
import { authMiddleware, requireRole } from '../../middleware/auth';

const router = Router();

router.use(authMiddleware);

router.get('/', listCourses);
router.get('/:id', getCourse);

// Faculty & Admin authoring endpoints
router.post('/', requireRole('faculty', 'admin'), createCourse);
router.patch('/:id', requireRole('faculty', 'admin'), updateCourse);
router.put('/:id', requireRole('faculty', 'admin'), updateCourse);
router.delete('/:id', requireRole('faculty', 'admin'), deleteCourse);

export default router;
