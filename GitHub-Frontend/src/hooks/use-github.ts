import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getGitHubConnection,
  getMonitoredRepositories,
  validateGitHubRepository,
  addMonitoredRepository,
  syncMonitoredRepository,
  removeMonitoredRepository,
} from '../features/github/api';
import { connectGitHubAccount, disconnectGitHubAccount } from '../lib/api/github';
import { ValidatedRepositoryInfo } from '../types';

export function useGithubConnection() {
  const queryClient = useQueryClient();

  const statusQuery = useQuery({
    queryKey: ['github-connection-status'],
    queryFn: () => getGitHubConnection(),
  });

  const connectMutation = useMutation({
    mutationFn: connectGitHubAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['github-connection-status'] });
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: disconnectGitHubAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['github-connection-status'] });
    },
  });

  return {
    accountInfo: statusQuery.data?.data || { isConnected: false },
    isLoading: statusQuery.isLoading,
    isError: statusQuery.isError,
    refetch: statusQuery.refetch,
    connectAccount: connectMutation.mutateAsync,
    isConnecting: connectMutation.isPending,
    disconnectAccount: disconnectMutation.mutateAsync,
    isDisconnecting: disconnectMutation.isPending,
  };
}

export function useGithubRepositories() {
  const queryClient = useQueryClient();

  const monitoredReposQuery = useQuery({
    queryKey: ['monitored-repositories'],
    queryFn: () => getMonitoredRepositories(),
  });

  const syncMutation = useMutation({
    mutationFn: (repoId: string) => syncMonitoredRepository(repoId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monitored-repositories'] });
    },
  });

  const removeMutation = useMutation({
    mutationFn: (repoId: string) => removeMonitoredRepository(repoId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monitored-repositories'] });
    },
  });

  return {
    monitoredRepos: monitoredReposQuery.data?.data || [],
    isLoading: monitoredReposQuery.isLoading,
    isError: monitoredReposQuery.isError,
    refetch: monitoredReposQuery.refetch,
    syncRepo: syncMutation.mutateAsync,
    isSyncingRepo: syncMutation.isPending,
    removeRepo: removeMutation.mutateAsync,
    isRemovingRepo: removeMutation.isPending,
  };
}

export function useGitHub() {
  const queryClient = useQueryClient();

  const [repoUrlInput, setRepoUrlInput] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [validatedRepo, setValidatedRepo] = useState<ValidatedRepositoryInfo | null>(null);

  const connection = useGithubConnection();
  const repos = useGithubRepositories();

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

  const addRepoMutation = useMutation({
    mutationFn: (repo: ValidatedRepositoryInfo) => addMonitoredRepository({ url: repo.url }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monitored-repositories'] });
      setValidatedRepo(null);
      setRepoUrlInput('');
      setValidationError(null);
    },
  });

  const handleValidate = async () => {
    if (!repoUrlInput.trim()) return;
    setValidationError(null);
    setValidatedRepo(null);
    await validateMutation.mutateAsync(repoUrlInput);
  };

  return {
    accountInfo: connection.accountInfo,
    isStatusLoading: connection.isLoading,
    connectAccount: connection.connectAccount,
    isConnecting: connection.isConnecting,
    disconnectAccount: connection.disconnectAccount,
    isDisconnecting: connection.isDisconnecting,

    // Validate Repo state
    repoUrlInput,
    setRepoUrlInput,
    validateRepository: handleValidate,
    isValidating: validateMutation.isPending,
    validatedRepo,
    validationError,
    clearValidatedRepo: () => setValidatedRepo(null),

    // Monitored Repos state
    monitoredRepos: repos.monitoredRepos,
    isMonitoredLoading: repos.isLoading,
    addRepoToMonitoring: addRepoMutation.mutateAsync,
    isAddingRepo: addRepoMutation.isPending,
    syncRepo: repos.syncRepo,
    isSyncingRepo: repos.isSyncingRepo,
    removeRepo: repos.removeRepo,
    isRemovingRepo: repos.isRemovingRepo,
  };
}
