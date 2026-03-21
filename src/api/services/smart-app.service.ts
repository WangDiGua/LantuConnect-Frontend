import { http } from '../../lib/http';
import type { PaginatedData } from '../../types/api';
import type {
  SmartApp,
  SmartAppCreatePayload,
  SmartAppUpdatePayload,
  SmartAppListQuery,
} from '../../types/dto/smart-app';

export const smartAppService = {
  list: (params?: SmartAppListQuery) =>
    http.get<PaginatedData<SmartApp>>('/v1/apps', { params }),

  getById: (id: number) =>
    http.get<SmartApp>(`/v1/apps/${id}`),

  create: (data: SmartAppCreatePayload) =>
    http.post<SmartApp>('/v1/apps', data),

  update: (id: number, data: SmartAppUpdatePayload) =>
    http.put<SmartApp>(`/v1/apps/${id}`, data),

  remove: (id: number) =>
    http.delete(`/v1/apps/${id}`),
};
