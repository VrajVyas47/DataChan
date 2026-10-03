'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import {
  Course,
  Module,
  Lesson,
  LessonSection,
  ContentBlock,
  ContentBlockType,
  UserProfile,
} from '@datachan/shared-types';
import {
  BookOpen,
  ArrowLeft,
  Plus,
  Trash2,
  Edit2,
  ArrowUp,
  ArrowDown,
  Check,
  Eye,
  Save,
  Globe,
  FileEdit,
  Code2,
  FileText,
  AlertCircle,
  Image as ImageIcon,
  Lightbulb,
  Terminal,
  Layers,
  ChevronRight,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';

export default function CurriculumStudioPage() {
  const router = useRouter();

  // Auth / Role Guard
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  // Hierarchy State
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

  const [modules, setModules] = useState<Module[]>([]);
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);

  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);

  const [sections, setSections] = useState<LessonSection[]>([]);
  const [selectedSection, setSelectedSection] = useState<LessonSection | null>(null);

  // Active Content Blocks in selected section
  const [activeBlocks, setActiveBlocks] = useState<ContentBlock[]>([]);
  const [savingSection, setSavingSection] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  // Modals for CRUD
  const [modalMode, setModalMode] = useState<
    'createCourse' | 'editCourse' | 'createModule' | 'editModule' | 'createLesson' | 'editLesson' | 'createSection' | null
  >(null);

  // Form Inputs
  const [formData, setFormData] = useState<any>({});

  // 1. Initial Load & Auth Check
  useEffect(() => {
    async function init() {
      setLoading(true);
      try {
        const me = await api.getMe();
        setCurrentUser(me);
        if (me.role !== 'faculty' && me.role !== 'admin') {
          setAuthorized(false);
          setLoading(false);
          return;
        }
        setAuthorized(true);
        await loadCourses();
      } catch (err) {
        setAuthorized(false);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  async function loadCourses() {
    try {
      // Faculty/Admin see all courses (both draft and published)
      const list = await api.listCourses();
      setCourses(list);
      if (list.length > 0) {
        const c = list[0];
        setSelectedCourse(c);
        await selectCourse(c);
      } else {
        setSelectedCourse(null);
        setModules([]);
        setLessons([]);
        setSections([]);
        setSelectedSection(null);
      }
    } catch (err) {
      console.error('Failed to load courses:', err);
    }
  }

  async function selectCourse(course: Course) {
    setSelectedCourse(course);
    setSelectedModule(null);
    setSelectedLesson(null);
    setSelectedSection(null);
    setActiveBlocks([]);
    try {
      const modList = await api.listModules(course.id);
      setModules(modList);
      if (modList.length > 0) {
        await selectModule(modList[0]);
      } else {
        setLessons([]);
        setSections([]);
      }
    } catch (err) {
      console.error('Failed to load modules:', err);
    }
  }

  async function selectModule(module: Module) {
    setSelectedModule(module);
    setSelectedLesson(null);
    setSelectedSection(null);
    setActiveBlocks([]);
    try {
      const lessList = await api.listLessons(module.id);
      setLessons(lessList);
      if (lessList.length > 0) {
        await selectLesson(lessList[0]);
      } else {
        setSections([]);
      }
    } catch (err) {
      console.error('Failed to load lessons:', err);
    }
  }

  async function selectLesson(lesson: Lesson) {
    setSelectedLesson(lesson);
    setSelectedSection(null);
    setActiveBlocks([]);
    try {
      const secList = await api.listSections(lesson.id);
      setSections(secList);
      if (secList.length > 0) {
        selectSection(secList[0]);
      }
    } catch (err) {
      console.error('Failed to load sections:', err);
    }
  }

  function selectSection(section: LessonSection) {
    setSelectedSection(section);
    setActiveBlocks(section.contentBlocks || []);
  }

  // =========================================================================
  // COURSE OPERATIONS
  // =========================================================================
  async function handleSaveCourse() {
    if (!formData.title?.trim()) return alert('Course title is required');
    try {
      if (modalMode === 'createCourse') {
        const created = await api.createCourse({
          title: formData.title.trim(),
          description: formData.description || '',
          status: formData.status || 'draft',
        });
        await loadCourses();
        setSelectedCourse(created);
      } else if (modalMode === 'editCourse' && selectedCourse) {
        const updated = await api.updateCourse(selectedCourse.id, {
          title: formData.title.trim(),
          description: formData.description,
          status: formData.status,
        });
        setCourses((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
        setSelectedCourse(updated);
      }
      setModalMode(null);
    } catch (err: any) {
      alert(`Course action failed: ${err.message}`);
    }
  }

  async function handleDeleteCourse(id: string) {
    if (!confirm('Are you sure you want to delete this course? All associated modules, lessons, and sections will be permanently deleted.')) return;
    try {
      await api.deleteCourse(id);
      await loadCourses();
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    }
  }

  // =========================================================================
  // MODULE OPERATIONS & REORDER
  // =========================================================================
  async function handleSaveModule() {
    if (!selectedCourse) return;
    if (!formData.title?.trim()) return alert('Module title is required');
    try {
      if (modalMode === 'createModule') {
        const created = await api.createModule({
          courseId: selectedCourse.id,
          title: formData.title.trim(),
          description: formData.description || '',
          status: formData.status || 'draft',
        });
        const updatedMods = await api.listModules(selectedCourse.id);
        setModules(updatedMods);
        await selectModule(created);
      } else if (modalMode === 'editModule' && selectedModule) {
        const updated = await api.updateModule(selectedModule.id, {
          title: formData.title.trim(),
          description: formData.description,
          status: formData.status,
        });
        setModules((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
        setSelectedModule(updated);
      }
      setModalMode(null);
    } catch (err: any) {
      alert(`Module action failed: ${err.message}`);
    }
  }

  async function handleDeleteModule(id: string) {
    if (!confirm('Delete this module? All contained lessons and sections will also be deleted.')) return;
    try {
      await api.deleteModule(id);
      if (selectedCourse) {
        const updated = await api.listModules(selectedCourse.id);
        setModules(updated);
        if (updated.length > 0) selectModule(updated[0]);
        else {
          setSelectedModule(null);
          setLessons([]);
          setSections([]);
        }
      }
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    }
  }

  async function handleMoveModule(index: number, direction: 'up' | 'down') {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= modules.length) return;

    const newMods = [...modules];
    const [moved] = newMods.splice(index, 1);
    newMods.splice(targetIndex, 0, moved);

    const reorderPayload = newMods.map((m, idx) => ({ id: m.id, order: idx + 1 }));
    setModules(newMods.map((m, idx) => ({ ...m, order: idx + 1 })));

    try {
      await api.reorderModules(reorderPayload);
    } catch (err: any) {
      alert(`Reordering failed: ${err.message}`);
    }
  }

  // =========================================================================
  // LESSON OPERATIONS & REORDER
  // =========================================================================
  async function handleSaveLesson() {
    if (!selectedModule) return;
    if (!formData.title?.trim()) return alert('Lesson title is required');
    try {
      if (modalMode === 'createLesson') {
        const created = await api.createLesson({
          moduleId: selectedModule.id,
          courseId: selectedCourse?.id,
          title: formData.title.trim(),
          description: formData.description || '',
          category: formData.category || 'Curriculum',
          difficulty: formData.difficulty || 'beginner',
          status: formData.status || 'draft',
          xpReward: Number(formData.xpReward) || 50,
          practiceCollection: formData.practiceCollection || 'students',
          sampleQuery: formData.sampleQuery || 'db.students.find()',
        });
        const updatedLessons = await api.listLessons(selectedModule.id);
        setLessons(updatedLessons);
        await selectLesson(created);
      } else if (modalMode === 'editLesson' && selectedLesson) {
        const updated = await api.updateLesson(selectedLesson.id, {
          title: formData.title.trim(),
          description: formData.description,
          category: formData.category,
          difficulty: formData.difficulty,
          status: formData.status,
          xpReward: Number(formData.xpReward),
          practiceCollection: formData.practiceCollection,
          sampleQuery: formData.sampleQuery,
        });
        setLessons((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
        setSelectedLesson(updated);
      }
      setModalMode(null);
    } catch (err: any) {
      alert(`Lesson action failed: ${err.message}`);
    }
  }

  async function handleDeleteLesson(id: string) {
    if (!confirm('Delete this lesson? All its sections will be deleted.')) return;
    try {
      await api.deleteLesson(id);
      if (selectedModule) {
        const updated = await api.listLessons(selectedModule.id);
        setLessons(updated);
        if (updated.length > 0) selectLesson(updated[0]);
        else {
          setSelectedLesson(null);
          setSections([]);
        }
      }
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    }
  }

  async function handleMoveLesson(index: number, direction: 'up' | 'down') {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= lessons.length) return;

    const newLessons = [...lessons];
    const [moved] = newLessons.splice(index, 1);
    newLessons.splice(targetIndex, 0, moved);

    const reorderPayload = newLessons.map((l, idx) => ({ id: l.id, order: idx + 1 }));
    setLessons(newLessons.map((l, idx) => ({ ...l, order: idx + 1 })));

    try {
      await api.reorderLessons(reorderPayload);
    } catch (err: any) {
      alert(`Reordering failed: ${err.message}`);
    }
  }

  // =========================================================================
  // SECTION OPERATIONS & REORDER
  // =========================================================================
  async function handleCreateSection() {
    if (!selectedLesson) return;
    if (!formData.title?.trim()) return alert('Section title is required');
    try {
      const created = await api.createSection({
        lessonId: selectedLesson.id,
        title: formData.title.trim(),
        description: formData.description || '',
        status: formData.status || 'draft',
        contentBlocks: [
          { type: 'text', order: 1, content: 'Enter your section overview text here.' },
        ],
      });
      const updatedSections = await api.listSections(selectedLesson.id);
      setSections(updatedSections);
      selectSection(created);
      setModalMode(null);
    } catch (err: any) {
      alert(`Section creation failed: ${err.message}`);
    }
  }

  async function handleDeleteSection(id: string) {
    if (!confirm('Delete this section?')) return;
    try {
      await api.deleteSection(id);
      if (selectedLesson) {
        const updated = await api.listSections(selectedLesson.id);
        setSections(updated);
        if (updated.length > 0) selectSection(updated[0]);
        else {
          setSelectedSection(null);
          setActiveBlocks([]);
        }
      }
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    }
  }

  async function handleMoveSection(index: number, direction: 'up' | 'down') {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sections.length) return;

    const newSections = [...sections];
    const [moved] = newSections.splice(index, 1);
    newSections.splice(targetIndex, 0, moved);

    const reorderPayload = newSections.map((s, idx) => ({ id: s.id, order: idx + 1 }));
    setSections(newSections.map((s, idx) => ({ ...s, order: idx + 1 })));

    try {
      await api.reorderSections(reorderPayload);
    } catch (err: any) {
      alert(`Reordering failed: ${err.message}`);
    }
  }

  // =========================================================================
  // CONTENT BLOCKS EDITOR
  // =========================================================================
  function handleAddBlock(type: ContentBlockType) {
    const newBlock: ContentBlock = {
      type,
      order: activeBlocks.length + 1,
      content:
        type === 'code'
          ? 'db.students.find()'
          : type === 'output'
          ? '[{"studentId": "STU-101"}]'
          : type === 'note'
          ? 'Remember: In MongoDB, document schemas are dynamic but indexing remains strictly structured.'
          : type === 'example'
          ? 'E-commerce schema with embedded line items and customer references.'
          : type === 'playground'
          ? 'Write a query to count all active students in the Computer Science department.'
          : type === 'image'
          ? 'https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=800&auto=format&fit=crop'
          : 'New explanation paragraph.',
      language: type === 'code' ? 'javascript' : undefined,
      playgroundQuery: type === 'playground' ? 'db.students.countDocuments({ status: "active" })' : undefined,
      targetCollection: type === 'playground' ? 'students' : undefined,
    };
    setActiveBlocks([...activeBlocks, newBlock]);
  }

  function handleUpdateBlockField(index: number, field: keyof ContentBlock, value: any) {
    const updated = [...activeBlocks];
    updated[index] = { ...updated[index], [field]: value };
    setActiveBlocks(updated);
  }

  function handleMoveBlock(index: number, direction: 'up' | 'down') {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= activeBlocks.length) return;
    const updated = [...activeBlocks];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, moved);
    setActiveBlocks(updated.map((b, i) => ({ ...b, order: i + 1 })));
  }

  function handleDeleteBlock(index: number) {
    const updated = activeBlocks.filter((_, i) => i !== index);
    setActiveBlocks(updated.map((b, i) => ({ ...b, order: i + 1 })));
  }

  async function handleSaveSectionBlocks() {
    if (!selectedSection) return;
    setSavingSection(true);
    try {
      const updated = await api.updateSection(selectedSection.id, {
        title: selectedSection.title,
        description: selectedSection.description,
        status: selectedSection.status,
        contentBlocks: activeBlocks,
      });
      setSelectedSection(updated);
      setSections((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      alert('Section content saved successfully!');
    } catch (err: any) {
      alert(`Failed to save section: ${err.message}`);
    } finally {
      setSavingSection(false);
    }
  }

  async function handleToggleSectionPublish() {
    if (!selectedSection) return;
    const nextStatus = selectedSection.status === 'published' ? 'draft' : 'published';
    try {
      const updated = await api.updateSection(selectedSection.id, {
        status: nextStatus,
        contentBlocks: activeBlocks,
      });
      setSelectedSection(updated);
      setSections((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    } catch (err: any) {
      alert(`Publish toggle failed: ${err.message}`);
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[450px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs font-mono font-medium text-text-muted">
            Verifying Faculty Authoring Permissions...
          </span>
        </div>
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 gap-4 text-center">
        <ShieldAlert className="w-12 h-12 text-red-500" />
        <h2 className="text-xl font-bold text-text">Faculty Access Required</h2>
        <p className="text-xs text-text-muted max-w-md">
          You must be signed in with a Faculty or Administrator account to access the Curriculum Authoring Studio.
        </p>
        <Link
          href="/learn"
          className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold shadow-md"
        >
          Return to Student View
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 w-full flex-1">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div className="flex items-center gap-3">
          <Link
            href="/learn"
            className="p-2 rounded-xl border border-border bg-surface-high hover:bg-surface text-text-muted hover:text-text transition-colors"
            title="Back to Student View"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-secondary/15 text-secondary px-2.5 py-0.5 rounded-full border border-secondary/20 flex items-center gap-1.5">
                <FileEdit className="w-3 h-3" />
                <span>Faculty Authoring Studio</span>
              </span>
              <span className="text-[10px] font-mono text-text-muted">
                Role: {currentUser?.role}
              </span>
            </div>
            <h1 className="text-2xl font-extrabold text-text mt-1">
              Curriculum Architecture & Content Authoring
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setPreviewOpen(true)}
            disabled={!selectedSection}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-surface-high hover:bg-surface text-xs font-bold text-text shadow-sm transition-all disabled:opacity-40"
          >
            <Eye className="w-4 h-4 text-primary" />
            <span>Preview Student View</span>
          </button>

          <Link
            href="/learn"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-bold shadow-md hover:scale-105 transition-all"
          >
            <Globe className="w-4 h-4" />
            <span>Switch to Student View</span>
          </Link>
        </div>
      </div>

      {/* 4-Pane Hierarchical Layout: Courses | Modules | Lessons | Sections & Blocks */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start flex-1">
        {/* ========================================================================= */}
        {/* PANE 1: Courses (col-span-2)                                              */}
        {/* ========================================================================= */}
        <div className="xl:col-span-3 flex flex-col gap-3 bg-surface rounded-2xl border border-border p-4 shadow-sm">
          <div className="flex items-center justify-between pb-1 border-b border-border">
            <span className="text-xs font-bold text-text-muted uppercase tracking-wider">
              1. Courses ({courses.length})
            </span>
            <button
              onClick={() => {
                setFormData({ title: '', description: '', status: 'draft' });
                setModalMode('createCourse');
              }}
              className="p-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold flex items-center gap-1"
              title="Add Course"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          </div>

          <div className="flex flex-col gap-2 max-h-[550px] overflow-y-auto pr-1">
            {courses.map((course) => {
              const isSelected = selectedCourse?.id === course.id;
              return (
                <div
                  key={course.id}
                  onClick={() => selectCourse(course)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col gap-1.5 ${
                    isSelected
                      ? 'bg-primary/10 border-primary text-text shadow-sm ring-1 ring-primary/40'
                      : 'bg-surface-low hover:bg-surface-high border-border text-text'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-bold truncate leading-tight">
                      {course.title}
                    </span>
                    <span
                      className={`text-[9px] font-mono uppercase px-1.5 py-0.2 rounded shrink-0 ${
                        course.status === 'published'
                          ? 'bg-emerald-500/20 text-emerald-500'
                          : 'bg-amber-500/20 text-amber-400'
                      }`}
                    >
                      {course.status}
                    </span>
                  </div>

                  <p className="text-[10px] text-text-muted line-clamp-1">
                    {course.description}
                  </p>

                  <div className="flex items-center justify-between pt-1 border-t border-border/40 text-[10px] text-text-muted">
                    <span>{course.modulesCount || 0} modules</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setFormData({
                            title: course.title,
                            description: course.description,
                            status: course.status,
                          });
                          setSelectedCourse(course);
                          setModalMode('editCourse');
                        }}
                        className="hover:text-primary"
                        title="Edit Course"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCourse(course.id);
                        }}
                        className="hover:text-red-500"
                        title="Delete Course"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* PANE 2: Modules (col-span-2)                                              */}
        {/* ========================================================================= */}
        <div className="xl:col-span-3 flex flex-col gap-3 bg-surface rounded-2xl border border-border p-4 shadow-sm">
          <div className="flex items-center justify-between pb-1 border-b border-border">
            <span className="text-xs font-bold text-text-muted uppercase tracking-wider">
              2. Modules ({modules.length})
            </span>
            <button
              onClick={() => {
                if (!selectedCourse) return alert('Select a course first');
                setFormData({ title: '', description: '', status: 'draft' });
                setModalMode('createModule');
              }}
              disabled={!selectedCourse}
              className="p-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold flex items-center gap-1 disabled:opacity-40"
              title="Add Module"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          </div>

          <div className="flex flex-col gap-2 max-h-[550px] overflow-y-auto pr-1">
            {modules.map((mod, idx) => {
              const isSelected = selectedModule?.id === mod.id;
              return (
                <div
                  key={mod.id}
                  onClick={() => selectModule(mod)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col gap-1.5 ${
                    isSelected
                      ? 'bg-primary/10 border-primary text-text shadow-sm ring-1 ring-primary/40'
                      : 'bg-surface-low hover:bg-surface-high border-border text-text'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="text-[10px] font-mono font-bold text-primary">
                        {idx + 1}.
                      </span>
                      <span className="text-xs font-bold truncate leading-tight">
                        {mod.title}
                      </span>
                    </div>
                    <span
                      className={`text-[9px] font-mono uppercase px-1.5 py-0.2 rounded shrink-0 ${
                        mod.status === 'published'
                          ? 'bg-emerald-500/20 text-emerald-500'
                          : 'bg-amber-500/20 text-amber-400'
                      }`}
                    >
                      {mod.status}
                    </span>
                  </div>

                  <p className="text-[10px] text-text-muted line-clamp-1">{mod.description}</p>

                  <div className="flex items-center justify-between pt-1 border-t border-border/40 text-[10px] text-text-muted">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMoveModule(idx, 'up');
                        }}
                        disabled={idx === 0}
                        className="p-1 hover:text-text disabled:opacity-30"
                        title="Move Up"
                      >
                        <ArrowUp className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMoveModule(idx, 'down');
                        }}
                        disabled={idx === modules.length - 1}
                        className="p-1 hover:text-text disabled:opacity-30"
                        title="Move Down"
                      >
                        <ArrowDown className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setFormData({
                            title: mod.title,
                            description: mod.description,
                            status: mod.status,
                          });
                          setSelectedModule(mod);
                          setModalMode('editModule');
                        }}
                        className="hover:text-primary"
                        title="Edit Module"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteModule(mod.id);
                        }}
                        className="hover:text-red-500"
                        title="Delete Module"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* PANE 3: Lessons (col-span-2)                                              */}
        {/* ========================================================================= */}
        <div className="xl:col-span-3 flex flex-col gap-3 bg-surface rounded-2xl border border-border p-4 shadow-sm">
          <div className="flex items-center justify-between pb-1 border-b border-border">
            <span className="text-xs font-bold text-text-muted uppercase tracking-wider">
              3. Lessons ({lessons.length})
            </span>
            <button
              onClick={() => {
                if (!selectedModule) return alert('Select a module first');
                setFormData({
                  title: '',
                  description: '',
                  category: selectedModule.title,
                  difficulty: 'beginner',
                  xpReward: 50,
                  status: 'draft',
                  practiceCollection: 'students',
                });
                setModalMode('createLesson');
              }}
              disabled={!selectedModule}
              className="p-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold flex items-center gap-1 disabled:opacity-40"
              title="Add Lesson"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          </div>

          <div className="flex flex-col gap-2 max-h-[550px] overflow-y-auto pr-1">
            {lessons.map((lesson, idx) => {
              const isSelected = selectedLesson?.id === lesson.id;
              return (
                <div
                  key={lesson.id}
                  onClick={() => selectLesson(lesson)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col gap-1.5 ${
                    isSelected
                      ? 'bg-primary/10 border-primary text-text shadow-sm ring-1 ring-primary/40'
                      : 'bg-surface-low hover:bg-surface-high border-border text-text'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="text-[10px] font-mono font-bold text-secondary">
                        {idx + 1}.
                      </span>
                      <span className="text-xs font-bold truncate leading-tight">
                        {lesson.title}
                      </span>
                    </div>
                    <span
                      className={`text-[9px] font-mono uppercase px-1.5 py-0.2 rounded shrink-0 ${
                        lesson.status === 'published'
                          ? 'bg-emerald-500/20 text-emerald-500'
                          : 'bg-amber-500/20 text-amber-400'
                      }`}
                    >
                      {lesson.status}
                    </span>
                  </div>

                  <p className="text-[10px] text-text-muted line-clamp-1">{lesson.description}</p>

                  <div className="flex items-center justify-between pt-1 border-t border-border/40 text-[10px] text-text-muted">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMoveLesson(idx, 'up');
                        }}
                        disabled={idx === 0}
                        className="p-1 hover:text-text disabled:opacity-30"
                        title="Move Up"
                      >
                        <ArrowUp className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMoveLesson(idx, 'down');
                        }}
                        disabled={idx === lessons.length - 1}
                        className="p-1 hover:text-text disabled:opacity-30"
                        title="Move Down"
                      >
                        <ArrowDown className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setFormData({
                            title: lesson.title,
                            description: lesson.description,
                            category: lesson.category,
                            difficulty: lesson.difficulty,
                            xpReward: lesson.xpReward,
                            status: lesson.status,
                            practiceCollection: lesson.practiceCollection,
                            sampleQuery: lesson.sampleQuery,
                          });
                          setSelectedLesson(lesson);
                          setModalMode('editLesson');
                        }}
                        className="hover:text-primary"
                        title="Edit Lesson"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteLesson(lesson.id);
                        }}
                        className="hover:text-red-500"
                        title="Delete Lesson"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* PANE 4: Sections & Content Blocks Editor (col-span-3)                      */}
        {/* ========================================================================= */}
        <div className="xl:col-span-3 flex flex-col gap-4 bg-surface rounded-2xl border border-border p-4 shadow-sm">
          {/* Section Selector / Add Section */}
          <div className="flex items-center justify-between pb-1 border-b border-border">
            <span className="text-xs font-bold text-text-muted uppercase tracking-wider">
              4. Sections ({sections.length})
            </span>
            <button
              onClick={() => {
                if (!selectedLesson) return alert('Select a lesson first');
                setFormData({ title: '', description: '', status: 'draft' });
                setModalMode('createSection');
              }}
              disabled={!selectedLesson}
              className="p-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold flex items-center gap-1 disabled:opacity-40"
              title="Add Section"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          </div>

          {/* Section Selector Tabs */}
          <div className="flex flex-wrap gap-1.5 pb-2 border-b border-border/50">
            {sections.map((sec, idx) => {
              const isSelected = selectedSection?.id === sec.id;
              return (
                <div key={sec.id} className="flex items-center">
                  <button
                    onClick={() => selectSection(sec)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all border flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-primary text-white border-primary shadow-sm'
                        : 'bg-surface-low border-border text-text hover:bg-surface-high'
                    }`}
                  >
                    <span>{idx + 1}. {sec.title}</span>
                  </button>
                </div>
              );
            })}
          </div>

          {/* Active Section & Content Blocks Editor */}
          {selectedSection ? (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between gap-2 p-2 bg-surface-high/50 rounded-xl border border-border">
                <div className="truncate">
                  <span className="text-[10px] font-mono text-text-muted uppercase">
                    Editing Section:
                  </span>
                  <h4 className="text-xs font-bold text-text truncate">{selectedSection.title}</h4>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handleToggleSectionPublish}
                    className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold uppercase transition-all ${
                      selectedSection.status === 'published'
                        ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                        : 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
                    }`}
                  >
                    {selectedSection.status === 'published' ? 'Published' : 'Draft'}
                  </button>
                  <button
                    onClick={() => handleDeleteSection(selectedSection.id)}
                    className="p-1 text-text-muted hover:text-red-500"
                    title="Delete Section"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Add Block Bar */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-bold text-text-muted uppercase">
                  Add Content Block:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => handleAddBlock('text')}
                    className="px-2 py-1 rounded-lg bg-surface-high hover:bg-primary/20 hover:text-primary text-[11px] font-semibold border border-border flex items-center gap-1"
                  >
                    <FileText className="w-3 h-3" />
                    <span>+ Text</span>
                  </button>
                  <button
                    onClick={() => handleAddBlock('code')}
                    className="px-2 py-1 rounded-lg bg-surface-high hover:bg-primary/20 hover:text-primary text-[11px] font-semibold border border-border flex items-center gap-1"
                  >
                    <Code2 className="w-3 h-3" />
                    <span>+ Code</span>
                  </button>
                  <button
                    onClick={() => handleAddBlock('output')}
                    className="px-2 py-1 rounded-lg bg-surface-high hover:bg-primary/20 hover:text-primary text-[11px] font-semibold border border-border flex items-center gap-1"
                  >
                    <Terminal className="w-3 h-3" />
                    <span>+ Output</span>
                  </button>
                  <button
                    onClick={() => handleAddBlock('note')}
                    className="px-2 py-1 rounded-lg bg-surface-high hover:bg-primary/20 hover:text-primary text-[11px] font-semibold border border-border flex items-center gap-1"
                  >
                    <AlertCircle className="w-3 h-3" />
                    <span>+ Note</span>
                  </button>
                  <button
                    onClick={() => handleAddBlock('image')}
                    className="px-2 py-1 rounded-lg bg-surface-high hover:bg-primary/20 hover:text-primary text-[11px] font-semibold border border-border flex items-center gap-1"
                  >
                    <ImageIcon className="w-3 h-3" />
                    <span>+ Image</span>
                  </button>
                  <button
                    onClick={() => handleAddBlock('example')}
                    className="px-2 py-1 rounded-lg bg-surface-high hover:bg-primary/20 hover:text-primary text-[11px] font-semibold border border-border flex items-center gap-1"
                  >
                    <Lightbulb className="w-3 h-3" />
                    <span>+ Example</span>
                  </button>
                  <button
                    onClick={() => handleAddBlock('playground')}
                    className="px-2 py-1 rounded-lg bg-surface-high hover:bg-primary/20 hover:text-primary text-[11px] font-semibold border border-border flex items-center gap-1"
                  >
                    <Terminal className="w-3 h-3 text-secondary" />
                    <span>+ Playground</span>
                  </button>
                </div>
              </div>

              {/* Block List Editor */}
              <div className="flex flex-col gap-3 max-h-[500px] overflow-y-auto pr-1">
                {activeBlocks.map((block, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl border border-border bg-surface-low flex flex-col gap-2 shadow-inner"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-bold bg-primary/20 text-primary px-1.5 py-0.5 rounded uppercase">
                          {block.type}
                        </span>
                        <span className="text-[10px] text-text-muted">Block #{idx + 1}</span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleMoveBlock(idx, 'up')}
                          disabled={idx === 0}
                          className="p-1 hover:text-text disabled:opacity-30"
                          title="Move Block Up"
                        >
                          <ArrowUp className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleMoveBlock(idx, 'down')}
                          disabled={idx === activeBlocks.length - 1}
                          className="p-1 hover:text-text disabled:opacity-30"
                          title="Move Block Down"
                        >
                          <ArrowDown className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleDeleteBlock(idx)}
                          className="p-1 text-text-muted hover:text-red-500"
                          title="Delete Block"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    <textarea
                      rows={block.type === 'code' || block.type === 'output' ? 3 : 2}
                      value={block.content}
                      onChange={(e) => handleUpdateBlockField(idx, 'content', e.target.value)}
                      placeholder={`Enter ${block.type} content...`}
                      className="w-full p-2 font-mono text-xs rounded-lg bg-surface border border-border text-text focus:outline-none focus:ring-1 focus:ring-primary"
                    />

                    {/* Type-Specific Options */}
                    {block.type === 'code' && (
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-text-muted">Language:</span>
                        <input
                          type="text"
                          value={block.language || 'javascript'}
                          onChange={(e) => handleUpdateBlockField(idx, 'language', e.target.value)}
                          className="px-2 py-0.5 rounded bg-surface border border-border text-[11px] font-mono text-text w-28"
                        />
                      </div>
                    )}

                    {block.type === 'image' && (
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={block.caption || ''}
                          onChange={(e) => handleUpdateBlockField(idx, 'caption', e.target.value)}
                          placeholder="Caption..."
                          className="px-2 py-0.5 rounded bg-surface border border-border text-[11px] text-text"
                        />
                        <input
                          type="text"
                          value={block.altText || ''}
                          onChange={(e) => handleUpdateBlockField(idx, 'altText', e.target.value)}
                          placeholder="Alt text..."
                          className="px-2 py-0.5 rounded bg-surface border border-border text-[11px] text-text"
                        />
                      </div>
                    )}

                    {block.type === 'playground' && (
                      <div className="flex flex-col gap-1.5 pt-1 border-t border-border/40">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-text-muted">Target Collection:</span>
                          <input
                            type="text"
                            value={block.targetCollection || 'students'}
                            onChange={(e) =>
                              handleUpdateBlockField(idx, 'targetCollection', e.target.value)
                            }
                            className="px-2 py-0.5 rounded bg-surface border border-border text-[11px] font-mono text-text w-32"
                          />
                        </div>
                        <input
                          type="text"
                          value={block.playgroundQuery || ''}
                          onChange={(e) =>
                            handleUpdateBlockField(idx, 'playgroundQuery', e.target.value)
                          }
                          placeholder="Preloaded query (e.g. db.students.find().limit(5))"
                          className="px-2 py-1 rounded bg-surface border border-border text-[11px] font-mono text-text"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Save Section Button */}
              <button
                onClick={handleSaveSectionBlocks}
                disabled={savingSection}
                className="w-full py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-bold shadow-md hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{savingSection ? 'Saving Section...' : 'Save Section & Blocks'}</span>
              </button>
            </div>
          ) : (
            <div className="p-8 text-center text-text-muted text-xs">
              Select or create a section to edit its content blocks.
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* GENERIC CRUD MODAL                                                        */}
      {/* ========================================================================= */}
      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-surface rounded-2xl border border-border shadow-soft p-6 w-full max-w-md flex flex-col gap-4">
            <h3 className="text-base font-bold text-text">
              {modalMode === 'createCourse' && 'Create New Course'}
              {modalMode === 'editCourse' && 'Edit Course'}
              {modalMode === 'createModule' && `Add Module to: ${selectedCourse?.title}`}
              {modalMode === 'editModule' && 'Edit Module'}
              {modalMode === 'createLesson' && `Add Lesson to: ${selectedModule?.title}`}
              {modalMode === 'editLesson' && 'Edit Lesson'}
              {modalMode === 'createSection' && `Add Section to: ${selectedLesson?.title}`}
            </h3>

            <div className="flex flex-col gap-3">
              <div>
                <label className="text-[11px] font-bold text-text-muted uppercase">Title</label>
                <input
                  type="text"
                  value={formData.title || ''}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Enter title..."
                  className="w-full mt-1 p-2 rounded-xl bg-surface-high border border-border text-xs text-text focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-text-muted uppercase">Description</label>
                <textarea
                  rows={3}
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Enter description..."
                  className="w-full mt-1 p-2 rounded-xl bg-surface-high border border-border text-xs text-text focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-text-muted uppercase">Publish Status</label>
                <select
                  value={formData.status || 'draft'}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full mt-1 p-2 rounded-xl bg-surface-high border border-border text-xs text-text focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="draft">Draft (Faculty only)</option>
                  <option value="published">Published (Visible to Students)</option>
                </select>
              </div>

              {/* Lesson Specific Fields */}
              {(modalMode === 'createLesson' || modalMode === 'editLesson') && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] font-bold text-text-muted uppercase">Difficulty</label>
                      <select
                        value={formData.difficulty || 'beginner'}
                        onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                        className="w-full mt-1 p-2 rounded-xl bg-surface-high border border-border text-xs text-text"
                      >
                        <option value="beginner">Beginner</option>
                        <option value="intermediate">Intermediate</option>
                        <option value="advanced">Advanced</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-text-muted uppercase">XP Reward</label>
                      <input
                        type="number"
                        value={formData.xpReward || 50}
                        onChange={(e) => setFormData({ ...formData, xpReward: e.target.value })}
                        className="w-full mt-1 p-2 rounded-xl bg-surface-high border border-border text-xs text-text"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-text-muted uppercase">Target Practice Collection</label>
                    <input
                      type="text"
                      value={formData.practiceCollection || 'students'}
                      onChange={(e) => setFormData({ ...formData, practiceCollection: e.target.value })}
                      className="w-full mt-1 p-2 rounded-xl bg-surface-high border border-border text-xs text-text font-mono"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <button
                onClick={() => setModalMode(null)}
                className="px-4 py-2 rounded-xl border border-border text-xs font-semibold hover:bg-surface-high"
              >
                Cancel
              </button>

              <button
                onClick={() => {
                  if (modalMode === 'createCourse' || modalMode === 'editCourse') handleSaveCourse();
                  else if (modalMode === 'createModule' || modalMode === 'editModule') handleSaveModule();
                  else if (modalMode === 'createLesson' || modalMode === 'editLesson') handleSaveLesson();
                  else if (modalMode === 'createSection') handleCreateSection();
                }}
                className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold shadow-md hover:bg-primary/90"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STUDENT EXPERIENCE PREVIEW MODAL                                          */}
      {/* ========================================================================= */}
      {previewOpen && selectedSection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
          <div className="bg-surface rounded-3xl border border-border shadow-soft p-6 w-full max-w-3xl max-h-[85vh] flex flex-col gap-4 overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-primary/15 text-primary px-2.5 py-0.5 rounded-full border border-primary/20">
                  Student Live Preview
                </span>
                <span className="text-xs font-bold text-text truncate">
                  {selectedSection.title}
                </span>
              </div>
              <button
                onClick={() => setPreviewOpen(false)}
                className="px-3 py-1 rounded-xl bg-surface-high text-xs font-bold hover:bg-surface"
              >
                Close Preview
              </button>
            </div>

            <div className="flex flex-col gap-4">
              {activeBlocks.map((b, i) => (
                <div key={i}>
                  {b.type === 'text' && (
                    <div className="text-xs text-text leading-relaxed whitespace-pre-wrap font-sans bg-surface-low p-4 rounded-xl border border-border">
                      {b.content}
                    </div>
                  )}
                  {b.type === 'code' && (
                    <pre className="p-4 rounded-xl bg-inverse-surface text-inverse-text font-mono text-xs overflow-x-auto shadow-inner">
                      {b.content}
                    </pre>
                  )}
                  {b.type === 'output' && (
                    <pre className="p-3 rounded-xl bg-[#090d16] text-emerald-400 font-mono text-xs overflow-x-auto shadow-inner">
                      {b.content}
                    </pre>
                  )}
                  {b.type === 'note' && (
                    <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
                      {b.content}
                    </div>
                  )}
                  {b.type === 'example' && (
                    <div className="p-3.5 rounded-xl bg-surface-high border border-border text-xs text-text">
                      <span className="font-bold text-secondary">Example: </span>
                      {b.content}
                    </div>
                  )}
                  {b.type === 'playground' && (
                    <div className="p-4 rounded-xl bg-surface-low border border-primary/30 flex flex-col gap-2">
                      <div className="flex items-center gap-2 text-primary font-bold text-xs">
                        <Terminal className="w-3.5 h-3.5" />
                        <span>Interactive Playground Exercise</span>
                      </div>
                      <p className="text-xs text-text-muted">{b.content}</p>
                      <pre className="p-2.5 rounded-lg bg-surface border border-border font-mono text-xs text-primary">
                        {b.playgroundQuery || 'db.students.find()'}
                      </pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
