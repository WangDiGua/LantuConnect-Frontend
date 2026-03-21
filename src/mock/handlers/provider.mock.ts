import type MockAdapter from 'axios-mock-adapter';
import type { Provider } from '../../types/dto/provider';
import { mockOk, paginate } from '..';

const providers: Provider[] = [
  {
    id: 1,
    providerCode: 'lantu-self',
    providerName: '蓝图自研',
    providerType: 'internal',
    description: '编排流、知识库、模型网关等自研产品，为平台核心能力提供底层支撑。',
    authType: 'api_key',
    authConfig: { api_key: '****' },
    baseUrl: null,
    status: 'active',
    agentCount: 8,
    skillCount: 12,
    createTime: '2025-06-01T00:00:00Z',
    updateTime: '2026-03-15T10:00:00Z',
  },
  {
    id: 2,
    providerCode: 'aliyun-bailian',
    providerName: '阿里云百炼',
    providerType: 'cloud',
    description: '阿里云百炼大模型服务平台，提供通义千问系列模型的推理与微调能力。',
    authType: 'api_key',
    authConfig: { api_key: '****' },
    baseUrl: 'https://dashscope.aliyuncs.com',
    status: 'active',
    agentCount: 5,
    skillCount: 3,
    createTime: '2025-08-10T00:00:00Z',
    updateTime: '2026-03-12T14:00:00Z',
  },
  {
    id: 3,
    providerCode: 'volcengine',
    providerName: '火山引擎',
    providerType: 'cloud',
    description: '字节跳动旗下云平台，提供豆包大模型系列及智能体开发平台。',
    authType: 'api_key',
    authConfig: { api_key: '****' },
    baseUrl: 'https://open.volcengineapi.com',
    status: 'active',
    agentCount: 3,
    skillCount: 2,
    createTime: '2025-09-20T00:00:00Z',
    updateTime: '2026-03-10T16:00:00Z',
  },
  {
    id: 4,
    providerCode: 'zhxy-tech',
    providerName: '智慧校园科技',
    providerType: 'partner',
    description: '合作伙伴，提供智慧教室、校园一卡通等IoT集成能力和数据接口。',
    authType: 'oauth2',
    authConfig: { client_id: 'zhxy_client', client_secret: '****' },
    baseUrl: 'https://api.zhxy-tech.com',
    status: 'active',
    agentCount: 2,
    skillCount: 5,
    createTime: '2025-11-05T00:00:00Z',
    updateTime: '2026-03-08T12:00:00Z',
  },
  {
    id: 5,
    providerCode: 'coze',
    providerName: 'Coze',
    providerType: 'cloud',
    description: '字节跳动扣子平台，提供Bot搭建与插件市场，已暂停接入。',
    authType: 'api_key',
    authConfig: { api_key: '****' },
    baseUrl: 'https://api.coze.cn',
    status: 'inactive',
    agentCount: 0,
    skillCount: 0,
    createTime: '2026-01-15T00:00:00Z',
    updateTime: '2026-03-01T09:00:00Z',
  },
];

let nextId = 100;

export function registerHandlers(mock: MockAdapter): void {
  mock.onGet('/v1/providers').reply((config) => {
    const p = config.params || {};
    let filtered = [...providers];
    if (p.keyword) {
      const kw = p.keyword.toLowerCase();
      filtered = filtered.filter(
        (pv) =>
          pv.providerName.toLowerCase().includes(kw) ||
          pv.providerCode.toLowerCase().includes(kw) ||
          (pv.description || '').toLowerCase().includes(kw),
      );
    }
    if (p.providerType) filtered = filtered.filter((pv) => pv.providerType === p.providerType);
    if (p.status) filtered = filtered.filter((pv) => pv.status === p.status);
    return paginate(filtered, Number(p.page) || 1, Number(p.pageSize) || 20);
  });

  mock.onGet(/\/v1\/providers\/(\d+)$/).reply((config) => {
    const id = Number(config.url!.match(/\/v1\/providers\/(\d+)$/)?.[1]);
    const pv = providers.find((p) => p.id === id);
    return pv ? mockOk(pv) : [404, { code: 404, message: 'Provider not found', timestamp: Date.now() }];
  });

  mock.onPost('/v1/providers').reply((config) => {
    const body = JSON.parse(config.data || '{}');
    const now = new Date().toISOString();
    const newPv: Provider = {
      id: nextId++,
      providerCode: body.providerCode || 'new-provider',
      providerName: body.providerName || '新提供商',
      providerType: body.providerType || 'cloud',
      description: body.description || null,
      authType: body.authType || 'api_key',
      authConfig: body.authConfig || null,
      baseUrl: body.baseUrl || null,
      status: 'active',
      agentCount: 0,
      skillCount: 0,
      createTime: now,
      updateTime: now,
    };
    providers.unshift(newPv);
    return mockOk(newPv);
  });

  mock.onPut(/\/v1\/providers\/(\d+)$/).reply((config) => {
    const id = Number(config.url!.match(/\/v1\/providers\/(\d+)$/)?.[1]);
    const body = JSON.parse(config.data || '{}');
    const idx = providers.findIndex((p) => p.id === id);
    if (idx >= 0) {
      providers[idx] = { ...providers[idx], ...body, updateTime: new Date().toISOString() };
      return mockOk(providers[idx]);
    }
    return [404, { code: 404, message: 'Provider not found', timestamp: Date.now() }];
  });

  mock.onDelete(/\/v1\/providers\/(\d+)$/).reply((config) => {
    const id = Number(config.url!.match(/\/v1\/providers\/(\d+)$/)?.[1]);
    const idx = providers.findIndex((p) => p.id === id);
    if (idx >= 0) providers.splice(idx, 1);
    return mockOk(null);
  });
}
