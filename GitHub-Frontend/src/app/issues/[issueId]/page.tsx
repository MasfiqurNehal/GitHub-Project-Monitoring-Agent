'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Header from '../../../components/layout/header';
import ChatDrawer from '../../../components/ai/chat-drawer';
import { useIssueDetail } from '../../../hooks/use-issues';
import { LoadingState } from '../../../components/common/LoadingState';
import { ErrorState } from '../../../components/common/ErrorState';
import { 
  CircleDot, 
  CheckCircle2, 
  ArrowLeft, 
  Clock, 
  GitBranch, 
  FolderKanban, 
  Tag, 
  UserCheck, 
  MessageSquare, 
  ShieldCheck, 
  GitPullRequest,
  ExternalLink,
  Calendar,
  User
} from 'lucide-react';

interface IssueDetailPageProps {
  params: {
    issueId: string;
  };
}

export default function IssueDetailPage({ params }: IssueDetailPageProps) {
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'comments' | 'timeline'>('comments');

  const { issueDetail, isLoading, isError, refetch } = useIssueDetail(params.issueId);

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col min-w-0 bg-slate-950 text-slate-100 min-h-screen">
        <Header onOpenAIChat={() => setIsAIChatOpen(true)} />
        <main className="flex-1 p-6 max-w-7xl w-full mx-auto flex items-center justify-center">
          <LoadingState message="Fetching issue details, discussion comments, and activity timeline..." />
        </main>
      </div>
    );
  }

  if (isError || !issueDetail) {
    return (
      <div className="flex-1 flex flex-col min-w-0 bg-slate-950 text-slate-100 min-h-screen">
        <Header onOpenAIChat={() => setIsAIChatOpen(true)} />
        <main className="flex-1 p-6 max-w-7xl w-full mx-auto flex items-center justify-center">
          <ErrorState
            title="Issue Not Found"
            message={`Could not load details for issue ID: ${params.issueId}`}
            onRetry={() => refetch()}
          />
        </main>
      </div>
    );
  }

  const { issue, comments, timeline, relatedPullRequests } = issueDetail;

  const formattedCreated = new Date(issue.createdAt).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const formattedClosed = issue.closedAt
    ? new Date(issue.closedAt).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-slate-950 text-slate-100 min-h-screen">
      <Header onOpenAIChat={() => setIsAIChatOpen(true)} />

      <main className="flex-1 p-6 space-y-6 max-w-7xl w-full mx-auto">
        {/* Back Link & Read-Only Indicator */}
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/issues"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Issues
          </Link>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Read-Only Issue Telemetry</span>
          </div>
        </div>

        {/* Main Issue Header */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="font-mono font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20 text-sm">
                  #{issue.number}
                </span>

                {issue.state === 'OPEN' ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <CircleDot className="w-4 h-4" /> Open Issue
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                    <CheckCircle2 className="w-4 h-4" /> Closed Issue
                  </span>
                )}
              </div>

              <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight leading-snug">
                {issue.title}
              </h1>
            </div>
          </div>

          {/* Sub Header Metadata */}
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 pt-3 border-t border-slate-800/80">
            {/* Author */}
            <div className="flex items-center gap-2">
              <img
                src={issue.author?.avatarUrl || 'https://github.com/github.png'}
                alt={issue.author?.login || 'Author'}
                className="w-5 h-5 rounded-full border border-slate-700 object-cover"
              />
              <span className="text-slate-400">Opened by</span>
              <span className="font-semibold text-slate-100">@{issue.author?.login}</span>
            </div>

            <span className="text-slate-600">•</span>

            {/* Created Date */}
            <div className="flex items-center gap-1.5 text-slate-400">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span>Created {formattedCreated}</span>
            </div>

            {formattedClosed && (
              <>
                <span className="text-slate-600">•</span>
                <div className="flex items-center gap-1.5 text-purple-400 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />
                  <span>Closed {formattedClosed}</span>
                </div>
              </>
            )}

            <span className="text-slate-600">•</span>

            {/* Repository */}
            <Link
              href={`/repositories/${issue.repositoryId}`}
              className="inline-flex items-center gap-1 font-mono text-slate-300 hover:text-indigo-400 transition-colors"
            >
              <GitBranch className="w-3.5 h-3.5 text-indigo-400" />
              <span>{issue.repository.fullName}</span>
            </Link>

            {/* Project */}
            {issue.project && (
              <>
                <span className="text-slate-600">•</span>
                <Link
                  href={`/projects/${issue.project.id}`}
                  className="inline-flex items-center gap-1 text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20 hover:underline"
                >
                  <FolderKanban className="w-3 h-3" />
                  <span>{issue.project.name}</span>
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Main 2-Column Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left / Main Column (Body, Comments & Timeline) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Issue Description Box */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Issue Description
              </h3>
              <div className="text-sm text-slate-200 leading-relaxed bg-slate-950 border border-slate-800/80 rounded-xl p-4 font-normal whitespace-pre-wrap">
                {issue.body || 'No description provided for this issue.'}
              </div>
            </div>

            {/* Related Pull Requests (if any) */}
            {relatedPullRequests && relatedPullRequests.length > 0 && (
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-3">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <GitPullRequest className="w-4 h-4 text-purple-400" /> Linked Pull Requests
                </h3>
                <div className="space-y-2">
                  {relatedPullRequests.map((pr) => (
                    <div
                      key={pr.id}
                      className="flex items-center justify-between p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                          #{pr.number}
                        </span>
                        <Link
                          href={`/pull-requests/${pr.id}`}
                          className="font-semibold text-slate-200 hover:text-blue-400 transition-colors"
                        >
                          {pr.title}
                        </Link>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {pr.state}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tabs for Comments vs Timeline */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
              {/* Tab Switcher */}
              <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                <button
                  onClick={() => setActiveTab('comments')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    activeTab === 'comments'
                      ? 'bg-amber-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white bg-slate-950 border border-slate-800'
                  }`}
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Discussion Comments ({comments.length})</span>
                </button>

                <button
                  onClick={() => setActiveTab('timeline')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    activeTab === 'timeline'
                      ? 'bg-amber-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white bg-slate-950 border border-slate-800'
                  }`}
                >
                  <Clock className="w-4 h-4" />
                  <span>Activity Timeline ({timeline.length})</span>
                </button>
              </div>

              {/* Comments Tab Content */}
              {activeTab === 'comments' && (
                <div className="space-y-4">
                  {comments.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-xs">
                      No discussion comments recorded for this issue yet.
                    </div>
                  ) : (
                    comments.map((comment) => (
                      <div
                        key={comment.id}
                        className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3 shadow-sm"
                      >
                        <div className="flex items-center justify-between text-xs border-b border-slate-800/60 pb-2">
                          <div className="flex items-center gap-2">
                            <img
                              src={comment.author.avatarUrl || 'https://github.com/github.png'}
                              alt={comment.author.login}
                              className="w-5 h-5 rounded-full border border-slate-700"
                            />
                            <span className="font-semibold text-slate-100">@{comment.author.login}</span>
                            {comment.author.name && (
                              <span className="text-slate-400 text-[11px]">({comment.author.name})</span>
                            )}
                          </div>
                          <span className="text-slate-500 text-[11px]">
                            {new Date(comment.createdAt).toLocaleString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <div className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
                          {comment.body}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Timeline Tab Content */}
              {activeTab === 'timeline' && (
                <div className="space-y-6 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-slate-800">
                  {timeline.map((step) => {
                    const stepDate = new Date(step.timestamp).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    });

                    return (
                      <div key={step.id} className="relative flex items-start gap-4 pl-8">
                        <div className="absolute left-1.5 top-0.5 w-5 h-5 rounded-full bg-slate-900 border border-amber-500 flex items-center justify-center text-amber-400 shadow-sm">
                          <CircleDot className="w-3 h-3" />
                        </div>

                        <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex-1 space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-1.5 font-semibold text-slate-200">
                              <span className="text-amber-400">@{step.actor.login}</span>
                              <span>{step.title}</span>
                            </div>
                            <span className="text-[11px] text-slate-500">{stepDate}</span>
                          </div>
                          {step.details && (
                            <p className="text-[11px] text-slate-400 bg-slate-900/60 px-2.5 py-1 rounded border border-slate-800/60 mt-1">
                              {step.details}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right / Sidebar Column (Metadata Panels) */}
          <div className="space-y-6">
            {/* Labels Panel */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <Tag className="w-4 h-4 text-amber-400" /> Labels
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {issue.labels && issue.labels.length > 0 ? (
                  issue.labels.map((lbl) => (
                    <span
                      key={lbl.id}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold border"
                      style={{
                        backgroundColor: `${lbl.color || '#3b82f6'}15`,
                        borderColor: `${lbl.color || '#3b82f6'}40`,
                        color: lbl.color || '#60a5fa',
                      }}
                    >
                      <Tag className="w-3 h-3" />
                      {lbl.name}
                    </span>
                  ))
                ) : (
                  <span className="text-slate-500 text-xs">No labels assigned</span>
                )}
              </div>
            </div>

            {/* Assignees Panel */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-indigo-400" /> Assignees
              </h3>
              {issue.assignees && issue.assignees.length > 0 ? (
                <div className="space-y-2">
                  {issue.assignees.map((assignee) => (
                    <div
                      key={assignee.id}
                      className="flex items-center gap-2.5 p-2 bg-slate-950 border border-slate-800 rounded-xl"
                    >
                      <img
                        src={assignee.avatarUrl || 'https://github.com/github.png'}
                        alt={assignee.login}
                        className="w-6 h-6 rounded-full border border-slate-700 object-cover"
                      />
                      <div>
                        <div className="text-xs font-semibold text-slate-200">@{assignee.login}</div>
                        {assignee.name && <div className="text-[10px] text-slate-400">{assignee.name}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <span className="text-slate-500 text-xs">No engineers assigned</span>
              )}
            </div>

            {/* Related Context Panel */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Engineering Context
              </h3>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-slate-500 text-[11px] block">Repository</span>
                  <Link
                    href={`/repositories/${issue.repositoryId}`}
                    className="font-mono text-slate-200 font-semibold hover:text-indigo-400 flex items-center gap-1 mt-0.5"
                  >
                    <GitBranch className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span>{issue.repository.fullName}</span>
                  </Link>
                </div>

                {issue.project && (
                  <div>
                    <span className="text-slate-500 text-[11px] block">Project</span>
                    <Link
                      href={`/projects/${issue.project.id}`}
                      className="text-blue-400 font-semibold hover:underline flex items-center gap-1 mt-0.5"
                    >
                      <FolderKanban className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      <span>{issue.project.name}</span>
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* Express API Readiness Banner */}
            <div className="bg-indigo-950/40 border border-indigo-500/20 rounded-2xl p-4 text-xs text-indigo-300 space-y-1">
              <div className="font-semibold text-indigo-200 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-indigo-400" /> Express API Module Ready
              </div>
              <p className="text-[11px] text-indigo-300/80 leading-relaxed">
                This detail view is prepared for seamless REST hookup with backend Express `/api/issues/:issueId` endpoints.
              </p>
            </div>
          </div>
        </div>
      </main>

      <ChatDrawer isOpen={isAIChatOpen} onClose={() => setIsAIChatOpen(false)} />
    </div>
  );
}
