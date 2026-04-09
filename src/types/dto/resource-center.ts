import type { PaginatedData } from '../api';
import type { ResourceType } from './catalog';

/**
 * 与后端 {@code t_resource.access_policy}  wire 值一致（历史兼容；网关 invoke 不以该枚举拦截，见后端 ResourceAccessPolicy）。
 */
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
  /** 历史：后端 access_policy；新建统一 open_platform，invoke 不据本字段做 Grant 拦截 */
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

export interface ResourceSkillUpsertRequest extends ResourceBaseUpsertRequest {
  resourceType: 'skill';
  /** 市场详情「技能介绍」Tab，Markdown，选填 */
  serviceDetailMd?: string;
  /** 平台仅支持 hosted */
  executionMode?: 'hosted';
  hostedSystemPrompt?: string;
  hostedUserTemplate?: string;
  hostedDefaultModel?: string;
  hostedOutputSchema?: Record<string, unknown>;
  hostedTemperature?: number;
  /** 固定 hosted_v1 */
  skillType?: string;
  spec?: Record<string, unknown>;
  parametersSchema?: Record<string, unknown>;
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
  /** 历史：t_resource.access_policy 回显 */
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
  manifest?: Record<string, unknown>;
  entryDoc?: string;
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
  /** 历史：审核快照中的 access_policy 回显 */
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
  /** 传 `all` 时不按状态过滤（与后端 `/audit/resources` 约定一致） */
  status?: ResourceStatus | 'all';
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
