'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ThumbsUp,
  MessageCircle,
  Eye,
  CheckCircle2,
  Pin,
  Share2,
  Terminal,
  BookOpen,
  Copy,
  Check,
  Send,
  Code2,
  AlertCircle,
  MessagesSquare,
} from 'lucide-react';
import { api } from '@/lib/api';
import { ForumPost, ForumReply, CreateForumReplyDto } from '@datachan/shared-types';
import {
  Button,
  Input,
  Textarea,
  Badge,
  Card,
  EmptyState,
  LoadingState,
} from '@/components/ui';

export default function ForumPostPage() {
  const params = useParams();
  const router = useRouter();
  const postId = params.id as string;

  const [post, setPost] = useState<ForumPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Reply form state
  const [replyContent, setReplyContent] = useState('');
  const [replyCode, setReplyCode] = useState('');
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [submittingReply, setSubmittingReply] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Fetch thread details
  const loadPost = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getForumPost(postId);
      setPost(data);
    } catch (err: any) {
      setError(err.message || 'Discussion thread not found.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (postId) loadPost();
  }, [postId]);

  // Handle post upvote
  const handleUpvotePost = async () => {
    if (!post) return;
    try {
      const res = await api.upvoteForumPost(post.id);
      setPost((prev) =>
        prev
          ? {
              ...prev,
              upvotes: res.upvotes,
              isUpvoted: res.userUpvoted,
            }
          : null
      );
    } catch (err) {
      console.error('Failed to upvote post:', err);
    }
  };

  // Handle reply upvote
  const handleUpvoteReply = async (replyId: string) => {
    if (!post) return;
    try {
      const res = await api.upvoteForumReply(post.id, replyId);
      setPost((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          replies: (prev.replies || []).map((r) =>
            r.id === replyId
              ? { ...r, upvotes: res.upvotes, isUpvoted: res.userUpvoted }
              : r
          ),
        };
      });
    } catch (err) {
      console.error('Failed to upvote reply:', err);
    }
  };

  // Submit new reply
  const handleSubmitReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyContent.trim()) {
      setReplyError('Reply message cannot be empty.');
      return;
    }

    try {
      setSubmittingReply(true);
      setReplyError(null);
      const dto: CreateForumReplyDto = {
        content: replyContent.trim(),
        codeSnippet: replyCode.trim() ? replyCode.trim() : undefined,
        codeLanguage: replyCode.trim() ? 'javascript' : undefined,
      };

      const newReply = await api.createForumReply(postId, dto);
      setPost((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          replyCount: prev.replyCount + 1,
          replies: [...(prev.replies || []), newReply],
        };
      });

      // Clear reply inputs
      setReplyContent('');
      setReplyCode('');
      setShowCodeInput(false);
    } catch (err: any) {
      setReplyError(err.message || 'Failed to submit reply. Please try again.');
    } finally {
      setSubmittingReply(false);
    }
  };

  // Copy code to clipboard
  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Copy link to clipboard
  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-5xl mx-auto pb-12">
      {/* Top Navigation Bar */}
      <div className="flex items-center justify-between pb-4 border-b border-border">
        <div className="flex items-center gap-3">
          <Link href="/forum">
            <Button variant="outline" size="sm" icon={ArrowLeft}>
              Back to Forums
            </Button>
          </Link>
          <div className="h-4 w-px bg-border hidden sm:block" />
          <Link href="/forum" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 group-hover:bg-primary group-hover:text-white transition-all">
              <MessagesSquare className="w-4 h-4" />
            </div>
            <span className="font-bold text-base tracking-tight text-text-main hidden sm:inline">
              Data-Chan Forums
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            icon={copiedLink ? Check : Share2}
            onClick={handleCopyLink}
          >
            {copiedLink ? 'Copied' : 'Share'}
          </Button>

          <Link href="/playground">
            <Button variant="outline" size="sm" icon={Terminal}>
              <span className="hidden sm:inline">Playground</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Main Content */}
      {loading ? (
        <LoadingState message="Loading discussion thread..." fullScreen={false} className="py-20" />
      ) : error || !post ? (
        <EmptyState
          icon={AlertCircle}
          title="Thread Not Found"
          description={error || 'This discussion may have been removed or does not exist.'}
          action={{
            label: 'Return to Forum Directory',
            onClick: () => router.push('/forum'),
          }}
        />
      ) : (
        <div className="flex flex-col gap-8">
          {/* Main Question / Topic Card */}
          <Card className="p-6 sm:p-8 flex flex-col gap-6">
            {/* Meta Header */}
            <div className="flex flex-wrap items-center gap-2">
              {post.isPinned && (
                <Badge variant="warning" size="xs" dot>
                  Pinned
                </Badge>
              )}

              {post.isSolved && (
                <Badge variant="success" size="xs" dot>
                  Solved
                </Badge>
              )}

              <Badge variant="neutral" size="xs" className="capitalize">
                {post.category}
              </Badge>

              <div className="ml-auto flex items-center gap-3 text-xs text-text-muted font-mono">
                <span className="flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5" />
                  <span>{post.views} views</span>
                </span>
                <span>·</span>
                <span>
                  {new Date(post.createdAt).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
              </div>
            </div>

            {/* Title */}
            <h1 className="font-black text-2xl sm:text-3xl text-text-main tracking-tight leading-tight">
              {post.title}
            </h1>

            {/* Author Info */}
            <div className="flex items-center gap-3 pb-6 border-b border-border">
              <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-sm text-primary uppercase">
                {post.authorName.charAt(0)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-text-main">{post.authorName}</span>
                  {post.authorRole && (
                    <Badge variant="secondary" size="xs">
                      {post.authorRole}
                    </Badge>
                  )}
                </div>
                <div className="text-[11px] text-text-muted">
                  Posted at {new Date(post.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>

            {/* Post Body */}
            <div className="text-sm text-text-main leading-relaxed whitespace-pre-line space-y-4">
              {post.content}
            </div>

            {/* Code Snippet Box */}
            {post.codeSnippet && (
              <div className="rounded-xl bg-inverse-surface border border-border overflow-hidden">
                <div className="px-4 py-2 bg-surface-low border-b border-border flex items-center justify-between">
                  <span className="text-[11px] font-mono text-text-muted uppercase">
                    {post.codeLanguage || 'mongodb / javascript'}
                  </span>
                  <div
                    role="button"
                    onClick={() => handleCopyCode(post.codeSnippet!)}
                    className="flex items-center gap-1 text-[11px] font-mono text-text-muted hover:text-text-main transition-colors cursor-pointer"
                  >
                    {copiedCode ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-500" />
                        <span className="text-emerald-500 font-bold">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy snippet</span>
                      </>
                    )}
                  </div>
                </div>
                <pre className="p-4 text-xs font-mono text-emerald-400 overflow-x-auto leading-relaxed">
                  <code>{post.codeSnippet}</code>
                </pre>
              </div>
            )}

            {/* Footer Tags & Upvote */}
            <div className="pt-4 border-t border-border flex flex-wrap items-center justify-between gap-4">
              {/* Tag chips */}
              <div className="flex flex-wrap items-center gap-1.5">
                {post.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2.5 py-1 rounded-md bg-surface-high text-[11px] font-mono text-text-muted"
                  >
                    #{tag}
                  </span>
                ))}
              </div>

              {/* Upvote button */}
              <Button
                variant={post.isUpvoted ? 'primary' : 'outline'}
                size="sm"
                icon={ThumbsUp}
                onClick={handleUpvotePost}
              >
                <span>{post.isUpvoted ? 'Upvoted' : 'Upvote'}</span>
                <span className="ml-1 px-1.5 py-0.2 rounded bg-black/20 text-[11px] font-mono">
                  {post.upvotes}
                </span>
              </Button>
            </div>
          </Card>

          {/* Replies Section */}
          <section className="flex flex-col gap-4">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <h2 className="font-bold text-lg text-text-main flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-primary" />
                <span>Replies ({(post.replies || []).length})</span>
              </h2>
            </div>

            {(!post.replies || post.replies.length === 0) ? (
              <EmptyState
                icon={MessageCircle}
                title="No Replies Yet"
                description="Be the first database engineer to contribute an answer or perspective!"
              />
            ) : (
              <div className="flex flex-col gap-4">
                {post.replies.map((reply) => (
                  <Card
                    key={reply.id}
                    className={`p-5 sm:p-6 transition-all ${
                      reply.isAcceptedSolution
                        ? 'border-emerald-500/40 bg-emerald-500/5'
                        : ''
                    }`}
                  >
                    {/* Reply Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-surface-high flex items-center justify-center font-bold text-xs uppercase text-text-main">
                          {reply.authorName.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-text-main">
                              {reply.authorName}
                            </span>
                            {reply.authorRole && (
                              <Badge variant="secondary" size="xs">
                                {reply.authorRole}
                              </Badge>
                            )}
                            {reply.isAcceptedSolution && (
                              <Badge variant="success" size="xs" dot>
                                Accepted Answer
                              </Badge>
                            )}
                          </div>
                          <span className="text-[10px] text-text-muted">
                            {new Date(reply.createdAt).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                        </div>
                      </div>

                      {/* Reply Upvote */}
                      <Button
                        variant={reply.isUpvoted ? 'primary' : 'ghost'}
                        size="xs"
                        icon={ThumbsUp}
                        onClick={() => handleUpvoteReply(reply.id)}
                      >
                        <span>{reply.upvotes}</span>
                      </Button>
                    </div>

                    {/* Reply Body */}
                    <div className="text-xs sm:text-sm text-text-main leading-relaxed whitespace-pre-line">
                      {reply.content}
                    </div>

                    {/* Reply Code Snippet */}
                    {reply.codeSnippet && (
                      <div className="mt-4 rounded-xl bg-inverse-surface border border-border p-3 overflow-x-auto">
                        <pre className="text-xs font-mono text-emerald-400">
                          <code>{reply.codeSnippet}</code>
                        </pre>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </section>

          {/* Inline Reply Composer */}
          <Card className="p-6 sm:p-8">
            <h3 className="font-bold text-base text-text-main mb-1 flex items-center gap-2">
              <Send className="w-4 h-4 text-primary" />
              <span>Contribute to this discussion</span>
            </h3>
            <p className="text-xs text-text-muted mb-4">
              Share an optimization technique, point out a pitfall, or provide an explain plan analysis.
            </p>

            {replyError && (
              <div className="mb-4 p-3 rounded-xl bg-error/10 border border-error/30 text-error text-xs">
                {replyError}
              </div>
            )}

            <form onSubmit={handleSubmitReply} className="flex flex-col gap-4">
              <Textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                rows={4}
                placeholder="Write your technical explanation, MQL solution, or architecture recommendation..."
                required
              />

              {showCodeInput ? (
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-mono text-text-muted uppercase">
                      Code Snippet (MQL / BSON)
                    </label>
                    <div
                      role="button"
                      onClick={() => {
                        setShowCodeInput(false);
                        setReplyCode('');
                      }}
                      className="text-[11px] text-text-muted hover:text-text-main cursor-pointer"
                    >
                      Remove code snippet
                    </div>
                  </div>
                  <Textarea
                    value={replyCode}
                    onChange={(e) => setReplyCode(e.target.value)}
                    rows={3}
                    placeholder="// e.g. db.collection.find({...})"
                    className="font-mono text-xs text-emerald-500"
                  />
                </div>
              ) : (
                <div
                  role="button"
                  onClick={() => setShowCodeInput(true)}
                  className="flex items-center gap-1.5 text-xs text-primary font-semibold hover:underline self-start cursor-pointer inline-flex"
                >
                  <Code2 className="w-3.5 h-3.5" />
                  <span>+ Add MQL code snippet</span>
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <span className="text-[11px] text-text-muted">
                  Posting as active developer profile
                </span>
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={submittingReply}
                  disabled={submittingReply || !replyContent.trim()}
                  icon={Send}
                >
                  Post Reply
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
