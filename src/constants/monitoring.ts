/** 监控中心演示数据（对接后端后替换） */

export interface MonitoringKpi {
  id: string;
  label: string;
  value: string;
  delta: string;
  up: boolean;
}

export interface CallLogRow {
  id: string;
  time: string;
  method: string;
  path: string;
  status: number;
  latencyMs: number;
  agent?: string;
}

export interface AlertRow {
  id: string;
  time: string;
  level: 'critical' | 'warning' | 'info';
  title: string;
  source: string;
  status: 'open' | 'ack' | 'closed';
}

export const MOCK_KPIS: MonitoringKpi[] = [
  { id: '1', label: '今日调用量', value: '128.4k', delta: '+12.3%', up: true },
  { id: '2', label: '成功率', value: '99.42%', delta: '+0.08%', up: true },
  { id: '3', label: 'P99 延迟', value: '842 ms', delta: '-41 ms', up: true },
  { id: '4', label: '活跃 Agent', value: '36', delta: '+2', up: true },
];

export const MOCK_CALL_LOGS: CallLogRow[] = [
  {
    id: 'c1',
    time: '2026-03-19 14:32:01',
    method: 'POST',
    path: '/api/agent/edu-assistant/invoke',
    status: 200,
    latencyMs: 320,
    agent: '教务助手',
  },
  {
    id: 'c2',
    time: '2026-03-19 14:31:48',
    method: 'GET',
    path: '/api/kb/hit-test',
    status: 200,
    latencyMs: 45,
  },
  {
    id: 'c3',
    time: '2026-03-19 14:30:12',
    method: 'POST',
    path: '/api/auth/login',
    status: 401,
    latencyMs: 12,
  },
  {
    id: 'c4',
    time: '2026-03-19 14:28:55',
    method: 'POST',
    path: '/api/agent/lib-search/invoke',
    status: 503,
    latencyMs: 30000,
    agent: '图书馆检索',
  },
];

export const MOCK_ALERTS: AlertRow[] = [
  {
    id: 'a1',
    time: '2026-03-19 13:00',
    level: 'critical',
    title: '推理节点 node-b 连续 3 次健康检查失败',
    source: 'k8s / prod',
    status: 'open',
  },
  {
    id: 'a2',
    time: '2026-03-19 11:20',
    level: 'warning',
    title: 'API 限流触发次数超过阈值（/api/agent/*/invoke）',
    source: 'gateway',
    status: 'ack',
  },
  {
    id: 'a3',
    time: '2026-03-18 22:05',
    level: 'info',
    title: '计划内维护窗口将于 23:00 开始',
    source: '运维',
    status: 'closed',
  },
];
