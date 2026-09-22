export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  timestamp?: string;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface BaseQueryParams {
  search?: string;
  projectId?: string;
  repositoryId?: string;
  developerId?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}
