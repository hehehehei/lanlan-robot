import { useEffect, useMemo } from 'react';
import { useLayersStore } from '../state/store';
import type { Layer } from '../api/types';

export interface UseLayersOptions {
  fileId?: number;
  autoFetch?: boolean;
}

export interface UseLayersResult {
  layers: Layer[];
  selectedLayerIds: number[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  toggleLayerSelection: (layerId: number) => void;
  selectLayers: (layerIds: number[]) => void;
  clearSelection: () => void;
  clearError: () => void;
}

export function useLayers(options: UseLayersOptions = {}): UseLayersResult {
  const { fileId, autoFetch = true } = options;

  const {
    layers: allLayers,
    selectedLayerIds,
    loading,
    fetchLayers,
    toggleLayerSelection,
    selectLayers,
    clearSelection,
    clearError: clearStoreError,
  } = useLayersStore();

  const layers = useMemo(() => {
    if (!fileId) return [];
    return allLayers[fileId] || [];
  }, [allLayers, fileId]);

  const loadingState = useMemo(() => {
    if (!fileId) return { isLoading: false, error: null };
    return loading[fileId] || { isLoading: false, error: null };
  }, [loading, fileId]);

  useEffect(() => {
    if (fileId && autoFetch && !layers.length && !loadingState.isLoading) {
      fetchLayers(fileId);
    }
  }, [fileId, autoFetch, layers.length, loadingState.isLoading, fetchLayers]);

  const refetch = async () => {
    if (fileId) {
      await fetchLayers(fileId);
    }
  };

  const clearError = () => {
    if (fileId) {
      clearStoreError(fileId);
    }
  };

  return {
    layers,
    selectedLayerIds,
    isLoading: loadingState.isLoading,
    error: loadingState.error,
    refetch,
    toggleLayerSelection,
    selectLayers,
    clearSelection,
    clearError,
  };
}
