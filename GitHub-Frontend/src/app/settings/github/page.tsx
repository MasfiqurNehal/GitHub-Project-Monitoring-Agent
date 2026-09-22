'use client';

import { useState } from 'react';
import Header from '../../../components/layout/header';
import ChatDrawer from '../../../components/ai/chat-drawer';
import { useGitHub } from '../../../hooks/use-github';
import {
  Link2,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  Search,
  Plus,
  RefreshCw,
  Trash2,
  ExternalLink,
  Lock,
  Globe,
  GitBranch,
  AlertCircle,
  Loader2,
  Building2,
  UserCheck,
} from 'lucide-react';
import Link from 'next/link';

export default function GitHubSettingsPage() {
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  const {
    accountInfo,
    isStatusLoading,
    connectAccount,
    isConnecting,
    disconnectAccount,
    isDisconnecting,

    repoUrlInput,
    setRepoUrlInput,
    validateRepository,
    isValidating,
    validatedRepo,
    validationError,
    clearValidatedRepo,

    monitoredRepos,
    isMonitoredLoading,
    addRepoToMonitoring,
    isAddingRepo,
    syncRepo,
    removeRepo,
  } = useGitHub();

  const handleSyncRepo = async (id: string) => {
    setSyncingId(id);
    try {
      await syncRepo(id);
    } finally {
      setSyncingId(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-slate-950 text-slate-100 min-h-screen">
      <Header onOpenAIChat={() => setIsAIChatOpen(true)} />

      <main className="flex-1 p-6 space-y-6 max-w-7xl w-full mx-auto">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Link2 className="w-6 h-6 text-blue-400" /> GitHub Connection & Monitoring
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Manage connected GitHub organization accounts, validate public/private codebases, and monitor repository activity.
          </p>
        </div>

        {/* 1. GitHub Account Section */}
        <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-2xl space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
            <div className="flex items-center space-x-3">
              <div
                className={`w-11 h-11 rounded-2xl flex items-center justify-center border ${
                  accountInfo.isConnected
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                {accountInfo.isConnected ? <CheckCircle2 className="w-6 h-6" /> : <XCircle className="w-6 h-6" />}
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="font-bold text-white text-base">GitHub Account Connection</h2>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                      accountInfo.isConnected
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    }`}
                  >
                    {accountInfo.isConnected ? 'Connected' : 'Not Connected'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  {accountInfo.isConnected
                    ? 'Read-only access granted for organizational monitoring.'
                    : 'No GitHub account connected yet.'}
                </p>
              </div>
            </div>

            {/* Connect / Disconnect Buttons */}
            <div>
              {accountInfo.isConnected ? (
                <button
                  onClick={() => disconnectAccount()}
                  disabled={isDisconnecting}
                  className="px-4 py-2 bg-slate-800 hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 border border-slate-700 hover:border-rose-500/30 rounded-xl text-xs font-semibold transition-colors disabled:opacity-40"
                >
                  {isDisconnecting ? 'Disconnecting...' : 'Disconnect Account'}
                </button>
              ) : (
                <button
                  onClick={() => connectAccount()}
                  disabled={isConnecting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-500/20 transition-all disabled:opacity-40 flex items-center space-x-2"
                >
                  <Link2 className="w-4 h-4" />
                  <span>{isConnecting ? 'Connecting...' : 'Connect GitHub Account'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Connected Details Grid */}
          {accountInfo.isConnected && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-800/40 p-4 rounded-xl border border-slate-700/40 text-xs">
              <div className="space-y-1">
                <span className="text-slate-400 flex items-center gap-1.5 text-[11px] uppercase font-semibold">
                  <UserCheck className="w-3.5 h-3.5 text-blue-400" /> Username
                </span>
                <span className="font-bold text-slate-200">@{accountInfo.username}</span>
              </div>

              <div className="space-y-1">
                <span className="text-slate-400 flex items-center gap-1.5 text-[11px] uppercase font-semibold">
                  <Building2 className="w-3.5 h-3.5 text-purple-400" /> Organization
                </span>
                <span className="font-bold text-slate-200">{accountInfo.organization || 'Personal'}</span>
              </div>

              <div className="space-y-1">
                <span className="text-slate-400 flex items-center gap-1.5 text-[11px] uppercase font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Scope Access
                </span>
                <span className="font-mono text-emerald-400">
                  {accountInfo.scopes?.join(', ') || 'repo:read, read:org'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* 2. Add & Validate Repository Section */}
        <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-2xl space-y-4">
          <div className="flex items-center space-x-2">
            <Plus className="w-5 h-5 text-blue-400" />
            <h2 className="text-base font-bold text-white">Add Repository to Monitoring</h2>
          </div>
          <p className="text-xs text-slate-400">
            Paste a public or private GitHub repository URL to validate access and add it to executive monitoring.
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="https://github.com/BetopiaLtd/beyondAI-new-website"
                value={repoUrlInput}
                onChange={(e) => setRepoUrlInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && validateRepository()}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-blue-500 transition-colors"
              />
            </div>
            <button
              onClick={validateRepository}
              disabled={!repoUrlInput.trim() || isValidating}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-sm transition-all disabled:opacity-40 flex items-center justify-center space-x-2 shrink-0"
            >
              {isValidating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Validating...</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  <span>Validate Repository</span>
                </>
              )}
            </button>
          </div>

          {/* Validation Error Banner */}
          {validationError && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center space-x-3 text-rose-300 text-xs animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          {/* Validation Success Card */}
          {validatedRepo && (
            <div className="bg-slate-800/70 border border-blue-500/30 p-5 rounded-xl space-y-4 animate-in fade-in duration-300">
              <div className="flex items-center justify-between border-b border-slate-700/60 pb-3">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-lg">
                    <GitBranch className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm">{validatedRepo.fullName}</h3>
                    <p className="text-xs text-slate-400">Default branch: {validatedRepo.defaultBranch}</p>
                  </div>
                </div>

                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium ${
                    validatedRepo.isPrivate
                      ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  }`}
                >
                  {validatedRepo.isPrivate ? (
                    <>
                      <Lock className="w-3 h-3" /> Private
                    </>
                  ) : (
                    <>
                      <Globe className="w-3 h-3" /> Public
                    </>
                  )}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-slate-300">
                <div>
                  <span className="text-slate-500 text-[10px] uppercase font-semibold block">Owner / Org</span>
                  <span className="font-semibold text-slate-200">{validatedRepo.owner}</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] uppercase font-semibold block">Visibility</span>
                  <span className="font-semibold text-slate-200">{validatedRepo.isPrivate ? 'Private' : 'Public'}</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] uppercase font-semibold block">Language</span>
                  <span className="font-semibold text-slate-200">{validatedRepo.language || 'Codebase'}</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] uppercase font-semibold block">Access Status</span>
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> Read Access Verified
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  onClick={clearValidatedRepo}
                  className="px-3.5 py-1.5 bg-slate-700 text-slate-300 rounded-lg text-xs font-medium hover:bg-slate-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => addRepoToMonitoring(validatedRepo)}
                  disabled={isAddingRepo}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors flex items-center space-x-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isAddingRepo ? 'Adding...' : 'Add Repository to Monitoring'}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 3. Monitored Repositories List */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white">Monitored Repositories</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Active codebases currently synchronized into PostgreSQL analytics.
              </p>
            </div>
            <span className="px-3 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full text-xs font-medium">
              {monitoredRepos.length} Monitored
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800/60 text-slate-400 uppercase tracking-wider font-semibold text-[11px] border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">Repository Name</th>
                  <th className="px-4 py-3">Organization</th>
                  <th className="px-4 py-3">Visibility</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Last Sync</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {monitoredRepos.map((repo) => (
                  <tr key={repo.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-slate-200 flex items-center space-x-2">
                        <GitBranch className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                        <span>{repo.name}</span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono block mt-0.5">{repo.fullName}</span>
                    </td>

                    <td className="px-4 py-3.5 text-slate-300 font-medium">{repo.owner}</td>

                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                          repo.isPrivate
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        }`}
                      >
                        {repo.isPrivate ? <Lock className="w-2.5 h-2.5" /> : <Globe className="w-2.5 h-2.5" />}
                        {repo.isPrivate ? 'Private' : 'Public'}
                      </span>
                    </td>

                    <td className="px-4 py-3.5">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-[10px] font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        {repo.status}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 text-slate-400 text-[11px]">
                      {repo.lastSyncedAt ? new Date(repo.lastSyncedAt).toLocaleString() : 'Never'}
                    </td>

                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        {/* View Action */}
                        <Link
                          href={`/repositories/${repo.id}`}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[11px] font-medium transition-colors flex items-center space-x-1"
                        >
                          <span>View</span>
                          <ExternalLink className="w-3 h-3 text-slate-400" />
                        </Link>

                        {/* Sync Action */}
                        <button
                          onClick={() => handleSyncRepo(repo.id)}
                          disabled={syncingId === repo.id}
                          className="px-2.5 py-1 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/20 rounded-lg text-[11px] font-medium transition-colors disabled:opacity-40 flex items-center space-x-1"
                        >
                          <RefreshCw className={`w-3 h-3 ${syncingId === repo.id ? 'animate-spin text-blue-400' : ''}`} />
                          <span>Sync</span>
                        </button>

                        {/* Remove Action */}
                        <button
                          onClick={() => removeRepo(repo.id)}
                          className="p-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-lg transition-colors"
                          title="Remove Repository"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {monitoredRepos.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-500 italic text-xs">
                      No monitored repositories connected yet. Validate a GitHub URL above to start monitoring.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <ChatDrawer isOpen={isAIChatOpen} onClose={() => setIsAIChatOpen(false)} />
    </div>
  );
}
