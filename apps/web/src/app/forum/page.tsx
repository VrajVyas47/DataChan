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
import {
  Button,
  Input,
  Textarea,
  Select,
  Badge,
  Card,
  Modal,
  EmptyState,
  LoadingState,
  PageHeader,
} from '@/components/ui';

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
  const [currentUser, setCurrentUser] = useState<any>(null);
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
    api.getMe().then(setCurrentUser).catch(() => setCurrentUser(null));
  }, []);

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
    <div className="w-full flex flex-col gap-6 text-text">
      {/* Normalized Header */}
      <PageHeader
        icon={<MessagesSquare className="w-6 h-6 text-primary" />}
        title="Community Engineering Forum"
        description="Explore real MongoDB aggregation benchmarks, discuss embedding vs referencing trade-offs, solve compound index ESR puzzles, and get answers from lab engineers and fellow learners."
        actions={
          <div className="flex items-center gap-2">
            <Link href="/playground">
              <Button variant="outline" size="sm" leftIcon={<Terminal className="w-3.5 h-3.5" />}>
                Playground
              </Button>
            </Link>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsComposerOpen(true)}
              leftIcon={<Plus className="w-3.5 h-3.5" />}
            >
              New Discussion
            </Button>
          </div>
        }
      />

      {/* Metrics Banner */}
      {stats && (
        <div className="grid grid-cols-3 gap-3">
          <Card variant="surface" className="p-4 text-center">
            <div className="text-xl sm:text-2xl font-black text-text font-mono">
              {stats.totalPosts}
            </div>
            <div className="text-[10px] text-text-muted uppercase font-bold tracking-wider mt-0.5">
              Active Threads
            </div>
          </Card>
          <Card variant="surface" className="p-4 text-center">
            <div className="text-xl sm:text-2xl font-black text-primary font-mono">
              {stats.totalReplies}
            </div>
            <div className="text-[10px] text-text-muted uppercase font-bold tracking-wider mt-0.5">
              Replies
            </div>
          </Card>
          <Card variant="surface" className="p-4 text-center">
            <div className="text-xl sm:text-2xl font-black text-emerald-400 font-mono">
              {stats.solvedCount}
            </div>
            <div className="text-[10px] text-text-muted uppercase font-bold tracking-wider mt-0.5">
              Solved Discussions
            </div>
          </Card>
        </div>
      )}

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search queries, operators ($facet, $lookup), tags..."
            leftIcon={<Search className="w-4 h-4 text-text-muted" />}
            rightIcon={
              searchQuery ? (
                <div role="button" onClick={() => setSearchQuery('')} className="p-1 hover:text-text cursor-pointer">
                  <X className="w-3.5 h-3.5" />
                </div>
              ) : null
            }
          />
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-surface-low rounded-xl border border-border">
          <span className="text-[11px] text-text-muted px-2 font-semibold">Sort:</span>
          {(['recent', 'top', 'unanswered'] as const).map((mode) => (
            <div
              key={mode}
              role="button"
              onClick={() => setSortBy(mode)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer ${
                sortBy === mode
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-text-muted hover:text-text hover:bg-surface-high'
              }`}
            >
              {mode}
            </div>
          ))}
        </div>
      </div>

      {/* Category Pills Strip */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {CATEGORIES.map((cat) => (
          <div
            key={cat.id}
            role="button"
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border flex items-center gap-1.5 cursor-pointer ${
              selectedCategory === cat.id
                ? 'bg-primary text-white border-primary shadow-sm'
                : 'bg-surface-low hover:bg-surface text-text-muted hover:text-text border-border'
            }`}
          >
            <span>{cat.icon}</span>
            <span>{cat.label}</span>
          </div>
        ))}
      </div>

      {/* Tag active filter bar if selected */}
      {selectedTag && (
        <div className="flex items-center gap-2 bg-primary/10 border border-primary/20 px-3 py-1.5 rounded-xl text-xs text-primary w-fit">
          <span>Filtering by tag: <strong>#{selectedTag}</strong></span>
          <div role="button" onClick={() => setSelectedTag(null)} className="hover:opacity-80 p-0.5 cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </div>
        </div>
      )}

      {/* Main 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Posts Feed (Span 8) */}
        <div className="lg:col-span-8 flex flex-col gap-3">
          {loading ? (
            <LoadingState text="Loading community discussions..." fullHeight />
          ) : posts.length === 0 ? (
            <EmptyState
              icon={<MessagesSquare className="w-6 h-6 text-primary" />}
              title="No discussions found"
              description="Be the first to start a conversation in this topic!"
              action={
                <Button size="sm" onClick={() => setIsComposerOpen(true)}>
                  Create Discussion
                </Button>
              }
            />
          ) : (
            posts.map((post) => {
              const categoryObj = CATEGORIES.find((c) => c.id === post.category);
              return (
                <Card
                  key={post.id}
                  variant="interactive"
                  className="flex flex-col gap-3 p-4"
                >
                  <div className="flex items-start gap-3.5">
                    {/* Upvote Button */}
                    <div
                      role="button"
                      onClick={(e) => handleUpvote(e, post.id)}
                      className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all shrink-0 w-12 cursor-pointer ${
                        post.isUpvoted
                          ? 'bg-primary/20 border-primary text-primary'
                          : 'bg-surface-high border-border text-text-muted hover:text-text hover:border-text-muted'
                      }`}
                    >
                      <ThumbsUp className={`w-3.5 h-3.5 ${post.isUpvoted ? 'fill-current' : ''}`} />
                      <span className="text-[11px] font-mono font-bold mt-1">{post.upvotes}</span>
                    </div>

                    {/* Thread Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        {post.isPinned && (
                          <Badge variant="warning" size="xs" icon={<Pin className="w-2.5 h-2.5" />}>
                            Pinned
                          </Badge>
                        )}
                        {post.isSolved && (
                          <Badge variant="success" size="xs" icon={<CheckCircle2 className="w-2.5 h-2.5" />}>
                            Solved
                          </Badge>
                        )}
                        <span className="text-xs font-semibold text-text">{post.authorName}</span>
                        {post.authorRole && (
                          <Badge role={post.authorRole as any} size="xs" />
                        )}
                        <span className="text-text-muted text-xs">&bull;</span>
                        <span className="text-[11px] text-text-muted">
                          {new Date(post.createdAt).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                        <span className="ml-auto inline-flex items-center gap-1 text-[11px] text-text-muted px-2 py-0.5 rounded-full bg-surface-high">
                          <span>{categoryObj?.icon || '📁'}</span>
                          <span>{categoryObj?.label || post.category}</span>
                        </span>
                      </div>

                      {/* Title */}
                      <h3 className="text-sm sm:text-base font-bold text-text hover:text-primary transition-colors">
                        <Link href={`/forum/${post.id}`} className="hover:underline">
                          {post.title}
                        </Link>
                      </h3>

                      {/* Excerpt */}
                      <p className="mt-1 text-xs text-text-muted line-clamp-2 leading-relaxed">
                        {post.content}
                      </p>

                      {/* Code Snippet preview */}
                      {post.codeSnippet && (
                        <div className="mt-2.5 p-2 rounded-xl bg-[#0d0e14] border border-border font-mono text-[11px] text-emerald-400 overflow-x-auto max-h-14 overflow-y-hidden">
                          <code>{post.codeSnippet.split('\n')[0]}</code>
                          {post.codeSnippet.split('\n').length > 1 && (
                            <span className="text-text-muted ml-2">... (+more)</span>
                          )}
                        </div>
                      )}

                      {/* Footer tags and counters */}
                      <div className="mt-3 pt-2.5 border-t border-border/60 flex flex-wrap items-center justify-between gap-2 text-xs text-text-muted">
                        <div className="flex flex-wrap items-center gap-1">
                          {post.tags.map((tag) => (
                            <div
                              key={tag}
                              role="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedTag(tag);
                              }}
                              className="px-2 py-0.5 rounded-md bg-surface-high hover:bg-surface text-[10px] font-mono text-text transition-colors border border-border cursor-pointer"
                            >
                              #{tag}
                            </div>
                          ))}
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1 text-xs">
                            <Eye className="w-3.5 h-3.5 text-text-muted" />
                            <span>{post.views}</span>
                          </span>
                          <Link
                            href={`/forum/${post.id}`}
                            className="flex items-center gap-1 text-xs text-primary font-semibold hover:underline"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            <span>{post.replyCount} replies</span>
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>

        {/* Sidebar Column (Span 4) */}
        <aside className="lg:col-span-4 flex flex-col gap-5">
          {/* Community Guidelines Card */}
          <Card variant="surface" className="flex flex-col gap-2 p-5">
            <h3 className="text-xs font-bold text-text uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <span>Community Guidelines</span>
            </h3>
            <p className="text-xs text-text-muted leading-relaxed mb-1">
              DATA-CHAN is dedicated to mastery through hands-on querying:
            </p>
            <ul className="text-xs text-text-muted space-y-2 list-disc list-inside leading-relaxed">
              <li>Include reproducible MongoDB sample documents</li>
              <li>Share execution plans (<code className="font-mono text-primary">.explain()</code>)</li>
              <li>Never post real database credentials or secrets</li>
              <li>Celebrate compound indexing and aggregation design</li>
            </ul>
          </Card>

          {/* Popular Topics Cloud */}
          <Card variant="surface" className="flex flex-col gap-3 p-5">
            <h3 className="text-xs font-bold text-text uppercase tracking-wider flex items-center gap-2">
              <Tag className="w-4 h-4 text-emerald-400" />
              <span>Popular Topics</span>
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {popularTags.map(([tag, count]) => (
                <div
                  key={tag}
                  role="button"
                  onClick={() => setSelectedTag(tag)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-mono transition-all flex items-center gap-1.5 border cursor-pointer ${
                    selectedTag === tag
                      ? 'bg-primary text-white border-primary font-bold'
                      : 'bg-surface-low hover:bg-surface-high text-text border-border'
                  }`}
                >
                  <span>#{tag}</span>
                  <span className="text-[10px] opacity-70">({count})</span>
                </div>
              ))}
            </div>
          </Card>
        </aside>
      </div>

      {/* New Discussion Composer Modal */}
      <Modal
        isOpen={isComposerOpen}
        onClose={() => setIsComposerOpen(false)}
        title="Start a Community Discussion"
        description="Share a question, pipeline design pattern, or query optimization insight."
        maxWidth="lg"
      >
        {formError && (
          <div className="p-3 rounded-xl bg-error/10 border border-error/30 text-error text-xs">
            {formError}
          </div>
        )}

        <form onSubmit={handleCreatePost} className="flex flex-col gap-4">
          <Select
            label="Category"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value as ForumCategory)}
          >
            {CATEGORIES.filter((c) => c.id !== 'all').map((c) => (
              <option key={c.id} value={c.id}>
                {c.icon} {c.label}
              </option>
            ))}
          </Select>

          <Input
            label="Title"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="e.g. How to structure $lookup with pipeline in MongoDB 6.0?"
            required
          />

          <Textarea
            label="Explanation & Context"
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            rows={4}
            placeholder="Describe your data model, explain the query performance goal, or state what unexpected result you observed..."
            required
          />

          <Textarea
            label="MQL / BSON Code Snippet (Optional)"
            value={newCodeSnippet}
            onChange={(e) => setNewCodeSnippet(e.target.value)}
            rows={3}
            placeholder="db.orders.aggregate([ { $match: { status: 'A' } }, { $group: { _id: '$cust_id', total: { $sum: '$amount' } } } ])"
            className="font-mono text-emerald-400"
          />

          <Input
            label="Tags (Comma separated)"
            value={newTags}
            onChange={(e) => setNewTags(e.target.value)}
            placeholder="aggregation, facet, pagination, indexes"
          />

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsComposerOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" isLoading={submitting}>
              {submitting ? 'Publishing...' : 'Publish Discussion'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
