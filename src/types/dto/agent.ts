// Agent 智能体 - 映射 genie_external_agent (mode=SUBAGENT, parent_id=NULL)

export type AgentType = 'mcp' | 'http_api' | 'builtin';
export type AgentMode = 'SUBAGENT' | 'TOOL' | 'ALL';
export type SourceType = 'internal' | 'partner' | 'cloud';
export type AgentStatus = 'draft' | 'pending_review' | 'testing' | 'published' | 'rejected' | 'deprecated';
export type DisplayTemplate = 'file' | 'image' | 'audio' | 'video' | 'app' | 'microService' | 'search_web' | 'search_file' | 'answer' | 'ai_answer';

export interface Agent {
  id: number;
  agentName: string;
  displayName: string;
  description: string;
  agentType: AgentType;
  mode: AgentMode;
  sourceType: SourceType;
  providerId: number | null;
  categoryId: number | null;
  categoryName?: string;
  status: AgentStatus;
  specJson: Record<string, unknown>;
  isPublic: boolean;
  icon: string | null;
  sortOrder: number;
  hidden: boolean;
  maxConcurrency: number;
  maxSteps: number | null;
  temperature: number | null;
  systemPrompt: string | null;
  qualityScore: number;
  avgLatencyMs: number;
  successRate: number;
  avgTokenCost: number;
  callCount: number;
  createTime: string;
  updateTime: string;
}

export interface AgentCreatePayload {
  agentName: string;
  displayName: string;
  description: string;
  agentType: AgentType;
  sourceType: SourceType;
  providerId?: number;
  categoryId?: number;
  specJson: Record<string, unknown>;
  isPublic?: boolean;
  icon?: string;
  maxConcurrency?: number;
  maxSteps?: number;
  temperature?: number;
  systemPrompt?: string;
}

export interface AgentUpdatePayload extends Partial<AgentCreatePayload> {
  status?: AgentStatus;
  hidden?: boolean;
  sortOrder?: number;
}

export interface AgentListQuery {
  page?: number;
  pageSize?: number;
  keyword?: string;
  status?: AgentStatus;
  sourceType?: SourceType;
  agentType?: AgentType;
  categoryId?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface AgentMarketItem {
  id: number;
  agentName: string;
  displayName: string;
  description: string;
  icon: string | null;
  categoryName: string;
  sourceType: SourceType;
  qualityScore: number;
  avgLatencyMs: number;
  callCount: number;
  successRate: number;
  tags: string[];
}
