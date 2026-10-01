import { Router } from 'express';
import {
  createClassroom,
  joinClassroom,
  getMyClassrooms,
  getClassroomRoster,
} from './classroomController';
import { authMiddleware, requireRole } from '../../middleware/auth';

const router = Router();

router.use(authMiddleware);

// Students or faculty can view their classrooms and join via code
router.get('/my', getMyClassrooms);
router.post('/join', joinClassroom);

// Faculty & Admin endpoints
router.post('/', requireRole('faculty', 'admin'), createClassroom);
router.get('/:id/roster', requireRole('faculty', 'admin'), getClassroomRoster);

export default router;
