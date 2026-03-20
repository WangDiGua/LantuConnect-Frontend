import type MockAdapter from 'axios-mock-adapter';
import { mockOk, paginate } from '../mockAdapter';
import {
  INITIAL_WORKFLOWS,
  INITIAL_RUNS,
  INITIAL_SCHEDULES,
  WF_TEMPLATES,
} from '../../../constants/mock/userRoleData';

let workflows = [...INITIAL_WORKFLOWS];
let runs = [...INITIAL_RUNS];
let schedules = [...INITIAL_SCHEDULES];
let nextId = 100;

export function registerHandlers(mock: MockAdapter): void {
  mock.onGet('/workflows/runs').reply((config) => {
    const p = config.params || {};
    return paginate(runs, Number(p.page) || 1, Number(p.pageSize) || 20);
  });

  mock.onGet('/workflows/schedules').reply(() => mockOk(schedules));

  mock.onPost('/workflows/schedules').reply((config) => {
    const body = JSON.parse(config.data || '{}');
    const s = { id: `s${nextId++}`, ...body, enabled: true };
    schedules.push(s);
    return mockOk(s);
  });

  mock.onPut(/\/workflows\/schedules\/([^/]+)$/).reply((config) => {
    const id = config.url!.match(/\/workflows\/schedules\/([^/]+)$/)?.[1];
    const body = JSON.parse(config.data || '{}');
    const idx = schedules.findIndex((s) => s.id === id);
    if (idx >= 0) {
      schedules[idx] = { ...schedules[idx], ...body };
      return mockOk(schedules[idx]);
    }
    return mockOk(null);
  });

  mock.onGet('/workflows/templates').reply(() => mockOk(WF_TEMPLATES));

  mock.onGet('/workflows').reply((config) => {
    const p = config.params || {};
    return paginate(workflows, Number(p.page) || 1, Number(p.pageSize) || 20);
  });

  mock.onPost('/workflows').reply((config) => {
    const body = JSON.parse(config.data || '{}');
    const wf = {
      id: `w${nextId++}`,
      ...body,
      status: 'draft',
      updatedAt: new Date().toISOString(),
      steps: body.steps || ['开始', '结束'],
    };
    workflows.unshift(wf);
    return mockOk(wf);
  });

  mock.onGet(/\/workflows\/([^/]+)$/).reply((config) => {
    const id = config.url!.match(/\/workflows\/([^/]+)$/)?.[1];
    return mockOk(workflows.find((w) => w.id === id) || null);
  });

  mock.onPut(/\/workflows\/([^/]+)$/).reply((config) => {
    const id = config.url!.match(/\/workflows\/([^/]+)$/)?.[1];
    const body = JSON.parse(config.data || '{}');
    const idx = workflows.findIndex((w) => w.id === id);
    if (idx >= 0) {
      workflows[idx] = { ...workflows[idx], ...body };
      return mockOk(workflows[idx]);
    }
    return mockOk(null);
  });

  mock.onDelete(/\/workflows\/([^/]+)$/).reply((config) => {
    const id = config.url!.match(/\/workflows\/([^/]+)$/)?.[1];
    workflows = workflows.filter((w) => w.id !== id);
    return mockOk(null);
  });

  mock.onPost(/\/workflows\/([^/]+)\/execute$/).reply((config) => {
    const id = config.url!.match(/\/workflows\/([^/]+)\/execute/)?.[1];
    const run = {
      id: `r${nextId++}`,
      workflowId: id,
      workflowName: workflows.find((w) => w.id === id)?.name || '',
      status: 'running' as const,
      startedAt: new Date().toISOString(),
      durationMs: 0,
      log: '执行中...',
    };
    runs.unshift(run);
    return mockOk({ runId: run.id });
  });
}
