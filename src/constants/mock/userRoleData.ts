/** 用户角色各页面 mock 数据（可替换为 API） */

export interface MockProject {
  id: string;
  name: string;
  type: 'Agent' | '工作流' | '知识库';
  updatedAt: string;
  pinned: boolean;
}

export interface MockWorkflow {
  id: string;
  name: string;
  description: string;
  status: 'draft' | 'published';
  updatedAt: string;
  steps: string[];
}

export interface MockWorkflowRun {
  id: string;
  workflowName: string;
  status: 'success' | 'failed' | 'running';
  startedAt: string;
  durationMs: number;
  log: string;
}

export interface MockSchedule {
  id: string;
  workflowId: string;
  cron: string;
  enabled: boolean;
  lastRun?: string;
}

export interface MockWebhook {
  id: string;
  url: string;
  events: string[];
  secret: string;
  enabled: boolean;
}

export interface MockShareLink {
  id: string;
  name: string;
  url: string;
  enabled: boolean;
  visits: number;
}

export interface MockConversation {
  id: string;
  title: string;
  agentName: string;
  lastMessage: string;
  updatedAt: string;
  messages: { role: 'user' | 'assistant'; content: string; at: string }[];
}

export interface MockDataset {
  id: string;
  name: string;
  rows: number;
  updatedAt: string;
}

export interface MockEvalRun {
  id: string;
  name: string;
  modelA: string;
  modelB: string;
  scoreA: number;
  scoreB: number;
  status: 'done' | 'running';
}

export interface MockABTest {
  id: string;
  name: string;
  trafficA: number;
  winner?: 'A' | 'B';
  status: 'active' | 'ended';
}

export interface MockLabelTask {
  id: string;
  text: string;
  label?: 'good' | 'bad' | 'pending';
}

export interface MockPromptTpl {
  id: string;
  name: string;
  content: string;
  updatedAt: string;
}

export interface MockTerm {
  id: string;
  term: string;
  definition: string;
}

export interface MockSecretVar {
  id: string;
  key: string;
  masked: string;
  scope: 'project' | 'global';
}

export interface MockMemoryEntry {
  id: string;
  userId: string;
  content: string;
  updatedAt: string;
}

export interface MockInvoice {
  id: string;
  period: string;
  amount: number;
  status: 'paid' | 'unpaid';
}

export const INITIAL_PROJECTS: MockProject[] = [
  { id: 'p1', name: '教务问答 Agent', type: 'Agent', updatedAt: '2026-03-19 14:20', pinned: true },
  { id: 'p2', name: '论文摘要工作流', type: '工作流', updatedAt: '2026-03-18 09:10', pinned: false },
  { id: 'p3', name: '校规知识库', type: '知识库', updatedAt: '2026-03-17 16:45', pinned: true },
];

export const INITIAL_WORKFLOWS: MockWorkflow[] = [
  {
    id: 'w1',
    name: '招生咨询分流',
    description: '意图识别后路由不同子流程',
    status: 'published',
    updatedAt: '2026-03-19',
    steps: ['开始', '意图分类', '知识检索', '回复生成', '结束'],
  },
  {
    id: 'w2',
    name: '空模板',
    description: '新建空白',
    status: 'draft',
    updatedAt: '2026-03-15',
    steps: ['开始', '结束'],
  },
];

export const INITIAL_RUNS: MockWorkflowRun[] = [
  {
    id: 'r1',
    workflowName: '招生咨询分流',
    status: 'success',
    startedAt: '2026-03-19 10:00:01',
    durationMs: 842,
    log: '[10:00:01] 开始执行\n[10:00:01] 意图: 咨询分数线\n[10:00:02] 检索命中 3 条\n[10:00:02] 完成',
  },
  {
    id: 'r2',
    workflowName: '招生咨询分流',
    status: 'failed',
    startedAt: '2026-03-19 09:12:33',
    durationMs: 12040,
    log: '[09:12:33] 开始执行\n[09:12:44] 模型超时',
  },
];

export const INITIAL_SCHEDULES: MockSchedule[] = [
  { id: 's1', workflowId: 'w1', cron: '0 9 * * 1-5', enabled: true, lastRun: '2026-03-19 09:00' },
];

export const WF_TEMPLATES = [
  { id: 't1', name: 'RAG 问答', desc: '检索 + 生成', steps: ['开始', '向量检索', 'LLM', '结束'] },
  { id: 't2', name: '简单对话', desc: '单轮 LLM', steps: ['开始', 'LLM', '结束'] },
];

export const MOCK_MODEL_CARDS = [
  { id: 'm1', name: '通义千问-Turbo', vendor: '校内网关', latency: '320ms' },
  { id: 'm2', name: 'GPT-4o-mini', vendor: 'OpenAI 兼容', latency: '410ms' },
  { id: 'm3', name: '文心 4.0', vendor: '百度', latency: '380ms' },
];

export const INITIAL_CONVERSATIONS: MockConversation[] = [
  {
    id: 'c1',
    title: '选课学分问题',
    agentName: '教务助手',
    lastMessage: '通识课需修满 8 学分...',
    updatedAt: '2026-03-19 11:02',
    messages: [
      { role: 'user', content: '通识课要多少学分？', at: '11:00' },
      { role: 'assistant', content: '通识课需修满 8 学分，其中跨学科至少 2 学分。', at: '11:01' },
    ],
  },
  {
    id: 'c2',
    title: '图书馆开馆时间',
    agentName: '校园助手',
    lastMessage: '主馆周一至周日 8:00-22:00',
    updatedAt: '2026-03-18 17:30',
    messages: [
      { role: 'user', content: '图书馆几点关门？', at: '17:28' },
      { role: 'assistant', content: '主馆周一至周日 8:00-22:00。', at: '17:29' },
    ],
  },
];

export const INITIAL_DATASETS: MockDataset[] = [
  { id: 'd1', name: '招生 FAQ 评测集', rows: 120, updatedAt: '2026-03-10' },
];

export const INITIAL_EVALS: MockEvalRun[] = [
  { id: 'e1', name: '教务场景对比', modelA: '通义-Turbo', modelB: 'GPT-4o-mini', scoreA: 0.82, scoreB: 0.79, status: 'done' },
];

export const INITIAL_AB: MockABTest[] = [
  { id: 'ab1', name: '欢迎语 A/B', trafficA: 50, status: 'active' },
];

export const INITIAL_LABELS: MockLabelTask[] = [
  { id: 'l1', text: '回答是否准确涵盖学分政策？', label: 'pending' },
  { id: 'l2', text: '语气是否足够正式？', label: 'pending' },
];

export const INITIAL_WEBHOOKS: MockWebhook[] = [
  { id: 'wh1', url: 'https://api.school.edu/hooks/agent', events: ['agent.completed'], secret: 'whsec_***', enabled: true },
];

export const INITIAL_SHARES: MockShareLink[] = [
  { id: 'sh1', name: '招生咨询公开体验', url: 'https://lantu.school.edu/s/x7k2', enabled: true, visits: 1288 },
];

export const INITIAL_INVOICES: MockInvoice[] = [
  { id: 'inv1', period: '2026-02', amount: 0, status: 'paid' },
  { id: 'inv2', period: '2026-03', amount: 0, status: 'unpaid' },
];

export const INITIAL_PROMPTS: MockPromptTpl[] = [
  { id: 'pr1', name: '教务标准回答', content: '你是学校教务助手，回答需引用校规条款...', updatedAt: '2026-03-01' },
];

export const INITIAL_TERMS: MockTerm[] = [
  { id: 'tm1', term: 'GPA', definition: '平均学分绩点' },
  { id: 'tm2', term: '通识课', definition: '跨学科基础课程模块' },
];

export const INITIAL_SECRETS: MockSecretVar[] = [
  { id: 'sv1', key: 'DASHSCOPE_API_KEY', masked: 'sk-****2a9f', scope: 'global' },
];

export const INITIAL_MEMORIES: MockMemoryEntry[] = [
  { id: 'mem1', userId: 'student_1001', content: '用户关注考研与保研政策', updatedAt: '2026-03-18' },
];

export const INITIAL_FLOW_VERSIONS = [
  { version: 'v1.2.0', publishedAt: '2026-03-19', note: '修复意图漏召', current: true },
  { version: 'v1.1.0', publishedAt: '2026-03-10', note: '增加知识库节点', current: false },
];

export const INITIAL_PUBLISHED_APPS = [
  { id: 'app1', name: '教务大厅机器人', channel: 'Web 嵌入', status: 'online' },
];
