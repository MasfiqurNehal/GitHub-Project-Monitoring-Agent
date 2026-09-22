'use client';

import { GitBranch } from 'lucide-react';
import { Repository } from '../../types';

interface RepositoryFilterProps {
  repositories: Repository[];
  value?: string;
  onChange: (repositoryId?: string) => void;
  disabled?: boolean;
}

export function RepositoryFilter({ repositories, value, onChange, disabled }: RepositoryFilterProps) {
  return (
    <div className="relative flex items-center">
      <GitBranch className="w-3.5 h-3.5 text-indigo-400 absolute left-3 pointer-events-none" />
      <select
        value={value || ''}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value || undefined)}
        className="bg-slate-800/90 text-slate-200 text-xs rounded-xl pl-8 pr-8 py-2 border border-slate-700/80 outline-none focus:border-indigo-500 transition-colors cursor-pointer disabled:opacity-50 appearance-none font-medium max-w-[180px] truncate"
      >
        <option value="">All Repositories</option>
        {repositories.map((r) => (
          <option key={r.id} value={r.id}>
            {r.name || r.fullName}
          </option>
        ))}
      </select>
      <div className="absolute right-3 pointer-events-none text-slate-400 text-[10px]">▼</div>
    </div>
  );
}
