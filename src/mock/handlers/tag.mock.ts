import type MockAdapter from 'axios-mock-adapter';
import type { TagItem } from '../../types/dto/tag';
import { mockOk } from '..';

const tags: TagItem[] = [
  { id: 1, name: 'AI生成', category: '技术', usageCount: 45, createTime: '2025-06-01T08:00:00Z' },
  { id: 2, name: '文档处理', category: '办公', usageCount: 38, createTime: '2025-06-01T08:00:00Z' },
  { id: 3, name: '数据分析', category: '技术', usageCount: 32, createTime: '2025-06-15T10:00:00Z' },
  { id: 4, name: '教学辅助', category: '教育', usageCount: 28, createTime: '2025-07-01T09:00:00Z' },
  { id: 5, name: '科研工具', category: '教育', usageCount: 25, createTime: '2025-07-10T14:00:00Z' },
  { id: 6, name: '信息检索', category: '技术', usageCount: 52, createTime: '2025-05-20T08:00:00Z' },
  { id: 7, name: '办公自动化', category: '办公', usageCount: 41, createTime: '2025-08-01T10:00:00Z' },
  { id: 8, name: '图表可视化', category: '技术', usageCount: 19, createTime: '2025-09-01T09:00:00Z' },
  { id: 9, name: '校园服务', category: '生活', usageCount: 15, createTime: '2025-10-15T11:00:00Z' },
  { id: 10, name: '代码开发', category: '技术', usageCount: 22, createTime: '2025-11-01T08:00:00Z' },
  { id: 11, name: '多模态', category: '技术', usageCount: 17, createTime: '2026-01-05T10:00:00Z' },
  { id: 12, name: '通知推送', category: '办公', usageCount: 12, createTime: '2026-02-10T09:00:00Z' },
];

let nextId = 100;

export function registerHandlers(mock: MockAdapter): void {
  mock.onGet('/tags').reply(() => mockOk(tags));

  mock.onPost('/tags').reply((config) => {
    const body = JSON.parse(config.data || '{}');
    const newTag: TagItem = {
      id: nextId++,
      name: body.name || '新标签',
      category: body.category || '其他',
      usageCount: 0,
      createTime: new Date().toISOString(),
    };
    tags.push(newTag);
    return mockOk(newTag);
  });

  mock.onDelete(/\/tags\/(\d+)$/).reply((config) => {
    const id = Number(config.url!.match(/\/tags\/(\d+)$/)?.[1]);
    const idx = tags.findIndex((t) => t.id === id);
    if (idx >= 0) tags.splice(idx, 1);
    return mockOk(null);
  });

  mock.onPost('/tags/batch').reply((config) => {
    const body: { name: string; category: string }[] = JSON.parse(config.data || '[]');
    const created: TagItem[] = body.map((t) => ({
      id: nextId++,
      name: t.name,
      category: t.category,
      usageCount: 0,
      createTime: new Date().toISOString(),
    }));
    tags.push(...created);
    return mockOk(created);
  });
}
