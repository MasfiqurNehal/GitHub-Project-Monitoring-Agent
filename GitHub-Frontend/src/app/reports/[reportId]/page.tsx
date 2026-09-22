'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Header from '../../../components/layout/header';
import ChatDrawer from '../../../components/ai/chat-drawer';
import { useReportDetail } from '../../../hooks/use-reports';
import { ReportCharts } from '../../../components/reports/ReportCharts';
import { LoadingState } from '../../../components/common/LoadingState';
import { ErrorState } from '../../../components/common/ErrorState';
import { 
  FileText, 
  ArrowLeft, 
  Download, 
  Calendar, 
  User, 
  CheckCircle2, 
  FolderKanban, 
  GitBranch, 
  GitCommit, 
  GitPullRequest, 
  CircleDot, 
  FileCode, 
  ShieldCheck, 
  TrendingUp, 
  Clock, 
  Users,
  Award
} from 'lucide-react';

interface ReportDetailPageProps {
  params: {
    reportId: string;
  };
}

export default function ReportDetailPage({ params }: ReportDetailPageProps) {
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const { reportDetail, isLoading, isError, refetch } = useReportDetail(params.reportId);

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col min-w-0 bg-slate-950 text-slate-100 min-h-screen">
        <Header onOpenAIChat={() => setIsAIChatOpen(true)} />
        <main className="flex-1 p-6 max-w-7xl w-full mx-auto flex items-center justify-center">
          <LoadingState message="Compiling executive report telemetry, project charts, and developer velocity metrics..." />
        </main>
      </div>
    );
  }

  if (isError || !reportDetail) {
    return (
      <div className="flex-1 flex flex-col min-w-0 bg-slate-950 text-slate-100 min-h-screen">
        <Header onOpenAIChat={() => setIsAIChatOpen(true)} />
        <main className="flex-1 p-6 max-w-7xl w-full mx-auto flex items-center justify-center">
          <ErrorState
            title="Report Not Found"
            message={`Could not load report with ID: ${params.reportId}`}
            onRetry={() => refetch()}
          />
        </main>
      </div>
    );
  }

  const {
    meta,
    executiveSummary,
    projectActivity,
    repositoryActivity,
    developerActivity,
    commitSummary,
    prSummary,
    issueSummary,
    codeChangeSummary,
    activityTrend,
    codeChangeTrend,
    activityTimeline,
  } = reportDetail;

  const handleDownload = () => {
    setIsDownloading(true);
    const reportJSON = JSON.stringify(reportDetail, null, 2);
    const blob = new Blob([reportJSON], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${meta.id}-full-engineering-report.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setTimeout(() => {
      setIsDownloading(false);
    }, 1000);
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-slate-950 text-slate-100 min-h-screen">
      <Header onOpenAIChat={() => setIsAIChatOpen(true)} />

      <main className="flex-1 p-6 space-y-8 max-w-7xl w-full mx-auto">
        {/* Top Navigation & Action Controls */}
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/reports"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to All Reports
          </Link>

          <div className="flex items-center gap-3">
            <div className="hidden sm:inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Read-Only Executive Report</span>
            </div>

            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold shadow-md shadow-amber-600/20 transition-all"
            >
              {isDownloading ? <CheckCircle2 className="w-4 h-4 text-emerald-300" /> : <Download className="w-4 h-4" />}
              <span>Download Report</span>
            </button>
          </div>
        </div>

        {/* Report Banner Header */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase tracking-wider">
                  {meta.periodType} REPORT
                </span>
                <span className="text-xs text-slate-400">
                  {meta.fromDate} to {meta.toDate}
                </span>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                {meta.title}
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-3 border-t border-slate-800/80">
            <div className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-slate-500" />
              <span>Generated by <span className="font-semibold text-slate-200">{meta.generatedBy.name}</span> ({meta.generatedBy.role})</span>
            </div>
            <span>•</span>
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span>Issued on {new Date(meta.generatedAt).toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* 1. EXECUTIVE SUMMARY SECTION */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-400" /> Executive Summary
          </h2>

          <div className="p-4 bg-slate-950 border border-slate-800/80 rounded-xl space-y-3">
            <p className="text-sm font-semibold text-slate-100 leading-relaxed">
              "{executiveSummary.headline}"
            </p>

            <div className="space-y-1.5 pt-2 border-t border-slate-800/60 text-xs">
              <span className="text-slate-400 font-semibold block uppercase text-[10px]">Key Takeaways & Telemetry Insights:</span>
              <ul className="space-y-1 text-slate-300">
                {executiveSummary.keyTakeaways.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-amber-400 font-bold">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* KPI Cards Grid */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-center space-y-1">
              <span className="text-[10px] text-slate-400 font-semibold uppercase block">Total Commits</span>
              <span className="text-xl font-bold text-blue-400">{executiveSummary.totalCommits}</span>
            </div>
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-center space-y-1">
              <span className="text-[10px] text-slate-400 font-semibold uppercase block">Total PRs</span>
              <span className="text-xl font-bold text-amber-400">{executiveSummary.totalPRs}</span>
            </div>
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-center space-y-1">
              <span className="text-[10px] text-slate-400 font-semibold uppercase block">PRs Merged</span>
              <span className="text-xl font-bold text-purple-400">{executiveSummary.mergedPRs}</span>
            </div>
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-center space-y-1">
              <span className="text-[10px] text-slate-400 font-semibold uppercase block">Issues Closed</span>
              <span className="text-xl font-bold text-emerald-400">{executiveSummary.issuesClosed}</span>
            </div>
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-center space-y-1">
              <span className="text-[10px] text-slate-400 font-semibold uppercase block">Net Code Lines</span>
              <span className="text-xl font-bold text-emerald-400">+{executiveSummary.netCodeChanges.toLocaleString()}</span>
            </div>
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-center space-y-1">
              <span className="text-[10px] text-slate-400 font-semibold uppercase block">Engineers</span>
              <span className="text-xl font-bold text-slate-100">{executiveSummary.activeDevelopersCount}</span>
            </div>
          </div>
        </div>

        {/* 2. CHARTS SECTION */}
        <ReportCharts activityTrend={activityTrend} codeChangeTrend={codeChangeTrend} />

        {/* 3. PROJECT & REPOSITORY ACTIVITY SECTIONS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Project Activity Table */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <FolderKanban className="w-4 h-4 text-blue-400" /> Project Activity Breakdown
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3">Project</th>
                    <th className="py-2.5 px-3 text-center">Repos</th>
                    <th className="py-2.5 px-3 text-center">Commits</th>
                    <th className="py-2.5 px-3 text-center">PRs</th>
                    <th className="py-2.5 px-3 text-right">Lines Changed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {projectActivity.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-800/40">
                      <td className="py-2.5 px-3 font-semibold text-slate-200">{p.name}</td>
                      <td className="py-2.5 px-3 text-center font-mono">{p.repositoriesCount}</td>
                      <td className="py-2.5 px-3 text-center font-mono">{p.commitsCount}</td>
                      <td className="py-2.5 px-3 text-center font-mono">{p.prsCount}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-emerald-400">+{p.linesChanged}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Repository Activity Table */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <GitBranch className="w-4 h-4 text-indigo-400" /> Repository Activity Breakdown
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3">Repository</th>
                    <th className="py-2.5 px-3 text-center">Commits</th>
                    <th className="py-2.5 px-3 text-center">PRs</th>
                    <th className="py-2.5 px-3 text-right">Additions / Deletions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {repositoryActivity.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-800/40">
                      <td className="py-2.5 px-3 font-mono font-semibold text-slate-200 truncate max-w-[180px]">
                        {r.fullName}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono">{r.commitsCount}</td>
                      <td className="py-2.5 px-3 text-center font-mono">{r.prsCount}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-[11px]">
                        <span className="text-emerald-400">+{r.linesAdded}</span>{' '}
                        <span className="text-rose-400">-{r.linesDeleted}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* 4. DEVELOPER ACTIVITY SECTION */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-400" /> Developer Activity Matrix
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                <tr>
                  <th className="py-3 px-4">Engineer</th>
                  <th className="py-3 px-4 text-center">Commits</th>
                  <th className="py-3 px-4 text-center">PRs Authored</th>
                  <th className="py-3 px-4 text-center">PR Reviews</th>
                  <th className="py-3 px-4 text-center">Additions</th>
                  <th className="py-3 px-4 text-center">Deletions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {developerActivity.map((dev) => (
                  <tr key={dev.id} className="hover:bg-slate-800/40">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <img
                          src={dev.avatarUrl || 'https://github.com/github.png'}
                          alt={dev.login}
                          className="w-6 h-6 rounded-full border border-slate-700"
                        />
                        <div>
                          <span className="font-semibold text-slate-100">{dev.name}</span>
                          <span className="text-slate-400 text-[11px] block">@{dev.login}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center font-mono text-slate-200 font-semibold">{dev.commits}</td>
                    <td className="py-3 px-4 text-center font-mono text-slate-200 font-semibold">{dev.prs}</td>
                    <td className="py-3 px-4 text-center font-mono text-slate-200 font-semibold">{dev.reviews}</td>
                    <td className="py-3 px-4 text-center font-mono text-emerald-400">+{dev.linesAdded}</td>
                    <td className="py-3 px-4 text-center font-mono text-rose-400">-{dev.linesDeleted}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 5. METRIC SUMMARIES GRID (Commits, PRs, Issues, Code Changes) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Commit Summary Card */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <GitCommit className="w-4 h-4 text-blue-400" /> Commit Summary
            </h4>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Total Commits:</span>
                <span className="font-mono font-bold text-slate-100">{commitSummary.totalCommits}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Avg Commits / Day:</span>
                <span className="font-mono font-bold text-slate-100">{commitSummary.avgCommitsPerDay}</span>
              </div>
              <div className="pt-2 border-t border-slate-800/80 space-y-1">
                <span className="text-[10px] text-slate-500 uppercase font-semibold">Top Committers:</span>
                {commitSummary.topCommitters.map((c, i) => (
                  <div key={i} className="flex justify-between text-[11px]">
                    <span className="text-slate-300">@{c.login}</span>
                    <span className="font-mono font-semibold text-blue-400">{c.count} commits</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* PR Summary Card */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <GitPullRequest className="w-4 h-4 text-amber-400" /> PR Summary
            </h4>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Opened PRs:</span>
                <span className="font-mono font-bold text-slate-100">{prSummary.totalOpened}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Merged PRs:</span>
                <span className="font-mono font-bold text-purple-400">{prSummary.totalMerged}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Closed PRs:</span>
                <span className="font-mono font-bold text-rose-400">{prSummary.totalClosed}</span>
              </div>
              <div className="pt-2 border-t border-slate-800/80 flex justify-between">
                <span className="text-slate-400">Avg Review Latency:</span>
                <span className="font-mono font-bold text-amber-400">{prSummary.avgMergeTimeHours} hrs</span>
              </div>
            </div>
          </div>

          {/* Issue Summary Card */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <CircleDot className="w-4 h-4 text-emerald-400" /> Issue Summary
            </h4>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Issues Opened:</span>
                <span className="font-mono font-bold text-slate-100">{issueSummary.totalOpened}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Issues Closed:</span>
                <span className="font-mono font-bold text-emerald-400">{issueSummary.totalClosed}</span>
              </div>
              <div className="pt-2 border-t border-slate-800/80 flex justify-between">
                <span className="text-slate-400">Resolution Rate:</span>
                <span className="font-mono font-bold text-emerald-400">{issueSummary.resolutionRatePercent}%</span>
              </div>
            </div>
          </div>

          {/* Code Change Summary Card */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <FileCode className="w-4 h-4 text-purple-400" /> Code Changes
            </h4>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Total Additions:</span>
                <span className="font-mono font-bold text-emerald-400">+{codeChangeSummary.totalAdditions.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Total Deletions:</span>
                <span className="font-mono font-bold text-rose-400">-{codeChangeSummary.totalDeletions.toLocaleString()}</span>
              </div>
              <div className="pt-2 border-t border-slate-800/80 flex justify-between">
                <span className="text-slate-400">Net Line Changes:</span>
                <span className="font-mono font-bold text-purple-400">+{codeChangeSummary.netChanges.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 6. ACTIVITY TIMELINE SECTION */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400" /> Report Timeline Events
          </h3>

          <div className="space-y-4 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-slate-800">
            {activityTimeline.map((evt) => (
              <div key={evt.id} className="relative flex items-start gap-4 pl-8">
                <div className="absolute left-1.5 top-1 w-5 h-5 rounded-full bg-slate-900 border border-amber-500 flex items-center justify-center text-amber-400 shadow-sm">
                  <Clock className="w-3 h-3" />
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex-1 flex flex-col md:flex-row md:items-center justify-between gap-2 text-xs">
                  <div>
                    <span className="font-bold text-slate-100">{evt.title}</span>
                    <span className="text-slate-400 text-[11px] block font-mono">{evt.repoName}</span>
                  </div>

                  <div className="flex items-center gap-3">
                    {evt.additions !== undefined && (
                      <span className="font-mono text-[11px]">
                        <span className="text-emerald-400">+{evt.additions}</span>{' '}
                        <span className="text-rose-400">-{evt.deletions}</span>
                      </span>
                    )}
                    <span className="text-slate-500 text-[11px]">{evt.displayDate} {evt.time}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      <ChatDrawer isOpen={isAIChatOpen} onClose={() => setIsAIChatOpen(false)} />
    </div>
  );
}
