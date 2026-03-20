/** 管理员端各模块 Mock 数据 */

export interface MockResourceMetric {
  id: string;
  name: string;
  usagePct: number;
  unit: string;
  trend: 'up' | 'down' | 'flat';
}

export interface MockModelEndpoint {
  id: string;
  name: string;
  provider: string;
  status: 'online' | 'degraded' | 'offline';
  latencyMs: number;
}

export interface MockToolReview {
  id: string;
  title: string;
  submitter: string;
  status: 'pending' | 'approved' | 'rejected';
  at: string;
}

export interface MockAuditLine {
  id: string;
  actor: string;
  action: string;
  target: string;
  at: string;
}

export const INITIAL_RESOURCE_METRICS: MockResourceMetric[] = [
  { id: 'r1', name: 'CPU 集群', usagePct: 68, unit: '核', trend: 'up' },
  { id: 'r2', name: '内存', usagePct: 54, unit: 'GB', trend: 'flat' },
  { id: 'r3', name: '对象存储', usagePct: 41, unit: 'TB', trend: 'down' },
];

export const INITIAL_MODEL_ENDPOINTS: MockModelEndpoint[] = [
  { id: 'm1', name: 'gpt-4o 代理', provider: 'OpenAI', status: 'online', latencyMs: 420 },
  { id: 'm2', name: '文心 4.0', provider: '百度', status: 'degraded', latencyMs: 890 },
];

export const INITIAL_TOOL_REVIEWS: MockToolReview[] = [
  { id: 't1', title: '教务查询 MCP', submitter: 'user_12', status: 'pending', at: '2026-03-20 10:12' },
  { id: 't2', title: '地图导航插件', submitter: 'user_05', status: 'approved', at: '2026-03-19 16:00' },
];

export const INITIAL_OPS_QUEUE = [
  { id: 'c1', type: '文本', content: '违规引流话术样本…', risk: '高', status: '待审' },
  { id: 'c2', type: '图片', content: 'hash:7a3f…', risk: '中', status: '已放行' },
];

export const INITIAL_SENSITIVE_WORDS = ['赌博', '代开发票', '翻墙'];

export const INITIAL_GATEWAY_ROUTES = [
  { id: 'g1', path: '/v1/chat', upstream: 'inference-svc:8080', rps: 1200 },
  { id: 'g2', path: '/v1/embed', upstream: 'embed-svc:8081', rps: 340 },
];

export const INITIAL_BACKUP_JOBS = [
  { id: 'b1', name: '每日全量', schedule: '0 2 * * *', last: '2026-03-20 02:00', ok: true },
  { id: 'b2', name: 'Redis 快照', schedule: '0 */6 * * *', last: '2026-03-20 12:00', ok: true },
];
