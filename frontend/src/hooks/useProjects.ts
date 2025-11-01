import { useEffect, useMemo } from 'react';
import { useProjectsStore } from '../state/store';
import type { Project } from '../api/types';

export interface UseProjectsOptions {
  autoFetch?: boolean;
}

export interface UseProjectsResult {
  projects: Project[];
  selectedProjectId: number | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  selectProject: (projectId: number) => void;
  clearError: () => void;
}

export function useProjects(options: UseProjectsOptions = {}): UseProjectsResult {
  const { autoFetch = true } = options;

  const {
    projects,
    selectedProjectId,
    loading,
    fetchProjects,
    selectProject,
    clearError: clearStoreError,
  } = useProjectsStore();

  useEffect(() => {
    if (autoFetch && projects && !projects.length && !loading.isLoading) {
      fetchProjects();
    }
  }, [autoFetch, projects, loading.isLoading, fetchProjects]);

  const refetch = async () => {
    await fetchProjects();
  };

  return {
    projects,
    selectedProjectId,
    isLoading: loading.isLoading,
    error: loading.error,
    refetch,
    selectProject,
    clearError: clearStoreError,
  };
}
