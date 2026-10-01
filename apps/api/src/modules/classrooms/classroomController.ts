import { Request, Response, NextFunction } from 'express';
import { getPlatformDb } from '../../database/mongoClient';
import { ApiResponse, Classroom } from '@datachan/shared-types';
import { ResourceNotFoundError, InvalidRequestError, AuthorizationError } from '../../errors';

export async function createClassroom(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { name, description, customCode } = req.body;
    if (!name || !name.trim()) {
      throw new InvalidRequestError('Classroom name is required');
    }

    if (req.user!.role !== 'faculty' && req.user!.role !== 'admin') {
      throw new AuthorizationError('Only Faculty or Administrative instructors can create classroom cohorts');
    }

    const db = getPlatformDb();

    // Generate or format 6-character cohort code (e.g. CS-402, DB-101)
    let code = customCode?.trim().toUpperCase();
    if (!code) {
      const prefix = name.split(/\s+/)[0]?.substring(0, 3).toUpperCase() || 'LAB';
      const num = Math.floor(100 + Math.random() * 900);
      code = `${prefix}-${num}`;
    }

    // Check if code is already in use
    const existing = await db.collection('classrooms').findOne({ code });
    if (existing) {
      code = `DC-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    const classroomId = `cls_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newClassroom: Classroom = {
      id: classroomId,
      code,
      name: name.trim(),
      description: description?.trim() || '',
      facultyId: req.user!.userId,
      facultyName: req.user!.username || 'Faculty Instructor',
      enrolledStudentIds: [],
      assignedChallengeIds: ['ch-01-find-active', 'ch-02-high-gpa', 'ch-03-indexing-boost'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await db.collection('classrooms').insertOne(newClassroom as any);

    const response: ApiResponse<Classroom> = {
      success: true,
      data: newClassroom,
      error: null,
    };
    res.status(201).json(response);
  } catch (err) {
    next(err);
  }
}

export async function joinClassroom(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { code } = req.body;
    if (!code || !code.trim()) {
      throw new InvalidRequestError('A 6-character classroom code is required (e.g. CS-101)');
    }

    const cleanCode = code.trim().toUpperCase();
    const db = getPlatformDb();

    const classroom = await db.collection('classrooms').findOne({ code: cleanCode });
    if (!classroom) {
      throw new ResourceNotFoundError('Classroom with code', cleanCode);
    }

    // Enroll student in classroom
    await db.collection('classrooms').updateOne(
      { id: classroom.id },
      {
        $addToSet: { enrolledStudentIds: req.user!.userId },
        $set: { updatedAt: new Date().toISOString() },
      }
    );

    // Enroll in user record
    await db.collection('users').updateOne(
      { id: req.user!.userId },
      {
        $addToSet: { enrolledClassroomIds: classroom.id },
        $set: { updatedAt: new Date().toISOString() },
      }
    );

    const updated = await db.collection('classrooms').findOne({ id: classroom.id });
    const { _id, ...clean } = updated as any;

    const response: ApiResponse<Classroom> = {
      success: true,
      data: clean,
      error: null,
    };
    res.json(response);
  } catch (err) {
    next(err);
  }
}

export async function getMyClassrooms(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const db = getPlatformDb();
    const userId = req.user!.userId;

    const [teaching, enrolled] = await Promise.all([
      db.collection('classrooms').find({ facultyId: userId }).toArray(),
      db.collection('classrooms').find({ enrolledStudentIds: userId }).toArray(),
    ]);

    const sanitize = (list: any[]) =>
      list.map((c) => {
        const { _id, ...rest } = c;
        return rest as Classroom;
      });

    res.json({
      success: true,
      data: {
        teaching: sanitize(teaching),
        enrolled: sanitize(enrolled),
      },
      error: null,
    });
  } catch (err) {
    next(err);
  }
}

export async function getClassroomRoster(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = String(req.params.id || '');
    const db = getPlatformDb();

    const classroom = await db.collection('classrooms').findOne({ id });
    if (!classroom) {
      throw new ResourceNotFoundError('Classroom', id);
    }

    // Must be faculty or administrator
    if (classroom.facultyId !== req.user!.userId && req.user!.role !== 'admin' && req.user!.role !== 'faculty') {
      throw new AuthorizationError('Only the assigned faculty instructor or administrator can view this cohort roster');
    }

    const studentIds = classroom.enrolledStudentIds || [];
    const students = await db
      .collection('users')
      .find({ id: { $in: studentIds } })
      .toArray();

    // Enrich students with challenge completion counts
    const roster = await Promise.all(
      students.map(async (s) => {
        const solvedCount = await db
          .collection('challenge_attempts')
          .countDocuments({ userId: s.id, passed: true });

        return {
          id: s.id,
          displayName: s.displayName || s.username,
          email: s.email,
          xp: s.xp || 0,
          level: Math.floor((s.xp || 0) / 100) + 1,
          streakDays: s.streakDays || 1,
          solvedCount,
          lastActive: s.updatedAt || s.createdAt,
        };
      })
    );

    res.json({
      success: true,
      data: {
        classroom: {
          id: classroom.id,
          code: classroom.code,
          name: classroom.name,
          description: classroom.description,
          studentCount: roster.length,
        },
        roster,
      },
      error: null,
    });
  } catch (err) {
    next(err);
  }
}
