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
  /** 为 true 时后端仅返回当前网关可 invoke 的资源（健康/熔断与 POST /invoke 一致） */
  callableOnly?: boolean;
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
  /** 历史：`t_resource.access_policy` 回显；非 invoke 拦截开关 */
  accessPolicy?: string;
  /** t_call_log 聚合 */
  callCount?: number;
  /** 应用 usage_record invoke 次数 */
  usageCount?: number;
  /** 目录侧下载等行为事件计数（后端聚合） */
  downloadCount?: number;
  /** t_resource.view_count */
  viewCount?: number;
  categoryName?: string;
  /** 数据集目录项扩展字段（若有） */
  dataType?: string;
  format?: string;
  recordCount?: number;
  fileSize?: number;
  observability?: Record<string, unknown>;
  quality?: Record<string, unknown>;
  /** 携带有效 X-Api-Key 时后端可能为 true；历史字段名，不表示存在 per-resource Grant */
  hasGrantForKey?: boolean | null;
  /** skill：后端目录 execution_mode（context） */
  executionMode?: string;
}

export type ResourceCatalogPage = PaginatedData<ResourceCatalogItemVO>;

/** 与后端 ResourceSummaryVO 一致（绑定闭包条目） */
export interface ResourceBindingSummaryVO {
  resourceId: string;
  resourceType: string;
  resourceCode?: string;
  displayName?: string;
  status?: string;
}

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
  /** include=closure|bindings：绑定无向闭包 */
  bindingClosure?: ResourceBindingSummaryVO[];
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

/** GET /catalog/capabilities/tools — 与后端 AggregatedCapabilityToolsVO 对齐 */
export interface ToolDispatchRouteVO {
  unifiedFunctionName: string;
  resourceType: string;
  resourceId: string;
  upstreamName?: string;
  upstreamToolName?: string;
}

export interface AggregatedCapabilityToolsVO {
  entry?: Record<string, string> | null;
  openAiTools: unknown[];
  routes: ToolDispatchRouteVO[];
  warnings: string[];
  mcpQueriedCount?: number | null;
  toolFunctionCount?: number | null;
  aggregateTruncated?: boolean | null;
}

/** GET /catalog/gateway/integration-hints */
export interface GatewayIntegrationHintsVO {
  bindingExpansion: {
    enabled: boolean;
    agent: boolean;
    mergeActiveSkillMcps: boolean;
  };
  capabilities: {
    maxMcpsPerAggregate: number;
    maxToolsPerResponse: number;
  };
}
