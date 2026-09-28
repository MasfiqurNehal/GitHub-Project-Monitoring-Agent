'use client';

import React from 'react';
import { CodeChangeTrendItem, FileChangeItem } from '../../types';
import { CodeChangeChart } from '../charts/CodeChangeChart';
import { FileCode, Plus, Minus, FileText } from 'lucide-react';

interface ProjectCodeChangesTabProps {
  codeChanges: {
    trend: CodeChangeTrendItem[];
    totalAdditions: number;
    totalDeletions: number;
    netChanges: number;
    topFilesChanged: FileChangeItem[];
  };
}

export function ProjectCodeChangesTab({ codeChanges }: ProjectCodeChangesTabProps) {
  const { trend, totalAdditions, totalDeletions, netChanges, topFilesChanged } = codeChanges;

  return (
    <div className="space-y-6">
      {/* Code Impact Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-medium">Total Lines Added</span>
            <p className="text-xl font-bold text-emerald-400 mt-1">+{totalAdditions.toLocaleString()}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
            <Plus className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-medium">Total Lines Deleted</span>
            <p className="text-xl font-bold text-rose-400 mt-1">-{totalDeletions.toLocaleString()}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center border border-rose-500/20">
            <Minus className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-medium">Net Code Churn</span>
            <p className={`text-xl font-bold mt-1 ${netChanges >= 0 ? 'text-blue-400' : 'text-amber-400'}`}>
              {netChanges >= 0 ? `+${netChanges.toLocaleString()}` : netChanges.toLocaleString()}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
            <FileCode className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Code Change Trend Chart */}
      <CodeChangeChart data={trend} />

      {/* Top Files Modified */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <FileText className="w-4 h-4 text-cyan-400" /> Hotspot Files (Most Modified)
        </h3>

        <div className="space-y-3">
          {topFilesChanged.length === 0 ? (
            <p className="text-slate-400 text-xs text-center py-6 italic">No file-level diff changes recorded for this project in the selected time period.</p>
          ) : (
            topFilesChanged.map((file, idx) => (
              <div key={idx} className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800/80 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <FileCode className="w-4 h-4 text-blue-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-mono font-bold text-slate-200 truncate">{file.name}</p>
                    <span className="text-[10px] text-slate-400">{file.repoName}</span>
                  </div>
                </div>
                <div className="font-mono text-xs font-semibold shrink-0">
                  <span className="text-emerald-400">+{file.additions}</span>{' '}
                  <span className="text-rose-400">-{file.deletions}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
