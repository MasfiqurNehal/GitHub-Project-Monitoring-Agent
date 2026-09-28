import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getProjects, getProjectDetail } from '../features/projects/api';
import { createProject, connectRepository, ConnectRepositoryPayload } from '../lib/api/projects';

export function useProjects(filters: { search?: string; status?: string } = {}) {
  const queryClient = useQueryClient();

  const projectsQuery = useQuery({
    queryKey: ['projects-list', filters],
    queryFn: () => getProjects(filters),
  });

  const createMutation = useMutation({
    mutationFn: ({ name, description }: { name: string; description?: string }) => createProject({ name, description }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects-list'] });
    },
  });

  const connectRepoMutation = useMutation({
    mutationFn: ({ projectId, payload }: { projectId: string; payload: ConnectRepositoryPayload }) =>
      connectRepository(projectId, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['projects-list'] });
      queryClient.invalidateQueries({ queryKey: ['project-detail', variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ['repositories-list'] });
    },
  });

  return {
    projects: projectsQuery.data?.data || [],
    isLoading: projectsQuery.isLoading,
    isError: projectsQuery.isError,
    refetch: projectsQuery.refetch,
    createProject: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    connectRepo: connectRepoMutation.mutateAsync,
    isConnecting: connectRepoMutation.isPending,
  };
}

export function useProject(projectId: string) {
  const queryClient = useQueryClient();

  const detailQuery = useQuery({
    queryKey: ['project-detail', projectId],
    queryFn: () => getProjectDetail(projectId),
    enabled: !!projectId,
  });

  const connectRepoMutation = useMutation({
    mutationFn: (payload: ConnectRepositoryPayload) =>
      connectRepository(projectId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-detail', projectId] });
      queryClient.invalidateQueries({ queryKey: ['projects-list'] });
      queryClient.invalidateQueries({ queryKey: ['repositories-list'] });
    },
  });

  return {
    ...detailQuery,
    projectDetail: detailQuery.data?.data,
    project: detailQuery.data?.data?.project,
    data: detailQuery.data,
    isLoading: detailQuery.isLoading,
    isError: detailQuery.isError,
    refetch: detailQuery.refetch,
    connectRepo: connectRepoMutation.mutateAsync,
    isConnecting: connectRepoMutation.isPending,
  };
}

// Alias for backward compatibility
export const useProjectDetail = useProject;
