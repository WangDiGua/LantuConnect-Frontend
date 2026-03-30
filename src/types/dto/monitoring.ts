export interface KpiMetric {
  id: string;
  label: string;
  value: number;
  unit: string;
  change: number;
  changeType: 'up' | 'down' | 'flat';
  up: boolean;
  delta: number | string;
  sparkline?: number[];
}

export interface CallLogEntry {
  id: string;
  traceId: string;
  agentId: string;
  agentName: string;
  userId: string;
  model: string;
  method: string;
  status: 'success' | 'error' | 'timeout';
  statusCode: number;
  latencyMs: number;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  errorMessage?: string;
  ip: string;
  createdAt: string;
}

export interface AlertRecord {
  id: string;
  ruleId: string;
  ruleName: string;
  severity: 'critical' | 'warning' | 'info';
  status: 'firing' | 'resolved' | 'silenced';
  message: string;
  source: string;
  labels: Record<string, string>;
  firedAt: string;
  resolvedAt?: string;
}

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  metric: string;
  condition: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  threshold: number;
  duration: string;
  severity: 'critical' | 'warning' | 'info';
  enabled: boolean;
  channels: string[];
  notifyChannels: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateAlertRulePayload {
  name: string;
  description?: string;
  metric: string;
  condition?: AlertRule['condition'];
  operator?: AlertRule['operator'];
  threshold: number;
  duration?: string;
  severity: AlertRule['severity'];
  channels?: string[];
  notifyChannels?: string[];
}

export interface AlertRuleDryRunRequest {
  ruleId?: string;
  metric?: string;
  condition?: AlertRule['condition'];
  threshold?: number;
  duration?: string;
  mockData?: Record<string, unknown>;
}

export interface TraceSpan {
  id: string;
  traceId: string;
  parentId: string | null;
  operationName: string;
  service: string;
  serviceName: string;
  startTime: string;
  duration: number;
  status: 'ok' | 'error';
  tags: Record<string, string>;
  logs: { timestamp: string; message: string }[];
  children?: TraceSpan[];
}

export interface PerformanceMetric {
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
