import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ApiClient } from '../api/client';
import type { Project, File, Layer, Entity, PaginatedResponse } from '../api/types';

global.fetch = vi.fn();

describe('ApiClient', () => {
  let apiClient: ApiClient;

  beforeEach(() => {
    apiClient = new ApiClient('/api');
    vi.clearAllMocks();
  });

  describe('getProjects', () => {
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

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockProjects,
      });

      const projects = await apiClient.getProjects();

      expect(global.fetch).toHaveBeenCalledWith('/api/projects', {
        headers: { 'Content-Type': 'application/json' },
      });
      expect(projects).toEqual(mockProjects);
    });

    it('should handle error response', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: '加载项目失败' }),
      });

      await expect(apiClient.getProjects()).rejects.toThrow('加载项目失败');
    });
  });

  describe('uploadFile', () => {
    it('should upload file successfully', async () => {
      const mockFile = new Blob(['test content'], { type: 'application/dxf' });
      const mockResponse = {
        id: 1,
        name: 'test.dxf',
        size: 1234,
        checksum: 'abc123',
        storage_path: 'uuid/original.dxf',
        encoding: 'UTF-8',
        status: 'uploaded_awaiting_parse',
        created_at: '2023-01-01T00:00:00Z',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await apiClient.uploadFile(1, mockFile);

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/projects/1/files',
        expect.objectContaining({
          method: 'POST',
          body: expect.any(FormData),
        })
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getEntities', () => {
    it('should fetch entities with bbox filter', async () => {
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

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await apiClient.getEntities(1, {
        bbox: { min_x: 0, min_y: 0, max_x: 100, max_y: 100 },
        page: 1,
        page_size: 100,
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/layers/1/entities?'),
        expect.objectContaining({
          headers: { 'Content-Type': 'application/json' },
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it('should abort previous request with same key', async () => {
      const mockResponse: PaginatedResponse<Entity> = {
        data: [],
        pagination: { page: 1, page_size: 100, total: 0, total_pages: 0 },
      };

      const abortEvents: boolean[] = [];
      (global.fetch as any).mockImplementation((_url: string, options: any) => {
        const requestIndex = abortEvents.length;
        abortEvents.push(false);
        
        if (options?.signal) {
          options.signal.addEventListener('abort', () => {
            abortEvents[requestIndex] = true;
          });
        }
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              ok: true,
              json: async () => mockResponse,
            });
          }, 100);
        });
      });

      const bbox = { min_x: 0, min_y: 0, max_x: 100, max_y: 100 };
      const promise1 = apiClient.getEntities(1, { bbox, page: 1 });
      const promise2 = apiClient.getEntities(1, { bbox, page: 2 });

      await promise1.catch(() => {});
      await promise2;

      expect(abortEvents[0]).toBe(true);
    });
  });

  describe('abortAllRequests', () => {
    it('should abort all pending requests', () => {
      const abortSpy = vi.fn();
      
      (global.fetch as any).mockImplementation((_url: string, options: any) => {
        if (options?.signal) {
          options.signal.addEventListener('abort', abortSpy);
        }
        return new Promise(() => {});
      });

      apiClient.getLayers(1);
      apiClient.getEntities(1);

      apiClient.abortAllRequests();

      expect(abortSpy).toHaveBeenCalled();
    });
  });
});
