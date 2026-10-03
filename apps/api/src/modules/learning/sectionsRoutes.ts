import { Router } from 'express';
import {
  listSections,
  getSection,
  createSection,
  updateSection,
  deleteSection,
  reorderSections,
  completeSection,
} from './sectionsController';
import { authMiddleware, requireRole } from '../../middleware/auth';

const router = Router();

router.use(authMiddleware);

router.get('/', listSections);
router.post('/reorder', requireRole('faculty', 'admin'), reorderSections);
router.get('/:id', getSection);
router.post('/:id/complete', completeSection);

// Faculty & Admin authoring endpoints
router.post('/', requireRole('faculty', 'admin'), createSection);
router.patch('/:id', requireRole('faculty', 'admin'), updateSection);
router.put('/:id', requireRole('faculty', 'admin'), updateSection);
router.delete('/:id', requireRole('faculty', 'admin'), deleteSection);

export default router;
