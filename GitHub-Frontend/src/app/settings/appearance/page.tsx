'use client';

import { useState } from 'react';
import Header from '../../../components/navigation/header';
import ChatDrawer from '../../../components/ai/chat-drawer';
import { Palette, Moon, Sun, Check } from 'lucide-react';

export default function AppearanceSettingsPage() {
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-slate-950 text-slate-100 min-h-screen">
      <Header onOpenAIChat={() => setIsAIChatOpen(true)} />

      <main className="flex-1 p-6 space-y-6 max-w-7xl w-full mx-auto">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Palette className="w-6 h-6 text-purple-400" /> Appearance & Theme Preferences
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Customize dashboard layout density and visual color themes.
          </p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-2xl space-y-4">
          <h3 className="font-semibold text-white text-sm">Theme Mode</h3>
          <div className="grid grid-cols-2 gap-4 max-w-md">
            <button
              onClick={() => setTheme('dark')}
              className={`p-4 rounded-xl border text-left space-y-2 transition-all ${
                theme === 'dark'
                  ? 'bg-blue-600/10 border-blue-500 text-white'
                  : 'bg-slate-800/40 border-slate-700/60 text-slate-400'
              }`}
            >
              <div className="flex items-center justify-between">
                <Moon className="w-5 h-5 text-blue-400" />
                {theme === 'dark' && <Check className="w-4 h-4 text-blue-400" />}
              </div>
              <p className="font-bold text-xs">Executive Dark</p>
              <p className="text-[11px] text-slate-400">High-contrast dark navy palette tailored for low light.</p>
            </button>
          </div>
        </div>
      </main>

      <ChatDrawer isOpen={isAIChatOpen} onClose={() => setIsAIChatOpen(false)} />
    </div>
  );
}
