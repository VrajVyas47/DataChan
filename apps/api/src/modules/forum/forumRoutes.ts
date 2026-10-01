import { Router } from 'express';
import {
  listPosts,
  getPost,
  createPost,
  upvotePost,
  createReply,
  upvoteReply,
  getStats,
} from './forumController';
import { authMiddleware } from '../../middleware/auth';

const router = Router();

// Public read routes
router.get('/posts', listPosts);
router.get('/posts/:id', getPost);
router.get('/stats', getStats);

// Interactive routes (authenticated with dev fallback)
router.post('/posts', authMiddleware, createPost);
router.post('/posts/:id/upvote', authMiddleware, upvotePost);
router.post('/posts/:id/replies', authMiddleware, createReply);
router.post('/posts/:id/replies/:replyId/upvote', authMiddleware, upvoteReply);

export default router;
