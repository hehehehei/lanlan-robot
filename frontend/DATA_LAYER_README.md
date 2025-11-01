# Frontend Data Layer Documentation

This document describes the frontend data layer implementation for the CAD file viewer application.

## Overview

The data layer consists of:
- **API Client**: HTTP client with TypeScript interfaces for backend communication
- **State Management**: Zustand stores for projects, files, layers, and entities
- **Custom Hooks**: React hooks for data fetching with loading/error states
- **Concurrency Control**: Automatic request cancellation on viewport changes

## Architecture

```
┌─────────────────┐
│  React Components │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Custom Hooks    │  (useProjects, useFiles, useLayers, useEntities)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Zustand Stores  │  (State Management)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   API Client     │  (HTTP requests with fetch)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Backend API     │
└─────────────────┘
```

## API Client (`src/api/client.ts`)

The `ApiClient` class provides methods for interacting with the backend API.

### Features

- **Automatic Request Cancellation**: Previous requests with the same key are automatically aborted
- **Error Handling**: Consistent error messages in Chinese
- **Type Safety**: Full TypeScript support with DTOs matching backend models

### Usage

```typescript
import { apiClient } from './api/client';

// Fetch projects
const projects = await apiClient.getProjects();

// Upload file
const uploadResponse = await apiClient.uploadFile(projectId, file);

// Fetch entities with bbox filtering
const entities = await apiClient.getEntities(layerId, {
  bbox: { min_x: 0, min_y: 0, max_x: 100, max_y: 100 },
  page: 1,
  page_size: 100,
});
```

## Type Definitions (`src/api/types.ts`)

TypeScript interfaces matching backend DTOs:

- `Project`: Project metadata
- `File`: Uploaded file information
- `Layer`: CAD layer details
- `Entity`: CAD entity (LINE, POLYLINE, ARC, CIRCLE, TEXT, INSERT)
- `BoundingBox`: Spatial bounds for filtering
- `PaginatedResponse<T>`: Paginated API responses

## State Management (`src/state/store.ts`)

Zustand stores for different data domains:

### `useProjectsStore`

Manages project list and selection.

```typescript
const { projects, selectedProjectId, loading, fetchProjects, selectProject } = useProjectsStore();
```

### `useFilesStore`

Manages files per project with upload/parse capabilities.

```typescript
const { files, fetchFiles, uploadFile, parseFile } = useFilesStore();
```

### `useLayersStore`

Manages layers per file with selection support.

```typescript
const { layers, selectedLayerIds, fetchLayers, toggleLayerSelection } = useLayersStore();
```

### `useEntitiesStore`

Manages entities per layer with bbox filtering and pagination.

```typescript
const { entities, pagination, fetchEntities } = useEntitiesStore();
```

## Custom Hooks

### `useProjects`

Fetch and manage projects.

```typescript
const { projects, isLoading, error, refetch, selectProject } = useProjects();
```

Options:
- `autoFetch?: boolean` - Auto-fetch on mount (default: true)

### `useFiles`

Fetch and manage files for a project.

```typescript
const { files, isLoading, error, uploadFile, parseFile } = useFiles({ projectId: 1 });
```

Options:
- `projectId?: number` - Project ID to fetch files for
- `autoFetch?: boolean` - Auto-fetch on mount (default: true)

### `useLayers`

Fetch and manage layers for a file.

```typescript
const { layers, selectedLayerIds, toggleLayerSelection } = useLayers({ fileId: 1 });
```

Options:
- `fileId?: number` - File ID to fetch layers for
- `autoFetch?: boolean` - Auto-fetch on mount (default: true)

### `useEntities`

Fetch entities with bbox filtering and pagination.

```typescript
const {
  entities,
  pagination,
  isLoading,
  fetchPage,
  refetch
} = useEntities({
  layerId: 1,
  bbox: { min_x: 0, min_y: 0, max_x: 100, max_y: 100 },
  page: 1,
  pageSize: 100,
});
```

Options:
- `layerId?: number` - Layer ID to fetch entities for
- `bbox?: BoundingBox` - Spatial filter (viewport bounds)
- `page?: number` - Page number (default: 1)
- `pageSize?: number` - Items per page (default: 100)
- `autoFetch?: boolean` - Auto-fetch on mount (default: true)

**Important**: When `bbox` changes (e.g., viewport pan/zoom), the hook automatically:
1. Cancels the previous request
2. Fetches entities for the new viewport

## Concurrency Control

The API client implements request cancellation to handle viewport changes:

```typescript
// First request
apiClient.getEntities(1, { bbox: { min_x: 0, min_y: 0, max_x: 100, max_y: 100 } });

// Second request (aborts first)
apiClient.getEntities(1, { bbox: { min_x: 50, min_y: 50, max_x: 150, max_y: 150 } });
```

Each request type has a unique key for cancellation:
- `entities-{layerId}-{bbox}` - Entity requests per layer and bbox
- `layers-{fileId}` - Layer requests per file
- `files-{projectId}` - File requests per project

## Error Handling

All errors are displayed in Chinese with consistent messages:

```typescript
const { error, clearError } = useEntities({ layerId: 1 });

if (error) {
  console.error(error); // "加载实体失败"
  clearError();
}
```

Common error messages (from `src/i18n/locales/zh-CN.json`):
- `加载项目失败` - Load projects failed
- `加载文件失败` - Load files failed
- `加载图层失败` - Load layers failed
- `加载实体失败` - Load entities failed
- `上传文件失败` - Upload file failed
- `解析文件失败` - Parse file failed

## Loading States

All hooks provide loading states in Chinese:

```typescript
const { isLoading } = useEntities({ layerId: 1 });

if (isLoading) {
  return <div>正在加载实体...</div>;
}
```

Loading messages:
- `正在加载项目...` - Loading projects
- `正在加载文件...` - Loading files
- `正在加载图层...` - Loading layers
- `正在加载实体...` - Loading entities
- `正在上传文件...` - Uploading file
- `正在解析文件...` - Parsing file

## Testing

Tests are located in `src/__tests__/`:

### Run Tests

```bash
cd frontend
pnpm test
```

### Test Files

- `api-client.test.ts` - API client unit tests
- `store.test.ts` - Zustand store tests
- `hooks.test.tsx` - Custom hook tests with React Testing Library

### Example Test

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { useEntities } from '../hooks/useEntities';

it('should fetch entities with bbox filter', async () => {
  const { result } = renderHook(() =>
    useEntities({
      layerId: 1,
      bbox: { min_x: 0, min_y: 0, max_x: 100, max_y: 100 },
    })
  );

  await waitFor(() => {
    expect(result.current.entities).toHaveLength(1);
  });
});
```

## Usage Example

Complete example of using the data layer in a component:

```typescript
import React from 'react';
import { useProjects, useFiles, useLayers, useEntities } from './hooks';

function CADViewer() {
  const { projects, selectProject } = useProjects();
  const { files } = useFiles({ projectId: projects[0]?.id });
  const { layers, toggleLayerSelection, selectedLayerIds } = useLayers({
    fileId: files[0]?.id,
  });

  const [viewport, setViewport] = React.useState({
    min_x: 0,
    min_y: 0,
    max_x: 1000,
    max_y: 1000,
  });

  const { entities, isLoading, error } = useEntities({
    layerId: selectedLayerIds[0],
    bbox: viewport,
  });

  const handleViewportChange = (newViewport) => {
    setViewport(newViewport); // Automatically cancels old request
  };

  if (isLoading) return <div>正在加载实体...</div>;
  if (error) return <div>错误: {error}</div>;

  return (
    <div>
      <h1>CAD 查看器</h1>
      <div>实体数量: {entities.length}</div>
      {/* Render entities... */}
    </div>
  );
}
```

## API Endpoints

The data layer expects the following backend endpoints:

- `GET /api/projects` - List projects
- `GET /api/projects/:projectId` - Get project details
- `GET /api/projects/:projectId/files` - List files
- `GET /api/projects/:projectId/files/:fileId` - Get file details
- `POST /api/projects/:projectId/files` - Upload file
- `POST /api/projects/:projectId/files/:fileId/parse` - Parse file
- `GET /api/files/:fileId/layers` - List layers
- `GET /api/layers/:layerId` - Get layer details
- `GET /api/layers/:layerId/entities` - List entities with filters
  - Query params: `min_x`, `min_y`, `max_x`, `max_y`, `page`, `page_size`

## Performance Considerations

- **Request Cancellation**: Prevents unnecessary API calls when viewport changes rapidly
- **Pagination**: Entities are paginated to avoid loading large datasets
- **Bbox Filtering**: Only fetches entities within the current viewport
- **Memoization**: Hooks use `useMemo` to prevent unnecessary re-renders
- **Selective Fetching**: Data is only fetched when needed (autoFetch can be disabled)

## Future Improvements

- Add caching layer (React Query or SWR)
- Implement optimistic updates for file uploads
- Add WebSocket support for real-time parse status updates
- Implement virtual scrolling for large entity lists
- Add request debouncing for rapid viewport changes
