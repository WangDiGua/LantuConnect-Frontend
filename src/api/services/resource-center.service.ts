import { http } from '../../lib/http';
import { normalizeAccessPolicy } from '../../utils/accessPolicy';
import type {
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
  SkillExternalCatalogHttpSource,
  SkillExternalCatalogItemVO,
  SkillExternalCatalogPage,
  SkillExternalCatalogProperties,
  SkillExternalCatalogSettingsResponse,
  SkillPackValidationStatus,
  SkillPackChunkUploadProgress,
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
    ownerId:
      raw?.ownerId != null && raw?.ownerId !== ''
        ? String(raw.ownerId)
        : raw?.createdBy != null && raw?.createdBy !== ''
          ? String(raw.createdBy)
          : undefined,
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
    accessPolicy: normalizeAccessPolicy(raw?.accessPolicy ?? raw?.access_policy),
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
    skillType:
      raw?.skillType != null && raw?.skillType !== ''
        ? String(raw.skillType)
        : raw?.skill_type != null && raw?.skill_type !== ''
          ? String(raw.skill_type)
          : undefined,
    artifactUri:
      raw?.artifactUri != null && String(raw.artifactUri).trim() !== ''
        ? String(raw.artifactUri).trim()
        : raw?.artifact_uri != null && String(raw.artifact_uri).trim() !== ''
          ? String(raw.artifact_uri).trim()
          : undefined,
    artifactSha256:
      raw?.artifactSha256 != null && String(raw.artifactSha256).trim() !== ''
        ? String(raw.artifactSha256).trim()
        : raw?.artifact_sha256 != null && String(raw.artifact_sha256).trim() !== ''
          ? String(raw.artifact_sha256).trim()
          : undefined,
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
    skillRootPath:
      raw?.skillRootPath != null && String(raw.skillRootPath).trim() !== ''
        ? String(raw.skillRootPath)
        : raw?.skill_root_path != null && String(raw.skill_root_path).trim() !== ''
          ? String(raw.skill_root_path)
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

function toSkillCatalogItem(raw: any): SkillExternalCatalogItemVO {
  const starsRaw = raw?.stars;
  const stars = starsRaw != null && starsRaw !== '' ? Number(starsRaw) : undefined;
  return {
    id: String(raw?.id ?? ''),
    name: String(raw?.name ?? ''),
    summary: raw?.summary != null ? String(raw.summary) : undefined,
    packUrl: String(raw?.packUrl ?? ''),
    licenseNote: raw?.licenseNote != null ? String(raw.licenseNote) : undefined,
    sourceUrl: raw?.sourceUrl != null ? String(raw.sourceUrl) : undefined,
    stars: Number.isFinite(stars) ? stars : undefined,
  };
}

function normalizeSkillExternalCatalogPage(raw: unknown): SkillExternalCatalogPage {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const o = raw as Record<string, unknown>;
    const listRaw = o.list;
    const list = Array.isArray(listRaw) ? listRaw.map(toSkillCatalogItem) : [];
    return {
      list,
      total: Number(o.total ?? list.length) || 0,
      page: Number(o.page ?? 1) || 1,
      pageSize: Number(o.pageSize ?? 20) || 20,
    };
  }
  return { list: [], total: 0, page: 1, pageSize: 20 };
}

function num(raw: unknown, fallback: number): number {
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

/** 超过此大小走分片上传（每片 4MB，与后端 {@code SkillPackChunkedUploadService.CHUNK_SIZE} 一致） */
const SKILL_PACK_CHUNK_THRESHOLD = 8 * 1024 * 1024;
const SERVER_SKILL_CHUNK_SIZE = 4 * 1024 * 1024;

const SKILL_CHUNK_STORAGE_PREFIX = 'lantu_skill_pack_chunk_v1:';

function skillPackChunkStorageKey(file: File, resourceId?: number, skillRoot?: string) {
  return `${SKILL_CHUNK_STORAGE_PREFIX}${file.name}|${file.size}|${file.lastModified}|${resourceId ?? ''}|${skillRoot ?? ''}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

type SkillPackChunkInitResponse = {
  uploadId: string;
  chunkSize: number;
  totalChunks: number;
  fileSize: number;
};

type SkillPackChunkStatusResponse = {
  totalChunks: number;
  fileSize: number;
  receivedCount: number;
  receivedChunkIndices: number[];
};

async function postSkillChunk(uploadId: string, chunkIndex: number, blob: Blob): Promise<void> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < 4; attempt++) {
    const fd = new FormData();
    fd.append('file', blob, 'chunk');
    try {
      await http.upload<unknown>(
        `/resource-center/resources/skills/package-upload/chunk/${uploadId}/${chunkIndex}`,
        fd,
        { timeout: 120_000 },
      );
      return;
    } catch (e) {
      lastErr = e;
      await sleep(400 * 2 ** attempt);
    }
  }
  throw lastErr;
}

function normalizeRemoteCatalogMode(raw: unknown): string {
  const s = raw != null ? String(raw).trim().toUpperCase().replace(/-/g, '_') : '';
  if (['MERGED', 'SKILLHUB_ONLY', 'SKILLSMP_ONLY', 'MIRROR_ONLY'].includes(s)) return s;
  return 'MERGED';
}

/** 与后端一致：skillhub.tencent.com 官网对 /api/v1/search 多为 HTML，勿作 API 根 */
const RECOMMENDED_SKILLHUB_JSON_ROOT = 'https://agentskillhub.dev';

function shouldReplaceTencentOfficialSkillHubHost(url: string): boolean {
  const t = url.trim();
  if (!t) return false;
  try {
    const h = new URL(t).hostname.toLowerCase();
    return h === 'skillhub.tencent.com' || h === 'www.skillhub.tencent.com';
  } catch {
    return false;
  }
}

function normalizeSkillHubUrlsFromApi(sh: Record<string, unknown>): { baseUrl: string; fallbackBaseUrl: string } {
  const rawBase = sh?.baseUrl != null ? String(sh.baseUrl).trim() : '';
  const rawFb = sh?.fallbackBaseUrl != null ? String(sh.fallbackBaseUrl).trim() : '';
  let baseUrl = rawBase || RECOMMENDED_SKILLHUB_JSON_ROOT;
  let fallbackBaseUrl = rawFb;
  if (shouldReplaceTencentOfficialSkillHubHost(baseUrl)) {
    baseUrl = RECOMMENDED_SKILLHUB_JSON_ROOT;
  }
  if (shouldReplaceTencentOfficialSkillHubHost(fallbackBaseUrl)) {
    fallbackBaseUrl = '';
  }
  return { baseUrl, fallbackBaseUrl };
}

function toSkillExternalCatalogProperties(raw: any): SkillExternalCatalogProperties {
  const sm = raw?.skillsmp ?? {};
  const queriesRaw = sm?.discoveryQueries;
  const discoveryQueries = Array.isArray(queriesRaw)
    ? queriesRaw.map((q: unknown) => String(q ?? '').trim()).filter(Boolean)
    : [];
  const entriesRaw = raw?.entries;
  const entries = Array.isArray(entriesRaw)
    ? entriesRaw.map((e: any) => ({
        id: e?.id != null ? String(e.id) : '',
        name: e?.name != null ? String(e.name) : '',
        summary: e?.summary != null ? String(e.summary) : undefined,
        packUrl: e?.packUrl != null ? String(e.packUrl) : '',
        licenseNote: e?.licenseNote != null ? String(e.licenseNote) : undefined,
        sourceUrl: e?.sourceUrl != null ? String(e.sourceUrl) : undefined,
      }))
    : [];
  const urlsRaw = raw?.mirrorCatalogUrls;
  const mirrorCatalogUrls = Array.isArray(urlsRaw)
    ? urlsRaw.map((u: unknown) => String(u ?? '').trim()).filter(Boolean)
    : [];
  const sourcesRaw = raw?.catalogHttpSources;
  const catalogHttpSources = Array.isArray(sourcesRaw)
    ? sourcesRaw
        .map((s: any) => ({
          url: s?.url != null ? String(s.url).trim() : '',
          format: s?.format != null ? String(s.format).trim() : 'AUTO',
        }))
        .filter((s: SkillExternalCatalogHttpSource) => s.url.length > 0)
    : [];
  const sh = (raw?.skillhub ?? {}) as Record<string, unknown>;
  const shUrls = normalizeSkillHubUrlsFromApi(sh);
  const shQueriesRaw = sh?.discoveryQueries;
  const skillhubDiscoveryQueries = Array.isArray(shQueriesRaw)
    ? shQueriesRaw.map((q: unknown) => String(q ?? '').trim()).filter(Boolean)
    : [];
  return {
    provider: raw?.provider != null ? String(raw.provider) : 'skillsmp',
    remoteCatalogMode: normalizeRemoteCatalogMode(raw?.remoteCatalogMode),
    cacheTtlSeconds: num(raw?.cacheTtlSeconds, 3600),
    persistenceEnabled: raw?.persistenceEnabled !== false,
    mirrorCatalogUrl: raw?.mirrorCatalogUrl != null ? String(raw.mirrorCatalogUrl) : '',
    mirrorCatalogUrls,
    catalogHttpSources,
    skillhub: {
      enabled: sh?.enabled !== false,
      baseUrl: shUrls.baseUrl,
      fallbackBaseUrl: shUrls.fallbackBaseUrl,
      limitPerQuery: num(sh?.limitPerQuery, 10),
      maxQueriesPerRequest: num(sh?.maxQueriesPerRequest, 12),
      githubDefaultBranch: sh?.githubDefaultBranch != null ? String(sh.githubDefaultBranch) : 'main',
      discoveryQueries: skillhubDiscoveryQueries,
    },
    outboundHttpProxy: {
      host: raw?.outboundHttpProxy?.host != null ? String(raw.outboundHttpProxy.host) : '',
      port: num(raw?.outboundHttpProxy?.port, 0),
    },
    githubZipMirror: {
      mode: raw?.githubZipMirror?.mode != null ? String(raw.githubZipMirror.mode) : 'none',
      prefix: raw?.githubZipMirror?.prefix != null ? String(raw.githubZipMirror.prefix) : '',
    },
    entries,
    skillsmp: {
      /** 与后端 SkillsMp.enabled 默认 false 一致；仅显式 true 视为开启 */
      enabled: sm?.enabled === true,
      baseUrl: sm?.baseUrl != null ? String(sm.baseUrl) : 'https://skillsmp.com/api/v1',
      apiKey: sm?.apiKey != null ? String(sm.apiKey) : '',
      sortBy: sm?.sortBy != null ? String(sm.sortBy) : 'stars',
      limitPerQuery: num(sm?.limitPerQuery, 100),
      maxQueriesPerRequest: num(sm?.maxQueriesPerRequest, 12),
      githubDefaultBranch: sm?.githubDefaultBranch != null ? String(sm.githubDefaultBranch) : 'main',
      discoveryQueries,
    },
  };
}

function toSkillExternalCatalogSettingsResponse(raw: unknown): SkillExternalCatalogSettingsResponse {
  const o = raw as Record<string, unknown> | null | undefined;
  const cfg = (o?.config ?? o) as any;
  return {
    config: toSkillExternalCatalogProperties(cfg && typeof cfg === 'object' ? cfg : {}),
    skillsmpApiKeyConfigured: o?.skillsmpApiKeyConfigured === true,
  };
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
  /**
   * 平台管理员：技能在线市场分页列表（keyword 匹配名称/简介/链接等；不传参默认第 1 页 20 条）
   */
  listSkillExternalCatalog: async (query?: {
    keyword?: string;
    page?: number;
    pageSize?: number;
  }): Promise<SkillExternalCatalogPage> => {
    const raw = await http.get<unknown>('/resource-center/skill-external-catalog', {
      params: {
        ...(query?.keyword?.trim() ? { keyword: query.keyword.trim() } : {}),
        page: query?.page ?? 1,
        pageSize: query?.pageSize ?? 20,
        _ts: Date.now(),
      },
      headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
    });
    return normalizeSkillExternalCatalogPage(raw);
  },

  /** 超管委会：读取市场运行时配置（SkillsMP apiKey 不下发明文） */
  getSkillExternalCatalogSettings: async (): Promise<SkillExternalCatalogSettingsResponse> => {
    const raw = await http.get<unknown>('/resource-center/skill-external-catalog/settings', {
      /** 避免保存后立即 GET 仍命中浏览器/代理缓存导致界面仍为旧配置 */
      params: { _ts: Date.now() },
      headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
    });
    return toSkillExternalCatalogSettingsResponse(raw);
  },

  /** 超管委会：保存市场配置；skillsmp.apiKey 传空字符串表示保留原 Key */
  putSkillExternalCatalogSettings: async (body: SkillExternalCatalogProperties): Promise<void> => {
    await http.put<void>('/resource-center/skill-external-catalog/settings', body);
  },

  listMine: async (query?: ResourceCenterListQuery): Promise<ResourceCenterPage> => {
    const raw = await http.get<unknown>('/resource-center/resources/mine', { params: query });
    return normalizePage(raw);
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
  uploadSkillPackage: async (file: File, resourceId?: number, skillRoot?: string): Promise<ResourceCenterItemVO> => {
    const fd = new FormData();
    fd.append('file', file);
    if (resourceId != null && Number.isFinite(resourceId) && resourceId > 0) {
      fd.append('resourceId', String(resourceId));
    }
    const sr = skillRoot?.trim();
    if (sr) {
      fd.append('skillRoot', sr);
    }
    const raw = await http.upload<unknown>('/resource-center/resources/skills/package-upload', fd);
    return toResourceItem(raw);
  },

  /**
   * 技能包上传：小于阈值整包 POST；大于阈值分片+断点续传（刷新页后同文件可继续传未完成分片）。
   */
  uploadSkillPackageResumable: async (
    file: File,
    resourceId?: number,
    skillRoot?: string,
    onProgress?: (p: SkillPackChunkUploadProgress) => void,
  ): Promise<ResourceCenterItemVO> => {
    const sr = skillRoot?.trim();
    if (file.size <= SKILL_PACK_CHUNK_THRESHOLD) {
      const fd = new FormData();
      fd.append('file', file);
      if (resourceId != null && Number.isFinite(resourceId) && resourceId > 0) {
        fd.append('resourceId', String(resourceId));
      }
      if (sr) {
        fd.append('skillRoot', sr);
      }
      const raw = await http.upload<unknown>('/resource-center/resources/skills/package-upload', fd);
      return toResourceItem(raw);
    }

    const storageKey = skillPackChunkStorageKey(file, resourceId, sr);
    let uploadId: string | null = null;
    let totalChunks = 0;
    const chunkSize = SERVER_SKILL_CHUNK_SIZE;
    const done = new Set<number>();

    try {
      const rawPrev = sessionStorage.getItem(storageKey);
      if (rawPrev) {
        const prev = JSON.parse(rawPrev) as { uploadId?: string };
        if (prev?.uploadId && typeof prev.uploadId === 'string') {
          try {
            const st = await http.get<SkillPackChunkStatusResponse>(
              `/resource-center/resources/skills/package-upload/chunk/${prev.uploadId}/status`,
            );
            if (st && st.fileSize === file.size && Array.isArray(st.receivedChunkIndices)) {
              uploadId = prev.uploadId;
              totalChunks = st.totalChunks;
              st.receivedChunkIndices.forEach((i) => done.add(i));
            }
          } catch {
            sessionStorage.removeItem(storageKey);
          }
        }
      }
    } catch {
      /* private mode / quota */
    }

    if (!uploadId) {
      onProgress?.({ phase: 'init', loaded: 0, total: file.size });
      const init = await http.post<SkillPackChunkInitResponse>(
        '/resource-center/resources/skills/package-upload/chunk/init',
        {
          fileName: file.name,
          fileSize: file.size,
          ...(resourceId != null && Number.isFinite(resourceId) && resourceId > 0 ? { resourceId } : {}),
          ...(sr ? { skillRoot: sr } : {}),
        },
        { timeout: 60_000 },
      );
      uploadId = init.uploadId;
      totalChunks = init.totalChunks;
      done.clear();
      try {
        sessionStorage.setItem(storageKey, JSON.stringify({ uploadId }));
      } catch {
        /* ignore */
      }
    }

    if (!uploadId || totalChunks <= 0) {
      throw new Error('分片上传初始化失败');
    }

    let loaded = 0;
    for (const idx of done) {
      const start = idx * chunkSize;
      const end = Math.min(start + chunkSize, file.size);
      loaded += end - start;
    }

    for (let i = 0; i < totalChunks; i++) {
      if (done.has(i)) {
        continue;
      }
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, file.size);
      const blob = file.slice(start, end);
      onProgress?.({ phase: 'chunk', loaded, total: file.size, chunkIndex: i, totalChunks });
      await postSkillChunk(uploadId, i, blob);
      done.add(i);
      loaded += end - start;
      try {
        sessionStorage.setItem(storageKey, JSON.stringify({ uploadId }));
      } catch {
        /* ignore */
      }
      onProgress?.({ phase: 'chunk', loaded, total: file.size, chunkIndex: i, totalChunks });
    }

    onProgress?.({ phase: 'complete', loaded: file.size, total: file.size, totalChunks });
    const raw = await http.post<unknown>(
      `/resource-center/resources/skills/package-upload/chunk/${uploadId}/complete`,
      {},
      { timeout: 180_000 },
    );
    try {
      sessionStorage.removeItem(storageKey);
    } catch {
      /* ignore */
    }
    return toResourceItem(raw);
  },

  /** 从 HTTPS URL 拉取 zip，校验与落库与 uploadSkillPackage 一致；新建资源为 sourceType=cloud。 */
  importSkillPackageFromUrl: async (
    url: string,
    resourceId?: number,
    skillRoot?: string,
  ): Promise<ResourceCenterItemVO> => {
    const raw = await http.post<unknown>(
      '/resource-center/resources/skills/package-import-url',
      {
        url: url.trim(),
        ...(resourceId != null && Number.isFinite(resourceId) && resourceId > 0 ? { resourceId } : {}),
        ...(skillRoot?.trim() ? { skillRoot: skillRoot.trim() } : {}),
      },
      { timeout: 120_000 },
    );
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
