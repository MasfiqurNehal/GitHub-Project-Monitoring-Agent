import { Code2 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { CodeChangeTrendItem } from '../../types';

interface CodeChangeChartProps {
  data: CodeChangeTrendItem[];
}

export function CodeChangeChart({ data }: CodeChangeChartProps) {
  return (
    <div className="bg-slate-900/70 border border-slate-800 p-5 rounded-2xl shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Code2 className="w-4 h-4 text-emerald-400" /> Code Changes (Additions vs Deletions)
          </h3>
          <p className="text-[11px] text-slate-400">Lines of code added and deleted over time</p>
        </div>
      </div>

      <div role="img" aria-label="Code changes chart showing additions vs deletions over time" className="h-60 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="addGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="delGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} />
            <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
            <Tooltip
              contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
            />
            <Area type="monotone" dataKey="additions" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#addGrad)" name="Lines Added (+)" />
            <Area type="monotone" dataKey="deletions" stroke="#f43f5e" strokeWidth={2} fillOpacity={1} fill="url(#delGrad)" name="Lines Deleted (-)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
