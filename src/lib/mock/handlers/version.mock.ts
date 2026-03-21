import type MockAdapter from 'axios-mock-adapter';
import type { AgentVersion } from '../../../types/dto/agent';
import { mockOk } from '../mockAdapter';

const versions: AgentVersion[] = [
  {
    id: 1,
    agentId: 1,
    version: '1.0.0',
    changelog: '初始版本，支持文生图基础功能',
    status: 'released',
    specJsonSnapshot: { url: 'https://dashscope.aliyuncs.com/mcp/ali_image_generate', timeout: 60000 },
    createdBy: '张伟',
    createTime: '2025-06-15T10:00:00Z',
  },
  {
    id: 2,
    agentId: 1,
    version: '1.1.0',
    changelog: '新增图生图能力，优化生成速度',
    status: 'released',
    createdBy: '张伟',
    createTime: '2025-09-20T14:30:00Z',
  },
  {
    id: 3,
    agentId: 1,
    version: '1.2.0',
    changelog: '支持批量生成，新增风格预设模板',
    status: 'released',
    createdBy: '李明',
    createTime: '2026-01-10T09:00:00Z',
  },
  {
    id: 4,
    agentId: 1,
    version: '2.0.0-beta',
    changelog: '升级到通义万相2.0模型，大幅提升画质',
    status: 'testing',
    createdBy: '李明',
    createTime: '2026-03-15T11:00:00Z',
  },
  {
    id: 5,
    agentId: 2,
    version: '1.0.0',
    changelog: '初始版本，支持百度、Google多源搜索',
    status: 'released',
    createdBy: '王芳',
    createTime: '2025-05-01T08:00:00Z',
  },
  {
    id: 6,
    agentId: 2,
    version: '1.1.0',
    changelog: '新增学术搜索源，优化结果排序算法',
    status: 'released',
    createdBy: '王芳',
    createTime: '2025-11-05T16:00:00Z',
  },
  {
    id: 7,
    agentId: 6,
    version: '1.0.0',
    changelog: '任务管理助手初始版本',
    status: 'released',
    createdBy: '陈静',
    createTime: '2025-04-01T08:00:00Z',
  },
  {
    id: 8,
    agentId: 6,
    version: '1.1.0',
    changelog: '支持任务编排与进度追踪',
    status: 'draft',
    createdBy: '陈静',
    createTime: '2026-03-19T10:00:00Z',
  },
];

let nextId = 100;

export function registerHandlers(mock: MockAdapter): void {
  mock.onGet(/\/agents\/(\d+)\/versions$/).reply((config) => {
    const agentId = Number(config.url!.match(/\/agents\/(\d+)\/versions$/)?.[1]);
    const filtered = versions.filter((v) => v.agentId === agentId);
    return mockOk(filtered);
  });

  mock.onPost(/\/agents\/(\d+)\/versions$/).reply((config) => {
    const agentId = Number(config.url!.match(/\/agents\/(\d+)\/versions$/)?.[1]);
    const body = JSON.parse(config.data || '{}');
    const newVersion: AgentVersion = {
      id: nextId++,
      agentId,
      version: body.version || '0.0.1',
      changelog: body.changelog || '',
      status: 'draft',
      createdBy: '当前用户',
      createTime: new Date().toISOString(),
    };
    versions.push(newVersion);
    return mockOk(newVersion);
  });

  mock.onPost(/\/versions\/(\d+)\/publish$/).reply((config) => {
    const id = Number(config.url!.match(/\/versions\/(\d+)\/publish$/)?.[1]);
    const ver = versions.find((v) => v.id === id);
    if (ver) ver.status = 'released';
    return mockOk(null);
  });

  mock.onPost(/\/versions\/(\d+)\/rollback$/).reply((config) => {
    const id = Number(config.url!.match(/\/versions\/(\d+)\/rollback$/)?.[1]);
    const ver = versions.find((v) => v.id === id);
    if (ver) ver.status = 'rollback';
    return mockOk(null);
  });
}
