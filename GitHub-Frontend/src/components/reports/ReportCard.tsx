'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { EngineeringReportMeta } from '../../types';
import { 
  FileText, 
  Calendar, 
  ArrowRight, 
  Download, 
  CheckCircle2, 
  FolderKanban, 
  GitBranch, 
  User, 
  Clock 
} from 'lucide-react';

interface ReportCardProps {
  report: EngineeringReportMeta;
}

export function ReportCard({ report }: ReportCardProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  const getPeriodBadge = (period: string) => {
    switch (period) {
      case 'DAILY':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            Daily Digest
          </span>
        );
      case 'WEEKLY':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            Weekly Sprint
          </span>
        );
      case 'MONTHLY':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
            Monthly Audit
          </span>
        );
      case 'CUSTOM':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Custom Scope
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400">
            {period}
          </span>
        );
    }
  };

  const formattedGenerated = new Date(report.generatedAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const handleDownload = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDownloading(true);

    const reportJSON = JSON.stringify(report, null, 2);
    const blob = new Blob([reportJSON], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${report.id}-engineering-report.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setTimeout(() => {
      setIsDownloading(false);
    }, 1000);
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 shadow-xl transition-all duration-200 flex flex-col justify-between space-y-4">
      <div className="space-y-3">
        {/* Header Badges */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          {getPeriodBadge(report.periodType)}

          <div className="flex items-center gap-1 text-[11px] text-slate-400">
            <Clock className="w-3 h-3 text-slate-500" />
            <span>Generated {formattedGenerated}</span>
          </div>
        </div>

        {/* Title */}
        <Link
          href={`/reports/${report.id}`}
          className="font-bold text-slate-100 hover:text-amber-400 transition-colors text-base line-clamp-2 leading-snug"
        >
          {report.title}
        </Link>

        {/* Filter Badges attached */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          {report.projectName && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] text-blue-400 bg-blue-500/10 border border-blue-500/20">
              <FolderKanban className="w-2.5 h-2.5" />
              {report.projectName}
            </span>
          )}
          {report.repositoryName && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] text-indigo-400 bg-indigo-500/10 border border-indigo-500/20">
              <GitBranch className="w-2.5 h-2.5" />
              {report.repositoryName}
            </span>
          )}
          {report.developerName && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
              <User className="w-2.5 h-2.5" />
              {report.developerName}
            </span>
          )}
        </div>
      </div>

      {/* Footer Meta & Actions */}
      <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2 text-xs">
        <div className="text-slate-400 text-[11px]">
          By <span className="font-semibold text-slate-200">{report.generatedBy.name}</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Download Report Button */}
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            title="Download Report JSON"
            className="p-1.5 bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg border border-slate-800 transition-colors"
          >
            {isDownloading ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Download className="w-3.5 h-3.5" />}
          </button>

          {/* View Report Link */}
          <Link
            href={`/reports/${report.id}`}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-600/20 hover:bg-amber-600 text-amber-400 hover:text-white rounded-lg text-xs font-semibold border border-amber-500/30 transition-all"
          >
            <span>View</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
