import { Request, Response } from 'express';
import { forumService } from './forumService';
import { ApiResponse, CreateForumPostDto, CreateForumReplyDto } from '@datachan/shared-types';

export async function listPosts(req: Request, res: Response): Promise<void> {
  try {
    const { category, tag, search, sort } = req.query;
    const posts = await forumService.listPosts(
      category as string | undefined,
      tag as string | undefined,
      search as string | undefined,
      sort as 'recent' | 'top' | 'unanswered' | undefined
    );

    const response: ApiResponse = {
      success: true,
      data: posts,
      error: null,
    };
    res.json(response);
  } catch (err: any) {
    res.status(500).json({
      success: false,
      data: null,
      error: { code: 'INTERNAL_ERROR', message: err.message },
    });
  }
}

export async function getPost(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const post = await forumService.getPostById(id);

    if (!post) {
      res.status(404).json({
        success: false,
        data: null,
        error: { code: 'RESOURCE_NOT_FOUND', message: 'Discussion post not found' },
      });
      return;
    }

    const response: ApiResponse = {
      success: true,
      data: post,
      error: null,
    };
    res.json(response);
  } catch (err: any) {
    res.status(500).json({
      success: false,
      data: null,
      error: { code: 'INTERNAL_ERROR', message: err.message },
    });
  }
}

export async function createPost(req: Request, res: Response): Promise<void> {
  try {
    const { title, content, category, tags, codeSnippet } = req.body;

    if (!title || !title.trim()) {
      res.status(400).json({
        success: false,
        data: null,
        error: { code: 'INVALID_REQUEST', message: 'Post title is required' },
      });
      return;
    }

    if (!content || !content.trim()) {
      res.status(400).json({
        success: false,
        data: null,
        error: { code: 'INVALID_REQUEST', message: 'Post content is required' },
      });
      return;
    }

    const userRole = req.user!.role;
    const author = {
      id: req.user!.userId,
      name: req.user!.username || req.user!.email.split('@')[0],
      role: userRole === 'faculty' ? 'Faculty Instructor' : userRole === 'admin' ? 'Platform Administrator' : 'Student',
      avatar: userRole === 'faculty' ? '🎓' : userRole === 'admin' ? '🛡️' : '👨‍💻',
    };

    const dto: CreateForumPostDto = {
      title,
      content,
      category: category || 'general',
      tags: Array.isArray(tags) ? tags : [],
      codeSnippet,
    };

    const post = await forumService.createPost(dto, author);

    const response: ApiResponse = {
      success: true,
      data: post,
      error: null,
    };
    res.status(201).json(response);
  } catch (err: any) {
    res.status(500).json({
      success: false,
      data: null,
      error: { code: 'INTERNAL_ERROR', message: err.message },
    });
  }
}

export async function upvotePost(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const userId = req.user!.userId;

    const result = await forumService.toggleUpvotePost(id, userId);

    if (!result) {
      res.status(404).json({
        success: false,
        data: null,
        error: { code: 'RESOURCE_NOT_FOUND', message: 'Post not found' },
      });
      return;
    }

    const response: ApiResponse = {
      success: true,
      data: result,
      error: null,
    };
    res.json(response);
  } catch (err: any) {
    res.status(500).json({
      success: false,
      data: null,
      error: { code: 'INTERNAL_ERROR', message: err.message },
    });
  }
}

export async function createReply(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const { content, codeSnippet } = req.body;

    if (!content || !content.trim()) {
      res.status(400).json({
        success: false,
        data: null,
        error: { code: 'INVALID_REQUEST', message: 'Reply content is required' },
      });
      return;
    }

    const userRole = req.user!.role;
    const author = {
      id: req.user!.userId,
      name: req.user!.username || req.user!.email.split('@')[0],
      role: userRole === 'faculty' ? 'Faculty Instructor' : userRole === 'admin' ? 'Platform Administrator' : 'Student',
      avatar: userRole === 'faculty' ? '🎓' : userRole === 'admin' ? '🛡️' : '💬',
    };

    const dto: CreateForumReplyDto = {
      content,
      codeSnippet,
    };

    const reply = await forumService.createReply(id, dto, author);

    if (!reply) {
      res.status(404).json({
        success: false,
        data: null,
        error: { code: 'RESOURCE_NOT_FOUND', message: 'Post not found to reply' },
      });
      return;
    }

    const response: ApiResponse = {
      success: true,
      data: reply,
      error: null,
    };
    res.status(201).json(response);
  } catch (err: any) {
    res.status(500).json({
      success: false,
      data: null,
      error: { code: 'INTERNAL_ERROR', message: err.message },
    });
  }
}

export async function upvoteReply(req: Request, res: Response): Promise<void> {
  try {
    const replyId = req.params.replyId as string;
    const userId = req.user!.userId;

    const result = await forumService.toggleUpvoteReply(replyId, userId);

    if (!result) {
      res.status(404).json({
        success: false,
        data: null,
        error: { code: 'RESOURCE_NOT_FOUND', message: 'Reply not found' },
      });
      return;
    }

    const response: ApiResponse = {
      success: true,
      data: result,
      error: null,
    };
    res.json(response);
  } catch (err: any) {
    res.status(500).json({
      success: false,
      data: null,
      error: { code: 'INTERNAL_ERROR', message: err.message },
    });
  }
}

export async function getStats(req: Request, res: Response): Promise<void> {
  try {
    const stats = await forumService.getStats();
    const response: ApiResponse = {
      success: true,
      data: stats,
      error: null,
    };
    res.json(response);
  } catch (err: any) {
    res.status(500).json({
      success: false,
      data: null,
      error: { code: 'INTERNAL_ERROR', message: err.message },
    });
  }
}
