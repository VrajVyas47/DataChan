import { Request, Response, NextFunction } from 'express';
import { getPlatformDb } from '../../database/mongoClient';
import { ApiResponse, Classroom, CohortAssignment } from '@datachan/shared-types';
import { ResourceNotFoundError, InvalidRequestError, AuthorizationError, AppError } from '../../errors';
import { PLATFORM_COLLECTIONS, CanonicalCohortAssignment } from '../../database/schema/collections';
import { CURRICULUM_LESSONS } from '../learning/curriculumSeed';
import { LAB_CHALLENGES } from '../challenges/challengeSeed';

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

    // Generate or format cohort code (e.g. CS-402, DB-101)
    let code = customCode?.trim().toUpperCase();
    if (!code) {
      const prefix = name.split(/\s+/)[0]?.substring(0, 3).toUpperCase() || 'LAB';
      const num = Math.floor(100 + Math.random() * 900);
      code = `${prefix}-${num}`;
    }

    // Check if code is already in use
    const existing = await db.collection(PLATFORM_COLLECTIONS.CLASSROOMS).findOne({ code });
    if (existing) {
      code = `DC-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    const classroomId = `cls_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newClassroom: any = {
      id: classroomId,
      code,
      name: name.trim(),
      description: description?.trim() || '',
      facultyId: req.user!.userId,
      facultyName: req.user!.username || 'Faculty Instructor',
      status: 'active',
      enrolledStudentIds: [],
      assignedChallengeIds: ['ch-01-find-active', 'ch-02-high-gpa', 'ch-03-indexing-boost'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await db.collection(PLATFORM_COLLECTIONS.CLASSROOMS).insertOne(newClassroom);

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
      throw new InvalidRequestError('A classroom code is required (e.g. CS-101)');
    }

    const cleanCode = code.trim().toUpperCase();
    const db = getPlatformDb();

    const classroom = await db.collection(PLATFORM_COLLECTIONS.CLASSROOMS).findOne({ code: cleanCode });
    if (!classroom) {
      throw new ResourceNotFoundError('Classroom with code', cleanCode);
    }

    const nowIso = new Date().toISOString();

    // 1. Authoritative membership record in classroom_members
    await db.collection(PLATFORM_COLLECTIONS.CLASSROOM_MEMBERS).updateOne(
      { classroomId: classroom.id, userId: req.user!.userId },
      {
        $set: {
          classroomId: classroom.id,
          userId: req.user!.userId,
          role: 'student',
          status: 'active',
          enrolledAt: nowIso,
        },
      },
      { upsert: true }
    );

    // 2. Backward compatibility updates on classroom and user records
    await db.collection(PLATFORM_COLLECTIONS.CLASSROOMS).updateOne(
      { id: classroom.id },
      {
        $addToSet: { enrolledStudentIds: req.user!.userId },
        $set: { updatedAt: nowIso },
      }
    );

    await db.collection(PLATFORM_COLLECTIONS.USERS).updateOne(
      { id: req.user!.userId },
      {
        $addToSet: { enrolledClassroomIds: classroom.id },
        $set: { updatedAt: nowIso },
      }
    );

    const updated = await db.collection(PLATFORM_COLLECTIONS.CLASSROOMS).findOne({ id: classroom.id });
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

    // Faculty cohorts
    const teaching = await db.collection(PLATFORM_COLLECTIONS.CLASSROOMS).find({ facultyId: userId }).toArray();

    // Student cohorts from canonical classroom_members
    const memberships = await db
      .collection(PLATFORM_COLLECTIONS.CLASSROOM_MEMBERS)
      .find({ userId, status: 'active' })
      .toArray();

    const enrolledClassroomIds = memberships.map((m) => m.classroomId);

    // Also check legacy enrolledStudentIds array on classrooms for compatibility
    const enrolled = await db
      .collection(PLATFORM_COLLECTIONS.CLASSROOMS)
      .find({
        $or: [
          { id: { $in: enrolledClassroomIds } },
          { enrolledStudentIds: userId },
        ],
      })
      .toArray();

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

    const classroom = await db.collection(PLATFORM_COLLECTIONS.CLASSROOMS).findOne({ id });
    if (!classroom) {
      throw new ResourceNotFoundError('Classroom', id);
    }

    // Must be assigned faculty or administrator
    if (classroom.facultyId !== req.user!.userId && req.user!.role !== 'admin') {
      throw new AuthorizationError('Only the assigned faculty instructor or administrator can view this cohort roster');
    }

    // Query canonical classroom_members first
    const memberships = await db
      .collection(PLATFORM_COLLECTIONS.CLASSROOM_MEMBERS)
      .find({ classroomId: id, status: 'active' })
      .toArray();

    let studentIds = memberships.map((m) => m.userId);

    // Fallback to cached array if membership collection was not yet populated
    if (studentIds.length === 0 && Array.isArray(classroom.enrolledStudentIds)) {
      studentIds = classroom.enrolledStudentIds;
    }

    const students = await db
      .collection(PLATFORM_COLLECTIONS.USERS)
      .find({ id: { $in: studentIds } })
      .toArray();

    // Enrich students with challenge completion counts
    const roster = await Promise.all(
      students.map(async (s) => {
        const solvedCount = await db
          .collection(PLATFORM_COLLECTIONS.CHALLENGE_ATTEMPTS)
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

/**
 * Enriches a cohort assignment with human-readable target and cohort metadata.
 */
async function enrichAssignment(asg: any, classroom: any, db: any, userId?: string): Promise<CohortAssignment> {
  let targetTitle = asg.targetId;
  let targetDescription = '';
  let targetCategory = '';
  let targetXpReward = 0;
  let targetDifficulty = '';
  let targetOrder = 1;

  if (asg.targetType === 'lesson') {
    let lesson: any = await db.collection(PLATFORM_COLLECTIONS.LESSONS).findOne({ id: asg.targetId });
    if (!lesson) {
      lesson = CURRICULUM_LESSONS.find((l) => l.id === asg.targetId);
    }
    if (lesson) {
      targetTitle = lesson.title;
      targetDescription = lesson.description || '';
      targetCategory = lesson.category || 'Curriculum';
      targetXpReward = lesson.xpReward || 50;
      targetDifficulty = lesson.difficulty || 'beginner';
      targetOrder = lesson.order || 1;
    }
  } else if (asg.targetType === 'challenge') {
    let challenge: any = await db.collection(PLATFORM_COLLECTIONS.CHALLENGES).findOne({ id: asg.targetId });
    if (!challenge) {
      challenge = LAB_CHALLENGES.find((c) => c.id === asg.targetId);
    }
    if (challenge) {
      targetTitle = challenge.title;
      targetDescription = challenge.description || challenge.problemStatement || '';
      targetCategory = challenge.category || 'Filtering';
      targetXpReward = challenge.xpReward || 100;
      targetDifficulty = challenge.difficulty || 'Easy';
    }
  }

  const { _id, ...clean } = asg;
  return {
    ...clean,
    cohortName: classroom?.name || 'Academic Cohort',
    cohortCode: classroom?.code || 'LAB',
    targetTitle,
    targetDescription,
    targetCategory,
    targetXpReward,
    targetDifficulty,
    targetOrder,
  };
}

/**
 * Dispatches a curriculum lesson or challenge to an academic cohort.
 * POST /api/v1/classrooms/:id/assignments
 */
export async function createCohortAssignment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const classroomId = String(req.params.id || '');
    const { targetType, targetId, dueDate } = req.body;

    if (!targetType || (targetType !== 'lesson' && targetType !== 'challenge')) {
      throw new InvalidRequestError('targetType must be either "lesson" or "challenge"');
    }

    if (!targetId || typeof targetId !== 'string' || !targetId.trim()) {
      throw new InvalidRequestError('A valid targetId is required');
    }

    const cleanTargetId = targetId.trim();
    const db = getPlatformDb();

    // 1. Verify classroom exists
    const classroom = await db.collection(PLATFORM_COLLECTIONS.CLASSROOMS).findOne({ id: classroomId });
    if (!classroom) {
      throw new ResourceNotFoundError('Classroom', classroomId);
    }

    // 2. Authorization: Faculty must own cohort, or must be admin
    if (req.user!.role !== 'admin' && classroom.facultyId !== req.user!.userId) {
      throw new AuthorizationError('Only the assigned faculty instructor or administrator can assign curriculum to this cohort');
    }

    // 3. Verify target exists in authoritative curriculum
    if (targetType === 'lesson') {
      const dbLesson = await db.collection(PLATFORM_COLLECTIONS.LESSONS).findOne({ id: cleanTargetId });
      const fallbackLesson = CURRICULUM_LESSONS.find((l) => l.id === cleanTargetId);
      if (!dbLesson && !fallbackLesson) {
        throw new ResourceNotFoundError('Lesson', cleanTargetId);
      }
    } else if (targetType === 'challenge') {
      const dbChallenge = await db.collection(PLATFORM_COLLECTIONS.CHALLENGES).findOne({ id: cleanTargetId });
      const fallbackChallenge = LAB_CHALLENGES.find((c) => c.id === cleanTargetId);
      if (!dbChallenge && !fallbackChallenge) {
        throw new ResourceNotFoundError('Challenge', cleanTargetId);
      }
    }

    // 4. Verify no active duplicate assignment for this cohort + target
    const existing = await db
      .collection(PLATFORM_COLLECTIONS.COHORT_ASSIGNMENTS)
      .findOne({ classroomId, targetId: cleanTargetId, status: 'active' });

    if (existing) {
      throw new AppError('INVALID_REQUEST', 'This curriculum target is already actively assigned to this cohort', 409);
    }

    // 5. Insert new assignment
    const assignmentId = `asg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const newAssignment: CanonicalCohortAssignment = {
      id: assignmentId,
      classroomId,
      targetType,
      targetId: cleanTargetId,
      assignedBy: req.user!.userId,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    };
    if (typeof dueDate === 'string' && dueDate.trim()) {
      newAssignment.dueDate = dueDate.trim();
    }

    await db.collection(PLATFORM_COLLECTIONS.COHORT_ASSIGNMENTS).insertOne(newAssignment as any);

    const enriched = await enrichAssignment(newAssignment, classroom, db, req.user!.userId);

    const response: ApiResponse<CohortAssignment> = {
      success: true,
      data: enriched,
      error: null,
    };
    res.status(201).json(response);
  } catch (err) {
    next(err);
  }
}

/**
 * Retrieves all active assignments for a specified classroom cohort.
 * GET /api/v1/classrooms/:id/assignments
 */
export async function getCohortAssignments(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const classroomId = String(req.params.id || '');
    const db = getPlatformDb();

    // 1. Verify classroom exists
    const classroom = await db.collection(PLATFORM_COLLECTIONS.CLASSROOMS).findOne({ id: classroomId });
    if (!classroom) {
      throw new ResourceNotFoundError('Classroom', classroomId);
    }

    // 2. Authorization:
    // - Faculty/Admin: must own cohort or be admin
    // - Student: must have active membership in this cohort
    const userId = req.user!.userId;
    const userRole = req.user!.role;

    if (userRole === 'faculty' || userRole === 'admin') {
      if (userRole !== 'admin' && classroom.facultyId !== userId) {
        throw new AuthorizationError('Access denied: You are not the faculty instructor of this cohort');
      }
    } else {
      // Student: check classroom_members or legacy array
      const membership = await db
        .collection(PLATFORM_COLLECTIONS.CLASSROOM_MEMBERS)
        .findOne({ classroomId, userId, status: 'active' });

      const isEnrolled = !!membership || (Array.isArray(classroom.enrolledStudentIds) && classroom.enrolledStudentIds.includes(userId));
      if (!isEnrolled) {
        throw new AuthorizationError('Access denied: You must be an active enrolled member of this cohort to view assignments');
      }
    }

    // 3. Query active assignments
    const assignments = await db
      .collection(PLATFORM_COLLECTIONS.COHORT_ASSIGNMENTS)
      .find({ classroomId, status: 'active' })
      .sort({ createdAt: -1 })
      .toArray();

    // 4. Enrich assignments
    const enrichedList = await Promise.all(
      assignments.map((asg) => enrichAssignment(asg, classroom, db, userId))
    );

    const response: ApiResponse<CohortAssignment[]> = {
      success: true,
      data: enrichedList,
      error: null,
    };
    res.json(response);
  } catch (err) {
    next(err);
  }
}

/**
 * Archives / Unassigns a cohort assignment.
 * DELETE /api/v1/classrooms/:id/assignments/:assignmentId
 */
export async function deleteCohortAssignment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const classroomId = String(req.params.id || '');
    const assignmentId = String(req.params.assignmentId || '');
    const db = getPlatformDb();

    // 1. Verify classroom exists
    const classroom = await db.collection(PLATFORM_COLLECTIONS.CLASSROOMS).findOne({ id: classroomId });
    if (!classroom) {
      throw new ResourceNotFoundError('Classroom', classroomId);
    }

    // 2. Authorization: Faculty must own cohort or be admin
    if (req.user!.role !== 'admin' && classroom.facultyId !== req.user!.userId) {
      throw new AuthorizationError('Only the assigned faculty instructor or administrator can unassign curriculum from this cohort');
    }

    // 3. Verify assignment exists in this cohort
    const assignment = await db
      .collection(PLATFORM_COLLECTIONS.COHORT_ASSIGNMENTS)
      .findOne({ id: assignmentId, classroomId, status: 'active' });

    if (!assignment) {
      throw new ResourceNotFoundError('Assignment', assignmentId);
    }

    // 4. Archive assignment (preserves audit integrity while removing from active delivery)
    const now = new Date().toISOString();
    await db.collection(PLATFORM_COLLECTIONS.COHORT_ASSIGNMENTS).updateOne(
      { id: assignmentId },
      { $set: { status: 'archived', updatedAt: now } }
    );

    const response: ApiResponse<{ unassigned: boolean; id: string }> = {
      success: true,
      data: { unassigned: true, id: assignmentId },
      error: null,
    };
    res.json(response);
  } catch (err) {
    next(err);
  }
}

/**
 * Retrieves all active cohort assignments for the authenticated user across all their cohorts.
 * GET /api/v1/classrooms/my/assignments
 */
export async function getMyCohortAssignments(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const db = getPlatformDb();
    const userId = req.user!.userId;
    const userRole = req.user!.role;

    let targetClassrooms: any[] = [];

    if (userRole === 'faculty') {
      // Find all cohorts taught by this faculty
      targetClassrooms = await db
        .collection(PLATFORM_COLLECTIONS.CLASSROOMS)
        .find({ facultyId: userId })
        .toArray();
    } else {
      // Student: find active memberships in classroom_members
      const memberships = await db
        .collection(PLATFORM_COLLECTIONS.CLASSROOM_MEMBERS)
        .find({ userId, status: 'active' })
        .toArray();

      const enrolledIds = memberships.map((m) => m.classroomId);

      targetClassrooms = await db
        .collection(PLATFORM_COLLECTIONS.CLASSROOMS)
        .find({
          $or: [
            { id: { $in: enrolledIds } },
            { enrolledStudentIds: userId },
          ],
        })
        .toArray();
    }

    const classroomMap = new Map<string, any>();
    targetClassrooms.forEach((c) => classroomMap.set(c.id, c));
    const classroomIds = Array.from(classroomMap.keys());

    if (classroomIds.length === 0) {
      res.json({ success: true, data: [], error: null });
      return;
    }

    // Query active assignments across user's cohorts
    const assignments = await db
      .collection(PLATFORM_COLLECTIONS.COHORT_ASSIGNMENTS)
      .find({ classroomId: { $in: classroomIds }, status: 'active' })
      .sort({ createdAt: -1 })
      .toArray();

    const enrichedList = await Promise.all(
      assignments.map((asg) => {
        const cls = classroomMap.get(asg.classroomId);
        return enrichAssignment(asg, cls, db, userId);
      })
    );

    res.json({
      success: true,
      data: enrichedList,
      error: null,
    });
  } catch (err) {
    next(err);
  }
}
