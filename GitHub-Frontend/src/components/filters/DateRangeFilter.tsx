'use client';

import { useState } from 'react';
import { Calendar as CalendarIcon, Clock, ChevronDown } from 'lucide-react';
import { DateRangePreset } from '../../types';

interface DateRangeFilterProps {
  preset?: DateRangePreset;
  from?: string;
  to?: string;
  onPresetChange: (preset: DateRangePreset) => void;
  onCustomDateChange: (from?: string, to?: string) => void;
  disabled?: boolean;
}

const presetsList: { id: DateRangePreset; label: string }[] = [
  { id: '1d', label: 'Today' },
  { id: '7d', label: 'Last 7 Days' },
  { id: '30d', label: 'Last 30 Days' },
  { id: 'all', label: 'All Time' },
  { id: 'custom', label: 'Custom' },
];

export function DateRangeFilter({
  preset = '7d',
  from = '',
  to = '',
  onPresetChange,
  onCustomDateChange,
  disabled,
}: DateRangeFilterProps) {
  const [fromDate, setFromDate] = useState(from);
  const [toDate, setToDate] = useState(to);
  const [isCustomOpen, setIsCustomOpen] = useState(preset === 'custom');

  const handlePresetSelect = (id: DateRangePreset) => {
    if (id === 'custom') {
      setIsCustomOpen(true);
      onPresetChange('custom');
    } else {
      setIsCustomOpen(false);
      onPresetChange(id);
    }
  };

  const handleApplyCustom = () => {
    onCustomDateChange(fromDate || undefined, toDate || undefined);
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
      {/* Preset Pills */}
      <div role="group" aria-label="Select date range filter" className="flex items-center bg-slate-800/90 rounded-xl p-1 border border-slate-700/80 text-xs">
        <CalendarIcon className="w-3.5 h-3.5 text-blue-400 ml-2 mr-1" />
        {presetsList.map((p) => (
          <button
            key={p.id}
            type="button"
            disabled={disabled}
            onClick={() => handlePresetSelect(p.id)}
            aria-pressed={preset === p.id}
            className={`px-3 py-1 rounded-lg font-medium transition-all ${
              preset === p.id
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Custom Date Pickers */}
      {(preset === 'custom' || isCustomOpen) && (
        <div className="flex items-center space-x-2 bg-slate-900 border border-slate-800 p-1.5 rounded-xl text-xs animate-in fade-in duration-200">
          <div className="flex items-center space-x-1.5 px-2">
            <label htmlFor="filter-from-date" className="text-slate-500 text-[10px] uppercase font-semibold">From</label>
            <input
              id="filter-from-date"
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              aria-label="Start date filter"
              className="bg-slate-800 text-slate-200 rounded-lg px-2 py-1 text-xs border border-slate-700 outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex items-center space-x-1.5 px-2">
            <label htmlFor="filter-to-date" className="text-slate-500 text-[10px] uppercase font-semibold">To</label>
            <input
              id="filter-to-date"
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              aria-label="End date filter"
              className="bg-slate-800 text-slate-200 rounded-lg px-2 py-1 text-xs border border-slate-700 outline-none focus:border-blue-500"
            />
          </div>

          <button
            type="button"
            onClick={handleApplyCustom}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition-colors"
          >
            Apply
          </button>
        </div>
      )}
    </div>
  );
}
