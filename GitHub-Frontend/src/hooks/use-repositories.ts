import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchRepositories, fetchRepositoryDetails, triggerRepositorySync } from '../lib/api/repositories';

export function useRepositories() {
  const queryClient = useQueryClient();

  const reposQuery = useQuery({
    queryKey: ['repositories-list'],
    queryFn: () => fetchRepositories(),
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

export function useRepositoryDetail(repositoryId: string) {
  const detailQuery = useQuery({
    queryKey: ['repository-detail', repositoryId],
    queryFn: () => fetchRepositoryDetails(repositoryId),
    enabled: !!repositoryId,
  });

  return {
    ...detailQuery,
    repositoryDetail: detailQuery.data?.data,
    data: detailQuery.data,
    isLoading: detailQuery.isLoading,
    isError: detailQuery.isError,
    refetch: detailQuery.refetch,
  };
}
