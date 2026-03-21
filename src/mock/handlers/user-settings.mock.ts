import type MockAdapter from 'axios-mock-adapter';
import type { UserWorkspace, UserApiKey, UserStats } from '../../types/dto/user-settings';
import { mockOk } from '..';

function ts(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString();
}

let workspace: UserWorkspace = {
  id: 'ws_001',
  name: '我的工作空间',
  description: '默认工作空间',
  defaultModel: 'qwen-turbo',
  language: 'zh-CN',
  timezone: 'Asia/Shanghai',
  notifications: {
    email: true,
    browser: true,
    agentErrors: true,
    billingAlerts: true,
    systemUpdates: true,
    weeklyReport: false,
  },
  createdAt: ts(120),
  updatedAt: ts(1),
};

const apiKeys: UserApiKey[] = [
  { id: 'uak01', name: '开发环境密钥', prefix: 'sk_dev', maskedKey: 'sk_dev_****a3f9', scopes: ['agent:read', 'agent:write', 'kb:read'], expiresAt: ts(-90), lastUsedAt: ts(0), callCount: 12500, createdAt: ts(60) },
  { id: 'uak02', name: '生产环境密钥', prefix: 'sk_prod', maskedKey: 'sk_prod_****b2c8', scopes: ['agent:read', 'agent:write', 'kb:read', 'kb:write'], expiresAt: ts(-180), lastUsedAt: ts(0), callCount: 45200, createdAt: ts(90) },
  { id: 'uak03', name: '只读测试密钥', prefix: 'sk_test', maskedKey: 'sk_test_****d1e7', scopes: ['agent:read', 'kb:read'], lastUsedAt: ts(3), callCount: 320, createdAt: ts(15) },
  { id: 'uak04', name: '临时调试密钥', prefix: 'sk_tmp', maskedKey: 'sk_tmp_****f4g6', scopes: ['agent:read'], expiresAt: ts(7), lastUsedAt: ts(5), callCount: 50, createdAt: ts(10) },
];

const userStats: UserStats = {
  totalAgents: 8,
  totalWorkflows: 3,
  totalApiCalls: 58070,
  tokenUsage: 12500000,
  storageUsedMb: 2450,
  activeSessions: 3,
};

let nextKeyId = 100;

export function registerHandlers(mock: MockAdapter): void {
  mock.onGet('/user-settings/workspace').reply(() => mockOk(workspace));

  mock.onPut('/user-settings/workspace').reply((config) => {
    const body = JSON.parse(config.data || '{}');
    workspace = { ...workspace, ...body, updatedAt: new Date().toISOString() };
    return mockOk(workspace);
  });

  mock.onGet('/user-settings/api-keys').reply(() => mockOk(apiKeys));

  mock.onPost('/user-settings/api-keys').reply((config) => {
    const body = JSON.parse(config.data || '{}');
    const key: UserApiKey = {
      id: 'uak_' + nextKeyId++,
      name: body.name,
      prefix: 'sk_' + Math.random().toString(36).slice(2, 6),
      maskedKey: 'sk_' + Math.random().toString(36).slice(2, 6) + '_****' + Math.random().toString(36).slice(2, 6),
      scopes: body.scopes || [],
      expiresAt: body.expiresAt,
      callCount: 0,
      createdAt: new Date().toISOString(),
    };
    apiKeys.push(key);
    return mockOk(key);
  });

  mock.onDelete(/\/user-settings\/api-keys\/([^/]+)$/).reply((config) => {
    const id = config.url!.match(/\/user-settings\/api-keys\/([^/]+)$/)?.[1];
    const idx = apiKeys.findIndex((k) => k.id === id);
    if (idx >= 0) apiKeys.splice(idx, 1);
    return mockOk(null);
  });

  mock.onGet('/user-settings/stats').reply(() => mockOk(userStats));
}
