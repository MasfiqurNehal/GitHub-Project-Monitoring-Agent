import { Users } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { DeveloperContributionItem } from '../../types';

interface DeveloperActivityChartProps {
  data: DeveloperContributionItem[];
}

export function DeveloperActivityChart({ data }: DeveloperActivityChartProps) {
  return (
    <div className="bg-slate-900/70 border border-slate-800 p-5 rounded-2xl shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-400" /> Developer Activity Distribution
          </h3>
          <p className="text-[11px] text-slate-400">Commits, PRs, and reviews by team member</p>
        </div>
      </div>

      <div className="h-60 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="login" stroke="#64748b" fontSize={11} tickLine={false} />
            <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
            <Tooltip
              contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
            />
            <Bar dataKey="commits" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Commits" />
            <Bar dataKey="prs" fill="#a855f7" radius={[4, 4, 0, 0]} name="PRs" />
            <Bar dataKey="reviews" fill="#6366f1" radius={[4, 4, 0, 0]} name="Reviews" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
