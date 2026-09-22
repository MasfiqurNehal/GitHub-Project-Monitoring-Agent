'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Header from '../../../components/layout/header';
import ChatDrawer from '../../../components/ai/chat-drawer';
import { usePullRequestDetail } from '../../../hooks/use-pull-requests';
import { PullRequestTabs } from '../../../components/pull-requests/PullRequestTabs';
import { LoadingState } from '../../../components/common/LoadingState';
import { ErrorState } from '../../../components/common/ErrorState';
import { 
  GitPullRequest, 
  ArrowLeft, 
  ExternalLink, 
  ShieldCheck, 
  GitMerge, 
  Clock, 
  XCircle,
  FolderKanban,
  GitBranch,
  CheckCircle2,
  FileCode,
  GitCommit,
  AlertTriangle,
  MessageSquare
} from 'lucide-react';

export default function PullRequestDetailPage({ params }: { params: { pullRequestId: string } }) {
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);

  const { pullRequestDetail, isLoading, isError, refetch } = usePullRequestDetail(params.pullRequestId);

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col min-w-0 bg-slate-950 text-slate-100 min-h-screen">
        <Header onOpenAIChat={() => setIsAIChatOpen(true)} />
        <main className="flex-1 p-6 max-w-7xl w-full mx-auto flex items-center justify-center">
          <LoadingState message="Fetching pull request code diff and telemetry..." />
        </main>
      </div>
    );
  }

  if (isError || !pullRequestDetail) {
    return (
      <div className="flex-1 flex flex-col min-w-0 bg-slate-950 text-slate-100 min-h-screen">
        <Header onOpenAIChat={() => setIsAIChatOpen(true)} />
        <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
          <Link href="/pull-requests" className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-slate-200">
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Pull Requests</span>
          </Link>
          <ErrorState
            title="Failed to Load Pull Request"
            message="Could not find or retrieve telemetry for the requested pull request."
            onRetry={() => refetch()}
          />
        </main>
      </div>
    );
  }

  const { pullRequest } = pullRequestDetail;

  const formattedCreated = new Date(pullRequest.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const formattedMerged = pullRequest.mergedAt
    ? new Date(pullRequest.mergedAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  const getStatusBadge = (state: string) => {
    switch (state) {
      case 'MERGED':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <GitMerge className="w-4 h-4" /> Merged
          </span>
        );
      case 'OPEN':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Clock className="w-4 h-4" /> Open
          </span>
        );
      case 'CLOSED':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <XCircle className="w-4 h-4" /> Closed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-slate-500/10 text-slate-400 border border-slate-500/20">
            {state}
          </span>
        );
    }
  };

  const getReviewBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" /> Approved
          </span>
        );
      case 'CHANGES_REQUESTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <AlertTriangle className="w-3.5 h-3.5" /> Changes Requested
          </span>
        );
      case 'COMMENTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <MessageSquare className="w-3.5 h-3.5" /> Commented
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-bold bg-slate-800 text-slate-400 border border-slate-700">
            Pending Review
          </span>
        );
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-slate-950 text-slate-100 min-h-screen">
      <Header onOpenAIChat={() => setIsAIChatOpen(true)} />

      <main className="flex-1 p-6 space-y-6 max-w-7xl w-full mx-auto">
        {/* Navigation Breadcrumb */}
        <Link 
          href="/pull-requests" 
          className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-blue-400 transition-colors font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Pull Requests</span>
        </Link>

        {/* PR Detail Banner */}
        <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-mono font-bold text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-lg border border-amber-500/20 text-sm">
                #{pullRequest.number}
              </span>
              <h1 className="text-xl font-bold text-white tracking-tight">{pullRequest.title}</h1>
              {getStatusBadge(pullRequest.state)}
              {getReviewBadge(pullRequest.reviewStatus || 'PENDING')}
            </div>

            {/* Author & Repo Metadata */}
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <img
                  src={pullRequest.author?.avatarUrl || 'https://github.com/github.png'}
                  alt={pullRequest.author?.login || 'Author'}
                  className="w-5 h-5 rounded-full border border-slate-700 object-cover"
                />
                <span className="text-slate-200 font-semibold">@{pullRequest.author?.login || 'author'}</span>
              </div>
              <span>•</span>
              <span className="font-mono text-slate-300 flex items-center gap-1">
                <GitBranch className="w-3.5 h-3.5 text-indigo-400" /> {pullRequest.repository?.fullName}
              </span>
              {pullRequest.project && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1 text-blue-400">
                    <FolderKanban className="w-3.5 h-3.5" /> {pullRequest.project.name}
                  </span>
                </>
              )}
            </div>

            {/* Branch target & Dates */}
            <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-400 pt-1">
              <div className="font-mono bg-slate-950 px-2.5 py-1 rounded-md border border-slate-800 text-slate-300">
                <span className="text-slate-500">wants to merge into </span>
                <span className="text-emerald-400 font-bold">{pullRequest.targetBranch || 'main'}</span>
                <span className="text-slate-500"> from </span>
                <span className="text-blue-400 font-bold">{pullRequest.sourceBranch || 'feature-branch'}</span>
              </div>
              <span>Created: {formattedCreated}</span>
              {formattedMerged && <span className="text-purple-400 font-medium">Merged: {formattedMerged}</span>}
            </div>
          </div>

          {/* Action Links */}
          <div className="flex items-center gap-3 shrink-0">
            <a
              href={`https://github.com/${pullRequest.repository?.fullName || 'BetopiaLtd/beyondAI-backend'}/pull/${pullRequest.number}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl transition-all shadow-md shadow-blue-900/20"
            >
              <span>View on GitHub</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* PR Metrics Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-400 font-medium">Commits</span>
              <p className="text-xl font-bold text-white mt-0.5">{pullRequest.commitsCount || 1}</p>
            </div>
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <GitCommit className="w-4 h-4" />
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-400 font-medium">Files Changed</span>
              <p className="text-xl font-bold text-white mt-0.5">{pullRequest.changedFiles}</p>
            </div>
            <div className="w-9 h-9 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
              <FileCode className="w-4 h-4" />
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-400 font-medium">Lines Added</span>
              <p className="text-xl font-bold text-emerald-400 mt-0.5">+{pullRequest.additions}</p>
            </div>
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <FileCode className="w-4 h-4" />
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-400 font-medium">Lines Deleted</span>
              <p className="text-xl font-bold text-rose-400 mt-0.5">-{pullRequest.deletions}</p>
            </div>
            <div className="w-9 h-9 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center border border-rose-500/20">
              <FileCode className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Tabbed Detail Modules */}
        <PullRequestTabs detail={pullRequestDetail} />
      </main>

      <ChatDrawer isOpen={isAIChatOpen} onClose={() => setIsAIChatOpen(false)} />
    </div>
  );
}
