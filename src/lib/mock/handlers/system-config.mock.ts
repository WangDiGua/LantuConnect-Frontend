import type MockAdapter from 'axios-mock-adapter';
import type {
  ModelConfig,
  RateLimitRule,
  AuditLogEntry,
  SystemParam,
  SecuritySetting,
} from '../../../types/dto/system-config';
import { mockOk, paginate } from '../mockAdapter';

function ts(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString();
}

const modelConfigs: ModelConfig[] = [
  { id: 'mc1', name: '通义千问-Turbo', provider: '阿里云', modelId: 'qwen-turbo', endpoint: 'https://dashscope.aliyuncs.com/v1', maxTokens: 8192, temperature: 0.7, topP: 0.9, enabled: true, rateLimit: 100, costPerToken: 0.00002, description: '校内默认模型', createdAt: ts(90), updatedAt: ts(5) },
  { id: 'mc2', name: 'GPT-4o-mini', provider: 'OpenAI兼容', modelId: 'gpt-4o-mini', endpoint: 'https://api.openai-proxy.com/v1', maxTokens: 16384, temperature: 0.7, topP: 0.95, enabled: true, rateLimit: 50, costPerToken: 0.00006, description: '适合复杂推理场景', createdAt: ts(60), updatedAt: ts(10) },
  { id: 'mc3', name: '文心 4.0', provider: '百度', modelId: 'ernie-4.0', endpoint: 'https://aip.baidubce.com/v1', maxTokens: 8192, temperature: 0.7, topP: 0.9, enabled: true, rateLimit: 80, costPerToken: 0.00003, description: '中文优化', createdAt: ts(45), updatedAt: ts(8) },
  { id: 'mc4', name: 'DeepSeek-V3', provider: 'DeepSeek', modelId: 'deepseek-chat', endpoint: 'https://api.deepseek.com/v1', maxTokens: 65536, temperature: 0.7, topP: 0.9, enabled: true, rateLimit: 60, costPerToken: 0.00001, description: '高性价比长文本', createdAt: ts(20), updatedAt: ts(3) },
  { id: 'mc5', name: 'Embedding-v3', provider: '阿里云', modelId: 'text-embedding-v3', endpoint: 'https://dashscope.aliyuncs.com/v1', maxTokens: 8192, temperature: 0, topP: 1, enabled: true, rateLimit: 200, costPerToken: 0.000005, description: '向量化模型', createdAt: ts(90), updatedAt: ts(30) },
  { id: 'mc6', name: 'Claude-3.5-Sonnet', provider: 'Anthropic', modelId: 'claude-3-5-sonnet', endpoint: 'https://api.anthropic-proxy.com/v1', maxTokens: 4096, temperature: 0.7, topP: 0.9, enabled: false, rateLimit: 30, costPerToken: 0.00008, description: '备用高质量模型', createdAt: ts(15), updatedAt: ts(15) },
];

const rateLimits: RateLimitRule[] = [
  { id: 'rl1', name: '全局默认限流', target: 'global', windowMs: 60000, maxRequests: 100, maxTokens: 50000, burstLimit: 20, action: 'throttle', enabled: true, priority: 0, createdAt: ts(90), updatedAt: ts(30) },
  { id: 'rl2', name: '单用户限流', target: 'user', windowMs: 60000, maxRequests: 30, maxTokens: 20000, burstLimit: 10, action: 'reject', enabled: true, priority: 10, createdAt: ts(60), updatedAt: ts(15) },
  { id: 'rl3', name: '管理员豁免', target: 'role', targetValue: 'admin', windowMs: 60000, maxRequests: 500, action: 'throttle', enabled: true, priority: 20, createdAt: ts(60), updatedAt: ts(60) },
  { id: 'rl4', name: 'IP黑名单限流', target: 'ip', targetValue: '0.0.0.0/0', windowMs: 3600000, maxRequests: 10, action: 'reject', enabled: false, priority: 100, createdAt: ts(30), updatedAt: ts(30) },
  { id: 'rl5', name: 'API Key限流', target: 'api_key', windowMs: 60000, maxRequests: 60, maxTokens: 30000, burstLimit: 15, action: 'queue', enabled: true, priority: 5, createdAt: ts(45), updatedAt: ts(10) },
];

const auditLogs: AuditLogEntry[] = Array.from({ length: 40 }, (_, i) => {
  const actions = ['login', 'create_agent', 'update_model_config', 'delete_user', 'export_data', 'modify_rate_limit', 'create_kb', 'publish_agent'];
  const resources = ['auth', 'agent', 'system-config', 'user-mgmt', 'data-eval', 'system-config', 'knowledge', 'publish'];
  const users = ['admin', 'zhangsan', 'lisi', 'wangwu', 'zhaoliu'];
  const createdAt = ts(Math.floor(i / 5));
  return {
    id: `audit_${i + 1}`,
    userId: `u_${(i % 5) + 1}`,
    username: users[i % 5],
    action: actions[i % 8],
    resource: resources[i % 8],
    resourceId: `res_${i + 1}`,
    details: `执行操作: ${actions[i % 8]}`,
    ip: `192.168.1.${10 + (i % 30)}`,
    userAgent: 'Mozilla/5.0 LantuConnect/1.0',
    result: i % 7 === 0 ? 'failure' as const : 'success' as const,
    createdAt,
    time: createdAt,
    operator: users[i % 5],
    target: resources[i % 8],
  };
});

const systemParams: SystemParam[] = [
  { key: 'max_upload_size_mb', value: '50', type: 'number', description: '单文件上传大小上限（MB）', category: '存储', editable: true, updatedAt: ts(10) },
  { key: 'default_model', value: 'qwen-turbo', type: 'string', description: '系统默认模型', category: '模型', editable: true, updatedAt: ts(5) },
  { key: 'session_timeout_min', value: '120', type: 'number', description: '会话超时时间（分钟）', category: '安全', editable: true, updatedAt: ts(30) },
  { key: 'enable_registration', value: 'true', type: 'boolean', description: '是否允许新用户注册', category: '用户', editable: true, updatedAt: ts(60) },
  { key: 'maintenance_mode', value: 'false', type: 'boolean', description: '维护模式开关', category: '系统', editable: true, updatedAt: ts(90) },
  { key: 'log_retention_days', value: '90', type: 'number', description: '日志保留天数', category: '存储', editable: true, updatedAt: ts(45) },
  { key: 'webhook_retry_count', value: '3', type: 'number', description: 'Webhook失败重试次数', category: '集成', editable: true, updatedAt: ts(20) },
  { key: 'system_name', value: '蓝图智联平台', type: 'string', description: '系统名称', category: '系统', editable: true, updatedAt: ts(90) },
];

const securitySettings: SecuritySetting[] = [
  { key: 'two_factor_auth', value: false, label: '双因素认证', description: '启用后所有用户需要二次验证', type: 'toggle', category: '认证' },
  { key: 'password_min_length', value: 8, label: '密码最小长度', description: '用户密码的最小字符数', type: 'input', category: '认证' },
  { key: 'password_policy', value: 'medium', label: '密码强度策略', description: '密码复杂度要求', type: 'select', options: ['low', 'medium', 'high'], category: '认证' },
  { key: 'ip_whitelist_enabled', value: false, label: 'IP白名单', description: '仅允许白名单IP访问管理后台', type: 'toggle', category: '访问控制' },
  { key: 'cors_origins', value: '*', label: 'CORS来源', description: '允许的跨域请求来源', type: 'input', category: '访问控制' },
  { key: 'sensitive_data_mask', value: true, label: '敏感数据脱敏', description: '日志和响应中自动脱敏敏感信息', type: 'toggle', category: '数据安全' },
  { key: 'auto_lock_attempts', value: 5, label: '自动锁定阈值', description: '连续登录失败次数达到后锁定账户', type: 'input', category: '认证' },
  { key: 'session_binding', value: 'ip', label: '会话绑定方式', description: '会话绑定策略', type: 'select', options: ['none', 'ip', 'device'], category: '认证' },
];

let nextModelId = 100;
let nextRlId = 100;

export function registerHandlers(mock: MockAdapter): void {
  mock.onGet('/system-config/models').reply((config) => {
    const p = config.params || {};
    return paginate(modelConfigs, Number(p.page) || 1, Number(p.pageSize) || 20);
  });

  mock.onPost('/system-config/models').reply((config) => {
    const body = JSON.parse(config.data || '{}');
    const mc: ModelConfig = {
      id: 'mc_' + nextModelId++,
      name: body.name,
      provider: body.provider,
      modelId: body.modelId,
      endpoint: body.endpoint,
      maxTokens: body.maxTokens,
      temperature: body.temperature ?? 0.7,
      topP: body.topP ?? 0.9,
      enabled: true,
      rateLimit: body.rateLimit ?? 50,
      costPerToken: body.costPerToken ?? 0.00002,
      description: body.description,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    modelConfigs.push(mc);
    return mockOk(mc);
  });

  mock.onPut(/\/system-config\/models\/([^/]+)$/).reply((config) => {
    const id = config.url!.match(/\/system-config\/models\/([^/]+)$/)?.[1];
    const body = JSON.parse(config.data || '{}');
    const idx = modelConfigs.findIndex((m) => m.id === id);
    if (idx >= 0) {
      modelConfigs[idx] = { ...modelConfigs[idx], ...body, updatedAt: new Date().toISOString() };
      return mockOk(modelConfigs[idx]);
    }
    return [404, { code: 404, message: 'Not found', timestamp: Date.now() }];
  });

  mock.onDelete(/\/system-config\/models\/([^/]+)$/).reply((config) => {
    const id = config.url!.match(/\/system-config\/models\/([^/]+)$/)?.[1];
    const idx = modelConfigs.findIndex((m) => m.id === id);
    if (idx >= 0) modelConfigs.splice(idx, 1);
    return mockOk(null);
  });

  mock.onGet('/system-config/rate-limits').reply(() => mockOk(rateLimits));

  mock.onPost('/system-config/rate-limits').reply((config) => {
    const body = JSON.parse(config.data || '{}');
    const rl: RateLimitRule = {
      id: 'rl_' + nextRlId++,
      name: body.name,
      target: body.target,
      targetValue: body.targetValue,
      windowMs: body.windowMs,
      maxRequests: body.maxRequests,
      maxTokens: body.maxTokens,
      burstLimit: body.burstLimit,
      action: body.action,
      enabled: true,
      priority: body.priority ?? 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    rateLimits.push(rl);
    return mockOk(rl);
  });

  mock.onPut(/\/system-config\/rate-limits\/([^/]+)$/).reply((config) => {
    const id = config.url!.match(/\/system-config\/rate-limits\/([^/]+)$/)?.[1];
    const body = JSON.parse(config.data || '{}');
    const idx = rateLimits.findIndex((r) => r.id === id);
    if (idx >= 0) {
      rateLimits[idx] = { ...rateLimits[idx], ...body, updatedAt: new Date().toISOString() };
      return mockOk(rateLimits[idx]);
    }
    return [404, { code: 404, message: 'Not found', timestamp: Date.now() }];
  });

  mock.onDelete(/\/system-config\/rate-limits\/([^/]+)$/).reply((config) => {
    const id = config.url!.match(/\/system-config\/rate-limits\/([^/]+)$/)?.[1];
    const idx = rateLimits.findIndex((r) => r.id === id);
    if (idx >= 0) rateLimits.splice(idx, 1);
    return mockOk(null);
  });

  mock.onGet('/system-config/audit-logs').reply((config) => {
    const p = config.params || {};
    return paginate(auditLogs, Number(p.page) || 1, Number(p.pageSize) || 20);
  });

  mock.onGet('/system-config/params').reply(() => mockOk(systemParams));

  mock.onPut('/system-config/params').reply((config) => {
    const body = JSON.parse(config.data || '{}');
    const idx = systemParams.findIndex((p) => p.key === body.key);
    if (idx >= 0) {
      systemParams[idx] = { ...systemParams[idx], value: body.value, updatedAt: new Date().toISOString() };
    }
    return mockOk(systemParams);
  });

  mock.onGet('/system-config/security').reply(() => mockOk(securitySettings));

  mock.onPut('/system-config/security').reply((config) => {
    const body = JSON.parse(config.data || '{}');
    const idx = securitySettings.findIndex((s) => s.key === body.key);
    if (idx >= 0) {
      securitySettings[idx] = { ...securitySettings[idx], value: body.value };
    }
    return mockOk(securitySettings);
  });
}
