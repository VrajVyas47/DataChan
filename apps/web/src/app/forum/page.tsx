'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  MessagesSquare,
  Search,
  Plus,
  ThumbsUp,
  MessageCircle,
  Eye,
  Tag,
  Pin,
  CheckCircle2,
  Database,
  ArrowLeft,
  Sparkles,
  Filter,
  Terminal,
  Code2,
  X,
  Share2,
  Flame,
  Clock,
  HelpCircle,
  BookOpen,
} from 'lucide-react';
import { api } from '@/lib/api';
import { ForumPost, ForumCategory, ForumStats, CreateForumPostDto } from '@datachan/shared-types';

const CATEGORIES: { id: ForumCategory | 'all'; label: string; icon: string; desc: string }[] = [
  { id: 'all', label: 'All Discussions', icon: '🌐', desc: 'Browse all discussions across Data-Chan' },
  { id: 'schema-design', label: 'Schema Design', icon: '📐', desc: 'Embedding vs referencing, polymorphism & document bounds' },
  { id: 'queries', label: 'MQL Queries', icon: '⚡', desc: 'Find, update, array filters, upserts, and projections' },
  { id: 'aggregation', label: 'Aggregation', icon: '🔄', desc: 'Pipelines, $facet, $lookup, $unwind, and window functions' },
  { id: 'performance', label: 'Performance & Indexing', icon: '🚀', desc: 'Compound indexes, ESR rule, explain plans & memory limits' },
  { id: 'challenges', label: 'Lab Challenges', icon: '🏆', desc: 'Tips, hints, and debugging challenge datasets' },
  { id: 'announcements', label: 'Announcements', icon: '📢', desc: 'Platform release notes, sandbox updates & new courses' },
  { id: 'general', label: 'General', icon: '💬', desc: 'Open engineering discussions & database theory' },
];

export default function ForumDirectoryPage() {
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [stats, setStats] = useState<ForumStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'top' | 'unanswered'>('recent');
  const [isComposerOpen, setIsComposerOpen] = useState(false);

  // New post form state
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<ForumCategory>('queries');
  const [newContent, setNewContent] = useState('');
  const [newCodeSnippet, setNewCodeSnippet] = useState('');
  const [newTags, setNewTags] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Fetch posts and stats
  const fetchForumData = async () => {
    try {
      setLoading(true);
      const [fetchedPosts, fetchedStats] = await Promise.all([
        api.getForumPosts({
          category: selectedCategory === 'all' ? undefined : selectedCategory,
          tag: selectedTag || undefined,
          search: searchQuery.trim() || undefined,
          sort: sortBy,
        }),
        api.getForumStats().catch(() => null),
      ]);
      setPosts(fetchedPosts);
      if (fetchedStats) setStats(fetchedStats);
    } catch (err) {
      console.error('Failed to load forum posts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchForumData();
  }, [selectedCategory, selectedTag, sortBy]);

  // Debounced search trigger
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchForumData();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Handle upvoting
  const handleUpvote = async (e: React.MouseEvent, postId: string) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const res = await api.upvoteForumPost(postId);
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? { ...p, upvotes: res.upvotes, isUpvoted: res.userUpvoted }
            : p
        )
      );
    } catch (err) {
      console.error('Failed to upvote post:', err);
    }
  };

  // Submit new discussion
  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) {
      setFormError('Title and description are required.');
      return;
    }

    try {
      setSubmitting(true);
      setFormError(null);
      const tagsArray = newTags
        .split(',')
        .map((t) => t.trim().toLowerCase())
        .filter((t) => t.length > 0);

      const dto: CreateForumPostDto = {
        title: newTitle.trim(),
        content: newContent.trim(),
        category: newCategory,
        tags: tagsArray,
        codeSnippet: newCodeSnippet.trim() ? newCodeSnippet.trim() : undefined,
        codeLanguage: newCodeSnippet.trim() ? 'javascript' : undefined,
      };

      const created = await api.createForumPost(dto);
      setPosts((prev) => [created, ...prev]);
      setIsComposerOpen(false);
      // Reset form
      setNewTitle('');
      setNewContent('');
      setNewCodeSnippet('');
      setNewTags('');
    } catch (err: any) {
      setFormError(err.message || 'Failed to publish discussion. Please check inputs.');
    } finally {
      setSubmitting(false);
    }
  };

  // Extract unique tags from current posts for the tag cloud
  const popularTags = useMemo(() => {
    const map: Record<string, number> = {};
    posts.forEach((p) => {
      p.tags.forEach((t) => {
        map[t] = (map[t] || 0) + 1;
      });
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12);
  }, [posts]);

  return (
    <div className="min-h-screen w-full bg-[#050608] text-white selection:bg-purple-900/60 selection:text-white">
      {/* Top Universal Header */}
      <header className="sticky top-0 z-40 w-full px-6 py-4 backdrop-blur-md bg-[#050608]/80 border-b border-white/[0.08] flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-xs font-montserrat transition-all border border-white/10"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Landing Page</span>
          </Link>
          <div className="h-4 w-px bg-white/10 hidden sm:block" />
          <Link href="/forum" className="flex items-center gap-2 group">
            <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-white border border-white/10 group-hover:bg-white group-hover:text-black transition-all">
              <MessagesSquare className="w-3.5 h-3.5" />
            </div>
            <span className="font-barlow font-bold text-base tracking-tight text-white">
              DATA-CHAN FORUMS
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/playground"
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/80 hover:text-white text-xs font-montserrat transition-all border border-white/10"
          >
            <Terminal className="w-3.5 h-3.5 text-blue-400" />
            <span>Open Playground</span>
          </Link>
          <Link
            href="/learn"
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/80 hover:text-white text-xs font-montserrat transition-all border border-white/10"
          >
            <BookOpen className="w-3.5 h-3.5 text-purple-400" />
            <span>Curriculum</span>
          </Link>
          <button
            onClick={() => setIsComposerOpen(true)}
            className="px-4 py-2 rounded-full bg-white text-black hover:bg-white/90 text-xs font-montserrat font-bold tracking-wide transition-all shadow-md active:scale-95 flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Discussion</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Hero Banner */}
        <div className="relative rounded-2xl bg-gradient-to-r from-white/[0.04] to-transparent border border-white/[0.08] p-6 sm:p-8 mb-8 overflow-hidden">
          <div className="absolute top-0 right-0 -mt-12 -mr-12 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[11px] font-mono uppercase tracking-widest text-white/50">
                  Data-Chan Community Knowledge Base
                </span>
              </div>
              <h1 className="font-barlow font-black text-3xl sm:text-4xl text-white tracking-tight uppercase">
                Database Engineering Discussions
              </h1>
              <p className="mt-2 text-xs sm:text-sm font-montserrat text-white/60 max-w-2xl leading-relaxed">
                Explore real MongoDB aggregation benchmarks, discuss embedding vs referencing trade-offs, solve compound index ESR puzzles, and get answers from lab engineers and fellow learners.
              </p>
            </div>

            {/* Quick Metrics Bar */}
            {stats && (
              <div className="flex items-center gap-4 sm:gap-6 bg-black/40 border border-white/10 rounded-xl p-4 shrink-0">
                <div className="text-center">
                  <div className="font-barlow font-bold text-xl sm:text-2xl text-white">
                    {stats.totalPosts}
                  </div>
                  <div className="text-[10px] font-montserrat text-white/50 uppercase tracking-wider">
                    Threads
                  </div>
                </div>
                <div className="w-px h-8 bg-white/10" />
                <div className="text-center">
                  <div className="font-barlow font-bold text-xl sm:text-2xl text-blue-400">
                    {stats.totalReplies}
                  </div>
                  <div className="text-[10px] font-montserrat text-white/50 uppercase tracking-wider">
                    Replies
                  </div>
                </div>
                <div className="w-px h-8 bg-white/10" />
                <div className="text-center">
                  <div className="font-barlow font-bold text-xl sm:text-2xl text-emerald-400">
                    {stats.solvedCount}
                  </div>
                  <div className="text-[10px] font-montserrat text-white/50 uppercase tracking-wider">
                    Solved
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6 items-stretch sm:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search queries, operators ($facet, $lookup), tags..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-white/30 text-xs font-montserrat focus:outline-none focus:border-white/40 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            <span className="text-[11px] font-montserrat text-white/40 flex items-center gap-1 pl-1">
              <Filter className="w-3 h-3" />
              <span>Sort:</span>
            </span>
            <button
              onClick={() => setSortBy('recent')}
              className={`px-3 py-1.5 rounded-lg text-xs font-montserrat font-medium transition-all ${
                sortBy === 'recent'
                  ? 'bg-white text-black font-semibold shadow-sm'
                  : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              Recent
            </button>
            <button
              onClick={() => setSortBy('top')}
              className={`px-3 py-1.5 rounded-lg text-xs font-montserrat font-medium transition-all ${
                sortBy === 'top'
                  ? 'bg-white text-black font-semibold shadow-sm'
                  : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              Top Voted
            </button>
            <button
              onClick={() => setSortBy('unanswered')}
              className={`px-3 py-1.5 rounded-lg text-xs font-montserrat font-medium transition-all ${
                sortBy === 'unanswered'
                  ? 'bg-white text-black font-semibold shadow-sm'
                  : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              Unanswered
            </button>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-6 scrollbar-thin">
          {CATEGORIES.map((cat) => {
            const active = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => {
                  setSelectedCategory(cat.id);
                  setSelectedTag(null);
                }}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-montserrat whitespace-nowrap transition-all border ${
                  active
                    ? 'bg-white/15 text-white border-white/30 font-semibold shadow-inner'
                    : 'bg-white/[0.03] text-white/60 border-white/[0.06] hover:bg-white/[0.08] hover:text-white'
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tag Filter Active Badge */}
        {selectedTag && (
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs text-white/50">Filtering by tag:</span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-mono">
              #{selectedTag}
              <button
                onClick={() => setSelectedTag(null)}
                className="hover:text-white ml-1"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          </div>
        )}

        {/* Layout: Main Feed & Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Main Feed Column */}
          <div className="lg:col-span-8 flex flex-col gap-4">
            {loading ? (
              <div className="flex flex-col gap-3">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="h-36 rounded-2xl bg-white/[0.02] border border-white/[0.06] animate-pulse"
                  />
                ))}
              </div>
            ) : posts.length === 0 ? (
              <div className="p-12 text-center rounded-2xl bg-white/[0.02] border border-white/[0.06] flex flex-col items-center justify-center">
                <HelpCircle className="w-10 h-10 text-white/30 mb-3" />
                <h3 className="font-barlow font-bold text-lg text-white">No discussions found</h3>
                <p className="text-xs font-montserrat text-white/50 mt-1 max-w-sm">
                  We couldn't find any threads matching your current filters or search terms.
                </p>
                <button
                  onClick={() => {
                    setSelectedCategory('all');
                    setSelectedTag(null);
                    setSearchQuery('');
                  }}
                  className="mt-4 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-xs font-montserrat text-white"
                >
                  Clear All Filters
                </button>
              </div>
            ) : (
              posts.map((post) => {
                const categoryObj = CATEGORIES.find((c) => c.id === post.category);
                return (
                  <article
                    key={post.id}
                    className="group relative rounded-2xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.06] hover:border-white/20 transition-all p-5 sm:p-6"
                  >
                    <div className="flex items-start gap-4">
                      {/* Left: Upvote Box */}
                      <button
                        onClick={(e) => handleUpvote(e, post.id)}
                        className={`flex flex-col items-center justify-center min-w-[46px] p-2.5 rounded-xl border transition-all ${
                          post.isUpvoted
                            ? 'bg-purple-600/30 border-purple-500/50 text-purple-300'
                            : 'bg-white/[0.03] border-white/10 text-white/60 hover:text-white hover:bg-white/10'
                        }`}
                        title="Upvote this discussion"
                      >
                        <ThumbsUp className="w-4 h-4" />
                        <span className="text-xs font-mono font-bold mt-1">
                          {post.upvotes}
                        </span>
                      </button>

                      {/* Right: Discussion Details */}
                      <div className="flex-1 min-w-0">
                        {/* Meta header: Author, Category, Pinned */}
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          {post.isPinned && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-mono uppercase font-bold">
                              <Pin className="w-2.5 h-2.5" />
                              Pinned
                            </span>
                          )}

                          {post.isSolved && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono uppercase font-bold">
                              <CheckCircle2 className="w-2.5 h-2.5" />
                              Solved
                            </span>
                          )}

                          <span className="text-[11px] font-montserrat font-medium text-white/80 flex items-center gap-1.5">
                            <span className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold uppercase">
                              {post.authorName.charAt(0)}
                            </span>
                            {post.authorName}
                          </span>

                          {post.authorRole && (
                            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-white/60">
                              {post.authorRole}
                            </span>
                          )}

                          <span className="text-white/30 text-xs">·</span>

                          <span className="text-[11px] font-montserrat text-white/40">
                            {new Date(post.createdAt).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>

                          <span className="ml-auto inline-flex items-center gap-1 text-[11px] font-montserrat text-white/50 px-2 py-0.5 rounded-full bg-white/5">
                            <span>{categoryObj?.icon || '📁'}</span>
                            <span>{categoryObj?.label || post.category}</span>
                          </span>
                        </div>

                        {/* Title */}
                        <h2 className="text-base sm:text-lg font-barlow font-bold text-white group-hover:text-purple-300 transition-colors">
                          <Link href={`/forum/${post.id}`} className="hover:underline">
                            {post.title}
                          </Link>
                        </h2>

                        {/* Excerpt */}
                        <p className="mt-1.5 text-xs sm:text-sm font-montserrat text-white/65 line-clamp-2 leading-relaxed">
                          {post.content}
                        </p>

                        {/* Code snippet preview pill if present */}
                        {post.codeSnippet && (
                          <div className="mt-3 p-2.5 rounded-lg bg-black/60 border border-white/[0.08] font-mono text-[11px] text-emerald-400/90 overflow-x-auto max-h-16 overflow-y-hidden">
                            <code>{post.codeSnippet.split('\n')[0]}</code>
                            {post.codeSnippet.split('\n').length > 1 && (
                              <span className="text-white/30 ml-2">... (+more)</span>
                            )}
                          </div>
                        )}

                        {/* Footer tags and counters */}
                        <div className="mt-3.5 pt-3 border-t border-white/[0.04] flex flex-wrap items-center justify-between gap-3 text-xs text-white/50 font-montserrat">
                          {/* Tags */}
                          <div className="flex flex-wrap items-center gap-1.5">
                            {post.tags.map((tag) => (
                              <button
                                key={tag}
                                onClick={() => setSelectedTag(tag)}
                                className="px-2 py-0.5 rounded bg-white/[0.04] hover:bg-white/10 text-[10px] font-mono text-white/70 hover:text-white transition-colors"
                              >
                                #{tag}
                              </button>
                            ))}
                          </div>

                          {/* Stats */}
                          <div className="flex items-center gap-4">
                            <span className="flex items-center gap-1">
                              <Eye className="w-3.5 h-3.5 text-white/40" />
                              <span>{post.views}</span>
                            </span>
                            <Link
                              href={`/forum/${post.id}`}
                              className="flex items-center gap-1 text-white/70 hover:text-white transition-colors"
                            >
                              <MessageCircle className="w-3.5 h-3.5 text-blue-400" />
                              <span className="font-semibold">{post.replyCount}</span>
                              <span className="hidden sm:inline">replies</span>
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </div>

          {/* Sidebar Column */}
          <aside className="lg:col-span-4 flex flex-col gap-6">
            {/* Guidelines Card */}
            <div className="rounded-2xl bg-white/[0.02] border border-white/[0.08] p-5">
              <h3 className="font-barlow font-bold text-sm text-white uppercase tracking-wider mb-2 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span>Community Guidelines</span>
              </h3>
              <p className="text-xs font-montserrat text-white/60 leading-relaxed mb-3">
                DATA-CHAN is dedicated to mastery through hands-on querying. When sharing code:
              </p>
              <ul className="text-xs font-montserrat text-white/60 space-y-2 list-disc list-inside">
                <li>Include reproducible MongoDB sample documents</li>
                <li>Share query execution plans (<code className="font-mono text-white/80">.explain("executionStats")</code>)</li>
                <li>Never post real database credentials or production passwords</li>
                <li>Celebrate clean aggregation pipeline design and compound indexing</li>
              </ul>
            </div>

            {/* Popular Tags Cloud */}
            <div className="rounded-2xl bg-white/[0.02] border border-white/[0.08] p-5">
              <h3 className="font-barlow font-bold text-sm text-white uppercase tracking-wider mb-3 flex items-center gap-2">
                <Tag className="w-4 h-4 text-emerald-400" />
                <span>Popular Topics</span>
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {popularTags.map(([tag, count]) => (
                  <button
                    key={tag}
                    onClick={() => setSelectedTag(tag)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all flex items-center gap-1.5 ${
                      selectedTag === tag
                        ? 'bg-purple-600 text-white font-bold'
                        : 'bg-white/5 hover:bg-white/10 text-white/70 hover:text-white'
                    }`}
                  >
                    <span>#{tag}</span>
                    <span className="text-[10px] text-white/40">{count}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Interactive Lab Link */}
            <div className="rounded-2xl bg-gradient-to-br from-blue-950/30 to-purple-950/20 border border-blue-500/20 p-5">
              <h3 className="font-barlow font-bold text-sm text-white uppercase tracking-wider mb-1 flex items-center gap-2">
                <Terminal className="w-4 h-4 text-blue-400" />
                <span>Test Before You Post</span>
              </h3>
              <p className="text-xs font-montserrat text-white/60 leading-relaxed mb-3">
                Have a query hypothesis? Launch the AST-verified Mongo Playground sandbox to inspect real-time query execution.
              </p>
              <Link
                href="/playground"
                className="inline-flex items-center justify-center w-full px-4 py-2.5 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 text-blue-300 text-xs font-montserrat font-semibold transition-all"
              >
                Launch Mongo Playground
              </Link>
            </div>
          </aside>
        </div>
      </main>

      {/* New Discussion Composer Modal */}
      {isComposerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl bg-[#0a0d14] border border-white/15 p-6 shadow-2xl relative">
            <button
              onClick={() => setIsComposerOpen(false)}
              className="absolute top-4 right-4 text-white/50 hover:text-white p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white">
                <Code2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-barlow font-bold text-lg text-white">
                  Start a Community Discussion
                </h3>
                <p className="text-xs font-montserrat text-white/50">
                  Share a question, pipeline design pattern, or optimization insight.
                </p>
              </div>
            </div>

            {formError && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-montserrat">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreatePost} className="space-y-4">
              {/* Category selector */}
              <div>
                <label className="block text-[11px] font-montserrat text-white/60 uppercase tracking-wider mb-1.5">
                  Category
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as ForumCategory)}
                  className="w-full px-3 py-2 rounded-xl bg-white/[0.05] border border-white/10 text-white text-xs font-montserrat focus:outline-none focus:border-white/40"
                >
                  {CATEGORIES.filter((c) => c.id !== 'all').map((c) => (
                    <option key={c.id} value={c.id} className="bg-[#0e111a] text-white">
                      {c.icon} {c.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Title */}
              <div>
                <label className="block text-[11px] font-montserrat text-white/60 uppercase tracking-wider mb-1.5">
                  Title
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. How to structure $lookup with pipeline in MongoDB 6.0?"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.05] border border-white/10 text-white placeholder-white/30 text-xs font-montserrat focus:outline-none focus:border-white/40"
                  required
                />
              </div>

              {/* Body */}
              <div>
                <label className="block text-[11px] font-montserrat text-white/60 uppercase tracking-wider mb-1.5">
                  Explanation & Context
                </label>
                <textarea
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  rows={4}
                  placeholder="Describe your data model, explain the query performance goal, or state what unexpected result you observed..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.05] border border-white/10 text-white placeholder-white/30 text-xs font-montserrat focus:outline-none focus:border-white/40 resize-y"
                  required
                />
              </div>

              {/* Optional Code Snippet */}
              <div>
                <label className="block text-[11px] font-montserrat text-white/60 uppercase tracking-wider mb-1.5">
                  MQL / BSON Code Snippet (Optional)
                </label>
                <textarea
                  value={newCodeSnippet}
                  onChange={(e) => setNewCodeSnippet(e.target.value)}
                  rows={3}
                  placeholder="db.orders.aggregate([ { $match: { status: 'A' } }, { $group: { _id: '$cust_id', total: { $sum: '$amount' } } } ])"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/10 text-emerald-400 font-mono text-xs focus:outline-none focus:border-white/40 resize-y"
                />
              </div>

              {/* Tags */}
              <div>
                <label className="block text-[11px] font-montserrat text-white/60 uppercase tracking-wider mb-1.5">
                  Tags (Comma separated)
                </label>
                <input
                  type="text"
                  value={newTags}
                  onChange={(e) => setNewTags(e.target.value)}
                  placeholder="aggregation, facet, pagination, indexes"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.05] border border-white/10 text-white placeholder-white/30 text-xs font-montserrat focus:outline-none focus:border-white/40"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsComposerOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-montserrat text-white/60 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-white text-black hover:bg-white/90 text-xs font-montserrat font-bold tracking-wide transition-all disabled:opacity-50"
                >
                  {submitting ? 'Publishing...' : 'Publish Discussion'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
