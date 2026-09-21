'use client';

import { useState } from 'react';
import { Calendar, Sparkles, RefreshCw, Layers } from 'lucide-react';

interface HeaderProps {
  onOpenAIChat?: () => void;
  onFilterChange?: (preset: string) => void;
}

export default function Header({ onOpenAIChat, onFilterChange }: HeaderProps) {
  const [selectedRange, setSelectedRange] = useState('7d');

  const handleRangeSelect = (preset: string) => {
    setSelectedRange(preset);
    if (onFilterChange) onFilterChange(preset);
  };

  return (
    <header className="h-16 border-b border-slate-800 bg-slate-900/60 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2 text-slate-300 text-sm font-medium">
          <Calendar className="w-4 h-4 text-blue-400" />
          <span>Range:</span>
        </div>

        {/* Range Buttons */}
        <div className="flex items-center bg-slate-800/80 rounded-lg p-1 border border-slate-700/60 text-xs">
          {[
            { id: '1d', label: 'Today' },
            { id: '7d', label: 'Last 7 Days' },
            { id: '30d', label: 'Last 30 Days' },
            { id: 'all', label: 'All Time' },
          ].map((preset) => (
            <button
              key={preset.id}
              onClick={() => handleRangeSelect(preset.id)}
              className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                selectedRange === preset.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center space-x-3">
        {/* Status Indicator */}
        <div className="flex items-center space-x-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full text-xs font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>Live Webhooks Active</span>
        </div>

        {/* AI Agent Drawer Trigger */}
        <button
          onClick={onOpenAIChat}
          className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium text-xs rounded-lg shadow-md shadow-blue-500/20 transition-all active:scale-95"
        >
          <Sparkles className="w-4 h-4 text-yellow-300" />
          <span>Ask Monitoring AI</span>
        </button>
      </div>
    </header>
  );
}
