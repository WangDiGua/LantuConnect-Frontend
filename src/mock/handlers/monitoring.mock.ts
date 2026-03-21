import type MockAdapter from 'axios-mock-adapter';
import type {
  KpiMetric,
  CallLogEntry,
  AlertRecord,
  AlertRule,
  TraceSpan,
  PerformanceMetric,
} from '../../types/dto/monitoring';
import { mockOk, paginate } from '..';

function ts(daysAgo: number, h = 10, m = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}

function sparkline(base: number, len = 12): number[] {
  return Array.from({ length: len }, () => base + (Math.random() - 0.5) * base * 0.3);
}

const kpis: KpiMetric[] = [
  { id: 'kpi1', label: 'API 总调用量', value: 128340, unit: '次/日', change: 12.5, changeType: 'up', sparkline: sparkline(128000), up: true, delta: '+12.5%' },
  { id: 'kpi2', label: '平均响应时间', value: 342, unit: 'ms', change: -5.2, changeType: 'down', sparkline: sparkline(340), up: false, delta: '-5.2%' },
  { id: 'kpi3', label: '成功率', value: 99.2, unit: '%', change: 0.3, changeType: 'up', sparkline: sparkline(99), up: true, delta: '+0.3%' },
  { id: 'kpi4', label: '活跃Agent', value: 12, unit: '个', change: 0, changeType: 'flat', sparkline: sparkline(12), up: true, delta: 0 },
  { id: 'kpi5', label: '当日Token用量', value: 2450000, unit: 'tokens', change: 8.1, changeType: 'up', sparkline: sparkline(2400000), up: true, delta: '+8.1%' },
  { id: 'kpi6', label: '错误率', value: 0.8, unit: '%', change: -0.2, changeType: 'down', sparkline: sparkline(0.8), up: false, delta: '-0.2%' },
];

const models = ['通义千问-Turbo', 'GPT-4o-mini', '文心 4.0'];
const methods = ['POST /chat/completions', 'POST /embeddings', 'GET /models'];
const statuses: CallLogEntry['status'][] = ['success', 'success', 'success', 'success', 'error', 'timeout'];

const callLogs: CallLogEntry[] = Array.from({ length: 50 }, (_, i) => ({
  id: `cl_${i + 1}`,
  traceId: `tr_${(1000 + i).toString(36)}`,
  agentId: `ag0${(i % 5) + 1}`,
  agentName: ['教务问答助手', '招生咨询机器人', '论文摘要生成器', '课程推荐引擎', '心理健康疏导'][i % 5],
  userId: `u_${(i % 10) + 1}`,
  model: models[i % 3],
  method: methods[i % 3],
  status: statuses[i % 6],
  statusCode: statuses[i % 6] === 'success' ? 200 : statuses[i % 6] === 'error' ? 500 : 408,
  latencyMs: 100 + Math.floor(Math.random() * 800),
  inputTokens: 50 + Math.floor(Math.random() * 500),
  outputTokens: 30 + Math.floor(Math.random() * 400),
  cost: +(Math.random() * 0.05).toFixed(4),
  errorMessage: statuses[i % 6] !== 'success' ? '模型响应超时或内部错误' : undefined,
  ip: `192.168.1.${10 + (i % 50)}`,
  createdAt: ts(Math.floor(i / 10), 8 + (i % 12), i % 60),
}));

const alerts: AlertRecord[] = [
  { id: 'alt1', ruleId: 'ar1', ruleName: 'API延迟过高', severity: 'warning', status: 'firing', message: 'P95延迟超过800ms持续5分钟', source: 'gateway', labels: { service: 'api-gateway' }, firedAt: ts(0, 9, 30) },
  { id: 'alt2', ruleId: 'ar2', ruleName: '错误率飙升', severity: 'critical', status: 'resolved', message: '错误率超过5%持续3分钟', source: 'agent-service', labels: { agent: 'ag03' }, firedAt: ts(1, 14, 0), resolvedAt: ts(1, 14, 15) },
  { id: 'alt3', ruleId: 'ar3', ruleName: 'GPU利用率过高', severity: 'warning', status: 'firing', message: 'GPU利用率持续超过90%', source: 'infra', labels: { node: 'gpu-node-01' }, firedAt: ts(0, 8, 0) },
  { id: 'alt4', ruleId: 'ar4', ruleName: '磁盘空间不足', severity: 'info', status: 'silenced', message: '数据盘剩余空间低于20%', source: 'infra', labels: { disk: '/data' }, firedAt: ts(2, 6, 0) },
  { id: 'alt5', ruleId: 'ar1', ruleName: 'API延迟过高', severity: 'warning', status: 'resolved', message: 'P95延迟超过800ms', source: 'gateway', labels: { service: 'api-gateway' }, firedAt: ts(3, 11, 0), resolvedAt: ts(3, 11, 10) },
  { id: 'alt6', ruleId: 'ar5', ruleName: 'Token额度预警', severity: 'info', status: 'firing', message: '本月Token用量已达80%', source: 'billing', labels: {}, firedAt: ts(0, 7, 0) },
];

const alertRules: AlertRule[] = [
  { id: 'ar1', name: 'API延迟过高', description: 'P95延迟超过阈值时告警', metric: 'api.latency.p95', condition: 'gt', threshold: 800, duration: '5m', severity: 'warning', enabled: true, channels: ['email', 'webhook'], createdAt: ts(30), updatedAt: ts(5), operator: 'gt', notifyChannels: ['email', 'webhook'] },
  { id: 'ar2', name: '错误率飙升', description: '错误率超过阈值时告警', metric: 'api.error_rate', condition: 'gt', threshold: 5, duration: '3m', severity: 'critical', enabled: true, channels: ['sms', 'email', 'webhook'], createdAt: ts(30), updatedAt: ts(10), operator: 'gt', notifyChannels: ['sms', 'email', 'webhook'] },
  { id: 'ar3', name: 'GPU利用率过高', description: 'GPU使用率持续过高', metric: 'infra.gpu.usage', condition: 'gt', threshold: 90, duration: '10m', severity: 'warning', enabled: true, channels: ['email'], createdAt: ts(20), updatedAt: ts(3), operator: 'gt', notifyChannels: ['email'] },
  { id: 'ar4', name: '磁盘空间不足', description: '磁盘剩余空间过低', metric: 'infra.disk.free_pct', condition: 'lt', threshold: 20, duration: '15m', severity: 'info', enabled: true, channels: ['email'], createdAt: ts(60), updatedAt: ts(15), operator: 'lt', notifyChannels: ['email'] },
  { id: 'ar5', name: 'Token额度预警', description: '月度Token用量超过预算', metric: 'billing.token.usage_pct', condition: 'gt', threshold: 80, duration: '0m', severity: 'info', enabled: true, channels: ['email'], createdAt: ts(30), updatedAt: ts(1), operator: 'gt', notifyChannels: ['email'] },
];

const serviceNames = ['api-gateway', 'agent-service', 'llm-proxy', 'kb-service', 'tool-service'];
const traces: TraceSpan[] = Array.from({ length: 30 }, (_, i) => ({
  id: `span_${i + 1}`,
  traceId: `tr_${(2000 + i).toString(36)}`,
  parentId: i % 3 === 0 ? null : `span_${i}`,
  operationName: ['gateway.route', 'agent.invoke', 'llm.completion', 'kb.search', 'tool.execute'][i % 5],
  serviceName: serviceNames[i % 5],
  startTime: ts(Math.floor(i / 6), 8 + (i % 10), i * 2),
  duration: 50 + Math.floor(Math.random() * 500),
  status: i % 8 === 7 ? 'error' as const : 'ok' as const,
  tags: { agent: `ag0${(i % 5) + 1}`, model: models[i % 3] },
  logs: [{ timestamp: ts(0), message: i % 8 === 7 ? '超时或异常' : '处理完成' }],
  service: serviceNames[i % 5],
}));

const perfMetrics: PerformanceMetric[] = Array.from({ length: 24 }, (_, i) => {
  const p50 = 100 + Math.floor(Math.random() * 150);
  const p99 = 600 + Math.floor(Math.random() * 600);
  const reqRate = 500 + Math.floor(Math.random() * 1000);
  return {
    timestamp: ts(0, i, 0),
    cpu: 30 + Math.random() * 40,
    memory: 50 + Math.random() * 30,
    disk: 60 + Math.random() * 10,
    network: 10 + Math.random() * 50,
    requestRate: reqRate,
    errorRate: Math.random() * 2,
    p50Latency: p50,
    p95Latency: 300 + Math.floor(Math.random() * 400),
    p99Latency: p99,
    latencyP50: p50,
    latencyP99: p99,
    throughput: reqRate,
  };
});

let ruleNextId = 100;

export function registerHandlers(mock: MockAdapter): void {
  mock.onGet('/monitoring/kpis').reply(() => mockOk(kpis));

  mock.onGet('/monitoring/call-logs').reply((config) => {
    const p = config.params || {};
    return paginate(callLogs, Number(p.page) || 1, Number(p.pageSize) || 20);
  });

  mock.onGet('/monitoring/alerts').reply((config) => {
    const p = config.params || {};
    return paginate(alerts, Number(p.page) || 1, Number(p.pageSize) || 20);
  });

  mock.onGet('/monitoring/alert-rules').reply(() => mockOk(alertRules));

  mock.onPost('/monitoring/alert-rules').reply((config) => {
    const body = JSON.parse(config.data || '{}');
    const rule: AlertRule = {
      id: 'ar_' + ruleNextId++,
      name: body.name,
      description: body.description || '',
      metric: body.metric,
      condition: body.condition,
      threshold: body.threshold,
      duration: body.duration,
      severity: body.severity,
      enabled: true,
      channels: body.channels || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      operator: body.condition,
      notifyChannels: body.channels || [],
    };
    alertRules.push(rule);
    return mockOk(rule);
  });

  mock.onGet('/monitoring/traces').reply((config) => {
    const p = config.params || {};
    return paginate(traces, Number(p.page) || 1, Number(p.pageSize) || 20);
  });

  mock.onGet('/monitoring/performance').reply(() => mockOk(perfMetrics));
}
