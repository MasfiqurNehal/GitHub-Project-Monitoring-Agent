import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchGitHubConnectionStatus,
  connectGitHubAccount,
  disconnectGitHubAccount,
  validateGitHubRepository,
  addMonitoredRepository,
  fetchMonitoredRepositories,
  syncMonitoredRepository,
  removeMonitoredRepository,
} from '../lib/api/github';
import { ValidatedRepositoryInfo } from '../types';

export function useGitHub() {
  const queryClient = useQueryClient();

  // State for validate repository draft
  const [repoUrlInput, setRepoUrlInput] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [validatedRepo, setValidatedRepo] = useState<ValidatedRepositoryInfo | null>(null);

  // Connection status query
  const statusQuery = useQuery({
    queryKey: ['github-connection-status'],
    queryFn: fetchGitHubConnectionStatus,
  });

  // Monitored repositories query
  const monitoredReposQuery = useQuery({
    queryKey: ['monitored-repositories'],
    queryFn: fetchMonitoredRepositories,
  });

  // Connect mutation
  const connectMutation = useMutation({
    mutationFn: connectGitHubAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['github-connection-status'] });
    },
  });

  // Disconnect mutation
  const disconnectMutation = useMutation({
    mutationFn: disconnectGitHubAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['github-connection-status'] });
    },
  });

  // Validate repo mutation
  const validateMutation = useMutation({
    mutationFn: (url: string) => validateGitHubRepository(url),
    onSuccess: (res) => {
      setValidatedRepo(res.data);
      setValidationError(null);
    },
    onError: (err: any) => {
      setValidationError(err.message || 'Validation failed. Check repository URL and permissions.');
      setValidatedRepo(null);
    },
  });

  // Add repo to monitoring mutation
  const addRepoMutation = useMutation({
    mutationFn: (repo: ValidatedRepositoryInfo) => addMonitoredRepository(repo),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monitored-repositories'] });
      setValidatedRepo(null);
      setRepoUrlInput('');
      setValidationError(null);
    },
  });

  // Sync repo mutation
  const syncMutation = useMutation({
    mutationFn: (repoId: string) => syncMonitoredRepository(repoId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monitored-repositories'] });
    },
  });

  // Remove repo mutation
  const removeMutation = useMutation({
    mutationFn: (repoId: string) => removeMonitoredRepository(repoId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monitored-repositories'] });
    },
  });

  const handleValidate = async () => {
    if (!repoUrlInput.trim()) return;
    setValidationError(null);
    setValidatedRepo(null);
    await validateMutation.mutateAsync(repoUrlInput);
  };

  return {
    accountInfo: statusQuery.data?.data || { isConnected: false },
    isStatusLoading: statusQuery.isLoading,
    connectAccount: connectMutation.mutateAsync,
    isConnecting: connectMutation.isPending,
    disconnectAccount: disconnectMutation.mutateAsync,
    isDisconnecting: disconnectMutation.isPending,

    // Validate Repo state
    repoUrlInput,
    setRepoUrlInput,
    validateRepository: handleValidate,
    isValidating: validateMutation.isPending,
    validatedRepo,
    validationError,
    clearValidatedRepo: () => setValidatedRepo(null),

    // Monitored Repos state
    monitoredRepos: monitoredReposQuery.data?.data || [],
    isMonitoredLoading: monitoredReposQuery.isLoading,
    addRepoToMonitoring: addRepoMutation.mutateAsync,
    isAddingRepo: addRepoMutation.isPending,
    syncRepo: syncMutation.mutateAsync,
    isSyncingRepo: syncMutation.isPending,
    removeRepo: removeMutation.mutateAsync,
    isRemovingRepo: removeMutation.isPending,
  };
}
