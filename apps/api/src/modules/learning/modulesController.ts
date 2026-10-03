import { Request, Response, NextFunction } from 'express';
import { getPlatformDb } from '../../database/mongoClient';
import { PLATFORM_COLLECTIONS } from '../../database/schema/collections';
import { ApiResponse, Module } from '@datachan/shared-types';
import { ResourceNotFoundError, InvalidRequestError } from '../../errors';

export async function listModules(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const db = getPlatformDb();
    const isStudent = req.user?.role === 'student';
    const courseId = req.query.courseId ? String(req.query.courseId) : undefined;

    const filter: Record<string, any> = {};
    if (courseId) {
      filter.courseId = courseId;
    }

    if (isStudent) {
      filter.status = 'published';
      // If courseId provided, also ensure the course itself is published
      if (courseId) {
        const course = await db.collection(PLATFORM_COLLECTIONS.COURSES).findOne({ id: courseId });
        if (!course || course.status !== 'published') {
          const emptyResponse: ApiResponse<Module[]> = {
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

    const modules = await db
      .collection(PLATFORM_COLLECTIONS.MODULES)
      .find(filter)
      .sort({ order: 1, createdAt: 1 })
      .toArray();

    const lessonsCol = db.collection(PLATFORM_COLLECTIONS.LESSONS);
    const enriched: Module[] = await Promise.all(
      modules.map(async (m) => {
        const lessFilter: Record<string, any> = { moduleId: m.id };
        if (isStudent) lessFilter.status = 'published';
        const lessonsCount = await lessonsCol.countDocuments(lessFilter);
        return {
          id: m.id,
          courseId: m.courseId,
          title: m.title,
          description: m.description,
          order: m.order || 1,
          status: m.status,
          lessonsCount,
          createdAt: m.createdAt,
          updatedAt: m.updatedAt,
        };
      })
    );

    const response: ApiResponse<Module[]> = {
      success: true,
      data: enriched,
      error: null,
    };
    res.json(response);
  } catch (err) {
    next(err);
  }
}

export async function getModule(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = String(req.params.id || '');
    const db = getPlatformDb();
    const isStudent = req.user?.role === 'student';

    const mod = await db.collection(PLATFORM_COLLECTIONS.MODULES).findOne({ id });
    if (!mod) {
      throw new ResourceNotFoundError('Module', id);
    }

    if (isStudent) {
      if (mod.status !== 'published') {
        throw new ResourceNotFoundError('Module', id);
      }
      // Also verify course is published
      const course = await db.collection(PLATFORM_COLLECTIONS.COURSES).findOne({ id: mod.courseId });
      if (!course || course.status !== 'published') {
        throw new ResourceNotFoundError('Module', id);
      }
    }

    const lessFilter: Record<string, any> = { moduleId: mod.id };
    if (isStudent) lessFilter.status = 'published';
    const lessonsCount = await db.collection(PLATFORM_COLLECTIONS.LESSONS).countDocuments(lessFilter);

    const response: ApiResponse<Module> = {
      success: true,
      data: {
        id: mod.id,
        courseId: mod.courseId,
        title: mod.title,
        description: mod.description,
        order: mod.order || 1,
        status: mod.status,
        lessonsCount,
        createdAt: mod.createdAt,
        updatedAt: mod.updatedAt,
      },
      error: null,
    };
    res.json(response);
  } catch (err) {
    next(err);
  }
}

export async function createModule(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { courseId, title, description = '', status = 'draft', order } = req.body;
    if (!courseId || typeof courseId !== 'string') {
      throw new InvalidRequestError('courseId is required to create a module');
    }
    if (!title || typeof title !== 'string' || !title.trim()) {
      throw new InvalidRequestError('Module title is required');
    }
    if (status !== 'draft' && status !== 'published') {
      throw new InvalidRequestError('Status must be either "draft" or "published"');
    }

    const db = getPlatformDb();
    const course = await db.collection(PLATFORM_COLLECTIONS.COURSES).findOne({ id: courseId });
    if (!course) {
      throw new ResourceNotFoundError('Course', courseId);
    }

    let moduleOrder = typeof order === 'number' ? order : 1;
    if (typeof order !== 'number') {
      const highest = await db
        .collection(PLATFORM_COLLECTIONS.MODULES)
        .find({ courseId })
        .sort({ order: -1 })
        .limit(1)
        .toArray();
      if (highest.length > 0 && typeof highest[0].order === 'number') {
        moduleOrder = highest[0].order + 1;
      }
    }

    const now = new Date().toISOString();
    const id = `mod_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const newModule: Module = {
      id,
      courseId,
      title: title.trim(),
      description: description.trim(),
      order: moduleOrder,
      status,
      lessonsCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    await db.collection(PLATFORM_COLLECTIONS.MODULES).insertOne(newModule as any);

    const response: ApiResponse<Module> = {
      success: true,
      data: newModule,
      error: null,
    };
    res.status(201).json(response);
  } catch (err) {
    next(err);
  }
}

export async function updateModule(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = String(req.params.id || '');
    const { title, description, status, order } = req.body;

    const db = getPlatformDb();
    const existing = await db.collection(PLATFORM_COLLECTIONS.MODULES).findOne({ id });
    if (!existing) {
      throw new ResourceNotFoundError('Module', id);
    }

    const updateFields: Record<string, any> = {
      updatedAt: new Date().toISOString(),
    };
    if (title && typeof title === 'string') updateFields.title = title.trim();
    if (description !== undefined && typeof description === 'string') updateFields.description = description.trim();
    if (status && (status === 'draft' || status === 'published')) updateFields.status = status;
    if (typeof order === 'number') updateFields.order = order;

    await db.collection(PLATFORM_COLLECTIONS.MODULES).updateOne({ id }, { $set: updateFields });

    const updated = await db.collection(PLATFORM_COLLECTIONS.MODULES).findOne({ id });
    const lessonsCount = await db.collection(PLATFORM_COLLECTIONS.LESSONS).countDocuments({ moduleId: id });

    const response: ApiResponse<Module> = {
      success: true,
      data: {
        id: updated!.id,
        courseId: updated!.courseId,
        title: updated!.title,
        description: updated!.description,
        order: updated!.order || 1,
        status: updated!.status,
        lessonsCount,
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

export async function deleteModule(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = String(req.params.id || '');
    const db = getPlatformDb();

    const existing = await db.collection(PLATFORM_COLLECTIONS.MODULES).findOne({ id });
    if (!existing) {
      throw new ResourceNotFoundError('Module', id);
    }

    // Cascade delete lessons and sections
    const lessons = await db.collection(PLATFORM_COLLECTIONS.LESSONS).find({ moduleId: id }).toArray();
    const lessonIds = lessons.map((l) => l.id);

    if (lessonIds.length > 0) {
      await db.collection(PLATFORM_COLLECTIONS.LESSON_SECTIONS).deleteMany({ lessonId: { $in: lessonIds } });
      await db.collection(PLATFORM_COLLECTIONS.LESSONS).deleteMany({ id: { $in: lessonIds } });
    }
    await db.collection(PLATFORM_COLLECTIONS.MODULES).deleteOne({ id });

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

export async function reorderModules(req: Request, res: Response, next: NextFunction): Promise<void> {
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
            .collection(PLATFORM_COLLECTIONS.MODULES)
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
