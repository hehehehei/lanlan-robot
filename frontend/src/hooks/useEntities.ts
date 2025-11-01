import { useEffect, useMemo, useCallback } from 'react';
import { useEntitiesStore } from '../state/store';
import type { Entity, BoundingBox, PaginatedResponse } from '../api/types';

export interface UseEntitiesOptions {
  layerId?: number;
  bbox?: BoundingBox;
  page?: number;
  pageSize?: number;
  autoFetch?: boolean;
}

export interface UseEntitiesResult {
  entities: Entity[];
  pagination: PaginatedResponse<Entity>['pagination'] | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  fetchPage: (page: number) => Promise<void>;
  clearEntities: () => void;
  clearError: () => void;
}

export function useEntities(options: UseEntitiesOptions = {}): UseEntitiesResult {
  const {
    layerId,
    bbox,
    page = 1,
    pageSize = 100,
    autoFetch = true,
  } = options;

  const {
    entities: allEntities,
    pagination: allPagination,
    loading,
    fetchEntities,
    clearEntities: clearStoreEntities,
    clearError: clearStoreError,
  } = useEntitiesStore();

  const entities = useMemo(() => {
    if (!layerId) return [];
    return allEntities[layerId] || [];
  }, [allEntities, layerId]);

  const pagination = useMemo(() => {
    if (!layerId) return null;
    return allPagination[layerId] || null;
  }, [allPagination, layerId]);

  const loadingState = useMemo(() => {
    if (!layerId) return { isLoading: false, error: null };
    return loading[layerId] || { isLoading: false, error: null };
  }, [loading, layerId]);

  const bboxKey = useMemo(
    () => (bbox ? JSON.stringify(bbox) : null),
    [bbox]
  );

  useEffect(() => {
    if (layerId && autoFetch && !loadingState.isLoading) {
      fetchEntities(layerId, bbox, page, pageSize);
    }
  }, [layerId, autoFetch, bboxKey, page, pageSize]);

  const refetch = useCallback(async () => {
    if (layerId) {
      await fetchEntities(layerId, bbox, page, pageSize);
    }
  }, [layerId, bbox, page, pageSize, fetchEntities]);

  const fetchPage = useCallback(
    async (newPage: number) => {
      if (layerId) {
        await fetchEntities(layerId, bbox, newPage, pageSize);
      }
    },
    [layerId, bbox, pageSize, fetchEntities]
  );

  const clearEntities = useCallback(() => {
    if (layerId) {
      clearStoreEntities(layerId);
    }
  }, [layerId, clearStoreEntities]);

  const clearError = useCallback(() => {
    if (layerId) {
      clearStoreError(layerId);
    }
  }, [layerId, clearStoreError]);

  return {
    entities,
    pagination,
    isLoading: loadingState.isLoading,
    error: loadingState.error,
    refetch,
    fetchPage,
    clearEntities,
    clearError,
  };
}
