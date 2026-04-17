import { http } from '../../lib/http';
import type { PaginationParams } from '../../types/api';
import { extractArray, normalizePaginated } from '../../utils/normalizeApiPayload';
import type {
  AlertBatchActionRequest,
  AlertEventAction,
  AlertEventDetail,
  AlertNotification,
  AlertRecord,
  AlertRule,
  AlertRuleDryRunRequest,
  AlertRuleDryRunResult,
  AlertRuleMetricOption,
  AlertRuleScopeOptionResponse,
  CallLogEntry,
  CallSummaryByResourceRow,
  CreateAlertRulePayload,
  KpiMetric,
  PerformanceMetric,
  QualityHistoryPoint,
  AlertSummary,
  PerformanceAnalysis,
  PerformanceAnalysisSummary,
  PerformanceBucket,
  PerformanceWindow,
  PerformanceResourceLeaderboardItem,
  PerformanceSlowMethodItem,
  TraceDetail,
  TraceListItem,
  TraceQueryParams,
  TraceRootCause,
  TraceSpanDetail,
  TraceSpanLog,
  TraceStatus,
} from '../../types/dto/monitoring';

export type CallLogListParams = PaginationParams & {
  keyword?: string;
  status?: string;
  resourceType?: string;
  resourceId?: number;
};

export type AlertListParams = PaginationParams & {
  keyword?: string;
  severity?: string;
  alertStatus?: string;
  resourceType?: string;
  scopeType?: string;
  assignee?: string;
  ruleId?: string;
  onlyMine?: boolean;
};

export type AlertRuleListParams = PaginationParams & {
  keyword?: string;
  severity?: string;
  scopeType?: string;
  resourceType?: string;
  enabled?: boolean;
};

export type PerformanceAnalysisParams = {
  window?: PerformanceWindow;
  resourceType?: string;
  resourceId?: number;
};

export type TraceListParams = TraceQueryParams;

function parseNum(value: unknown, fallback = 0): number {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function toLower(value: unknown, fallback = ''): string {
  const text = String(value ?? fallback).trim().toLowerCase();
  return text || fallback;
}

function mapOperator(raw: unknown): AlertRule['operator'] {
  switch (toLower(raw, 'gte')) {
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

function mapSeverity(raw: unknown): AlertRecord['severity'] {
  const value = toLower(raw, 'info');
  return value === 'critical' || value === 'warning' || value === 'info' ? value : 'info';
}

function mapStatus(raw: unknown): AlertRecord['status'] {
  const value = toLower(raw, 'firing');
  return value === 'firing'
    || value === 'acknowledged'
    || value === 'silenced'
    || value === 'resolved'
    || value === 'reopened'
    ? value
    : 'firing';
}

function mapScopeType(raw: unknown): AlertRule['scopeType'] {
  const value = toLower(raw, 'global');
  return value === 'resource' || value === 'resource_type' || value === 'global' ? value : 'global';
}

function normalizeLabels(raw: unknown): Record<string, string> {
  const obj = asRecord(raw);
  return Object.fromEntries(Object.entries(obj).map(([key, value]) => [key, String(value ?? '')]));
}

function mapAlertRule(raw: unknown): AlertRule {
  const obj = asRecord(raw);
  const notifyChannelsRaw = obj.notifyChannels ?? obj.notify_channels;
  return {
    id: String(obj.id ?? ''),
    name: String(obj.name ?? ''),
    description: String(obj.description ?? ''),
    metric: String(obj.metric ?? ''),
    condition: mapOperator(obj.operator ?? obj.condition),
    operator: mapOperator(obj.operator ?? obj.condition),
    threshold: parseNum(obj.threshold, 0),
    duration: String(obj.duration ?? '5m'),
    severity: mapSeverity(obj.severity),
    enabled: obj.enabled === undefined ? true : Boolean(obj.enabled),
    channels: Array.isArray(obj.channels) ? (obj.channels as string[]) : [],
    notifyChannels: Array.isArray(notifyChannelsRaw) ? (notifyChannelsRaw as string[]) : [],
    createdAt: String(obj.createdAt ?? obj.createTime ?? obj.create_time ?? ''),
    updatedAt: String(obj.updatedAt ?? obj.updateTime ?? obj.update_time ?? ''),
    scopeType: mapScopeType(obj.scopeType ?? obj.scope_type),
    scopeResourceType: obj.scopeResourceType == null && obj.scope_resource_type == null
      ? undefined
      : String(obj.scopeResourceType ?? obj.scope_resource_type ?? '').toLowerCase(),
    scopeResourceId: obj.scopeResourceId == null && obj.scope_resource_id == null
      ? undefined
      : parseNum(obj.scopeResourceId ?? obj.scope_resource_id),
    labelFilters: normalizeLabels(obj.labelFilters ?? obj.label_filters_json),
  };
}

function mapAlertNotification(raw: unknown): AlertNotification {
  const obj = asRecord(raw);
  return {
    id: parseNum(obj.id),
    userId: obj.userId == null ? undefined : parseNum(obj.userId),
    title: String(obj.title ?? ''),
    body: String(obj.body ?? ''),
    severity: obj.severity == null ? undefined : String(obj.severity),
    read: obj.read == null ? undefined : Boolean(obj.read),
    createTime: String(obj.createTime ?? obj.create_time ?? ''),
  };
}

function mapAlertAction(raw: unknown): AlertEventAction {
  const obj = asRecord(raw);
  return {
    id: parseNum(obj.id),
    actionType: String(obj.actionType ?? obj.action_type ?? ''),
    operatorUserId: obj.operatorUserId == null && obj.operator_user_id == null
      ? undefined
      : parseNum(obj.operatorUserId ?? obj.operator_user_id),
    operatorName: obj.operatorName == null && obj.operator_name == null
      ? undefined
      : String(obj.operatorName ?? obj.operator_name ?? ''),
    note: obj.note == null ? undefined : String(obj.note),
    previousStatus: obj.previousStatus == null && obj.previous_status == null
      ? undefined
      : String(obj.previousStatus ?? obj.previous_status ?? ''),
    nextStatus: obj.nextStatus == null && obj.next_status == null
      ? undefined
      : String(obj.nextStatus ?? obj.next_status ?? ''),
    extra: asRecord(obj.extra),
    createTime: String(obj.createTime ?? obj.create_time ?? ''),
  };
}

function mapAlertRecord(raw: unknown): AlertRecord {
  const obj = asRecord(raw);
  return {
    id: String(obj.id ?? ''),
    ruleId: String(obj.ruleId ?? obj.rule_id ?? ''),
    ruleName: String(obj.ruleName ?? obj.rule_name ?? ''),
    severity: mapSeverity(obj.severity),
    status: mapStatus(obj.status),
    message: String(obj.message ?? ''),
    source: String(obj.source ?? ''),
    labels: normalizeLabels(obj.labels),
    firedAt: String(obj.firedAt ?? obj.fired_at ?? ''),
    resolvedAt: obj.resolvedAt == null && obj.resolved_at == null ? undefined : String(obj.resolvedAt ?? obj.resolved_at ?? ''),
    ackAt: obj.ackAt == null && obj.ack_at == null ? undefined : String(obj.ackAt ?? obj.ack_at ?? ''),
    silencedAt: obj.silencedAt == null && obj.silenced_at == null ? undefined : String(obj.silencedAt ?? obj.silenced_at ?? ''),
    reopenedAt: obj.reopenedAt == null && obj.reopened_at == null ? undefined : String(obj.reopenedAt ?? obj.reopened_at ?? ''),
    assigneeUserId: obj.assigneeUserId == null && obj.assignee_user_id == null
      ? undefined
      : parseNum(obj.assigneeUserId ?? obj.assignee_user_id),
    assigneeName: obj.assigneeName == null && obj.assignee_name == null
      ? undefined
      : String(obj.assigneeName ?? obj.assignee_name ?? ''),
    lastSampleValue: obj.lastSampleValue == null && obj.last_sample_value == null
      ? undefined
      : parseNum(obj.lastSampleValue ?? obj.last_sample_value),
    scopeType: obj.scopeType == null && obj.scope_type == null ? undefined : mapScopeType(obj.scopeType ?? obj.scope_type),
    scopeLabel: obj.scopeLabel == null && obj.scope_label == null ? undefined : String(obj.scopeLabel ?? obj.scope_label ?? ''),
    resourceType: obj.resourceType == null && obj.resource_type == null ? undefined : String(obj.resourceType ?? obj.resource_type ?? '').toLowerCase(),
    resourceId: obj.resourceId == null && obj.resource_id == null ? undefined : parseNum(obj.resourceId ?? obj.resource_id),
    resourceName: obj.resourceName == null && obj.resource_name == null ? undefined : String(obj.resourceName ?? obj.resource_name ?? ''),
    ruleMetric: obj.ruleMetric == null && obj.rule_metric == null ? undefined : String(obj.ruleMetric ?? obj.rule_metric ?? ''),
    ruleOperator: obj.ruleOperator == null && obj.rule_operator == null ? undefined : mapOperator(obj.ruleOperator ?? obj.rule_operator),
    ruleThreshold: obj.ruleThreshold == null && obj.rule_threshold == null ? undefined : parseNum(obj.ruleThreshold ?? obj.rule_threshold),
    ruleDuration: obj.ruleDuration == null && obj.rule_duration == null ? undefined : String(obj.ruleDuration ?? obj.rule_duration ?? ''),
    ruleExpression: obj.ruleExpression == null && obj.rule_expression == null ? undefined : String(obj.ruleExpression ?? obj.rule_expression ?? ''),
    triggerReason: obj.triggerReason == null && obj.trigger_reason == null ? undefined : String(obj.triggerReason ?? obj.trigger_reason ?? ''),
    activeSeconds: obj.activeSeconds == null && obj.active_seconds == null ? undefined : parseNum(obj.activeSeconds ?? obj.active_seconds),
    notificationCount: obj.notificationCount == null && obj.notification_count == null ? undefined : parseNum(obj.notificationCount ?? obj.notification_count),
  };
}

function mapAlertDetail(raw: unknown): AlertEventDetail {
  const obj = asRecord(raw);
  return {
    ...mapAlertRecord(raw),
    duration: obj.duration == null ? undefined : String(obj.duration),
    triggerSnapshot: asRecord(obj.triggerSnapshot ?? obj.trigger_snapshot),
    ruleSnapshot: asRecord(obj.ruleSnapshot ?? obj.rule_snapshot),
    actions: extractArray(obj.actions).map(mapAlertAction),
    notifications: extractArray(obj.notifications).map(mapAlertNotification),
  };
}

function mapKpiMetric(raw: unknown): KpiMetric {
  const obj = asRecord(raw);
  const name = String(obj.name ?? obj.id ?? '');
  const trend = parseNum(obj.changePercent, 0);
  const changeTypeRaw = String(obj.changeType ?? '').toLowerCase();
  const changeType: KpiMetric['changeType'] =
    changeTypeRaw === 'up' || changeTypeRaw === 'down' || changeTypeRaw === 'flat'
      ? changeTypeRaw
      : trend > 0
        ? 'up'
        : trend < 0
          ? 'down'
          : 'flat';
  return {
    name,
    label: name.replaceAll('_', ' ').toUpperCase(),
    value: String(obj.value ?? '0'),
    unit: String(obj.unit ?? ''),
    previousValue: obj.previousValue == null ? undefined : String(obj.previousValue),
    changePercent: obj.changePercent == null ? undefined : String(obj.changePercent),
    changeType,
    trend,
    up: changeType === 'up',
    sparkline: Array.isArray(obj.sparkline) ? (obj.sparkline as number[]) : undefined,
  };
}

function mapCallLogStatus(raw: unknown): CallLogEntry['status'] {
  const value = toLower(raw, 'success');
  if (value === 'error' || value === 'failure' || value === 'failed') return 'error';
  if (value === 'timeout') return 'timeout';
  return 'success';
}

function mapTraceStatus(raw: unknown): TraceStatus {
  return toLower(raw, 'success') === 'error' ? 'error' : 'success';
}

function mapCallLogEntry(raw: unknown): CallLogEntry {
  const obj = asRecord(raw);
  return {
    id: String(obj.id ?? ''),
    traceId: String(obj.traceId ?? obj.trace_id ?? ''),
    agentId: String(obj.agentId ?? obj.agent_id ?? ''),
    agentName: String(obj.agentName ?? obj.agent_name ?? ''),
    resourceType: obj.resourceType == null && obj.resource_type == null ? undefined : String(obj.resourceType ?? obj.resource_type ?? '').toLowerCase(),
    userId: String(obj.userId ?? obj.user_id ?? ''),
    method: String(obj.method ?? ''),
    status: mapCallLogStatus(obj.status),
    statusCode: parseNum(obj.statusCode ?? obj.status_code),
    latencyMs: parseNum(obj.latencyMs ?? obj.latency_ms),
    errorMessage: obj.errorMessage == null && obj.error_message == null ? undefined : String(obj.errorMessage ?? obj.error_message ?? ''),
    ip: String(obj.ip ?? ''),
    createdAt: String(obj.createdAt ?? obj.createTime ?? obj.create_time ?? ''),
  };
}

function mapTraceListItem(raw: unknown): TraceListItem {
  const obj = asRecord(raw);
  return {
    traceId: String(obj.traceId ?? obj.trace_id ?? ''),
    requestId: String(obj.requestId ?? obj.request_id ?? ''),
    rootOperation: String(obj.rootOperation ?? obj.root_operation ?? ''),
    entryService: String(obj.entryService ?? obj.entry_service ?? ''),
    rootResourceType: String(obj.rootResourceType ?? obj.root_resource_type ?? 'unknown').toLowerCase(),
    rootResourceId: obj.rootResourceId == null && obj.root_resource_id == null
      ? undefined
      : parseNum(obj.rootResourceId ?? obj.root_resource_id),
    rootResourceCode: String(obj.rootResourceCode ?? obj.root_resource_code ?? ''),
    rootDisplayName: String(obj.rootDisplayName ?? obj.root_display_name ?? ''),
    status: mapTraceStatus(obj.status),
    startedAt: String(obj.startedAt ?? obj.started_at ?? ''),
    durationMs: parseNum(obj.durationMs ?? obj.duration_ms),
    spanCount: parseNum(obj.spanCount ?? obj.span_count),
    errorSpanCount: parseNum(obj.errorSpanCount ?? obj.error_span_count),
    firstErrorMessage: obj.firstErrorMessage == null && obj.first_error_message == null
      ? undefined
      : String(obj.firstErrorMessage ?? obj.first_error_message ?? ''),
    userId: obj.userId == null && obj.user_id == null ? undefined : parseNum(obj.userId ?? obj.user_id),
    ip: obj.ip == null ? undefined : String(obj.ip),
  };
}

function mapTraceRootCause(raw: unknown): TraceRootCause | undefined {
  const obj = asRecord(raw);
  const message = String(obj.message ?? '').trim();
  if (!message) {
    return undefined;
  }
  return {
    spanId: obj.spanId == null && obj.span_id == null ? undefined : String(obj.spanId ?? obj.span_id ?? ''),
    operationName: obj.operationName == null && obj.operation_name == null
      ? undefined
      : String(obj.operationName ?? obj.operation_name ?? ''),
    serviceName: obj.serviceName == null && obj.service_name == null
      ? undefined
      : String(obj.serviceName ?? obj.service_name ?? ''),
    message,
  };
}

function mapTraceSpanLog(raw: unknown): TraceSpanLog {
  const obj = asRecord(raw);
  return {
    timestamp: String(obj.timestamp ?? obj.time ?? ''),
    message: String(obj.message ?? ''),
    context: asRecord(obj.context),
  };
}

function mapTraceSpanDetail(raw: unknown): TraceSpanDetail {
  const obj = asRecord(raw);
  return {
    id: String(obj.id ?? ''),
    traceId: String(obj.traceId ?? obj.trace_id ?? ''),
    parentId: obj.parentId == null && obj.parent_id == null ? null : String(obj.parentId ?? obj.parent_id),
    operationName: String(obj.operationName ?? obj.operation_name ?? ''),
    serviceName: String(obj.serviceName ?? obj.service_name ?? ''),
    startTime: String(obj.startTime ?? obj.start_time ?? ''),
    duration: parseNum(obj.duration),
    status: mapTraceStatus(obj.status),
    tags: asRecord(obj.tags),
    logs: extractArray(obj.logs).map(mapTraceSpanLog),
  };
}

function mapTraceDetail(raw: unknown): TraceDetail {
  const obj = asRecord(raw);
  return {
    summary: mapTraceListItem(obj.summary),
    rootCause: mapTraceRootCause(obj.rootCause ?? obj.root_cause),
    spans: extractArray(obj.spans).map(mapTraceSpanDetail),
    callLogs: extractArray(obj.callLogs ?? obj.call_logs).map(mapCallLogEntry),
  };
}

function mapPerformanceMetric(raw: unknown, index: number): PerformanceMetric {
  const obj = asRecord(raw);
  const requestCount = parseNum(obj.requestCount ?? obj.request_rate ?? obj.requests, 0);
  const avgLatency = parseNum(obj.avgLatencyMs ?? obj.avg_latency_ms ?? obj.latencyMs, 0);
  return {
    service: obj.service == null ? undefined : String(obj.service),
    timestamp: String(obj.timestamp ?? obj.bucket ?? `bucket-${index}`),
    cpu: parseNum(obj.cpu),
    memory: parseNum(obj.memory),
    disk: parseNum(obj.disk),
    network: parseNum(obj.network),
    requestRate: requestCount,
    errorRate: parseNum(obj.errorRate ?? obj.error_rate),
    p50Latency: parseNum(obj.p50Latency ?? obj.latencyP50, avgLatency),
    p95Latency: parseNum(obj.p95Latency ?? obj.latencyP95, avgLatency),
    p99Latency: parseNum(obj.p99Latency ?? obj.latencyP99, avgLatency),
    latencyP50: parseNum(obj.latencyP50 ?? obj.p50Latency, avgLatency),
    latencyP99: parseNum(obj.latencyP99 ?? obj.p99Latency, avgLatency),
    throughput: parseNum(obj.throughput, requestCount),
  };
}

function mapPerformanceSummary(raw: unknown): PerformanceAnalysisSummary {
  const obj = asRecord(raw);
  return {
    requestCount: parseNum(obj.requestCount),
    successCount: parseNum(obj.successCount),
    errorCount: parseNum(obj.errorCount),
    timeoutCount: parseNum(obj.timeoutCount),
    successRate: parseNum(obj.successRate),
    errorRate: parseNum(obj.errorRate),
    timeoutRate: parseNum(obj.timeoutRate),
    avgLatencyMs: parseNum(obj.avgLatencyMs),
    p50LatencyMs: parseNum(obj.p50LatencyMs),
    p95LatencyMs: parseNum(obj.p95LatencyMs),
    p99LatencyMs: parseNum(obj.p99LatencyMs),
  };
}

function mapPerformanceBucket(raw: unknown): PerformanceBucket {
  const obj = asRecord(raw);
  return {
    bucket: String(obj.bucket ?? obj.timestamp ?? ''),
    requestCount: parseNum(obj.requestCount),
    successCount: parseNum(obj.successCount),
    errorCount: parseNum(obj.errorCount),
    timeoutCount: parseNum(obj.timeoutCount),
    successRate: parseNum(obj.successRate),
    errorRate: parseNum(obj.errorRate),
    timeoutRate: parseNum(obj.timeoutRate),
    avgLatencyMs: parseNum(obj.avgLatencyMs),
    p50LatencyMs: parseNum(obj.p50LatencyMs ?? obj.p50Latency ?? obj.latencyP50),
    p95LatencyMs: parseNum(obj.p95LatencyMs ?? obj.p95Latency ?? obj.latencyP95),
    p99LatencyMs: parseNum(obj.p99LatencyMs ?? obj.p99Latency ?? obj.latencyP99),
    throughput: parseNum(obj.throughput),
  };
}

function mapPerformanceResourceLeaderboardItem(raw: unknown): PerformanceResourceLeaderboardItem {
  const obj = asRecord(raw);
  return {
    resourceType: String(obj.resourceType ?? obj.resource_type ?? 'unknown').toLowerCase(),
    resourceId: obj.resourceId == null && obj.resource_id == null
      ? undefined
      : parseNum(obj.resourceId ?? obj.resource_id),
    resourceName: String(obj.resourceName ?? obj.resource_name ?? '--'),
    requestCount: parseNum(obj.requestCount),
    errorCount: parseNum(obj.errorCount),
    timeoutCount: parseNum(obj.timeoutCount),
    errorRate: parseNum(obj.errorRate),
    timeoutRate: parseNum(obj.timeoutRate),
    avgLatencyMs: parseNum(obj.avgLatencyMs),
    p99LatencyMs: parseNum(obj.p99LatencyMs),
    lowSample: Boolean(obj.lowSample ?? obj.low_sample),
  };
}

function mapPerformanceSlowMethodItem(raw: unknown): PerformanceSlowMethodItem {
  const obj = asRecord(raw);
  return {
    method: String(obj.method ?? 'UNKNOWN'),
    requestCount: parseNum(obj.requestCount),
    errorCount: parseNum(obj.errorCount),
    errorRate: parseNum(obj.errorRate),
    avgLatencyMs: parseNum(obj.avgLatencyMs),
    p95LatencyMs: parseNum(obj.p95LatencyMs),
    p99LatencyMs: parseNum(obj.p99LatencyMs),
  };
}

function mapPerformanceAnalysis(raw: unknown): PerformanceAnalysis {
  const obj = asRecord(raw);
  return {
    window: String(obj.window ?? '24h'),
    resourceType: String(obj.resourceType ?? obj.resource_type ?? 'all').toLowerCase(),
    resourceId: obj.resourceId == null && obj.resource_id == null
      ? undefined
      : parseNum(obj.resourceId ?? obj.resource_id),
    summary: mapPerformanceSummary(obj.summary),
    buckets: extractArray(obj.buckets).map(mapPerformanceBucket),
    resourceLeaderboard: extractArray(obj.resourceLeaderboard ?? obj.resource_leaderboard)
      .map(mapPerformanceResourceLeaderboardItem),
    slowMethods: extractArray(obj.slowMethods ?? obj.slow_methods).map(mapPerformanceSlowMethodItem),
  };
}

function mapMetricOption(raw: unknown): AlertRuleMetricOption {
  if (typeof raw === 'string') {
    return { value: raw, label: raw };
  }
  const obj = asRecord(raw);
  return {
    value: String(obj.value ?? ''),
    label: String(obj.label ?? obj.value ?? ''),
    description: obj.description == null ? undefined : String(obj.description),
    unit: obj.unit == null ? undefined : String(obj.unit),
  };
}

function mapScopeOptions(raw: unknown): AlertRuleScopeOptionResponse {
  const obj = asRecord(raw);
  return {
    resourceTypes: extractArray(obj.resourceTypes).map((item) => String(item)),
    resources: extractArray(obj.resources).map((item) => {
      const row = asRecord(item);
      return {
        id: parseNum(row.id),
        resourceType: String(row.resourceType ?? row.resource_type ?? '').toLowerCase(),
        displayName: String(row.displayName ?? row.display_name ?? ''),
      };
    }),
  };
}

function normalizeAlertRulePayload(data: CreateAlertRulePayload): Record<string, unknown> {
  return {
    name: data.name,
    conditionExpr: data.description ?? '',
    metric: data.metric,
    operator: data.operator ?? data.condition ?? 'gte',
    threshold: data.threshold,
    duration: data.duration ?? '5m',
    severity: data.severity,
    enabled: typeof data.enabled === 'boolean' ? (data.enabled ? 1 : 0) : data.enabled ?? 1,
    notifyChannels: [],
    scopeType: data.scopeType ?? 'global',
    scopeResourceType: data.scopeResourceType,
    scopeResourceId: data.scopeResourceId,
    labelFilters: data.labelFilters ?? {},
  };
}

export const monitoringService = {
  listAlertRuleMetrics: async (): Promise<AlertRuleMetricOption[]> => {
    try {
      const raw = await http.get<unknown>('/monitoring/alert-rule-metrics');
      return extractArray(raw).map(mapMetricOption);
    } catch {
      return [
        { value: 'http_5xx_rate', label: '5xx 比率', unit: '%' },
        { value: 'latency_p99', label: 'P99 延迟', unit: 'ms' },
        { value: 'error_rate', label: '错误率', unit: '%' },
      ];
    }
  },

  getAlertRuleScopeOptions: async (): Promise<AlertRuleScopeOptionResponse> => {
    const raw = await http.get<unknown>('/monitoring/alert-rule-scopes/options');
    return mapScopeOptions(raw);
  },

  getAlertSummary: async (): Promise<AlertSummary> => {
    const raw = await http.get<unknown>('/monitoring/alerts/summary');
    const obj = asRecord(raw);
    return {
      firing: parseNum(obj.firing),
      acknowledged: parseNum(obj.acknowledged),
      silenced: parseNum(obj.silenced),
      resolvedToday: parseNum(obj.resolvedToday ?? obj.resolved_today),
      mine: parseNum(obj.mine),
      enabledRules: parseNum(obj.enabledRules ?? obj.enabled_rules),
    };
  },

  getAlertDetail: async (id: string): Promise<AlertEventDetail> => {
    const raw = await http.get<unknown>(`/monitoring/alerts/${id}`);
    return mapAlertDetail(raw);
  },

  listAlertActions: async (id: string): Promise<AlertEventAction[]> => {
    const raw = await http.get<unknown>(`/monitoring/alerts/${id}/actions`);
    return extractArray(raw).map(mapAlertAction);
  },

  ackAlert: async (id: string, note?: string) =>
    http.post<void>(`/monitoring/alerts/${id}/ack`, { note }),

  assignAlert: async (id: string, assigneeUserId: number, note?: string) =>
    http.post<void>(`/monitoring/alerts/${id}/assign`, { assigneeUserId, note }),

  silenceAlert: async (id: string, note?: string) =>
    http.post<void>(`/monitoring/alerts/${id}/silence`, { note }),

  resolveAlert: async (id: string, note?: string) =>
    http.post<void>(`/monitoring/alerts/${id}/resolve`, { note }),

  reopenAlert: async (id: string, note?: string) =>
    http.post<void>(`/monitoring/alerts/${id}/reopen`, { note }),

  batchAlertAction: async (payload: AlertBatchActionRequest) =>
    http.post<void>('/monitoring/alerts/batch-action', payload),

  getKpis: async () => {
    const raw = await http.get<unknown>('/monitoring/kpis');
    return extractArray(raw).map(mapKpiMetric);
  },

  listCallLogs: async (params?: CallLogListParams) => {
    const raw = await http.get<unknown>('/monitoring/call-logs', { params });
    return normalizePaginated<CallLogEntry>(raw, mapCallLogEntry);
  },

  listAlerts: async (params?: AlertListParams) => {
    const raw = await http.get<unknown>('/monitoring/alerts', {
      params: {
        ...params,
        status: params?.alertStatus,
      },
    });
    return normalizePaginated<AlertRecord>(raw, mapAlertRecord);
  },

  listAlertRules: async (params?: AlertRuleListParams) => {
    const raw = await http.get<unknown>('/monitoring/alert-rules', {
      params: {
        page: params?.page ?? 1,
        pageSize: params?.pageSize ?? 200,
        keyword: params?.keyword,
        scopeType: params?.scopeType,
        resourceType: params?.resourceType,
        enabled: params?.enabled,
        severity: params?.severity,
      },
    });
    return normalizePaginated<AlertRule>(raw, mapAlertRule);
  },

  createAlertRule: async (data: CreateAlertRulePayload) => {
    await http.post('/monitoring/alert-rules', normalizeAlertRulePayload(data));
  },

  updateAlertRule: async (id: string, data: Partial<CreateAlertRulePayload>) => {
    await http.put(`/monitoring/alert-rules/${id}`, normalizeAlertRulePayload({
      name: data.name ?? '',
      metric: data.metric ?? '',
      threshold: data.threshold ?? 0,
      severity: data.severity ?? 'warning',
      ...data,
    }));
  },

  deleteAlertRule: async (id: string) => {
    await http.delete(`/monitoring/alert-rules/${id}`);
  },

  getAlertRuleById: async (id: string) => {
    const raw = await http.get<unknown>(`/monitoring/alert-rules/${id}`);
    return mapAlertRule(raw);
  },

  dryRunAlertRule: async (id: string, data?: AlertRuleDryRunRequest) => {
    const raw = await http.post<unknown>(`/monitoring/alert-rules/${id}/dry-run`, data ?? { mode: 'preview' });
    const obj = asRecord(raw);
    return {
      wouldFire: Boolean(obj.wouldFire),
      operator: String(obj.operator ?? ''),
      threshold: parseNum(obj.threshold),
      sampleValue: parseNum(obj.sampleValue),
      detail: String(obj.detail ?? ''),
      sampleSource: obj.sampleSource == null ? undefined : String(obj.sampleSource),
      reason: obj.reason == null ? undefined : String(obj.reason),
      recoveryCandidate: obj.recoveryCandidate == null ? undefined : Boolean(obj.recoveryCandidate),
      snapshot: asRecord(obj.snapshot),
    } satisfies AlertRuleDryRunResult;
  },

  listTraces: async (params?: TraceListParams) => {
    const raw = await http.get<unknown>('/monitoring/traces', { params });
    return normalizePaginated<TraceListItem>(raw, mapTraceListItem);
  },

  getTraceDetail: async (traceId: string) => {
    const raw = await http.get<unknown>(`/monitoring/traces/${traceId}`);
    return mapTraceDetail(raw);
  },

  getPerformanceAnalysis: async (params?: PerformanceAnalysisParams) => {
    const raw = await http.get<unknown>('/monitoring/performance-analysis', {
      params: {
        window: params?.window ?? '24h',
        resourceType: params?.resourceType && params.resourceType !== 'all' ? params.resourceType : undefined,
        resourceId: params?.resourceId,
      },
    });
    return mapPerformanceAnalysis(raw);
  },

  getPerformanceMetrics: async (resourceType?: string) => {
    const raw = await http.get<unknown>('/monitoring/performance', {
      params: resourceType && resourceType !== 'all' ? { resourceType } : {},
    });
    return extractArray(raw).map((item, index) => mapPerformanceMetric(item, index));
  },

  getCallSummaryByResource: async (hours = 24): Promise<CallSummaryByResourceRow[]> => {
    const raw = await http.get<unknown>('/monitoring/call-summary-by-resource', { params: { hours } });
    return extractArray(raw).map((item) => {
      const obj = asRecord(item);
      return {
        type: String(obj.type ?? obj.resource_type ?? 'unknown').toLowerCase(),
        calls: parseNum(obj.calls),
        errors: parseNum(obj.errors),
        avgLatencyMs: parseNum(obj.avgLatencyMs ?? obj.avg_latency_ms),
      };
    });
  },

  getQualityHistory: async (resourceType: string, resourceId: number, params?: { from?: string; to?: string }) => {
    const raw = await http.get<unknown>(`/monitoring/resources/${resourceType}/${resourceId}/quality-history`, { params });
    return extractArray(raw).map((item) => {
      const obj = asRecord(item);
      return {
        bucketTime: String(obj.bucketTime ?? ''),
        callCount: parseNum(obj.callCount),
        successRate: parseNum(obj.successRate),
        avgLatencyMs: parseNum(obj.avgLatencyMs),
        qualityScore: parseNum(obj.qualityScore),
      } satisfies QualityHistoryPoint;
    });
  },
};
