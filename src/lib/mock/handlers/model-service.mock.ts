import type MockAdapter from 'axios-mock-adapter';
import type {
  ModelEndpoint,
  PlaygroundSession,
  FineTuneJob,
} from '../../../types/dto/model-service';
import { mockOk } from '../mockAdapter';

function ts(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString();
}

const endpoints: ModelEndpoint[] = [
  { id: 'ep01', name: '通义千问-Turbo', provider: '阿里云', modelId: 'qwen-turbo', type: 'chat', endpoint: 'https://dashscope.aliyuncs.com/v1/chat', region: 'cn-hangzhou', status: 'online', maxTokens: 8192, costPerInputToken: 0.00002, costPerOutputToken: 0.00006, rateLimit: 100, avgLatencyMs: 320, uptime: 99.95, createdAt: ts(90), updatedAt: ts(1) },
  { id: 'ep02', name: 'GPT-4o-mini', provider: 'OpenAI兼容', modelId: 'gpt-4o-mini', type: 'chat', endpoint: 'https://api.openai-proxy.com/v1/chat', region: 'us-east', status: 'online', maxTokens: 16384, costPerInputToken: 0.00006, costPerOutputToken: 0.00018, rateLimit: 50, avgLatencyMs: 410, uptime: 99.8, createdAt: ts(60), updatedAt: ts(2) },
  { id: 'ep03', name: '文心 4.0', provider: '百度', modelId: 'ernie-4.0', type: 'chat', endpoint: 'https://aip.baidubce.com/v1/chat', region: 'cn-beijing', status: 'online', maxTokens: 8192, costPerInputToken: 0.00003, costPerOutputToken: 0.00009, rateLimit: 80, avgLatencyMs: 380, uptime: 99.7, createdAt: ts(45), updatedAt: ts(3) },
  { id: 'ep04', name: 'DeepSeek-V3', provider: 'DeepSeek', modelId: 'deepseek-chat', type: 'chat', endpoint: 'https://api.deepseek.com/v1/chat', region: 'cn-hangzhou', status: 'online', maxTokens: 65536, costPerInputToken: 0.00001, costPerOutputToken: 0.00002, rateLimit: 60, avgLatencyMs: 350, uptime: 99.6, createdAt: ts(20), updatedAt: ts(1) },
  { id: 'ep05', name: 'Embedding-v3', provider: '阿里云', modelId: 'text-embedding-v3', type: 'embedding', endpoint: 'https://dashscope.aliyuncs.com/v1/embeddings', region: 'cn-hangzhou', status: 'online', maxTokens: 8192, costPerInputToken: 0.000005, costPerOutputToken: 0, rateLimit: 200, avgLatencyMs: 80, uptime: 99.99, createdAt: ts(90), updatedAt: ts(5) },
  { id: 'ep06', name: 'Claude-3.5-Sonnet', provider: 'Anthropic', modelId: 'claude-3-5-sonnet', type: 'chat', endpoint: 'https://api.anthropic-proxy.com/v1/chat', region: 'us-east', status: 'degraded', maxTokens: 4096, costPerInputToken: 0.00008, costPerOutputToken: 0.00024, rateLimit: 30, avgLatencyMs: 680, uptime: 97.5, createdAt: ts(15), updatedAt: ts(0) },
  { id: 'ep07', name: 'DALL·E 3', provider: 'OpenAI兼容', modelId: 'dall-e-3', type: 'image', endpoint: 'https://api.openai-proxy.com/v1/images', region: 'us-east', status: 'online', maxTokens: 0, costPerInputToken: 0, costPerOutputToken: 0.04, rateLimit: 10, avgLatencyMs: 5200, uptime: 99.5, createdAt: ts(30), updatedAt: ts(8) },
  { id: 'ep08', name: 'Whisper-large-v3', provider: 'OpenAI兼容', modelId: 'whisper-large-v3', type: 'audio', endpoint: 'https://api.openai-proxy.com/v1/audio', region: 'us-east', status: 'offline', maxTokens: 0, costPerInputToken: 0.0001, costPerOutputToken: 0, rateLimit: 20, avgLatencyMs: 3000, uptime: 0, createdAt: ts(25), updatedAt: ts(10) },
];

const fineTuneJobs: FineTuneJob[] = [
  { id: 'ft01', name: '教务领域微调', baseModel: 'qwen-turbo', targetModel: 'qwen-turbo-edu-v1', datasetId: 'd1', datasetName: '招生FAQ评测集', status: 'completed', progress: 100, epochs: 3, currentEpoch: 3, learningRate: 0.0001, batchSize: 16, trainLoss: 0.12, evalLoss: 0.15, metrics: { accuracy: 0.94, f1: 0.91 }, startedAt: ts(10), completedAt: ts(9), createdBy: 'admin', createdAt: ts(10) },
  { id: 'ft02', name: '客服对话风格调优', baseModel: 'qwen-turbo', targetModel: 'qwen-turbo-cs-v1', datasetId: 'd2', datasetName: '客服对话数据集', status: 'training', progress: 65, epochs: 5, currentEpoch: 3, learningRate: 0.00005, batchSize: 8, trainLoss: 0.18, metrics: {}, startedAt: ts(1), createdBy: 'zhangsan', createdAt: ts(1) },
  { id: 'ft03', name: '学术写作微调', baseModel: 'deepseek-chat', targetModel: 'deepseek-academic-v1', datasetId: 'd3', datasetName: '学术论文样本集', status: 'pending', progress: 0, epochs: 4, currentEpoch: 0, learningRate: 0.0001, batchSize: 16, createdBy: 'lisi', createdAt: ts(0) },
  { id: 'ft04', name: '法律领域微调', baseModel: 'ernie-4.0', targetModel: 'ernie-law-v1', datasetId: 'd4', datasetName: '法律问答数据集', status: 'failed', progress: 40, epochs: 3, currentEpoch: 1, learningRate: 0.0002, batchSize: 32, trainLoss: 0.45, metrics: {}, startedAt: ts(5), createdBy: 'admin', createdAt: ts(5) },
  { id: 'ft05', name: '心理咨询微调', baseModel: 'qwen-turbo', targetModel: 'qwen-turbo-psy-v1', datasetId: 'd5', datasetName: '心理咨询语料', status: 'evaluating', progress: 90, epochs: 3, currentEpoch: 3, learningRate: 0.0001, batchSize: 16, trainLoss: 0.14, evalLoss: 0.17, metrics: { accuracy: 0.89 }, startedAt: ts(3), createdBy: 'wangwu', createdAt: ts(3) },
];

let sessionId = 1;

export function registerHandlers(mock: MockAdapter): void {
  mock.onGet('/model-service/endpoints').reply(() => mockOk(endpoints));

  mock.onGet(/\/model-service\/playground\/([^/]+)$/).reply((config) => {
    const modelId = config.url!.match(/\/model-service\/playground\/([^/]+)$/)?.[1];
    const session: PlaygroundSession = {
      id: 'ps_' + sessionId++,
      modelId: modelId || 'qwen-turbo',
      messages: [],
      config: { temperature: 0.7, maxTokens: 2048, topP: 0.9, stream: false },
      createdAt: new Date().toISOString(),
    };
    return mockOk(session);
  });

  mock.onPost('/model-service/playground').reply((config) => {
    const body = JSON.parse(config.data || '{}');
    const reply = {
      role: 'assistant' as const,
      content: '这是模型的模拟回复。您发送的消息是: "' + (body.message || body.messages?.slice(-1)?.[0]?.content || '') + '"。在实际环境中，这里会返回模型的真实回复。',
      timestamp: new Date().toISOString(),
      tokenCount: 45 + Math.floor(Math.random() * 100),
    };
    return mockOk(reply);
  });

  mock.onGet('/model-service/fine-tune').reply(() => mockOk(fineTuneJobs));

  mock.onPost('/model-service/fine-tune').reply((config) => {
    const body = JSON.parse(config.data || '{}');
    const job: FineTuneJob = {
      id: 'ft_' + Date.now().toString(36),
      name: body.name,
      baseModel: body.baseModel,
      targetModel: body.baseModel + '-ft-' + Date.now().toString(36),
      datasetId: body.datasetId,
      datasetName: '数据集',
      status: 'pending',
      progress: 0,
      epochs: body.epochs || 3,
      currentEpoch: 0,
      learningRate: body.learningRate || 0.0001,
      batchSize: body.batchSize || 16,
      createdBy: 'current_user',
      createdAt: new Date().toISOString(),
    };
    fineTuneJobs.push(job);
    return mockOk(job);
  });
}
