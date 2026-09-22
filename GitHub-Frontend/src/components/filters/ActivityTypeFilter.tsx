'use client';

import { Activity } from 'lucide-react';
import { ActivityTypeOption } from '../../types';

interface ActivityTypeFilterProps {
  value?: ActivityTypeOption;
  onChange: (activityType?: ActivityTypeOption) => void;
  disabled?: boolean;
}

const activityOptions: { id: ActivityTypeOption; label: string }[] = [
  { id: 'all', label: 'All Activities' },
  { id: 'commit', label: 'Commits' },
  { id: 'push', label: 'Pushes' },
  { id: 'pull_request', label: 'Pull Requests' },
  { id: 'review', label: 'Code Reviews' },
  { id: 'issue', label: 'Issues' },
];

export function ActivityTypeFilter({ value = 'all', onChange, disabled }: ActivityTypeFilterProps) {
  return (
    <div className="relative flex items-center">
      <Activity className="w-3.5 h-3.5 text-emerald-400 absolute left-3 pointer-events-none" />
      <select
        value={value || 'all'}
        disabled={disabled}
        onChange={(e) => {
          const val = e.target.value as ActivityTypeOption;
          onChange(val === 'all' ? undefined : val);
        }}
        className="bg-slate-800/90 text-slate-200 text-xs rounded-xl pl-8 pr-8 py-2 border border-slate-700/80 outline-none focus:border-emerald-500 transition-colors cursor-pointer disabled:opacity-50 appearance-none font-medium"
      >
        {activityOptions.map((opt) => (
          <option key={opt.id} value={opt.id}>
            {opt.label}
          </option>
        ))}
      </select>
      <div className="absolute right-3 pointer-events-none text-slate-400 text-[10px]">▼</div>
    </div>
  );
}
