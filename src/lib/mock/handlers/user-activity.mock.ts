import type MockAdapter from 'axios-mock-adapter';
import type {
  UsageRecord,
  FavoriteItem,
  UserUsageStats,
  MyPublishItem,
} from '../../../types/dto/user-activity';
import { mockOk, paginate } from '../mockAdapter';

const usageRecords: UsageRecord[] = [
  {
    id: 1, agentName: 'ali_image_generate', displayName: '图像生成',
    type: 'skill', action: '文生图', inputPreview: '生成一张春天校园风景图',
    outputPreview: '[图片已生成]', tokenCost: 0, latencyMs: 3200,
    status: 'success', createTime: '2026-03-21T07:30:00Z',
  },
  {
    id: 2, agentName: 'task', displayName: '发起独立任务',
    type: 'agent', action: '任务编排', inputPreview: '帮我整理本学期课程安排并生成日历',
    outputPreview: '已创建3个子任务...', tokenCost: 156, latencyMs: 2100,
    status: 'success', createTime: '2026-03-20T16:45:00Z',
  },
  {
    id: 3, agentName: 'internet_search', displayName: '联网搜索',
    type: 'skill', action: '网页搜索', inputPreview: '最新的大语言模型技术进展',
    outputPreview: '找到15条相关结果...', tokenCost: 0, latencyMs: 1850,
    status: 'success', createTime: '2026-03-20T14:20:00Z',
  },
  {
    id: 4, agentName: 'word_generate', displayName: 'Word文档生成',
    type: 'skill', action: '文档生成', inputPreview: '生成一份项目需求分析文档',
    outputPreview: '[Word文档已生成]', tokenCost: 0, latencyMs: 4500,
    status: 'success', createTime: '2026-03-20T11:30:00Z',
  },
  {
    id: 5, agentName: 'skill_chart', displayName: '统计图表生成',
    type: 'skill', action: '图表生成', inputPreview: '根据销售数据生成柱状图',
    outputPreview: '[图表已生成]', tokenCost: 0, latencyMs: 2800,
    status: 'success', createTime: '2026-03-20T10:15:00Z',
  },
  {
    id: 6, agentName: 'excel_generate', displayName: 'Excel表格生成',
    type: 'skill', action: '表格生成', inputPreview: '生成学生成绩汇总表',
    outputPreview: '[Excel文件已生成]', tokenCost: 0, latencyMs: 3800,
    status: 'success', createTime: '2026-03-19T15:30:00Z',
  },
  {
    id: 7, agentName: 'code_execute_mcp', displayName: '代码执行',
    type: 'skill', action: '执行Python', inputPreview: 'import pandas as pd; ...',
    outputPreview: '执行超时', tokenCost: 0, latencyMs: 120000,
    status: 'failed', createTime: '2026-03-19T14:00:00Z',
  },
  {
    id: 8, agentName: 'local_knowledge_search', displayName: '本地知识库搜索',
    type: 'skill', action: '知识检索', inputPreview: '学校教务管理制度',
    outputPreview: '找到8条相关文档...', tokenCost: 0, latencyMs: 650,
    status: 'success', createTime: '2026-03-19T09:20:00Z',
  },
  {
    id: 9, agentName: 'ali_image_generate', displayName: '图像生成',
    type: 'skill', action: '图生图', inputPreview: '将照片转换为水彩风格',
    outputPreview: '[图片已生成]', tokenCost: 0, latencyMs: 4100,
    status: 'success', createTime: '2026-03-18T16:40:00Z',
  },
  {
    id: 10, agentName: 'task', displayName: '发起独立任务',
    type: 'agent', action: '任务分解', inputPreview: '准备下周的教学评估材料',
    outputPreview: '已创建5个子任务...', tokenCost: 210, latencyMs: 2500,
    status: 'success', createTime: '2026-03-18T10:00:00Z',
  },
];

const favorites: FavoriteItem[] = [
  {
    id: 1, targetType: 'agent', targetId: 6, displayName: '发起独立任务',
    description: '创建并管理独立的异步任务', icon: '📋',
    createTime: '2026-03-10T09:00:00Z',
  },
  {
    id: 2, targetType: 'skill', targetId: 1, displayName: '图像生成',
    description: '基于通义万相模型的图像生成能力', icon: '🎨',
    createTime: '2026-03-08T14:30:00Z',
  },
  {
    id: 3, targetType: 'skill', targetId: 2, displayName: '联网搜索',
    description: '实时联网搜索引擎', icon: '🔍',
    createTime: '2026-03-05T11:00:00Z',
  },
  {
    id: 4, targetType: 'skill', targetId: 3, displayName: 'Word文档生成',
    description: '自动生成格式规范的Word文档', icon: '📄',
    createTime: '2026-02-28T16:20:00Z',
  },
  {
    id: 5, targetType: 'skill', targetId: 8, displayName: '统计图表生成',
    description: '根据数据自动生成统计图表', icon: '📈',
    createTime: '2026-02-20T10:15:00Z',
  },
  {
    id: 6, targetType: 'app', targetId: 1, displayName: '智能助手',
    description: '综合AI对话助手应用', icon: '🤖',
    createTime: '2026-02-15T09:30:00Z',
  },
];

const userUsageStats: UserUsageStats = {
  todayCalls: 37,
  weekCalls: 186,
  monthCalls: 642,
  totalCalls: 4521,
  tokensUsed: 125600,
  favoriteCount: 6,
  recentDays: [
    { date: '2026-03-15', calls: 28 },
    { date: '2026-03-16', calls: 35 },
    { date: '2026-03-17', calls: 22 },
    { date: '2026-03-18', calls: 31 },
    { date: '2026-03-19', calls: 42 },
    { date: '2026-03-20', calls: 28 },
    { date: '2026-03-21', calls: 37 },
  ],
};

const myAgents: MyPublishItem[] = [
  {
    id: 20, displayName: '智能备课助手', description: '基于课程标准自动生成教学计划',
    icon: '📝', status: 'pending_review', callCount: 0, qualityScore: 0,
    createTime: '2026-03-18T09:00:00Z', updateTime: '2026-03-18T09:00:00Z',
  },
  {
    id: 21, displayName: '学生答疑机器人', description: '自动回答学生常见问题',
    icon: '🤖', status: 'published', callCount: 1250, qualityScore: 88,
    createTime: '2025-12-01T10:00:00Z', updateTime: '2026-03-15T14:00:00Z',
  },
];

const mySkills: MyPublishItem[] = [
  {
    id: 30, displayName: '课表解析工具', description: '自动解析教务系统课表数据',
    icon: '📅', status: 'published', callCount: 890, qualityScore: 85,
    createTime: '2025-11-10T09:00:00Z', updateTime: '2026-03-10T11:00:00Z',
  },
  {
    id: 31, displayName: '成绩统计分析', description: '对学生成绩数据进行多维统计分析',
    icon: '📊', status: 'testing', callCount: 120, qualityScore: 78,
    createTime: '2026-02-01T10:00:00Z', updateTime: '2026-03-19T16:00:00Z',
  },
];

let nextFavoriteId = 100;

export function registerHandlers(mock: MockAdapter): void {
  mock.onGet('/user/usage-records').reply((config) => {
    const p = config.params || {};
    let filtered = [...usageRecords];
    if (p.type) filtered = filtered.filter((r) => r.type === p.type);
    return paginate(filtered, Number(p.page) || 1, Number(p.pageSize) || 20);
  });

  mock.onGet('/user/favorites').reply(() => mockOk(favorites));

  mock.onDelete(/\/user\/favorites\/(\d+)$/).reply((config) => {
    const id = Number(config.url!.match(/\/user\/favorites\/(\d+)$/)?.[1]);
    const idx = favorites.findIndex((f) => f.id === id);
    if (idx >= 0) favorites.splice(idx, 1);
    return mockOk(null);
  });

  mock.onPost('/user/favorites').reply((config) => {
    const body = JSON.parse(config.data || '{}');
    const newFav: FavoriteItem = {
      id: nextFavoriteId++,
      targetType: body.targetType,
      targetId: body.targetId,
      displayName: '新收藏项',
      description: '',
      icon: null,
      createTime: new Date().toISOString(),
    };
    favorites.push(newFav);
    return mockOk(null);
  });

  mock.onGet('/user/usage-stats').reply(() => mockOk(userUsageStats));

  mock.onGet('/user/my-agents').reply(() => mockOk(myAgents));

  mock.onGet('/user/my-skills').reply(() => mockOk(mySkills));
}
