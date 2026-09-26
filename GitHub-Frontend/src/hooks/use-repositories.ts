import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getRepositories, getRepositoryDetail } from '../features/repositories/api';
import { triggerRepositorySync } from '../lib/api/repositories';

export function useRepositories(filters: {
  projectId?: string;
  search?: string;
  status?: string;
  visibility?: 'public' | 'private' | 'all';
} = {}) {
  const queryClient = useQueryClient();

  const reposQuery = useQuery({
    queryKey: ['repositories-list', filters],
    queryFn: () => getRepositories(filters),
  });

  const syncMutation = useMutation({
    mutationFn: (repositoryId: string) => triggerRepositorySync(repositoryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repositories-list'] });
    },
  });

  return {
    repositories: reposQuery.data?.data || [],
    isLoading: reposQuery.isLoading,
    isError: reposQuery.isError,
    refetch: reposQuery.refetch,
    syncRepository: syncMutation.mutateAsync,
    isSyncing: syncMutation.isPending,
  };
}

export function useRepository(repositoryId: string) {
  const queryClient = useQueryClient();

  const detailQuery = useQuery({
    queryKey: ['repository-detail', repositoryId],
    queryFn: () => getRepositoryDetail(repositoryId),
    enabled: !!repositoryId,
  });

  const syncMutation = useMutation({
    mutationFn: (targetId?: string) => triggerRepositorySync(targetId || repositoryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repository-detail', repositoryId] });
      queryClient.invalidateQueries({ queryKey: ['repositories-list'] });
    },
  });

  return {
    ...detailQuery,
    repositoryDetail: detailQuery.data?.data,
    repository: detailQuery.data?.data?.repository,
    data: detailQuery.data,
    isLoading: detailQuery.isLoading,
    isError: detailQuery.isError,
    refetch: detailQuery.refetch,
    syncRepository: syncMutation.mutateAsync,
    isSyncing: syncMutation.isPending,
  };
}

// Alias for backward compatibility
export const useRepositoryDetail = useRepository;
