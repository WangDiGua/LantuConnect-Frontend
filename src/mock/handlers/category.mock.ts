import type MockAdapter from 'axios-mock-adapter';
import type { Category } from '../../types/dto/category';
import { mockOk } from '..';

const now = new Date().toISOString();

const categories: Category[] = [
  // ── 校园业务 ──
  { id: 1, categoryCode: 'campus-business', categoryName: '校园业务', parentId: null, icon: 'School', sortOrder: 1, createTime: now, updateTime: now },
  { id: 11, categoryCode: 'academic-affairs', categoryName: '教务管理', parentId: 1, icon: 'BookOpen', sortOrder: 1, createTime: now, updateTime: now },
  { id: 12, categoryCode: 'student-service', categoryName: '学生服务', parentId: 1, icon: 'Users', sortOrder: 2, createTime: now, updateTime: now },
  { id: 13, categoryCode: 'admin-office', categoryName: '行政办公', parentId: 1, icon: 'Building2', sortOrder: 3, createTime: now, updateTime: now },

  // ── 教学科研 ──
  { id: 2, categoryCode: 'teaching-research', categoryName: '教学科研', parentId: null, icon: 'GraduationCap', sortOrder: 2, createTime: now, updateTime: now },
  { id: 21, categoryCode: 'course-assist', categoryName: '课程辅助', parentId: 2, icon: 'BookMarked', sortOrder: 1, createTime: now, updateTime: now },
  { id: 22, categoryCode: 'research-tools', categoryName: '科研工具', parentId: 2, icon: 'FlaskConical', sortOrder: 2, createTime: now, updateTime: now },
  { id: 23, categoryCode: 'paper-writing', categoryName: '论文写作', parentId: 2, icon: 'PenTool', sortOrder: 3, createTime: now, updateTime: now },

  // ── 办公效率 ──
  { id: 3, categoryCode: 'office-efficiency', categoryName: '办公效率', parentId: null, icon: 'Briefcase', sortOrder: 3, createTime: now, updateTime: now },
  { id: 31, categoryCode: 'doc-generation', categoryName: '文档生成', parentId: 3, icon: 'FileText', sortOrder: 1, createTime: now, updateTime: now },
  { id: 32, categoryCode: 'data-analysis', categoryName: '数据分析', parentId: 3, icon: 'BarChart3', sortOrder: 2, createTime: now, updateTime: now },
  { id: 33, categoryCode: 'automation', categoryName: '流程自动化', parentId: 3, icon: 'Workflow', sortOrder: 3, createTime: now, updateTime: now },

  // ── 生活服务 ──
  { id: 4, categoryCode: 'life-service', categoryName: '生活服务', parentId: null, icon: 'Heart', sortOrder: 4, createTime: now, updateTime: now },
  { id: 41, categoryCode: 'campus-nav', categoryName: '校园导航', parentId: 4, icon: 'MapPin', sortOrder: 1, createTime: now, updateTime: now },
  { id: 42, categoryCode: 'life-assistant', categoryName: '生活助手', parentId: 4, icon: 'Coffee', sortOrder: 2, createTime: now, updateTime: now },

  // ── 通用能力 ──
  { id: 5, categoryCode: 'general', categoryName: '通用能力', parentId: null, icon: 'Layers', sortOrder: 5, createTime: now, updateTime: now },
  { id: 51, categoryCode: 'search', categoryName: '搜索检索', parentId: 5, icon: 'Search', sortOrder: 1, createTime: now, updateTime: now },
  { id: 52, categoryCode: 'coding', categoryName: '代码开发', parentId: 5, icon: 'Code2', sortOrder: 2, createTime: now, updateTime: now },
];

let nextId = 100;

export function registerHandlers(mock: MockAdapter): void {
  mock.onGet('/api/v1/categories').reply(() => {
    return mockOk(categories);
  });

  mock.onPost('/api/v1/categories').reply((config) => {
    const body = JSON.parse(config.data || '{}');
    const cat: Category = {
      id: nextId++,
      categoryCode: body.categoryCode || '',
      categoryName: body.categoryName || '',
      parentId: body.parentId ?? null,
      icon: body.icon ?? null,
      sortOrder: body.sortOrder ?? categories.length + 1,
      createTime: new Date().toISOString(),
      updateTime: new Date().toISOString(),
    };
    categories.push(cat);
    return mockOk(cat);
  });

  mock.onPut(/\/api\/v1\/categories\/(\d+)$/).reply((config) => {
    const id = Number(config.url!.match(/\/api\/v1\/categories\/(\d+)/)?.[1]);
    const body = JSON.parse(config.data || '{}');
    const idx = categories.findIndex((c) => c.id === id);
    if (idx >= 0) {
      categories[idx] = { ...categories[idx], ...body, updateTime: new Date().toISOString() };
      return mockOk(categories[idx]);
    }
    return [404, { code: 404, message: 'Category not found', timestamp: Date.now() }];
  });

  mock.onDelete(/\/api\/v1\/categories\/(\d+)$/).reply((config) => {
    const id = Number(config.url!.match(/\/api\/v1\/categories\/(\d+)/)?.[1]);
    const idx = categories.findIndex((c) => c.id === id);
    if (idx >= 0) categories.splice(idx, 1);
    return mockOk(null);
  });
}
