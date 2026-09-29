import { Router } from 'express';
import {
  listChallenges,
  getChallenge,
  submitChallengeAttempt,
} from './challengeController';
import { authMiddleware } from '../../middleware/auth';

const router = Router();

router.use(authMiddleware);

router.get('/', listChallenges);
router.get('/:id', getChallenge);
router.post('/:id/attempt', submitChallengeAttempt);

export default router;
