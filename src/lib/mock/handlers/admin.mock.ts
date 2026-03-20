import type MockAdapter from 'axios-mock-adapter';
import type {
  ResourceMetric,
  HealthCheck,
  AdminStats,
  GatewayRoute,
  BackupRecord,
  Announcement,
  OperationLog,
  ErrorLog,
  OpsQueueItem,
  SensitiveWord,
} from '../../../types/dto/admin';
import type { ModelEndpoint } from '../../../types/dto/model-service';
import { mockOk, paginate } from '../mockAdapter';

function ts(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString();
}

const resources: ResourceMetric[] = [
  { id: 'res01', name: 'CPU使用率', type: 'cpu', current: 42, max: 100, unit: '%', trend: [35, 38, 40, 45, 42, 48, 43, 41, 42, 39, 44, 42], status: 'normal', usagePct: 42 },
  { id: 'res02', name: '内存使用率', type: 'memory', current: 68, max: 100, unit: '%', trend: [62, 65, 68, 70, 67, 72, 69, 68, 66, 70, 68, 68], status: 'normal', usagePct: 68 },
  { id: 'res03', name: '磁盘使用', type: 'disk', current: 78, max: 100, unit: '%', trend: [72, 73, 74, 75, 76, 76, 77, 77, 78, 78, 78, 78], status: 'warning', usagePct: 78 },
  { id: 'res04', name: 'GPU利用率', type: 'gpu', current: 85, max: 100, unit: '%', trend: [60, 70, 80, 90, 85, 88, 82, 78, 85, 90, 87, 85], status: 'warning', usagePct: 85 },
  { id: 'res05', name: '网络吞吐', type: 'network', current: 320, max: 1000, unit: 'Mbps', trend: [280, 300, 350, 320, 310, 340, 290, 320, 360, 330, 310, 320], status: 'normal', usagePct: 32 },
];

const healthChecks: HealthCheck[] = [
  { service: 'API网关', status: 'healthy', latencyMs: 12, lastChecked: ts(0), uptime: 99.98 },
  { service: 'Agent服务', status: 'healthy', latencyMs: 25, lastChecked: ts(0), uptime: 99.95 },
  { service: 'LLM代理', status: 'healthy', latencyMs: 45, lastChecked: ts(0), uptime: 99.8 },
  { service: '知识库服务', status: 'healthy', latencyMs: 18, lastChecked: ts(0), uptime: 99.92 },
  { service: '向量数据库', status: 'healthy', latencyMs: 8, lastChecked: ts(0), uptime: 99.99 },
  { service: '缓存服务', status: 'healthy', latencyMs: 2, lastChecked: ts(0), uptime: 99.99 },
  { service: '消息队列', status: 'healthy', latencyMs: 5, lastChecked: ts(0), uptime: 99.97 },
  { service: '文件存储', status: 'degraded', latencyMs: 120, lastChecked: ts(0), message: 'S3延迟偏高', uptime: 98.5 },
  { service: '监控服务', status: 'healthy', latencyMs: 15, lastChecked: ts(0), uptime: 99.9 },
];

const stats: AdminStats = {
  totalUsers: 286,
  activeUsers: 142,
  totalAgents: 16,
  totalApiCalls: 1283400,
  systemUptime: 99.95,
  avgResponseTime: 342,
  errorRate: 0.8,
  storageUsedGb: 15.2,
  totalCalls: 1283400,
  avgLatency: 342,
  dau: 142,
  activeAgents: 12,
};

const gatewayRoutes: GatewayRoute[] = [
  { id: 'gr01', path: '/api/agents/*', method: '*', upstream: 'http://agent-service:8080', rateLimit: 100, authRequired: true, cors: true, timeout: 30000, enabled: true, description: 'Agent服务路由', createdAt: ts(90), updatedAt: ts(5), rps: 320 },
  { id: 'gr02', path: '/api/auth/*', method: '*', upstream: 'http://auth-service:8081', rateLimit: 50, authRequired: false, cors: true, timeout: 10000, enabled: true, description: '认证服务路由', createdAt: ts(90), updatedAt: ts(10), rps: 150 },
  { id: 'gr03', path: '/api/knowledge-bases/*', method: '*', upstream: 'http://kb-service:8082', rateLimit: 80, authRequired: true, cors: true, timeout: 60000, enabled: true, description: '知识库服务路由', createdAt: ts(60), updatedAt: ts(8), rps: 210 },
  { id: 'gr04', path: '/api/monitoring/*', method: 'GET', upstream: 'http://monitor-service:8083', rateLimit: 200, authRequired: true, cors: false, timeout: 15000, enabled: true, description: '监控数据路由', createdAt: ts(45), updatedAt: ts(3), rps: 85 },
  { id: 'gr05', path: '/api/model-service/*', method: '*', upstream: 'http://llm-proxy:8084', rateLimit: 60, authRequired: true, cors: true, timeout: 120000, enabled: true, description: 'LLM代理路由', createdAt: ts(45), updatedAt: ts(2), rps: 180 },
  { id: 'gr06', path: '/api/admin/*', method: '*', upstream: 'http://admin-service:8085', rateLimit: 30, authRequired: true, cors: false, timeout: 30000, enabled: true, description: '管理后台路由', createdAt: ts(90), updatedAt: ts(15), rps: 45 },
];

const backups: BackupRecord[] = [
  { id: 'bk01', name: '每日全量备份', type: 'full', status: 'completed', sizeMb: 4500, duration: 1200, target: 'oss://backup/daily/', createdBy: 'system', startedAt: ts(0), completedAt: ts(0), schedule: '0 2 * * *', last: ts(0), ok: true },
  { id: 'bk02', name: '每日增量备份', type: 'incremental', status: 'completed', sizeMb: 320, duration: 180, target: 'oss://backup/incremental/', createdBy: 'system', startedAt: ts(0), completedAt: ts(0), schedule: '0 3 * * *', last: ts(0), ok: true },
  { id: 'bk03', name: '每周全量备份', type: 'full', status: 'completed', sizeMb: 4200, duration: 1150, target: 'oss://backup/weekly/', createdBy: 'system', startedAt: ts(7), completedAt: ts(7), schedule: '0 2 * * 0', last: ts(7), ok: true },
  { id: 'bk04', name: '手动备份-升级前', type: 'full', status: 'completed', sizeMb: 4100, duration: 1100, target: 'oss://backup/manual/', createdBy: 'admin', startedAt: ts(15), completedAt: ts(15), schedule: 'manual', last: ts(15), ok: true },
  { id: 'bk05', name: '差异备份', type: 'differential', status: 'failed', sizeMb: 0, duration: 600, target: 'oss://backup/diff/', createdBy: 'system', startedAt: ts(3), schedule: '0 4 * * *', last: ts(3), ok: false },
];

const announcements: Announcement[] = [
  { id: 'ann01', title: '系统升级通知', content: '蓝图智联平台将于本周六凌晨 2:00-4:00 进行系统升级维护，届时平台将暂停服务。', type: 'maintenance', status: 'published', targetRoles: ['admin', 'user'], publishedAt: ts(1), createdBy: 'admin', createdAt: ts(2) },
  { id: 'ann02', title: '新功能：Agent市场上线', content: '蓝图Agent市场正式上线，您可以在市场中发现和使用各类预构建Agent。', type: 'feature', status: 'published', targetRoles: ['admin', 'user'], publishedAt: ts(5), createdBy: 'admin', createdAt: ts(6) },
  { id: 'ann03', title: 'DeepSeek-V3模型接入', content: '平台已接入DeepSeek-V3模型，支持65K长上下文，性价比极高。', type: 'info', status: 'published', targetRoles: ['admin', 'user'], publishedAt: ts(10), createdBy: 'admin', createdAt: ts(11) },
  { id: 'ann04', title: '安全提醒：密码策略更新', content: '为提升平台安全性，密码最低长度已调整为8位。请及时更新不符合要求的密码。', type: 'warning', status: 'published', targetRoles: ['admin', 'user'], publishedAt: ts(15), createdBy: 'admin', createdAt: ts(16) },
  { id: 'ann05', title: '暑期维护计划', content: '暑期维护计划草案，待审批后发布。', type: 'maintenance', status: 'draft', targetRoles: ['admin'], createdBy: 'admin', createdAt: ts(3) },
];

const users = ['admin', 'zhangsan', 'lisi', 'wangwu', 'zhaoliu'];
const modules = ['用户管理', 'Agent管理', '系统配置', '知识库', '模型服务', '监控', '发布管理'];
const opActions = ['创建', '更新', '删除', '查看', '导出', '审批', '启用', '禁用'];

const opLogs: OperationLog[] = Array.from({ length: 50 }, (_, i) => {
  const createdAt = ts(Math.floor(i / 5));
  return {
    id: `op_${i + 1}`,
    userId: `u_${(i % 5) + 1}`,
    username: users[i % 5],
    action: opActions[i % 8],
    module: modules[i % 7],
    target: `${modules[i % 7]}资源`,
    targetId: `res_${i + 1}`,
    detail: `${users[i % 5]} ${opActions[i % 8]}了${modules[i % 7]}中的资源 #${i + 1}`,
    ip: `192.168.1.${10 + (i % 30)}`,
    result: i % 9 === 0 ? 'failure' as const : 'success' as const,
    createdAt,
    operator: users[i % 5],
    time: createdAt,
  };
});

const services = ['api-gateway', 'agent-service', 'llm-proxy', 'kb-service', 'auth-service'];
const errMessages = ['Connection timeout', 'Out of memory', 'Rate limit exceeded', 'Invalid model response', 'Database deadlock', 'GPU OOM'];

const errLogs: ErrorLog[] = Array.from({ length: 30 }, (_, i) => {
  const lastSeen = ts(Math.floor(i / 6));
  return {
    id: `err_${i + 1}`,
    level: (i % 10 === 0 ? 'fatal' : i % 3 === 0 ? 'warning' : 'error') as 'fatal' | 'warning' | 'error',
    service: services[i % 5],
    message: errMessages[i % 6],
    stack: i % 2 === 0 ? `Error: ${errMessages[i % 6]}\n    at processRequest (service.js:${100 + i})\n    at handler (router.js:42)` : undefined,
    requestId: `req_${(3000 + i).toString(36)}`,
    userId: i % 3 === 0 ? `u_${(i % 5) + 1}` : undefined,
    count: 1 + Math.floor(Math.random() * 50),
    firstSeenAt: ts(Math.floor(i / 3) + 1),
    lastSeenAt: lastSeen,
    operator: i % 3 === 0 ? users[(i % 5)] : 'system',
    time: lastSeen,
    detail: errMessages[i % 6],
    target: services[i % 5],
  };
});

const opsQueue: OpsQueueItem[] = [
  { id: 'ops01', type: 'deployment', title: 'Agent服务v2.3.0部署', description: '包含性能优化和bug修复', status: 'pending', priority: 'high', assignee: 'admin', createdBy: 'zhangsan', createdAt: ts(1), updatedAt: ts(0), content: '包含性能优化和bug修复', risk: 'medium' },
  { id: 'ops02', type: 'migration', title: '数据库迁移-添加索引', description: '为call_logs表添加复合索引', status: 'in_progress', priority: 'medium', assignee: 'admin', createdBy: 'admin', createdAt: ts(2), updatedAt: ts(0), content: '为call_logs表添加复合索引', risk: 'high' },
  { id: 'ops03', type: 'maintenance', title: 'Redis集群扩容', description: '从3节点扩展到5节点', status: 'pending', priority: 'medium', createdBy: 'admin', createdAt: ts(3), updatedAt: ts(3), content: '从3节点扩展到5节点', risk: 'medium' },
  { id: 'ops04', type: 'review', title: '新工具安全审查', description: '审查知识图谱查询工具的安全性', status: 'pending', priority: 'low', assignee: 'wangwu', createdBy: 'lisi', createdAt: ts(5), updatedAt: ts(5), content: '审查知识图谱查询工具的安全性', risk: 'low' },
  { id: 'ops05', type: 'deployment', title: 'LLM代理网关升级', description: '升级到支持流式传输的新版本', status: 'completed', priority: 'high', assignee: 'admin', createdBy: 'admin', createdAt: ts(10), updatedAt: ts(8), content: '升级到支持流式传输的新版本', risk: 'high' },
  { id: 'ops06', type: 'maintenance', title: 'SSL证书续期', description: '*.school.edu域名证书即将到期', status: 'pending', priority: 'urgent', assignee: 'admin', createdBy: 'system', createdAt: ts(1), updatedAt: ts(1), content: '*.school.edu域名证书即将到期', risk: 'high' },
];

const sensitiveWords: SensitiveWord[] = [
  { id: 'sw01', word: '密码', category: '安全信息', level: 'warn', createdBy: 'admin', createdAt: ts(60) },
  { id: 'sw02', word: '身份证号', category: '个人隐私', level: 'block', createdBy: 'admin', createdAt: ts(60) },
  { id: 'sw03', word: '银行卡号', category: '金融信息', level: 'block', createdBy: 'admin', createdAt: ts(60) },
  { id: 'sw04', word: '考试答案', category: '学术诚信', level: 'block', createdBy: 'admin', createdAt: ts(45) },
  { id: 'sw05', word: '代写', category: '学术诚信', level: 'warn', createdBy: 'admin', createdAt: ts(45) },
  { id: 'sw06', word: '内部资料', category: '保密信息', level: 'replace', replacement: '***', createdBy: 'admin', createdAt: ts(30) },
  { id: 'sw07', word: '泄题', category: '学术诚信', level: 'block', createdBy: 'zhangsan', createdAt: ts(20) },
  { id: 'sw08', word: '手机号', category: '个人隐私', level: 'replace', replacement: '1XX****XXXX', createdBy: 'admin', createdAt: ts(60) },
];

const adminModelEndpoints: ModelEndpoint[] = [
  { id: 'ame01', name: '通义千问-Turbo (主)', provider: '阿里云', modelId: 'qwen-turbo', type: 'chat', endpoint: 'https://dashscope.aliyuncs.com/v1', region: 'cn-hangzhou', status: 'online', maxTokens: 8192, costPerInputToken: 0.00002, costPerOutputToken: 0.00006, rateLimit: 100, avgLatencyMs: 320, uptime: 99.95, createdAt: ts(90), updatedAt: ts(1) },
  { id: 'ame02', name: 'GPT-4o-mini (代理)', provider: 'OpenAI兼容', modelId: 'gpt-4o-mini', type: 'chat', endpoint: 'https://api.openai-proxy.com/v1', region: 'us-east', status: 'online', maxTokens: 16384, costPerInputToken: 0.00006, costPerOutputToken: 0.00018, rateLimit: 50, avgLatencyMs: 410, uptime: 99.8, createdAt: ts(60), updatedAt: ts(2) },
  { id: 'ame03', name: '文心 4.0', provider: '百度', modelId: 'ernie-4.0', type: 'chat', endpoint: 'https://aip.baidubce.com/v1', region: 'cn-beijing', status: 'online', maxTokens: 8192, costPerInputToken: 0.00003, costPerOutputToken: 0.00009, rateLimit: 80, avgLatencyMs: 380, uptime: 99.7, createdAt: ts(45), updatedAt: ts(3) },
];

const adminToolReviews = [
  { id: 'atr01', toolId: 'tl11', toolName: '知识图谱查询', submittedBy: 'wangwu', status: 'pending' as const, submittedAt: ts(10) },
  { id: 'atr02', toolId: 'tl_new1', toolName: '学生信息查询工具', submittedBy: 'wangwu', status: 'pending' as const, submittedAt: ts(3) },
  { id: 'atr03', toolId: 'tl_new2', toolName: '成绩分析工具', submittedBy: 'zhaoliu', status: 'pending' as const, submittedAt: ts(1) },
];

let nextGrId = 100;
let nextBkId = 100;
let nextSwId = 100;
let nextAmeId = 100;

export function registerHandlers(mock: MockAdapter): void {
  mock.onGet('/admin/resources').reply(() => mockOk(resources));

  mock.onGet('/admin/stats').reply(() => mockOk(stats));

  mock.onGet('/admin/health').reply(() => mockOk(healthChecks));

  mock.onGet('/admin/gateway-routes').reply(() => mockOk(gatewayRoutes));

  mock.onPost('/admin/gateway-routes').reply((config) => {
    const body = JSON.parse(config.data || '{}');
    const route: GatewayRoute = {
      id: 'gr_' + nextGrId++,
      path: body.path,
      method: body.method,
      upstream: body.upstream,
      rateLimit: body.rateLimit ?? 50,
      authRequired: body.authRequired ?? true,
      cors: body.cors ?? true,
      timeout: body.timeout ?? 30000,
      enabled: true,
      description: body.description,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      rps: body.rps ?? 0,
    };
    gatewayRoutes.push(route);
    return mockOk(route);
  });

  mock.onDelete(/\/admin\/gateway-routes\/([^/]+)$/).reply((config) => {
    const id = config.url!.match(/\/admin\/gateway-routes\/([^/]+)$/)?.[1];
    const idx = gatewayRoutes.findIndex((r) => r.id === id);
    if (idx >= 0) gatewayRoutes.splice(idx, 1);
    return mockOk(null);
  });

  mock.onGet('/admin/backups').reply(() => mockOk(backups));

  mock.onPost('/admin/backups').reply((config) => {
    const body = JSON.parse(config.data || '{}');
    const bk: BackupRecord = {
      id: 'bk_' + nextBkId++,
      name: body.name || '手动备份',
      type: body.type || 'full',
      status: 'pending',
      sizeMb: 0,
      duration: 0,
      target: body.target || 'oss://backup/manual/',
      createdBy: 'current_user',
      startedAt: new Date().toISOString(),
      schedule: body.schedule || 'manual',
      last: new Date().toISOString(),
      ok: true,
    };
    backups.push(bk);
    return mockOk(bk);
  });

  mock.onPost(/\/admin\/backups\/([^/]+)\/run$/).reply((config) => {
    const id = config.url!.match(/\/admin\/backups\/([^/]+)\/run/)?.[1];
    const idx = backups.findIndex((b) => b.id === id);
    if (idx >= 0) {
      backups[idx] = { ...backups[idx], status: 'running', startedAt: new Date().toISOString() };
      return mockOk(backups[idx]);
    }
    return [404, { code: 404, message: 'Not found', timestamp: Date.now() }];
  });

  mock.onGet('/admin/announcements').reply(() => mockOk(announcements));

  mock.onGet('/admin/op-logs').reply((config) => {
    const p = config.params || {};
    return paginate(opLogs, Number(p.page) || 1, Number(p.pageSize) || 20);
  });

  mock.onGet('/admin/err-logs').reply((config) => {
    const p = config.params || {};
    return paginate(errLogs, Number(p.page) || 1, Number(p.pageSize) || 20);
  });

  mock.onGet('/admin/audit-logs').reply((config) => {
    const p = config.params || {};
    return paginate(opLogs as any[], Number(p.page) || 1, Number(p.pageSize) || 20);
  });

  mock.onGet('/admin/tool-reviews').reply(() => mockOk(adminToolReviews));

  mock.onPut(/\/admin\/tool-reviews\/([^/]+)$/).reply((config) => {
    const id = config.url!.match(/\/admin\/tool-reviews\/([^/]+)$/)?.[1];
    const body = JSON.parse(config.data || '{}');
    const idx = adminToolReviews.findIndex((r) => r.id === id);
    if (idx >= 0) {
      (adminToolReviews[idx] as any) = { ...adminToolReviews[idx], ...body, reviewedAt: new Date().toISOString() };
      return mockOk(adminToolReviews[idx]);
    }
    return [404, { code: 404, message: 'Not found', timestamp: Date.now() }];
  });

  mock.onGet('/admin/ops-queue').reply(() => mockOk(opsQueue));

  mock.onPut(/\/admin\/ops-queue\/([^/]+)$/).reply((config) => {
    const id = config.url!.match(/\/admin\/ops-queue\/([^/]+)$/)?.[1];
    const body = JSON.parse(config.data || '{}');
    const idx = opsQueue.findIndex((o) => o.id === id);
    if (idx >= 0) {
      opsQueue[idx] = { ...opsQueue[idx], ...body, updatedAt: new Date().toISOString() };
      return mockOk(opsQueue[idx]);
    }
    return [404, { code: 404, message: 'Not found', timestamp: Date.now() }];
  });

  mock.onGet('/admin/sensitive-words').reply(() => mockOk(sensitiveWords));

  mock.onPost('/admin/sensitive-words').reply((config) => {
    const body = JSON.parse(config.data || '{}');
    const sw: SensitiveWord = {
      id: 'sw_' + nextSwId++,
      word: body.word,
      category: body.category || '其他',
      level: body.level || 'warn',
      replacement: body.replacement,
      createdBy: 'current_user',
      createdAt: new Date().toISOString(),
    };
    sensitiveWords.push(sw);
    return mockOk(sw);
  });

  mock.onDelete(/\/admin\/sensitive-words\/([^/]+)$/).reply((config) => {
    const id = config.url!.match(/\/admin\/sensitive-words\/([^/]+)$/)?.[1];
    const idx = sensitiveWords.findIndex((w) => w.id === id);
    if (idx >= 0) sensitiveWords.splice(idx, 1);
    return mockOk(null);
  });

  mock.onGet('/admin/model-endpoints').reply(() => mockOk(adminModelEndpoints));

  mock.onPost('/admin/model-endpoints').reply((config) => {
    const body = JSON.parse(config.data || '{}');
    const ep: ModelEndpoint = {
      id: 'ame_' + nextAmeId++,
      name: body.name,
      provider: body.provider,
      modelId: body.modelId,
      type: body.type || 'chat',
      endpoint: body.endpoint,
      region: body.region,
      status: 'online',
      maxTokens: body.maxTokens || 4096,
      costPerInputToken: body.costPerInputToken || 0.00002,
      costPerOutputToken: body.costPerOutputToken || 0.00006,
      rateLimit: body.rateLimit || 50,
      avgLatencyMs: 0,
      uptime: 100,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    adminModelEndpoints.push(ep);
    return mockOk(ep);
  });

  mock.onPut(/\/admin\/model-endpoints\/([^/]+)$/).reply((config) => {
    const id = config.url!.match(/\/admin\/model-endpoints\/([^/]+)$/)?.[1];
    const body = JSON.parse(config.data || '{}');
    const idx = adminModelEndpoints.findIndex((e) => e.id === id);
    if (idx >= 0) {
      adminModelEndpoints[idx] = { ...adminModelEndpoints[idx], ...body, updatedAt: new Date().toISOString() };
      return mockOk(adminModelEndpoints[idx]);
    }
    return [404, { code: 404, message: 'Not found', timestamp: Date.now() }];
  });

  mock.onDelete(/\/admin\/model-endpoints\/([^/]+)$/).reply((config) => {
    const id = config.url!.match(/\/admin\/model-endpoints\/([^/]+)$/)?.[1];
    const idx = adminModelEndpoints.findIndex((e) => e.id === id);
    if (idx >= 0) adminModelEndpoints.splice(idx, 1);
    return mockOk(null);
  });
}
