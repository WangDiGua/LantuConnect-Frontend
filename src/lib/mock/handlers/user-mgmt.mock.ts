import type MockAdapter from 'axios-mock-adapter';
import { mockOk, paginate } from '../mockAdapter';
import { MOCK_USERS, MOCK_ROLES, MOCK_API_KEYS, MOCK_TOKENS } from '../../../constants/userMgmt';

let users = [...MOCK_USERS];
let roles = [...MOCK_ROLES];
let apiKeys = [...MOCK_API_KEYS];
let tokens = [...MOCK_TOKENS];
let nextId = 100;

export function registerHandlers(mock: MockAdapter): void {
  mock.onGet('/user-mgmt/users').reply((config) => {
    const p = config.params || {};
    return paginate(users, Number(p.page) || 1, Number(p.pageSize) || 20);
  });

  mock.onPost('/user-mgmt/users').reply((config) => {
    const body = JSON.parse(config.data || '{}');
    const u = { id: `u${nextId++}`, ...body, status: 'active', lastLogin: '-' };
    users.push(u as any);
    return mockOk(u);
  });

  mock.onPut(/\/user-mgmt\/users\/([^/]+)$/).reply((config) => {
    const id = config.url!.match(/\/user-mgmt\/users\/([^/]+)$/)?.[1];
    const body = JSON.parse(config.data || '{}');
    const idx = users.findIndex((u) => u.id === id);
    if (idx >= 0) users[idx] = { ...users[idx], ...body };
    return mockOk(users[idx] || null);
  });

  mock.onDelete(/\/user-mgmt\/users\/([^/]+)$/).reply((config) => {
    const id = config.url!.match(/\/user-mgmt\/users\/([^/]+)$/)?.[1];
    users = users.filter((u) => u.id !== id);
    return mockOk(null);
  });

  mock.onGet('/user-mgmt/roles').reply(() => mockOk(roles));

  mock.onPost('/user-mgmt/roles').reply((config) => {
    const body = JSON.parse(config.data || '{}');
    const r = { id: `r${nextId++}`, ...body, userCount: 0 };
    roles.push(r);
    return mockOk(r);
  });

  mock.onPut(/\/user-mgmt\/roles\/([^/]+)$/).reply((config) => {
    const id = config.url!.match(/\/user-mgmt\/roles\/([^/]+)$/)?.[1];
    const body = JSON.parse(config.data || '{}');
    const idx = roles.findIndex((r) => r.id === id);
    if (idx >= 0) roles[idx] = { ...roles[idx], ...body };
    return mockOk(roles[idx] || null);
  });

  mock.onDelete(/\/user-mgmt\/roles\/([^/]+)$/).reply((config) => {
    const id = config.url!.match(/\/user-mgmt\/roles\/([^/]+)$/)?.[1];
    roles = roles.filter((r) => r.id !== id);
    return mockOk(null);
  });

  mock.onGet('/user-mgmt/api-keys').reply(() => mockOk(apiKeys));

  mock.onPost('/user-mgmt/api-keys').reply((config) => {
    const body = JSON.parse(config.data || '{}');
    const k = {
      id: `k${nextId++}`,
      name: body.name,
      prefix: 'sk_' + Math.random().toString(36).slice(2, 6),
      createdAt: new Date().toISOString(),
      status: 'active' as const,
    };
    apiKeys.push(k);
    return mockOk(k);
  });

  mock.onPut(/\/user-mgmt\/api-keys\/([^/]+)\/revoke$/).reply((config) => {
    const id = config.url!.match(/\/user-mgmt\/api-keys\/([^/]+)\/revoke/)?.[1];
    const idx = apiKeys.findIndex((k) => k.id === id);
    if (idx >= 0) apiKeys[idx] = { ...apiKeys[idx], status: 'revoked' as const };
    return mockOk(apiKeys[idx] || null);
  });

  mock.onGet('/user-mgmt/tokens').reply(() => mockOk(tokens));

  mock.onPut(/\/user-mgmt\/tokens\/([^/]+)\/revoke$/).reply((config) => {
    const id = config.url!.match(/\/user-mgmt\/tokens\/([^/]+)\/revoke/)?.[1];
    const idx = tokens.findIndex((t) => t.id === id);
    if (idx >= 0) tokens[idx] = { ...tokens[idx], status: 'revoked' as const };
    return mockOk(tokens[idx] || null);
  });

  mock.onGet('/user-mgmt/org').reply(() =>
    mockOk({
      id: 'org1',
      name: '蓝图教育科技',
      parentId: null,
      type: 'company',
      headCount: 20,
      children: [
        { id: 'dept1', name: '技术部', parentId: 'org1', type: 'department', headCount: 12, children: [] },
        { id: 'dept2', name: '教务部', parentId: 'org1', type: 'department', headCount: 8, children: [] },
      ],
    }),
  );
}
