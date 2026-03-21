import type MockAdapter from 'axios-mock-adapter';
import type { Dataset } from '../../types/dto/dataset';
import { mockOk, paginate } from '..';

const datasets: Dataset[] = [
  {
    id: 1,
    datasetName: 'student-scores',
    displayName: '学生成绩数据集',
    description: '包含近五年全校本科生各学期成绩记录，已脱敏处理，可用于教学质量分析。',
    sourceType: 'department',
    dataType: 'structured',
    format: 'csv',
    recordCount: 185000,
    fileSize: 45_000_000,
    categoryId: 1,
    categoryName: '校园业务',
    status: 'published',
    tags: ['成绩', '教务', '本科'],
    isPublic: false,
    allowedDepartments: [1, 2, 3],
    relatedAgentIds: [1],
    createTime: '2025-11-01T08:00:00Z',
    updateTime: '2026-03-10T10:00:00Z',
  },
  {
    id: 2,
    datasetName: 'campus-notices',
    displayName: '校园通知公告库',
    description: '汇集学校官网、各院系发布的通知公告文档，适用于知识库问答训练。',
    sourceType: 'knowledge',
    dataType: 'document',
    format: 'pdf',
    recordCount: 3200,
    fileSize: 520_000_000,
    categoryId: 1,
    categoryName: '校园业务',
    status: 'published',
    tags: ['通知', '公告', '知识库'],
    isPublic: true,
    allowedDepartments: [],
    relatedAgentIds: [2, 5],
    createTime: '2025-12-15T09:00:00Z',
    updateTime: '2026-03-08T14:00:00Z',
  },
  {
    id: 3,
    datasetName: 'research-papers',
    displayName: '科研论文数据集',
    description: '从多个学术数据库采集的论文元数据与全文，涵盖理工文多学科。',
    sourceType: 'third_party',
    dataType: 'document',
    format: 'mixed',
    recordCount: 28000,
    fileSize: 2_800_000_000,
    categoryId: 2,
    categoryName: '教学科研',
    status: 'published',
    tags: ['论文', '学术', '多学科'],
    isPublic: true,
    allowedDepartments: [],
    relatedAgentIds: [3],
    createTime: '2026-01-10T10:00:00Z',
    updateTime: '2026-03-12T16:00:00Z',
  },
  {
    id: 4,
    datasetName: 'course-evaluations',
    displayName: '课程评价数据',
    description: '学生对所修课程的评价数据，含评分、文本评价和标签，用于教学改进分析。',
    sourceType: 'department',
    dataType: 'structured',
    format: 'json',
    recordCount: 42000,
    fileSize: 18_000_000,
    categoryId: 2,
    categoryName: '教学科研',
    status: 'draft',
    tags: ['课程', '评价', '教学'],
    isPublic: false,
    allowedDepartments: [1],
    relatedAgentIds: [],
    createTime: '2026-02-20T08:00:00Z',
    updateTime: '2026-03-18T11:00:00Z',
  },
  {
    id: 5,
    datasetName: 'library-borrow-records',
    displayName: '图书馆借阅记录',
    description: '图书馆近三年借阅流通数据，包含图书信息、借阅时间和归还状态。',
    sourceType: 'department',
    dataType: 'structured',
    format: 'csv',
    recordCount: 320000,
    fileSize: 78_000_000,
    categoryId: 1,
    categoryName: '校园业务',
    status: 'published',
    tags: ['图书馆', '借阅', '流通'],
    isPublic: false,
    allowedDepartments: [1, 4],
    relatedAgentIds: [6],
    createTime: '2026-01-05T09:00:00Z',
    updateTime: '2026-03-15T12:00:00Z',
  },
  {
    id: 6,
    datasetName: 'campus-images',
    displayName: '校园图片素材库',
    description: '校园风光、活动现场、宣传素材等图片资源，可用于校园AI图像生成训练。',
    sourceType: 'department',
    dataType: 'image',
    format: 'mixed',
    recordCount: 8500,
    fileSize: 15_000_000_000,
    categoryId: 5,
    categoryName: '生活服务',
    status: 'testing',
    tags: ['图片', '校园', '素材'],
    isPublic: false,
    allowedDepartments: [1, 2],
    relatedAgentIds: [],
    createTime: '2026-03-01T10:00:00Z',
    updateTime: '2026-03-19T09:00:00Z',
  },
];

let nextId = 100;

export function registerHandlers(mock: MockAdapter): void {
  mock.onGet('/v1/datasets').reply((config) => {
    const p = config.params || {};
    let filtered = [...datasets];
    if (p.keyword) {
      const kw = p.keyword.toLowerCase();
      filtered = filtered.filter(
        (d) =>
          d.displayName.toLowerCase().includes(kw) ||
          d.description.toLowerCase().includes(kw) ||
          d.tags.some((t) => t.toLowerCase().includes(kw)),
      );
    }
    if (p.status) filtered = filtered.filter((d) => d.status === p.status);
    if (p.sourceType) filtered = filtered.filter((d) => d.sourceType === p.sourceType);
    if (p.dataType) filtered = filtered.filter((d) => d.dataType === p.dataType);
    if (p.categoryId) filtered = filtered.filter((d) => d.categoryId === Number(p.categoryId));
    return paginate(filtered, Number(p.page) || 1, Number(p.pageSize) || 20);
  });

  mock.onGet(/\/v1\/datasets\/(\d+)$/).reply((config) => {
    const id = Number(config.url!.match(/\/v1\/datasets\/(\d+)$/)?.[1]);
    const ds = datasets.find((d) => d.id === id);
    return ds ? mockOk(ds) : [404, { code: 404, message: 'Dataset not found', timestamp: Date.now() }];
  });

  mock.onPost('/v1/datasets').reply((config) => {
    const body = JSON.parse(config.data || '{}');
    const now = new Date().toISOString();
    const newDs: Dataset = {
      id: nextId++,
      datasetName: body.datasetName || 'new-dataset',
      displayName: body.displayName || '新数据集',
      description: body.description || '',
      sourceType: body.sourceType || 'department',
      dataType: body.dataType || 'structured',
      format: body.format || 'csv',
      recordCount: body.recordCount ?? 0,
      fileSize: body.fileSize ?? 0,
      categoryId: body.categoryId || null,
      status: 'draft',
      tags: body.tags || [],
      isPublic: body.isPublic ?? false,
      allowedDepartments: body.allowedDepartments || [],
      relatedAgentIds: [],
      createTime: now,
      updateTime: now,
    };
    datasets.unshift(newDs);
    return mockOk(newDs);
  });

  mock.onPut(/\/v1\/datasets\/(\d+)$/).reply((config) => {
    const id = Number(config.url!.match(/\/v1\/datasets\/(\d+)$/)?.[1]);
    const body = JSON.parse(config.data || '{}');
    const idx = datasets.findIndex((d) => d.id === id);
    if (idx >= 0) {
      datasets[idx] = { ...datasets[idx], ...body, updateTime: new Date().toISOString() };
      return mockOk(datasets[idx]);
    }
    return [404, { code: 404, message: 'Dataset not found', timestamp: Date.now() }];
  });

  mock.onDelete(/\/v1\/datasets\/(\d+)$/).reply((config) => {
    const id = Number(config.url!.match(/\/v1\/datasets\/(\d+)$/)?.[1]);
    const idx = datasets.findIndex((d) => d.id === id);
    if (idx >= 0) datasets.splice(idx, 1);
    return mockOk(null);
  });
}
