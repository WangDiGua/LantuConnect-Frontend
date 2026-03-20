import type MockAdapter from 'axios-mock-adapter';
import type { Agent, AgentVersion, AgentMarketItem, DebugMessageResponse } from '../../../types/dto/agent';
import { mockOk, paginate } from '../mockAdapter';

const agents: Agent[] = [
  { id: 'ag01', name: '教务问答助手', description: '回答学生选课、学分、考试等教务相关问题', type: 'chat', status: 'published', modelId: 'm1', modelName: '通义千问-Turbo', systemPrompt: '你是大学教务助手', temperature: 0.7, maxTokens: 2048, topP: 0.9, tools: ['search'], knowledgeBases: ['kb01'], tags: ['教务', '问答'], version: 'v1.3.0', publishedAt: '2026-03-15T10:00:00Z', callCount: 12450, avgLatencyMs: 320, successRate: 0.982, createdBy: 'admin', createdAt: '2025-10-01T00:00:00Z', updatedAt: '2026-03-15T10:00:00Z' },
  { id: 'ag02', name: '招生咨询机器人', description: '面向考生和家长的智能招生问答', type: 'chat', status: 'published', modelId: 'm2', modelName: 'GPT-4o-mini', systemPrompt: '你是招生办助手', temperature: 0.5, maxTokens: 4096, topP: 0.95, tools: [], knowledgeBases: ['kb02'], tags: ['招生', '咨询'], version: 'v2.1.0', publishedAt: '2026-03-10T08:00:00Z', callCount: 8920, avgLatencyMs: 410, successRate: 0.976, createdBy: 'zhangsan', createdAt: '2025-11-15T00:00:00Z', updatedAt: '2026-03-10T08:00:00Z' },
  { id: 'ag03', name: '论文摘要生成器', description: '自动为论文生成结构化摘要', type: 'task', status: 'published', modelId: 'm1', modelName: '通义千问-Turbo', temperature: 0.3, maxTokens: 1024, topP: 0.8, tools: [], knowledgeBases: [], tags: ['论文', '摘要', '学术'], version: 'v1.0.0', publishedAt: '2026-02-20T12:00:00Z', callCount: 3200, avgLatencyMs: 580, successRate: 0.991, createdBy: 'lisi', createdAt: '2026-01-05T00:00:00Z', updatedAt: '2026-02-20T12:00:00Z' },
  { id: 'ag04', name: '课程推荐引擎', description: '根据学生兴趣和培养方案推荐课程', type: 'task', status: 'draft', modelId: 'm3', modelName: '文心 4.0', temperature: 0.6, maxTokens: 2048, topP: 0.9, tools: ['recommend'], knowledgeBases: ['kb03'], tags: ['课程', '推荐'], version: 'v0.2.0', callCount: 0, avgLatencyMs: 0, successRate: 0, createdBy: 'wangwu', createdAt: '2026-03-01T00:00:00Z', updatedAt: '2026-03-18T14:00:00Z' },
  { id: 'ag05', name: '心理健康疏导', description: '提供初级心理咨询与情绪疏导对话', type: 'chat', status: 'published', modelId: 'm1', modelName: '通义千问-Turbo', systemPrompt: '你是一位温和的心理辅导员', temperature: 0.8, maxTokens: 4096, topP: 0.95, tools: [], knowledgeBases: ['kb04'], tags: ['心理', '健康', '咨询'], version: 'v1.1.0', publishedAt: '2026-03-05T09:00:00Z', callCount: 5600, avgLatencyMs: 350, successRate: 0.988, createdBy: 'admin', createdAt: '2025-12-01T00:00:00Z', updatedAt: '2026-03-05T09:00:00Z' },
  { id: 'ag06', name: '图书馆智能检索', description: '辅助师生进行文献检索与资源导航', type: 'chat', status: 'published', modelId: 'm2', modelName: 'GPT-4o-mini', temperature: 0.4, maxTokens: 2048, topP: 0.85, tools: ['search', 'cite'], knowledgeBases: ['kb05'], tags: ['图书馆', '检索'], version: 'v1.0.0', publishedAt: '2026-02-28T16:00:00Z', callCount: 7800, avgLatencyMs: 390, successRate: 0.972, createdBy: 'zhangsan', createdAt: '2025-11-20T00:00:00Z', updatedAt: '2026-02-28T16:00:00Z' },
  { id: 'ag07', name: '实验室安全培训', description: '模拟实验室安全考核问答场景', type: 'chat', status: 'draft', modelId: 'm1', modelName: '通义千问-Turbo', temperature: 0.3, maxTokens: 1024, topP: 0.8, tools: [], knowledgeBases: ['kb06'], tags: ['实验室', '安全'], version: 'v0.1.0', callCount: 120, avgLatencyMs: 280, successRate: 0.95, createdBy: 'lisi', createdAt: '2026-03-10T00:00:00Z', updatedAt: '2026-03-19T11:00:00Z' },
  { id: 'ag08', name: '自动评阅助手', description: '对学生作业和简答题进行辅助评分', type: 'task', status: 'published', modelId: 'm3', modelName: '文心 4.0', temperature: 0.2, maxTokens: 2048, topP: 0.7, tools: ['grade'], knowledgeBases: [], tags: ['评阅', '作业', 'AI批改'], version: 'v1.2.0', publishedAt: '2026-03-12T10:00:00Z', callCount: 4500, avgLatencyMs: 620, successRate: 0.965, createdBy: 'admin', createdAt: '2026-01-15T00:00:00Z', updatedAt: '2026-03-12T10:00:00Z' },
  { id: 'ag09', name: '校园活动助手', description: '回答社团活动、校园赛事等相关问题', type: 'chat', status: 'published', modelId: 'm1', modelName: '通义千问-Turbo', temperature: 0.7, maxTokens: 2048, topP: 0.9, tools: [], knowledgeBases: ['kb07'], tags: ['校园', '活动', '社团'], version: 'v1.0.0', publishedAt: '2026-03-01T14:00:00Z', callCount: 2100, avgLatencyMs: 310, successRate: 0.979, createdBy: 'wangwu', createdAt: '2026-02-10T00:00:00Z', updatedAt: '2026-03-01T14:00:00Z' },
  { id: 'ag10', name: '就业指导顾问', description: '提供简历优化、面试模拟、职业规划建议', type: 'chat', status: 'published', modelId: 'm2', modelName: 'GPT-4o-mini', systemPrompt: '你是经验丰富的就业指导老师', temperature: 0.6, maxTokens: 4096, topP: 0.9, tools: ['search'], knowledgeBases: ['kb08'], tags: ['就业', '简历', '面试'], version: 'v2.0.0', publishedAt: '2026-03-08T11:00:00Z', callCount: 6300, avgLatencyMs: 450, successRate: 0.985, createdBy: 'zhangsan', createdAt: '2025-10-20T00:00:00Z', updatedAt: '2026-03-08T11:00:00Z' },
  { id: 'ag11', name: '翻译润色工具', description: '中英双语翻译与学术论文润色', type: 'task', status: 'published', modelId: 'm2', modelName: 'GPT-4o-mini', temperature: 0.3, maxTokens: 8192, topP: 0.85, tools: [], knowledgeBases: [], tags: ['翻译', '润色', '学术'], version: 'v1.1.0', publishedAt: '2026-02-25T15:00:00Z', callCount: 9100, avgLatencyMs: 520, successRate: 0.993, createdBy: 'admin', createdAt: '2025-11-01T00:00:00Z', updatedAt: '2026-02-25T15:00:00Z' },
  { id: 'ag12', name: '宿舍报修助手', description: '引导学生完成宿舍维修申报流程', type: 'workflow', status: 'published', modelId: 'm1', modelName: '通义千问-Turbo', temperature: 0.5, maxTokens: 1024, topP: 0.8, tools: ['submit_ticket'], knowledgeBases: [], tags: ['后勤', '报修', '宿舍'], version: 'v1.0.0', publishedAt: '2026-03-18T09:00:00Z', callCount: 1800, avgLatencyMs: 290, successRate: 0.996, createdBy: 'lisi', createdAt: '2026-03-05T00:00:00Z', updatedAt: '2026-03-18T09:00:00Z' },
  { id: 'ag13', name: '科研项目查询', description: '查询校内科研项目申报进度与经费信息', type: 'chat', status: 'draft', modelId: 'm3', modelName: '文心 4.0', temperature: 0.4, maxTokens: 2048, topP: 0.85, tools: ['search'], knowledgeBases: ['kb09'], tags: ['科研', '项目', '经费'], version: 'v0.3.0', callCount: 340, avgLatencyMs: 400, successRate: 0.97, createdBy: 'wangwu', createdAt: '2026-02-20T00:00:00Z', updatedAt: '2026-03-17T16:00:00Z' },
  { id: 'ag14', name: '数据分析助手', description: '辅助教师进行教学数据统计分析', type: 'task', status: 'archived', modelId: 'm1', modelName: '通义千问-Turbo', temperature: 0.2, maxTokens: 4096, topP: 0.7, tools: ['python_exec', 'chart'], knowledgeBases: [], tags: ['数据', '分析', '教学'], version: 'v1.5.0', publishedAt: '2026-01-20T10:00:00Z', callCount: 2800, avgLatencyMs: 680, successRate: 0.958, createdBy: 'admin', createdAt: '2025-09-15T00:00:00Z', updatedAt: '2026-03-01T00:00:00Z' },
  { id: 'ag15', name: '多语言客服', description: '面向留学生的中英日韩多语种服务', type: 'chat', status: 'published', modelId: 'm2', modelName: 'GPT-4o-mini', systemPrompt: '多语种服务助手', temperature: 0.6, maxTokens: 4096, topP: 0.9, tools: ['translate'], knowledgeBases: ['kb10'], tags: ['多语言', '留学生', '客服'], version: 'v1.0.0', publishedAt: '2026-03-19T08:00:00Z', callCount: 1500, avgLatencyMs: 480, successRate: 0.974, createdBy: 'zhangsan', createdAt: '2026-03-10T00:00:00Z', updatedAt: '2026-03-19T08:00:00Z' },
  { id: 'ag16', name: '校历提醒Bot', description: '推送教学周历程和关键日期提醒', type: 'workflow', status: 'published', modelId: 'm1', modelName: '通义千问-Turbo', temperature: 0.3, maxTokens: 512, topP: 0.8, tools: ['calendar', 'notify'], knowledgeBases: [], tags: ['校历', '提醒'], version: 'v1.0.0', publishedAt: '2026-02-15T10:00:00Z', callCount: 4200, avgLatencyMs: 180, successRate: 0.998, createdBy: 'admin', createdAt: '2026-02-01T00:00:00Z', updatedAt: '2026-02-15T10:00:00Z' },
];

const versions: AgentVersion[] = [
  { id: 'av01', agentId: 'ag01', version: 'v1.3.0', changelog: '优化教务问答准确率', snapshot: {}, createdBy: 'admin', createdAt: '2026-03-15T10:00:00Z', current: true, publishedAt: '2026-03-15T10:00:00Z', note: '当前生产版本' },
  { id: 'av02', agentId: 'ag01', version: 'v1.2.0', changelog: '新增学分查询功能', snapshot: {}, createdBy: 'admin', createdAt: '2026-02-20T10:00:00Z', current: false, publishedAt: '2026-02-20T10:00:00Z' },
  { id: 'av03', agentId: 'ag01', version: 'v1.1.0', changelog: '接入校规知识库', snapshot: {}, createdBy: 'zhangsan', createdAt: '2026-01-10T10:00:00Z', current: false, publishedAt: '2026-01-10T10:00:00Z' },
  { id: 'av04', agentId: 'ag01', version: 'v1.0.0', changelog: '首次发布', snapshot: {}, createdBy: 'admin', createdAt: '2025-10-01T10:00:00Z', current: false, publishedAt: '2025-10-01T10:00:00Z' },
];

const marketItems: AgentMarketItem[] = [
  { id: 'mkt01', name: '通用客服助手', description: '适配多行业的智能客服解决方案', author: '蓝图官方', category: '客服', tags: ['客服', '通用'], rating: 4.8, usageCount: 25000, price: 'free', featured: true, createdAt: '2025-08-01T00:00:00Z' },
  { id: 'mkt02', name: '法律咨询机器人', description: '基于中国法律法规的智能咨询', author: '智法科技', category: '法律', tags: ['法律', '咨询'], rating: 4.6, usageCount: 12000, price: 99, featured: true, createdAt: '2025-09-15T00:00:00Z' },
  { id: 'mkt03', name: '代码审查助手', description: '自动审查代码质量并给出优化建议', author: '极客工坊', category: '开发', tags: ['代码', '审查', 'DevOps'], rating: 4.7, usageCount: 18500, price: 'free', featured: true, createdAt: '2025-10-01T00:00:00Z' },
  { id: 'mkt04', name: '医疗问诊预检', description: '辅助患者完成在线预检分诊', author: '健康AI', category: '医疗', tags: ['医疗', '问诊'], rating: 4.5, usageCount: 8000, price: 199, featured: false, createdAt: '2025-11-10T00:00:00Z' },
  { id: 'mkt05', name: '金融研报摘要', description: '快速生成金融研报要点摘要', author: '量化智能', category: '金融', tags: ['金融', '研报'], rating: 4.4, usageCount: 6500, price: 149, featured: false, createdAt: '2025-12-01T00:00:00Z' },
  { id: 'mkt06', name: '营销文案生成器', description: '一键生成多平台营销文案', author: '蓝图官方', category: '营销', tags: ['营销', '文案', '创意'], rating: 4.9, usageCount: 31000, price: 'free', featured: true, createdAt: '2025-08-20T00:00:00Z' },
  { id: 'mkt07', name: 'HR面试助手', description: '辅助HR进行简历筛选和面试评估', author: '人才通', category: '人力资源', tags: ['HR', '面试', '招聘'], rating: 4.3, usageCount: 4200, price: 79, featured: false, createdAt: '2026-01-05T00:00:00Z' },
  { id: 'mkt08', name: '学术写作指导', description: '指导论文写作格式与学术规范', author: '学术通', category: '教育', tags: ['学术', '论文', '写作'], rating: 4.7, usageCount: 15000, price: 'free', featured: true, createdAt: '2025-09-01T00:00:00Z' },
  { id: 'mkt09', name: '电商客服', description: '处理售前咨询、订单查询及售后服务', author: '商智科技', category: '电商', tags: ['电商', '客服', '售后'], rating: 4.5, usageCount: 20000, price: 129, featured: false, createdAt: '2025-10-20T00:00:00Z' },
  { id: 'mkt10', name: '多语言翻译器', description: '支持50+语言实时互译', author: '蓝图官方', category: '工具', tags: ['翻译', '多语言'], rating: 4.8, usageCount: 28000, price: 'free', featured: true, createdAt: '2025-07-15T00:00:00Z' },
];

let nextId = 100;

export function registerHandlers(mock: MockAdapter): void {
  mock.onGet('/agents').reply((config) => {
    const p = config.params || {};
    return paginate(agents, Number(p.page) || 1, Number(p.pageSize) || 20);
  });

  mock.onGet(/\/agents\/([^/]+)\/versions$/).reply((config) => {
    const id = config.url!.match(/\/agents\/([^/]+)\/versions/)?.[1];
    return mockOk(versions.filter((v) => v.agentId === id));
  });

  mock.onPost(/\/agents\/([^/]+)\/debug$/).reply(() => {
    const resp: DebugMessageResponse = {
      reply: '根据校规第三章第二节规定，通识课程模块要求修满 8 学分，其中跨学科课程不少于 2 学分。建议您查看教务系统的培养方案页面获取详细信息。',
      usage: { promptTokens: 256, completionTokens: 128, totalTokens: 384 },
      latencyMs: 320 + Math.floor(Math.random() * 200),
      traceId: 'tr_' + Date.now().toString(36),
    };
    return mockOk(resp);
  });

  mock.onGet(/\/agents\/([^/]+)$/).reply((config) => {
    const id = config.url!.match(/\/agents\/([^/]+)$/)?.[1];
    const agent = agents.find((a) => a.id === id);
    return agent ? mockOk(agent) : [404, { code: 404, message: 'Agent not found', timestamp: Date.now() }];
  });

  mock.onPost('/agents').reply((config) => {
    const body = JSON.parse(config.data || '{}');
    const newAgent: Agent = {
      id: 'ag_' + nextId++,
      name: body.name || '新建Agent',
      description: body.description || '',
      type: body.type || 'chat',
      status: 'draft',
      modelId: body.modelId || 'm1',
      modelName: '通义千问-Turbo',
      systemPrompt: body.systemPrompt,
      temperature: body.temperature ?? 0.7,
      maxTokens: body.maxTokens ?? 2048,
      topP: body.topP ?? 0.9,
      tools: body.tools || [],
      knowledgeBases: body.knowledgeBases || [],
      tags: body.tags || [],
      version: 'v0.1.0',
      callCount: 0,
      avgLatencyMs: 0,
      successRate: 0,
      createdBy: 'current_user',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    agents.unshift(newAgent);
    return mockOk(newAgent);
  });

  mock.onPut(/\/agents\/([^/]+)$/).reply((config) => {
    const id = config.url!.match(/\/agents\/([^/]+)$/)?.[1];
    const body = JSON.parse(config.data || '{}');
    const idx = agents.findIndex((a) => a.id === id);
    if (idx >= 0) {
      agents[idx] = { ...agents[idx], ...body, updatedAt: new Date().toISOString() };
      return mockOk(agents[idx]);
    }
    return [404, { code: 404, message: 'Agent not found', timestamp: Date.now() }];
  });

  mock.onDelete(/\/agents\/([^/]+)$/).reply((config) => {
    const id = config.url!.match(/\/agents\/([^/]+)$/)?.[1];
    const idx = agents.findIndex((a) => a.id === id);
    if (idx >= 0) agents.splice(idx, 1);
    return mockOk(null);
  });

  mock.onGet('/agent-market').reply((config) => {
    const p = config.params || {};
    return paginate(marketItems, Number(p.page) || 1, Number(p.pageSize) || 20);
  });
}
