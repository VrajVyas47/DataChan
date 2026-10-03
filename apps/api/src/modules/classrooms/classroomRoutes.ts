import { Router } from 'express';
import {
  createClassroom,
  joinClassroom,
  getMyClassrooms,
  getClassroomRoster,
  createCohortAssignment,
  getCohortAssignments,
  deleteCohortAssignment,
  getMyCohortAssignments,
} from './classroomController';
import { authMiddleware, requireRole } from '../../middleware/auth';

const router = Router();

router.use(authMiddleware);

// Students or faculty can view their classrooms, joined cohort assignments, and join via code
router.get('/my', getMyClassrooms);
router.get('/my/assignments', getMyCohortAssignments);
router.post('/join', joinClassroom);

// Faculty & Admin endpoints
router.post('/', requireRole('faculty', 'admin'), createClassroom);
router.get('/:id/roster', requireRole('faculty', 'admin'), getClassroomRoster);

// Cohort Assignment endpoints
router.post('/:id/assignments', requireRole('faculty', 'admin'), createCohortAssignment);
router.get('/:id/assignments', getCohortAssignments);
router.delete('/:id/assignments/:assignmentId', requireRole('faculty', 'admin'), deleteCohortAssignment);

export default router;
