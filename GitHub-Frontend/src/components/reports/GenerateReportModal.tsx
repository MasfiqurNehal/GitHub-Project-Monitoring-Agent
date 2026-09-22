'use client';

import React, { useState } from 'react';
import { Project, Repository, Developer, ReportPeriodType } from '../../types';
import { 
  X, 
  FileText, 
  Calendar, 
  FolderKanban, 
  GitBranch, 
  User, 
  Sparkles, 
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { sendTelemetryLog } from '../../lib/telemetry';

interface GenerateReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: Project[];
  repositories: Repository[];
  developers: Developer[];
  onReportGenerated: (newReportTitle: string) => void;
}

export function GenerateReportModal({
  isOpen,
  onClose,
  projects,
  repositories,
  developers,
  onReportGenerated,
}: GenerateReportModalProps) {
  const [periodType, setPeriodType] = useState<ReportPeriodType>('WEEKLY');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedRepositoryId, setSelectedRepositoryId] = useState<string>('');
  const [selectedDeveloperId, setSelectedDeveloperId] = useState<string>('');
  const [fromDate, setFromDate] = useState<string>('2026-09-15');
  const [toDate, setToDate] = useState<string>('2026-09-22');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!isOpen) return null;

  const handleGenerate = () => {
    sendTelemetryLog(`Submitted report generation form (Period: ${periodType})`, 'REPORT_GENERATE', {
      periodType,
      selectedProjectId,
      selectedRepositoryId,
      selectedDeveloperId,
    });
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        const reportTitle = `${periodType} Engineering Digest — ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
        onReportGenerated(reportTitle);
        onClose();
      }, 1200);
    }, 1500);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="generate-report-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in"
    >
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-6 relative overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 id="generate-report-modal-title" className="text-base font-bold text-white tracking-tight">
                Generate Engineering Report
              </h2>
              <p className="text-slate-400 text-xs">Configure metrics telemetry scope & report period</p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close generate report dialog"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <div className="space-y-4 text-xs">
          {/* Period Type Selection */}
          <div className="space-y-2">
            <label className="text-slate-300 font-semibold flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-amber-400" /> Report Period
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(['DAILY', 'WEEKLY', 'MONTHLY', 'CUSTOM'] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setPeriodType(type)}
                  className={`py-2 px-3 rounded-xl font-bold transition-all text-center border ${
                    periodType === type
                      ? 'bg-amber-600 text-white border-amber-500 shadow-sm'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Date Range (if CUSTOM selected) */}
          {periodType === 'CUSTOM' && (
            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-950 border border-slate-800 rounded-xl">
              <div>
                <label className="text-slate-400 font-medium block mb-1">From Date</label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="text-slate-400 font-medium block mb-1">To Date</label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          )}

          {/* Project Filter */}
          <div className="space-y-1.5">
            <label className="text-slate-300 font-semibold flex items-center gap-1.5">
              <FolderKanban className="w-3.5 h-3.5 text-blue-400" /> Filter by Project (Optional)
            </label>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
            >
              <option value="">All Projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Repository Filter */}
          <div className="space-y-1.5">
            <label className="text-slate-300 font-semibold flex items-center gap-1.5">
              <GitBranch className="w-3.5 h-3.5 text-indigo-400" /> Filter by Repository (Optional)
            </label>
            <select
              value={selectedRepositoryId}
              onChange={(e) => setSelectedRepositoryId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
            >
              <option value="">All Monitored Repositories</option>
              {repositories.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.fullName}
                </option>
              ))}
            </select>
          </div>

          {/* Developer Filter */}
          <div className="space-y-1.5">
            <label className="text-slate-300 font-semibold flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-emerald-400" /> Filter by Developer (Optional)
            </label>
            <select
              value={selectedDeveloperId}
              onChange={(e) => setSelectedDeveloperId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
            >
              <option value="">All Engineers</option>
              {developers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name || d.login} (@{d.login})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isGenerating}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleGenerate}
            disabled={isGenerating || isSuccess}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-lg shadow-amber-600/20 disabled:opacity-50 transition-all"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Compiling Telemetry...</span>
              </>
            ) : isSuccess ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Report Ready!</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Generate Report</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
