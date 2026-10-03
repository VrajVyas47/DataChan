import { Router, Request, Response, NextFunction } from 'express';
import {
  getAdminStats,
  listAdminUsers,
  updateUserRole,
  updateUserStatus,
  cleanOrphanedDatabases,
} from './adminController';
import { authMiddleware, requireRole } from '../../middleware/auth';
import { ResourceNotFoundError } from '../../errors';

const router = Router();

// Stealth Portal Check: If ENABLE_ADMIN_PORTAL is set to false, respond with 404
function stealthGate(req: Request, res: Response, next: NextFunction) {
  if (process.env.ENABLE_ADMIN_PORTAL === 'false') {
    return next(new ResourceNotFoundError('Route', req.originalUrl));
  }
  next();
}

router.use(stealthGate);
router.use(authMiddleware);
router.use(requireRole('admin'));

router.get('/stats', getAdminStats);
router.get('/users', listAdminUsers);
router.patch('/users/:userId/role', updateUserRole);
router.patch('/users/:userId/status', updateUserStatus);
router.post('/maintenance/clean-orphans', cleanOrphanedDatabases);

export default router;
