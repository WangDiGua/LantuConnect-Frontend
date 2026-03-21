import { http } from '../../lib/http';
import type { PaginatedData } from '../../types/api';
import type {
  Provider,
  ProviderCreatePayload,
  ProviderUpdatePayload,
  ProviderListQuery,
} from '../../types/dto/provider';

export const providerService = {
  list: (params?: ProviderListQuery) =>
    http.get<PaginatedData<Provider>>('/v1/providers', { params }),

  getById: (id: number) =>
    http.get<Provider>(`/v1/providers/${id}`),

  create: (data: ProviderCreatePayload) =>
    http.post<Provider>('/v1/providers', data),

  update: (id: number, data: ProviderUpdatePayload) =>
    http.put<Provider>(`/v1/providers/${id}`, data),

  remove: (id: number) =>
    http.delete(`/v1/providers/${id}`),
};
