'use client';

import React, { useState } from 'react';
import { ActivityDistributionItem } from '../../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { Activity, BarChart2 } from 'lucide-react';

interface DeveloperContributionChartProps {
  data: ActivityDistributionItem[];
}

export function DeveloperContributionChart({ data }: DeveloperContributionChartProps) {
  const [viewFrequency, setViewFrequency] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  return (
    <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-purple-400" /> Factual Activity Patterns
          </h3>
          <p className="text-[11px] text-slate-400">Distribution of commits, pull requests, reviews, and issues over time</p>
        </div>

        {/* View Frequency Selector */}
        <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 p-1 rounded-xl text-xs self-start sm:self-auto">
          {(['daily', 'weekly', 'monthly'] as const).map((freq) => (
            <button
              key={freq}
              onClick={() => setViewFrequency(freq)}
              className={`px-2.5 py-1 rounded-lg capitalize text-[11px] font-medium transition-all ${
                viewFrequency === freq
                  ? 'bg-purple-600 text-white shadow-sm font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              {freq}
            </button>
          ))}
        </div>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} />
            <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
            <Tooltip
              contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
            />
            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
            <Bar dataKey="commits" fill="#10b981" radius={[4, 4, 0, 0]} name="Commits" />
            <Bar dataKey="prs" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Pull Requests" />
            <Bar dataKey="reviews" fill="#a855f7" radius={[4, 4, 0, 0]} name="Code Reviews" />
            <Bar dataKey="issues" fill="#f43f5e" radius={[4, 4, 0, 0]} name="Issues" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
