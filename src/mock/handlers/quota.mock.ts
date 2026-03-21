import type MockAdapter from 'axios-mock-adapter';
import type { QuotaItem, RateLimitItem } from '../../types/dto/quota';
import { mockOk } from '..';

const quotas: QuotaItem[] = [
  {
    id: 1, targetType: 'global', targetId: null, targetName: '全局默认',
    dailyLimit: 10000, monthlyLimit: 200000, dailyUsed: 4523, monthlyUsed: 87650,
    enabled: true, createTime: '2025-06-01T00:00:00Z', updateTime: '2026-03-20T00:00:00Z',
  },
  {
    id: 2, targetType: 'department', targetId: 101, targetName: '计算机学院',
    dailyLimit: 5000, monthlyLimit: 100000, dailyUsed: 2810, monthlyUsed: 52300,
    enabled: true, createTime: '2025-08-15T10:00:00Z', updateTime: '2026-03-20T00:00:00Z',
  },
  {
    id: 3, targetType: 'department', targetId: 102, targetName: '管理学院',
    dailyLimit: 3000, monthlyLimit: 60000, dailyUsed: 1245, monthlyUsed: 28900,
    enabled: true, createTime: '2025-08-15T10:00:00Z', updateTime: '2026-03-20T00:00:00Z',
  },
  {
    id: 4, targetType: 'user', targetId: 1001, targetName: '张教授',
    dailyLimit: 500, monthlyLimit: 10000, dailyUsed: 123, monthlyUsed: 3450,
    enabled: true, createTime: '2026-01-10T09:00:00Z', updateTime: '2026-03-20T00:00:00Z',
  },
  {
    id: 5, targetType: 'user', targetId: 1002, targetName: '李研究员',
    dailyLimit: 800, monthlyLimit: 15000, dailyUsed: 456, monthlyUsed: 8900,
    enabled: true, createTime: '2026-01-10T09:00:00Z', updateTime: '2026-03-20T00:00:00Z',
  },
];

const rateLimits: RateLimitItem[] = [
  {
    id: 1, name: '全局速率限制', targetType: 'global', targetId: null, targetName: '全局',
    maxRequestsPerMin: 600, maxRequestsPerHour: 20000, maxConcurrent: 200,
    enabled: true, createTime: '2025-06-01T00:00:00Z', updateTime: '2026-03-15T10:00:00Z',
  },
  {
    id: 2, name: '图像生成限流', targetType: 'agent', targetId: 1, targetName: '图像生成',
    maxRequestsPerMin: 30, maxRequestsPerHour: 500, maxConcurrent: 5,
    enabled: true, createTime: '2025-09-01T10:00:00Z', updateTime: '2026-03-10T14:00:00Z',
  },
  {
    id: 3, name: '代码执行限流', targetType: 'skill', targetId: 5, targetName: '代码执行',
    maxRequestsPerMin: 20, maxRequestsPerHour: 300, maxConcurrent: 8,
    enabled: true, createTime: '2025-10-01T10:00:00Z', updateTime: '2026-03-12T09:00:00Z',
  },
  {
    id: 4, name: '联网搜索限流', targetType: 'agent', targetId: 2, targetName: '联网搜索',
    maxRequestsPerMin: 100, maxRequestsPerHour: 3000, maxConcurrent: 20,
    enabled: false, createTime: '2025-11-01T10:00:00Z', updateTime: '2026-02-28T16:00:00Z',
  },
];

let nextQuotaId = 100;
let nextRateLimitId = 100;

export function registerHandlers(mock: MockAdapter): void {
  mock.onGet('/quotas').reply(() => mockOk(quotas));

  mock.onPost('/quotas').reply((config) => {
    const body = JSON.parse(config.data || '{}');
    const now = new Date().toISOString();
    const item: QuotaItem = {
      id: nextQuotaId++,
      targetType: body.targetType || 'user',
      targetId: body.targetId ?? null,
      targetName: body.targetName || '新配额',
      dailyLimit: body.dailyLimit ?? 1000,
      monthlyLimit: body.monthlyLimit ?? 20000,
      dailyUsed: 0,
      monthlyUsed: 0,
      enabled: true,
      createTime: now,
      updateTime: now,
    };
    quotas.push(item);
    return mockOk(item);
  });

  mock.onGet('/rate-limits').reply(() => mockOk(rateLimits));

  mock.onPost('/rate-limits').reply((config) => {
    const body = JSON.parse(config.data || '{}');
    const now = new Date().toISOString();
    const item: RateLimitItem = {
      id: nextRateLimitId++,
      name: body.name || '新限流规则',
      targetType: body.targetType || 'global',
      targetId: body.targetId ?? null,
      targetName: body.targetName || '全局',
      maxRequestsPerMin: body.maxRequestsPerMin ?? 100,
      maxRequestsPerHour: body.maxRequestsPerHour ?? 3000,
      maxConcurrent: body.maxConcurrent ?? 10,
      enabled: true,
      createTime: now,
      updateTime: now,
    };
    rateLimits.push(item);
    return mockOk(item);
  });

  mock.onPatch(/\/rate-limits\/(\d+)$/).reply((config) => {
    const id = Number(config.url!.match(/\/rate-limits\/(\d+)$/)?.[1]);
    const body = JSON.parse(config.data || '{}');
    const item = rateLimits.find((r) => r.id === id);
    if (item && typeof body.enabled === 'boolean') {
      item.enabled = body.enabled;
      item.updateTime = new Date().toISOString();
    }
    return mockOk(null);
  });
}
