import { useEffect, useMemo, useCallback } from 'react';
import { useFilesStore } from '../state/store';
import type { File } from '../api/types';

export interface UseFilesOptions {
  projectId?: number;
  autoFetch?: boolean;
}

export interface UseFilesResult {
  files: File[];
  selectedFileId: number | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  selectFile: (fileId: number) => void;
  uploadFile: (file: Blob) => Promise<void>;
  parseFile: (fileId: number) => Promise<void>;
  clearError: () => void;
}

export function useFiles(options: UseFilesOptions = {}): UseFilesResult {
  const { projectId, autoFetch = true } = options;

  const {
    files: allFiles,
    selectedFileId,
    loading,
    fetchFiles,
    selectFile,
    uploadFile: uploadFileStore,
    parseFile: parseFileStore,
    clearError: clearStoreError,
  } = useFilesStore();

  const files = useMemo(() => {
    if (!projectId) return [];
    return allFiles[projectId] || [];
  }, [allFiles, projectId]);

  const loadingState = useMemo(() => {
    if (!projectId) return { isLoading: false, error: null };
    return loading[projectId] || { isLoading: false, error: null };
  }, [loading, projectId]);

  useEffect(() => {
    if (projectId && autoFetch && !files.length && !loadingState.isLoading) {
      fetchFiles(projectId);
    }
  }, [projectId, autoFetch, files.length, loadingState.isLoading, fetchFiles]);

  const refetch = useCallback(async () => {
    if (projectId) {
      await fetchFiles(projectId);
    }
  }, [projectId, fetchFiles]);

  const uploadFile = useCallback(
    async (file: Blob) => {
      if (projectId) {
        await uploadFileStore(projectId, file);
      }
    },
    [projectId, uploadFileStore]
  );

  const parseFile = useCallback(
    async (fileId: number) => {
      if (projectId) {
        await parseFileStore(projectId, fileId);
      }
    },
    [projectId, parseFileStore]
  );

  const clearError = useCallback(() => {
    if (projectId) {
      clearStoreError(projectId);
    }
  }, [projectId, clearStoreError]);

  return {
    files,
    selectedFileId,
    isLoading: loadingState.isLoading,
    error: loadingState.error,
    refetch,
    selectFile,
    uploadFile,
    parseFile,
    clearError,
  };
}
