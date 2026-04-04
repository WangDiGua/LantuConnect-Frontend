import { http } from '../../lib/http';
import type { PaginationParams } from '../../types/api';

/** 审计日志列表 query（与网关约定：未支持时由后端忽略） */
export type AuditLogQueryParams = PaginationParams & {
  action?: string;
  keyword?: string;
  /** 五类资源关键字：匹配 action / resource 模糊包含 */
  resourceType?: string;
  /** 仅失败或仅成功；不传表示全部 */
  result?: 'success' | 'failure';
};

export type AclRuleRow = { id: string; path: string; roles: string };

function mapAclRuleRow(raw: unknown): AclRuleRow {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const path = String(o.path ?? o.pattern ?? '');
  const roles = String(o.roles ?? o.role ?? '');
  const idRaw = String(o.id ?? '').trim();
  return {
    id: idRaw || `r-${path}-${roles}`,
    path,
    roles,
  };
}
import { extractArray, normalizePaginated } from '../../utils/normalizeApiPayload';
import type {
  AuditLogEntry,
  CreateRateLimitDTO,
  RateLimitRule,
  SecuritySetting,
  SystemParam,
} from '../../types/dto/system-config';
import type { AnnouncementItem } from '../../types/dto/explore';

const RATE_LIMIT_TARGETS = new Set<RateLimitRule['target']>(['user', 'role', 'ip', 'api_key', 'global', 'path']);
const RATE_LIMIT_ACTIONS = new Set<RateLimitRule['action']>(['reject', 'queue', 'throttle']);

/** 与后端 SystemParam 序列化字段对齐（含 updateTime → updatedAt） */
function mapSystemParamRecord(raw: unknown): SystemParam {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const typeRaw = String(o.type ?? 'string').toLowerCase();
  const type: SystemParam['type'] =
    typeRaw === 'number' || typeRaw === 'boolean' || typeRaw === 'json' ? typeRaw : 'string';
  return {
    key: String(o.key ?? ''),
    value: o.value == null ? '' : String(o.value),
    type,
    description: String(o.description ?? ''),
    category: String(o.category ?? ''),
    editable: o.editable === undefined ? true : Boolean(o.editable),
    updatedAt: String(o.updatedAt ?? o.updateTime ?? ''),
  };
}

/** 与后端 `SecuritySettingUpsertRequest.settingValue` 对齐 */
export function securitySettingValueForApi(value: SecuritySetting['value']): string {
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') return String(value);
  return String(value ?? '');
}

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

function mapAuditLogEntryRecord(raw: unknown): AuditLogEntry {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const resultRaw = String(o.result ?? 'success').toLowerCase();
  const result: AuditLogEntry['result'] = resultRaw === 'failure' || resultRaw === 'failed' || resultRaw === 'error' ? 'failure' : 'success';
  const createdAt = String(o.createdAt ?? o.createTime ?? o.create_time ?? o.created_at ?? o.time ?? '');
  return {
    id: String(o.id ?? ''),
    userId: String(o.userId ?? o.user_id ?? ''),
    username: String(o.username ?? o.userName ?? o.user_name ?? ''),
    action: String(o.action ?? ''),
    resource: String(o.resource ?? ''),
    resourceId: o.resourceId == null && o.resource_id == null ? undefined : String(o.resourceId ?? o.resource_id),
    details: String(o.details ?? o.detail ?? ''),
    ip: String(o.ip ?? ''),
    userAgent: String(o.userAgent ?? o.user_agent ?? ''),
    result,
    createdAt,
    time: String(o.time ?? createdAt),
    operator: String(o.operator ?? o.username ?? ''),
    target: String(o.target ?? o.resource ?? ''),
  };
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

  listAuditLogs: async (params?: AuditLogQueryParams) => {
    const raw = await http.get<unknown>('/system-config/audit-logs', { params });
    return normalizePaginated<AuditLogEntry>(raw, mapAuditLogEntryRecord);
  },

  getParams: async () => {
    const raw = await http.get<unknown>('/system-config/params');
    return extractArray<unknown>(raw).map(mapSystemParamRecord);
  },

  /** 后端单条 upsert：`paramKey` / `paramValue` / `description`；按条顺序提交 */
  updateParams: async (items: SystemParam[]) => {
    for (const p of items) {
      await http.put<void>('/system-config/params', {
        paramKey: p.key,
        paramValue: p.value,
        description: p.description,
      });
    }
  },

  getSecurity: async () => {
    const raw = await http.get<unknown>('/system-config/security');
    return extractArray<SecuritySetting>(raw);
  },

  updateSecurity: async (items: SecuritySetting[]) => {
    for (const s of items) {
      await http.put<void>('/system-config/security', {
        settingKey: s.key,
        settingValue: securitySettingValueForApi(s.value),
      });
    }
  },

  applyNetworkWhitelist: (rules: string[]) =>
    http.post<void>('/system-config/network/apply', { rules }),

  /** GET：返回规则数组或 `{ rules: [...] }` */
  getAclRules: async (): Promise<AclRuleRow[]> => {
    const raw = await http.get<unknown>('/system-config/acl');
    if (Array.isArray(raw)) return raw.map(mapAclRuleRow);
    if (raw && typeof raw === 'object') {
      const o = raw as Record<string, unknown>;
      const inner = (Array.isArray(o.rules) ? o.rules : null)
        ?? (Array.isArray(o.list) ? o.list : null)
        ?? (Array.isArray(o.data) ? o.data : null);
      if (Array.isArray(inner)) return inner.map(mapAclRuleRow);
    }
    return [];
  },

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
