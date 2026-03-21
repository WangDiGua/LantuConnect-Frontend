import { http } from '../../lib/http';
import type { PaginatedData } from '../../types/api';
import type {
  Dataset,
  DatasetCreatePayload,
  DatasetUpdatePayload,
  DatasetListQuery,
} from '../../types/dto/dataset';

export const datasetService = {
  list: (params?: DatasetListQuery) =>
    http.get<PaginatedData<Dataset>>('/v1/datasets', { params }),

  getById: (id: number) =>
    http.get<Dataset>(`/v1/datasets/${id}`),

  create: (data: DatasetCreatePayload) =>
    http.post<Dataset>('/v1/datasets', data),

  update: (id: number, data: DatasetUpdatePayload) =>
    http.put<Dataset>(`/v1/datasets/${id}`, data),

  remove: (id: number) =>
    http.delete(`/v1/datasets/${id}`),

  applyAccess: (id: number) =>
    http.post<void>(`/v1/datasets/${id}/apply`),
};
