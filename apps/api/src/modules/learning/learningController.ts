import { Request, Response, NextFunction } from 'express';
import { getPlatformDb } from '../../database/mongoClient';
import { ApiResponse, Lesson } from '@datachan/shared-types';
import { CURRICULUM_LESSONS } from './curriculumSeed';
import { ResourceNotFoundError } from '../../errors';

export async function listLessons(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const db = getPlatformDb();
    const progressList = await db
      .collection('lesson_progress')
      .find({ userId: req.user!.userId })
      .toArray();

    const progressMap = new Map<string, boolean>();
    for (const p of progressList) {
      if (p.completed) {
        progressMap.set(p.lessonId, true);
      }
    }

    const lessonsWithStatus = CURRICULUM_LESSONS.map((lesson) => ({
      ...lesson,
      completed: progressMap.has(lesson.id),
    }));

    const response: ApiResponse<any[]> = {
      success: true,
      data: lessonsWithStatus,
      error: null,
    };
    res.json(response);
  } catch (err) {
    next(err);
  }
}

export async function getLesson(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = String(req.params.id || '');
    const lesson = CURRICULUM_LESSONS.find((l) => l.id === id);

    if (!lesson) {
      throw new ResourceNotFoundError('Lesson', id);
    }

    const db = getPlatformDb();
    const progress = await db
      .collection('lesson_progress')
      .findOne({ userId: req.user!.userId, lessonId: id });

    const response: ApiResponse<any> = {
      success: true,
      data: {
        ...lesson,
        completed: progress?.completed || false,
      },
      error: null,
    };
    res.json(response);
  } catch (err) {
    next(err);
  }
}

export async function completeLesson(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = String(req.params.id || '');
    const lesson = CURRICULUM_LESSONS.find((l) => l.id === id);

    if (!lesson) {
      throw new ResourceNotFoundError('Lesson', id);
    }

    const db = getPlatformDb();
    const existing = await db
      .collection('lesson_progress')
      .findOne({ userId: req.user!.userId, lessonId: id });

    let xpAwarded = 0;
    if (!existing || !existing.completed) {
      xpAwarded = lesson.xpReward;
      await db.collection('lesson_progress').updateOne(
        { userId: req.user!.userId, lessonId: id },
        {
          $set: {
            userId: req.user!.userId,
            lessonId: id,
            completed: true,
            completedAt: new Date().toISOString(),
          },
        },
        { upsert: true }
      );

      // Award XP to user and update level
      await db.collection('users').updateOne(
        { id: req.user!.userId },
        {
          $inc: { xp: xpAwarded },
          $set: { updatedAt: new Date().toISOString() },
        }
      );
    }

    const response: ApiResponse = {
      success: true,
      data: {
        completed: true,
        xpAwarded,
      },
      error: null,
    };
    res.json(response);
  } catch (err) {
    next(err);
  }
}
