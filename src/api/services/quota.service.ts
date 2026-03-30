import { http } from '../../lib/http';
import { normalizePaginated } from '../../utils/normalizeApiPayload';
import type { QuotaItem, QuotaCreatePayload, RateLimitItem, RateLimitCreatePayload } from '../../types/dto/quota';

export const quotaService = {
  listQuotas: async (params?: { page?: number; pageSize?: number; subjectType?: string }) => {
    const raw = await http.get<unknown>('/quotas', { params });
    return normalizePaginated<QuotaItem>(raw);
  },

  getQuota: (id: number) =>
    http.get<QuotaItem>(`/quotas/${id}`),

  createQuota: (payload: QuotaCreatePayload) =>
    http.post<QuotaItem>('/quotas', payload),

  updateQuota: (payload: QuotaCreatePayload & { id: number }) =>
    http.put<void>('/quotas', payload),

  deleteQuota: (id: number) =>
    http.delete<void>(`/quotas/${id}`),

  listRateLimits: async (params?: { page?: number; pageSize?: number; quotaId?: number }) => {
    const raw = await http.get<unknown>('/rate-limits', { params });
    return normalizePaginated<RateLimitItem>(raw);
  },

  getRateLimit: (id: number) =>
    http.get<RateLimitItem>(`/rate-limits/${id}`),

  createRateLimit: (payload: RateLimitCreatePayload) =>
    http.post<RateLimitItem>('/rate-limits', payload),

  deleteRateLimit: (id: number) =>
    http.delete<void>(`/rate-limits/${id}`),

  toggleRateLimit: (id: number, enabled: boolean) =>
    http.patch<void>(`/rate-limits/${id}`, { enabled }),
};
