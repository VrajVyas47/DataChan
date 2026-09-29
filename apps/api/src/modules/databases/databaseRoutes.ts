import { Router } from 'express';
import {
  listDatabases,
  createDatabase,
  getDatabase,
  deleteDatabase,
} from './databaseController';
import { authMiddleware } from '../../middleware/auth';

const router = Router();

router.use(authMiddleware);

router.get('/', listDatabases);
router.post('/', createDatabase);
router.get('/:id', getDatabase);
router.delete('/:id', deleteDatabase);

export default router;
