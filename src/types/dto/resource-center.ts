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

export type SkillPackValidationStatus = 'none' | 'pending' | 'valid' | 'invalid';

/** 技能包分片上传进度（大文件断点续传） */
export type SkillPackChunkUploadProgress = {
  phase: 'init' | 'chunk' | 'complete';
  loaded: number;
  total: number;
  chunkIndex?: number;
  totalChunks?: number;
};

export interface ResourceSkillUpsertRequest extends ResourceBaseUpsertRequest {
  resourceType: 'skill';
  /** 技能包格式：anthropic_v1 / folder_v1（远程 HTTP 工具请注册 resourceType=mcp） */
  skillType?: string;
  mode?: string;
  /** 草稿可空；上传 zip 后由后端写入 */
  artifactUri?: string;
  artifactSha256?: string;
  manifest?: Record<string, unknown>;
  entryDoc?: string;
  /** zip 内技能根子目录（可选），与上传 skillRoot 一致 */
  skillRootPath?: string;
  spec?: Record<string, unknown>;
  parametersSchema?: Record<string, unknown>;
  /** 挂载的父资源（如 MCP Server） */
  parentResourceId?: number;
  displayTemplate?: string;
  isPublic?: boolean;
  maxConcurrency?: number;
}

export interface ResourceAgentUpsertRequest extends ResourceBaseUpsertRequest {
  resourceType: 'agent';
  agentType?: string;
  mode?: string;
  spec?: Record<string, unknown>;
  maxConcurrency?: number;
  systemPrompt?: string;
  isPublic?: boolean;
  hidden?: boolean;
  maxSteps?: number;
  temperature?: number;
  relatedResourceIds?: number[];
}

export interface ResourceAppUpsertRequest extends ResourceBaseUpsertRequest {
  resourceType: 'app';
  appUrl?: string;
  embedType?: string;
  icon?: string;
  screenshots?: string[];
  isPublic?: boolean;
  relatedResourceIds?: number[];
}

export interface ResourceDatasetUpsertRequest extends ResourceBaseUpsertRequest {
  resourceType: 'dataset';
  dataType?: string;
  format?: string;
  recordCount?: number;
  fileSize?: number;
  tags?: string[];
  isPublic?: boolean;
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
  icon?: string;
  screenshots?: string[];
  isPublic?: boolean;
  /** agent/app 关联资源 id（与后端 ResourceManageVO 一致） */
  relatedResourceIds?: number[];
  dataType?: string;
  format?: string;
  recordCount?: number;
  fileSize?: number;
  /** 数据集扩展表 JSON 自由标签 */
  tags?: string[];
  /** 目录侧标签名（t_resource_tag_rel），与市场/GET catalog 的 tags 一致 */
  catalogTagNames?: string[];
  /** --- agent（ResourceManageVO）--- */
  agentType?: string;
  spec?: Record<string, unknown>;
  systemPrompt?: string;
  hidden?: boolean;
  maxSteps?: number;
  temperature?: number;
  /** --- skill（ResourceManageVO）--- */
  skillType?: string;
  artifactUri?: string;
  artifactSha256?: string;
  manifest?: Record<string, unknown>;
  entryDoc?: string;
  packValidationStatus?: SkillPackValidationStatus | string;
  packValidatedAt?: string;
  packValidationMessage?: string;
  skillRootPath?: string;
  mode?: string;
  maxConcurrency?: number;
  parentResourceId?: number;
  displayTemplate?: string;
  parametersSchema?: Record<string, unknown>;
  pendingAuditItemId?: number;
  lastAuditStatus?: string;
  lastRejectReason?: string;
  lastReviewerId?: number;
  lastSubmitTime?: string;
  lastReviewTime?: string;
  allowedActions?: string[];
  statusHint?: string;
  healthStatus?: string;
  circuitState?: string;
  degradationCode?: string;
  degradationHint?: string;
  qualityScore?: number;
  qualityFactors?: Record<string, unknown>;
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

export interface LifecycleTimelineEventVO {
  eventType: string;
  title: string;
  status?: string;
  actor?: string;
  reason?: string;
  eventTime?: string;
}

export interface LifecycleTimelineVO {
  resourceId: number;
  resourceType: ResourceType;
  resourceCode: string;
  displayName: string;
  currentStatus: string;
  events: LifecycleTimelineEventVO[];
}

export interface DegradationHintVO {
  degradationCode: string;
  userFacingHint: string;
  opsHint: string;
}

export interface ObservabilitySummaryVO {
  resourceId: number;
  resourceType: ResourceType;
  resourceCode: string;
  displayName: string;
  healthStatus: string;
  circuitState: string;
  qualityScore: number;
  qualityFactors?: Record<string, unknown>;
  degradationHint?: DegradationHintVO;
  generatedAt?: string;
}

/** 管理员「技能在线市场」配置表一行（与后端 SkillExternalCatalogItemVO 一致） */
export interface SkillExternalCatalogItemVO {
  id: string;
  name: string;
  summary?: string | null;
  packUrl: string;
  licenseNote?: string | null;
  sourceUrl?: string | null;
  /** SkillsMP 星标等 */
  stars?: number | null;
}

/** 与后端 PageResult 一致（list / total / page / pageSize） */
export interface SkillExternalCatalogPage {
  list: SkillExternalCatalogItemVO[];
  total: number;
  page: number;
  pageSize: number;
}

/** 与后端 SkillExternalCatalogProperties 一致（camelCase JSON） */
export interface SkillExternalCatalogOutboundHttpProxy {
  host?: string;
  port?: number;
}

export interface SkillExternalCatalogGithubZipMirror {
  mode?: string;
  prefix?: string;
}

export interface SkillExternalCatalogEntry {
  id?: string;
  name?: string;
  summary?: string;
  packUrl?: string;
  licenseNote?: string;
  sourceUrl?: string;
}

/** 与后端 SkillHub 一致（公开 /api/v1/search；默认 agentskillhub.dev，非 skillhub.tencent.com 官网页） */
export interface SkillExternalCatalogSkillHubConfig {
  enabled?: boolean;
  baseUrl?: string;
  /** 主站失败时备用根，如 https://agentskillhub.dev */
  fallbackBaseUrl?: string;
  limitPerQuery?: number;
  maxQueriesPerRequest?: number;
  githubDefaultBranch?: string;
  discoveryQueries?: string[];
}

export interface SkillExternalCatalogSkillsMpConfig {
  enabled?: boolean;
  baseUrl?: string;
  /** 提交时空字符串表示保留服务端原 Key */
  apiKey?: string;
  sortBy?: string;
  limitPerQuery?: number;
  maxQueriesPerRequest?: number;
  githubDefaultBranch?: string;
  discoveryQueries?: string[];
}

/** 与后端 CatalogHttpSource 一致 */
export interface SkillExternalCatalogHttpSource {
  url?: string;
  /** AUTO（默认）| SKILL0（与 AUTO 等价，便于标注 skill0 类接口） */
  format?: string;
}

export interface SkillExternalCatalogProperties {
  provider?: string;
  /** MERGED | SKILLHUB_ONLY | SKILLSMP_ONLY | MIRROR_ONLY */
  remoteCatalogMode?: string;
  cacheTtlSeconds?: number;
  persistenceEnabled?: boolean;
  mirrorCatalogUrl?: string;
  /** 多个 JSON 目录 URL，与 mirrorCatalogUrl、catalogHttpSources 合并去重 */
  mirrorCatalogUrls?: string[];
  catalogHttpSources?: SkillExternalCatalogHttpSource[];
  outboundHttpProxy?: SkillExternalCatalogOutboundHttpProxy;
  githubZipMirror?: SkillExternalCatalogGithubZipMirror;
  entries?: SkillExternalCatalogEntry[];
  /** 默认开启：SkillHub 公开搜索（无需 Key；见 skillhub.baseUrl） */
  skillhub?: SkillExternalCatalogSkillHubConfig;
  skillsmp?: SkillExternalCatalogSkillsMpConfig;
}

/** GET /resource-center/skill-external-catalog/settings */
export interface SkillExternalCatalogSettingsResponse {
  config: SkillExternalCatalogProperties;
  skillsmpApiKeyConfigured: boolean;
}
