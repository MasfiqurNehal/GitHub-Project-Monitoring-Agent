import { GitPullRequest } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface PullRequestChartProps {
  data: { date: string; prs: number; reviews: number }[];
}

export function PullRequestChart({ data }: PullRequestChartProps) {
  return (
    <div className="bg-slate-900/70 border border-slate-800 p-5 rounded-2xl shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <GitPullRequest className="w-4 h-4 text-purple-400" /> Pull Request Velocity
          </h3>
          <p className="text-[11px] text-slate-400">PR creations vs peer code reviews</p>
        </div>
      </div>

      <div role="img" aria-label="Pull request velocity chart showing creations vs peer code reviews" className="h-60 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="prsGradOnly" x1="0" y1="0" x2="0" y2="1">
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
            <Area type="monotone" dataKey="prs" stroke="#a855f7" strokeWidth={2} fillOpacity={1} fill="url(#prsGradOnly)" name="Pull Requests" />
            <Area type="monotone" dataKey="reviews" stroke="#6366f1" strokeWidth={2} fillOpacity={0.2} fill="#6366f1" name="Reviews" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
