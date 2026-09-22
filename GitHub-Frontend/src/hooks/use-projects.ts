import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchProjects, fetchProjectDetails, createProject, connectRepository } from '../lib/api/projects';

export function useProjects() {
  const queryClient = useQueryClient();

  const projectsQuery = useQuery({
    queryKey: ['projects-list'],
    queryFn: fetchProjects,
  });

  const createMutation = useMutation({
    mutationFn: ({ name, description }: { name: string; description?: string }) => createProject(name, description),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects-list'] });
    },
  });

  const connectRepoMutation = useMutation({
    mutationFn: ({ projectId, owner, name }: { projectId: string; owner: string; name: string }) =>
      connectRepository(projectId, owner, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects-list'] });
    },
  });

  return {
    projects: projectsQuery.data?.data || [],
    isLoading: projectsQuery.isLoading,
    isError: projectsQuery.isError,
    createProject: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    connectRepo: connectRepoMutation.mutateAsync,
    isConnecting: connectRepoMutation.isPending,
  };
}

export function useProjectDetail(projectId: string) {
  return useQuery({
    queryKey: ['project-detail', projectId],
    queryFn: () => fetchProjectDetails(projectId),
    enabled: !!projectId,
  });
}
