import { Request, Response, NextFunction } from 'express';
import { getPlatformDb } from '../../database/mongoClient';
import { PLATFORM_COLLECTIONS } from '../../database/schema/collections';
import { ApiResponse, Course } from '@datachan/shared-types';
import { ResourceNotFoundError, InvalidRequestError } from '../../errors';

export async function listCourses(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const db = getPlatformDb();
    const isStudent = req.user?.role === 'student';

    const filter: Record<string, any> = {};
    if (isStudent) {
      filter.status = 'published';
    } else if (req.query.status && (req.query.status === 'draft' || req.query.status === 'published')) {
      filter.status = req.query.status;
    }

    const courses = await db
      .collection(PLATFORM_COLLECTIONS.COURSES)
      .find(filter)
      .sort({ order: 1, createdAt: 1 })
      .toArray();

    // Attach module count per course
    const modulesCol = db.collection(PLATFORM_COLLECTIONS.MODULES);
    const enriched = await Promise.all(
      courses.map(async (c) => {
        const modFilter: Record<string, any> = { courseId: c.id };
        if (isStudent) modFilter.status = 'published';
        const modulesCount = await modulesCol.countDocuments(modFilter);
        return {
          id: c.id,
          title: c.title,
          description: c.description,
          status: c.status,
          order: c.order || 1,
          modulesCount,
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
        };
      })
    );

    const response: ApiResponse<Course[]> = {
      success: true,
      data: enriched,
      error: null,
    };
    res.json(response);
  } catch (err) {
    next(err);
  }
}

export async function getCourse(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = String(req.params.id || '');
    const db = getPlatformDb();
    const isStudent = req.user?.role === 'student';

    const course = await db.collection(PLATFORM_COLLECTIONS.COURSES).findOne({ id });
    if (!course) {
      throw new ResourceNotFoundError('Course', id);
    }

    if (isStudent && course.status !== 'published') {
      throw new ResourceNotFoundError('Course', id);
    }

    const modFilter: Record<string, any> = { courseId: course.id };
    if (isStudent) modFilter.status = 'published';
    const modulesCount = await db.collection(PLATFORM_COLLECTIONS.MODULES).countDocuments(modFilter);

    const response: ApiResponse<Course> = {
      success: true,
      data: {
        id: course.id,
        title: course.title,
        description: course.description,
        status: course.status,
        order: course.order || 1,
        modulesCount,
        createdAt: course.createdAt,
        updatedAt: course.updatedAt,
      },
      error: null,
    };
    res.json(response);
  } catch (err) {
    next(err);
  }
}

export async function createCourse(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { title, description, status = 'draft', order } = req.body;
    if (!title || typeof title !== 'string' || !title.trim()) {
      throw new InvalidRequestError('Course title is required');
    }
    if (!description || typeof description !== 'string') {
      throw new InvalidRequestError('Course description is required');
    }
    if (status !== 'draft' && status !== 'published') {
      throw new InvalidRequestError('Status must be either "draft" or "published"');
    }

    const db = getPlatformDb();
    const now = new Date().toISOString();
    const id = `crs_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    let courseOrder = typeof order === 'number' ? order : 1;
    if (typeof order !== 'number') {
      const highest = await db
        .collection(PLATFORM_COLLECTIONS.COURSES)
        .find()
        .sort({ order: -1 })
        .limit(1)
        .toArray();
      if (highest.length > 0 && typeof highest[0].order === 'number') {
        courseOrder = highest[0].order + 1;
      }
    }

    const newCourse: Course = {
      id,
      title: title.trim(),
      description: description.trim(),
      status,
      order: courseOrder,
      modulesCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    await db.collection(PLATFORM_COLLECTIONS.COURSES).insertOne(newCourse as any);

    const response: ApiResponse<Course> = {
      success: true,
      data: newCourse,
      error: null,
    };
    res.status(201).json(response);
  } catch (err) {
    next(err);
  }
}

export async function updateCourse(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = String(req.params.id || '');
    const { title, description, status, order } = req.body;

    const db = getPlatformDb();
    const existing = await db.collection(PLATFORM_COLLECTIONS.COURSES).findOne({ id });
    if (!existing) {
      throw new ResourceNotFoundError('Course', id);
    }

    const updateFields: Record<string, any> = {
      updatedAt: new Date().toISOString(),
    };
    if (title && typeof title === 'string') updateFields.title = title.trim();
    if (description !== undefined && typeof description === 'string') updateFields.description = description.trim();
    if (status && (status === 'draft' || status === 'published')) updateFields.status = status;
    if (typeof order === 'number') updateFields.order = order;

    await db.collection(PLATFORM_COLLECTIONS.COURSES).updateOne({ id }, { $set: updateFields });

    const updated = await db.collection(PLATFORM_COLLECTIONS.COURSES).findOne({ id });
    const response: ApiResponse<Course> = {
      success: true,
      data: {
        id: updated!.id,
        title: updated!.title,
        description: updated!.description,
        status: updated!.status,
        order: updated!.order || 1,
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

export async function deleteCourse(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = String(req.params.id || '');
    const db = getPlatformDb();

    const existing = await db.collection(PLATFORM_COLLECTIONS.COURSES).findOne({ id });
    if (!existing) {
      throw new ResourceNotFoundError('Course', id);
    }

    // Cascade delete modules, lessons, and sections under this course
    const modules = await db.collection(PLATFORM_COLLECTIONS.MODULES).find({ courseId: id }).toArray();
    const moduleIds = modules.map((m) => m.id);

    const lessons = await db
      .collection(PLATFORM_COLLECTIONS.LESSONS)
      .find({ $or: [{ courseId: id }, { moduleId: { $in: moduleIds } }] })
      .toArray();
    const lessonIds = lessons.map((l) => l.id);

    // Remove sections
    if (lessonIds.length > 0) {
      await db.collection(PLATFORM_COLLECTIONS.LESSON_SECTIONS).deleteMany({ lessonId: { $in: lessonIds } });
    }
    // Remove lessons
    if (lessonIds.length > 0) {
      await db.collection(PLATFORM_COLLECTIONS.LESSONS).deleteMany({ id: { $in: lessonIds } });
    }
    // Remove modules
    if (moduleIds.length > 0) {
      await db.collection(PLATFORM_COLLECTIONS.MODULES).deleteMany({ id: { $in: moduleIds } });
    }
    // Remove course
    await db.collection(PLATFORM_COLLECTIONS.COURSES).deleteOne({ id });

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
