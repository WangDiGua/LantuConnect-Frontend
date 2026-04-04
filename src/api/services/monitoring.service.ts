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
  AlertRuleDryRunResult,
  CallLogEntry,
  CreateAlertRulePayload,
  KpiMetric,
  PerformanceMetric,
  QualityHistoryPoint,
  TraceSpan,
} from '../../types/dto/monitoring';

function numRule(v: unknown, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeOperatorFromApi(raw: string): AlertRule['operator'] {
  const s = raw.trim().toLowerCase();
  switch (s) {
    case '>':
    case 'gt':
      return 'gt';
    case '>=':
    case 'ge':
    case 'gte':
      return 'gte';
    case '<':
    case 'lt':
      return 'lt';
    case '<=':
    case 'le':
    case 'lte':
      return 'lte';
    case '=':
    case 'eq':
      return 'eq';
    default:
      return 'gte';
  }
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
  const opRaw = String(o.operator ?? o.condition ?? 'gte');
  const operator = normalizeOperatorFromApi(opRaw);
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

function mapPerformanceMetric(raw: unknown, index: number): PerformanceMetric {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const requestCount = parseNum(o.requestCount ?? o.request_rate ?? o.requests, 0);
  const avgLatency = parseNum(o.avgLatencyMs ?? o.avg_latency_ms ?? o.latencyMs, 0);
  const ts = String(o.timestamp ?? o.bucket ?? `bucket-${index}`);
  return {
    service: String(o.service ?? ''),
    timestamp: ts,
    cpu: parseNum(o.cpu, 0),
    memory: parseNum(o.memory, 0),
    disk: parseNum(o.disk, 0),
    network: parseNum(o.network, 0),
    requestRate: requestCount,
    errorRate: parseNum(o.errorRate ?? o.error_rate, 0),
    p50Latency: parseNum(o.p50Latency ?? o.latencyP50 ?? avgLatency, avgLatency),
    p95Latency: parseNum(o.p95Latency ?? o.latencyP95 ?? avgLatency, avgLatency),
    p99Latency: parseNum(o.p99Latency ?? o.latencyP99 ?? avgLatency, avgLatency),
    latencyP50: parseNum(o.latencyP50 ?? o.p50Latency ?? avgLatency, avgLatency),
    latencyP99: parseNum(o.latencyP99 ?? o.p99Latency ?? avgLatency, avgLatency),
    throughput: parseNum(o.throughput ?? requestCount, requestCount),
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

const DEFAULT_ALERT_RULE_METRICS = ['http_5xx_rate', 'latency_p99', 'error_rate'] as const;

function toFixedText(value: number, fallback = '0'): string {
  return Number.isFinite(value) ? String(value) : fallback;
}

function parseNum(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function mapKpiMetric(raw: unknown): KpiMetric {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const name = String(o.name ?? o.id ?? '');
  const unit = String(o.unit ?? '');
  const value = String(o.value ?? '0');
  const previousValue = o.previousValue == null ? undefined : String(o.previousValue);
  const changePercentText = o.changePercent == null ? undefined : String(o.changePercent);
  const parsedTrend = parseNum(changePercentText, 0);
  const rawChangeType = String(o.changeType ?? '').toLowerCase();
  const changeType: KpiMetric['changeType'] =
    rawChangeType === 'up' || rawChangeType === 'down' || rawChangeType === 'flat'
      ? (rawChangeType as KpiMetric['changeType'])
      : (parsedTrend > 0 ? 'up' : parsedTrend < 0 ? 'down' : 'flat');
  return {
    name,
    label: name.replaceAll('_', ' ').toUpperCase(),
    value: unit && String(value).endsWith(unit) ? value : value,
    unit,
    previousValue,
    changePercent: changePercentText ?? toFixedText(parsedTrend),
    changeType,
    trend: parsedTrend,
    up: changeType === 'up',
    sparkline: Array.isArray(o.sparkline) ? (o.sparkline as number[]) : undefined,
  };
}

function mapCallLogStatus(raw: unknown): CallLogEntry['status'] {
  const s = String(raw ?? 'success').toLowerCase();
  if (s === 'error' || s === 'failure' || s === 'failed') return 'error';
  if (s === 'timeout') return 'timeout';
  return 'success';
}

function mapCallLogEntry(raw: unknown): CallLogEntry {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  return {
    id: String(o.id ?? ''),
    traceId: String(o.traceId ?? o.trace_id ?? ''),
    agentId: String(o.agentId ?? o.agent_id ?? ''),
    agentName: String(o.agentName ?? o.agent_name ?? ''),
    userId: String(o.userId ?? o.user_id ?? ''),
    model: String(o.model ?? ''),
    method: String(o.method ?? ''),
    status: mapCallLogStatus(o.status),
    statusCode: parseNum(o.statusCode ?? o.status_code, 0),
    latencyMs: parseNum(o.latencyMs ?? o.latency_ms, 0),
    inputTokens: parseNum(o.inputTokens ?? o.input_tokens, 0),
    outputTokens: parseNum(o.outputTokens ?? o.output_tokens, 0),
    cost: parseNum(o.cost, 0),
    errorMessage: o.errorMessage == null && o.error_message == null ? undefined : String(o.errorMessage ?? o.error_message),
    ip: String(o.ip ?? ''),
    createdAt: String(o.createdAt ?? o.createTime ?? o.create_time ?? o.created_at ?? ''),
  };
}

function mapAlertSeverity(raw: unknown): AlertRecord['severity'] {
  const s = String(raw ?? 'info').toLowerCase();
  return s === 'critical' || s === 'warning' || s === 'info' ? s : 'info';
}

function mapAlertStatus(raw: unknown): AlertRecord['status'] {
  const s = String(raw ?? 'firing').toLowerCase();
  return s === 'resolved' || s === 'silenced' || s === 'firing' ? s : 'firing';
}

function mapAlertRecordRow(raw: unknown): AlertRecord {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const labels = o.labels && typeof o.labels === 'object' ? (o.labels as Record<string, string>) : {};
  return {
    id: String(o.id ?? ''),
    ruleId: String(o.ruleId ?? o.rule_id ?? ''),
    ruleName: String(o.ruleName ?? o.rule_name ?? ''),
    severity: mapAlertSeverity(o.severity),
    status: mapAlertStatus(o.status),
    message: String(o.message ?? ''),
    source: String(o.source ?? ''),
    labels,
    firedAt: String(o.firedAt ?? o.fired_at ?? o.fire_time ?? ''),
    resolvedAt:
      o.resolvedAt == null && o.resolved_at == null ? undefined : String(o.resolvedAt ?? o.resolved_at ?? ''),
  };
}

function mapTraceSpanRow(raw: unknown): TraceSpan {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const parentRaw = o.parentId ?? o.parent_id;
  const parentId =
    parentRaw === null || parentRaw === undefined || parentRaw === '' ? null : String(parentRaw);
  const st = String(o.status ?? 'ok').toLowerCase();
  const status: TraceSpan['status'] = st === 'error' ? 'error' : 'ok';
  const tags = o.tags && typeof o.tags === 'object' ? (o.tags as Record<string, string>) : {};
  const logsRaw = o.logs;
  const logs = Array.isArray(logsRaw)
    ? (logsRaw as Record<string, unknown>[]).map((lg) => ({
        timestamp: String(lg.timestamp ?? lg.time ?? ''),
        message: String(lg.message ?? ''),
      }))
    : [];
  const ch = o.children;
  const children = Array.isArray(ch) ? ch.map(mapTraceSpanRow) : undefined;
  return {
    id: String(o.id ?? ''),
    traceId: String(o.traceId ?? o.trace_id ?? ''),
    parentId,
    operationName: String(o.operationName ?? o.operation_name ?? ''),
    service: String(o.service ?? ''),
    serviceName: String(o.serviceName ?? o.service_name ?? ''),
    startTime: String(o.startTime ?? o.start_time ?? ''),
    duration: parseNum(o.duration, 0),
    status,
    tags,
    logs,
    ...(children?.length ? { children } : {}),
  };
}

export const monitoringService = {
  /** 与后端 `GET /monitoring/alert-rule-metrics` 对齐；失败时回退默认三项。 */
  listAlertRuleMetrics: async (): Promise<string[]> => {
    try {
      const raw = await http.get<unknown>('/monitoring/alert-rule-metrics');
      if (Array.isArray(raw) && raw.length > 0) return raw.map((x) => String(x));
    } catch {
      /* fall back */
    }
    return [...DEFAULT_ALERT_RULE_METRICS];
  },

  getKpis: async () => {
    const raw = await http.get<unknown>('/monitoring/kpis');
    return extractArray(raw).map(mapKpiMetric);
  },

  listCallLogs: async (params?: CallLogListParams) => {
    const raw = await http.get<unknown>('/monitoring/call-logs', { params });
    return normalizePaginated<CallLogEntry>(raw, mapCallLogEntry);
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
    return normalizePaginated<AlertRecord>(raw, mapAlertRecordRow);
  },

  listAlertRules: async () => {
    const raw = await http.get<unknown>('/monitoring/alert-rules', {
      params: { page: 1, pageSize: 200 },
    });
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
    http.post<AlertRuleDryRunResult>(
      `/monitoring/alert-rules/${id}/dry-run`,
      data ?? { sampleValue: 0 },
    ),

  listTraces: async (params?: PaginationParams) => {
    const raw = await http.get<unknown>('/monitoring/traces', { params });
    return normalizePaginated<TraceSpan>(raw, mapTraceSpanRow);
  },

  getPerformanceMetrics: async () => {
    const raw = await http.get<unknown>('/monitoring/performance');
    return extractArray(raw).map((item, idx) => mapPerformanceMetric(item, idx));
  },

  getQualityHistory: async (resourceType: string, resourceId: number, params?: { from?: string; to?: string }) => {
    const raw = await http.get<unknown>(`/monitoring/resources/${resourceType}/${resourceId}/quality-history`, { params });
    return extractArray(raw).map((item) => {
      const o = item && typeof item === 'object' ? (item as Record<string, unknown>) : {};
      return {
        bucketTime: String(o.bucketTime ?? ''),
        callCount: parseNum(o.callCount),
        successRate: parseNum(o.successRate),
        avgLatencyMs: parseNum(o.avgLatencyMs),
        qualityScore: parseNum(o.qualityScore),
      } satisfies QualityHistoryPoint;
    });
  },
};
