import { TrendingUp } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { ActivityTrendItem } from '../../types';

interface ActivityTrendChartProps {
  data: ActivityTrendItem[];
}

export function ActivityTrendChart({ data }: ActivityTrendChartProps) {
  return (
    <div className="bg-slate-900/70 border border-slate-800 p-6 rounded-2xl shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-400" /> Activity Stream Trends
          </h2>
          <p className="text-xs text-slate-400">Daily commits, pull requests, and peer reviews</p>
        </div>
      </div>

      <div role="img" aria-label="Activity Stream Trends chart showing daily commits and pull requests" className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="commitsGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="prsGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} />
            <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
            <Tooltip
              contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
            />
            <Area type="monotone" dataKey="commits" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#commitsGrad)" name="Commits" />
            <Area type="monotone" dataKey="prs" stroke="#a855f7" strokeWidth={2} fillOpacity={1} fill="url(#prsGrad)" name="Pull Requests" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
