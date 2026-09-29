import { Router } from 'express';
import {
  listDataModels,
  getDataModel,
  saveOrUpdateDataModel,
  validateModel,
  generateMongoStructure,
} from './dataModelController';
import { authMiddleware } from '../../middleware/auth';

const router = Router();

router.use(authMiddleware);

router.get('/', listDataModels);
router.post('/', saveOrUpdateDataModel);
router.post('/validate', validateModel);
router.get('/:id', getDataModel);
router.post('/:id/generate', generateMongoStructure);

export default router;
