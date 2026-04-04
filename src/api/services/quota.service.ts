import { http } from '../../lib/http';
import { normalizePaginated } from '../../utils/normalizeApiPayload';
import type {
  QuotaItem,
  QuotaCreatePayload,
  QuotaResourceCategory,
  RateLimitItem,
  RateLimitCreatePayload,
} from '../../types/dto/quota';

function num(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function mapQuotaItem(raw: unknown): QuotaItem {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const tt = String(o.targetType ?? o.target_type ?? 'global');
  const targetType =
    tt === 'user' || tt === 'department' || tt === 'global' ? tt : 'global';
  const rcRaw = String(o.resourceCategory ?? o.resource_category ?? 'all').toLowerCase();
  const resourceCategory =
    rcRaw === 'agent' || rcRaw === 'skill' || rcRaw === 'mcp' || rcRaw === 'app' || rcRaw === 'dataset'
      ? rcRaw
      : 'all';
  return {
    id: num(o.id),
    targetType,
    targetId: o.targetId != null ? num(o.targetId) : o.target_id != null ? num(o.target_id) : null,
    targetName: String(o.targetName ?? o.target_name ?? ''),
    resourceCategory,
    dailyLimit: num(o.dailyLimit ?? o.daily_limit),
    monthlyLimit: num(o.monthlyLimit ?? o.monthly_limit),
    dailyUsed: num(o.dailyUsed ?? o.daily_used),
    monthlyUsed: num(o.monthlyUsed ?? o.monthly_used),
    enabled: o.enabled === undefined ? true : Boolean(o.enabled),
    createTime: String(o.createTime ?? o.create_time ?? ''),
    updateTime: String(o.updateTime ?? o.update_time ?? ''),
  };
}

function mapRateLimitItem(raw: unknown): RateLimitItem {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const tt = String(o.targetType ?? o.target_type ?? 'global').toLowerCase();
  const targetType =
    tt === 'agent' || tt === 'skill' || tt === 'mcp' || tt === 'app' || tt === 'dataset' || tt === 'quota'
      ? tt
      : 'global';
  return {
    id: num(o.id),
    name: String(o.name ?? ''),
    targetType,
    targetId: o.targetId != null ? num(o.targetId) : o.target_id != null ? num(o.target_id) : null,
    targetName: String(o.targetName ?? o.target_name ?? ''),
    maxRequestsPerMin: num(o.maxRequestsPerMin ?? o.max_requests_per_min),
    maxRequestsPerHour: num(o.maxRequestsPerHour ?? o.max_requests_per_hour),
    maxConcurrent: num(o.maxConcurrent ?? o.max_concurrent),
    enabled: o.enabled === undefined ? true : Boolean(o.enabled),
    createTime: String(o.createTime ?? o.create_time ?? ''),
    updateTime: String(o.updateTime ?? o.update_time ?? ''),
  };
}

export const quotaService = {
  listQuotas: async (params?: { page?: number; pageSize?: number; subjectType?: string; resourceCategory?: string }) => {
    const raw = await http.get<unknown>('/quotas', {
      params: { page: 1, pageSize: 500, ...params },
    });
    return normalizePaginated<QuotaItem>(raw, mapQuotaItem);
  },

  getQuota: async (id: number) => {
    const row = await http.get<unknown>(`/quotas/${id}`);
    return mapQuotaItem(row);
  },

  createQuota: async (payload: QuotaCreatePayload) => {
    const row = await http.post<unknown>('/quotas', payload);
    return mapQuotaItem(row);
  },

  updateQuota: (payload: {
    id: number;
    dailyLimit: number;
    monthlyLimit: number;
    targetName?: string;
    resourceCategory?: QuotaResourceCategory;
  }) =>
    http.put<void>('/quotas', payload),

  deleteQuota: (id: number) =>
    http.delete<void>(`/quotas/${id}`),

  listRateLimits: async (params?: { page?: number; pageSize?: number; quotaId?: number }) => {
    const raw = await http.get<unknown>('/rate-limits', {
      params: { page: 1, pageSize: 500, ...params },
    });
    return normalizePaginated<RateLimitItem>(raw, mapRateLimitItem);
  },

  getRateLimit: async (id: number) => {
    const row = await http.get<unknown>(`/rate-limits/${id}`);
    return mapRateLimitItem(row);
  },

  createRateLimit: async (payload: RateLimitCreatePayload) => {
    const row = await http.post<unknown>('/rate-limits', payload);
    return mapRateLimitItem(row);
  },

  deleteRateLimit: (id: number) =>
    http.delete<void>(`/rate-limits/${id}`),

  toggleRateLimit: (id: number, enabled: boolean) =>
    http.patch<void>(`/rate-limits/${id}`, { enabled }),
};
