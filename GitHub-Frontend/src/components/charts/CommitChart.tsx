import { GitCommit } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface CommitChartProps {
  data: { date: string; commits: number }[];
}

export function CommitChart({ data }: CommitChartProps) {
  return (
    <div className="bg-slate-900/70 border border-slate-800 p-5 rounded-2xl shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <GitCommit className="w-4 h-4 text-emerald-400" /> Commit Activity
          </h3>
          <p className="text-[11px] text-slate-400">Daily commit push frequency</p>
        </div>
      </div>

      <div role="img" aria-label="Commit activity chart showing daily push frequency" className="h-60 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} />
            <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
            <Tooltip
              contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
            />
            <Bar dataKey="commits" fill="#10b981" radius={[6, 6, 0, 0]} name="Commits" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
