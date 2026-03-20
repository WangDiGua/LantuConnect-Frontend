import type MockAdapter from 'axios-mock-adapter';
import type {
  Conversation,
  Dataset,
  EvalRun,
  ABTest,
  DataLabel,
} from '../../../types/dto/data-eval';
import { mockOk, paginate } from '../mockAdapter';

function ts(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString();
}

const conversations: Conversation[] = [
  { id: 'cv01', agentId: 'ag01', agentName: '教务问答助手', userId: 'u_001', title: '选课学分问题', messageCount: 6, tokenCount: 1250, rating: 5, feedback: '回答准确', tags: ['选课', '学分'], startedAt: ts(0), lastMessageAt: ts(0) },
  { id: 'cv02', agentId: 'ag01', agentName: '教务问答助手', userId: 'u_002', title: '考试安排查询', messageCount: 4, tokenCount: 820, rating: 4, tags: ['考试'], startedAt: ts(1), lastMessageAt: ts(1) },
  { id: 'cv03', agentId: 'ag02', agentName: '招生咨询机器人', userId: 'u_003', title: '2026年录取分数线', messageCount: 8, tokenCount: 2100, rating: 5, feedback: '信息全面', tags: ['招生', '分数线'], startedAt: ts(1), lastMessageAt: ts(0) },
  { id: 'cv04', agentId: 'ag05', agentName: '心理健康疏导', userId: 'u_004', title: '考前焦虑咨询', messageCount: 12, tokenCount: 3500, rating: 5, feedback: '非常温暖', tags: ['心理', '焦虑'], startedAt: ts(2), lastMessageAt: ts(2) },
  { id: 'cv05', agentId: 'ag10', agentName: '就业指导顾问', userId: 'u_005', title: '简历优化建议', messageCount: 10, tokenCount: 2800, rating: 4, tags: ['简历', '就业'], startedAt: ts(3), lastMessageAt: ts(2) },
  { id: 'cv06', agentId: 'ag06', agentName: '图书馆智能检索', userId: 'u_006', title: '论文检索帮助', messageCount: 5, tokenCount: 950, tags: ['图书馆', '论文'], startedAt: ts(3), lastMessageAt: ts(3) },
  { id: 'cv07', agentId: 'ag01', agentName: '教务问答助手', userId: 'u_007', title: '学位授予条件', messageCount: 3, tokenCount: 680, rating: 3, feedback: '部分信息不够详细', tags: ['学位'], startedAt: ts(4), lastMessageAt: ts(4) },
  { id: 'cv08', agentId: 'ag09', agentName: '校园活动助手', userId: 'u_008', title: '社团纳新信息', messageCount: 4, tokenCount: 720, rating: 5, tags: ['社团', '活动'], startedAt: ts(5), lastMessageAt: ts(5) },
  { id: 'cv09', agentId: 'ag11', agentName: '翻译润色工具', userId: 'u_009', title: '论文摘要英译', messageCount: 6, tokenCount: 1800, rating: 4, tags: ['翻译', '学术'], startedAt: ts(5), lastMessageAt: ts(4) },
  { id: 'cv10', agentId: 'ag12', agentName: '宿舍报修助手', userId: 'u_010', title: '空调故障报修', messageCount: 4, tokenCount: 520, rating: 5, feedback: '流程顺畅', tags: ['报修', '宿舍'], startedAt: ts(6), lastMessageAt: ts(6) },
  { id: 'cv11', agentId: 'ag02', agentName: '招生咨询机器人', userId: 'u_011', title: '专业调剂政策', messageCount: 7, tokenCount: 1650, rating: 4, tags: ['招生', '调剂'], startedAt: ts(7), lastMessageAt: ts(6) },
  { id: 'cv12', agentId: 'ag15', agentName: '多语言客服', userId: 'u_012', title: 'Visa application inquiry', messageCount: 5, tokenCount: 1100, rating: 4, tags: ['留学生', '签证'], startedAt: ts(8), lastMessageAt: ts(7) },
];

const datasets: Dataset[] = [
  { id: 'ds01', name: '招生FAQ评测集', description: '招生常见问题与标准答案对', type: 'qa', format: 'jsonl', rowCount: 120, sizeMb: 0.5, status: 'ready', schema: { question: 'string', answer: 'string', category: 'string' }, createdBy: 'admin', createdAt: ts(30), updatedAt: ts(10) },
  { id: 'ds02', name: '教务对话数据集', description: '教务场景真实对话记录', type: 'conversation', format: 'jsonl', rowCount: 850, sizeMb: 3.2, status: 'ready', schema: { messages: 'array', metadata: 'object' }, createdBy: 'zhangsan', createdAt: ts(20), updatedAt: ts(5) },
  { id: 'ds03', name: '意图分类训练集', description: '教育领域意图分类标注数据', type: 'classification', format: 'csv', rowCount: 2000, sizeMb: 1.8, status: 'ready', schema: { text: 'string', label: 'string' }, createdBy: 'lisi', createdAt: ts(15), updatedAt: ts(8) },
  { id: 'ds04', name: '心理咨询评测集', description: '心理咨询场景的评测数据', type: 'qa', format: 'jsonl', rowCount: 200, sizeMb: 0.8, status: 'ready', schema: { input: 'string', expected: 'string', criteria: 'string' }, createdBy: 'wangwu', createdAt: ts(12), updatedAt: ts(6) },
  { id: 'ds05', name: '多语言测试集', description: '中英日韩多语言翻译测试数据', type: 'custom', format: 'jsonl', rowCount: 500, sizeMb: 2.1, status: 'processing', schema: { source: 'string', target: 'string', language_pair: 'string' }, createdBy: 'admin', createdAt: ts(5), updatedAt: ts(2) },
  { id: 'ds06', name: '图书检索评测', description: '图书馆检索场景问答评测数据', type: 'qa', format: 'csv', rowCount: 300, sizeMb: 0.4, status: 'ready', schema: { query: 'string', expected_results: 'string' }, createdBy: 'zhangsan', createdAt: ts(18), updatedAt: ts(9) },
];

const evalRuns: EvalRun[] = [
  { id: 'er01', name: '教务场景对比-千问 vs GPT', datasetId: 'ds01', datasetName: '招生FAQ评测集', agentId: 'ag01', agentName: '教务问答助手', status: 'completed', metrics: { accuracy: 0.94, relevance: 0.92, fluency: 0.96, f1: 0.91 }, sampleCount: 120, completedCount: 120, avgScore: 0.93, startedAt: ts(5), completedAt: ts(5), createdBy: 'admin' },
  { id: 'er02', name: '心理咨询质量评估', datasetId: 'ds04', datasetName: '心理咨询评测集', agentId: 'ag05', agentName: '心理健康疏导', status: 'completed', metrics: { empathy: 0.88, safety: 0.95, helpfulness: 0.82 }, sampleCount: 200, completedCount: 200, avgScore: 0.88, startedAt: ts(3), completedAt: ts(3), createdBy: 'wangwu' },
  { id: 'er03', name: '招生场景评测v2', datasetId: 'ds01', datasetName: '招生FAQ评测集', agentId: 'ag02', agentName: '招生咨询机器人', status: 'running', metrics: {}, sampleCount: 120, completedCount: 78, avgScore: 0.89, startedAt: ts(0), createdBy: 'zhangsan' },
  { id: 'er04', name: '意图识别精度测试', datasetId: 'ds03', datasetName: '意图分类训练集', agentId: 'ag01', agentName: '教务问答助手', status: 'completed', metrics: { precision: 0.91, recall: 0.87, f1: 0.89 }, sampleCount: 500, completedCount: 500, avgScore: 0.89, startedAt: ts(8), completedAt: ts(7), createdBy: 'lisi' },
  { id: 'er05', name: '多语言翻译质量', datasetId: 'ds05', datasetName: '多语言测试集', agentId: 'ag15', agentName: '多语言客服', status: 'pending', metrics: {}, sampleCount: 500, completedCount: 0, avgScore: 0, startedAt: ts(0), createdBy: 'admin' },
];

const abTests: ABTest[] = [
  { id: 'ab01', name: '教务助手-欢迎语A/B', description: '测试不同欢迎语对用户满意度的影响', status: 'running', variants: [{ id: 'v1', name: '正式版', agentId: 'ag01', agentName: '教务问答助手(正式)', metrics: { satisfaction: 4.2, completionRate: 0.85 }, sampleCount: 520 }, { id: 'v2', name: '亲切版', agentId: 'ag01', agentName: '教务问答助手(亲切)', metrics: { satisfaction: 4.5, completionRate: 0.88 }, sampleCount: 480 }], trafficSplit: [50, 50], sampleSize: 2000, currentSamples: 1000, startedAt: ts(7), createdBy: 'admin', createdAt: ts(8) },
  { id: 'ab02', name: '招生Bot-模型对比', description: '对比千问和GPT在招生场景的表现', status: 'completed', variants: [{ id: 'v3', name: '通义千问', agentId: 'ag02a', agentName: '招生Bot-千问', metrics: { accuracy: 0.92, latency: 320 }, sampleCount: 800 }, { id: 'v4', name: 'GPT-4o-mini', agentId: 'ag02b', agentName: '招生Bot-GPT', metrics: { accuracy: 0.89, latency: 410 }, sampleCount: 800 }], trafficSplit: [50, 50], sampleSize: 1600, currentSamples: 1600, startedAt: ts(15), completedAt: ts(8), createdBy: 'zhangsan', createdAt: ts(16) },
  { id: 'ab03', name: '心理咨询-温度参数测试', description: '测试不同temperature对对话质量的影响', status: 'draft', variants: [{ id: 'v5', name: 'T=0.5', agentId: 'ag05a', agentName: '心理助手(低温)', metrics: {}, sampleCount: 0 }, { id: 'v6', name: 'T=0.9', agentId: 'ag05b', agentName: '心理助手(高温)', metrics: {}, sampleCount: 0 }], trafficSplit: [50, 50], sampleSize: 1000, currentSamples: 0, createdBy: 'wangwu', createdAt: ts(2) },
];

const labels: DataLabel[] = [
  { id: 'lb01', conversationId: 'cv01', label: '准确性', value: '准确', confidence: 0.95, labeledBy: 'admin', createdAt: ts(1) },
  { id: 'lb02', conversationId: 'cv01', label: '完整性', value: '完整', confidence: 0.9, labeledBy: 'admin', createdAt: ts(1) },
  { id: 'lb03', conversationId: 'cv02', label: '准确性', value: '基本准确', confidence: 0.8, labeledBy: 'zhangsan', createdAt: ts(2) },
  { id: 'lb04', conversationId: 'cv04', label: '安全性', value: '安全', confidence: 0.98, labeledBy: 'wangwu', createdAt: ts(3) },
  { id: 'lb05', conversationId: 'cv04', label: '共情度', value: '优秀', confidence: 0.92, labeledBy: 'wangwu', createdAt: ts(3) },
  { id: 'lb06', conversationId: 'cv07', label: '准确性', value: '不够详细', confidence: 0.75, labeledBy: 'lisi', createdAt: ts(5) },
  { id: 'lb07', conversationId: 'cv09', label: '翻译质量', value: '优秀', confidence: 0.88, labeledBy: 'admin', createdAt: ts(4) },
  { id: 'lb08', conversationId: 'cv03', label: '及时性', value: '信息最新', confidence: 0.85, labeledBy: 'zhangsan', createdAt: ts(2) },
];

let nextDsId = 100;
let nextErId = 100;

export function registerHandlers(mock: MockAdapter): void {
  mock.onGet('/data-eval/conversations').reply((config) => {
    const p = config.params || {};
    return paginate(conversations, Number(p.page) || 1, Number(p.pageSize) || 20);
  });

  mock.onDelete(/\/data-eval\/conversations\/([^/]+)$/).reply((config) => {
    const id = config.url!.match(/\/data-eval\/conversations\/([^/]+)$/)?.[1];
    const idx = conversations.findIndex((c) => c.id === id);
    if (idx >= 0) conversations.splice(idx, 1);
    return mockOk(null);
  });

  mock.onGet('/data-eval/datasets').reply(() => mockOk(datasets));

  mock.onPost('/data-eval/datasets').reply((config) => {
    const body = JSON.parse(config.data || '{}');
    const ds: Dataset = {
      id: 'ds_' + nextDsId++,
      name: body.name,
      description: body.description || '',
      type: body.type || 'qa',
      format: body.format || 'jsonl',
      rowCount: 0,
      sizeMb: 0,
      status: 'ready',
      schema: {},
      createdBy: 'current_user',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    datasets.push(ds);
    return mockOk(ds);
  });

  mock.onDelete(/\/data-eval\/datasets\/([^/]+)$/).reply((config) => {
    const id = config.url!.match(/\/data-eval\/datasets\/([^/]+)$/)?.[1];
    const idx = datasets.findIndex((d) => d.id === id);
    if (idx >= 0) datasets.splice(idx, 1);
    return mockOk(null);
  });

  mock.onGet('/data-eval/eval-runs').reply(() => mockOk(evalRuns));

  mock.onPost('/data-eval/eval-runs').reply((config) => {
    const body = JSON.parse(config.data || '{}');
    const er: EvalRun = {
      id: 'er_' + nextErId++,
      name: body.name,
      datasetId: body.datasetId,
      datasetName: '数据集',
      agentId: body.agentId,
      agentName: 'Agent',
      status: 'pending',
      metrics: {},
      sampleCount: 0,
      completedCount: 0,
      avgScore: 0,
      startedAt: new Date().toISOString(),
      createdBy: 'current_user',
    };
    evalRuns.push(er);
    return mockOk(er);
  });

  mock.onGet('/data-eval/ab-tests').reply(() => mockOk(abTests));

  mock.onPost('/data-eval/ab-tests').reply((config) => {
    const body = JSON.parse(config.data || '{}');
    const ab: ABTest = {
      id: 'ab_' + Date.now().toString(36),
      name: body.name,
      description: body.description || '',
      status: 'draft',
      variants: body.variants || [],
      trafficSplit: body.trafficSplit || [50, 50],
      sampleSize: body.sampleSize || 1000,
      currentSamples: 0,
      createdBy: 'current_user',
      createdAt: new Date().toISOString(),
    };
    abTests.push(ab);
    return mockOk(ab);
  });

  mock.onPut(/\/data-eval\/ab-tests\/([^/]+)$/).reply((config) => {
    const id = config.url!.match(/\/data-eval\/ab-tests\/([^/]+)$/)?.[1];
    const body = JSON.parse(config.data || '{}');
    const idx = abTests.findIndex((a) => a.id === id);
    if (idx >= 0) {
      abTests[idx] = { ...abTests[idx], ...body };
      return mockOk(abTests[idx]);
    }
    return [404, { code: 404, message: 'Not found', timestamp: Date.now() }];
  });

  mock.onGet('/data-eval/labels').reply(() => mockOk(labels));

  mock.onPut('/data-eval/labels').reply((config) => {
    const body = JSON.parse(config.data || '{}');
    const idx = labels.findIndex((l) => l.id === body.id);
    if (idx >= 0) {
      labels[idx] = { ...labels[idx], ...body };
    }
    return mockOk(labels);
  });

  mock.onPost('/data-eval/export').reply(() => {
    return mockOk({ url: '#', filename: 'export_' + Date.now() + '.jsonl', size: 1024000 });
  });
}
