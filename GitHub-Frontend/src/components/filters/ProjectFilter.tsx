'use client';

import { FolderKanban } from 'lucide-react';
import { Project } from '../../types';

interface ProjectFilterProps {
  projects: Project[];
  value?: string;
  onChange: (projectId?: string) => void;
  disabled?: boolean;
}

export function ProjectFilter({ projects, value, onChange, disabled }: ProjectFilterProps) {
  return (
    <div className="relative flex items-center">
      <FolderKanban className="w-3.5 h-3.5 text-blue-400 absolute left-3 pointer-events-none" />
      <select
        value={value || ''}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value || undefined)}
        className="bg-slate-800/90 text-slate-200 text-xs rounded-xl pl-8 pr-8 py-2 border border-slate-700/80 outline-none focus:border-blue-500 transition-colors cursor-pointer disabled:opacity-50 appearance-none font-medium"
      >
        <option value="">All Projects</option>
        {projects.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
      <div className="absolute right-3 pointer-events-none text-slate-400 text-[10px]">▼</div>
    </div>
  );
}
