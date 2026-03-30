import type { PaginatedData } from '../api';

export type ResourceType = 'agent' | 'skill' | 'mcp' | 'app' | 'dataset';

export interface ResourceCatalogQueryRequest {
  page?: number;
  pageSize?: number;
  resourceType?: ResourceType;
  status?: string;
  keyword?: string;
  sortBy?: 'callCount' | 'rating' | 'publishedAt' | 'name';
  sortOrder?: 'asc' | 'desc';
  categoryId?: string;
  tags?: string[];
}

export interface ResourceCatalogItemVO {
  resourceType: ResourceType;
  resourceId: string;
  resourceCode: string;
  displayName: string;
  description?: string;
  status: string;
  sourceType?: string;
  updateTime?: string;
  tags?: string[];
  categoryName?: string;
}

export type ResourceCatalogPage = PaginatedData<ResourceCatalogItemVO>;

export interface ResourceResolveRequest {
  resourceType: ResourceType;
  resourceId: string;
  version?: string;
}

export interface ResourceResolveVO {
  resourceType: ResourceType;
  resourceId: string;
  version?: string;
  resourceCode?: string;
  displayName?: string;
  status?: string;
  invokeType?: string;
  endpoint?: string;
  launchToken?: string;
  launchUrl?: string;
  spec?: Record<string, unknown>;
}

export interface InvokeRequest {
  resourceType: ResourceType;
  resourceId: string;
  version?: string;
  timeoutSec?: number;
  payload?: Record<string, unknown>;
}

export interface InvokeResponse {
  requestId: string;
  traceId: string;
  resourceType: ResourceType;
  resourceId: string;
  statusCode: number;
  status: string;
  latencyMs: number;
  body: string;
}

export interface ResourceGrantCreateRequest {
  resourceType: ResourceType;
  resourceId: string;
  granteeApiKeyId: string;
  actions: Array<'catalog' | 'resolve' | 'invoke' | '*'>;
  expiresAt?: string;
}

export interface ResourceGrantVO {
  id: string | number;
  resourceType: ResourceType;
  resourceId: string;
  granteeApiKeyId?: string;
  granteeApiKeyPrefix?: string;
  grantedBy?: string | number;
  grantedByName?: string;
  actions?: Array<'catalog' | 'resolve' | 'invoke' | '*'>;
  createdAt?: string;
  expiresAt?: string;
}

export interface ResourceGrantListQuery {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface SandboxSessionCreateRequest {
  ttlMinutes?: number;
  maxCalls?: number;
  maxTimeoutSec?: number;
  allowedResourceTypes?: ResourceType[];
}

export interface SandboxSessionVO {
  sessionToken: string;
  apiKeyPrefix?: string;
  maxCalls?: number;
  usedCalls?: number;
  maxTimeoutSec?: number;
  allowedResourceTypes?: ResourceType[];
  expiresAt?: string;
  lastInvokeAt?: string;
  status?: string;
}
