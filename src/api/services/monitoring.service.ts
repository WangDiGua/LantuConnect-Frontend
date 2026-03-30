import { http } from '../../lib/http';
import type { PaginationParams } from '../../types/api';

export type CallLogListParams = PaginationParams & {
  keyword?: string;
  /** success | error | timeout；不传表示全部 */
  status?: string;
};

export type AlertListParams = PaginationParams & {
  keyword?: string;
  severity?: string;
  /** firing | resolved | silenced；不传表示全部 */
  alertStatus?: string;
};
import { extractArray, normalizePaginated } from '../../utils/normalizeApiPayload';
import type {
  AlertRecord,
  AlertRule,
  AlertRuleDryRunRequest,
  CallLogEntry,
  CreateAlertRulePayload,
  KpiMetric,
  PerformanceMetric,
  TraceSpan,
} from '../../types/dto/monitoring';

function numRule(v: unknown, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function mapAlertRuleRecord(raw: unknown): AlertRule {
  if (raw == null || typeof raw !== 'object') {
    return {
      id: '',
      name: '',
      description: '',
      metric: '',
      condition: 'gt',
      operator: 'gt',
      threshold: 0,
      duration: '',
      severity: 'info',
      enabled: true,
      channels: [],
      notifyChannels: [],
      createdAt: '',
      updatedAt: '',
    };
  }
  const o = raw as Record<string, unknown>;
  const opRaw = String(o.operator ?? o.condition ?? 'gt');
  const operator = (['gt', 'lt', 'eq', 'gte', 'lte'].includes(opRaw) ? opRaw : 'gt') as AlertRule['operator'];
  const sevRaw = String(o.severity ?? 'info');
  const severity = (['critical', 'warning', 'info'].includes(sevRaw) ? sevRaw : 'info') as AlertRule['severity'];
  const channels = Array.isArray(o.channels) ? (o.channels as string[]) : [];
  const notifyRaw = o.notifyChannels ?? (o as { notify_channels?: unknown }).notify_channels;
  const notifyChannels = Array.isArray(notifyRaw) ? (notifyRaw as string[]) : channels;

  return {
    id: String(o.id ?? (o as { ruleId?: unknown }).ruleId ?? ''),
    name: String(o.name ?? ''),
    description: String(o.description ?? ''),
    metric: String(o.metric ?? ''),
    condition: operator,
    operator,
    threshold: numRule(o.threshold, 0),
    duration: String(o.duration ?? ''),
    severity,
    enabled: o.enabled === undefined ? true : Boolean(o.enabled),
    channels,
    notifyChannels,
    createdAt: String(o.createdAt ?? (o as { created_at?: unknown }).created_at ?? ''),
    updatedAt: String(o.updatedAt ?? (o as { updated_at?: unknown }).updated_at ?? ''),
  };
}

/** 兼容裸数组、list/records/data/items 等分页包装 */
function normalizeAlertRulesListPayload(raw: unknown): AlertRule[] {
  if (raw == null) return [];
  if (Array.isArray(raw)) return raw.map(mapAlertRuleRecord);
  if (typeof raw === 'object') {
    const o = raw as Record<string, unknown>;
    const inner =
      (Array.isArray(o.list) ? o.list : null)
      ?? (Array.isArray(o.records) ? o.records : null)
      ?? (Array.isArray(o.data) ? o.data : null)
      ?? (Array.isArray(o.items) ? o.items : null);
    if (!inner) return [];
    return inner.map(mapAlertRuleRecord);
  }
  return [];
}

export const monitoringService = {
  getKpis: async () => {
    const raw = await http.get<unknown>('/monitoring/kpis');
    return extractArray<KpiMetric>(raw);
  },

  listCallLogs: async (params?: CallLogListParams) => {
    const raw = await http.get<unknown>('/monitoring/call-logs', { params });
    return normalizePaginated<CallLogEntry>(raw);
  },

  listAlerts: async (params?: AlertListParams) => {
    const { alertStatus, ...rest } = params ?? {};
    const statusFilter = alertStatus && alertStatus !== 'all' ? alertStatus : undefined;
    const raw = await http.get<unknown>('/monitoring/alerts', {
      params: {
        ...rest,
        ...(statusFilter ? { status: statusFilter } : {}),
      },
    });
    return normalizePaginated<AlertRecord>(raw);
  },

  listAlertRules: async () => {
    const raw = await http.get<unknown>('/monitoring/alert-rules');
    return normalizeAlertRulesListPayload(raw);
  },

  createAlertRule: (data: CreateAlertRulePayload) =>
    http.post<AlertRule>('/monitoring/alert-rules', data),

  updateAlertRule: (id: string, data: Partial<CreateAlertRulePayload>) =>
    http.put<AlertRule>(`/monitoring/alert-rules/${id}`, data),

  deleteAlertRule: (id: string) =>
    http.delete(`/monitoring/alert-rules/${id}`),

  getAlertRuleById: (id: string) =>
    http.get<AlertRule>(`/monitoring/alert-rules/${id}`),

  dryRunAlertRule: (id: string, data?: AlertRuleDryRunRequest) =>
    http.post<{ triggered: boolean; matchedRecords?: number; message?: string }>(
      `/monitoring/alert-rules/${id}/dry-run`,
      data,
    ),

  listTraces: async (params?: PaginationParams) => {
    const raw = await http.get<unknown>('/monitoring/traces', { params });
    return normalizePaginated<TraceSpan>(raw);
  },

  getPerformanceMetrics: async () => {
    const raw = await http.get<unknown>('/monitoring/performance');
    return extractArray<PerformanceMetric>(raw);
  },
};
