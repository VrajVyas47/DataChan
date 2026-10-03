import { Request, Response, NextFunction } from 'express';
import { getPlatformDb } from '../../database/mongoClient';
import { PLATFORM_COLLECTIONS } from '../../database/schema/collections';
import { ApiResponse, LessonSection, ContentBlock } from '@datachan/shared-types';
import { ResourceNotFoundError, InvalidRequestError } from '../../errors';

const VALID_BLOCK_TYPES = new Set(['text', 'code', 'output', 'note', 'image', 'example', 'playground']);

function validateContentBlocks(blocks: any[]): ContentBlock[] {
  if (!Array.isArray(blocks)) {
    throw new InvalidRequestError('contentBlocks must be an array');
  }
  return blocks.map((b, idx) => {
    if (!b || typeof b !== 'object') {
      throw new InvalidRequestError(`Invalid content block at index ${idx}`);
    }
    if (!b.type || !VALID_BLOCK_TYPES.has(b.type)) {
      throw new InvalidRequestError(`Invalid content block type "${b.type}" at index ${idx}. Valid types: ${Array.from(VALID_BLOCK_TYPES).join(', ')}`);
    }
    if (typeof b.content !== 'string') {
      throw new InvalidRequestError(`Content block at index ${idx} must have string content`);
    }
    return {
      type: b.type,
      order: typeof b.order === 'number' ? b.order : idx + 1,
      content: b.content,
      language: typeof b.language === 'string' ? b.language : undefined,
      caption: typeof b.caption === 'string' ? b.caption : undefined,
      altText: typeof b.altText === 'string' ? b.altText : undefined,
      playgroundQuery: typeof b.playgroundQuery === 'string' ? b.playgroundQuery : undefined,
    };
  });
}

export async function listSections(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const db = getPlatformDb();
    const isStudent = req.user?.role === 'student';
    const lessonId = req.query.lessonId ? String(req.query.lessonId) : undefined;

    const filter: Record<string, any> = {};
    if (lessonId) {
      filter.lessonId = lessonId;
    }

    if (isStudent) {
      filter.status = 'published';
      // Verify parent lesson is published if lessonId provided
      if (lessonId) {
        const lesson = await db.collection(PLATFORM_COLLECTIONS.LESSONS).findOne({ id: lessonId });
        if (!lesson || lesson.status !== 'published') {
          const emptyResponse: ApiResponse<LessonSection[]> = {
            success: true,
            data: [],
            error: null,
          };
          res.json(emptyResponse);
          return;
        }
      }
    } else if (req.query.status && (req.query.status === 'draft' || req.query.status === 'published')) {
      filter.status = req.query.status;
    }

    const sections = await db
      .collection(PLATFORM_COLLECTIONS.LESSON_SECTIONS)
      .find(filter)
      .sort({ order: 1, createdAt: 1 })
      .toArray();

    // Check user completed sections if student
    let completedSectionIds = new Set<string>();
    if (req.user && lessonId) {
      const progress = await db
        .collection(PLATFORM_COLLECTIONS.LEARNING_PROGRESS)
        .findOne({ userId: req.user.userId, lessonId });
      if (progress?.completedSectionIds && Array.isArray(progress.completedSectionIds)) {
        completedSectionIds = new Set(progress.completedSectionIds);
      }
    }

    const formatted: (LessonSection & { isCompleted?: boolean })[] = sections.map((s) => ({
      id: s.id,
      lessonId: s.lessonId,
      title: s.title,
      description: s.description || '',
      order: s.order || 1,
      status: s.status,
      contentBlocks: s.contentBlocks || [],
      isCompleted: completedSectionIds.has(s.id),
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    }));

    const response: ApiResponse<(LessonSection & { isCompleted?: boolean })[]> = {
      success: true,
      data: formatted,
      error: null,
    };
    res.json(response);
  } catch (err) {
    next(err);
  }
}

export async function getSection(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = String(req.params.id || '');
    const db = getPlatformDb();
    const isStudent = req.user?.role === 'student';

    const section = await db.collection(PLATFORM_COLLECTIONS.LESSON_SECTIONS).findOne({ id });
    if (!section) {
      throw new ResourceNotFoundError('LessonSection', id);
    }

    if (isStudent) {
      if (section.status !== 'published') {
        throw new ResourceNotFoundError('LessonSection', id);
      }
      const lesson = await db.collection(PLATFORM_COLLECTIONS.LESSONS).findOne({ id: section.lessonId });
      if (!lesson || lesson.status !== 'published') {
        throw new ResourceNotFoundError('LessonSection', id);
      }
    }

    // Check completion status
    let isCompleted = false;
    if (req.user) {
      const progress = await db
        .collection(PLATFORM_COLLECTIONS.LEARNING_PROGRESS)
        .findOne({ userId: req.user.userId, lessonId: section.lessonId });
      if (progress?.completedSectionIds && Array.isArray(progress.completedSectionIds)) {
        isCompleted = progress.completedSectionIds.includes(section.id);
      }
    }

    const response: ApiResponse<LessonSection & { isCompleted?: boolean }> = {
      success: true,
      data: {
        id: section.id,
        lessonId: section.lessonId,
        title: section.title,
        description: section.description || '',
        order: section.order || 1,
        status: section.status,
        contentBlocks: section.contentBlocks || [],
        isCompleted,
        createdAt: section.createdAt,
        updatedAt: section.updatedAt,
      },
      error: null,
    };
    res.json(response);
  } catch (err) {
    next(err);
  }
}

export async function createSection(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { lessonId, title, description = '', status = 'draft', order, contentBlocks = [] } = req.body;
    if (!lessonId || typeof lessonId !== 'string') {
      throw new InvalidRequestError('lessonId is required to create a section');
    }
    if (!title || typeof title !== 'string' || !title.trim()) {
      throw new InvalidRequestError('Section title is required');
    }
    if (status !== 'draft' && status !== 'published') {
      throw new InvalidRequestError('Status must be either "draft" or "published"');
    }

    const db = getPlatformDb();
    const lesson = await db.collection(PLATFORM_COLLECTIONS.LESSONS).findOne({ id: lessonId });
    if (!lesson) {
      throw new ResourceNotFoundError('Lesson', lessonId);
    }

    const validatedBlocks = validateContentBlocks(contentBlocks);

    let sectionOrder = typeof order === 'number' ? order : 1;
    if (typeof order !== 'number') {
      const highest = await db
        .collection(PLATFORM_COLLECTIONS.LESSON_SECTIONS)
        .find({ lessonId })
        .sort({ order: -1 })
        .limit(1)
        .toArray();
      if (highest.length > 0 && typeof highest[0].order === 'number') {
        sectionOrder = highest[0].order + 1;
      }
    }

    const now = new Date().toISOString();
    const id = `sec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const newSection: LessonSection = {
      id,
      lessonId,
      title: title.trim(),
      description: description.trim(),
      order: sectionOrder,
      status,
      contentBlocks: validatedBlocks,
      createdAt: now,
      updatedAt: now,
    };

    await db.collection(PLATFORM_COLLECTIONS.LESSON_SECTIONS).insertOne(newSection as any);

    const response: ApiResponse<LessonSection> = {
      success: true,
      data: newSection,
      error: null,
    };
    res.status(201).json(response);
  } catch (err) {
    next(err);
  }
}

export async function updateSection(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = String(req.params.id || '');
    const { title, description, status, order, contentBlocks } = req.body;

    const db = getPlatformDb();
    const existing = await db.collection(PLATFORM_COLLECTIONS.LESSON_SECTIONS).findOne({ id });
    if (!existing) {
      throw new ResourceNotFoundError('LessonSection', id);
    }

    const updateFields: Record<string, any> = {
      updatedAt: new Date().toISOString(),
    };
    if (title && typeof title === 'string') updateFields.title = title.trim();
    if (description !== undefined && typeof description === 'string') updateFields.description = description.trim();
    if (status && (status === 'draft' || status === 'published')) updateFields.status = status;
    if (typeof order === 'number') updateFields.order = order;
    if (contentBlocks !== undefined) {
      updateFields.contentBlocks = validateContentBlocks(contentBlocks);
    }

    await db.collection(PLATFORM_COLLECTIONS.LESSON_SECTIONS).updateOne({ id }, { $set: updateFields });

    const updated = await db.collection(PLATFORM_COLLECTIONS.LESSON_SECTIONS).findOne({ id });

    const response: ApiResponse<LessonSection> = {
      success: true,
      data: {
        id: updated!.id,
        lessonId: updated!.lessonId,
        title: updated!.title,
        description: updated!.description || '',
        order: updated!.order || 1,
        status: updated!.status,
        contentBlocks: updated!.contentBlocks || [],
        createdAt: updated!.createdAt,
        updatedAt: updated!.updatedAt,
      },
      error: null,
    };
    res.json(response);
  } catch (err) {
    next(err);
  }
}

export async function deleteSection(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = String(req.params.id || '');
    const db = getPlatformDb();

    const existing = await db.collection(PLATFORM_COLLECTIONS.LESSON_SECTIONS).findOne({ id });
    if (!existing) {
      throw new ResourceNotFoundError('LessonSection', id);
    }

    await db.collection(PLATFORM_COLLECTIONS.LESSON_SECTIONS).deleteOne({ id });

    const response: ApiResponse<{ deleted: boolean; id: string }> = {
      success: true,
      data: { deleted: true, id },
      error: null,
    };
    res.json(response);
  } catch (err) {
    next(err);
  }
}

export async function reorderSections(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      throw new InvalidRequestError('items array with { id, order } is required for reordering');
    }

    const db = getPlatformDb();
    const now = new Date().toISOString();

    await Promise.all(
      items.map(async (item: { id: string; order: number }) => {
        if (item.id && typeof item.order === 'number') {
          await db
            .collection(PLATFORM_COLLECTIONS.LESSON_SECTIONS)
            .updateOne({ id: item.id }, { $set: { order: item.order, updatedAt: now } });
        }
      })
    );

    const response: ApiResponse<{ success: boolean }> = {
      success: true,
      data: { success: true },
      error: null,
    };
    res.json(response);
  } catch (err) {
    next(err);
  }
}

export async function completeSection(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = String(req.params.id || '');
    const db = getPlatformDb();
    const userId = req.user!.userId;

    const section = await db.collection(PLATFORM_COLLECTIONS.LESSON_SECTIONS).findOne({ id });
    if (!section) {
      throw new ResourceNotFoundError('LessonSection', id);
    }

    const lessonId = section.lessonId;
    const lesson = await db.collection(PLATFORM_COLLECTIONS.LESSONS).findOne({ id: lessonId });
    if (!lesson) {
      throw new ResourceNotFoundError('Lesson', lessonId);
    }

    // Get total published sections for this lesson
    const allSections = await db
      .collection(PLATFORM_COLLECTIONS.LESSON_SECTIONS)
      .find({ lessonId, status: 'published' })
      .toArray();

    const totalSectionsCount = allSections.length || 1;

    // Fetch existing progress
    const progressCol = db.collection(PLATFORM_COLLECTIONS.LEARNING_PROGRESS);
    let progress = await progressCol.findOne({ userId, lessonId });

    let completedSectionIds: string[] = progress?.completedSectionIds || [];
    if (!completedSectionIds.includes(id)) {
      completedSectionIds.push(id);
    }

    const progressPercent = Math.min(100, Math.round((completedSectionIds.length / totalSectionsCount) * 100));
    const allCompleted = progressPercent === 100 || completedSectionIds.length >= totalSectionsCount;

    const now = new Date().toISOString();
    let xpAwarded = 0;

    const progressUpdate: Record<string, any> = {
      userId,
      lessonId,
      completedSectionIds,
      progressPercent,
      updatedAt: now,
    };

    if (allCompleted && (!progress || !progress.completed)) {
      progressUpdate.completed = true;
      progressUpdate.completedAt = now;
      xpAwarded = lesson.xpReward || 50;

      // Update legacy lesson_progress for complete backward compatibility
      await db.collection('lesson_progress').updateOne(
        { userId, lessonId },
        {
          $set: {
            userId,
            lessonId,
            completed: true,
            completedAt: now,
          },
        },
        { upsert: true }
      );

      // Award XP to user
      await db.collection('users').updateOne(
        { id: userId },
        {
          $inc: { xp: xpAwarded },
          $set: { updatedAt: now },
        }
      );
    }

    await progressCol.updateOne(
      { userId, lessonId },
      { $set: progressUpdate },
      { upsert: true }
    );

    const response: ApiResponse<{
      completedSectionIds: string[];
      progressPercent: number;
      lessonCompleted: boolean;
      xpAwarded: number;
    }> = {
      success: true,
      data: {
        completedSectionIds,
        progressPercent,
        lessonCompleted: allCompleted,
        xpAwarded,
      },
      error: null,
    };
    res.json(response);
  } catch (err) {
    next(err);
  }
}
