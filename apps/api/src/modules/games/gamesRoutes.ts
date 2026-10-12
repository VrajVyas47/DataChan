import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth';
import {
  listGames,
  getGame,
  startOrResumeGame,
  getGameProgress,
  runGameQuery,
  validateGameChallenge,
} from './gamesController';

const router = Router();

router.use(authMiddleware);

router.get('/', listGames);
router.get('/:id', getGame);
router.post('/:id/start', startOrResumeGame);
router.get('/:id/progress', getGameProgress);
router.post('/:id/query', runGameQuery);
router.post('/:id/challenges/:challengeId/validate', validateGameChallenge);

export default router;
