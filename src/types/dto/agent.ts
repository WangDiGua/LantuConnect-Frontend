/**
 * @deprecated Agent legacy types — old /agents/** API has been removed.
 * These types are retained only for backward-compatible UI components (AgentDetail, AgentMarket).
 * New code should use ResourceCatalogItemVO / ResourceUpsertRequest from catalog.ts / resource-center.ts.
 */

export type AgentType = 'mcp' | 'http_api' | 'builtin' | 'context_skill';
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
  tags?: string[];
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
  callCount: number;
  createTime: string;
  updateTime: string;
  /** 目录聚合字段（统一网关 catalog） */
  createdBy?: number;
  createdByName?: string;
  ratingAvg?: number;
  reviewCount?: number;
  /** 市场详情「智能体介绍」Markdown */
  serviceDetailMd?: string;
  /** 目录项：详情页累计浏览（t_resource.view_count） */
  viewCount?: number;
  endpoint?: string;
  invokeType?: string;
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
  tags?: string[];
}

export interface AgentVersion {
  id: number;
  agentId: number;
  version: string;
  changelog: string;
  status: 'draft' | 'testing' | 'released' | 'rollback';
  specJsonSnapshot?: Record<string, unknown>;
  createdBy: string;
  createTime: string;
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
