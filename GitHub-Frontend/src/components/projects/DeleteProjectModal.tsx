'use client';

import React, { useState } from 'react';
import { AlertTriangle, Lock, X, Loader2, CheckCircle2 } from 'lucide-react';
import { ProjectWithMetrics } from '../../types';

interface DeleteProjectModalProps {
  isOpen: boolean;
  project: ProjectWithMetrics | null;
  onClose: () => void;
  onConfirmDelete: (projectId: string, password: string) => Promise<void>;
  isDeleting?: boolean;
}

export function DeleteProjectModal({
  isOpen,
  project,
  onClose,
  onConfirmDelete,
  isDeleting = false,
}: DeleteProjectModalProps) {
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen || !project) return null;

  const handleClose = () => {
    setIsConfirmed(false);
    setPassword('');
    setErrorMessage(null);
    setSuccessMessage(null);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConfirmed || !password.trim() || isDeleting) return;

    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await onConfirmDelete(project.id, password);
      setSuccessMessage('Project deleted successfully.');
      setTimeout(() => {
        handleClose();
      }, 1000);
    } catch (err: any) {
      console.error('Delete project failed:', err);
      const msg = err.message || err.error || 'Failed to delete project. Please check your password.';
      setErrorMessage(msg);
    }
  };

  const isSubmitDisabled = !isConfirmed || !password.trim() || isDeleting;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden p-6 space-y-5 text-slate-100">
        {/* Close Icon Button */}
        <button
          onClick={handleClose}
          disabled={isDeleting}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors p-1 rounded-lg"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Delete Project</h3>
            <p className="text-xs text-slate-400 mt-0.5 font-medium">
              Project: <span className="text-slate-200 font-bold">{project.name}</span>
            </p>
          </div>
        </div>

        {/* Warning Banner */}
        <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-300 space-y-1">
          <p className="font-semibold flex items-center gap-1.5 text-rose-200">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            Warning
          </p>
          <p className="leading-relaxed text-slate-300">
            This action cannot be undone. Associated repositories and analytics data will remain preserved in your organization, but this project grouping will be permanently removed.
          </p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3 bg-red-950/80 border border-red-800/80 rounded-xl text-xs text-red-300 flex items-center gap-2">
            <X className="w-4 h-4 shrink-0 text-red-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Success Alert */}
        {successMessage && (
          <div className="p-3 bg-emerald-950/80 border border-emerald-800/80 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Confirmation Checkbox */}
          <label className="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={isConfirmed}
              onChange={(e) => setIsConfirmed(e.target.checked)}
              disabled={isDeleting}
              className="mt-0.5 w-4 h-4 rounded border-slate-700 bg-slate-950 text-blue-600 focus:ring-blue-500 focus:ring-offset-slate-900 cursor-pointer"
            />
            <span className="text-xs text-slate-300 font-medium group-hover:text-white transition-colors">
              I understand that this project will be permanently deleted.
            </span>
          </label>

          {/* Password Input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              Enter your account password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isDeleting}
              placeholder="Enter your current password"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 transition-colors"
            />
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={isDeleting}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitDisabled}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-rose-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Deleting Project...</span>
                </>
              ) : (
                <span>Delete Project</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
