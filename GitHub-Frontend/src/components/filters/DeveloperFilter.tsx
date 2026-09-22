'use client';

import { Users } from 'lucide-react';
import { Developer } from '../../types';

interface DeveloperFilterProps {
  developers: Developer[];
  value?: string;
  onChange: (developerId?: string) => void;
  disabled?: boolean;
}

export function DeveloperFilter({ developers, value, onChange, disabled }: DeveloperFilterProps) {
  return (
    <div className="relative flex items-center">
      <Users className="w-3.5 h-3.5 text-purple-400 absolute left-3 pointer-events-none" />
      <select
        value={value || ''}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value || undefined)}
        className="bg-slate-800/90 text-slate-200 text-xs rounded-xl pl-8 pr-8 py-2 border border-slate-700/80 outline-none focus:border-purple-500 transition-colors cursor-pointer disabled:opacity-50 appearance-none font-medium max-w-[170px] truncate"
      >
        <option value="">All Developers</option>
        {developers.map((d) => (
          <option key={d.id} value={d.id}>
            @{d.login}
          </option>
        ))}
      </select>
      <div className="absolute right-3 pointer-events-none text-slate-400 text-[10px]">▼</div>
    </div>
  );
}
