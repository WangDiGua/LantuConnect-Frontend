export interface KpiMetric {
  name: string;
  label: string;
  value: string;
  unit: string;
  previousValue?: string;
  changePercent?: string;
  changeType: 'up' | 'down' | 'flat';
  trend: number;
  up: boolean;
  sparkline?: number[];
}

export interface QualityHistoryPoint {
  bucketTime: string;
  callCount: number;
  successRate: number;
  avgLatencyMs: number;
  qualityScore: number;
}

export interface CallSummaryByResourceRow {
  type: string;
  calls: number;
  errors: number;
  avgLatencyMs: number;
}

export interface CallLogEntry {
  id: string;
  traceId: string;
  agentId: string;
  agentName: string;
  resourceType?: string;
  userId: string;
  method: string;
  status: 'success' | 'error' | 'timeout';
  statusCode: number;
  latencyMs: number;
  errorMessage?: string;
  ip: string;
  createdAt: string;
}

export type AlertSeverity = 'critical' | 'warning' | 'info';
export type AlertEventStatus = 'firing' | 'acknowledged' | 'silenced' | 'resolved' | 'reopened';
export type AlertScopeType = 'global' | 'resource_type' | 'resource';
export type AlertOperator = 'gt' | 'gte' | 'lt' | 'lte' | 'eq';

export interface AlertRecord {
  id: string;
  ruleId: string;
  ruleName: string;
  severity: AlertSeverity;
  status: AlertEventStatus;
  message: string;
  source: string;
  labels: Record<string, string>;
  firedAt: string;
  resolvedAt?: string;
  ackAt?: string;
  silencedAt?: string;
  reopenedAt?: string;
  assigneeUserId?: number;
  assigneeName?: string;
  lastSampleValue?: number;
  scopeType?: AlertScopeType;
  scopeLabel?: string;
  resourceType?: string;
  resourceId?: number;
  resourceName?: string;
  ruleMetric?: string;
  ruleOperator?: AlertOperator;
  ruleThreshold?: number;
  ruleDuration?: string;
  ruleExpression?: string;
  triggerReason?: string;
  activeSeconds?: number;
  notificationCount?: number;
}

export interface AlertEventAction {
  id: number;
  actionType: string;
  operatorUserId?: number;
  operatorName?: string;
  note?: string;
  previousStatus?: string;
  nextStatus?: string;
  extra?: Record<string, unknown>;
  createTime: string;
}

export interface AlertNotification {
  id: number;
  userId?: number;
  title: string;
  body: string;
  severity?: string;
  read?: boolean;
  createTime: string;
}

export interface AlertEventDetail extends AlertRecord {
  duration?: string;
  triggerSnapshot?: Record<string, unknown>;
  ruleSnapshot?: Record<string, unknown>;
  actions: AlertEventAction[];
  notifications: AlertNotification[];
}

export interface AlertSummary {
  firing: number;
  acknowledged: number;
  silenced: number;
  resolvedToday: number;
  mine: number;
  enabledRules: number;
}

export interface AlertRuleScope {
  scopeType: AlertScopeType;
  scopeResourceType?: string;
  scopeResourceId?: number;
}

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  metric: string;
  condition: AlertOperator;
  operator: AlertOperator;
  threshold: number;
  duration: string;
  severity: AlertSeverity;
  enabled: boolean;
  channels: string[];
  notifyChannels: string[];
  createdAt: string;
  updatedAt: string;
  scopeType: AlertScopeType;
  scopeResourceType?: string;
  scopeResourceId?: number;
  labelFilters: Record<string, string>;
}

export interface AlertRuleMetricOption {
  value: string;
  label: string;
  description?: string;
  unit?: string;
}

export interface AlertRuleScopeResourceOption {
  id: number;
  resourceType: string;
  displayName: string;
}

export interface AlertRuleScopeOptionResponse {
  resourceTypes: string[];
  resources: AlertRuleScopeResourceOption[];
}

export interface CreateAlertRulePayload {
  name: string;
  description?: string;
  metric: string;
  condition?: AlertOperator;
  operator?: AlertOperator;
  threshold: number;
  duration?: string;
  severity: AlertSeverity;
  channels?: string[];
  notifyChannels?: string[];
  enabled?: boolean | number;
  scopeType?: AlertScopeType;
  scopeResourceType?: string;
  scopeResourceId?: number;
  labelFilters?: Record<string, string>;
}

export interface AlertRuleDryRunRequest {
  sampleValue?: number;
  mode?: 'sample' | 'preview';
}

export interface AlertRuleDryRunResult {
  wouldFire: boolean;
  operator: string;
  threshold: number;
  sampleValue: number;
  detail: string;
  sampleSource?: string;
  reason?: string;
  recoveryCandidate?: boolean;
  snapshot?: Record<string, unknown>;
}

export interface AlertBatchActionRequest {
  ids: string[];
  action: 'ack' | 'assign' | 'silence' | 'resolve' | 'reopen';
  assigneeUserId?: number;
  note?: string;
}

export type TraceStatus = 'success' | 'error';

export interface TraceQueryParams {
  page?: number;
  pageSize?: number;
  keyword?: string;
  status?: 'all' | TraceStatus;
  resourceType?: string;
  resourceId?: number;
  from?: string;
  to?: string;
}

export interface TraceListItem {
  traceId: string;
  requestId: string;
  rootOperation: string;
  entryService: string;
  rootResourceType: string;
  rootResourceId?: number;
  rootResourceCode: string;
  rootDisplayName: string;
  status: TraceStatus;
  startedAt: string;
  durationMs: number;
  spanCount: number;
  errorSpanCount: number;
  firstErrorMessage?: string;
  userId?: number;
  ip?: string;
}

export interface TraceSummary extends TraceListItem {}

export interface TraceRootCause {
  spanId?: string;
  operationName?: string;
  serviceName?: string;
  message: string;
}

export interface TraceSpanLog {
  timestamp: string;
  message: string;
  context: Record<string, unknown>;
}

export interface TraceSpanDetail {
  id: string;
  traceId: string;
  parentId: string | null;
  operationName: string;
  serviceName: string;
  startTime: string;
  duration: number;
  status: TraceStatus;
  tags: Record<string, unknown>;
  logs: TraceSpanLog[];
}

export interface TraceSpanNode extends TraceSpanDetail {
  depth: number;
  relativeStartMs: number;
  children: TraceSpanNode[];
}

export interface TraceDetail {
  summary: TraceSummary;
  rootCause?: TraceRootCause;
  spans: TraceSpanDetail[];
  callLogs: CallLogEntry[];
}

export type PerformanceWindow = '6h' | '24h' | '7d';

export interface PerformanceAnalysisSummary {
  requestCount: number;
  successCount: number;
  errorCount: number;
  timeoutCount: number;
  successRate: number;
  errorRate: number;
  timeoutRate: number;
  avgLatencyMs: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
}

export interface PerformanceBucket {
  bucket: string;
  requestCount: number;
  successCount: number;
  errorCount: number;
  timeoutCount: number;
  successRate: number;
  errorRate: number;
  timeoutRate: number;
  avgLatencyMs: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  throughput: number;
}

export interface PerformanceResourceLeaderboardItem {
  resourceType: string;
  resourceId?: number;
  resourceName: string;
  requestCount: number;
  errorCount: number;
  timeoutCount: number;
  errorRate: number;
  timeoutRate: number;
  avgLatencyMs: number;
  p99LatencyMs: number;
  lowSample: boolean;
}

export interface PerformanceSlowMethodItem {
  method: string;
  requestCount: number;
  errorCount: number;
  errorRate: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
}

export interface PerformanceAnalysis {
  window: PerformanceWindow | string;
  resourceType: string;
  resourceId?: number;
  summary: PerformanceAnalysisSummary;
  buckets: PerformanceBucket[];
  resourceLeaderboard: PerformanceResourceLeaderboardItem[];
  slowMethods: PerformanceSlowMethodItem[];
}

export interface PerformanceMetric {
  service?: string;
  timestamp: string;
  cpu: number;
  memory: number;
  disk: number;
  network: number;
  requestRate: number;
  errorRate: number;
  p50Latency: number;
  p95Latency: number;
  p99Latency: number;
  latencyP50: number;
  latencyP99: number;
  throughput: number;
}
