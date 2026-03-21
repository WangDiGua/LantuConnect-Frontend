import type MockAdapter from 'axios-mock-adapter';
import type { HealthConfigItem, CircuitBreakerItem } from '../../types/dto/health';
import { mockOk } from '..';

const healthConfigs: HealthConfigItem[] = [
  {
    id: 1, agentName: 'ali_image_generate', displayName: '图像生成',
    agentType: 'mcp', checkType: 'http',
    checkUrl: 'https://dashscope.aliyuncs.com/mcp/ali_image_generate/health',
    intervalSec: 30, healthyThreshold: 3, timeoutSec: 5,
    healthStatus: 'healthy', lastCheckTime: '2026-03-21T08:00:00Z',
  },
  {
    id: 2, agentName: 'internet_search', displayName: '联网搜索',
    agentType: 'mcp', checkType: 'http',
    checkUrl: 'https://dashscope.aliyuncs.com/mcp/internet_search/health',
    intervalSec: 15, healthyThreshold: 3, timeoutSec: 3,
    healthStatus: 'healthy', lastCheckTime: '2026-03-21T08:00:05Z',
  },
  {
    id: 3, agentName: 'word_generate', displayName: 'Word文档生成',
    agentType: 'mcp', checkType: 'http',
    checkUrl: 'http://mcp-office.internal:8080/word/health',
    intervalSec: 30, healthyThreshold: 3, timeoutSec: 5,
    healthStatus: 'degraded', lastCheckTime: '2026-03-21T07:59:50Z',
  },
  {
    id: 4, agentName: 'code_execute_mcp', displayName: '代码执行',
    agentType: 'mcp', checkType: 'tcp',
    checkUrl: 'mcp-sandbox.internal:8080',
    intervalSec: 20, healthyThreshold: 5, timeoutSec: 3,
    healthStatus: 'healthy', lastCheckTime: '2026-03-21T08:00:02Z',
  },
  {
    id: 5, agentName: 'ppt_generate', displayName: 'PPT演示文稿生成',
    agentType: 'mcp', checkType: 'http',
    checkUrl: 'http://mcp-office.internal:8080/ppt/health',
    intervalSec: 60, healthyThreshold: 3, timeoutSec: 10,
    healthStatus: 'down', lastCheckTime: '2026-03-21T07:58:00Z',
  },
  {
    id: 6, agentName: 'skill_chart', displayName: '统计图表生成',
    agentType: 'mcp', checkType: 'http',
    checkUrl: 'http://mcp-chart.internal:8080/chart/health',
    intervalSec: 30, healthyThreshold: 3, timeoutSec: 5,
    healthStatus: 'healthy', lastCheckTime: '2026-03-21T08:00:01Z',
  },
];

const circuitBreakers: CircuitBreakerItem[] = [
  {
    id: 1, agentName: 'ali_image_generate', displayName: '图像生成',
    currentState: 'CLOSED', failureThreshold: 5, openDurationSec: 60,
    halfOpenMaxCalls: 3, fallbackAgentName: null,
    fallbackMessage: '图像生成服务暂时不可用，请稍后重试',
    lastOpenedAt: null, successCount: 8742, failureCount: 23,
  },
  {
    id: 2, agentName: 'internet_search', displayName: '联网搜索',
    currentState: 'CLOSED', failureThreshold: 10, openDurationSec: 30,
    halfOpenMaxCalls: 5, fallbackAgentName: 'local_knowledge_search',
    fallbackMessage: '联网搜索暂不可用，已切换到本地知识库搜索',
    lastOpenedAt: '2026-03-10T12:30:00Z', successCount: 45280, failureCount: 45,
  },
  {
    id: 3, agentName: 'word_generate', displayName: 'Word文档生成',
    currentState: 'HALF_OPEN', failureThreshold: 3, openDurationSec: 120,
    halfOpenMaxCalls: 2, fallbackAgentName: null,
    fallbackMessage: 'Word文档生成服务正在恢复中，请稍候',
    lastOpenedAt: '2026-03-21T07:45:00Z', successCount: 12350, failureCount: 156,
  },
  {
    id: 4, agentName: 'ppt_generate', displayName: 'PPT演示文稿生成',
    currentState: 'OPEN', failureThreshold: 3, openDurationSec: 300,
    halfOpenMaxCalls: 1, fallbackAgentName: null,
    fallbackMessage: 'PPT生成服务暂时不可用，运维团队正在处理',
    lastOpenedAt: '2026-03-21T07:50:00Z', successCount: 890, failureCount: 67,
  },
];

export function registerHandlers(mock: MockAdapter): void {
  mock.onGet('/health/configs').reply(() => mockOk(healthConfigs));

  mock.onPut(/\/health\/configs\/(\d+)$/).reply((config) => {
    const id = Number(config.url!.match(/\/health\/configs\/(\d+)$/)?.[1]);
    const body = JSON.parse(config.data || '{}');
    const item = healthConfigs.find((h) => h.id === id);
    if (item) Object.assign(item, body);
    return mockOk(null);
  });

  mock.onGet('/health/circuit-breakers').reply(() => mockOk(circuitBreakers));

  mock.onPut(/\/health\/circuit-breakers\/(\d+)$/).reply((config) => {
    const id = Number(config.url!.match(/\/health\/circuit-breakers\/(\d+)$/)?.[1]);
    const body = JSON.parse(config.data || '{}');
    const item = circuitBreakers.find((c) => c.id === id);
    if (item) Object.assign(item, body);
    return mockOk(null);
  });

  mock.onPost(/\/health\/circuit-breakers\/(\d+)\/break$/).reply((config) => {
    const id = Number(config.url!.match(/\/health\/circuit-breakers\/(\d+)\/break$/)?.[1]);
    const item = circuitBreakers.find((c) => c.id === id);
    if (item) {
      item.currentState = 'OPEN';
      item.lastOpenedAt = new Date().toISOString();
    }
    return mockOk(null);
  });

  mock.onPost(/\/health\/circuit-breakers\/(\d+)\/recover$/).reply((config) => {
    const id = Number(config.url!.match(/\/health\/circuit-breakers\/(\d+)\/recover$/)?.[1]);
    const item = circuitBreakers.find((c) => c.id === id);
    if (item) item.currentState = 'CLOSED';
    return mockOk(null);
  });
}
