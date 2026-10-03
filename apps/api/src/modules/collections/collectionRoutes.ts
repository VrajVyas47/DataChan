import { Router } from 'express';
import {
  listCollections,
  createCollection,
  inspectCollection,
  deleteCollection,
} from './collectionController';
import { authMiddleware } from '../../middleware/auth';

const router = Router();

router.use(authMiddleware);

router.get('/:databaseId/collections', listCollections);
router.post('/:databaseId/collections', createCollection);
router.get('/:databaseId/collections/:name', inspectCollection);
router.delete('/:databaseId/collections/:name', deleteCollection);

export default router;
