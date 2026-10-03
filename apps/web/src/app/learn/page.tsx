'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Course, Module, Lesson, LessonSection, ContentBlock, UserProfile, CohortAssignment } from '@datachan/shared-types';
import {
  BookOpen,
  CheckCircle2,
  Lock,
  Play,
  ArrowRight,
  Clock,
  Sparkles,
  Trophy,
  Terminal,
  ChevronRight,
  ChevronDown,
  Award,
  FileText,
  Code2,
  AlertCircle,
  Image as ImageIcon,
  Lightbulb,
  ExternalLink,
  Edit3,
  Layers,
  Check,
  GraduationCap,
} from 'lucide-react';
import {
  Button,
  Badge,
  Card,
  EmptyState,
  LoadingState,
} from '@/components/ui';

export default function LearnPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [lessonsByModule, setLessonsByModule] = useState<Record<string, Lesson[]>>({});
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [sections, setSections] = useState<(LessonSection & { isCompleted?: boolean })[]>([]);
  const [activeSectionIndex, setActiveSectionIndex] = useState<number>(0);
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});
  const [myAssignments, setMyAssignments] = useState<CohortAssignment[]>([]);
  const [assignedOnlyFilter, setAssignedOnlyFilter] = useState(false);

  const [loading, setLoading] = useState(true);
  const [sectionsLoading, setSectionsLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);

  // Playground practical state inside section
  const [practiceCode, setPracticeCode] = useState('');
  const [practiceResult, setPracticeResult] = useState<any | null>(null);
  const [practicing, setPracticing] = useState(false);
  const [claimedXp, setClaimedXp] = useState<number | null>(null);
  const [completingSectionId, setCompletingSectionId] = useState<string | null>(null);

  // 1. Initial Load: User & Published Courses & Cohort Assignments
  useEffect(() => {
    async function init() {
      setLoading(true);
      try {
        const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
        const targetLessonId = urlParams?.get('lessonId');
        const filterAssigned = urlParams?.get('assignedOnly') === 'true';

        if (filterAssigned) {
          setAssignedOnlyFilter(true);
        }

        const [me, courseList, cohortAssignments] = await Promise.all([
          api.getMe().catch(() => null),
          api.listCourses(),
          api.listMyCohortAssignments().catch(() => []),
        ]);
        setCurrentUser(me);
        setCourses(courseList);
        setMyAssignments(cohortAssignments || []);

        if (courseList.length > 0) {
          const firstCourse = courseList[0];
          setSelectedCourse(firstCourse);
          await loadCourseStructure(firstCourse.id, targetLessonId);
        }
      } catch (err) {
        console.error('Failed to initialize curriculum:', err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  // 2. Load Modules & Lessons for a Course
  async function loadCourseStructure(courseId: string, preferredLessonId?: string | null) {
    try {
      const modList = await api.listModules(courseId);
      setModules(modList);

      // Auto-expand all modules initially
      const expMap: Record<string, boolean> = {};
      modList.forEach((m) => {
        expMap[m.id] = true;
      });
      setExpandedModules(expMap);

      // Fetch lessons for all modules
      const lessonsMap: Record<string, Lesson[]> = {};
      let firstLessonToSelect: Lesson | null = null;
      let matchedLesson: Lesson | null = null;

      await Promise.all(
        modList.map(async (m) => {
          const mLessons = await api.listLessons(m.id);
          lessonsMap[m.id] = mLessons;
          if (!firstLessonToSelect && mLessons.length > 0) {
            firstLessonToSelect = mLessons[0];
          }
          if (preferredLessonId) {
            const found = mLessons.find((l) => l.id === preferredLessonId);
            if (found) {
              matchedLesson = found;
            }
          }
        })
      );
      setLessonsByModule(lessonsMap);

      if (matchedLesson) {
        await selectLesson(matchedLesson);
      } else if (firstLessonToSelect) {
        await selectLesson(firstLessonToSelect);
      }
    } catch (err) {
      console.error('Failed to load course structure:', err);
    }
  }

  // 3. Select a Lesson & Load its Sections
  async function selectLesson(lesson: Lesson) {
    setSelectedLesson(lesson);
    setPracticeResult(null);
    setClaimedXp(null);
    setSectionsLoading(true);
    try {
      const secList = await api.listSections(lesson.id);
      setSections(secList);
      setActiveSectionIndex(0);

      // Look for a playground block to seed practiceCode
      const playgroundBlock = secList
        .flatMap((s) => s.contentBlocks)
        .find((b) => b.type === 'playground');
      if (playgroundBlock && playgroundBlock.playgroundQuery) {
        setPracticeCode(playgroundBlock.playgroundQuery);
      } else {
        setPracticeCode(lesson.sampleQuery || 'db.students.find().limit(3)');
      }
    } catch (err) {
      console.error('Failed to load lesson sections:', err);
    } finally {
      setSectionsLoading(false);
    }
  }

  // 4. Complete a Section
  async function handleCompleteSection(sectionId: string) {
    if (!selectedLesson) return;
    setCompletingSectionId(sectionId);
    try {
      const res = await api.completeSection(sectionId);
      // Mark section complete in state
      setSections((prev) =>
        prev.map((s) => (s.id === sectionId ? { ...s, isCompleted: true } : s))
      );

      if (res.lessonCompleted) {
        setSelectedLesson((prev) => (prev ? { ...prev, completed: true, progressPercent: 100 } : null));
        if (res.xpAwarded && res.xpAwarded > 0) {
          setClaimedXp(res.xpAwarded);
        }
        // Update lesson in module lessons
        if (selectedLesson.moduleId) {
          setLessonsByModule((prev) => ({
            ...prev,
            [selectedLesson.moduleId!]: (prev[selectedLesson.moduleId!] || []).map((l) =>
              l.id === selectedLesson.id ? { ...l, completed: true, progressPercent: 100 } : l
            ),
          }));
        }
      }
    } catch (err: any) {
      alert(`Could not complete section: ${err.message}`);
    } finally {
      setCompletingSectionId(null);
    }
  }

  // 5. Run Practical Query (Interactive Playground block)
  async function handleRunPractice(customQuery?: string) {
    if (!selectedLesson) return;
    const queryToRun = (customQuery || practiceCode).trim();
    if (!queryToRun) return;

    setPracticing(true);
    setPracticeResult(null);
    try {
      const res = await api.runPractical(selectedLesson.id, queryToRun);
      setPracticeResult({
        data: res.result,
        documentsCount: res.documentsCount,
        executionTimeMs: res.executionTimeMs,
        targetDatabase: res.targetDatabase,
        collection: res.collection,
        syntaxBreakdown: res.syntaxBreakdown,
      });

      if (res.xpAwarded && res.xpAwarded > 0) {
        setClaimedXp(res.xpAwarded);
      }
    } catch (err: any) {
      setPracticeResult({ error: err.message || 'Execution error during query' });
    } finally {
      setPracticing(false);
    }
  }

  const toggleModule = (modId: string) => {
    setExpandedModules((prev) => ({ ...prev, [modId]: !prev[modId] }));
  };

  if (loading) {
    return (
      <LoadingState
        message="Loading Academic Curriculum Architecture..."
        fullScreen={false}
        className="min-h-[450px]"
      />
    );
  }

  const activeSection = sections[activeSectionIndex] || null;
  const isFacultyOrAdmin = currentUser?.role === 'faculty' || currentUser?.role === 'admin';

  // Overall stats
  const allLessons = Object.values(lessonsByModule).flat();
  const totalCompletedLessons = allLessons.filter((l) => l.completed).length;

  // Cohort Assignment Computations
  const activeCohortAssignments = myAssignments.filter((a) => a.status === 'active');
  const assignedLessonIds = new Set(activeCohortAssignments.map((a) => a.targetId));
  const visibleModules = assignedOnlyFilter
    ? modules.filter((m) => (lessonsByModule[m.id] || []).some((l) => assignedLessonIds.has(l.id)))
    : modules;
  const selectedLessonAssignment = selectedLesson
    ? activeCohortAssignments.find((a) => a.targetId === selectedLesson.id)
    : null;

  return (
    <div className="flex flex-col gap-6 w-full flex-1">
      {/* ========================================================================= */}
      {/* TOP HEADER: Course Selector, Progress, & Studio Switcher                   */}
      {/* ========================================================================= */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-primary/15 text-primary px-2.5 py-0.5 rounded-full border border-primary/20 flex items-center gap-1.5">
              <Layers className="w-3 h-3" />
              <span>Course Curriculum</span>
            </span>
            {selectedCourse?.status === 'published' && (
              <span className="text-[10px] font-mono font-bold uppercase text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                Official Release
              </span>
            )}
          </div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight text-text flex items-center gap-2.5">
            <BookOpen className="w-7 h-7 text-primary shrink-0" />
            <span>{selectedCourse?.title || 'Data-Chan Curriculum'}</span>
          </h1>
          <p className="text-xs sm:text-sm text-text-muted max-w-3xl">
            {selectedCourse?.description ||
              'Canonical academic learning architecture: Course -> Module -> Lesson -> Section -> Interactive Content.'}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {/* Progress Pill */}
          <div className="flex items-center gap-2.5 bg-surface-high/60 px-4 py-2 rounded-2xl border border-border shadow-sm">
            <Award className="w-5 h-5 text-secondary shrink-0" />
            <div className="text-xs">
              <span className="font-bold text-text font-mono">{totalCompletedLessons}</span> /{' '}
              <span className="text-text-muted font-mono">{allLessons.length}</span> Lessons Done
            </div>
          </div>

          {/* Faculty / Admin Studio Switcher */}
          {isFacultyOrAdmin && (
            <Link
              href="/learn/studio"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-secondary hover:bg-secondary/90 text-white text-xs font-bold shadow-md hover:scale-105 transition-all"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Curriculum Studio</span>
            </Link>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MAIN 2-COLUMN LAYOUT: Left Tree (~30%) & Right Reader (~70%)               */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start flex-1">
        {/* ========================================================================= */}
        {/* LEFT COLUMN: Modules -> Lessons Tree                                      */}
        {/* ========================================================================= */}
        <div className="lg:col-span-4 flex flex-col gap-3">
          {/* Syllabus Scope Toggle: All Courses vs Assigned to My Cohort */}
          <div className="flex items-center gap-1.5 p-1 bg-surface-high/60 rounded-xl border border-border">
            <div
              role="button"
              onClick={() => setAssignedOnlyFilter(false)}
              className={`flex-1 py-1.5 text-center text-xs font-bold rounded-lg transition-all cursor-pointer ${
                !assignedOnlyFilter
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-text-muted hover:text-text hover:bg-surface'
              }`}
            >
              All Courses
            </div>
            <div
              role="button"
              onClick={() => setAssignedOnlyFilter(true)}
              className={`flex-1 py-1.5 text-center text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                assignedOnlyFilter
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-text-muted hover:text-text hover:bg-surface'
              }`}
            >
              <span>Assigned to My Cohort</span>
              {myAssignments.length > 0 && (
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                    assignedOnlyFilter ? 'bg-white/20 text-white' : 'bg-secondary/20 text-secondary'
                  }`}
                >
                  {myAssignments.length}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between pb-1">
            <span className="text-xs font-bold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
              <span>{assignedOnlyFilter ? 'Assigned Syllabus' : 'Academic Roadmap'}</span>
            </span>
            <span className="text-[11px] font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
              {visibleModules.length} Modules &bull;{' '}
              {visibleModules.reduce((acc, m) => acc + (lessonsByModule[m.id] || []).filter(l => !assignedOnlyFilter || assignedLessonIds.has(l.id)).length, 0)} Lessons
            </span>
          </div>

          <div className="flex flex-col gap-3 max-h-[750px] overflow-y-auto pr-1">
            {assignedOnlyFilter && visibleModules.length === 0 ? (
              <div className="p-6 rounded-2xl border border-dashed border-border text-center flex flex-col items-center gap-2">
                <BookOpen className="w-8 h-8 text-text-muted/40" />
                <p className="text-xs text-text-muted font-bold">No cohort assignments found</p>
                <p className="text-[11px] text-text-muted">
                  Lessons assigned by your university instructors will appear here.
                </p>
                <div
                  role="button"
                  onClick={() => setAssignedOnlyFilter(false)}
                  className="mt-2 text-xs text-primary font-bold hover:underline cursor-pointer"
                >
                  View All Curriculum
                </div>
              </div>
            ) : visibleModules.map((mod) => {
              const isExpanded = expandedModules[mod.id] ?? true;
              const moduleLessons = (lessonsByModule[mod.id] || []).filter(
                (l) => !assignedOnlyFilter || assignedLessonIds.has(l.id)
              );
              const modCompleted = moduleLessons.filter((l) => l.completed).length;

              return (
                <div
                  key={mod.id}
                  className="rounded-2xl border border-border bg-surface overflow-hidden shadow-sm transition-all"
                >
                  {/* Module Header */}
                  <div
                    role="button"
                    onClick={() => toggleModule(mod.id)}
                    className="w-full p-3.5 flex items-center justify-between gap-3 text-left bg-surface-high/40 hover:bg-surface-high transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <div className="w-6 h-6 rounded-lg bg-primary/15 text-primary flex items-center justify-center font-mono text-[11px] font-bold shrink-0">
                        {mod.order}
                      </div>
                      <div className="truncate">
                        <h3 className="text-xs font-bold text-text truncate">{mod.title}</h3>
                        <p className="text-[10px] text-text-muted truncate">{mod.description}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] font-mono text-text-muted">
                        {modCompleted}/{moduleLessons.length}
                      </span>
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-text-muted" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-text-muted" />
                      )}
                    </div>
                  </div>

                  {/* Lessons List inside Module */}
                  {isExpanded && (
                    <div className="p-2 flex flex-col gap-1.5 border-t border-border/50">
                      {moduleLessons.map((lesson) => {
                        const isSelected = selectedLesson?.id === lesson.id;
                        const lessonAssignment = activeCohortAssignments.find(
                          (a) => a.targetId === lesson.id
                        );

                        return (
                          <div
                            key={lesson.id}
                            onClick={() => selectLesson(lesson)}
                            className={`p-2.5 rounded-xl cursor-pointer transition-all border flex items-center justify-between gap-2.5 ${
                              isSelected
                                ? 'bg-primary text-white border-primary shadow-sm scale-[1.01]'
                                : lesson.completed
                                ? 'bg-surface-low hover:bg-surface-high border-tertiary-container/30 text-text'
                                : 'bg-surface hover:bg-surface-high border-border/80 text-text'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 truncate">
                              <div
                                className={`w-6 h-6 rounded-full flex items-center justify-center font-mono text-[10px] font-bold shrink-0 ${
                                  isSelected
                                    ? 'bg-white/20 text-white'
                                    : lesson.completed
                                    ? 'bg-emerald-500/20 text-emerald-500'
                                    : 'bg-surface-high text-text-muted'
                                }`}
                              >
                                {lesson.completed ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-500 stroke-[3]" />
                                ) : (
                                  lesson.order
                                )}
                              </div>
                              <div className="truncate">
                                <h4 className="text-xs font-bold truncate leading-tight">
                                  {lesson.title}
                                </h4>
                                <span
                                  className={`text-[10px] font-mono ${
                                    isSelected ? 'text-white/80' : 'text-text-muted'
                                  }`}
                                >
                                  {lesson.category} &bull; {lesson.sectionsCount || 3} sections
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {lessonAssignment && (
                                <span
                                  className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border shrink-0 ${
                                    isSelected
                                      ? 'bg-white/20 text-white border-white/30'
                                      : 'bg-amber-500/15 text-amber-500 border-amber-500/30'
                                  }`}
                                >
                                  {lessonAssignment.cohortCode || 'Assigned'}
                                </span>
                              )}
                              <span
                                className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full shrink-0 ${
                                  isSelected
                                    ? 'bg-white/20 text-white'
                                    : 'bg-secondary/15 text-secondary'
                                }`}
                              >
                                +{lesson.xpReward} XP
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* RIGHT COLUMN: Active Lesson & Section Reader (~70%)                        */}
        {/* ========================================================================= */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {selectedLesson ? (
            <div className="bg-surface rounded-3xl border border-border shadow-soft p-5 sm:p-7 flex flex-col gap-6">
              {/* Cohort Assignment Active Banner if lesson is assigned */}
              {selectedLessonAssignment && (
                <div className="bg-amber-500/10 border border-amber-500/25 text-amber-500 px-4 py-2.5 rounded-2xl text-xs font-bold flex flex-col sm:flex-row sm:items-center justify-between gap-2 animate-fadeIn">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 shrink-0 text-amber-500" />
                    <span>
                      Assigned to: <strong className="font-mono">{selectedLessonAssignment.cohortCode}</strong> ({selectedLessonAssignment.cohortName || 'Enrolled Cohort'})
                    </span>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-mono text-[10px] uppercase shrink-0">
                    <Check className="w-3 h-3" />
                    <span>Active Assignment</span>
                  </span>
                </div>
              )}

              {/* Lesson Banner Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-primary/10 text-primary px-2 py-0.5 rounded-full border border-primary/20">
                      Lesson {selectedLesson.order} &bull; {selectedLesson.category}
                    </span>
                    <span className="text-xs font-mono text-text-muted flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {selectedLesson.estimatedMinutes || 15} mins
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-text">
                    {selectedLesson.title}
                  </h2>
                  <p className="text-xs text-text-muted">{selectedLesson.description}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {selectedLesson.completed ? (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/15 text-emerald-500 text-xs font-bold border border-emerald-500/20">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Lesson Completed</span>
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-high text-text-muted text-xs font-mono font-bold border border-border">
                      <span>{selectedLesson.progressPercent || 0}% Complete</span>
                    </div>
                  )}
                </div>
              </div>

              {claimedXp && (
                <div className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2.5 animate-fadeIn">
                  <Sparkles className="w-5 h-5 shrink-0" />
                  <span>
                    Congratulations! You earned +{claimedXp} XP for completing this lesson curriculum!
                  </span>
                </div>
              )}

              {/* ===================================================================== */}
              {/* SECTION NAVIGATION TABS                                               */}
              {/* ===================================================================== */}
              {sectionsLoading ? (
                <LoadingState
                  message="Loading lesson sections..."
                  fullScreen={false}
                  className="py-12"
                />
              ) : sections.length > 0 ? (
                <div className="flex flex-col gap-5">
                  <div className="flex items-center justify-between pb-1">
                    <span className="text-xs font-bold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-primary" />
                      <span>Lesson Sections ({sections.length})</span>
                    </span>
                    <span className="text-[11px] font-mono text-text-muted">
                      Section {activeSectionIndex + 1} of {sections.length}
                    </span>
                  </div>

                  {/* Section Stepper Pills */}
                  <div className="flex flex-wrap gap-2">
                    {sections.map((sec, idx) => {
                      const isActive = activeSectionIndex === idx;
                      return (
                        <div
                          key={sec.id}
                          role="button"
                          onClick={() => setActiveSectionIndex(idx)}
                          className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                            isActive
                              ? 'bg-primary text-white border-primary shadow-sm scale-105'
                              : sec.isCompleted
                              ? 'bg-surface-high border-emerald-500/30 text-text hover:border-emerald-500'
                              : 'bg-surface-low border-border text-text-muted hover:text-text'
                          }`}
                        >
                          <span
                            className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-mono ${
                              isActive
                                ? 'bg-white/20 text-white'
                                : sec.isCompleted
                                ? 'bg-emerald-500/20 text-emerald-500'
                                : 'bg-surface-high text-text-muted'
                            }`}
                          >
                            {sec.isCompleted ? <Check className="w-3 h-3 stroke-[3]" /> : idx + 1}
                          </span>
                          <span>{sec.title}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Active Section Content Container */}
                  {activeSection && (
                    <div className="flex flex-col gap-6 pt-2">
                      <div className="pb-3 border-b border-border/60">
                        <h3 className="text-lg font-bold text-text flex items-center gap-2">
                          <span className="text-primary font-mono text-sm">
                            {activeSectionIndex + 1}.
                          </span>
                          <span>{activeSection.title}</span>
                        </h3>
                        {activeSection.description && (
                          <p className="text-xs text-text-muted mt-1">
                            {activeSection.description}
                          </p>
                        )}
                      </div>

                      {/* Content Blocks Renderer */}
                      <div className="flex flex-col gap-5">
                        {activeSection.contentBlocks.map((block, bIdx) => {
                          switch (block.type) {
                            case 'text':
                              return (
                                <div
                                  key={bIdx}
                                  className="text-xs sm:text-sm text-text leading-relaxed whitespace-pre-wrap font-sans bg-surface-low/40 p-4 rounded-2xl border border-border"
                                >
                                  {block.content}
                                </div>
                              );

                            case 'code':
                              return (
                                <div key={bIdx} className="flex flex-col gap-1.5">
                                  <div className="flex items-center justify-between text-[11px] font-mono text-text-muted px-1">
                                    <span className="font-bold flex items-center gap-1.5 text-primary">
                                      <Code2 className="w-3.5 h-3.5" />
                                      <span>Code Walkthrough ({block.language || 'mongodb'})</span>
                                    </span>
                                  </div>
                                  <pre className="p-4 rounded-2xl bg-inverse-surface text-inverse-text font-mono text-xs overflow-x-auto border border-white/10 shadow-inner">
                                    {block.content}
                                  </pre>
                                </div>
                              );

                            case 'output':
                              return (
                                <div key={bIdx} className="flex flex-col gap-1.5">
                                  <span className="text-[10px] font-mono font-bold text-text-muted uppercase px-1">
                                    Expected Terminal Output:
                                  </span>
                                  <pre className="p-3.5 rounded-2xl bg-[#090d16] text-emerald-400 font-mono text-xs overflow-x-auto border border-emerald-500/20 shadow-inner">
                                    {block.content}
                                  </pre>
                                </div>
                              );

                            case 'note':
                              return (
                                <div
                                  key={bIdx}
                                  className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 flex items-start gap-3"
                                >
                                  <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                                  <div className="text-xs leading-relaxed">{block.content}</div>
                                </div>
                              );

                            case 'image':
                              return (
                                <div key={bIdx} className="flex flex-col items-center gap-2 p-2">
                                  <img
                                    src={block.content}
                                    alt={block.altText || 'Curriculum Diagram'}
                                    className="rounded-2xl max-h-[360px] object-contain border border-border shadow-md"
                                  />
                                  {block.caption && (
                                    <span className="text-[11px] text-text-muted font-medium text-center">
                                      {block.caption}
                                    </span>
                                  )}
                                </div>
                              );

                            case 'example':
                              return (
                                <div
                                  key={bIdx}
                                  className="p-4 rounded-2xl bg-surface-high border border-border flex flex-col gap-2"
                                >
                                  <div className="flex items-center gap-2 text-xs font-bold text-secondary">
                                    <Lightbulb className="w-4 h-4" />
                                    <span>Realistic Application Pattern</span>
                                  </div>
                                  <p className="text-xs text-text leading-relaxed whitespace-pre-wrap">
                                    {block.content}
                                  </p>
                                </div>
                              );

                            case 'playground':
                              return (
                                <div
                                  key={bIdx}
                                  className="bg-surface-low rounded-2xl p-5 border border-primary/30 flex flex-col gap-4 shadow-sm"
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
                                      <Terminal className="w-4 h-4" />
                                      <span>Hands-On Sandbox Experiment</span>
                                    </div>
                                    <span className="text-[11px] font-mono text-text-muted">
                                      Collection: db.{block.targetCollection || selectedLesson.practiceCollection || 'students'}
                                    </span>
                                  </div>

                                  <p className="text-xs text-text-muted">{block.content}</p>

                                  <textarea
                                    rows={4}
                                    value={practiceCode}
                                    onChange={(e) => setPracticeCode(e.target.value)}
                                    placeholder="Enter MQL query, e.g. db.students.find().limit(2)"
                                    className="w-full p-3 font-mono text-xs rounded-xl bg-surface border border-border text-text focus:outline-none focus:ring-2 focus:ring-primary shadow-inner"
                                  />

                                  <div className="flex items-center justify-between">
                                    <Link
                                      href="/playground"
                                      className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                                    >
                                      <span>Open Full Mongo Playground</span>
                                      <ExternalLink className="w-3.5 h-3.5" />
                                    </Link>

                                    <Button
                                      onClick={() => handleRunPractice()}
                                      disabled={practicing}
                                      variant="primary"
                                      className="rounded-full shadow-md hover:scale-105 active:scale-95"
                                      leftIcon={<Play className="w-3.5 h-3.5 fill-current" />}
                                    >
                                      {practicing ? 'Executing Query...' : 'Run Query'}
                                    </Button>
                                  </div>

                                  {practiceResult && (
                                    <div className="mt-2 flex flex-col gap-2">
                                      <div className="flex items-center justify-between text-[11px] font-mono">
                                        <span className="font-bold text-text-muted">
                                          Query Execution Output:
                                        </span>
                                        {practiceResult.executionTimeMs !== undefined && (
                                          <span className="text-emerald-500 font-bold">
                                            ✓ {practiceResult.executionTimeMs}ms &bull;{' '}
                                            {practiceResult.documentsCount} documents returned
                                          </span>
                                        )}
                                      </div>

                                      {practiceResult.error ? (
                                        <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl text-xs font-mono">
                                          {practiceResult.error}
                                        </div>
                                      ) : (
                                        <pre className="p-3 bg-inverse-surface text-inverse-text rounded-xl font-mono text-xs max-h-[220px] overflow-auto whitespace-pre-wrap">
                                          {JSON.stringify(practiceResult.data, null, 2)}
                                        </pre>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );

                            default:
                              return null;
                          }
                        })}
                      </div>

                      {/* Section Completion Bar & Next/Prev Controls */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-5 border-t border-border mt-4">
                        <div className="flex items-center gap-2">
                          {activeSection.isCompleted ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-500 text-xs font-bold border border-emerald-500/20">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Section Completed</span>
                            </span>
                          ) : (
                            <Button
                              onClick={() => handleCompleteSection(activeSection.id)}
                              disabled={completingSectionId === activeSection.id}
                              className="rounded-full shadow-md hover:scale-105 active:scale-95 bg-emerald-600 hover:bg-emerald-500 text-white border-none"
                              leftIcon={<Check className="w-4 h-4 stroke-[3]" />}
                            >
                                {completingSectionId === activeSection.id
                                  ? 'Marking...'
                                  : 'Mark Section Complete'}
                            </Button>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            onClick={() =>
                              setActiveSectionIndex((prev) => Math.max(0, prev - 1))
                            }
                            disabled={activeSectionIndex === 0}
                            className="rounded-xl"
                          >
                            Previous
                          </Button>
                          <Button
                            variant="primary"
                            onClick={() =>
                              setActiveSectionIndex((prev) =>
                                Math.min(sections.length - 1, prev + 1)
                              )
                            }
                            disabled={activeSectionIndex === sections.length - 1}
                            className="rounded-xl"
                            rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
                          >
                            Next Section
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-8 text-center text-text-muted text-xs">
                  No sections published in this lesson yet.
                </div>
              )}

              {/* ===================================================================== */}
              {/* SEPARATE EXTENSION CARDS: Challenges & Practicals                      */}
              {/* (Kept separate from sections as per architectural invariant)         */}
              {/* ===================================================================== */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-border">
                {/* Challenge Action Card */}
                {selectedLesson.challengeIds && selectedLesson.challengeIds.length > 0 && (
                  <div className="p-4 rounded-2xl bg-surface-high border border-border flex flex-col justify-between gap-3">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2 text-xs font-bold text-secondary">
                        <Trophy className="w-4 h-4" />
                        <span>Lesson Challenges Available</span>
                      </div>
                      <p className="text-xs text-text-muted">
                        Test and evaluate your understanding of {selectedLesson.title} with an automated grading benchmark.
                      </p>
                    </div>
                    <Link
                      href="/challenges"
                      className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-secondary/15 hover:bg-secondary/25 text-secondary text-xs font-bold transition-all border border-secondary/30"
                    >
                      <span>Take Associated Challenge</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                )}

                {/* Open Playground Experimentation Card */}
                <div className="p-4 rounded-2xl bg-surface-high border border-border flex flex-col justify-between gap-3">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2 text-xs font-bold text-primary">
                      <Terminal className="w-4 h-4" />
                      <span>Free-Form Sandbox Experimentation</span>
                    </div>
                    <p className="text-xs text-text-muted">
                      Open your dedicated virtual database sandbox to test complex queries without bounds.
                    </p>
                  </div>
                  <Link
                    href="/playground"
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-primary/15 hover:bg-primary/25 text-primary text-xs font-bold transition-all border border-primary/30"
                  >
                    <span>Launch Mongo Playground</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <EmptyState
              icon={BookOpen}
              title="No Lesson Selected"
              description="Select a lesson from the roadmap on the left to begin learning."
            />
          )}
        </div>
      </div>
    </div>
  );
}
