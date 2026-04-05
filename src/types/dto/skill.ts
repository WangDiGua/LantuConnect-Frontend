/**
 * @deprecated Skill legacy types — old /v1/skills/** API has been removed.
 * New code should use ResourceCatalogItemVO / ResourceUpsertRequest from catalog.ts / resource-center.ts.
 */

import type { AgentType, SourceType, AgentStatus, DisplayTemplate } from './agent';

export interface Skill {
  id: number;
  agentName: string;
  displayName: string;
  description: string;
  agentType: AgentType;
  mode: 'TOOL';
  parentId: number | null;
  parentName?: string;
  sourceType: SourceType;
  providerId: number | null;
  categoryId: number | null;
  categoryName?: string;
  tags?: string[];
  status: AgentStatus;
  displayTemplate: DisplayTemplate | null;
  specJson: Record<string, unknown>;
  parametersSchema: Record<string, unknown> | null;
  isPublic: boolean;
  icon: string | null;
  sortOrder: number;
  maxConcurrency: number;
  qualityScore: number;
  avgLatencyMs: number;
  successRate: number;
  callCount: number;
  createTime: string;
  updateTime: string;
  createdBy?: number;
  createdByName?: string;
  ratingAvg?: number;
  reviewCount?: number;
  /** 目录/详情接口返回的扩展介绍 Markdown */
  serviceDetailMd?: string;
}

export interface SkillCreatePayload {
  agentName: string;
  displayName: string;
  description: string;
  agentType: AgentType;
  parentId?: number;
  sourceType: SourceType;
  providerId?: number;
  categoryId?: number;
  displayTemplate?: DisplayTemplate;
  specJson: Record<string, unknown>;
  parametersSchema?: Record<string, unknown>;
  isPublic?: boolean;
  icon?: string;
  maxConcurrency?: number;
}

export interface SkillUpdatePayload extends Partial<SkillCreatePayload> {
  status?: AgentStatus;
  sortOrder?: number;
}

export interface SkillListQuery {
  page?: number;
  pageSize?: number;
  keyword?: string;
  status?: AgentStatus;
  sourceType?: SourceType;
  parentId?: number;
  categoryId?: number;
  tags?: string[];
}

export interface McpServer {
  id: number;
  agentName: string;
  displayName: string;
  description: string;
  specJson: Record<string, unknown>;
  sourceType: SourceType;
  status: AgentStatus;
  skillCount: number;
  createTime: string;
}
