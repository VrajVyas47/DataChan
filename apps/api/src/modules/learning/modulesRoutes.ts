import { Router } from 'express';
import {
  listModules,
  getModule,
  createModule,
  updateModule,
  deleteModule,
  reorderModules,
} from './modulesController';
import { authMiddleware, requireRole } from '../../middleware/auth';

const router = Router();

router.use(authMiddleware);

router.get('/', listModules);
router.post('/reorder', requireRole('faculty', 'admin'), reorderModules);
router.get('/:id', getModule);

// Faculty & Admin authoring endpoints
router.post('/', requireRole('faculty', 'admin'), createModule);
router.patch('/:id', requireRole('faculty', 'admin'), updateModule);
router.put('/:id', requireRole('faculty', 'admin'), updateModule);
router.delete('/:id', requireRole('faculty', 'admin'), deleteModule);

export default router;
