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
  include?: string;
  /** 数据集等扩展筛选，以后端 query 支持为准 */
  sourceType?: string;
  dataType?: string;
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
  /** 与后端 ResourceCatalogItemVO.createdBy 等一致 */
  createdBy?: number | null;
  createdByName?: string;
  /** 无评论时 null */
  ratingAvg?: number | null;
  reviewCount?: number | null;
  tags?: string[];
  /** 与后端 ResourceCatalogItemVO.accessPolicy 一致 */
  accessPolicy?: string;
  categoryName?: string;
  /** 数据集目录项扩展字段（若有） */
  dataType?: string;
  format?: string;
  recordCount?: number;
  fileSize?: number;
  observability?: Record<string, unknown>;
  quality?: Record<string, unknown>;
}

export type ResourceCatalogPage = PaginatedData<ResourceCatalogItemVO>;

export interface ResourceResolveRequest {
  resourceType: ResourceType;
  resourceId: string;
  version?: string;
  include?: string;
}

export interface ResourceResolveVO {
  resourceType: ResourceType;
  resourceId: string;
  version?: string;
  resourceCode?: string;
  displayName?: string;
  status?: string;
  createdBy?: number | null;
  createdByName?: string;
  invokeType?: string;
  endpoint?: string;
  launchToken?: string;
  launchUrl?: string;
  tags?: string[];
  observability?: Record<string, unknown>;
  quality?: Record<string, unknown>;
  spec?: Record<string, unknown>;
  /** MCP 扩展：服务详情 Markdown */
  serviceDetailMd?: string;
}

/** GET /catalog/resources/{type}/{id} 返回体：目录项字段 + 解析/规格字段（与后端 ResourceResolveVO 等对齐） */
export type CatalogResourceDetailVO = ResourceCatalogItemVO & Partial<ResourceResolveVO>;

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
