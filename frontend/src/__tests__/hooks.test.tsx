import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useProjects } from '../hooks/useProjects';
import { useFiles } from '../hooks/useFiles';
import { useLayers } from '../hooks/useLayers';
import { useEntities } from '../hooks/useEntities';
import {
  useProjectsStore,
  useFilesStore,
  useLayersStore,
  useEntitiesStore,
} from '../state/store';
import { apiClient } from '../api/client';
import type { Project, File, Layer, Entity, PaginatedResponse } from '../api/types';

vi.mock('../api/client', () => ({
  apiClient: {
    getProjects: vi.fn(),
    getFiles: vi.fn(),
    getFile: vi.fn(),
    uploadFile: vi.fn(),
    parseFile: vi.fn(),
    getLayers: vi.fn(),
    getEntities: vi.fn(),
  },
}));

describe('useProjects', () => {
  beforeEach(() => {
    useProjectsStore.setState({
      projects: [],
      selectedProjectId: null,
      loading: { isLoading: false, error: null },
    });
    vi.clearAllMocks();
  });

  it('should auto-fetch projects on mount', async () => {
    const mockProjects: Project[] = [
      {
        id: 1,
        name: 'Test Project',
        description: null,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      },
    ];

    vi.mocked(apiClient.getProjects).mockResolvedValueOnce(mockProjects);

    const { result } = renderHook(() => useProjects());

    await waitFor(() => {
      expect(result.current.projects).toEqual(mockProjects);
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should not auto-fetch when autoFetch is false', () => {
    const { result } = renderHook(() => useProjects({ autoFetch: false }));

    expect(apiClient.getProjects).not.toHaveBeenCalled();
    expect(result.current.projects).toEqual([]);
  });

  it.skip('should handle errors', async () => {
    const state = useProjectsStore.getState();
    expect(state.projects).toEqual([]);
    expect(state.loading.isLoading).toBe(false);
    
    vi.mocked(apiClient.getProjects).mockRejectedValueOnce(
      new Error('加载项目失败')
    );

    const { result } = renderHook(() => useProjects());

    const callCountBefore = vi.mocked(apiClient.getProjects).mock.calls.length;
    
    await waitFor(() => {
      expect(vi.mocked(apiClient.getProjects).mock.calls.length).toBeGreaterThan(callCountBefore);
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe('加载项目失败');
  });
});

describe('useFiles', () => {
  beforeEach(() => {
    useFilesStore.setState({
      files: {},
      selectedFileId: null,
      loading: {},
    });
    vi.clearAllMocks();
  });

  it('should auto-fetch files when projectId is provided', async () => {
    const mockFiles: File[] = [
      {
        id: 1,
        project_id: 1,
        name: 'test.dxf',
        size: 1234,
        storage_path: 'uuid/original.dxf',
        checksum: 'abc123',
        encoding: 'UTF-8',
        parse_status: 'uploaded',
        parse_error: null,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      },
    ];

    vi.mocked(apiClient.getFiles).mockResolvedValueOnce(mockFiles);

    const { result } = renderHook(() => useFiles({ projectId: 1 }));

    await waitFor(() => {
      expect(result.current.files).toEqual(mockFiles);
    });
  });

  it('should return empty array when no projectId', () => {
    const { result } = renderHook(() => useFiles());

    expect(result.current.files).toEqual([]);
    expect(apiClient.getFiles).not.toHaveBeenCalled();
  });
});

describe('useLayers', () => {
  beforeEach(() => {
    useLayersStore.setState({
      layers: {},
      selectedLayerIds: [],
      loading: {},
    });
    vi.clearAllMocks();
  });

  it('should auto-fetch layers when fileId is provided', async () => {
    const mockLayers: Layer[] = [
      {
        id: 1,
        file_id: 1,
        name: 'Layer 1',
        is_locked: false,
        is_visible: true,
        color: null,
        line_type: null,
        line_weight: null,
        min_x: 0,
        min_y: 0,
        max_x: 100,
        max_y: 100,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      },
    ];

    vi.mocked(apiClient.getLayers).mockResolvedValueOnce(mockLayers);

    const { result } = renderHook(() => useLayers({ fileId: 1 }));

    await waitFor(() => {
      expect(result.current.layers).toEqual(mockLayers);
    });
  });

  it('should toggle layer selection', async () => {
    const mockLayers: Layer[] = [
      {
        id: 1,
        file_id: 1,
        name: 'Layer 1',
        is_locked: false,
        is_visible: true,
        color: null,
        line_type: null,
        line_weight: null,
        min_x: 0,
        min_y: 0,
        max_x: 100,
        max_y: 100,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      },
    ];

    vi.mocked(apiClient.getLayers).mockResolvedValueOnce(mockLayers);

    const { result } = renderHook(() => useLayers({ fileId: 1 }));

    await waitFor(() => {
      expect(result.current.layers).toEqual(mockLayers);
    });

    result.current.toggleLayerSelection(1);

    await waitFor(() => {
      expect(result.current.selectedLayerIds).toEqual([1]);
    });
  });
});

describe('useEntities', () => {
  beforeEach(() => {
    useEntitiesStore.setState({
      entities: {},
      pagination: {},
      loading: {},
    });
    vi.clearAllMocks();
  });

  it('should auto-fetch entities when layerId is provided', async () => {
    const mockResponse: PaginatedResponse<Entity> = {
      data: [
        {
          id: 1,
          layer_id: 1,
          entity_type: 'LINE',
          data: {},
          min_x: 0,
          min_y: 0,
          max_x: 100,
          max_y: 100,
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
        },
      ],
      pagination: {
        page: 1,
        page_size: 100,
        total: 1,
        total_pages: 1,
      },
    };

    vi.mocked(apiClient.getEntities).mockResolvedValueOnce(mockResponse);

    const { result } = renderHook(() => useEntities({ layerId: 1 }));

    await waitFor(() => {
      expect(result.current.entities).toEqual(mockResponse.data);
    });

    expect(result.current.pagination).toEqual(mockResponse.pagination);
  });

  it('should fetch entities with bbox filter', async () => {
    const mockResponse: PaginatedResponse<Entity> = {
      data: [],
      pagination: { page: 1, page_size: 100, total: 0, total_pages: 0 },
    };

    vi.mocked(apiClient.getEntities).mockResolvedValueOnce(mockResponse);

    const bbox = { min_x: 0, min_y: 0, max_x: 100, max_y: 100 };
    const { result } = renderHook(() =>
      useEntities({ layerId: 1, bbox })
    );

    await waitFor(() => {
      expect(apiClient.getEntities).toHaveBeenCalledWith(1, {
        bbox,
        page: 1,
        page_size: 100,
      });
    });
  });

  it('should refetch on bbox change', async () => {
    const mockResponse: PaginatedResponse<Entity> = {
      data: [],
      pagination: { page: 1, page_size: 100, total: 0, total_pages: 0 },
    };

    vi.mocked(apiClient.getEntities).mockResolvedValue(mockResponse);

    const { rerender } = renderHook(
      ({ bbox }) => useEntities({ layerId: 1, bbox }),
      {
        initialProps: { bbox: { min_x: 0, min_y: 0, max_x: 100, max_y: 100 } },
      }
    );

    await waitFor(() => {
      expect(apiClient.getEntities).toHaveBeenCalledTimes(1);
    });

    rerender({ bbox: { min_x: 50, min_y: 50, max_x: 150, max_y: 150 } });

    await waitFor(() => {
      expect(apiClient.getEntities).toHaveBeenCalledTimes(2);
    });
  });
});
