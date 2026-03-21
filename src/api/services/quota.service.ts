import { http } from '../../lib/http';
import type { QuotaItem, QuotaCreatePayload, RateLimitItem, RateLimitCreatePayload } from '../../types/dto/quota';

export const quotaService = {
  listQuotas: () =>
    http.get<QuotaItem[]>('/quotas'),

  createQuota: (payload: QuotaCreatePayload) =>
    http.post<QuotaItem>('/quotas', payload),

  listRateLimits: () =>
    http.get<RateLimitItem[]>('/rate-limits'),

  createRateLimit: (payload: RateLimitCreatePayload) =>
    http.post<RateLimitItem>('/rate-limits', payload),

  toggleRateLimit: (id: number, enabled: boolean) =>
    http.patch<void>(`/rate-limits/${id}`, { enabled }),
};
