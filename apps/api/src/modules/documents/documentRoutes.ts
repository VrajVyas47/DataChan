import { Router } from 'express';
import {
  getDocuments,
  insertDocument,
  updateDocument,
  deleteDocument,
} from './documentController';
import { authMiddleware } from '../../middleware/auth';

const router = Router();

router.use(authMiddleware);

router.get('/:databaseId/collections/:name/documents', getDocuments);
router.post('/:databaseId/collections/:name/documents', insertDocument);
router.put('/:databaseId/collections/:name/documents/:docId', updateDocument);
router.delete('/:databaseId/collections/:name/documents/:docId', deleteDocument);

export default router;
