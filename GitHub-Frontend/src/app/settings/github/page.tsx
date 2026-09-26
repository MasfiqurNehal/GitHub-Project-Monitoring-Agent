'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Header from '../../../components/layout/header';
import ChatDrawer from '../../../components/ai/chat-drawer';
import { useGitHub } from '../../../hooks/use-github';
import { TableSkeleton, EmptyState } from '../../../components/common';
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
  Database,
  Clock,
} from 'lucide-react';
import Link from 'next/link';

function GitHubSettingsContent() {
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [urlMessage, setUrlMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [connectError, setConnectError] = useState<string | null>(null);

  const searchParams = useSearchParams();

  useEffect(() => {
    const connected = searchParams.get('connected');
    const error = searchParams.get('error');

    if (connected === 'true') {
      setUrlMessage({
        type: 'success',
        text: 'GitMonitor AI GitHub App connected successfully!',
      });
    } else if (error) {
      let errorMessage = 'An error occurred during GitHub connection.';
      if (error === 'cancelled' || error === 'denied' || error === 'access_denied') {
        errorMessage = 'GitHub App installation was cancelled or authorization was denied.';
      } else if (error === 'invalid_state') {
        errorMessage = 'Security validation failed (invalid state token). Please try connecting again.';
      } else if (error === 'installation_failed' || error === 'invalid_installation') {
        errorMessage = 'Failed to verify GitHub installation. Please try again.';
      } else if (error === 'expired_session' || error === 'unauthorized') {
        errorMessage = 'Your session expired during GitHub installation. Please log in again.';
      } else if (error === 'github_api_error') {
        errorMessage = 'GitHub API error occurred during installation.';
      }
      setUrlMessage({ type: 'error', text: errorMessage });
    }
  }, [searchParams]);

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

  const handleConnect = async () => {
    setConnectError(null);
    try {
      await connectAccount();
    } catch (err: any) {
      setConnectError(
        err.message || 'Failed to initiate GitHub App connection. Please verify your backend server connection.'
      );
    }
  };

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

        {/* URL Banner Message (Success / Error) */}
        {urlMessage && (
          <div
            className={`p-4 rounded-xl border text-xs flex items-center justify-between transition-all ${
              urlMessage.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
            }`}
          >
            <div className="flex items-center space-x-2">
              {urlMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span className="font-medium">{urlMessage.text}</span>
            </div>
            <button
              onClick={() => setUrlMessage(null)}
              className="text-slate-400 hover:text-white transition-colors text-base font-bold px-1"
            >
              ×
            </button>
          </div>
        )}

        {/* Connection Failure Error Banner */}
        {connectError && (
          <div className="p-4 rounded-xl border bg-rose-500/10 border-rose-500/20 text-rose-300 text-xs flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span className="font-medium">{connectError}</span>
            </div>
            <button
              onClick={() => setConnectError(null)}
              className="text-slate-400 hover:text-white transition-colors text-base font-bold px-1"
            >
              ×
            </button>
          </div>
        )}

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
                    ? `Connected as @${accountInfo.username || accountInfo.githubAccount?.login || 'user'} (${accountInfo.organization || 'BetopiaLtd'})`
                    : 'GitHub App Connection Required to sync private and public repositories.'}
                </p>
              </div>
            </div>

            <div>
              {accountInfo.isConnected ? (
                <button
                  onClick={() => disconnectAccount()}
                  disabled={isDisconnecting}
                  className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-xl text-xs font-semibold transition-colors disabled:opacity-40"
                >
                  {isDisconnecting ? 'Disconnecting...' : 'Disconnect Account'}
                </button>
              ) : (
                <button
                  onClick={handleConnect}
                  disabled={isConnecting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-md transition-colors disabled:opacity-40 flex items-center space-x-2"
                >
                  {isConnecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
                  <span>{isConnecting ? 'Redirecting to GitHub...' : 'Connect GitHub Account'}</span>
                </button>
              )}
            </div>
          </div>

          {accountInfo.isConnected && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1 text-xs">
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex items-center space-x-3">
                <UserCheck className="w-4 h-4 text-blue-400 shrink-0" />
                <div className="min-w-0">
                  <span className="text-slate-500 text-[10px] uppercase font-semibold block">GitHub Account</span>
                  <span className="font-semibold text-slate-200 truncate block">
                    @{accountInfo.username || accountInfo.githubAccount?.login || accountInfo.name || 'user'}
                  </span>
                </div>
              </div>

              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex items-center space-x-3">
                <Building2 className="w-4 h-4 text-amber-400 shrink-0" />
                <div className="min-w-0">
                  <span className="text-slate-500 text-[10px] uppercase font-semibold block">Organization</span>
                  <span className="font-semibold text-slate-200 truncate block">
                    {accountInfo.organization || accountInfo.githubAccount?.type || 'Personal Account'}
                  </span>
                </div>
              </div>

              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex items-center space-x-3">
                <Database className="w-4 h-4 text-emerald-400 shrink-0" />
                <div className="min-w-0">
                  <span className="text-slate-500 text-[10px] uppercase font-semibold block">Repository Access</span>
                  <span className="font-semibold text-slate-200 block">
                    {accountInfo.accessibleRepositoryCount ?? monitoredRepos.length} Repositories
                  </span>
                </div>
              </div>

              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex items-center space-x-3">
                <Clock className="w-4 h-4 text-purple-400 shrink-0" />
                <div className="min-w-0">
                  <span className="text-slate-500 text-[10px] uppercase font-semibold block">Last Sync</span>
                  <span className="font-semibold text-slate-200 truncate block">
                    {accountInfo.lastSynchronization
                      ? new Date(accountInfo.lastSynchronization).toLocaleString()
                      : 'Not synced yet'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 2. Add Repository Section */}
        <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-2xl space-y-4">
          <div>
            <h2 className="text-base font-bold text-white">Add Repository to Monitoring</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Enter any public or private GitHub repository URL to validate read permissions and enable telemetry monitoring.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="e.g. https://github.com/BetopiaLtd/beyondAI-backend"
                value={repoUrlInput}
                onChange={(e) => setRepoUrlInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && validateRepository()}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-blue-500 transition-colors"
              />
            </div>
            <button
              onClick={validateRepository}
              disabled={isValidating || !repoUrlInput.trim()}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-md transition-colors disabled:opacity-40 flex items-center justify-center space-x-2 shrink-0"
            >
              {isValidating ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <ShieldCheck className="w-4 h-4" />}
              <span>{isValidating ? 'Validating...' : 'Validate Repository'}</span>
            </button>
          </div>

          {validationError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          {validatedRepo && (
            <div className="bg-slate-950 border border-emerald-500/30 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="font-semibold text-white text-xs">Validation Success</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">{validatedRepo.defaultBranch} branch</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-slate-500 text-[10px] uppercase font-semibold block">Full Name</span>
                  <span className="font-semibold text-slate-200 font-mono">{validatedRepo.fullName}</span>
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
                  className="px-3.5 py-1.5 bg-slate-800 text-slate-300 rounded-lg text-xs font-medium hover:bg-slate-700 transition-colors"
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
                Active codebases currently synchronized into analytics telemetry.
              </p>
            </div>
            <span className="px-3 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full text-xs font-medium">
              {monitoredRepos.length} Monitored
            </span>
          </div>

          {isMonitoredLoading ? (
            <TableSkeleton rows={3} columns={6} />
          ) : monitoredRepos.length === 0 ? (
            <EmptyState
              title="No Repositories Connected"
              description="No GitHub repositories are currently attached to monitoring. Enter a repository URL above to validate and add it."
            />
          ) : (
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
                          <Link
                            href={`/repositories/${repo.id}`}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[11px] font-medium transition-colors flex items-center space-x-1"
                          >
                            <span>View</span>
                            <ExternalLink className="w-3 h-3 text-slate-400" />
                          </Link>

                          <button
                            onClick={() => handleSyncRepo(repo.id)}
                            disabled={syncingId === repo.id}
                            className="px-2.5 py-1 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/20 rounded-lg text-[11px] font-medium transition-colors disabled:opacity-40 flex items-center space-x-1"
                          >
                            <RefreshCw className={`w-3 h-3 ${syncingId === repo.id ? 'animate-spin text-blue-400' : ''}`} />
                            <span>Sync</span>
                          </button>

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
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      <ChatDrawer isOpen={isAIChatOpen} onClose={() => setIsAIChatOpen(false)} />
    </div>
  );
}

export default function GitHubSettingsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 p-6 text-slate-400">Loading GitHub connection settings...</div>}>
      <GitHubSettingsContent />
    </Suspense>
  );
}
