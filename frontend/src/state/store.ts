import { create } from 'zustand';
import type {
  Project,
  File,
  Layer,
  Entity,
  BoundingBox,
  PaginatedResponse,
} from '../api/types';
import { apiClient } from '../api/client';

export interface LoadingState {
  isLoading: boolean;
  error: string | null;
}

export interface ProjectsState {
  projects: Project[];
  selectedProjectId: number | null;
  loading: LoadingState;
  fetchProjects: () => Promise<void>;
  selectProject: (projectId: number) => void;
  clearError: () => void;
}

export interface FilesState {
  files: Record<number, File[]>;
  selectedFileId: number | null;
  loading: Record<number, LoadingState>;
  fetchFiles: (projectId: number) => Promise<void>;
  fetchFile: (projectId: number, fileId: number) => Promise<void>;
  selectFile: (fileId: number) => void;
  uploadFile: (projectId: number, file: Blob) => Promise<void>;
  parseFile: (projectId: number, fileId: number) => Promise<void>;
  clearError: (projectId: number) => void;
}

export interface LayersState {
  layers: Record<number, Layer[]>;
  selectedLayerIds: number[];
  loading: Record<number, LoadingState>;
  fetchLayers: (fileId: number) => Promise<void>;
  toggleLayerSelection: (layerId: number) => void;
  selectLayers: (layerIds: number[]) => void;
  clearSelection: () => void;
  clearError: (fileId: number) => void;
}

export interface EntitiesState {
  entities: Record<number, Entity[]>;
  pagination: Record<number, PaginatedResponse<Entity>['pagination'] | null>;
  loading: Record<number, LoadingState>;
  fetchEntities: (
    layerId: number,
    bbox?: BoundingBox,
    page?: number,
    pageSize?: number
  ) => Promise<void>;
  clearEntities: (layerId: number) => void;
  clearError: (layerId: number) => void;
}

export const useProjectsStore = create<ProjectsState>((set, get) => ({
  projects: [],
  selectedProjectId: null,
  loading: { isLoading: false, error: null },

  fetchProjects: async () => {
    set({ loading: { isLoading: true, error: null } });
    try {
      const projects = await apiClient.getProjects();
      set({ projects, loading: { isLoading: false, error: null } });
    } catch (error) {
      set({
        loading: {
          isLoading: false,
          error: error instanceof Error ? error.message : '加载项目失败',
        },
      });
    }
  },

  selectProject: (projectId: number) => {
    set({ selectedProjectId: projectId });
  },

  clearError: () => {
    set({ loading: { ...get().loading, error: null } });
  },
}));

export const useFilesStore = create<FilesState>((set, get) => ({
  files: {},
  selectedFileId: null,
  loading: {},

  fetchFiles: async (projectId: number) => {
    const currentLoading = get().loading;
    set({
      loading: {
        ...currentLoading,
        [projectId]: { isLoading: true, error: null },
      },
    });

    try {
      const files = await apiClient.getFiles(projectId);
      set({
        files: { ...get().files, [projectId]: files },
        loading: {
          ...get().loading,
          [projectId]: { isLoading: false, error: null },
        },
      });
    } catch (error) {
      set({
        loading: {
          ...get().loading,
          [projectId]: {
            isLoading: false,
            error: error instanceof Error ? error.message : '加载文件失败',
          },
        },
      });
    }
  },

  fetchFile: async (projectId: number, fileId: number) => {
    const currentLoading = get().loading;
    set({
      loading: {
        ...currentLoading,
        [projectId]: { isLoading: true, error: null },
      },
    });

    try {
      const file = await apiClient.getFile(projectId, fileId);
      const currentFiles = get().files[projectId] || [];
      const fileIndex = currentFiles.findIndex((f) => f.id === fileId);

      const updatedFiles =
        fileIndex >= 0
          ? [
              ...currentFiles.slice(0, fileIndex),
              file,
              ...currentFiles.slice(fileIndex + 1),
            ]
          : [...currentFiles, file];

      set({
        files: { ...get().files, [projectId]: updatedFiles },
        loading: {
          ...get().loading,
          [projectId]: { isLoading: false, error: null },
        },
      });
    } catch (error) {
      set({
        loading: {
          ...get().loading,
          [projectId]: {
            isLoading: false,
            error: error instanceof Error ? error.message : '加载文件详情失败',
          },
        },
      });
    }
  },

  selectFile: (fileId: number) => {
    set({ selectedFileId: fileId });
  },

  uploadFile: async (projectId: number, file: Blob) => {
    const currentLoading = get().loading;
    set({
      loading: {
        ...currentLoading,
        [projectId]: { isLoading: true, error: null },
      },
    });

    try {
      await apiClient.uploadFile(projectId, file);
      await get().fetchFiles(projectId);
    } catch (error) {
      set({
        loading: {
          ...get().loading,
          [projectId]: {
            isLoading: false,
            error: error instanceof Error ? error.message : '上传文件失败',
          },
        },
      });
    }
  },

  parseFile: async (projectId: number, fileId: number) => {
    const currentLoading = get().loading;
    set({
      loading: {
        ...currentLoading,
        [projectId]: { isLoading: true, error: null },
      },
    });

    try {
      await apiClient.parseFile(projectId, fileId);
      await get().fetchFile(projectId, fileId);
    } catch (error) {
      set({
        loading: {
          ...get().loading,
          [projectId]: {
            isLoading: false,
            error: error instanceof Error ? error.message : '解析文件失败',
          },
        },
      });
    }
  },

  clearError: (projectId: number) => {
    const currentLoading = get().loading;
    if (currentLoading[projectId]) {
      set({
        loading: {
          ...currentLoading,
          [projectId]: { ...currentLoading[projectId], error: null },
        },
      });
    }
  },
}));

export const useLayersStore = create<LayersState>((set, get) => ({
  layers: {},
  selectedLayerIds: [],
  loading: {},

  fetchLayers: async (fileId: number) => {
    const currentLoading = get().loading;
    set({
      loading: {
        ...currentLoading,
        [fileId]: { isLoading: true, error: null },
      },
    });

    try {
      const layers = await apiClient.getLayers(fileId);
      set({
        layers: { ...get().layers, [fileId]: layers },
        loading: {
          ...get().loading,
          [fileId]: { isLoading: false, error: null },
        },
      });
    } catch (error) {
      set({
        loading: {
          ...get().loading,
          [fileId]: {
            isLoading: false,
            error: error instanceof Error ? error.message : '加载图层失败',
          },
        },
      });
    }
  },

  toggleLayerSelection: (layerId: number) => {
    const { selectedLayerIds } = get();
    const isSelected = selectedLayerIds.includes(layerId);
    set({
      selectedLayerIds: isSelected
        ? selectedLayerIds.filter((id) => id !== layerId)
        : [...selectedLayerIds, layerId],
    });
  },

  selectLayers: (layerIds: number[]) => {
    set({ selectedLayerIds: layerIds });
  },

  clearSelection: () => {
    set({ selectedLayerIds: [] });
  },

  clearError: (fileId: number) => {
    const currentLoading = get().loading;
    if (currentLoading[fileId]) {
      set({
        loading: {
          ...currentLoading,
          [fileId]: { ...currentLoading[fileId], error: null },
        },
      });
    }
  },
}));

export const useEntitiesStore = create<EntitiesState>((set, get) => ({
  entities: {},
  pagination: {},
  loading: {},

  fetchEntities: async (
    layerId: number,
    bbox?: BoundingBox,
    page = 1,
    pageSize = 100
  ) => {
    const currentLoading = get().loading;
    set({
      loading: {
        ...currentLoading,
        [layerId]: { isLoading: true, error: null },
      },
    });

    try {
      const response = await apiClient.getEntities(layerId, {
        bbox,
        page,
        page_size: pageSize,
      });

      set({
        entities: { ...get().entities, [layerId]: response.data },
        pagination: { ...get().pagination, [layerId]: response.pagination },
        loading: {
          ...get().loading,
          [layerId]: { isLoading: false, error: null },
        },
      });
    } catch (error) {
      set({
        loading: {
          ...get().loading,
          [layerId]: {
            isLoading: false,
            error: error instanceof Error ? error.message : '加载实体失败',
          },
        },
      });
    }
  },

  clearEntities: (layerId: number) => {
    const { entities, pagination } = get();
    const newEntities = { ...entities };
    const newPagination = { ...pagination };
    delete newEntities[layerId];
    delete newPagination[layerId];
    set({ entities: newEntities, pagination: newPagination });
  },

  clearError: (layerId: number) => {
    const currentLoading = get().loading;
    if (currentLoading[layerId]) {
      set({
        loading: {
          ...currentLoading,
          [layerId]: { ...currentLoading[layerId], error: null },
        },
      });
    }
  },
}));
