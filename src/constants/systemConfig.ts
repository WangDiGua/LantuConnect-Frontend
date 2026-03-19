/** 系统配置模块演示数据（对接后端后替换为 API） */

export interface ModelConfigRow {
  id: string;
  name: string;
  provider: string;
  modelId: string;
  endpoint: string;
  enabled: boolean;
  lastChecked?: string;
}

export interface RateLimitRule {
  id: string;
  name: string;
  pathPattern: string;
  qpm: number;
  burst: number;
  enabled: boolean;
}

export interface AuditLogRow {
  id: string;
  time: string;
  operator: string;
  action: string;
  resource: string;
  ip: string;
  success: boolean;
}

export const MOCK_MODEL_CONFIGS: ModelConfigRow[] = [
  {
    id: 'm1',
    name: '默认对话（校内）',
    provider: 'OpenAI 兼容',
    modelId: 'gpt-4.1-mini',
    endpoint: 'https://api.internal.edu/v1',
    enabled: true,
    lastChecked: '2026-03-19 09:00',
  },
  {
    id: 'm2',
    name: 'Embedding',
    provider: 'OpenAI 兼容',
    modelId: 'text-embedding-3-small',
    endpoint: 'https://api.internal.edu/v1/embeddings',
    enabled: true,
    lastChecked: '2026-03-18 22:10',
  },
  {
    id: 'm3',
    name: '备用线路',
    provider: 'Azure',
    modelId: 'gpt-4o',
    endpoint: 'https://xxx.openai.azure.com',
    enabled: false,
    lastChecked: '—',
  },
];

export const MOCK_RATE_LIMIT_RULES: RateLimitRule[] = [
  {
    id: 'rl1',
    name: '全站默认',
    pathPattern: '/api/*',
    qpm: 6000,
    burst: 200,
    enabled: true,
  },
  {
    id: 'rl2',
    name: 'Agent 推理',
    pathPattern: '/api/agent/*/invoke',
    qpm: 1200,
    burst: 80,
    enabled: true,
  },
  {
    id: 'rl3',
    name: '登录接口',
    pathPattern: '/api/auth/login',
    qpm: 60,
    burst: 10,
    enabled: true,
  },
];

export const MOCK_AUDIT_LOGS: AuditLogRow[] = [
  {
    id: 'a1',
    time: '2026-03-19 10:12:08',
    operator: 'admin@school.edu.cn',
    action: 'user.update',
    resource: 'user:zhangsan',
    ip: '10.0.1.12',
    success: true,
  },
  {
    id: 'a2',
    time: '2026-03-19 10:05:41',
    operator: 'zhangsan@school.edu.cn',
    action: 'apikey.create',
    resource: 'apikey:k_new',
    ip: '10.0.2.88',
    success: true,
  },
  {
    id: 'a3',
    time: '2026-03-19 09:58:02',
    operator: 'anonymous',
    action: 'auth.login',
    resource: '—',
    ip: '203.0.113.9',
    success: false,
  },
  {
    id: 'a4',
    time: '2026-03-19 09:40:15',
    operator: 'admin@school.edu.cn',
    action: 'role.update',
    resource: 'role:r2',
    ip: '10.0.1.12',
    success: true,
  },
];

export const AUDIT_ACTION_OPTIONS = [
  '全部',
  'user.update',
  'role.update',
  'apikey.create',
  'auth.login',
  'agent.invoke',
];
