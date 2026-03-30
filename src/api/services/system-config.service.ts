import { http } from '../../lib/http';
import type { PaginatedData, PaginationParams } from '../../types/api';
import { extractArray, normalizePaginated } from '../../utils/normalizeApiPayload';
import type {
  AuditLogEntry,
  CreateModelConfigDTO,
  CreateRateLimitDTO,
  ModelConfig,
  RateLimitRule,
  SecuritySetting,
  SystemParam,
} from '../../types/dto/system-config';
import type { AnnouncementItem } from '../../types/dto/explore';

const RATE_LIMIT_TARGETS = new Set<RateLimitRule['target']>(['user', 'role', 'ip', 'api_key', 'global']);
const RATE_LIMIT_ACTIONS = new Set<RateLimitRule['action']>(['reject', 'queue', 'throttle']);

function numRl(v: unknown, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function mapRateLimitRuleRecord(raw: unknown): RateLimitRule {
  if (raw == null || typeof raw !== 'object') {
    return {
      id: '',
      name: '',
      target: 'global',
      windowMs: 0,
      maxRequests: 0,
      action: 'reject',
      enabled: true,
      priority: 0,
      createdAt: '',
      updatedAt: '',
    };
  }
  const o = raw as Record<string, unknown>;
  const targetRaw = String(o.target ?? 'global');
  const target = RATE_LIMIT_TARGETS.has(targetRaw as RateLimitRule['target'])
    ? (targetRaw as RateLimitRule['target'])
    : 'global';
  const actionRaw = String(o.action ?? 'reject');
  const action = RATE_LIMIT_ACTIONS.has(actionRaw as RateLimitRule['action'])
    ? (actionRaw as RateLimitRule['action'])
    : 'reject';
  const windowMs = numRl(o.windowMs ?? (o as { window_ms?: unknown }).window_ms, 60000);
  const maxRequests = numRl(o.maxRequests ?? (o as { max_requests?: unknown }).max_requests, 0);
  const burstLimit = o.burstLimit ?? (o as { burst_limit?: unknown }).burst_limit;
  const maxTokens = o.maxTokens ?? (o as { max_tokens?: unknown }).max_tokens;

  return {
    id: String(o.id ?? ''),
    name: String(o.name ?? ''),
    target,
    targetValue: o.targetValue != null ? String(o.targetValue) : (o as { target_value?: unknown }).target_value != null
      ? String((o as { target_value: unknown }).target_value)
      : undefined,
    windowMs,
    maxRequests,
    maxTokens: maxTokens != null ? numRl(maxTokens, 0) : undefined,
    burstLimit: burstLimit != null ? numRl(burstLimit, 0) : undefined,
    action,
    enabled: o.enabled === undefined ? true : Boolean(o.enabled),
    priority: numRl(o.priority, 0),
    createdAt: String(o.createdAt ?? (o as { created_at?: unknown }).created_at ?? ''),
    updatedAt: String(o.updatedAt ?? (o as { updated_at?: unknown }).updated_at ?? ''),
  };
}

/** 兼容裸数组、list/records/data/items 等分页包装 */
function normalizeRateLimitsListPayload(raw: unknown): RateLimitRule[] {
  if (raw == null) return [];
  if (Array.isArray(raw)) return raw.map(mapRateLimitRuleRecord);
  if (typeof raw === 'object') {
    const o = raw as Record<string, unknown>;
    const inner =
      (Array.isArray(o.list) ? o.list : null)
      ?? (Array.isArray(o.records) ? o.records : null)
      ?? (Array.isArray(o.data) ? o.data : null)
      ?? (Array.isArray(o.items) ? o.items : null);
    if (!inner) return [];
    return inner.map(mapRateLimitRuleRecord);
  }
  return [];
}

function mapAnnouncementRecord(raw: unknown): AnnouncementItem {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  return {
    id: o.id != null ? String(o.id) : '',
    title: String(o.title ?? ''),
    summary: String(o.summary ?? ''),
    content: o.content == null ? undefined : String(o.content),
    type: String(o.type ?? 'notice') as AnnouncementItem['type'],
    pinned: o.pinned == null ? undefined : Boolean(o.pinned),
    enabled: o.enabled == null ? undefined : Boolean(o.enabled),
    createdBy: o.createdBy == null ? undefined : String(o.createdBy),
    createdByName: o.createdByName == null ? undefined : String(o.createdByName),
    deleted: o.deleted == null ? undefined : Number(o.deleted),
    createdAt: String(o.createdAt ?? o.createTime ?? ''),
    updatedAt: String(o.updatedAt ?? o.updateTime ?? ''),
    url: o.url == null ? undefined : String(o.url),
  };
}

export const systemConfigService = {
  listModelConfigs: async (params?: PaginationParams) => {
    const raw = await http.get<unknown>('/system-config/model-configs', { params });
    return normalizePaginated<ModelConfig>(raw);
  },

  createModelConfig: (data: CreateModelConfigDTO) =>
    http.post<ModelConfig>('/system-config/model-configs', data),

  updateModelConfig: (id: string, data: Partial<CreateModelConfigDTO>) =>
    http.put<ModelConfig>(`/system-config/model-configs/${id}`, data),

  deleteModelConfig: (id: string) =>
    http.delete(`/system-config/model-configs/${id}`),

  getModelConfigById: (id: string) =>
    http.get<ModelConfig>(`/system-config/model-configs/${id}`),

  listRateLimits: async () => {
    const raw = await http.get<unknown>('/system-config/rate-limits');
    return normalizeRateLimitsListPayload(raw);
  },

  createRateLimit: (data: CreateRateLimitDTO) =>
    http.post<RateLimitRule>('/system-config/rate-limits', data),

  updateRateLimit: (id: string, data: Partial<CreateRateLimitDTO>) =>
    http.put<RateLimitRule>(`/system-config/rate-limits/${id}`, data),

  deleteRateLimit: (id: string) =>
    http.delete(`/system-config/rate-limits/${id}`),

  getRateLimitById: (id: string) =>
    http.get<RateLimitRule>(`/system-config/rate-limits/${id}`),

  listAuditLogs: async (params?: PaginationParams) => {
    const raw = await http.get<unknown>('/system-config/audit-logs', { params });
    return normalizePaginated<AuditLogEntry>(raw);
  },

  getParams: async () => {
    const raw = await http.get<unknown>('/system-config/params');
    return extractArray<SystemParam>(raw);
  },

  updateParams: (data: { key: string; value: string }[]) =>
    http.put<SystemParam[]>('/system-config/params', data),

  getSecurity: async () => {
    const raw = await http.get<unknown>('/system-config/security');
    return extractArray<SecuritySetting>(raw);
  },

  updateSecurity: (data: SecuritySetting[]) =>
    http.put<SecuritySetting[]>('/system-config/security', data),

  applyNetworkWhitelist: (rules: string[]) =>
    http.post<void>('/system-config/network/apply', { rules }),

  publishAcl: (rules: unknown[]) =>
    http.post<void>('/system-config/acl/publish', { rules }),

  listAnnouncements: async (params?: {
    page?: number;
    pageSize?: number;
    /** 后端就绪后透传；当前文档未保证，未实现时由服务端忽略 */
    keyword?: string;
    type?: string;
  }) => {
    const raw = await http.get<unknown>('/system-config/announcements', { params });
    const pageData = normalizePaginated<AnnouncementItem>(raw);
    return {
      ...pageData,
      list: (pageData.list ?? []).map((item) => mapAnnouncementRecord(item)),
    };
  },

  createAnnouncement: (data: import('../../types/dto/explore').AnnouncementCreateRequest) =>
    http.post<AnnouncementItem>('/system-config/announcements', data).then(mapAnnouncementRecord),

  updateAnnouncement: (id: string, data: Partial<import('../../types/dto/explore').AnnouncementCreateRequest>) =>
    http.put<void>(`/system-config/announcements/${id}`, data),

  deleteAnnouncement: (id: string) =>
    http.delete<void>(`/system-config/announcements/${id}`),
};
