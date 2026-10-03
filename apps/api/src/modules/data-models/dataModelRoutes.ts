import { Router } from 'express';
import {
  listDataModels,
  getDataModel,
  saveOrUpdateDataModel,
  validateModel,
  generateMongoStructure,
  importDatabaseStructure,
  applyStructureToDatabase,
} from './dataModelController';
import { authMiddleware } from '../../middleware/auth';

const router = Router();

router.use(authMiddleware);

router.get('/', listDataModels);
router.post('/', saveOrUpdateDataModel);
router.post('/validate', validateModel);
router.post('/import-database', importDatabaseStructure);
router.post('/apply-structure', applyStructureToDatabase);
router.get('/:id', getDataModel);
router.post('/:id/generate', generateMongoStructure);

export default router;
