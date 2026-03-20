import type MockAdapter from 'axios-mock-adapter';
import type { KnowledgeBase, KBDocument, HitTestResult } from '../../../types/dto/knowledge';
import { mockOk, paginate } from '../mockAdapter';

function ts(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString();
}

const knowledgeBases: KnowledgeBase[] = [
  { id: 'kb01', name: '校规校纪知识库', description: '包含校规、学生手册、学术诚信等文档', type: 'document', embeddingModel: 'text-embedding-v3', documentCount: 48, totalChunks: 1250, totalTokens: 520000, status: 'ready', tags: ['校规', '学生手册'], createdBy: 'admin', createdAt: ts(120), updatedAt: ts(5) },
  { id: 'kb02', name: '招生政策FAQ', description: '历年招生简章与常见问题', type: 'qa', embeddingModel: 'text-embedding-v3', documentCount: 120, totalChunks: 360, totalTokens: 180000, status: 'ready', tags: ['招生', 'FAQ'], createdBy: 'zhangsan', createdAt: ts(90), updatedAt: ts(10) },
  { id: 'kb03', name: '培养方案数据', description: '各专业培养方案与课程大纲', type: 'table', embeddingModel: 'text-embedding-v3', documentCount: 35, totalChunks: 800, totalTokens: 350000, status: 'ready', tags: ['培养方案', '课程'], createdBy: 'lisi', createdAt: ts(60), updatedAt: ts(8) },
  { id: 'kb04', name: '心理健康手册', description: '心理健康知识与校园援助指南', type: 'document', embeddingModel: 'text-embedding-v3', documentCount: 22, totalChunks: 450, totalTokens: 210000, status: 'ready', tags: ['心理', '健康'], createdBy: 'admin', createdAt: ts(45), updatedAt: ts(15) },
  { id: 'kb05', name: '图书馆资源导航', description: '馆藏目录与电子资源使用指南', type: 'document', embeddingModel: 'text-embedding-v3', documentCount: 15, totalChunks: 320, totalTokens: 150000, status: 'ready', tags: ['图书馆', '资源'], createdBy: 'zhangsan', createdAt: ts(30), updatedAt: ts(12) },
  { id: 'kb06', name: '实验室安全规范', description: '各类实验室安全操作规程', type: 'document', embeddingModel: 'text-embedding-v3', documentCount: 30, totalChunks: 600, totalTokens: 280000, status: 'indexing', tags: ['安全', '实验室'], createdBy: 'wangwu', createdAt: ts(20), updatedAt: ts(1) },
  { id: 'kb07', name: '社团活动汇编', description: '校园社团与活动信息集合', type: 'qa', embeddingModel: 'text-embedding-v3', documentCount: 85, totalChunks: 255, totalTokens: 120000, status: 'ready', tags: ['社团', '活动'], createdBy: 'lisi', createdAt: ts(40), updatedAt: ts(7) },
  { id: 'kb08', name: '就业指导资料', description: '简历模板、面试技巧与企业信息', type: 'document', embeddingModel: 'text-embedding-v3', documentCount: 40, totalChunks: 920, totalTokens: 430000, status: 'ready', tags: ['就业', '指导'], createdBy: 'admin', createdAt: ts(75), updatedAt: ts(3) },
];

const documents: Record<string, KBDocument[]> = {
  kb01: [
    { id: 'doc01', kbId: 'kb01', name: '学生手册2025版.pdf', type: 'pdf', size: 2450000, chunkCount: 120, tokenCount: 45000, status: 'ready', metadata: { version: '2025' }, createdAt: ts(120), updatedAt: ts(120) },
    { id: 'doc02', kbId: 'kb01', name: '学术诚信管理办法.docx', type: 'docx', size: 380000, chunkCount: 35, tokenCount: 12000, status: 'ready', metadata: {}, createdAt: ts(100), updatedAt: ts(100) },
    { id: 'doc03', kbId: 'kb01', name: '考试管理规定.pdf', type: 'pdf', size: 1200000, chunkCount: 65, tokenCount: 28000, status: 'ready', metadata: {}, createdAt: ts(90), updatedAt: ts(90) },
    { id: 'doc04', kbId: 'kb01', name: '选课管理细则.md', type: 'md', size: 52000, chunkCount: 18, tokenCount: 8500, status: 'ready', metadata: {}, createdAt: ts(80), updatedAt: ts(80) },
    { id: 'doc05', kbId: 'kb01', name: '学位授予条件.pdf', type: 'pdf', size: 980000, chunkCount: 42, tokenCount: 18000, status: 'processing', metadata: {}, createdAt: ts(5), updatedAt: ts(5) },
  ],
  kb02: [
    { id: 'doc06', kbId: 'kb02', name: '2026年本科招生简章.pdf', type: 'pdf', size: 3200000, chunkCount: 80, tokenCount: 35000, status: 'ready', metadata: {}, createdAt: ts(60), updatedAt: ts(60) },
    { id: 'doc07', kbId: 'kb02', name: '历年录取分数线.csv', type: 'csv', size: 120000, chunkCount: 25, tokenCount: 6000, status: 'ready', metadata: {}, createdAt: ts(55), updatedAt: ts(55) },
  ],
};

let nextKbId = 100;
let nextDocId = 200;

export function registerHandlers(mock: MockAdapter): void {
  mock.onGet('/knowledge-bases').reply((config) => {
    const p = config.params || {};
    return paginate(knowledgeBases, Number(p.page) || 1, Number(p.pageSize) || 20);
  });

  mock.onPost('/knowledge-bases').reply((config) => {
    const body = JSON.parse(config.data || '{}');
    const kb: KnowledgeBase = {
      id: 'kb_' + nextKbId++,
      name: body.name,
      description: body.description || '',
      type: body.type || 'document',
      embeddingModel: body.embeddingModel || 'text-embedding-v3',
      documentCount: 0,
      totalChunks: 0,
      totalTokens: 0,
      status: 'ready',
      tags: body.tags || [],
      createdBy: 'current_user',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    knowledgeBases.push(kb);
    return mockOk(kb);
  });

  mock.onGet(/\/knowledge-bases\/([^/]+)\/documents$/).reply((config) => {
    const id = config.url!.match(/\/knowledge-bases\/([^/]+)\/documents/)?.[1];
    return mockOk(documents[id!] || []);
  });

  mock.onPost(/\/knowledge-bases\/([^/]+)\/documents$/).reply((config) => {
    const id = config.url!.match(/\/knowledge-bases\/([^/]+)\/documents/)?.[1]!;
    const doc: KBDocument = {
      id: 'doc_' + nextDocId++,
      kbId: id,
      name: '上传文档_' + Date.now() + '.pdf',
      type: 'pdf',
      size: 1000000,
      chunkCount: 0,
      tokenCount: 0,
      status: 'pending',
      metadata: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    if (!documents[id]) documents[id] = [];
    documents[id].push(doc);
    return mockOk(doc);
  });

  mock.onPost(/\/knowledge-bases\/([^/]+)\/hit-test$/).reply(() => {
    const results: HitTestResult[] = [
      { documentId: 'doc01', documentName: '学生手册2025版.pdf', chunkId: 'c_01', content: '第三章第二节：通识课程模块要求修满 8 学分，其中跨学科课程不少于 2 学分。', score: 0.92, metadata: { page: '45' } },
      { documentId: 'doc04', documentName: '选课管理细则.md', chunkId: 'c_02', content: '学生每学期选课学分上限为 25 学分，下限为 12 学分（毕业学期除外）。', score: 0.85, metadata: {} },
      { documentId: 'doc03', documentName: '考试管理规定.pdf', chunkId: 'c_03', content: '期末考试占总成绩比例不超过 60%，平时成绩考核应包含课堂参与、作业、实验等环节。', score: 0.78, metadata: { page: '12' } },
    ];
    return mockOk(results);
  });

  mock.onGet(/\/knowledge-bases\/([^/]+)$/).reply((config) => {
    const id = config.url!.match(/\/knowledge-bases\/([^/]+)$/)?.[1];
    const kb = knowledgeBases.find((k) => k.id === id);
    return kb ? mockOk(kb) : [404, { code: 404, message: 'Not found', timestamp: Date.now() }];
  });

  mock.onPut(/\/knowledge-bases\/([^/]+)$/).reply((config) => {
    const id = config.url!.match(/\/knowledge-bases\/([^/]+)$/)?.[1];
    const body = JSON.parse(config.data || '{}');
    const idx = knowledgeBases.findIndex((k) => k.id === id);
    if (idx >= 0) {
      knowledgeBases[idx] = { ...knowledgeBases[idx], ...body, updatedAt: new Date().toISOString() };
      return mockOk(knowledgeBases[idx]);
    }
    return [404, { code: 404, message: 'Not found', timestamp: Date.now() }];
  });

  mock.onDelete(/\/knowledge-bases\/([^/]+)$/).reply((config) => {
    const id = config.url!.match(/\/knowledge-bases\/([^/]+)$/)?.[1];
    const idx = knowledgeBases.findIndex((k) => k.id === id);
    if (idx >= 0) knowledgeBases.splice(idx, 1);
    return mockOk(null);
  });
}
