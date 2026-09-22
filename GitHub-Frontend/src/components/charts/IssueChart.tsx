import { AlertCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { IssueTrendItem } from '../../types';

interface IssueChartProps {
  data: IssueTrendItem[];
}

export function IssueChart({ data }: IssueChartProps) {
  return (
    <div className="bg-slate-900/70 border border-slate-800 p-5 rounded-2xl shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400" /> Issue Activity
          </h3>
          <p className="text-[11px] text-slate-400">Opened vs resolved issue volume</p>
        </div>
      </div>

      <div role="img" aria-label="Issue activity chart showing opened vs resolved issue volume" className="h-60 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} />
            <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
            <Tooltip
              contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
            />
            <Bar dataKey="opened" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Issues Opened" />
            <Bar dataKey="closed" fill="#10b981" radius={[4, 4, 0, 0]} name="Issues Closed" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
