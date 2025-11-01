import type {
  Project,
  File,
  FileUploadResponse,
  Layer,
  Entity,
  ParseResponse,
  PaginatedResponse,
  EntityQueryParams,
  ApiError,
} from './types';

export class ApiClient {
  private baseUrl: string;
  private abortControllers: Map<string, AbortController>;

  constructor(baseUrl = '/api') {
    this.baseUrl = baseUrl;
    this.abortControllers = new Map();
  }

  private abortPreviousRequest(key: string): void {
    const existingController = this.abortControllers.get(key);
    if (existingController) {
      existingController.abort();
    }
  }

  private createAbortController(key: string): AbortController {
    this.abortPreviousRequest(key);
    const controller = new AbortController();
    this.abortControllers.set(key, controller);
    return controller;
  }

  private cleanupAbortController(key: string): void {
    this.abortControllers.delete(key);
  }

  private async request<T>(
    path: string,
    options: RequestInit = {},
    abortKey?: string
  ): Promise<T> {
    let controller: AbortController | undefined;

    if (abortKey) {
      controller = this.createAbortController(abortKey);
      options.signal = controller.signal;
    }

    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        const error: ApiError = await response.json().catch(() => ({
          error: response.statusText,
        }));
        throw new Error(error.error || '请求失败');
      }

      return await response.json();
    } finally {
      if (abortKey && controller) {
        this.cleanupAbortController(abortKey);
      }
    }
  }

  async getProjects(): Promise<Project[]> {
    return this.request<Project[]>('/projects');
  }

  async getProject(projectId: number): Promise<Project> {
    return this.request<Project>(`/projects/${projectId}`);
  }

  async getFiles(projectId: number): Promise<File[]> {
    return this.request<File[]>(`/projects/${projectId}/files`, {}, `files-${projectId}`);
  }

  async getFile(projectId: number, fileId: number): Promise<File> {
    return this.request<File>(`/projects/${projectId}/files/${fileId}`, {}, `file-${fileId}`);
  }

  async uploadFile(projectId: number, file: Blob): Promise<FileUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${this.baseUrl}/projects/${projectId}/files`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error: ApiError = await response.json().catch(() => ({
        error: response.statusText,
      }));
      throw new Error(error.error || '上传失败');
    }

    return await response.json();
  }

  async parseFile(projectId: number, fileId: number): Promise<ParseResponse> {
    return this.request<ParseResponse>(`/projects/${projectId}/files/${fileId}/parse`, {
      method: 'POST',
    });
  }

  async getLayers(fileId: number): Promise<Layer[]> {
    return this.request<Layer[]>(`/files/${fileId}/layers`, {}, `layers-${fileId}`);
  }

  async getLayer(layerId: number): Promise<Layer> {
    return this.request<Layer>(`/layers/${layerId}`);
  }

  async getEntities(
    layerId: number,
    params?: EntityQueryParams
  ): Promise<PaginatedResponse<Entity>> {
    const searchParams = new URLSearchParams();
    
    if (params?.bbox) {
      searchParams.append('min_x', params.bbox.min_x.toString());
      searchParams.append('min_y', params.bbox.min_y.toString());
      searchParams.append('max_x', params.bbox.max_x.toString());
      searchParams.append('max_y', params.bbox.max_y.toString());
    }
    
    if (params?.page !== undefined) {
      searchParams.append('page', params.page.toString());
    }
    
    if (params?.page_size !== undefined) {
      searchParams.append('page_size', params.page_size.toString());
    }

    const queryString = searchParams.toString();
    const path = `/layers/${layerId}/entities${queryString ? `?${queryString}` : ''}`;
    
    const abortKey = `entities-${layerId}-${params?.bbox ? JSON.stringify(params.bbox) : 'all'}`;
    
    return this.request<PaginatedResponse<Entity>>(path, {}, abortKey);
  }

  abortAllRequests(): void {
    this.abortControllers.forEach((controller) => controller.abort());
    this.abortControllers.clear();
  }
}

export const apiClient = new ApiClient();
