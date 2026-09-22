'use client';

import { useState } from 'react';
import { useLayout } from '../../providers/layout-provider';
import { Breadcrumbs } from './breadcrumbs';
import { Calendar, Sparkles, Menu, ShieldCheck } from 'lucide-react';

interface HeaderProps {
  onOpenAIChat?: () => void;
  onFilterChange?: (preset: string) => void;
}

export default function Header({ onOpenAIChat, onFilterChange }: HeaderProps) {
  const [selectedRange, setSelectedRange] = useState('7d');
  const { toggleMobileMenu, setAIChatOpen } = useLayout();

  const handleRangeSelect = (preset: string) => {
    setSelectedRange(preset);
    if (onFilterChange) onFilterChange(preset);
  };

  const handleOpenAIChat = () => {
    if (onOpenAIChat) {
      onOpenAIChat();
    } else {
      setAIChatOpen(true);
    }
  };

  return (
    <header className="h-16 border-b border-slate-800 bg-slate-900/60 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Left Navigation & Breadcrumbs */}
      <div className="flex items-center space-x-3 min-w-0">
        <button
          onClick={toggleMobileMenu}
          className="lg:hidden p-2 rounded-xl bg-slate-800/80 text-slate-300 hover:text-white border border-slate-700/60 transition-colors shrink-0"
          title="Open Mobile Navigation"
        >
          <Menu className="w-4 h-4" />
        </button>

        <div className="hidden sm:block min-w-0">
          <Breadcrumbs />
        </div>
      </div>

      {/* Right Controls & User Indicator */}
      <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
        {/* Range Filter Buttons */}
        <div className="hidden md:flex items-center space-x-2 text-slate-300 text-xs font-medium">
          <Calendar className="w-3.5 h-3.5 text-blue-400" />
          <span>Range:</span>
          <div className="flex items-center bg-slate-800/80 rounded-lg p-1 border border-slate-700/60 text-xs">
            {[
              { id: '1d', label: 'Today' },
              { id: '7d', label: '7D' },
              { id: '30d', label: '30D' },
              { id: 'all', label: 'All' },
            ].map((preset) => (
              <button
                key={preset.id}
                onClick={() => handleRangeSelect(preset.id)}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
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

        {/* Live Webhook Status Badge */}
        <div className="hidden xl:flex items-center space-x-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full text-[11px] font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>Webhooks Active</span>
        </div>

        {/* CTO Console Indicator */}
        <div className="flex items-center space-x-2 px-2.5 py-1 bg-slate-800/80 border border-slate-700/60 rounded-xl text-xs font-medium text-slate-300">
          <div className="w-5 h-5 rounded-full bg-indigo-600/30 text-indigo-400 flex items-center justify-center font-bold text-[10px] border border-indigo-500/30">
            CTO
          </div>
          <span className="hidden sm:inline text-[11px]">Console</span>
        </div>

        {/* AI Agent Trigger Button */}
        <button
          onClick={handleOpenAIChat}
          className="flex items-center space-x-2 px-3 sm:px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium text-xs rounded-lg shadow-md shadow-blue-500/20 transition-all active:scale-95"
        >
          <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
          <span className="hidden xs:inline">Ask AI</span>
        </button>
      </div>
    </header>
  );
}
