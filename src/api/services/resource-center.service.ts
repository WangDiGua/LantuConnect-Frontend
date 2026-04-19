import { http } from '../../lib/http';
import { tryBatchPost } from '../../utils/batchApi';
import { runWithConcurrency } from '../../utils/runWithConcurrency';
import { normalizeAccessPolicy } from '../../utils/accessPolicy';
import type { ResourceType } from '../../types/dto/catalog';
import type {
  AgentKeyMetaVO,
  AgentKeyRotateVO,
  LifecycleTimelineVO,
  ObservabilitySummaryVO,
  ResourceCenterItemVO,
  ResourceCenterListQuery,
  ResourceCenterPage,
  McpConnectivityProbeRequest,
  McpConnectivityProbeResult,
  ResourceUpsertRequest,
  ResourceVersionCreateRequest,
  ResourceVersionVO,
} from '../../types/dto/resource-center';

function normalizeStatus(raw: unknown): ResourceCenterItemVO['status'] {
  const value = String(raw ?? '').toLowerCase();
  if (value === 'draft') return 'draft';
  if (value === 'pending_review') return 'pending_review';
  if (value === 'published') return 'published';
  if (value === 'rejected') return 'rejected';
  if (value === 'deprecated') return 'deprecated';
  if (value === 'merged_live') return 'merged_live';
  return 'draft';
}

/** 兼容对象或 JSON 字符串（部分网关/历史接口会 stringify） */
function asRecordObject(value: unknown): Record<string, unknown> | undefined {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  if (typeof value === 'string') {
    const t = value.trim();
    if (!t) return undefined;
    try {
      const p = JSON.parse(t) as unknown;
      if (p && typeof p === 'object' && !Array.isArray(p)) return p as Record<string, unknown>;
    } catch {
      return undefined;
    }
  }
  return undefined;
}

function toResourceItem(raw: unknown): ResourceCenterItemVO {
  const r = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const id = Number(r.id ?? r.resourceId ?? 0) || 0;
  const type = String(r.resourceType ?? 'agent') as ResourceCenterItemVO['resourceType'];
  const manifest = asRecordObject(r.manifest);
  return {
    id,
    resourceType: type,
    resourceId: String(r?.resourceId ?? id),
    resourceCode: String(r?.resourceCode ?? `res-${id}`),
    displayName: String(r?.displayName ?? r?.name ?? `资源-${id}`),
    description: r?.description ? String(r.description) : '',
    sourceType: r?.sourceType ? String(r.sourceType) : undefined,
    tagIds: Array.isArray(r?.tagIds)
      ? (r.tagIds as unknown[])
          .map((x) => Number(x))
          .filter((n) => Number.isFinite(n) && n > 0)
      : undefined,
    authType: r?.authType ? String(r.authType) : undefined,
    authConfig:
      r?.authConfig && typeof r.authConfig === 'object' && !Array.isArray(r.authConfig)
        ? (r.authConfig as Record<string, unknown>)
        : undefined,
    status: normalizeStatus(r?.status),
    currentVersion: r?.currentVersion ? String(r.currentVersion) : undefined,
    createTime: r?.createTime ? String(r.createTime) : undefined,
    updateTime: r?.updateTime ? String(r.updateTime) : undefined,
    submitTime: r?.submitTime ? String(r.submitTime) : undefined,
    ownerId:
      r?.ownerId != null && r?.ownerId !== ''
        ? String(r.ownerId)
        : r?.createdBy != null && r?.createdBy !== ''
          ? String(r.createdBy)
          : undefined,
    ownerName: r?.ownerName ? String(r.ownerName) : r?.createdByName ? String(r.createdByName) : undefined,
    endpoint: r?.endpoint ? String(r.endpoint) : undefined,
    protocol: r?.protocol ? String(r.protocol) : undefined,
    serviceDetailMd:
      r?.serviceDetailMd != null && String(r.serviceDetailMd).trim() !== ''
        ? String(r.serviceDetailMd)
        : r?.service_detail_md != null && String(r.service_detail_md).trim() !== ''
          ? String(r.service_detail_md)
          : undefined,
    appUrl: r?.appUrl ? String(r.appUrl) : undefined,
    embedType: r?.embedType ? String(r.embedType) : undefined,
    icon: r?.icon != null && r?.icon !== '' ? String(r.icon) : undefined,
    screenshots: Array.isArray(r?.screenshots) ? r.screenshots.map((s: unknown) => String(s)) : undefined,
    agentExposure:
      r?.agentExposure != null && String(r.agentExposure).trim() !== ''
        ? String(r.agentExposure).trim()
        : r?.agent_exposure != null && String(r.agent_exposure).trim() !== ''
          ? String(r.agent_exposure).trim()
          : undefined,
    agentDeliveryMode:
      r?.agentDeliveryMode != null && String(r.agentDeliveryMode).trim() !== ''
        ? String(r.agentDeliveryMode).trim().toLowerCase()
        : r?.agent_delivery_mode != null && String(r.agent_delivery_mode).trim() !== ''
          ? String(r.agent_delivery_mode).trim().toLowerCase()
          : undefined,
    isPublic:
      typeof r?.isPublic === 'boolean'
        ? r.isPublic
        : r?.isPublic === 1 || r?.isPublic === '1'
          ? true
          : r?.isPublic === 0 || r?.isPublic === '0'
            ? false
            : undefined,
    accessPolicy: normalizeAccessPolicy(r?.accessPolicy ?? r?.access_policy),
    hidden:
      typeof r?.hidden === 'boolean'
        ? r.hidden
        : r?.hidden === 1 || r?.hidden === '1'
          ? true
          : r?.hidden === 0 || r?.hidden === '0'
            ? false
            : undefined,
    agentType:
      r?.agentType != null && r?.agentType !== ''
        ? String(r.agentType)
        : r?.agent_type != null && r?.agent_type !== ''
          ? String(r.agent_type)
          : undefined,
    spec: asRecordObject(r?.spec ?? r?.spec_json),
    systemPrompt:
      r?.systemPrompt != null && String(r.systemPrompt).trim() !== ''
        ? String(r.systemPrompt)
        : r?.system_prompt != null && String(r.system_prompt).trim() !== ''
          ? String(r.system_prompt)
          : undefined,
    registrationProtocol:
      r?.registrationProtocol != null && String(r.registrationProtocol).trim() !== ''
        ? String(r.registrationProtocol)
        : r?.registration_protocol != null && String(r.registration_protocol).trim() !== ''
          ? String(r.registration_protocol)
          : undefined,
    upstreamEndpoint:
      r?.upstreamEndpoint != null && String(r.upstreamEndpoint).trim() !== ''
        ? String(r.upstreamEndpoint)
        : r?.upstream_endpoint != null && String(r.upstream_endpoint).trim() !== ''
          ? String(r.upstream_endpoint)
          : undefined,
    upstreamAgentId:
      r?.upstreamAgentId != null && String(r.upstreamAgentId).trim() !== ''
        ? String(r.upstreamAgentId)
        : r?.upstream_agent_id != null && String(r.upstream_agent_id).trim() !== ''
          ? String(r.upstream_agent_id)
          : undefined,
    credentialRef:
      r?.credentialRef != null && String(r.credentialRef).trim() !== ''
        ? String(r.credentialRef)
        : r?.credential_ref != null && String(r.credential_ref).trim() !== ''
          ? String(r.credential_ref)
          : undefined,
    transformProfile:
      r?.transformProfile != null && String(r.transformProfile).trim() !== ''
        ? String(r.transformProfile)
        : r?.transform_profile != null && String(r.transform_profile).trim() !== ''
          ? String(r.transform_profile)
          : undefined,
    modelAlias:
      r?.modelAlias != null && String(r.modelAlias).trim() !== ''
        ? String(r.modelAlias)
        : r?.model_alias != null && String(r.model_alias).trim() !== ''
          ? String(r.model_alias)
          : undefined,
    enabled:
      typeof r?.enabled === 'boolean'
        ? r.enabled
        : r?.enabled === 1 || r?.enabled === '1'
          ? true
          : r?.enabled === 0 || r?.enabled === '0'
            ? false
            : undefined,
    maxSteps:
      r?.maxSteps != null && Number.isFinite(Number(r.maxSteps))
        ? Number(r.maxSteps)
        : r?.max_steps != null && Number.isFinite(Number(r.max_steps))
          ? Number(r.max_steps)
          : undefined,
    temperature:
      r?.temperature != null && Number.isFinite(Number(r.temperature))
        ? Number(r.temperature)
        : undefined,
    relatedResourceIds: (() => {
      const refIds = r?.relatedResourceIds ?? r?.related_resource_ids;
      if (!Array.isArray(refIds)) return undefined;
      return refIds
        .map((n: unknown) => Number(n))
        .filter((n: number) => Number.isFinite(n) && n > 0);
    })(),
    relatedMcpResourceIds: (() => {
      const refIds = r?.relatedMcpResourceIds ?? r?.related_mcp_resource_ids;
      if (!Array.isArray(refIds)) return undefined;
      return refIds
        .map((n: unknown) => Number(n))
        .filter((n: number) => Number.isFinite(n) && n > 0);
    })(),
    executionMode:
      r?.executionMode != null && String(r.executionMode).trim() !== ''
        ? String(r.executionMode).trim().toLowerCase()
        : r?.execution_mode != null && String(r.execution_mode).trim() !== ''
          ? String(r.execution_mode).trim().toLowerCase()
          : undefined,
    contextPrompt:
      r?.contextPrompt != null && String(r.contextPrompt).trim() !== ''
        ? String(r.contextPrompt)
        : r?.context_prompt != null && String(r.context_prompt).trim() !== ''
          ? String(r.context_prompt)
          : undefined,
    dataType: r?.dataType ? String(r.dataType) : undefined,
    format: r?.format ? String(r.format) : undefined,
    recordCount: Number(r?.recordCount ?? 0) || 0,
    fileSize: Number(r?.fileSize ?? 0) || 0,
    tags: Array.isArray(r?.tags) ? r.tags.map((tag: unknown) => String(tag)) : [],
    catalogTagNames: Array.isArray(r?.catalogTagNames)
      ? r.catalogTagNames.map((t: unknown) => String(t))
      : undefined,
    skillType:
      r?.skillType != null && r?.skillType !== ''
        ? String(r.skillType)
        : r?.skill_type != null && r?.skill_type !== ''
          ? String(r.skill_type)
          : undefined,
    manifest,
    entryDoc: r?.entryDoc != null && r?.entryDoc !== '' ? String(r.entryDoc) : undefined,
    mode: r?.mode != null && r?.mode !== '' ? String(r.mode) : undefined,
    maxConcurrency:
      r?.maxConcurrency != null && Number.isFinite(Number(r.maxConcurrency))
        ? Number(r.maxConcurrency)
        : undefined,
    parentResourceId:
      r?.parentResourceId != null && Number.isFinite(Number(r.parentResourceId))
        ? Number(r.parentResourceId)
        : r?.parent_resource_id != null && Number.isFinite(Number(r.parent_resource_id))
          ? Number(r.parent_resource_id)
          : undefined,
    displayTemplate:
      r?.displayTemplate != null && r?.displayTemplate !== ''
        ? String(r.displayTemplate)
        : r?.display_template != null && r?.display_template !== ''
          ? String(r.display_template)
          : undefined,
    parametersSchema: asRecordObject(r?.parametersSchema ?? r?.parameters_schema),
    pendingAuditItemId:
      r?.pendingAuditItemId != null && Number.isFinite(Number(r.pendingAuditItemId))
        ? Number(r.pendingAuditItemId)
        : undefined,
    lastAuditStatus: r?.lastAuditStatus != null ? String(r.lastAuditStatus) : undefined,
    lastRejectReason: r?.lastRejectReason != null ? String(r.lastRejectReason) : undefined,
    lastReviewerId:
      r?.lastReviewerId != null && Number.isFinite(Number(r.lastReviewerId))
        ? Number(r.lastReviewerId)
        : undefined,
    lastSubmitTime: r?.lastSubmitTime != null ? String(r.lastSubmitTime) : undefined,
    lastReviewTime: r?.lastReviewTime != null ? String(r.lastReviewTime) : undefined,
    allowedActions: Array.isArray(r?.allowedActions) ? r.allowedActions.map((a: unknown) => String(a)) : undefined,
    statusHint: r?.statusHint != null ? String(r.statusHint) : undefined,
    hasWorkingDraft: r?.hasWorkingDraft === true,
    workingDraftUpdatedAt:
      r?.workingDraftUpdatedAt != null ? String(r.workingDraftUpdatedAt) : undefined,
    workingDraftAuditTier:
      r?.workingDraftAuditTier != null ? String(r.workingDraftAuditTier) : undefined,
    pendingPublishedUpdate: r?.pendingPublishedUpdate === true,
    healthStatus: r?.healthStatus != null ? String(r.healthStatus) : undefined,
    circuitState: r?.circuitState != null ? String(r.circuitState) : undefined,
    degradationCode: r?.degradationCode != null ? String(r.degradationCode) : undefined,
    degradationHint: r?.degradationHint != null ? String(r.degradationHint) : undefined,
    qualityScore: r?.qualityScore != null && Number.isFinite(Number(r.qualityScore)) ? Number(r.qualityScore) : undefined,
    qualityFactors: asRecordObject(r?.qualityFactors),
    observability: asRecordObject(r?.observability ?? r?.observability_summary),
    quality: asRecordObject(r?.quality ?? r?.quality_summary),
    callabilityState:
      r?.callabilityState != null && String(r.callabilityState).trim() !== ''
        ? String(r.callabilityState)
        : r?.callability_state != null && String(r.callability_state).trim() !== ''
          ? String(r.callability_state)
          : undefined,
    callabilityReason:
      r?.callabilityReason != null && String(r.callabilityReason).trim() !== ''
        ? String(r.callabilityReason)
        : r?.callability_reason != null && String(r.callability_reason).trim() !== ''
          ? String(r.callability_reason)
          : undefined,
    callable:
      typeof r?.callable === 'boolean'
        ? r.callable
        : r?.callable === 1 || r?.callable === '1'
          ? true
          : r?.callable === 0 || r?.callable === '0'
            ? false
            : undefined,
    resourceEnabled:
      typeof r?.resourceEnabled === 'boolean'
        ? r.resourceEnabled
        : r?.resourceEnabled === 1 || r?.resourceEnabled === '1'
          ? true
          : r?.resourceEnabled === 0 || r?.resourceEnabled === '0'
            ? false
            : undefined,
    probeStrategy:
      r?.probeStrategy != null && String(r.probeStrategy).trim() !== ''
        ? String(r.probeStrategy)
        : r?.probe_strategy != null && String(r.probe_strategy).trim() !== ''
          ? String(r.probe_strategy)
          : undefined,
    lastProbeAt:
      r?.lastProbeAt != null && String(r.lastProbeAt).trim() !== ''
        ? String(r.lastProbeAt)
        : r?.last_probe_at != null && String(r.last_probe_at).trim() !== ''
          ? String(r.last_probe_at)
          : undefined,
    lastSuccessAt:
      r?.lastSuccessAt != null && String(r.lastSuccessAt).trim() !== ''
        ? String(r.lastSuccessAt)
        : r?.last_success_at != null && String(r.last_success_at).trim() !== ''
          ? String(r.last_success_at)
          : undefined,
    lastFailureAt:
      r?.lastFailureAt != null && String(r.lastFailureAt).trim() !== ''
        ? String(r.lastFailureAt)
        : r?.last_failure_at != null && String(r.last_failure_at).trim() !== ''
          ? String(r.last_failure_at)
          : undefined,
    lastFailureReason:
      r?.lastFailureReason != null && String(r.lastFailureReason).trim() !== ''
        ? String(r.lastFailureReason)
        : r?.last_failure_reason != null && String(r.last_failure_reason).trim() !== ''
          ? String(r.last_failure_reason)
          : undefined,
    consecutiveSuccess:
      r?.consecutiveSuccess != null && Number.isFinite(Number(r.consecutiveSuccess))
        ? Number(r.consecutiveSuccess)
        : r?.consecutive_success != null && Number.isFinite(Number(r.consecutive_success))
          ? Number(r.consecutive_success)
          : undefined,
    consecutiveFailure:
      r?.consecutiveFailure != null && Number.isFinite(Number(r.consecutiveFailure))
        ? Number(r.consecutiveFailure)
        : r?.consecutive_failure != null && Number.isFinite(Number(r.consecutive_failure))
          ? Number(r.consecutive_failure)
          : undefined,
    probeLatencyMs:
      r?.probeLatencyMs != null && Number.isFinite(Number(r.probeLatencyMs))
        ? Number(r.probeLatencyMs)
        : r?.probe_latency_ms != null && Number.isFinite(Number(r.probe_latency_ms))
          ? Number(r.probe_latency_ms)
          : undefined,
    probePayloadSummary:
      r?.probePayloadSummary != null && String(r.probePayloadSummary).trim() !== ''
        ? String(r.probePayloadSummary)
        : r?.probe_payload_summary != null && String(r.probe_payload_summary).trim() !== ''
          ? String(r.probe_payload_summary)
          : undefined,
  };
}

function normalizePage(raw: unknown): ResourceCenterPage {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const page = raw as Record<string, unknown>;
    const list = page.list;
    if (Array.isArray(list)) {
      return {
        list: list.map((row) => toResourceItem(row)),
        total: Number(page.total ?? list.length ?? 0) || 0,
        page: Number(page.page ?? 1) || 1,
        pageSize: Number(page.pageSize ?? list.length ?? 20) || 20,
      };
    }
  }
  if (Array.isArray(raw)) {
    return {
      list: raw.map((row) => toResourceItem(row)),
      total: raw.length,
      page: 1,
      pageSize: raw.length || 20,
    };
  }
  return { list: [], total: 0, page: 1, pageSize: 20 };
}

/** 分页拉平「我的」资源列表（同一 filter 下 total 可能大于单页） */
async function fetchMineAllPages(
  base: Omit<ResourceCenterListQuery, 'page'> & { pageSize?: number },
): Promise<ResourceCenterItemVO[]> {
  const pageSize = Math.min(500, Math.max(1, base.pageSize ?? 200));
  let page = 1;
  const acc: ResourceCenterItemVO[] = [];
  let total = Number.POSITIVE_INFINITY;
  while (acc.length < total) {
    const raw = await http.get<unknown>('/resource-center/resources/mine', {
      params: { ...base, page, pageSize },
    });
    const norm = normalizePage(raw);
    acc.push(...norm.list);
    total = norm.total;
    if (norm.list.length < pageSize) break;
    page += 1;
    if (page > 100) break;
  }
  return acc;
}

function toVersionItem(row: unknown): ResourceVersionVO {
  const r = row && typeof row === 'object' && !Array.isArray(row) ? (row as Record<string, unknown>) : {};
  const currentFlag = r.isCurrent ?? r.current;
  return {
    id: Number(r.id ?? 0) || 0,
    resourceId: Number(r.resourceId ?? 0) || 0,
    version: String(r.version ?? ''),
    isCurrent: currentFlag === true || currentFlag === 1 || currentFlag === '1',
    status: r.status != null ? String(r.status) : undefined,
    createTime: r.createTime != null ? String(r.createTime) : undefined,
    updateTime: r.updateTime != null ? String(r.updateTime) : undefined,
  };
}

export const resourceCenterService = {
  listMine: async (query?: ResourceCenterListQuery): Promise<ResourceCenterPage> => {
    const raw = await http.get<unknown>('/resource-center/resources/mine', { params: query });
    return normalizePage(raw);
  },

  listMineAllPages: fetchMineAllPages,

  /** 已发布 ∪ 测试中（去重），用于绑定类字段仅选与当前登记资源同一创建者的资源 */
  listMinePublished: async (
    resourceType: ResourceType,
    forResourceId?: number,
  ): Promise<ResourceCenterItemVO[]> => {
    const scope =
      forResourceId != null && forResourceId > 0 ? { forResourceId } : {};
    return fetchMineAllPages({ resourceType, status: 'published', pageSize: 200, ...scope });
  },

  getById: async (id: number): Promise<ResourceCenterItemVO> => {
    const raw = await http.get<unknown>(`/resource-center/resources/${id}`);
    return toResourceItem(raw);
  },

  /** 登记前探测 MCP 可达性（initialize）；不创建资源 */
  probeMcpConnectivity: async (body: McpConnectivityProbeRequest): Promise<McpConnectivityProbeResult> =>
    http.post<McpConnectivityProbeResult>('/resource-center/resources/mcp/connectivity-probe', body),

  create: async (payload: ResourceUpsertRequest): Promise<ResourceCenterItemVO> => {
    const raw = await http.post<unknown>('/resource-center/resources', payload);
    return toResourceItem(raw);
  },

  update: async (id: number, payload: ResourceUpsertRequest): Promise<ResourceCenterItemVO> => {
    const raw = await http.put<unknown>(`/resource-center/resources/${id}`, payload);
    return toResourceItem(raw);
  },

  remove: (id: number): Promise<void> => http.delete<void>(`/resource-center/resources/${id}`),

  submit: async (id: number): Promise<ResourceCenterItemVO> => {
    const raw = await http.post<unknown>(`/resource-center/resources/${id}/submit`);
    return toResourceItem(raw);
  },

  deprecate: async (id: number): Promise<ResourceCenterItemVO> => {
    const raw = await http.post<unknown>(`/resource-center/resources/${id}/deprecate`);
    return toResourceItem(raw);
  },

  withdraw: async (id: number): Promise<ResourceCenterItemVO> => {
    const raw = await http.post<unknown>(`/resource-center/resources/${id}/withdraw`);
    return toResourceItem(raw);
  },

  batchWithdraw: async (ids: number[]): Promise<void> => {
    if (!ids.length) return;
    await tryBatchPost(
      '/resource-center/resources/batch-withdraw',
      { ids },
      async () => {
        const r = await runWithConcurrency(ids, 4, async (id) => {
          await http.post<unknown>(`/resource-center/resources/${id}/withdraw`);
        });
        if (r.errors.length) throw r.errors[0]!.error;
      },
    );
  },

  createVersion: async (id: number, payload: ResourceVersionCreateRequest): Promise<ResourceVersionVO> => {
    const raw = await http.post<unknown>(`/resource-center/resources/${id}/versions`, payload);
    return toVersionItem(raw);
  },

  switchVersion: async (id: number, version: string): Promise<ResourceCenterItemVO> => {
    const raw = await http.post<unknown>(
      `/resource-center/resources/${id}/versions/${encodeURIComponent(version)}/switch`,
    );
    return toResourceItem(raw);
  },

  /** 将指定 active 版本快照合并写回主资源（与 PUT 更新同约束：published/pending_review 不可） */
  applyVersionToWorkingCopy: async (id: number, version: string): Promise<ResourceCenterItemVO> => {
    const raw = await http.post<unknown>(
      `/resource-center/resources/${id}/versions/${encodeURIComponent(version)}/apply-to-working-copy`,
    );
    return toResourceItem(raw);
  },

  getLifecycleTimeline: (id: number): Promise<LifecycleTimelineVO> =>
    http.get<LifecycleTimelineVO>(`/resource-center/resources/${id}/lifecycle-timeline`),

  getObservabilitySummary: (resourceType: string, id: number): Promise<ObservabilitySummaryVO> =>
    http.get<ObservabilitySummaryVO>(`/resource-center/resources/${resourceType}/${id}/observability-summary`),

  rotateAgentKey: async (id: number): Promise<AgentKeyRotateVO> => {
    const raw = await http.post<unknown>(`/resource-center/resources/${id}/agent-key/rotate`);
    const o = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
    const secretPlain = String(o.secretPlain ?? '');
    return {
      id: Number(o.id ?? 0) || 0,
      name: o.name != null ? String(o.name) : undefined,
      scopes: Array.isArray(o.scopes) ? (o.scopes as unknown[]).map((x) => String(x)) : [],
      secretPlain,
      revoked: o.revoked === true || o.revoked === 1 || o.revoked === '1',
    };
  },

  revokeAgentKey: async (id: number): Promise<void> =>
    http.post<void>(`/resource-center/resources/${id}/agent-key/revoke`),

  listAgentKeys: async (id: number): Promise<AgentKeyMetaVO[]> => {
    const raw = await http.get<unknown>(`/resource-center/resources/${id}/agent-key/meta`);
    const list = Array.isArray(raw) ? raw : [];
    return list.map((it) => {
      const o = it && typeof it === 'object' && !Array.isArray(it) ? (it as Record<string, unknown>) : {};
      return {
        id: Number(o.id ?? 0) || 0,
        maskedKey: String(o.maskedKey ?? ''),
        status: String(o.status ?? ''),
        scopes: Array.isArray(o.scopes) ? (o.scopes as unknown[]).map((x) => String(x)) : [],
        createTime: o.createTime != null ? String(o.createTime) : undefined,
        lastUsedAt: o.lastUsedAt != null ? String(o.lastUsedAt) : undefined,
      };
    });
  },

  listVersions: async (id: number): Promise<ResourceVersionVO[]> => {
    const raw = await http.get<unknown>(`/resource-center/resources/${id}/versions`);
    if (Array.isArray(raw)) return raw.map(toVersionItem);
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      const o = raw as Record<string, unknown>;
      const list = o.list;
      if (Array.isArray(list)) return list.map((v) => toVersionItem(v));
    }
    return [];
  },

};
