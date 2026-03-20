import type MockAdapter from 'axios-mock-adapter';
import type {
  PromptTemplate,
  TermEntry,
  SecretEntry,
  MemoryEntry,
  DocumentAsset,
} from '../../../types/dto/asset';
import { mockOk, paginate } from '../mockAdapter';

function ts(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString();
}

const prompts: PromptTemplate[] = [
  { id: 'pt01', name: '教务标准回答', content: '你是学校教务助手，回答需引用校规条款。对于不确定的信息，请指引学生联系教务处。', description: '教务场景通用Prompt', category: '教务', variables: [{ name: 'student_name', type: 'string', required: false, description: '学生姓名' }], tags: ['教务', '标准'], usageCount: 340, createdBy: 'admin', createdAt: ts(60), updatedAt: ts(5) },
  { id: 'pt02', name: '招生咨询话术', content: '你是招生办助手，请用热情专业的语气回答考生及家长关于招生政策、分数线、专业设置的问题。', description: '招生场景Prompt模板', category: '招生', variables: [{ name: 'year', type: 'number', required: true, description: '招生年份' }], tags: ['招生', '咨询'], usageCount: 220, createdBy: 'zhangsan', createdAt: ts(45), updatedAt: ts(10) },
  { id: 'pt03', name: '论文摘要生成', content: '请为以下论文生成结构化摘要，包含：研究背景、方法、结果、结论四部分，每部分不超过50字。\n\n论文内容：{{paper_content}}', description: '学术论文摘要模板', category: '学术', variables: [{ name: 'paper_content', type: 'string', required: true, description: '论文全文' }], tags: ['论文', '摘要'], usageCount: 180, createdBy: 'lisi', createdAt: ts(30), updatedAt: ts(8) },
  { id: 'pt04', name: '实验报告辅助', content: '你是实验指导教师，请帮助学生规范实验报告的撰写，确保包含实验目的、原理、步骤、数据和分析。', description: '实验报告撰写指导', category: '教学', variables: [{ name: 'experiment_name', type: 'string', required: true, description: '实验名称' }], tags: ['实验', '报告'], usageCount: 95, createdBy: 'wangwu', createdAt: ts(20), updatedAt: ts(12) },
  { id: 'pt05', name: '多语言欢迎语', content: '以{{language}}欢迎用户，并简要介绍可以提供的服务。保持友好专业的语气。', description: '多语言场景通用欢迎', category: '通用', variables: [{ name: 'language', type: 'enum', required: true, description: '目标语言', options: ['中文', 'English', '日本語', '한국어'] }], tags: ['多语言', '欢迎'], usageCount: 450, createdBy: 'admin', createdAt: ts(50), updatedAt: ts(3) },
  { id: 'pt06', name: '数据分析指令', content: '请分析以下数据并生成报告，包含关键指标、趋势分析和改进建议。输出格式为Markdown表格和文字说明。', description: '数据分析报告模板', category: '数据', variables: [], tags: ['数据', '分析', '报告'], usageCount: 130, createdBy: 'admin', createdAt: ts(25), updatedAt: ts(7) },
];

const terms: TermEntry[] = [
  { id: 'tm01', term: 'GPA', definition: '平均学分绩点（Grade Point Average），衡量学业成绩的指标', category: '学术', synonyms: ['绩点', '学分绩'], createdAt: ts(90) },
  { id: 'tm02', term: '通识课', definition: '跨学科基础课程模块，旨在拓宽知识面', category: '课程', synonyms: ['通识教育', '公共选修'], createdAt: ts(90) },
  { id: 'tm03', term: '学分', definition: '衡量课程学习量的单位，通常1学分对应16-18学时', category: '学术', synonyms: ['credit'], createdAt: ts(90) },
  { id: 'tm04', term: 'RAG', definition: '检索增强生成（Retrieval-Augmented Generation），结合检索和生成的AI技术', category: '技术', synonyms: ['检索增强生成'], createdAt: ts(45) },
  { id: 'tm05', term: 'MCP', definition: 'Model Context Protocol，模型上下文协议，用于AI工具集成', category: '技术', synonyms: ['模型上下文协议'], createdAt: ts(30) },
  { id: 'tm06', term: '保研', definition: '推荐免试攻读研究生，即推免', category: '学术', synonyms: ['推免', '免试读研'], createdAt: ts(90) },
  { id: 'tm07', term: 'Agent', definition: '智能体，具备感知、决策和执行能力的AI实体', category: '技术', synonyms: ['智能体', 'AI Agent'], createdAt: ts(60) },
  { id: 'tm08', term: '向量化', definition: '将文本转换为高维数值向量的过程，用于语义检索', category: '技术', synonyms: ['Embedding', '嵌入'], createdAt: ts(45) },
];

const secrets: SecretEntry[] = [
  { id: 'se01', name: 'DASHSCOPE_API_KEY', maskedValue: 'sk-****2a9f', type: 'api_key', description: '阿里云DashScope服务密钥', createdAt: ts(60) },
  { id: 'se02', name: 'OPENAI_API_KEY', maskedValue: 'sk-****e4b1', type: 'api_key', description: 'OpenAI兼容接口密钥', createdAt: ts(45) },
  { id: 'se03', name: 'BAIDU_ACCESS_TOKEN', maskedValue: 'tk-****8c3d', type: 'token', description: '百度文心API访问令牌', createdAt: ts(30) },
  { id: 'se04', name: 'DB_PASSWORD', maskedValue: '****', type: 'password', description: '教务主库连接密码', createdAt: ts(90) },
  { id: 'se05', name: 'DEEPSEEK_API_KEY', maskedValue: 'sk-****f7a2', type: 'api_key', description: 'DeepSeek服务密钥', createdAt: ts(20) },
  { id: 'se06', name: 'WEBHOOK_SECRET', maskedValue: 'whsec_****', type: 'token', description: 'Webhook签名密钥', expiresAt: ts(-60), createdAt: ts(45) },
];

const memories: MemoryEntry[] = [
  { id: 'mem01', key: 'user_preference_language', value: '用户偏好中文回复', scope: 'user', ttl: 86400, createdAt: ts(5), updatedAt: ts(2) },
  { id: 'mem02', key: 'agent_context_edu', value: '用户上次咨询了选课相关问题', scope: 'agent', agentId: 'ag01', createdAt: ts(1), updatedAt: ts(0) },
  { id: 'mem03', key: 'global_announcement', value: '系统将于周六凌晨维护', scope: 'global', createdAt: ts(2), updatedAt: ts(2) },
  { id: 'mem04', key: 'student_interest', value: '用户关注考研与保研政策', scope: 'user', createdAt: ts(10), updatedAt: ts(3) },
  { id: 'mem05', key: 'session_context', value: '当前对话涉及图书馆借阅规则', scope: 'session', ttl: 3600, createdAt: ts(0), updatedAt: ts(0) },
  { id: 'mem06', key: 'agent_persona', value: '心理咨询助手应保持温和鼓励的语气', scope: 'agent', agentId: 'ag05', createdAt: ts(15), updatedAt: ts(15) },
];

const documentAssets: DocumentAsset[] = [
  { id: 'da01', name: '校规汇编2025.pdf', type: 'application/pdf', size: 5200000, url: '#', status: 'ready', metadata: { pages: '120' }, createdBy: 'admin', createdAt: ts(60) },
  { id: 'da02', name: '培养方案模板.docx', type: 'application/docx', size: 280000, url: '#', status: 'ready', metadata: {}, createdBy: 'zhangsan', createdAt: ts(30) },
  { id: 'da03', name: '招生数据2026.xlsx', type: 'application/xlsx', size: 1500000, url: '#', status: 'ready', metadata: { rows: '5200' }, createdBy: 'lisi', createdAt: ts(15) },
  { id: 'da04', name: '实验室安全手册.pdf', type: 'application/pdf', size: 3800000, url: '#', status: 'processing', metadata: {}, createdBy: 'wangwu', createdAt: ts(2) },
  { id: 'da05', name: '就业统计报告.csv', type: 'text/csv', size: 420000, url: '#', status: 'ready', metadata: { rows: '8500' }, createdBy: 'admin', createdAt: ts(10) },
];

let nextPtId = 100;
let nextTmId = 100;
let nextSeId = 100;
let nextMemId = 100;

export function registerHandlers(mock: MockAdapter): void {
  mock.onGet('/assets/prompts').reply((config) => {
    const p = config.params || {};
    return paginate(prompts, Number(p.page) || 1, Number(p.pageSize) || 20);
  });

  mock.onPost('/assets/prompts').reply((config) => {
    const body = JSON.parse(config.data || '{}');
    const pt: PromptTemplate = {
      id: 'pt_' + nextPtId++,
      name: body.name,
      content: body.content,
      description: body.description,
      category: body.category || '通用',
      variables: body.variables || [],
      tags: body.tags || [],
      usageCount: 0,
      createdBy: 'current_user',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    prompts.push(pt);
    return mockOk(pt);
  });

  mock.onPut(/\/assets\/prompts\/([^/]+)$/).reply((config) => {
    const id = config.url!.match(/\/assets\/prompts\/([^/]+)$/)?.[1];
    const body = JSON.parse(config.data || '{}');
    const idx = prompts.findIndex((p) => p.id === id);
    if (idx >= 0) {
      prompts[idx] = { ...prompts[idx], ...body, updatedAt: new Date().toISOString() };
      return mockOk(prompts[idx]);
    }
    return [404, { code: 404, message: 'Not found', timestamp: Date.now() }];
  });

  mock.onDelete(/\/assets\/prompts\/([^/]+)$/).reply((config) => {
    const id = config.url!.match(/\/assets\/prompts\/([^/]+)$/)?.[1];
    const idx = prompts.findIndex((p) => p.id === id);
    if (idx >= 0) prompts.splice(idx, 1);
    return mockOk(null);
  });

  mock.onGet('/assets/terms').reply(() => mockOk(terms));

  mock.onPost('/assets/terms').reply((config) => {
    const body = JSON.parse(config.data || '{}');
    const tm: TermEntry = {
      id: 'tm_' + nextTmId++,
      term: body.term,
      definition: body.definition,
      category: body.category || '其他',
      synonyms: body.synonyms || [],
      createdAt: new Date().toISOString(),
    };
    terms.push(tm);
    return mockOk(tm);
  });

  mock.onDelete(/\/assets\/terms\/([^/]+)$/).reply((config) => {
    const id = config.url!.match(/\/assets\/terms\/([^/]+)$/)?.[1];
    const idx = terms.findIndex((t) => t.id === id);
    if (idx >= 0) terms.splice(idx, 1);
    return mockOk(null);
  });

  mock.onGet('/assets/secrets').reply(() => mockOk(secrets));

  mock.onPost('/assets/secrets').reply((config) => {
    const body = JSON.parse(config.data || '{}');
    const se: SecretEntry = {
      id: 'se_' + nextSeId++,
      name: body.name,
      maskedValue: '****',
      type: body.type || 'api_key',
      description: body.description,
      expiresAt: body.expiresAt,
      createdAt: new Date().toISOString(),
    };
    secrets.push(se);
    return mockOk(se);
  });

  mock.onDelete(/\/assets\/secrets\/([^/]+)$/).reply((config) => {
    const id = config.url!.match(/\/assets\/secrets\/([^/]+)$/)?.[1];
    const idx = secrets.findIndex((s) => s.id === id);
    if (idx >= 0) secrets.splice(idx, 1);
    return mockOk(null);
  });

  mock.onGet('/assets/memories').reply(() => mockOk(memories));

  mock.onPost('/assets/memories').reply((config) => {
    const body = JSON.parse(config.data || '{}');
    const mem: MemoryEntry = {
      id: 'mem_' + nextMemId++,
      key: body.key,
      value: body.value,
      scope: body.scope || 'global',
      agentId: body.agentId,
      ttl: body.ttl,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    memories.push(mem);
    return mockOk(mem);
  });

  mock.onDelete(/\/assets\/memories\/([^/]+)$/).reply((config) => {
    const id = config.url!.match(/\/assets\/memories\/([^/]+)$/)?.[1];
    const idx = memories.findIndex((m) => m.id === id);
    if (idx >= 0) memories.splice(idx, 1);
    return mockOk(null);
  });

  mock.onGet('/assets/documents').reply(() => mockOk(documentAssets));

  mock.onPost('/assets/documents/upload').reply(() => {
    const doc: DocumentAsset = {
      id: 'da_' + Date.now().toString(36),
      name: '新上传文件_' + Date.now() + '.pdf',
      type: 'application/pdf',
      size: 1000000,
      url: '#',
      status: 'processing',
      metadata: {},
      createdBy: 'current_user',
      createdAt: new Date().toISOString(),
    };
    documentAssets.push(doc);
    return mockOk(doc);
  });
}
