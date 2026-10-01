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
    <div className="min-h-screen w-full bg-[#050608] text-white selection:bg-purple-900/60 selection:text-white">
      {/* Top Universal Header */}
      <header className="sticky top-0 z-40 w-full px-6 py-4 backdrop-blur-md bg-[#050608]/80 border-b border-white/[0.08] flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/forum"
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/80 hover:text-white text-xs font-montserrat transition-all border border-white/10"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Forums</span>
          </Link>
          <div className="h-4 w-px bg-white/10 hidden sm:block" />
          <Link href="/forum" className="flex items-center gap-2 group">
            <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-white border border-white/10 group-hover:bg-white group-hover:text-black transition-all">
              <MessagesSquare className="w-3.5 h-3.5" />
            </div>
            <span className="font-barlow font-bold text-base tracking-tight text-white hidden sm:inline">
              DATA-CHAN FORUMS
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-xs font-montserrat transition-all border border-white/10"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
            <span>{copiedLink ? 'Copied' : 'Share'}</span>
          </button>

          <Link
            href="/playground"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/80 hover:text-white text-xs font-montserrat transition-all border border-white/10"
          >
            <Terminal className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline">Open Playground</span>
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {loading ? (
          <div className="space-y-4">
            <div className="h-48 rounded-2xl bg-white/[0.02] border border-white/[0.06] animate-pulse" />
            <div className="h-32 rounded-2xl bg-white/[0.02] border border-white/[0.06] animate-pulse" />
          </div>
        ) : error || !post ? (
          <div className="p-12 text-center rounded-2xl bg-white/[0.02] border border-white/[0.06] flex flex-col items-center">
            <AlertCircle className="w-10 h-10 text-red-400 mb-3" />
            <h3 className="font-barlow font-bold text-xl text-white">Thread Not Found</h3>
            <p className="text-xs font-montserrat text-white/50 mt-1 max-w-sm">
              {error || 'This discussion may have been removed or does not exist.'}
            </p>
            <Link
              href="/forum"
              className="mt-4 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-xs font-montserrat text-white"
            >
              Return to Forum Directory
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Main Question / Topic Card */}
            <article className="rounded-2xl bg-white/[0.02] border border-white/[0.08] p-6 sm:p-8">
              {/* Meta Header */}
              <div className="flex flex-wrap items-center gap-2 mb-3">
                {post.isPinned && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-mono uppercase font-bold">
                    <Pin className="w-2.5 h-2.5" />
                    Pinned
                  </span>
                )}

                {post.isSolved && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono uppercase font-bold">
                    <CheckCircle2 className="w-2.5 h-2.5" />
                    Solved
                  </span>
                )}

                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/5 text-[11px] font-montserrat text-white/60 capitalize">
                  {post.category}
                </span>

                <div className="ml-auto flex items-center gap-3 text-xs text-white/40 font-montserrat">
                  <span className="flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5" />
                    <span>{post.views} views</span>
                  </span>
                  <span>·</span>
                  <span>{new Date(post.createdAt).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })}</span>
                </div>
              </div>

              {/* Title */}
              <h1 className="font-barlow font-black text-2xl sm:text-3xl text-white tracking-tight uppercase leading-tight mb-4">
                {post.title}
              </h1>

              {/* Author Info */}
              <div className="flex items-center gap-3 pb-6 border-b border-white/[0.06] mb-6">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600/40 to-blue-600/40 border border-white/10 flex items-center justify-center font-bold text-sm uppercase">
                  {post.authorName.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-montserrat font-bold text-sm text-white">
                      {post.authorName}
                    </span>
                    {post.authorRole && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-white/70">
                        {post.authorRole}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] font-montserrat text-white/40">
                    Posted on {new Date(post.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>

              {/* Post Body */}
              <div className="text-sm font-montserrat text-white/80 leading-relaxed whitespace-pre-line space-y-4">
                {post.content}
              </div>

              {/* Code Snippet Box */}
              {post.codeSnippet && (
                <div className="mt-6 rounded-xl bg-[#030406] border border-white/10 overflow-hidden">
                  <div className="px-4 py-2 bg-white/[0.03] border-b border-white/[0.06] flex items-center justify-between">
                    <span className="text-[11px] font-mono text-white/50 uppercase">
                      {post.codeLanguage || 'mongodb / javascript'}
                    </span>
                    <button
                      onClick={() => handleCopyCode(post.codeSnippet!)}
                      className="flex items-center gap-1 text-[11px] font-mono text-white/50 hover:text-white transition-colors"
                    >
                      {copiedCode ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy snippet</span>
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="p-4 text-xs font-mono text-emerald-400 overflow-x-auto leading-relaxed">
                    <code>{post.codeSnippet}</code>
                  </pre>
                </div>
              )}

              {/* Footer Tags & Upvote */}
              <div className="mt-6 pt-6 border-t border-white/[0.06] flex flex-wrap items-center justify-between gap-4">
                {/* Tag chips */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {post.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2.5 py-1 rounded-md bg-white/[0.04] text-[11px] font-mono text-white/70"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>

                {/* Upvote button */}
                <button
                  onClick={handleUpvotePost}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-montserrat font-bold transition-all border ${
                    post.isUpvoted
                      ? 'bg-purple-600/30 border-purple-500/60 text-purple-300'
                      : 'bg-white/5 hover:bg-white/10 border-white/10 text-white'
                  }`}
                >
                  <ThumbsUp className="w-3.5 h-3.5" />
                  <span>{post.isUpvoted ? 'Upvoted' : 'Upvote'}</span>
                  <span className="px-1.5 py-0.5 rounded bg-black/40 text-[11px] font-mono">
                    {post.upvotes}
                  </span>
                </button>
              </div>
            </article>

            {/* Replies Section */}
            <section className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
                <h2 className="font-barlow font-bold text-xl text-white flex items-center gap-2 uppercase tracking-wide">
                  <MessageCircle className="w-4 h-4 text-blue-400" />
                  <span>Replies ({(post.replies || []).length})</span>
                </h2>
              </div>

              {(!post.replies || post.replies.length === 0) ? (
                <div className="p-8 text-center rounded-2xl bg-white/[0.01] border border-white/[0.04]">
                  <p className="text-xs font-montserrat text-white/50">
                    No replies yet. Be the first database engineer to contribute an answer or perspective!
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {post.replies.map((reply) => (
                    <div
                      key={reply.id}
                      className={`rounded-2xl p-5 sm:p-6 transition-all border ${
                        reply.isAcceptedSolution
                          ? 'bg-emerald-950/20 border-emerald-500/40'
                          : 'bg-white/[0.02] border-white/[0.06]'
                      }`}
                    >
                      {/* Reply Header */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center font-bold text-xs uppercase">
                            {reply.authorName.charAt(0)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-montserrat font-bold text-xs text-white">
                                {reply.authorName}
                              </span>
                              {reply.authorRole && (
                                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-white/60">
                                  {reply.authorRole}
                                </span>
                              )}
                              {reply.isAcceptedSolution && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-mono uppercase font-bold">
                                  <CheckCircle2 className="w-3 h-3" />
                                  Accepted Answer
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] font-montserrat text-white/40">
                              {new Date(reply.createdAt).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                              })}
                            </span>
                          </div>
                        </div>

                        {/* Reply Upvote */}
                        <button
                          onClick={() => handleUpvoteReply(reply.id)}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono transition-all border ${
                            reply.isUpvoted
                              ? 'bg-purple-600/30 border-purple-500/50 text-purple-300'
                              : 'bg-white/[0.03] border-white/10 text-white/60 hover:text-white hover:bg-white/10'
                          }`}
                        >
                          <ThumbsUp className="w-3 h-3" />
                          <span>{reply.upvotes}</span>
                        </button>
                      </div>

                      {/* Reply Body */}
                      <div className="text-xs sm:text-sm font-montserrat text-white/80 leading-relaxed whitespace-pre-line">
                        {reply.content}
                      </div>

                      {/* Reply Code Snippet */}
                      {reply.codeSnippet && (
                        <div className="mt-4 rounded-xl bg-[#030406] border border-white/10 p-3 overflow-x-auto">
                          <pre className="text-xs font-mono text-emerald-400">
                            <code>{reply.codeSnippet}</code>
                          </pre>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Inline Reply Composer */}
            <section className="rounded-2xl bg-white/[0.02] border border-white/[0.08] p-6 sm:p-8">
              <h3 className="font-barlow font-bold text-lg text-white uppercase tracking-wide mb-1 flex items-center gap-2">
                <Send className="w-4 h-4 text-emerald-400" />
                <span>Contribute to this discussion</span>
              </h3>
              <p className="text-xs font-montserrat text-white/50 mb-4">
                Share an optimization technique, point out a pitfall, or provide an explain plan analysis.
              </p>

              {replyError && (
                <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-montserrat">
                  {replyError}
                </div>
              )}

              <form onSubmit={handleSubmitReply} className="space-y-4">
                <textarea
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  rows={4}
                  placeholder="Write your technical explanation, MQL solution, or architecture recommendation..."
                  className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-white/30 text-xs sm:text-sm font-montserrat focus:outline-none focus:border-white/40 resize-y"
                  required
                />

                {showCodeInput ? (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[11px] font-mono text-white/60 uppercase">
                        Code Snippet (MQL / BSON)
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setShowCodeInput(false);
                          setReplyCode('');
                        }}
                        className="text-[11px] text-white/40 hover:text-white"
                      >
                        Remove code snippet
                      </button>
                    </div>
                    <textarea
                      value={replyCode}
                      onChange={(e) => setReplyCode(e.target.value)}
                      rows={3}
                      placeholder="// e.g. db.collection.find({...})"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/10 text-emerald-400 font-mono text-xs focus:outline-none focus:border-white/40 resize-y"
                    />
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowCodeInput(true)}
                    className="flex items-center gap-1.5 text-xs font-montserrat text-white/60 hover:text-white transition-colors"
                  >
                    <Code2 className="w-3.5 h-3.5" />
                    <span>+ Add MQL code snippet</span>
                  </button>
                )}

                <div className="flex items-center justify-between pt-2">
                  <span className="text-[11px] font-montserrat text-white/40">
                    Posting as active developer profile
                  </span>
                  <button
                    type="submit"
                    disabled={submittingReply}
                    className="px-6 py-2.5 rounded-xl bg-white text-black hover:bg-white/90 text-xs font-montserrat font-bold tracking-wide transition-all disabled:opacity-50 flex items-center gap-2"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{submittingReply ? 'Submitting...' : 'Post Reply'}</span>
                  </button>
                </div>
              </form>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
