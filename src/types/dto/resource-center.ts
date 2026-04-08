import type { PaginatedData } from '../api';
import type { ResourceType } from './catalog';

/** 与后端 {@code t_resource.access_policy} / {@code ResourceUpsertRequest.accessPolicy} 一致 */
export type ResourceAccessPolicy = 'grant_required' | 'open_org' | 'open_platform';

export type ResourceStatus =
  | 'draft'
  | 'pending_review'
  | 'testing'
  | 'published'
  | 'rejected'
  | 'deprecated'
  /** 审核队列表：已发布资源变更已合并至线上 */
  | 'merged_live';

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
  /** 目录标签 id（t_tag → t_resource_tag_rel；可多选时传数组） */
  tagIds?: number[];
  /** 后端 access_policy 字段（选填；创建默认由后端决定；产品界面不再解释该枚举） */
  accessPolicy?: ResourceAccessPolicy;
}

export interface ResourceMcpUpsertRequest extends ResourceBaseUpsertRequest {
  resourceType: 'mcp';
  endpoint: string;
  protocol: string;
  authType?: string;
  authConfig?: Record<string, unknown>;
  /** 市场详情「服务详情」Tab，Markdown，选填 */
  serviceDetailMd?: string;
  /** 前置 Hosted Skill id，顺序与 invoke 链一致；空数组清空 */
  relatedPreSkillResourceIds?: number[];
}

/** POST /resource-center/resources/mcp/connectivity-probe */
export interface McpConnectivityProbeRequest {
  endpoint: string;
  authType?: string;
  authConfig?: Record<string, unknown>;
  transport?: string;
}

export interface McpConnectivityProbeResult {
  ok: boolean;
  statusCode: number;
  latencyMs: number;
  message: string;
  bodyPreview?: string;
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
  /** 市场详情「技能介绍」Tab，Markdown，选填 */
  serviceDetailMd?: string;
  /** pack（默认）或 hosted */
  executionMode?: 'pack' | 'hosted';
  hostedSystemPrompt?: string;
  hostedUserTemplate?: string;
  hostedDefaultModel?: string;
  hostedOutputSchema?: Record<string, unknown>;
  hostedTemperature?: number;
  /** 技能包格式：anthropic_v1 / folder_v1；hosted 建议 hosted_v1 */
  skillType?: string;
  /** 草稿可空；上传 zip 后由后端写入 */
  artifactUri?: string;
  artifactSha256?: string;
  manifest?: Record<string, unknown>;
  entryDoc?: string;
  /** zip 内技能根子目录（可选），与上传 skillRoot 一致 */
  skillRootPath?: string;
  spec?: Record<string, unknown>;
  parametersSchema?: Record<string, unknown>;
  /** 目录公开性；技能包不支持网关 invoke */
  isPublic?: boolean;
}

export interface ResourceAgentUpsertRequest extends ResourceBaseUpsertRequest {
  resourceType: 'agent';
  /** 市场详情「智能体介绍」Tab，Markdown，选填 */
  serviceDetailMd?: string;
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
  /** agent_depends_mcp */
  relatedMcpResourceIds?: number[];
}

export interface ResourceAppUpsertRequest extends ResourceBaseUpsertRequest {
  resourceType: 'app';
  /** 市场详情「应用介绍」Tab，Markdown，选填 */
  serviceDetailMd?: string;
  appUrl?: string;
  embedType?: string;
  icon?: string;
  screenshots?: string[];
  isPublic?: boolean;
  relatedResourceIds?: number[];
}

export interface ResourceDatasetUpsertRequest extends ResourceBaseUpsertRequest {
  resourceType: 'dataset';
  /** 市场详情「数据集介绍」Tab，Markdown，选填 */
  serviceDetailMd?: string;
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
  /** 目录标签 id，与 catalogTagNames 同序（后端按标签名排序） */
  tagIds?: number[];
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
  /** MCP 服务详情 Markdown（t_resource_mcp_ext.service_detail_md） */
  serviceDetailMd?: string;
  appUrl?: string;
  embedType?: string;
  icon?: string;
  screenshots?: string[];
  isPublic?: boolean;
  accessPolicy?: string;
  /** agent/app 关联资源 id（与后端 ResourceManageVO 一致） */
  relatedResourceIds?: number[];
  relatedMcpResourceIds?: number[];
  relatedPreSkillResourceIds?: number[];
  executionMode?: string;
  hostedSystemPrompt?: string;
  hostedUserTemplate?: string;
  hostedDefaultModel?: string;
  hostedOutputSchema?: Record<string, unknown>;
  hostedTemperature?: number | null;
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
  /** 已发布资源：是否存在未提审的工作副本（t_resource_draft） */
  hasWorkingDraft?: boolean;
  workingDraftUpdatedAt?: string;
  /** low | medium | high */
  workingDraftAuditTier?: string;
  /** 已发布资源：是否有待审核的线上变更 */
  pendingPublishedUpdate?: boolean;
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
  accessPolicy?: string;
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
  reason?: string;
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
  /** 与 t_skill_external_catalog_item.dedupe_key 一致；详情路由优先使用 */
  itemKey?: string | null;
  favoriteCount?: number | null;
  downloadCount?: number | null;
  viewCount?: number | null;
  reviewCount?: number | null;
  ratingAvg?: number | null;
  favoritedByMe?: boolean | null;
}

/** GET /resource-center/skill-external-catalog/item/skill-md — 服务端代拉 GitHub raw SKILL.md */
export interface SkillExternalSkillMdResponse {
  markdown?: string | null;
  resolvedRawUrl?: string | null;
  hint?: string | null;
  truncated?: boolean | null;
  fromCache?: boolean | null;
}

/** 外部市场评论（t_skill_external_review） */
export interface SkillExternalReviewVO {
  id: number;
  itemKey?: string;
  userId?: number;
  userName?: string | null;
  avatar?: string | null;
  rating?: number | null;
  comment?: string | null;
  createTime?: string | null;
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
