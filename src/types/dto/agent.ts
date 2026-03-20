export interface Agent {
  id: string;
  name: string;
  description: string;
  avatar?: string;
  type: 'chat' | 'task' | 'workflow' | 'custom';
  status: 'draft' | 'published' | 'archived' | 'error';
  modelId: string;
  modelName?: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  tools: string[];
  knowledgeBases: string[];
  tags: string[];
  version: string;
  publishedAt?: string;
  callCount: number;
  avgLatencyMs: number;
  successRate: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface AgentCreatePayload {
  name: string;
  description: string;
  type: Agent['type'];
  modelId: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  tools?: string[];
  knowledgeBases?: string[];
  tags?: string[];
}

export interface AgentVersion {
  id: string;
  agentId: string;
  version: string;
  changelog: string;
  note?: string;
  current: boolean;
  publishedAt?: string;
  snapshot: Partial<Agent>;
  createdBy: string;
  createdAt: string;
}

export interface AgentMarketItem {
  id: string;
  name: string;
  description: string;
  avatar?: string;
  author: string;
  category: string;
  tags: string[];
  rating: number;
  usageCount: number;
  price: number | 'free';
  featured: boolean;
  createdAt: string;
}

export interface DebugMessageRequest {
  agentId: string;
  message: string;
  sessionId?: string;
}

export interface DebugMessageResponse {
  reply: string;
  usage: { promptTokens: number; completionTokens: number; totalTokens: number };
  latencyMs: number;
  traceId: string;
}
