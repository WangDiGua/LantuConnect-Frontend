export interface ModelEndpoint {
  id: string;
  name: string;
  provider: string;
  modelId: string;
  type: 'chat' | 'completion' | 'embedding' | 'image' | 'audio' | 'video';
  endpoint: string;
  region?: string;
  status: 'online' | 'offline' | 'degraded';
  maxTokens: number;
  costPerInputToken: number;
  costPerOutputToken: number;
  rateLimit: number;
  avgLatencyMs: number;
  vendor?: string;
  latency?: number;
  latencyMs?: number;
  uptime: number;
  createdAt: string;
  updatedAt: string;
}

export interface PlaygroundSession {
  id: string;
  modelId: string;
  messages: PlaygroundMessage[];
  config: {
    temperature: number;
    maxTokens: number;
    topP: number;
    stream: boolean;
  };
  createdAt: string;
}

export interface PlaygroundMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp: string;
  tokenCount?: number;
}

export interface FineTuneJob {
  id: string;
  name: string;
  baseModel: string;
  targetModel: string;
  datasetId: string;
  datasetName: string;
  status: 'pending' | 'preparing' | 'training' | 'evaluating' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  epochs: number;
  currentEpoch: number;
  learningRate: number;
  batchSize: number;
  trainLoss?: number;
  evalLoss?: number;
  metrics?: Record<string, number>;
  startedAt?: string;
  completedAt?: string;
  createdBy: string;
  createdAt: string;
}

export interface CreateFineTunePayload {
  name: string;
  baseModel: string;
  datasetId: string;
  epochs?: number;
  learningRate?: number;
  batchSize?: number;
}

export interface SendPlaygroundPayload {
  modelId: string;
  prompt: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  stream?: boolean;
}

export interface PlaygroundResponse {
  content: string;
  tokenCount?: number;
}
