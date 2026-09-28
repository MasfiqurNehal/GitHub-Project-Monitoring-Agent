'use client';

import React, { useState, useEffect } from 'react';
import { X, GitBranch, Link as LinkIcon, Loader2, AlertCircle } from 'lucide-react';
import { useRepositories } from '../../hooks/use-repositories';

interface ConnectRepositoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  onConnect: (payload: { repositoryId?: string; repositoryUrl?: string; nameOrDescription?: string }) => Promise<void>;
  isConnecting: boolean;
}

export function ConnectRepositoryModal({
  isOpen,
  onClose,
  projectId,
  onConnect,
  isConnecting,
}: ConnectRepositoryModalProps) {
  const [selectedRepoId, setSelectedRepoId] = useState<string>('');
  const [customRepoUrl, setCustomRepoUrl] = useState<string>('');
  const [nameOrDescription, setNameOrDescription] = useState<string>('');
  const [inputMode, setInputMode] = useState<'SELECT' | 'URL'>('SELECT');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch available repositories for the tenant
  const { repositories, isLoading: isLoadingRepos } = useRepositories();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isConnecting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isConnecting, onClose]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedRepoId('');
      setCustomRepoUrl('');
      setNameOrDescription('');
      setErrorMessage(null);
      setInputMode('SELECT');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    let repositoryId: string | undefined;
    let repositoryUrl: string | undefined;

    if (inputMode === 'SELECT') {
      if (!selectedRepoId) {
        setErrorMessage('Please select a repository from the list.');
        return;
      }
      repositoryId = selectedRepoId;
    } else {
      if (!customRepoUrl.trim()) {
        setErrorMessage('Please enter a valid GitHub repository URL.');
        return;
      }
      repositoryUrl = customRepoUrl.trim();
    }

    try {
      await onConnect({
        repositoryId,
        repositoryUrl,
        nameOrDescription: nameOrDescription.trim() || undefined,
      });
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to connect repository. Please verify the URL/access and try again.');
    }
  };

  const isSubmitDisabled =
    isConnecting ||
    (inputMode === 'SELECT' && !selectedRepoId) ||
    (inputMode === 'URL' && !customRepoUrl.trim());

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="connect-repository-modal-title"
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
              <GitBranch className="w-5 h-5" />
            </div>
            <div>
              <h3 id="connect-repository-modal-title" className="text-base font-bold text-white">
                Connect GitHub Repository
              </h3>
              <p className="text-[11px] text-slate-400">Attach a repository to this project group</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isConnecting}
            aria-label="Close dialog"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-start gap-2 text-rose-400 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Mode Selector Tabs */}
          <div className="flex items-center gap-2 p-1 bg-slate-950 border border-slate-800 rounded-xl">
            <button
              type="button"
              onClick={() => {
                setInputMode('SELECT');
                setErrorMessage(null);
              }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                inputMode === 'SELECT'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <GitBranch className="w-3.5 h-3.5" />
              <span>Select Monitored Repo</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setInputMode('URL');
                setErrorMessage(null);
              }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                inputMode === 'URL'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <LinkIcon className="w-3.5 h-3.5" />
              <span>GitHub Repository URL</span>
            </button>
          </div>

          {/* Field 1: Repository Selection */}
          {inputMode === 'SELECT' ? (
            <div className="space-y-1.5">
              <label htmlFor="repo-select-field" className="text-xs font-semibold text-slate-300">
                Repository *
              </label>
              <div className="relative">
                <select
                  id="repo-select-field"
                  disabled={isLoadingRepos || isConnecting}
                  value={selectedRepoId}
                  onChange={(e) => setSelectedRepoId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors disabled:opacity-50 appearance-none font-medium"
                >
                  <option value="">Select repository</option>
                  {repositories.map((repo) => (
                    <option key={repo.id} value={repo.id}>
                      {repo.fullName || repo.name} {repo.isPrivate ? '(Private)' : '(Public)'}
                    </option>
                  ))}
                </select>
                {isLoadingRepos && (
                  <div className="absolute right-3 top-3">
                    <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin" />
                  </div>
                )}
              </div>
              <p className="text-[11px] text-slate-500">
                Shows repositories authorized in your GitHub App installation.
              </p>
            </div>
          ) : (
            <div className="space-y-1.5">
              <label htmlFor="repo-url-field" className="text-xs font-semibold text-slate-300">
                GitHub Repository URL *
              </label>
              <input
                id="repo-url-field"
                type="url"
                disabled={isConnecting}
                placeholder="https://github.com/owner/repository"
                value={customRepoUrl}
                onChange={(e) => setCustomRepoUrl(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors disabled:opacity-50"
              />
            </div>
          )}

          {/* Field 2: ONE OPTIONAL TEXT FIELD */}
          <div className="space-y-1.5">
            <label htmlFor="repo-name-desc-field" className="text-xs font-semibold text-slate-300">
              Repository name or description (optional)
            </label>
            <input
              id="repo-name-desc-field"
              type="text"
              disabled={isConnecting}
              placeholder="Repository name or description (optional)"
              value={nameOrDescription}
              onChange={(e) => setNameOrDescription(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors disabled:opacity-50"
            />
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isConnecting}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitDisabled}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all disabled:opacity-50 shadow-lg shadow-blue-600/20"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Connecting...</span>
                </>
              ) : (
                <span>Connect Repository</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
