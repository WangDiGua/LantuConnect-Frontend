import type MockAdapter from 'axios-mock-adapter';
import type { SmartApp } from '../../../types/dto/smart-app';
import { mockOk, paginate } from '../mockAdapter';

const apps: SmartApp[] = [
  {
    id: 1,
    appName: 'smart-course-assistant',
    displayName: '智能选课助手',
    description: '基于学生培养方案和个人兴趣，智能推荐最优选课方案，支持冲突检测和学分规划。',
    appUrl: 'https://course.lantu.edu.cn/assistant',
    embedType: 'iframe',
    icon: null,
    screenshots: [],
    categoryId: 1,
    categoryName: '校园业务',
    sourceType: 'internal',
    status: 'published',
    isPublic: true,
    sortOrder: 1,
    createTime: '2025-12-10T08:00:00Z',
    updateTime: '2026-03-15T10:00:00Z',
  },
  {
    id: 2,
    appName: 'ai-writing-platform',
    displayName: 'AI写作平台',
    description: '提供论文写作辅助、文本润色、格式校验等智能写作服务，支持多种学术规范。',
    appUrl: 'https://write.partner-ai.com/campus',
    embedType: 'redirect',
    icon: null,
    screenshots: [],
    categoryId: 2,
    categoryName: '教学科研',
    sourceType: 'partner',
    status: 'published',
    isPublic: true,
    sortOrder: 2,
    createTime: '2026-01-05T09:00:00Z',
    updateTime: '2026-03-10T14:00:00Z',
  },
  {
    id: 3,
    appName: 'campus-life-assistant',
    displayName: '校园生活助手',
    description: '集成校园卡查询、食堂菜单、快递代取、失物招领等校园生活便捷服务。',
    appUrl: 'https://life.lantu.edu.cn/app',
    embedType: 'iframe',
    icon: null,
    screenshots: [],
    categoryId: 5,
    categoryName: '生活服务',
    sourceType: 'internal',
    status: 'published',
    isPublic: true,
    sortOrder: 3,
    createTime: '2026-01-20T10:00:00Z',
    updateTime: '2026-03-12T16:00:00Z',
  },
  {
    id: 4,
    appName: 'research-paper-analyzer',
    displayName: '科研论文分析',
    description: '对上传的论文进行结构化分析，提取摘要、关键词、引用图谱，辅助文献综述。',
    appUrl: 'https://research.lantu.edu.cn/analyzer',
    embedType: 'iframe',
    icon: null,
    screenshots: [],
    categoryId: 2,
    categoryName: '教学科研',
    sourceType: 'internal',
    status: 'draft',
    isPublic: false,
    sortOrder: 4,
    createTime: '2026-03-01T08:00:00Z',
    updateTime: '2026-03-18T11:00:00Z',
  },
  {
    id: 5,
    appName: 'teaching-quality-eval',
    displayName: '教学质量评估系统',
    description: '多维度教学质量评估，包含学生评教、同行评议、教学效果分析等模块。',
    appUrl: 'https://eval.lantu.edu.cn',
    embedType: 'micro_frontend',
    icon: null,
    screenshots: [],
    categoryId: 2,
    categoryName: '教学科研',
    sourceType: 'internal',
    status: 'testing',
    isPublic: false,
    sortOrder: 5,
    createTime: '2026-02-15T09:00:00Z',
    updateTime: '2026-03-19T15:00:00Z',
  },
];

let nextId = 100;

export function registerHandlers(mock: MockAdapter): void {
  mock.onGet('/v1/apps').reply((config) => {
    const p = config.params || {};
    let filtered = [...apps];
    if (p.keyword) {
      const kw = p.keyword.toLowerCase();
      filtered = filtered.filter(
        (a) =>
          a.displayName.toLowerCase().includes(kw) ||
          a.description.toLowerCase().includes(kw),
      );
    }
    if (p.status) filtered = filtered.filter((a) => a.status === p.status);
    if (p.embedType) filtered = filtered.filter((a) => a.embedType === p.embedType);
    if (p.categoryId) filtered = filtered.filter((a) => a.categoryId === Number(p.categoryId));
    return paginate(filtered, Number(p.page) || 1, Number(p.pageSize) || 20);
  });

  mock.onGet(/\/v1\/apps\/(\d+)$/).reply((config) => {
    const id = Number(config.url!.match(/\/v1\/apps\/(\d+)$/)?.[1]);
    const app = apps.find((a) => a.id === id);
    return app ? mockOk(app) : [404, { code: 404, message: 'App not found', timestamp: Date.now() }];
  });

  mock.onPost('/v1/apps').reply((config) => {
    const body = JSON.parse(config.data || '{}');
    const now = new Date().toISOString();
    const newApp: SmartApp = {
      id: nextId++,
      appName: body.appName || 'new-app',
      displayName: body.displayName || '新应用',
      description: body.description || '',
      appUrl: body.appUrl || '',
      embedType: body.embedType || 'iframe',
      icon: body.icon || null,
      screenshots: body.screenshots || [],
      categoryId: body.categoryId || null,
      sourceType: body.sourceType || 'internal',
      status: 'draft',
      isPublic: body.isPublic ?? false,
      sortOrder: apps.length + 1,
      createTime: now,
      updateTime: now,
    };
    apps.unshift(newApp);
    return mockOk(newApp);
  });

  mock.onPut(/\/v1\/apps\/(\d+)$/).reply((config) => {
    const id = Number(config.url!.match(/\/v1\/apps\/(\d+)$/)?.[1]);
    const body = JSON.parse(config.data || '{}');
    const idx = apps.findIndex((a) => a.id === id);
    if (idx >= 0) {
      apps[idx] = { ...apps[idx], ...body, updateTime: new Date().toISOString() };
      return mockOk(apps[idx]);
    }
    return [404, { code: 404, message: 'App not found', timestamp: Date.now() }];
  });

  mock.onDelete(/\/v1\/apps\/(\d+)$/).reply((config) => {
    const id = Number(config.url!.match(/\/v1\/apps\/(\d+)$/)?.[1]);
    const idx = apps.findIndex((a) => a.id === id);
    if (idx >= 0) apps.splice(idx, 1);
    return mockOk(null);
  });
}
