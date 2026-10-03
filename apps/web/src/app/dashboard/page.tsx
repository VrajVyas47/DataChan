'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import {
  UserProfile,
  VirtualDatabase,
  QueryHistoryItem,
  Lesson,
  Classroom,
  CohortAssignment,
} from '@datachan/shared-types';
import {
  Database,
  Terminal,
  BookOpen,
  Trophy,
  Boxes,
  ArrowRight,
  Folder,
  Layers,
  Sparkles,
  CheckCircle2,
  Clock,
  Plus,
  GraduationCap,
  Users,
  KeyRound,
  Copy,
  Check,
  X,
  Shield,
  Activity,
  FileText,
  CheckCheck,
  TrendingUp,
  UserCheck,
  RefreshCw,
  Play,
  Flame,
  AlertCircle,
  Trash2,
  ExternalLink,
} from 'lucide-react';

export default function DashboardPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [currentView, setCurrentView] = useState<'student' | 'faculty' | 'admin'>('student');
  const [databases, setDatabases] = useState<VirtualDatabase[]>([]);
  const [recentQueries, setRecentQueries] = useState<QueryHistoryItem[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [classrooms, setClassrooms] = useState<{ teaching: Classroom[]; enrolled: Classroom[] }>({
    teaching: [],
    enrolled: [],
  });

  // Modal & Cohort states
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [rosterModalOpen, setRosterModalOpen] = useState(false);
  const [activeCohortForRoster, setActiveCohortForRoster] = useState<Classroom | null>(null);
  const [cohortRoster, setCohortRoster] = useState<any[]>([]);
  const [loadingRoster, setLoadingRoster] = useState(false);

  // Form states
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [newClassName, setNewClassName] = useState('');
  const [newClassDesc, setNewClassDesc] = useState('');
  const [newClassCode, setNewClassCode] = useState('');
  const [cohortMsg, setCohortMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [submittingCohort, setSubmittingCohort] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Faculty Assignment state
  const [selectedTeachingCohortId, setSelectedTeachingCohortId] = useState<string>('');
  const [cohortAssignments, setCohortAssignments] = useState<CohortAssignment[]>([]);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [dispatchingLessonId, setDispatchingLessonId] = useState<string | null>(null);
  const [unassigningId, setUnassigningId] = useState<string | null>(null);
  const [dispatchFeedback, setDispatchFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Student Assignment delivery state
  const [studentMyAssignments, setStudentMyAssignments] = useState<CohortAssignment[]>([]);
  const [studentAssignmentModalCohort, setStudentAssignmentModalCohort] = useState<Classroom | null>(null);
  const [studentCohortAssignments, setStudentCohortAssignments] = useState<CohortAssignment[]>([]);
  const [loadingStudentAssignments, setLoadingStudentAssignments] = useState(false);

  // Admin states
  const [adminStats, setAdminStats] = useState<any | null>(null);
  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const [cleaningOrphans, setCleaningOrphans] = useState(false);
  const [cleanMsg, setCleanMsg] = useState<string | null>(null);
  const [roleUpdatingUser, setRoleUpdatingUser] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [me, dbs, history, allLessons, myClassrooms, myAssignments] = await Promise.all([
          api.getMe(),
          api.listDatabases(),
          api.getQueryHistory(6),
          api.listLessons(),
          api.listMyClassrooms().catch(() => ({ teaching: [], enrolled: [] })),
          api.listMyCohortAssignments().catch(() => []),
        ]);

        setProfile(me);
        // Automatically default view to authenticated role
        if (me.role === 'faculty' || me.role === 'admin') {
          setCurrentView(me.role);
        } else {
          setCurrentView('student');
        }

        setDatabases(dbs);
        setRecentQueries(history);
        setLessons(allLessons);
        setClassrooms(myClassrooms);
        setStudentMyAssignments(myAssignments);

        // Preload faculty cohort assignments if teaching
        if (myClassrooms.teaching && myClassrooms.teaching.length > 0) {
          const firstCohortId = myClassrooms.teaching[0].id;
          setSelectedTeachingCohortId(firstCohortId);
          api.listCohortAssignments(firstCohortId).then(setCohortAssignments).catch(() => {});
        }

        // Preload admin stats only if authenticated user is admin
        if (me.role === 'admin') {
          api.getAdminStats().then(setAdminStats).catch(() => {});
          api.listAdminUsers().then(setAdminUsers).catch(() => {});
        }
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, []);

  const handleJoinClassroom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCodeInput.trim()) return;
    setSubmittingCohort(true);
    setCohortMsg(null);
    try {
      const joined = await api.joinClassroom(joinCodeInput.trim());
      setCohortMsg({ type: 'success', text: `Enrolled successfully into ${joined.name}!` });
      setClassrooms((prev) => ({
        ...prev,
        enrolled: [...prev.enrolled.filter((c) => c.id !== joined.id), joined],
      }));
      setJoinCodeInput('');
      setTimeout(() => {
        setJoinModalOpen(false);
        setCohortMsg(null);
      }, 1800);
    } catch (err: any) {
      setCohortMsg({ type: 'error', text: err.message || 'Failed to join classroom' });
    } finally {
      setSubmittingCohort(false);
    }
  };

  const handleCreateClassroom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim()) return;
    setSubmittingCohort(true);
    setCohortMsg(null);
    try {
      const created = await api.createClassroom(
        newClassName.trim(),
        newClassDesc.trim(),
        newClassCode.trim() || undefined
      );
      setCohortMsg({ type: 'success', text: `Created cohort ${created.name} with code: ${created.code}!` });
      setClassrooms((prev) => ({ ...prev, teaching: [...prev.teaching, created] }));
      setNewClassName('');
      setNewClassDesc('');
      setNewClassCode('');
      setTimeout(() => {
        setCreateModalOpen(false);
        setCohortMsg(null);
      }, 2000);
    } catch (err: any) {
      setCohortMsg({ type: 'error', text: err.message || 'Failed to create classroom' });
    } finally {
      setSubmittingCohort(false);
    }
  };

  const handleOpenRoster = async (cohort: Classroom) => {
    setActiveCohortForRoster(cohort);
    setRosterModalOpen(true);
    setLoadingRoster(true);
    try {
      const res = await api.getClassroomRoster(cohort.id);
      setCohortRoster(res.roster || []);
    } catch (err: any) {
      setCohortRoster([]);
    } finally {
      setLoadingRoster(false);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleTeachingCohortChange = async (cohortId: string) => {
    setSelectedTeachingCohortId(cohortId);
    setDispatchFeedback(null);
    setLoadingAssignments(true);
    try {
      const list = await api.listCohortAssignments(cohortId);
      setCohortAssignments(list);
    } catch (err: any) {
      console.error('Failed to load assignments for cohort:', err);
      setCohortAssignments([]);
    } finally {
      setLoadingAssignments(false);
    }
  };

  const handleDispatchPractical = async (lessonId: string, lessonTitle: string) => {
    if (!selectedTeachingCohortId) {
      setDispatchFeedback({ type: 'error', text: 'Please select a teaching cohort first.' });
      return;
    }
    setDispatchingLessonId(lessonId);
    setDispatchFeedback(null);
    try {
      await api.createCohortAssignment(selectedTeachingCohortId, {
        targetType: 'lesson',
        targetId: lessonId,
      });
      const updated = await api.listCohortAssignments(selectedTeachingCohortId);
      setCohortAssignments(updated);
      setDispatchFeedback({
        type: 'success',
        text: `Lesson "${lessonTitle}" successfully dispatched to cohort syllabus!`,
      });
    } catch (err: any) {
      setDispatchFeedback({
        type: 'error',
        text: err.message || 'Failed to dispatch lesson to cohort',
      });
    } finally {
      setDispatchingLessonId(null);
    }
  };

  const handleUnassignPractical = async (assignmentId: string, lessonTitle: string) => {
    if (!selectedTeachingCohortId) return;
    setUnassigningId(assignmentId);
    setDispatchFeedback(null);
    try {
      await api.deleteCohortAssignment(selectedTeachingCohortId, assignmentId);
      const updated = await api.listCohortAssignments(selectedTeachingCohortId);
      setCohortAssignments(updated);
      setDispatchFeedback({
        type: 'success',
        text: `Lesson "${lessonTitle}" unassigned from cohort syllabus.`,
      });
    } catch (err: any) {
      setDispatchFeedback({
        type: 'error',
        text: err.message || 'Failed to unassign lesson',
      });
    } finally {
      setUnassigningId(null);
    }
  };

  const handleOpenCohortAssignments = async (cohort: Classroom) => {
    setStudentAssignmentModalCohort(cohort);
    setLoadingStudentAssignments(true);
    try {
      const list = await api.listCohortAssignments(cohort.id);
      setStudentCohortAssignments(list);
    } catch (err) {
      console.error('Failed to load assignments:', err);
      setStudentCohortAssignments([]);
    } finally {
      setLoadingStudentAssignments(false);
    }
  };

  const handleCleanOrphans = async () => {
    setCleaningOrphans(true);
    setCleanMsg(null);
    try {
      const res = await api.cleanOrphanedDatabases();
      setCleanMsg(`Reclaimed ${res.deletedCount || 0} orphaned databases.`);
      const stats = await api.getAdminStats();
      setAdminStats(stats);
    } catch (err: any) {
      setCleanMsg(`Cleanup error: ${err.message}`);
    } finally {
      setCleaningOrphans(false);
    }
  };

  const handleUpdateRole = async (userId: string, newRole: string) => {
    setRoleUpdatingUser(userId);
    try {
      await api.updateAdminUserRole(userId, newRole);
      setAdminUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      );
    } catch (err: any) {
      alert(err.message || 'Failed to update role');
    } finally {
      setRoleUpdatingUser(null);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-medium text-text-muted">Loading your virtual laboratory...</span>
        </div>
      </div>
    );
  }

  const activeDb = databases.find((d) => d.id === profile?.activeDatabaseId) || databases[0];
  const completedLessonsCount = profile?.lessonsCompletedCount || 0;
  const progressPercent = Math.min(100, Math.round((completedLessonsCount / (lessons.length || 1)) * 100));
  const nextLesson = lessons.find((l) => !l.completed) || lessons[0];

  const effectiveView: 'student' | 'faculty' | 'admin' =
    profile?.role === 'admin'
      ? currentView
      : profile?.role === 'faculty'
      ? currentView === 'admin'
        ? 'faculty'
        : currentView
      : 'student';

  const canSwitchRoles = profile?.role === 'faculty' || profile?.role === 'admin';

  return (
    <div className="flex flex-col gap-6 w-full pb-10">
      {/* ========================================================================= */}
      {/* 1. ROLE VIEW SELECTOR BAR (Only for Faculty and Admin users)              */}
      {/* ========================================================================= */}
      {canSwitchRoles && (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3.5 bg-surface-low rounded-2xl border border-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
              {profile?.role === 'faculty' ? (
                <GraduationCap className="w-4 h-4" />
              ) : (
                <Shield className="w-4 h-4" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-text-main">
                  {profile?.displayName || profile?.username || 'User'}
                </span>
                <span
                  className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full border ${
                    profile?.role === 'faculty'
                      ? 'bg-secondary/15 text-secondary border-secondary/30'
                      : 'bg-error/15 text-error border-error/30'
                  }`}
                >
                  Account Role: {profile?.role}
                </span>
              </div>
              <p className="text-[11px] text-text-muted">
                {profile?.role === 'admin'
                  ? 'Switch console perspective between System Admin, Faculty Portal, and Student Lab'
                  : 'Toggle between your Faculty Academic Console and the Student Lab view'}
              </p>
            </div>
          </div>

          {/* View Switcher Pills */}
          <div className="flex items-center bg-surface border border-border p-1 rounded-xl gap-1 self-start md:self-auto">
            <button
              onClick={() => setCurrentView('student')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                effectiveView === 'student'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-text-muted hover:text-text-main'
              }`}
            >
              <span>👨‍🎓 Student Lab</span>
            </button>
            <button
              onClick={() => setCurrentView('faculty')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                effectiveView === 'faculty'
                  ? 'bg-secondary text-white shadow-sm'
                  : 'text-text-muted hover:text-text-main'
              }`}
            >
              <span>🎓 Faculty Portal</span>
              {classrooms.teaching.length > 0 && (
                <span className="text-[10px] font-mono px-1.5 rounded-full bg-white/20">
                  {classrooms.teaching.length}
                </span>
              )}
            </button>
            {profile?.role === 'admin' && (
              <button
                onClick={() => setCurrentView('admin')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                  effectiveView === 'admin'
                    ? 'bg-error text-white shadow-sm'
                    : 'text-text-muted hover:text-text-main'
                }`}
              >
                <span>🛡️ Admin Telemetry</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. CONDITIONAL VIEW RENDERING BASED ON AUTHORIZED VIEW                    */}
      {/* ========================================================================= */}

      {/* ------------------------------------------------------------------------- */}
      {/* VIEW A: STUDENT DASHBOARD                                                 */}
      {/* ------------------------------------------------------------------------- */}
      {effectiveView === 'student' && (
        <div className="flex flex-col gap-6">
          {/* Top Welcome & Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-primary tracking-widest uppercase">
                  Student Learning Console
                </span>
                <span className="text-text-muted text-xs">&bull;</span>
                <span className="text-xs text-text-muted font-medium">Level {profile?.level || 1} Scholar</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-text-main mt-0.5">
                Welcome back, {profile?.displayName || profile?.username || 'Student'}
              </h1>
              <p className="text-xs sm:text-sm text-text-muted mt-1">
                Data-Chan Virtual Database Lab &bull; Hands-on MQL Practicals, Query ASTs &amp; Sandboxes
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/learn"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-white text-xs font-bold hover:bg-primary/90 transition-all shadow-sm"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Run Practical</span>
              </Link>
              <Link
                href="/workspace"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface-high hover:bg-surface-low text-text-main text-xs font-bold transition-all border border-border"
              >
                <Database className="w-3.5 h-3.5" />
                <span>Workspace</span>
              </Link>
            </div>
          </div>

          {/* 4 Stat Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-surface-low rounded-2xl p-4 border border-border/70 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted">Total XP</span>
                <Sparkles className="w-4 h-4 text-secondary" />
              </div>
              <div className="mt-3">
                <span className="text-2xl font-black text-text-main font-mono">{profile?.xp || 0}</span>
                <div className="w-full bg-surface-high h-1.5 rounded-full mt-2 overflow-hidden">
                  <div
                    className="bg-secondary h-full rounded-full"
                    style={{ width: `${(profile?.xp || 0) % 100}%` }}
                  ></div>
                </div>
              </div>
            </div>

            <div className="bg-surface-low rounded-2xl p-4 border border-border/70 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted">Practice Streak</span>
                <Flame className="w-4 h-4 text-orange-500" />
              </div>
              <div className="mt-3">
                <span className="text-2xl font-black text-text-main font-mono">{profile?.streakDays || 1} Days</span>
                <p className="text-[11px] text-text-muted mt-1">Keep querying daily</p>
              </div>
            </div>

            <div className="bg-surface-low rounded-2xl p-4 border border-border/70 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted">Practicals</span>
                <CheckCircle2 className="w-4 h-4 text-tertiary" />
              </div>
              <div className="mt-3">
                <span className="text-2xl font-black text-text-main font-mono">
                  {completedLessonsCount} / {lessons.length || 15}
                </span>
                <p className="text-[11px] text-text-muted mt-1">{progressPercent}% Curriculum progress</p>
              </div>
            </div>

            <div className="bg-surface-low rounded-2xl p-4 border border-border/70 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted">Enrolled Labs</span>
                <GraduationCap className="w-4 h-4 text-primary" />
              </div>
              <div className="mt-3">
                <span className="text-2xl font-black text-text-main font-mono">
                  {classrooms.enrolled.length}
                </span>
                <p className="text-[11px] text-text-muted mt-1">Academic Cohorts</p>
              </div>
            </div>
          </div>

          {/* Student Center 2-Column Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            {/* Left Column (Span 8) */}
            <div className="xl:col-span-8 flex flex-col gap-6">
              {/* Continue Practical Lab Card */}
              {nextLesson && (
                <div className="p-6 rounded-2xl bg-gradient-to-r from-primary/10 via-surface-low to-surface-low border border-primary/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-primary text-white flex items-center justify-center shrink-0 shadow-md">
                      <BookOpen className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded bg-primary/20 text-primary">
                          Practical Lab #{nextLesson.order || 1}
                        </span>
                        <span className="text-xs text-text-muted">&bull;</span>
                        <span className="text-xs text-text-muted">+{nextLesson.xpReward} XP</span>
                      </div>
                      <h3 className="text-lg font-bold text-text-main mt-1">{nextLesson.title}</h3>
                      <p className="text-xs text-text-muted mt-1 max-w-xl leading-relaxed">
                        {nextLesson.description}
                      </p>
                    </div>
                  </div>

                  <Link
                    href="/learn"
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-primary hover:bg-primary/90 text-white text-xs font-bold transition-all shadow-md shrink-0 self-start sm:self-auto"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Launch Practical Lab</span>
                  </Link>
                </div>
              )}

              {/* Enrolled Academic Cohorts Section */}
              <div className="bg-surface-low rounded-2xl border border-border p-5 flex flex-col gap-4">
                {/* Active Cohort Assignments Widget */}
                {studentMyAssignments.length > 0 && (
                  <div className="p-4 rounded-xl bg-surface border border-primary/20 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        <h3 className="text-xs font-bold text-text-main uppercase font-mono tracking-wider">
                          Active Cohort Assignments ({studentMyAssignments.length})
                        </h3>
                      </div>
                      <Link
                        href="/learn?assignedOnly=true"
                        className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                      >
                        <span>Open in Learn</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {studentMyAssignments.slice(0, 4).map((asg) => (
                        <div
                          key={asg.id}
                          className="p-3 rounded-lg bg-surface-high border border-border/80 flex flex-col justify-between gap-2 hover:border-primary/40 transition-all"
                        >
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center justify-between text-[10px] font-mono">
                              <span className="font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                                {asg.cohortCode || 'Cohort'}
                              </span>
                              <span className="font-bold text-emerald-500">Active</span>
                            </div>
                            <h4 className="text-xs font-bold text-text-main line-clamp-1">{asg.targetTitle || asg.targetId}</h4>
                            <span className="text-[10px] text-text-muted font-mono">
                              {asg.targetCategory || 'Curriculum'} &bull; +{asg.targetXpReward || 50} XP
                            </span>
                          </div>
                          <div className="pt-2 border-t border-border/50 flex items-center justify-between">
                            <span className="text-[10px] text-text-muted">Assigned Lesson</span>
                            <Link
                              href={`/learn?lessonId=${asg.targetId}`}
                              className="text-xs font-bold text-secondary hover:underline flex items-center gap-1"
                            >
                              <span>Start Lesson</span>
                              <ArrowRight className="w-3 h-3" />
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <GraduationCap className="w-5 h-5 text-primary" />
                    <h2 className="text-base font-bold text-text-main">My University Cohorts</h2>
                  </div>
                  <button
                    onClick={() => setJoinModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary text-white text-xs font-bold hover:bg-primary/90 transition-all shadow-sm"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>Join Class with Code</span>
                  </button>
                </div>

                {classrooms.enrolled.length === 0 ? (
                  <div className="p-6 rounded-xl border border-dashed border-border text-center flex flex-col items-center gap-2">
                    <Users className="w-6 h-6 text-text-muted" />
                    <p className="text-xs text-text-muted">You are not enrolled in any academic cohorts yet.</p>
                    <button
                      onClick={() => setJoinModalOpen(true)}
                      className="text-xs font-bold text-primary hover:underline mt-1"
                    >
                      Enter a 6-character code (e.g. CS-101) to join
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {classrooms.enrolled.map((cls) => (
                      <div
                        key={cls.id}
                        className="p-4 rounded-xl bg-surface border border-border flex flex-col justify-between gap-3"
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                              {cls.code}
                            </span>
                            <span className="text-[11px] text-text-muted">Instructor: {cls.facultyName}</span>
                          </div>
                          <h4 className="text-sm font-bold text-text-main mt-2">{cls.name}</h4>
                          <p className="text-xs text-text-muted mt-1 line-clamp-2">{cls.description}</p>
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t border-border/60 text-xs">
                          <span className="text-text-muted font-mono text-[11px]">
                            {cls.enrolledStudentIds?.length || 0} peers enrolled
                          </span>
                          <button
                            onClick={() => handleOpenCohortAssignments(cls)}
                            className="font-bold text-primary hover:underline flex items-center gap-1 text-[11px]"
                          >
                            <span>View Assignments</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recent Practical Query History */}
              <div className="bg-surface-low rounded-2xl border border-border p-5 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Terminal className="w-5 h-5 text-secondary" />
                    <h2 className="text-base font-bold text-text-main">Recent Practical Query Log</h2>
                  </div>
                  <Link href="/playground" className="text-xs font-bold text-primary hover:underline">
                    Open Playground
                  </Link>
                </div>

                {recentQueries.length === 0 ? (
                  <div className="p-6 rounded-xl border border-dashed border-border text-center text-xs text-text-muted">
                    No queries executed yet. Run your first practical in the Learn mode!
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {recentQueries.map((q) => (
                      <div
                        key={q.id || (q as any)._id || Math.random().toString()}
                        className="p-3 rounded-xl bg-surface border border-border flex items-center justify-between gap-4 text-xs font-mono"
                      >
                        <div className="flex items-center gap-3 overflow-hidden">
                          <span className="px-2 py-0.5 rounded bg-primary-fixed text-primary font-bold text-[10px] uppercase">
                            {q.operation || 'find'}
                          </span>
                          <span className="text-text-main truncate text-xs">{q.rawQuery}</span>
                        </div>
                        <div className="flex items-center gap-3 text-text-muted shrink-0 text-[11px]">
                          <span>{q.durationMs || q.executionTimeMs || 8}ms</span>
                          <span>&bull;</span>
                          <span className="text-tertiary">✓ Success</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column (Span 4) */}
            <div className="xl:col-span-4 flex flex-col gap-6">
              {/* Virtual Sandboxes */}
              <div className="bg-surface-low rounded-2xl border border-border p-5 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-primary" />
                    <h3 className="text-sm font-bold text-text-main">Virtual Sandboxes</h3>
                  </div>
                  <Link href="/workspace" className="text-xs font-bold text-primary hover:underline">
                    Manage
                  </Link>
                </div>

                <div className="flex flex-col gap-2">
                  {databases.map((dbItem) => (
                    <div
                      key={dbItem.id}
                      className="p-3 rounded-xl bg-surface border border-border flex items-center justify-between"
                    >
                      <div>
                        <h4 className="text-xs font-bold text-text-main font-mono">{dbItem.name}</h4>
                        <span className="text-[10px] text-text-muted font-mono">
                          {dbItem.collectionsCount || 1} collections &bull; {dbItem.totalDocumentsCount || 5} docs
                        </span>
                      </div>
                      <Link
                        href="/playground"
                        className="px-2.5 py-1 rounded-md bg-surface-high hover:bg-surface border border-border text-[11px] font-bold text-text-main"
                      >
                        Query
                      </Link>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Links Card */}
              <div className="bg-surface-low rounded-2xl border border-border p-5 flex flex-col gap-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted">
                  Quick Access Modules
                </h3>
                <div className="grid grid-cols-2 gap-2 text-xs font-bold">
                  <Link
                    href="/modeler"
                    className="p-3 rounded-xl bg-surface border border-border hover:border-primary/50 text-text-main flex items-center gap-2"
                  >
                    <Boxes className="w-4 h-4 text-secondary" />
                    <span>Data Modeler</span>
                  </Link>
                  <Link
                    href="/forum"
                    className="p-3 rounded-xl bg-surface border border-border hover:border-primary/50 text-text-main flex items-center gap-2"
                  >
                    <Users className="w-4 h-4 text-tertiary" />
                    <span>Lab Forum</span>
                  </Link>
                  <Link
                    href="/challenges"
                    className="p-3 rounded-xl bg-surface border border-border hover:border-primary/50 text-text-main flex items-center gap-2"
                  >
                    <Trophy className="w-4 h-4 text-primary" />
                    <span>Challenges</span>
                  </Link>
                  <Link
                    href="/workspace"
                    className="p-3 rounded-xl bg-surface border border-border hover:border-primary/50 text-text-main flex items-center gap-2"
                  >
                    <Folder className="w-4 h-4 text-orange-400" />
                    <span>Documents</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------------- */}
      {/* VIEW B: FACULTY INSTRUCTOR PORTAL                                         */}
      {/* ------------------------------------------------------------------------- */}
      {effectiveView === 'faculty' && (
        <div className="flex flex-col gap-6">
          {/* Faculty Header Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-secondary tracking-widest uppercase">
                  Faculty Academic Management Console
                </span>
                <span className="text-text-muted text-xs">&bull;</span>
                <span className="text-xs text-text-muted font-medium">Department of Database Engineering</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-text-main mt-0.5">
                Instructor Console &bull; {profile?.displayName || 'Professor'}
              </h1>
              <p className="text-xs sm:text-sm text-text-muted mt-1">
                Oversee academic cohorts, dispatch MongoDB curriculum practicals, and monitor student execution progress.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCreateModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary text-white text-xs font-bold hover:bg-secondary/90 transition-all shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Create New Cohort</span>
              </button>
              <Link
                href="/playground"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface-high hover:bg-surface-low text-text-main text-xs font-bold transition-all border border-border"
              >
                <Terminal className="w-4 h-4" />
                <span>Test Query</span>
              </Link>
            </div>
          </div>

          {/* Feedback banner */}
          {dispatchFeedback && (
            <div
              className={`p-3.5 rounded-xl border text-xs font-bold flex items-center justify-between animate-fadeIn ${
                dispatchFeedback.type === 'success'
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-500'
                  : 'bg-error/15 border-error/30 text-error'
              }`}
            >
              <div className="flex items-center gap-2">
                <CheckCheck className="w-4 h-4 shrink-0" />
                <span>{dispatchFeedback.text}</span>
              </div>
              <button onClick={() => setDispatchFeedback(null)} className="opacity-70 hover:opacity-100">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Faculty KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-surface-low rounded-2xl p-4 border border-border/70 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted">Teaching Cohorts</span>
                <GraduationCap className="w-4 h-4 text-secondary" />
              </div>
              <div className="mt-3">
                <span className="text-2xl font-black text-text-main font-mono">
                  {classrooms.teaching.length}
                </span>
                <p className="text-[11px] text-text-muted mt-1">Active lab sections</p>
              </div>
            </div>

            <div className="bg-surface-low rounded-2xl p-4 border border-border/70 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted">Total Students</span>
                <Users className="w-4 h-4 text-primary" />
              </div>
              <div className="mt-3">
                <span className="text-2xl font-black text-text-main font-mono">
                  {classrooms.teaching.reduce((acc, c) => acc + (c.enrolledStudentIds?.length || 0), 0)}
                </span>
                <p className="text-[11px] text-text-muted mt-1">Enrolled across cohorts</p>
              </div>
            </div>

            <div className="bg-surface-low rounded-2xl p-4 border border-border/70 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted">Syllabus Practicals</span>
                <BookOpen className="w-4 h-4 text-tertiary" />
              </div>
              <div className="mt-3">
                <span className="text-2xl font-black text-text-main font-mono">{lessons.length || 0}</span>
                <p className="text-[11px] text-text-muted mt-1">Curated MongoDB labs</p>
              </div>
            </div>

            <div className="bg-surface-low rounded-2xl p-4 border border-border/70 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted">Submissions Recorded</span>
                <TrendingUp className="w-4 h-4 text-orange-400" />
              </div>
              <div className="mt-3">
                <span className="text-2xl font-black text-text-main font-mono">
                  {adminStats?.overview?.totalQueries ?? 0}
                </span>
                <p className="text-[11px] text-text-muted mt-1">Telemetry AST executions</p>
              </div>
            </div>
          </div>

          {/* Faculty Main Section: Cohort Management */}
          <div className="bg-surface-low rounded-2xl border border-border p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-text-main">Teaching Cohorts &amp; Lab Sections</h2>
                <p className="text-xs text-text-muted">
                  Share invite codes with your students so they can enroll into your virtual database laboratory.
                </p>
              </div>
              <button
                onClick={() => setCreateModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary text-white text-xs font-bold hover:bg-secondary/90 transition-all shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Section</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {classrooms.teaching.map((cls) => (
                <div
                  key={cls.id}
                  className="p-5 rounded-2xl bg-surface border border-border flex flex-col justify-between gap-4 shadow-sm"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-md bg-secondary/15 text-secondary border border-secondary/30">
                        {cls.code}
                      </span>
                      <button
                        onClick={() => handleCopyCode(cls.code)}
                        className="inline-flex items-center gap-1 text-[11px] font-mono text-text-muted hover:text-text-main px-2 py-0.5 rounded bg-surface-high border border-border"
                      >
                        {copiedCode === cls.code ? (
                          <>
                            <Check className="w-3 h-3 text-tertiary" />
                            <span className="text-tertiary font-bold">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy Code</span>
                          </>
                        )}
                      </button>
                    </div>
                    <h3 className="text-base font-bold text-text-main mt-3">{cls.name}</h3>
                    <p className="text-xs text-text-muted mt-1 leading-relaxed">{cls.description}</p>
                  </div>

                  <div className="pt-3 border-t border-border flex items-center justify-between text-xs">
                    <span className="text-text-muted font-mono font-bold">
                      {cls.enrolledStudentIds?.length || 0} Students Enrolled
                    </span>
                    <button
                      onClick={() => handleOpenRoster(cls)}
                      className="px-3 py-1 rounded-lg bg-surface-high hover:bg-surface-low text-text-main font-bold text-xs border border-border flex items-center gap-1"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>View Roster</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Curriculum Practical Assignment Matrix */}
          <div className="bg-surface-low rounded-2xl border border-border p-5 flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-text-main">Curriculum Practical Assignment Matrix</h2>
                <p className="text-xs text-text-muted">
                  Dispatch standardized MongoDB practicals to student laboratory cohorts with deterministic grading.
                </p>
              </div>

              <div className="flex items-center gap-3">
                {classrooms.teaching.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-text-muted font-bold font-mono">Cohort:</span>
                    <select
                      value={selectedTeachingCohortId}
                      onChange={(e) => handleTeachingCohortChange(e.target.value)}
                      className="bg-surface border border-border rounded-lg px-2.5 py-1 text-xs font-bold text-text-main focus:outline-none focus:border-secondary"
                    >
                      {classrooms.teaching.map((cls) => (
                        <option key={cls.id} value={cls.id}>
                          {cls.code} - {cls.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <Link
                  href="/learn"
                  className="text-xs font-bold text-secondary hover:underline flex items-center gap-1"
                >
                  <span>Preview All Practicals</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* Feedback message banner */}
            {dispatchFeedback && (
              <div
                className={`p-3 rounded-xl text-xs font-bold flex items-center justify-between ${
                  dispatchFeedback.type === 'success'
                    ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-500'
                    : 'bg-error/15 border border-error/30 text-error'
                }`}
              >
                <span>{dispatchFeedback.text}</span>
                <button onClick={() => setDispatchFeedback(null)} className="opacity-70 hover:opacity-100">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border text-text-muted font-mono uppercase text-[10px]">
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">Practical Title</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">XP Reward</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Faculty Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {loadingAssignments ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-text-muted">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-4 h-4 border-2 border-secondary border-t-transparent rounded-full animate-spin"></div>
                          <span>Loading cohort syllabus state...</span>
                        </div>
                      </td>
                    </tr>
                  ) : lessons.slice(0, 8).map((lesson, idx) => {
                    const currentAssignment = cohortAssignments.find(
                      (a) => a.targetId === lesson.id && a.status === 'active'
                    );
                    const isAssigned = !!currentAssignment;
                    const isDispatching = dispatchingLessonId === lesson.id;
                    const isUnassigning = currentAssignment ? unassigningId === currentAssignment.id : false;

                    return (
                      <tr key={lesson.id} className="hover:bg-surface/50">
                        <td className="py-3 px-3 font-mono text-text-muted">{idx + 1}</td>
                        <td className="py-3 px-3 font-bold text-text-main">{lesson.title}</td>
                        <td className="py-3 px-3 font-mono text-[11px] text-text-muted">
                          {lesson.category}
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-secondary">
                          +{lesson.xpReward} XP
                        </td>
                        <td className="py-3 px-3">
                          {isAssigned ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-tertiary/15 text-tertiary border border-tertiary/30">
                              <Check className="w-3 h-3" />
                              <span>Active in Syllabus</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-surface-high text-text-muted border border-border">
                              <span>Optional</span>
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right">
                          {isAssigned ? (
                            <button
                              onClick={() => handleUnassignPractical(currentAssignment.id, lesson.title)}
                              disabled={isUnassigning}
                              className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-error bg-error/10 hover:bg-error/20 border border-error/30 transition-all disabled:opacity-50"
                            >
                              {isUnassigning ? 'Unassigning...' : 'Unassign'}
                            </button>
                          ) : (
                            <button
                              onClick={() => handleDispatchPractical(lesson.id, lesson.title)}
                              disabled={isDispatching || !selectedTeachingCohortId}
                              className="px-3 py-1 rounded-lg text-[11px] font-bold bg-secondary hover:bg-secondary/90 text-white shadow-sm transition-all disabled:opacity-50"
                            >
                              {isDispatching ? 'Dispatching...' : 'Dispatch to Cohort'}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------------- */}
      {/* VIEW C: PLATFORM ADMIN CONTROL CENTER                                     */}
      {/* ------------------------------------------------------------------------- */}
      {effectiveView === 'admin' && (
        <div className="flex flex-col gap-6">
          {/* Admin Header Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-error tracking-widest uppercase">
                  Platform Control Center &bull; Infrastructure Telemetry
                </span>
                <span className="text-text-muted text-xs">&bull;</span>
                <span className="text-xs text-text-muted font-medium">
                  Cluster: Localhost ({adminStats?.system?.version ? `MongoDB ${adminStats.system.version} WiredTiger` : 'MongoDB 8.2 WiredTiger'})
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-text-main mt-0.5">
                System Administration &amp; Telemetry Portal
              </h1>
              <p className="text-xs sm:text-sm text-text-muted mt-1">
                Monitor multi-tenant database namespaces, manage user role escalation, and execute garbage collection.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCleanOrphans}
                disabled={cleaningOrphans}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-error text-white text-xs font-bold hover:bg-error/90 transition-all shadow-sm disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                <span>{cleaningOrphans ? 'Cleaning...' : 'Purge Orphan DBs'}</span>
              </button>
              <Link
                href="/admin"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface-high hover:bg-surface-low text-text-main text-xs font-bold transition-all border border-border"
              >
                <Activity className="w-4 h-4" />
                <span>Full Telemetry Page</span>
              </Link>
            </div>
          </div>

          {/* Feedback banner */}
          {cleanMsg && (
            <div className="p-3.5 rounded-xl bg-surface border border-error/30 text-error text-xs font-bold flex items-center gap-2 animate-fadeIn">
              <Check className="w-4 h-4" />
              <span>{cleanMsg}</span>
            </div>
          )}

          {/* Admin KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-surface-low rounded-2xl p-4 border border-border/70 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted">Total Users</span>
                <Users className="w-4 h-4 text-primary" />
              </div>
              <div className="mt-3">
                <span className="text-2xl font-black text-text-main font-mono">
                  {adminStats?.overview?.totalUsers ?? adminUsers.length ?? 0}
                </span>
                <p className="text-[11px] text-text-muted mt-1">Platform user accounts</p>
              </div>
            </div>

            <div className="bg-surface-low rounded-2xl p-4 border border-border/70 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted">Active Virtual DBs</span>
                <Database className="w-4 h-4 text-secondary" />
              </div>
              <div className="mt-3">
                <span className="text-2xl font-black text-text-main font-mono">
                  {adminStats?.overview?.totalDatabases ?? databases.length ?? 0}
                </span>
                <p className="text-[11px] text-text-muted mt-1">Isolated namespaces</p>
              </div>
            </div>

            <div className="bg-surface-low rounded-2xl p-4 border border-border/70 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted">Total Queries</span>
                <Activity className="w-4 h-4 text-tertiary" />
              </div>
              <div className="mt-3">
                <span className="text-2xl font-black text-text-main font-mono">
                  {adminStats?.overview?.totalQueries ?? 0}
                </span>
                <p className="text-[11px] text-text-muted mt-1">Global AST executions</p>
              </div>
            </div>

            <div className="bg-surface-low rounded-2xl p-4 border border-border/70 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted">Engine Status</span>
                <Shield className="w-4 h-4 text-tertiary" />
              </div>
              <div className="mt-3">
                <span className="text-2xl font-black text-tertiary font-mono">HEALTHY</span>
                <p className="text-[11px] text-text-muted mt-1">
                  {adminStats?.system?.version ? `MongoDB ${adminStats.system.version} WiredTiger` : 'MongoDB 8.2 WiredTiger'}
                </p>
              </div>
            </div>
          </div>

          {/* User Directory & Role Escalator Table */}
          <div className="bg-surface-low rounded-2xl border border-border p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-text-main">User Directory &amp; Role Management</h2>
                <p className="text-xs text-text-muted">
                  Instantly promote or reassign student, faculty, and administrative privileges across the platform.
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-text-muted">
                {adminUsers.length} Registered Accounts
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border text-text-muted font-mono uppercase text-[10px]">
                    <th className="py-2.5 px-3">User</th>
                    <th className="py-2.5 px-3">Email</th>
                    <th className="py-2.5 px-3">Current Role</th>
                    <th className="py-2.5 px-3">Active Database</th>
                    <th className="py-2.5 px-3 text-right">Escalate Role</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {adminUsers.slice(0, 8).map((u) => (
                    <tr key={u.id} className="hover:bg-surface/50">
                      <td className="py-3 px-3">
                        <div className="font-bold text-text-main">{u.displayName || u.username}</div>
                        <div className="text-[10px] font-mono text-text-muted">{u.id}</div>
                      </td>
                      <td className="py-3 px-3 font-mono text-text-muted">{u.email}</td>
                      <td className="py-3 px-3">
                        <span
                          className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full border ${
                            u.role === 'faculty'
                              ? 'bg-secondary/15 text-secondary border-secondary/30'
                              : u.role === 'admin'
                              ? 'bg-error/15 text-error border-error/30'
                              : 'bg-primary/15 text-primary border-primary/30'
                          }`}
                        >
                          {u.role || 'student'}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] text-text-muted">
                        {u.activeDatabaseId ? (
                          <span className="text-tertiary">Connected</span>
                        ) : (
                          <span className="text-text-muted">Auto-Provision</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => handleUpdateRole(u.id, 'student')}
                            disabled={roleUpdatingUser === u.id || u.role === 'student'}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all ${
                              u.role === 'student'
                                ? 'bg-primary/20 text-primary border-primary/40 opacity-50'
                                : 'bg-surface hover:bg-surface-high border-border text-text-muted'
                            }`}
                          >
                            Student
                          </button>
                          <button
                            onClick={() => handleUpdateRole(u.id, 'faculty')}
                            disabled={roleUpdatingUser === u.id || u.role === 'faculty'}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all ${
                              u.role === 'faculty'
                                ? 'bg-secondary/20 text-secondary border-secondary/40 opacity-50'
                                : 'bg-surface hover:bg-surface-high border-border text-text-muted'
                            }`}
                          >
                            Faculty
                          </button>
                          <button
                            onClick={() => handleUpdateRole(u.id, 'admin')}
                            disabled={roleUpdatingUser === u.id || u.role === 'admin'}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all ${
                              u.role === 'admin'
                                ? 'bg-error/20 text-error border-error/40 opacity-50'
                                : 'bg-surface hover:bg-surface-high border-border text-text-muted'
                            }`}
                          >
                            Admin
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: JOIN CLASSROOM COHORT                                            */}
      {/* ========================================================================= */}
      {joinModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-surface-elevated rounded-3xl border border-border p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <div className="flex items-center gap-2 text-primary font-bold">
                <GraduationCap className="w-5 h-5" />
                <span className="text-sm">Join Academic Cohort</span>
              </div>
              <button
                onClick={() => setJoinModalOpen(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-text-muted hover:text-text-main hover:bg-surface"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-text-muted">
              Enter the 6-character cohort code provided by your instructor (e.g.{' '}
              <strong className="text-primary font-mono">CS-101</strong>) to access assigned practicals.
            </p>

            {cohortMsg && (
              <div
                className={`p-3 rounded-xl text-xs font-medium border ${
                  cohortMsg.type === 'success'
                    ? 'bg-tertiary/15 border-tertiary text-tertiary'
                    : 'bg-error/15 border-error text-error'
                }`}
              >
                {cohortMsg.text}
              </div>
            )}

            <form onSubmit={handleJoinClassroom} className="flex flex-col gap-3">
              <input
                type="text"
                placeholder="e.g. CS-101"
                maxLength={10}
                value={joinCodeInput}
                onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                className="w-full p-3 font-mono text-center text-lg tracking-widest rounded-xl bg-surface border border-border text-text-main focus:outline-none focus:ring-2 focus:ring-primary uppercase"
              />
              <button
                type="submit"
                disabled={submittingCohort || !joinCodeInput.trim()}
                className="w-full py-2.5 rounded-full bg-primary hover:bg-primary/90 text-white text-xs font-bold transition-all shadow-md disabled:opacity-50"
              >
                {submittingCohort ? 'Verifying Code...' : 'Enroll in Cohort'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: CREATE ACADEMIC COHORT                                           */}
      {/* ========================================================================= */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-surface-elevated rounded-3xl border border-border p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <div className="flex items-center gap-2 text-secondary font-bold">
                <Plus className="w-5 h-5" />
                <span className="text-sm">Create New Academic Cohort</span>
              </div>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-text-muted hover:text-text-main hover:bg-surface"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {cohortMsg && (
              <div
                className={`p-3 rounded-xl text-xs font-medium border ${
                  cohortMsg.type === 'success'
                    ? 'bg-tertiary/15 border-tertiary text-tertiary'
                    : 'bg-error/15 border-error text-error'
                }`}
              >
                {cohortMsg.text}
              </div>
            )}

            <form onSubmit={handleCreateClassroom} className="flex flex-col gap-3">
              <div>
                <label className="text-[11px] font-bold text-text-muted uppercase">Course / Cohort Name</label>
                <input
                  type="text"
                  placeholder="e.g. CS-301: Advanced Database Design"
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  className="w-full p-2.5 mt-1 text-xs rounded-xl bg-surface border border-border text-text-main focus:outline-none focus:ring-2 focus:ring-secondary"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-text-muted uppercase">
                  Custom Invite Code (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. DATA-301"
                  maxLength={10}
                  value={newClassCode}
                  onChange={(e) => setNewClassCode(e.target.value.toUpperCase())}
                  className="w-full p-2.5 mt-1 font-mono text-xs rounded-xl bg-surface border border-border text-text-main focus:outline-none focus:ring-2 focus:ring-secondary uppercase"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-text-muted uppercase">Syllabus Description</label>
                <textarea
                  rows={3}
                  placeholder="Describe the cohort scope, syllabus requirements, and lab assignments..."
                  value={newClassDesc}
                  onChange={(e) => setNewClassDesc(e.target.value)}
                  className="w-full p-2.5 mt-1 text-xs rounded-xl bg-surface border border-border text-text-main focus:outline-none focus:ring-2 focus:ring-secondary"
                />
              </div>

              <button
                type="submit"
                disabled={submittingCohort || !newClassName.trim()}
                className="w-full py-2.5 mt-2 rounded-full bg-secondary hover:bg-secondary/90 text-white text-xs font-bold transition-all shadow-md disabled:opacity-50"
              >
                {submittingCohort ? 'Provisioning Cohort...' : 'Create Academic Cohort'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: VIEW CLASSROOM ROSTER                                            */}
      {/* ========================================================================= */}
      {rosterModalOpen && activeCohortForRoster && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-2xl bg-surface-elevated rounded-3xl border border-border p-6 shadow-2xl flex flex-col gap-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-secondary/15 text-secondary border border-secondary/30">
                    {activeCohortForRoster.code}
                  </span>
                  <h3 className="text-base font-bold text-text-main">{activeCohortForRoster.name}</h3>
                </div>
                <p className="text-xs text-text-muted mt-1">
                  Enrolled student roster &bull; Real-time challenge completion tracking
                </p>
              </div>
              <button
                onClick={() => setRosterModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-text-muted hover:text-text-main hover:bg-surface"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {loadingRoster ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2">
                <div className="w-6 h-6 border-2 border-secondary border-t-transparent rounded-full animate-spin"></div>
                <span className="text-xs text-text-muted">Loading enrolled students...</span>
              </div>
            ) : cohortRoster.length === 0 ? (
              <div className="py-10 text-center text-xs text-text-muted border border-dashed border-border rounded-xl">
                No students enrolled in this section yet. Share invite code{' '}
                <strong className="text-secondary font-mono">{activeCohortForRoster.code}</strong>.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-border text-text-muted font-mono uppercase text-[10px]">
                      <th className="py-2 px-3">Student</th>
                      <th className="py-2 px-3">Email</th>
                      <th className="py-2 px-3">Level / XP</th>
                      <th className="py-2 px-3">Challenges Solved</th>
                      <th className="py-2 px-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {cohortRoster.map((s) => (
                      <tr key={s.id} className="hover:bg-surface/50">
                        <td className="py-2.5 px-3 font-bold text-text-main">{s.displayName}</td>
                        <td className="py-2.5 px-3 font-mono text-text-muted text-[11px]">{s.email}</td>
                        <td className="py-2.5 px-3 font-mono">
                          Lvl {s.level} &bull; <span className="text-secondary font-bold">{s.xp} XP</span>
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-tertiary">
                          {s.solvedCount || 0} Solved
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <span className="px-2 py-0.5 rounded-full bg-tertiary/15 text-tertiary font-mono text-[10px] font-bold">
                            Enrolled
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="pt-2 border-t border-border flex justify-end">
              <button
                onClick={() => setRosterModalOpen(false)}
                className="px-4 py-2 rounded-full bg-surface-high hover:bg-surface-low text-text-main text-xs font-bold border border-border"
              >
                Close Roster
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: VIEW ENROLLED COHORT ASSIGNMENTS (STUDENT DELIVERY)              */}
      {/* ========================================================================= */}
      {studentAssignmentModalCohort && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-2xl bg-surface-elevated rounded-3xl border border-border p-6 shadow-2xl flex flex-col gap-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                    {studentAssignmentModalCohort.code}
                  </span>
                  <h3 className="text-base font-bold text-text-main">{studentAssignmentModalCohort.name}</h3>
                </div>
                <p className="text-xs text-text-muted mt-1">
                  Instructor: {studentAssignmentModalCohort.facultyName || 'Faculty'} &bull; Assigned Academic Curriculum
                </p>
              </div>
              <button
                onClick={() => setStudentAssignmentModalCohort(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-text-muted hover:text-text-main hover:bg-surface"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {loadingStudentAssignments ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                <span className="text-xs text-text-muted">Loading assigned curriculum...</span>
              </div>
            ) : studentCohortAssignments.length === 0 ? (
              <div className="py-10 text-center text-xs text-text-muted border border-dashed border-border rounded-xl flex flex-col items-center gap-2">
                <BookOpen className="w-8 h-8 text-text-muted/50" />
                <span>No curriculum assignments currently dispatched for this cohort.</span>
                <span className="text-[11px] text-text-muted/80">Check back after your instructor assigns practical lessons.</span>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="text-[11px] font-mono uppercase text-text-muted tracking-wider">
                  Active Syllabus Assignments ({studentCohortAssignments.length})
                </div>
                {studentCohortAssignments.map((asg) => (
                  <div
                    key={asg.id}
                    className="p-4 rounded-2xl bg-surface border border-border/80 hover:border-primary/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                          Active
                        </span>
                        <span className="text-xs font-mono text-text-muted uppercase">
                          {asg.targetType} &bull; {asg.targetCategory || 'Curriculum'}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-text-main">
                        {asg.targetTitle || asg.targetId}
                      </h4>
                      {asg.targetDescription && (
                        <p className="text-xs text-text-muted line-clamp-1">{asg.targetDescription}</p>
                      )}
                      <div className="flex items-center gap-3 text-[11px] font-mono text-text-muted mt-1">
                        <span>Assigned to: <strong className="text-primary">{asg.cohortCode || studentAssignmentModalCohort.code}</strong></span>
                        {asg.targetXpReward ? (
                          <span className="text-secondary font-bold">+{asg.targetXpReward} XP</span>
                        ) : null}
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center">
                      <Link
                        href={asg.targetType === 'lesson' ? `/learn?lessonId=${asg.targetId}` : `/challenges?id=${asg.targetId}`}
                        className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
                      >
                        <span>Open in Lab</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-2 border-t border-border flex justify-end">
              <button
                onClick={() => setStudentAssignmentModalCohort(null)}
                className="px-4 py-2 rounded-full bg-surface-high hover:bg-surface-low text-text-main text-xs font-bold border border-border"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
