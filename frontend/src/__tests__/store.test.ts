import { describe, it, expect, beforeEach, vi } from 'vitest';
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

describe('useProjectsStore', () => {
  beforeEach(() => {
    const store = useProjectsStore.getState();
    store.projects = [];
    store.selectedProjectId = null;
    store.loading = { isLoading: false, error: null };
    vi.clearAllMocks();
  });

  it('should fetch projects successfully', async () => {
    const mockProjects: Project[] = [
      {
        id: 1,
        name: 'Test Project',
        description: 'A test project',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      },
    ];

    vi.mocked(apiClient.getProjects).mockResolvedValueOnce(mockProjects);

    const { fetchProjects } = useProjectsStore.getState();
    await fetchProjects();

    const state = useProjectsStore.getState();
    expect(state.projects).toEqual(mockProjects);
    expect(state.loading.isLoading).toBe(false);
    expect(state.loading.error).toBeNull();
  });

  it('should handle fetch projects error', async () => {
    vi.mocked(apiClient.getProjects).mockRejectedValueOnce(
      new Error('网络错误')
    );

    const { fetchProjects } = useProjectsStore.getState();
    await fetchProjects();

    const state = useProjectsStore.getState();
    expect(state.projects).toEqual([]);
    expect(state.loading.isLoading).toBe(false);
    expect(state.loading.error).toBe('网络错误');
  });

  it('should select project', () => {
    const { selectProject } = useProjectsStore.getState();
    selectProject(1);

    const state = useProjectsStore.getState();
    expect(state.selectedProjectId).toBe(1);
  });

  it('should clear error', () => {
    useProjectsStore.setState({
      loading: { isLoading: false, error: '测试错误' },
    });

    const { clearError } = useProjectsStore.getState();
    clearError();

    const state = useProjectsStore.getState();
    expect(state.loading.error).toBeNull();
  });
});

describe('useFilesStore', () => {
  beforeEach(() => {
    const store = useFilesStore.getState();
    store.files = {};
    store.selectedFileId = null;
    store.loading = {};
    vi.clearAllMocks();
  });

  it('should fetch files successfully', async () => {
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

    const { fetchFiles } = useFilesStore.getState();
    await fetchFiles(1);

    const state = useFilesStore.getState();
    expect(state.files[1]).toEqual(mockFiles);
    expect(state.loading[1]?.isLoading).toBe(false);
    expect(state.loading[1]?.error).toBeNull();
  });

  it('should upload file and refetch', async () => {
    const mockFile = new Blob(['test'], { type: 'application/dxf' });
    const mockFiles: File[] = [];

    vi.mocked(apiClient.uploadFile).mockResolvedValueOnce({
      id: 1,
      name: 'test.dxf',
      size: 1234,
      checksum: 'abc123',
      storage_path: 'uuid/original.dxf',
      encoding: 'UTF-8',
      status: 'uploaded_awaiting_parse',
      created_at: '2023-01-01T00:00:00Z',
    });
    vi.mocked(apiClient.getFiles).mockResolvedValueOnce(mockFiles);

    const { uploadFile } = useFilesStore.getState();
    await uploadFile(1, mockFile);

    expect(apiClient.uploadFile).toHaveBeenCalledWith(1, mockFile);
    expect(apiClient.getFiles).toHaveBeenCalledWith(1);
  });
});

describe('useLayersStore', () => {
  beforeEach(() => {
    const store = useLayersStore.getState();
    store.layers = {};
    store.selectedLayerIds = [];
    store.loading = {};
    vi.clearAllMocks();
  });

  it('should fetch layers successfully', async () => {
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

    const { fetchLayers } = useLayersStore.getState();
    await fetchLayers(1);

    const state = useLayersStore.getState();
    expect(state.layers[1]).toEqual(mockLayers);
    expect(state.loading[1]?.isLoading).toBe(false);
  });

  it('should toggle layer selection', () => {
    const { toggleLayerSelection } = useLayersStore.getState();
    
    toggleLayerSelection(1);
    expect(useLayersStore.getState().selectedLayerIds).toEqual([1]);
    
    toggleLayerSelection(2);
    expect(useLayersStore.getState().selectedLayerIds).toEqual([1, 2]);
    
    toggleLayerSelection(1);
    expect(useLayersStore.getState().selectedLayerIds).toEqual([2]);
  });

  it('should select multiple layers', () => {
    const { selectLayers } = useLayersStore.getState();
    selectLayers([1, 2, 3]);

    const state = useLayersStore.getState();
    expect(state.selectedLayerIds).toEqual([1, 2, 3]);
  });

  it('should clear selection', () => {
    useLayersStore.setState({ selectedLayerIds: [1, 2, 3] });
    
    const { clearSelection } = useLayersStore.getState();
    clearSelection();

    const state = useLayersStore.getState();
    expect(state.selectedLayerIds).toEqual([]);
  });
});

describe('useEntitiesStore', () => {
  beforeEach(() => {
    const store = useEntitiesStore.getState();
    store.entities = {};
    store.pagination = {};
    store.loading = {};
    vi.clearAllMocks();
  });

  it('should fetch entities successfully', async () => {
    const mockResponse: PaginatedResponse<Entity> = {
      data: [
        {
          id: 1,
          layer_id: 1,
          entity_type: 'LINE',
          data: { start: { x: 0, y: 0 }, end: { x: 100, y: 100 } },
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

    const { fetchEntities } = useEntitiesStore.getState();
    await fetchEntities(1);

    const state = useEntitiesStore.getState();
    expect(state.entities[1]).toEqual(mockResponse.data);
    expect(state.pagination[1]).toEqual(mockResponse.pagination);
    expect(state.loading[1]?.isLoading).toBe(false);
  });

  it('should fetch entities with bbox filter', async () => {
    const mockResponse: PaginatedResponse<Entity> = {
      data: [],
      pagination: { page: 1, page_size: 100, total: 0, total_pages: 0 },
    };

    vi.mocked(apiClient.getEntities).mockResolvedValueOnce(mockResponse);

    const { fetchEntities } = useEntitiesStore.getState();
    const bbox = { min_x: 0, min_y: 0, max_x: 100, max_y: 100 };
    await fetchEntities(1, bbox);

    expect(apiClient.getEntities).toHaveBeenCalledWith(1, {
      bbox,
      page: 1,
      page_size: 100,
    });
  });

  it('should clear entities', () => {
    useEntitiesStore.setState({
      entities: { 1: [] },
      pagination: { 1: { page: 1, page_size: 100, total: 0, total_pages: 0 } },
    });

    const { clearEntities } = useEntitiesStore.getState();
    clearEntities(1);

    const state = useEntitiesStore.getState();
    expect(state.entities[1]).toBeUndefined();
    expect(state.pagination[1]).toBeUndefined();
  });
});
