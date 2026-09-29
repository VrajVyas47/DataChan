import { Router } from 'express';
import {
  listWorkspaces,
  createWorkspace,
  getWorkspace,
  deleteWorkspace,
} from './workspaceController';
import { authMiddleware } from '../../middleware/auth';

const router = Router();

router.use(authMiddleware);

router.get('/', listWorkspaces);
router.post('/', createWorkspace);
router.get('/:id', getWorkspace);
router.delete('/:id', deleteWorkspace);

export default router;
