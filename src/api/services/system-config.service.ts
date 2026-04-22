import { http } from '../../lib/http';
import { tryBatchPost } from '../../utils/batchApi';
import { runWithConcurrency } from '../../utils/runWithConcurrency';
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
  RobotFactoryAvailableResource,
  RobotFactoryCorpMapping,
  RobotFactoryProjection,
  RobotFactorySettings,
  RobotFactorySettingsHealth,
  RobotFactorySyncLog,
  SecuritySetting,
  SystemParam,
} from '../../types/dto/system-config';
import type { AnnouncementItem } from '../../types/dto/explore';

const RATE_LIMIT_TARGETS = new Set<RateLimitRule['target']>(['user', 'role', 'ip', 'api_key', 'global', 'path']);
const RATE_LIMIT_ACTIONS = new Set<RateLimitRule['action']>(['reject', 'queue', 'throttle']);

const SECURITY_SETTING_TYPES = new Set([
  'toggle',
  'input',
  'select',
  'boolean',
  'number',
  'string',
]);

function parseSecurityOptionsRaw(raw: unknown): string[] | undefined {
  if (raw == null) return undefined;
  if (Array.isArray(raw)) {
    const out = raw.map((x) => String(x)).filter((s) => s.length > 0);
    return out.length ? out : undefined;
  }
  if (typeof raw === 'string') {
    const t = raw.trim();
    if (!t) return undefined;
    try {
      const j = JSON.parse(t) as unknown;
      if (Array.isArray(j)) {
        const out = j.map((x) => String(x)).filter((s) => s.length > 0);
        return out.length ? out : undefined;
      }
    } catch {
      return undefined;
    }
  }
  return undefined;
}

/** 与后端 SecuritySetting 实体对齐，并解析 options JSON */
export function mapSecuritySettingRecord(raw: unknown): SecuritySetting {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const typeRaw = String(o.type ?? 'string').toLowerCase();
  const type: SecuritySetting['type'] = SECURITY_SETTING_TYPES.has(typeRaw)
    ? (typeRaw as SecuritySetting['type'])
    : 'string';
  const options = parseSecurityOptionsRaw(o.options);

  let value: SecuritySetting['value'];
  if (type === 'toggle' || type === 'boolean') {
    const sv = String(o.value ?? '').trim().toLowerCase();
    value = sv === 'true' || sv === '1' || sv === 'yes';
  } else if (type === 'number') {
    const n = Number(o.value);
    value = Number.isFinite(n) ? n : 0;
  } else {
    value = o.value == null ? '' : String(o.value);
  }

  return {
    key: String(o.key ?? ''),
    value,
    label: String(o.label ?? o.key ?? ''),
    description: String(o.description ?? ''),
    type,
    options,
    category: String(o.category ?? ''),
  };
}

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

function mapRobotFactoryCorpMapping(raw: unknown): RobotFactoryCorpMapping {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  return {
    id: String(o.id ?? ''),
    schoolId: String(o.schoolId ?? ''),
    schoolNameSnapshot: o.schoolNameSnapshot == null ? undefined : String(o.schoolNameSnapshot),
    corpId: String(o.corpId ?? ''),
    enabled: o.enabled === undefined ? true : Boolean(o.enabled),
    remark: o.remark == null ? undefined : String(o.remark),
    createTime: o.createTime == null ? undefined : String(o.createTime),
    updateTime: o.updateTime == null ? undefined : String(o.updateTime),
  };
}

function mapRobotFactoryAvailableResource(raw: unknown): RobotFactoryAvailableResource {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  return {
    resourceId: String(o.resourceId ?? ''),
    resourceCode: o.resourceCode == null ? undefined : String(o.resourceCode),
    displayName: String(o.displayName ?? ''),
    description: o.description == null ? undefined : String(o.description),
    schoolId: o.schoolId == null ? undefined : String(o.schoolId),
  };
}

function mapRobotFactorySettings(raw: unknown): RobotFactorySettings {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const allowedIpsRaw = Array.isArray(o.allowedIps) ? o.allowedIps : [];
  return {
    dbUrl: o.dbUrl == null ? undefined : String(o.dbUrl),
    dbUsername: o.dbUsername == null ? undefined : String(o.dbUsername),
    dbPassword: o.dbPassword == null ? undefined : String(o.dbPassword),
    dbDriverClassName: o.dbDriverClassName == null ? undefined : String(o.dbDriverClassName),
    publicBaseUrl: o.publicBaseUrl == null ? undefined : String(o.publicBaseUrl),
    allowedIps: allowedIpsRaw.map((item) => String(item)).filter(Boolean),
    sessionIdleMinutes: o.sessionIdleMinutes == null ? undefined : Number(o.sessionIdleMinutes),
    sessionMaxLifetimeMinutes: o.sessionMaxLifetimeMinutes == null ? undefined : Number(o.sessionMaxLifetimeMinutes),
    invokeTimeoutSeconds: o.invokeTimeoutSeconds == null ? undefined : Number(o.invokeTimeoutSeconds),
    updateTime: o.updateTime == null ? undefined : String(o.updateTime),
  };
}

function mapRobotFactorySettingsHealth(raw: unknown): RobotFactorySettingsHealth {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  return {
    configured: Boolean(o.configured),
    databaseReachable: Boolean(o.databaseReachable),
    externalTableReady: Boolean(o.externalTableReady),
    status: String(o.status ?? ''),
    message: o.message == null ? undefined : String(o.message),
    checkedAt: o.checkedAt == null ? undefined : String(o.checkedAt),
  };
}

function mapRobotFactoryProjection(raw: unknown): RobotFactoryProjection {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  return {
    id: String(o.id ?? ''),
    resourceId: String(o.resourceId ?? ''),
    resourceType: String(o.resourceType ?? ''),
    resourceCode: o.resourceCode == null ? undefined : String(o.resourceCode),
    resourceStatus: o.resourceStatus == null ? undefined : String(o.resourceStatus),
    schoolId: o.schoolId == null ? undefined : String(o.schoolId),
    corpId: o.corpId == null ? undefined : String(o.corpId),
    scopeMode: String(o.scopeMode ?? 'school') === 'global' ? 'global' : 'school',
    projectionCode: String(o.projectionCode ?? ''),
    agentName: String(o.agentName ?? ''),
    displayName: String(o.displayName ?? ''),
    description: o.description == null ? undefined : String(o.description),
    displayTemplate: o.displayTemplate == null ? undefined : String(o.displayTemplate),
    agentType: o.agentType == null ? undefined : String(o.agentType),
    mode: o.mode == null ? undefined : String(o.mode),
    runtimeRole: o.runtimeRole == null ? undefined : String(o.runtimeRole),
    interactionMode: o.interactionMode == null ? undefined : String(o.interactionMode),
    dispatchMode: o.dispatchMode == null ? undefined : String(o.dispatchMode),
    autoSyncEnabled: Boolean(o.autoSyncEnabled),
    externalAgentId: o.externalAgentId == null ? undefined : String(o.externalAgentId),
    syncStatus: o.syncStatus == null ? undefined : String(o.syncStatus),
    syncMessage: o.syncMessage == null ? undefined : String(o.syncMessage),
    lastSyncedAt: o.lastSyncedAt == null ? undefined : String(o.lastSyncedAt),
    createTime: o.createTime == null ? undefined : String(o.createTime),
    updateTime: o.updateTime == null ? undefined : String(o.updateTime),
  };
}

function mapRobotFactorySyncLog(raw: unknown): RobotFactorySyncLog {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  return {
    id: String(o.id ?? ''),
    projectionId: o.projectionId == null ? undefined : String(o.projectionId),
    resourceId: o.resourceId == null ? undefined : String(o.resourceId),
    action: String(o.action ?? ''),
    success: Boolean(o.success),
    message: o.message == null ? undefined : String(o.message),
    requestSnapshotJson: o.requestSnapshotJson == null ? undefined : String(o.requestSnapshotJson),
    responseSnapshotJson: o.responseSnapshotJson == null ? undefined : String(o.responseSnapshotJson),
    createTime: o.createTime == null ? undefined : String(o.createTime),
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

  batchDeleteRateLimits: async (ids: string[]): Promise<void> => {
    if (!ids.length) return;
    await tryBatchPost(
      '/system-config/rate-limits/batch-delete',
      { ids },
      async () => {
        const r = await runWithConcurrency(ids, 4, async (id) => {
          await http.delete(`/system-config/rate-limits/${id}`);
        });
        if (r.errors.length) throw r.errors[0]!.error;
      },
    );
  },

  batchPatchRateLimits: async (ids: string[], data: Partial<CreateRateLimitDTO>): Promise<void> => {
    if (!ids.length) return;
    await tryBatchPost(
      '/system-config/rate-limits/batch',
      { ids, ...data },
      async () => {
        const r = await runWithConcurrency(ids, 4, async (id) => {
          await http.put<RateLimitRule>(`/system-config/rate-limits/${id}`, data);
        });
        if (r.errors.length) throw r.errors[0]!.error;
      },
    );
  },

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
    return extractArray<unknown>(raw).map(mapSecuritySettingRecord);
  },

  updateSecurity: async (items: SecuritySetting[]) => {
    for (const s of items) {
      await http.put<void>('/system-config/security', {
        settingKey: s.key,
        settingValue: securitySettingValueForApi(s.value),
      });
    }
  },

  /** GET：已保存的管理端白名单 CIDR（来自 t_system_param.admin_network_allowlist） */
  getNetworkAllowlist: async (): Promise<string[]> => {
    const raw = await http.get<unknown>('/system-config/network/allowlist');
    if (raw && typeof raw === 'object' && Array.isArray((raw as { rules?: unknown }).rules)) {
      return (raw as { rules: unknown[] }).rules.map((x) => String(x));
    }
    return [];
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

  /**
   * 批量更新公告。优先 POST `/system-config/announcements/batch`（body: ids + patch 字段）；
   * 若网关 404/405 则限并发逐条 PUT。
   */
  batchPatchAnnouncements: async (
    ids: string[],
    patch: Partial<import('../../types/dto/explore').AnnouncementCreateRequest>,
  ): Promise<void> => {
    if (!ids.length) return;
    await tryBatchPost(
      '/system-config/announcements/batch',
      { ids, ...patch },
      async () => {
        const r = await runWithConcurrency(ids, 4, async (id) => {
          await http.put<void>(`/system-config/announcements/${id}`, patch);
        });
        if (r.errors.length) throw r.errors[0]!.error;
      },
    );
  },

  /** 批量删除；优先 POST `/system-config/announcements/batch-delete` */
  batchDeleteAnnouncements: async (ids: string[]): Promise<void> => {
    if (!ids.length) return;
    await tryBatchPost(
      '/system-config/announcements/batch-delete',
      { ids },
      async () => {
        const r = await runWithConcurrency(ids, 4, async (id) => {
          await http.delete<void>(`/system-config/announcements/${id}`);
        });
        if (r.errors.length) throw r.errors[0]!.error;
      },
    );
  },

  listRobotFactoryCorpMappings: async () => {
    const raw = await http.get<unknown>('/system-config/robot-factory/corp-mappings');
    return extractArray(raw).map(mapRobotFactoryCorpMapping);
  },

  getRobotFactorySettings: async () => {
    const raw = await http.get<unknown>('/system-config/robot-factory/settings');
    return mapRobotFactorySettings(raw);
  },

  saveRobotFactorySettings: async (data: {
    dbUrl?: string;
    dbUsername?: string;
    dbPassword?: string;
    dbDriverClassName?: string;
    publicBaseUrl?: string;
    allowedIps?: string[];
    sessionIdleMinutes?: number;
    sessionMaxLifetimeMinutes?: number;
    invokeTimeoutSeconds?: number;
  }) => {
    const raw = await http.put<unknown>('/system-config/robot-factory/settings', data);
    return mapRobotFactorySettings(raw);
  },

  testRobotFactorySettingsConnection: async (data: {
    dbUrl?: string;
    dbUsername?: string;
    dbPassword?: string;
    dbDriverClassName?: string;
    publicBaseUrl?: string;
    allowedIps?: string[];
    sessionIdleMinutes?: number;
    sessionMaxLifetimeMinutes?: number;
    invokeTimeoutSeconds?: number;
  }) => {
    const raw = await http.post<unknown>('/system-config/robot-factory/settings/test-connection', data);
    return mapRobotFactorySettingsHealth(raw);
  },

  getRobotFactorySettingsHealth: async () => {
    const raw = await http.get<unknown>('/system-config/robot-factory/settings/health');
    return mapRobotFactorySettingsHealth(raw);
  },

  listRobotFactoryAvailableResources: async (params?: { keyword?: string; limit?: number }) => {
    const raw = await http.get<unknown>('/system-config/robot-factory/available-resources', { params });
    return extractArray(raw).map(mapRobotFactoryAvailableResource);
  },

  createRobotFactoryCorpMapping: (data: {
    schoolId: number;
    schoolNameSnapshot?: string;
    corpId: number;
    enabled?: boolean;
    remark?: string;
  }) => http.post<RobotFactoryCorpMapping>('/system-config/robot-factory/corp-mappings', data).then(mapRobotFactoryCorpMapping),

  updateRobotFactoryCorpMapping: (id: string, data: {
    schoolId: number;
    schoolNameSnapshot?: string;
    corpId: number;
    enabled?: boolean;
    remark?: string;
  }) => http.put<RobotFactoryCorpMapping>(`/system-config/robot-factory/corp-mappings/${id}`, data).then(mapRobotFactoryCorpMapping),

  listRobotFactoryProjections: async (params?: {
    page?: number;
    pageSize?: number;
    syncStatus?: string;
    autoSyncEnabled?: boolean;
    schoolId?: number;
    keyword?: string;
  }) => {
    const raw = await http.get<unknown>('/system-config/robot-factory/projections', { params });
    const pageData = normalizePaginated<RobotFactoryProjection>(raw, mapRobotFactoryProjection);
    return {
      ...pageData,
      list: pageData.list.map(mapRobotFactoryProjection),
    };
  },

  getRobotFactoryProjection: async (id: string) => {
    const raw = await http.get<unknown>(`/system-config/robot-factory/projections/${id}`);
    return mapRobotFactoryProjection(raw);
  },

  createRobotFactoryProjection: async (data: {
    resourceId: number;
    scopeMode?: 'global' | 'school';
    displayName?: string;
    description?: string;
    displayTemplate?: string;
    specJson?: string;
    parametersSchema?: string;
    autoSyncEnabled?: boolean;
  }) => {
    const raw = await http.post<unknown>('/system-config/robot-factory/projections', data);
    return mapRobotFactoryProjection(raw);
  },

  updateRobotFactoryProjection: async (id: string, data: {
    scopeMode?: 'global' | 'school';
    displayName?: string;
    description?: string;
    displayTemplate?: string;
    specJson?: string;
    parametersSchema?: string;
    autoSyncEnabled?: boolean;
  }) => {
    const raw = await http.put<unknown>(`/system-config/robot-factory/projections/${id}`, data);
    return mapRobotFactoryProjection(raw);
  },

  syncRobotFactoryProjection: async (id: string) => {
    const raw = await http.post<unknown>(`/system-config/robot-factory/projections/${id}/sync`);
    return mapRobotFactoryProjection(raw);
  },

  deleteRobotFactoryProjectionExternal: async (id: string) => {
    const raw = await http.delete<unknown>(`/system-config/robot-factory/projections/${id}/external`);
    return mapRobotFactoryProjection(raw);
  },

  setRobotFactoryProjectionAutoSync: async (id: string, enabled: boolean) => {
    const raw = await http.post<unknown>(`/system-config/robot-factory/projections/${id}/auto-sync`, { enabled });
    return mapRobotFactoryProjection(raw);
  },

  listRobotFactorySyncLogs: async (params?: {
    page?: number;
    pageSize?: number;
    projectionId?: number;
    success?: boolean;
    action?: string;
  }) => {
    const raw = await http.get<unknown>('/system-config/robot-factory/sync-logs', { params });
    const pageData = normalizePaginated<RobotFactorySyncLog>(raw, mapRobotFactorySyncLog);
    return {
      ...pageData,
      list: pageData.list.map(mapRobotFactorySyncLog),
    };
  },
};
