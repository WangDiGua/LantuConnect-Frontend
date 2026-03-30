import type { PaginatedData } from '../api';
import type { ResourceType } from './catalog';

export type ResourceStatus =
  | 'draft'
  | 'pending_review'
  | 'testing'
  | 'published'
  | 'rejected'
  | 'deprecated';

export interface ResourceCenterListQuery {
  page?: number;
  pageSize?: number;
  resourceType?: ResourceType;
  keyword?: string;
  status?: ResourceStatus;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ResourceBaseUpsertRequest {
  resourceType: ResourceType;
  resourceCode: string;
  displayName: string;
  description?: string;
  sourceType?: string;
  /** 归属：提供方 ID（选填，与资源注册文档 5.1 节一致） */
  providerId?: string | number;
  /** 归属：分类 ID（选填） */
  categoryId?: string | number;
}

export interface ResourceMcpUpsertRequest extends ResourceBaseUpsertRequest {
  resourceType: 'mcp';
  endpoint: string;
  protocol: string;
  authType?: string;
  authConfig?: Record<string, unknown>;
}

export interface ResourceSkillUpsertRequest extends ResourceBaseUpsertRequest {
  resourceType: 'skill';
  skillType?: string;
  mode?: string;
  spec?: Record<string, unknown>;
  parametersSchema?: Record<string, unknown>;
}

export interface ResourceAgentUpsertRequest extends ResourceBaseUpsertRequest {
  resourceType: 'agent';
  agentType?: string;
  mode?: string;
  spec?: Record<string, unknown>;
  maxConcurrency?: number;
  systemPrompt?: string;
  relatedResourceIds?: number[];
}

export interface ResourceAppUpsertRequest extends ResourceBaseUpsertRequest {
  resourceType: 'app';
  appUrl?: string;
  embedType?: string;
  relatedResourceIds?: number[];
}

export interface ResourceDatasetUpsertRequest extends ResourceBaseUpsertRequest {
  resourceType: 'dataset';
  dataType?: string;
  format?: string;
  recordCount?: number;
  fileSize?: number;
  tags?: string[];
}

export type ResourceUpsertRequest =
  | ResourceMcpUpsertRequest
  | ResourceSkillUpsertRequest
  | ResourceAgentUpsertRequest
  | ResourceAppUpsertRequest
  | ResourceDatasetUpsertRequest;

export interface ResourceCenterItemVO {
  id: number;
  resourceType: ResourceType;
  resourceId?: string;
  resourceCode: string;
  displayName: string;
  description?: string;
  sourceType?: string;
  providerId?: string;
  categoryId?: string;
  authType?: string;
  authConfig?: Record<string, unknown>;
  status: ResourceStatus;
  currentVersion?: string;
  createTime?: string;
  updateTime?: string;
  submitTime?: string;
  ownerId?: string;
  ownerName?: string;
  endpoint?: string;
  protocol?: string;
  appUrl?: string;
  embedType?: string;
  dataType?: string;
  format?: string;
  recordCount?: number;
  fileSize?: number;
  tags?: string[];
}

export type ResourceCenterPage = PaginatedData<ResourceCenterItemVO>;

export interface ResourceVersionCreateRequest {
  version: string;
  makeCurrent?: boolean;
  snapshot?: Record<string, unknown>;
}

export interface ResourceVersionVO {
  id: number;
  resourceId: number;
  version: string;
  isCurrent?: boolean;
  status?: string;
  createTime?: string;
  updateTime?: string;
}

export interface ResourceAuditItemVO {
  id: number;
  resourceId: number;
  resourceType: ResourceType;
  resourceCode?: string;
  displayName: string;
  description?: string;
  status: ResourceStatus;
  submitter?: string;
  submitterName?: string;
  reviewerName?: string;
  submitTime?: string;
  reason?: string;
  reviewComment?: string;
}

export type ResourceAuditPage = PaginatedData<ResourceAuditItemVO>;

export interface ResourceAuditQuery {
  page?: number;
  pageSize?: number;
  resourceType?: ResourceType;
  status?: ResourceStatus;
  keyword?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ResourceRejectRequest {
  reason: string;
}
