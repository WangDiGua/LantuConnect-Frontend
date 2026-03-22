export interface ApiResponse<T = unknown> {
  code: number;
  data: T;
  message: string;
  timestamp?: number;
}

export interface PaginatedData<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}

export type PaginatedResponse<T> = ApiResponse<PaginatedData<T>>;

export interface MpPageData<T> {
  records: T[];
  total: number;
  current: number;
  size: number;
  pages: number;
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ApiError {
  code: number;
  message: string;
  details?: Record<string, string[]>;
  status: number;
}

export class ApiException extends Error {
  code: number;
  status: number;
  details?: Record<string, string[]>;

  constructor(err: ApiError) {
    super(err.message);
    this.name = 'ApiException';
    this.code = err.code;
    this.status = err.status;
    this.details = err.details;
  }
}
