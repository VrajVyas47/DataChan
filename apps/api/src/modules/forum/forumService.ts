import {
  ForumPost,
  ForumReply,
  CreateForumPostDto,
  CreateForumReplyDto,
  ForumStats,
} from '@datachan/shared-types';
import { getPlatformDb } from '../../database/mongoClient';
import crypto from 'crypto';

class ForumService {
  private getCollection() {
    return getPlatformDb().collection<ForumPost>('forum_posts');
  }

  public async listPosts(
    category?: string,
    tag?: string,
    search?: string,
    sort: 'recent' | 'top' | 'unanswered' = 'recent'
  ): Promise<ForumPost[]> {
    const col = this.getCollection();
    const filter: Record<string, any> = {};

    // Filter by Category
    if (category && category !== 'all') {
      filter.category = category;
    }

    // Filter by Tag
    if (tag) {
      const normalizedTag = tag.toLowerCase().replace(/^#/, '');
      filter.tags = normalizedTag;
    }

    // Search query
    if (search && search.trim()) {
      const q = search.trim();
      filter.$or = [
        { title: { $regex: q, $options: 'i' } },
        { content: { $regex: q, $options: 'i' } },
        { tags: { $regex: q, $options: 'i' } },
      ];
    }

    // Sorting
    const sortCriteria: Record<string, any> = { isPinned: -1 };
    if (sort === 'top') {
      sortCriteria.upvotes = -1;
      sortCriteria.createdAt = -1;
    } else if (sort === 'unanswered') {
      sortCriteria.replyCount = 1;
      sortCriteria.createdAt = -1;
    } else {
      sortCriteria.createdAt = -1;
    }

    const posts = await col.find(filter).sort(sortCriteria).toArray();
    return posts.map((p) => {
      const { _id, ...rest } = p as any;
      return rest as ForumPost;
    });
  }

  public async getPostById(id: string): Promise<ForumPost | null> {
    const col = this.getCollection();
    const result = await col.findOneAndUpdate(
      { id },
      { $inc: { views: 1 } },
      { returnDocument: 'after' }
    );

    if (!result) return null;
    const { _id, ...rest } = result as any;
    return rest as ForumPost;
  }

  public async createPost(
    dto: CreateForumPostDto,
    author: { id: string; name: string; role: string; avatar?: string }
  ): Promise<ForumPost> {
    const col = this.getCollection();
    const newPost: ForumPost = {
      id: `post-${crypto.randomUUID().slice(0, 8)}`,
      title: dto.title.trim(),
      content: dto.content.trim(),
      codeSnippet: dto.codeSnippet?.trim() || undefined,
      category: dto.category,
      tags: dto.tags.map((t) => t.trim().toLowerCase().replace(/^#/, '')).filter(Boolean),
      authorId: author.id,
      authorName: author.name,
      authorRole: author.role,
      authorAvatar: author.avatar || '👨‍💻',
      upvotes: 1,
      upvotedBy: [author.id],
      replyCount: 0,
      views: 1,
      isPinned: false,
      isSolved: false,
      replies: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await col.insertOne(newPost as any);
    return newPost;
  }

  public async toggleUpvotePost(
    postId: string,
    userId: string
  ): Promise<{ upvotes: number; upvoted: boolean } | null> {
    const col = this.getCollection();
    const post = await col.findOne({ id: postId });
    if (!post) return null;

    const upvotedBy = post.upvotedBy || [];
    const hasUpvoted = upvotedBy.includes(userId);

    if (hasUpvoted) {
      const updated = await col.findOneAndUpdate(
        { id: postId },
        {
          $pull: { upvotedBy: userId } as any,
          $inc: { upvotes: -1 },
        },
        { returnDocument: 'after' }
      );
      return { upvotes: Math.max(0, updated?.upvotes || 0), upvoted: false };
    } else {
      const updated = await col.findOneAndUpdate(
        { id: postId },
        {
          $addToSet: { upvotedBy: userId },
          $inc: { upvotes: 1 },
        },
        { returnDocument: 'after' }
      );
      return { upvotes: updated?.upvotes || 1, upvoted: true };
    }
  }

  public async createReply(
    postId: string,
    dto: CreateForumReplyDto,
    author: { id: string; name: string; role: string; avatar?: string }
  ): Promise<ForumReply | null> {
    const col = this.getCollection();
    const newReply: ForumReply = {
      id: `reply-${crypto.randomUUID().slice(0, 8)}`,
      postId,
      authorId: author.id,
      authorName: author.name,
      authorRole: author.role,
      authorAvatar: author.avatar || '💬',
      content: dto.content.trim(),
      codeSnippet: dto.codeSnippet?.trim() || undefined,
      upvotes: 0,
      upvotedBy: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const res = await col.findOneAndUpdate(
      { id: postId },
      {
        $push: { replies: newReply } as any,
        $inc: { replyCount: 1 },
        $set: { updatedAt: new Date().toISOString() },
      },
      { returnDocument: 'after' }
    );

    if (!res) return null;
    return newReply;
  }

  public async toggleUpvoteReply(
    replyId: string,
    userId: string
  ): Promise<{ upvotes: number; upvoted: boolean } | null> {
    const col = this.getCollection();
    const post = await col.findOne({ 'replies.id': replyId });
    if (!post || !post.replies) return null;

    const reply = post.replies.find((r) => r.id === replyId);
    if (!reply) return null;

    const hasUpvoted = (reply.upvotedBy || []).includes(userId);
    let newUpvotes = reply.upvotes || 0;
    let upvoted = false;

    if (hasUpvoted) {
      newUpvotes = Math.max(0, newUpvotes - 1);
      await col.updateOne(
        { id: post.id, 'replies.id': replyId },
        {
          $pull: { 'replies.$.upvotedBy': userId } as any,
          $inc: { 'replies.$.upvotes': -1 },
        }
      );
      upvoted = false;
    } else {
      newUpvotes += 1;
      await col.updateOne(
        { id: post.id, 'replies.id': replyId },
        {
          $addToSet: { 'replies.$.upvotedBy': userId },
          $inc: { 'replies.$.upvotes': 1 },
        }
      );
      upvoted = true;
    }

    return { upvotes: newUpvotes, upvoted };
  }

  public async getStats(): Promise<ForumStats> {
    const col = this.getCollection();
    const posts = await col.find().toArray();

    let totalReplies = 0;
    const authorIds = new Set<string>();
    const tagCountMap: Record<string, number> = {};

    for (const post of posts) {
      authorIds.add(post.authorId);
      totalReplies += post.replies?.length || 0;

      for (const reply of post.replies || []) {
        authorIds.add(reply.authorId);
      }

      for (const tag of post.tags || []) {
        tagCountMap[tag] = (tagCountMap[tag] || 0) + 1;
      }
    }

    const topTags = Object.entries(tagCountMap)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalPosts: posts.length,
      totalReplies,
      totalContributors: authorIds.size,
      topTags,
    };
  }
}

export const forumService = new ForumService();
