export interface Project {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface File {
  id: number;
  project_id: number;
  name: string;
  size: number | null;
  storage_path: string | null;
  checksum: string | null;
  encoding: string | null;
  parse_status: 'uploaded' | 'parsing' | 'parsed' | 'failed' | null;
  parse_error: string | null;
  created_at: string;
  updated_at: string;
}

export interface FileUploadResponse {
  id: number;
  name: string;
  size: number;
  checksum: string;
  storage_path: string;
  encoding: string;
  status: string;
  created_at: string;
}

export interface Layer {
  id: number;
  file_id: number;
  name: string;
  is_locked: boolean;
  is_visible: boolean;
  color: string | null;
  line_type: string | null;
  line_weight: string | null;
  min_x: number | null;
  min_y: number | null;
  max_x: number | null;
  max_y: number | null;
  created_at: string;
  updated_at: string;
}

export interface Entity {
  id: number;
  layer_id: number;
  entity_type: 'LINE' | 'POLYLINE' | 'ARC' | 'CIRCLE' | 'TEXT' | 'INSERT';
  data: Record<string, unknown>;
  min_x: number;
  min_y: number;
  max_x: number;
  max_y: number;
  created_at: string;
  updated_at: string;
}

export interface BoundingBox {
  min_x: number;
  min_y: number;
  max_x: number;
  max_y: number;
}

export interface ParseResponse {
  status: string;
  message: string;
  file_id: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
  };
}

export interface EntityQueryParams {
  layer_id?: number;
  bbox?: BoundingBox;
  page?: number;
  page_size?: number;
}

export interface ApiError {
  error: string;
}
