import { http } from '../../lib/http';
import type {
  LifecycleTimelineVO,
  ObservabilitySummaryVO,
  ResourceCenterItemVO,
  ResourceCenterListQuery,
  ResourceCenterPage,
  ResourceUpsertRequest,
  ResourceVersionCreateRequest,
  ResourceVersionVO,
  SkillPackValidationStatus,
} from '../../types/dto/resource-center';

function normalizeStatus(raw: unknown): ResourceCenterItemVO['status'] {
  const value = String(raw ?? '').toLowerCase();
  if (value === 'draft') return 'draft';
  if (value === 'pending_review') return 'pending_review';
  if (value === 'testing') return 'testing';
  if (value === 'published') return 'published';
  if (value === 'rejected') return 'rejected';
  if (value === 'deprecated') return 'deprecated';
  return 'draft';
}

function normalizePackStatus(raw: unknown): SkillPackValidationStatus | string | undefined {
  const v = String(raw ?? '').trim().toLowerCase();
  if (!v) return undefined;
  if (v === 'none' || v === 'pending' || v === 'valid' || v === 'invalid') return v;
  return v;
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

function toResourceItem(raw: any): ResourceCenterItemVO {
  const id = Number(raw?.id ?? raw?.resourceId ?? 0) || 0;
  const type = String(raw?.resourceType ?? 'agent') as ResourceCenterItemVO['resourceType'];
  const manifest = asRecordObject(raw?.manifest);
  return {
    id,
    resourceType: type,
    resourceId: String(raw?.resourceId ?? id),
    resourceCode: String(raw?.resourceCode ?? `res-${id}`),
    displayName: String(raw?.displayName ?? raw?.name ?? `资源-${id}`),
    description: raw?.description ? String(raw.description) : '',
    sourceType: raw?.sourceType ? String(raw.sourceType) : undefined,
    providerId: raw?.providerId != null && raw?.providerId !== '' ? String(raw.providerId) : undefined,
    categoryId: raw?.categoryId != null && raw?.categoryId !== '' ? String(raw.categoryId) : undefined,
    authType: raw?.authType ? String(raw.authType) : undefined,
    authConfig:
      raw?.authConfig && typeof raw.authConfig === 'object' && !Array.isArray(raw.authConfig)
        ? (raw.authConfig as Record<string, unknown>)
        : undefined,
    status: normalizeStatus(raw?.status),
    currentVersion: raw?.currentVersion ? String(raw.currentVersion) : undefined,
    createTime: raw?.createTime ? String(raw.createTime) : undefined,
    updateTime: raw?.updateTime ? String(raw.updateTime) : undefined,
    submitTime: raw?.submitTime ? String(raw.submitTime) : undefined,
    ownerId: raw?.ownerId ? String(raw.ownerId) : undefined,
    ownerName: raw?.ownerName ? String(raw.ownerName) : raw?.createdByName ? String(raw.createdByName) : undefined,
    endpoint: raw?.endpoint ? String(raw.endpoint) : undefined,
    protocol: raw?.protocol ? String(raw.protocol) : undefined,
    appUrl: raw?.appUrl ? String(raw.appUrl) : undefined,
    embedType: raw?.embedType ? String(raw.embedType) : undefined,
    icon: raw?.icon != null && raw?.icon !== '' ? String(raw.icon) : undefined,
    screenshots: Array.isArray(raw?.screenshots) ? raw.screenshots.map((s: unknown) => String(s)) : undefined,
    isPublic:
      typeof raw?.isPublic === 'boolean'
        ? raw.isPublic
        : raw?.isPublic === 1 || raw?.isPublic === '1'
          ? true
          : raw?.isPublic === 0 || raw?.isPublic === '0'
            ? false
            : undefined,
    hidden:
      typeof raw?.hidden === 'boolean'
        ? raw.hidden
        : raw?.hidden === 1 || raw?.hidden === '1'
          ? true
          : raw?.hidden === 0 || raw?.hidden === '0'
            ? false
            : undefined,
    agentType:
      raw?.agentType != null && raw?.agentType !== ''
        ? String(raw.agentType)
        : raw?.agent_type != null && raw?.agent_type !== ''
          ? String(raw.agent_type)
          : undefined,
    spec: asRecordObject(raw?.spec ?? raw?.spec_json),
    systemPrompt:
      raw?.systemPrompt != null && String(raw.systemPrompt).trim() !== ''
        ? String(raw.systemPrompt)
        : raw?.system_prompt != null && String(raw.system_prompt).trim() !== ''
          ? String(raw.system_prompt)
          : undefined,
    maxSteps:
      raw?.maxSteps != null && Number.isFinite(Number(raw.maxSteps))
        ? Number(raw.maxSteps)
        : raw?.max_steps != null && Number.isFinite(Number(raw.max_steps))
          ? Number(raw.max_steps)
          : undefined,
    temperature:
      raw?.temperature != null && Number.isFinite(Number(raw.temperature))
        ? Number(raw.temperature)
        : undefined,
    relatedResourceIds: Array.isArray(raw?.relatedResourceIds ?? raw?.related_resource_ids)
      ? (raw.relatedResourceIds ?? raw.related_resource_ids)
          .map((n: unknown) => Number(n))
          .filter((n: number) => Number.isFinite(n) && n > 0)
      : undefined,
    dataType: raw?.dataType ? String(raw.dataType) : undefined,
    format: raw?.format ? String(raw.format) : undefined,
    recordCount: Number(raw?.recordCount ?? 0) || 0,
    fileSize: Number(raw?.fileSize ?? 0) || 0,
    tags: Array.isArray(raw?.tags) ? raw.tags.map((tag: unknown) => String(tag)) : [],
    catalogTagNames: Array.isArray(raw?.catalogTagNames)
      ? raw.catalogTagNames.map((t: unknown) => String(t))
      : undefined,
    skillType: raw?.skillType != null && raw?.skillType !== '' ? String(raw.skillType) : undefined,
    artifactUri: raw?.artifactUri != null && raw?.artifactUri !== '' ? String(raw.artifactUri) : undefined,
    artifactSha256: raw?.artifactSha256 != null && raw?.artifactSha256 !== '' ? String(raw.artifactSha256) : undefined,
    manifest,
    entryDoc: raw?.entryDoc != null && raw?.entryDoc !== '' ? String(raw.entryDoc) : undefined,
    packValidationStatus: normalizePackStatus(raw?.packValidationStatus ?? raw?.pack_validation_status),
    packValidatedAt:
      raw?.packValidatedAt != null && raw?.packValidatedAt !== ''
        ? String(raw.packValidatedAt)
        : raw?.pack_validated_at != null && raw?.pack_validated_at !== ''
          ? String(raw.pack_validated_at)
          : undefined,
    packValidationMessage:
      raw?.packValidationMessage != null
        ? String(raw.packValidationMessage)
        : raw?.pack_validation_message != null
          ? String(raw.pack_validation_message)
          : undefined,
    mode: raw?.mode != null && raw?.mode !== '' ? String(raw.mode) : undefined,
    maxConcurrency:
      raw?.maxConcurrency != null && Number.isFinite(Number(raw.maxConcurrency))
        ? Number(raw.maxConcurrency)
        : undefined,
    parentResourceId:
      raw?.parentResourceId != null && Number.isFinite(Number(raw.parentResourceId))
        ? Number(raw.parentResourceId)
        : raw?.parent_resource_id != null && Number.isFinite(Number(raw.parent_resource_id))
          ? Number(raw.parent_resource_id)
          : undefined,
    displayTemplate:
      raw?.displayTemplate != null && raw?.displayTemplate !== ''
        ? String(raw.displayTemplate)
        : raw?.display_template != null && raw?.display_template !== ''
          ? String(raw.display_template)
          : undefined,
    parametersSchema: asRecordObject(raw?.parametersSchema ?? raw?.parameters_schema),
    pendingAuditItemId:
      raw?.pendingAuditItemId != null && Number.isFinite(Number(raw.pendingAuditItemId))
        ? Number(raw.pendingAuditItemId)
        : undefined,
    lastAuditStatus: raw?.lastAuditStatus != null ? String(raw.lastAuditStatus) : undefined,
    lastRejectReason: raw?.lastRejectReason != null ? String(raw.lastRejectReason) : undefined,
    lastReviewerId:
      raw?.lastReviewerId != null && Number.isFinite(Number(raw.lastReviewerId))
        ? Number(raw.lastReviewerId)
        : undefined,
    lastSubmitTime: raw?.lastSubmitTime != null ? String(raw.lastSubmitTime) : undefined,
    lastReviewTime: raw?.lastReviewTime != null ? String(raw.lastReviewTime) : undefined,
    allowedActions: Array.isArray(raw?.allowedActions) ? raw.allowedActions.map((a: unknown) => String(a)) : undefined,
    statusHint: raw?.statusHint != null ? String(raw.statusHint) : undefined,
    healthStatus: raw?.healthStatus != null ? String(raw.healthStatus) : undefined,
    circuitState: raw?.circuitState != null ? String(raw.circuitState) : undefined,
    degradationCode: raw?.degradationCode != null ? String(raw.degradationCode) : undefined,
    degradationHint: raw?.degradationHint != null ? String(raw.degradationHint) : undefined,
    qualityScore: raw?.qualityScore != null && Number.isFinite(Number(raw.qualityScore)) ? Number(raw.qualityScore) : undefined,
    qualityFactors: asRecordObject(raw?.qualityFactors),
  };
}

function normalizePage(raw: unknown): ResourceCenterPage {
  if (raw && typeof raw === 'object' && Array.isArray((raw as any).list)) {
    const page = raw as any;
    return {
      list: page.list.map(toResourceItem),
      total: Number(page.total ?? page.list.length ?? 0) || 0,
      page: Number(page.page ?? 1) || 1,
      pageSize: Number(page.pageSize ?? page.list.length ?? 20) || 20,
    };
  }
  if (Array.isArray(raw)) {
    return {
      list: raw.map(toResourceItem),
      total: raw.length,
      page: 1,
      pageSize: raw.length || 20,
    };
  }
  return { list: [], total: 0, page: 1, pageSize: 20 };
}

function toVersionItem(raw: any): ResourceVersionVO {
  const currentFlag = raw?.isCurrent ?? raw?.current;
  return {
    id: Number(raw?.id ?? 0) || 0,
    resourceId: Number(raw?.resourceId ?? 0) || 0,
    version: String(raw?.version ?? ''),
    isCurrent: currentFlag === true || currentFlag === 1 || currentFlag === '1',
    status: raw?.status ? String(raw.status) : undefined,
    createTime: raw?.createTime ? String(raw.createTime) : undefined,
    updateTime: raw?.updateTime ? String(raw.updateTime) : undefined,
  };
}

export const resourceCenterService = {
  listMine: async (query?: ResourceCenterListQuery): Promise<ResourceCenterPage> => {
    const raw = await http.get<unknown>('/resource-center/resources/mine', { params: query });
    return normalizePage(raw);
  },

  getById: async (id: number): Promise<ResourceCenterItemVO> => {
    const raw = await http.get<unknown>(`/resource-center/resources/${id}`);
    return toResourceItem(raw);
  },

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

  getLifecycleTimeline: (id: number): Promise<LifecycleTimelineVO> =>
    http.get<LifecycleTimelineVO>(`/resource-center/resources/${id}/lifecycle-timeline`),

  getObservabilitySummary: (resourceType: string, id: number): Promise<ObservabilitySummaryVO> =>
    http.get<ObservabilitySummaryVO>(`/resource-center/resources/${resourceType}/${id}/observability-summary`),

  listVersions: async (id: number): Promise<ResourceVersionVO[]> => {
    const raw = await http.get<unknown>(`/resource-center/resources/${id}/versions`);
    if (Array.isArray(raw)) return raw.map(toVersionItem);
    if (raw && typeof raw === 'object' && Array.isArray((raw as any).list)) {
      return (raw as any).list.map(toVersionItem);
    }
    return [];
  },

  /** Anthropic 式技能 zip：校验 SKILL.md、写制品与 pack_validation_*。新建时可不传 resourceId（后端创建草稿 skill）。 */
  uploadSkillPackage: async (file: File, resourceId?: number): Promise<ResourceCenterItemVO> => {
    const fd = new FormData();
    fd.append('file', file);
    if (resourceId != null && Number.isFinite(resourceId) && resourceId > 0) {
      fd.append('resourceId', String(resourceId));
    }
    const raw = await http.upload<unknown>('/resource-center/resources/skills/package-upload', fd);
    return toResourceItem(raw);
  },

  /** 从 HTTPS URL 拉取 zip，校验与落库与 uploadSkillPackage 一致；新建资源为 sourceType=cloud。 */
  importSkillPackageFromUrl: async (url: string, resourceId?: number): Promise<ResourceCenterItemVO> => {
    const raw = await http.post<unknown>('/resource-center/resources/skills/package-import-url', {
      url: url.trim(),
      ...(resourceId != null && Number.isFinite(resourceId) && resourceId > 0 ? { resourceId } : {}),
    });
    return toResourceItem(raw);
  },

  /** 受控下载技能 zip（尤其 isPublic=0、resolve 不直接返回 artifact URL 时）。 */
  downloadSkillArtifact: async (id: number, displayName?: string): Promise<void> => {
    const { blob, fileName } = await http.getBlob(`/resource-center/resources/${id}/skill-artifact`);
    const safeBase = (displayName?.trim() || `skill-${id}`).replace(/[/\\?%*:|"<>]/g, '-').slice(0, 80);
    const name = (fileName?.trim() || `${safeBase}.zip`).replace(/[/\\?%*:|"<>]/g, '-');
    const url = URL.createObjectURL(blob);
    try {
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      a.remove();
    } finally {
      URL.revokeObjectURL(url);
    }
  },
};
