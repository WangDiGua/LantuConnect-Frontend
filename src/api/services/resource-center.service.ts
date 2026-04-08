import { http } from '../../lib/http';
import { tryBatchPost } from '../../utils/batchApi';
import { runWithConcurrency } from '../../utils/runWithConcurrency';
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
  SkillExternalSkillMdResponse,
  SkillExternalReviewVO,
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
  if (value === 'merged_live') return 'merged_live';
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
    providerId: r?.providerId != null && r?.providerId !== '' ? String(r.providerId) : undefined,
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
    artifactUri:
      r?.artifactUri != null && String(r.artifactUri).trim() !== ''
        ? String(r.artifactUri).trim()
        : r?.artifact_uri != null && String(r.artifact_uri).trim() !== ''
          ? String(r.artifact_uri).trim()
          : undefined,
    artifactSha256:
      r?.artifactSha256 != null && String(r.artifactSha256).trim() !== ''
        ? String(r.artifactSha256).trim()
        : r?.artifact_sha256 != null && String(r.artifact_sha256).trim() !== ''
          ? String(r.artifact_sha256).trim()
          : undefined,
    manifest,
    entryDoc: r?.entryDoc != null && r?.entryDoc !== '' ? String(r.entryDoc) : undefined,
    packValidationStatus: normalizePackStatus(r?.packValidationStatus ?? r?.pack_validation_status),
    packValidatedAt:
      r?.packValidatedAt != null && r?.packValidatedAt !== ''
        ? String(r.packValidatedAt)
        : r?.pack_validated_at != null && r?.pack_validated_at !== ''
          ? String(r.pack_validated_at)
          : undefined,
    packValidationMessage:
      r?.packValidationMessage != null
        ? String(r.packValidationMessage)
        : r?.pack_validation_message != null
          ? String(r.pack_validation_message)
          : undefined,
    skillRootPath:
      r?.skillRootPath != null && String(r.skillRootPath).trim() !== ''
        ? String(r.skillRootPath)
        : r?.skill_root_path != null && String(r.skill_root_path).trim() !== ''
          ? String(r.skill_root_path)
          : undefined,
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

function toSkillCatalogItem(row: unknown): SkillExternalCatalogItemVO {
  const item = row && typeof row === 'object' && !Array.isArray(row) ? (row as Record<string, unknown>) : {};
  const starsRaw = item.stars;
  const stars = starsRaw != null && starsRaw !== '' ? Number(starsRaw) : undefined;
  const fav = item.favoriteCount != null && item.favoriteCount !== '' ? Number(item.favoriteCount) : undefined;
  const dl = item.downloadCount != null && item.downloadCount !== '' ? Number(item.downloadCount) : undefined;
  const vw = item.viewCount != null && item.viewCount !== '' ? Number(item.viewCount) : undefined;
  const rc = item.reviewCount != null && item.reviewCount !== '' ? Number(item.reviewCount) : undefined;
  const ra = item.ratingAvg != null && item.ratingAvg !== '' ? Number(item.ratingAvg) : undefined;
  return {
    id: String(item.id ?? ''),
    name: String(item.name ?? ''),
    summary: item.summary != null ? String(item.summary) : undefined,
    packUrl: String(item.packUrl ?? ''),
    licenseNote: item.licenseNote != null ? String(item.licenseNote) : undefined,
    sourceUrl: item.sourceUrl != null ? String(item.sourceUrl) : undefined,
    stars: Number.isFinite(stars) ? stars : undefined,
    itemKey: item.itemKey != null && String(item.itemKey).trim() !== '' ? String(item.itemKey) : undefined,
    favoriteCount: Number.isFinite(fav) ? fav : undefined,
    downloadCount: Number.isFinite(dl) ? dl : undefined,
    viewCount: Number.isFinite(vw) ? vw : undefined,
    reviewCount: Number.isFinite(rc) ? rc : undefined,
    ratingAvg: Number.isFinite(ra) ? ra : undefined,
    favoritedByMe:
      typeof item.favoritedByMe === 'boolean'
        ? item.favoritedByMe
        : item.favoritedByMe === 1 || item.favoritedByMe === '1'
          ? true
          : item.favoritedByMe === 0 || item.favoritedByMe === '0'
            ? false
            : undefined,
  };
}

function toSkillExternalSkillMd(row: unknown): SkillExternalSkillMdResponse {
  const r = row && typeof row === 'object' && !Array.isArray(row) ? (row as Record<string, unknown>) : {};
  return {
    markdown: r.markdown != null && String(r.markdown).trim() !== '' ? String(r.markdown) : undefined,
    resolvedRawUrl: r.resolvedRawUrl != null && String(r.resolvedRawUrl).trim() !== '' ? String(r.resolvedRawUrl) : undefined,
    hint: r.hint != null && String(r.hint).trim() !== '' ? String(r.hint) : undefined,
    truncated: typeof r.truncated === 'boolean' ? r.truncated : undefined,
    fromCache: typeof r.fromCache === 'boolean' ? r.fromCache : undefined,
  };
}

function toSkillExternalReview(row: unknown): SkillExternalReviewVO {
  const r = row && typeof row === 'object' && !Array.isArray(row) ? (row as Record<string, unknown>) : {};
  const id = Number(r.id ?? 0) || 0;
  const ratingRaw = r.rating != null && r.rating !== '' ? Number(r.rating) : undefined;
  let createTime: string | undefined;
  if (r.createTime != null) {
    if (typeof r.createTime === 'string') {
      createTime = r.createTime;
    } else if (Array.isArray(r.createTime)) {
      const a = r.createTime.map((x: unknown) => Number(x));
      if (a.length >= 3 && a.every((n) => Number.isFinite(n))) {
        const [y, mo, d, h = 0, mi = 0, s = 0, nano = 0] = a;
        const ms = Date.UTC(y, mo - 1, d, h, mi, s, Math.floor(nano / 1_000_000));
        createTime = new Date(ms).toISOString();
      }
    }
  }
  return {
    id,
    itemKey: r.itemKey != null ? String(r.itemKey) : undefined,
    userId: r.userId != null && r.userId !== '' ? Number(r.userId) : undefined,
    userName: r.userName != null ? String(r.userName) : undefined,
    avatar: r.avatar != null ? String(r.avatar) : undefined,
    rating: Number.isFinite(ratingRaw) ? ratingRaw : undefined,
    comment: r.comment != null ? String(r.comment) : undefined,
    createTime,
  };
}

function normalizeSkillExternalReviewsPage(raw: unknown): {
  list: SkillExternalReviewVO[];
  total: number;
  page: number;
  pageSize: number;
} {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const o = raw as Record<string, unknown>;
    const listRaw = o.list;
    const list = Array.isArray(listRaw) ? listRaw.map(toSkillExternalReview) : [];
    return {
      list,
      total: Number(o.total ?? list.length) || 0,
      page: Number(o.page ?? 1) || 1,
      pageSize: Number(o.pageSize ?? 20) || 20,
    };
  }
  return { list: [], total: 0, page: 1, pageSize: 20 };
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

function toSkillExternalCatalogProperties(raw: unknown): SkillExternalCatalogProperties {
  const rec = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const smRaw = rec.skillsmp;
  const sm =
    smRaw && typeof smRaw === 'object' && !Array.isArray(smRaw)
      ? (smRaw as Record<string, unknown>)
      : {};
  const queriesRaw = sm.discoveryQueries;
  const discoveryQueries = Array.isArray(queriesRaw)
    ? queriesRaw.map((q: unknown) => String(q ?? '').trim()).filter(Boolean)
    : [];
  const entriesRaw = rec.entries;
  const entries = Array.isArray(entriesRaw)
    ? entriesRaw.map((e: unknown) => {
        const row = e && typeof e === 'object' && !Array.isArray(e) ? (e as Record<string, unknown>) : {};
        return {
          id: row.id != null ? String(row.id) : '',
          name: row.name != null ? String(row.name) : '',
          summary: row.summary != null ? String(row.summary) : undefined,
          packUrl: row.packUrl != null ? String(row.packUrl) : '',
          licenseNote: row.licenseNote != null ? String(row.licenseNote) : undefined,
          sourceUrl: row.sourceUrl != null ? String(row.sourceUrl) : undefined,
        };
      })
    : [];
  const urlsRaw = rec.mirrorCatalogUrls;
  const mirrorCatalogUrls = Array.isArray(urlsRaw)
    ? urlsRaw.map((u: unknown) => String(u ?? '').trim()).filter(Boolean)
    : [];
  const sourcesRaw = rec.catalogHttpSources;
  const catalogHttpSources = Array.isArray(sourcesRaw)
    ? sourcesRaw
        .map((s: unknown) => {
          const row = s && typeof s === 'object' && !Array.isArray(s) ? (s as Record<string, unknown>) : {};
          return {
            url: row.url != null ? String(row.url).trim() : '',
            format: row.format != null ? String(row.format).trim() : 'AUTO',
          };
        })
        .filter((s: SkillExternalCatalogHttpSource) => s.url.length > 0)
    : [];
  const shRaw = rec.skillhub;
  const sh =
    shRaw && typeof shRaw === 'object' && !Array.isArray(shRaw)
      ? (shRaw as Record<string, unknown>)
      : {};
  const shUrls = normalizeSkillHubUrlsFromApi(sh);
  const shQueriesRaw = sh.discoveryQueries;
  const skillhubDiscoveryQueries = Array.isArray(shQueriesRaw)
    ? shQueriesRaw.map((q: unknown) => String(q ?? '').trim()).filter(Boolean)
    : [];
  const outbound = rec.outboundHttpProxy;
  const outboundRec =
    outbound && typeof outbound === 'object' && !Array.isArray(outbound)
      ? (outbound as Record<string, unknown>)
      : {};
  const ghm = rec.githubZipMirror;
  const ghmRec =
    ghm && typeof ghm === 'object' && !Array.isArray(ghm) ? (ghm as Record<string, unknown>) : {};
  return {
    provider: rec.provider != null ? String(rec.provider) : 'skillsmp',
    remoteCatalogMode: normalizeRemoteCatalogMode(rec.remoteCatalogMode),
    cacheTtlSeconds: num(rec.cacheTtlSeconds, 3600),
    persistenceEnabled: rec.persistenceEnabled !== false,
    mirrorCatalogUrl: rec.mirrorCatalogUrl != null ? String(rec.mirrorCatalogUrl) : '',
    mirrorCatalogUrls,
    catalogHttpSources,
    skillhub: {
      enabled: sh.enabled !== false,
      baseUrl: shUrls.baseUrl,
      fallbackBaseUrl: shUrls.fallbackBaseUrl,
      limitPerQuery: num(sh.limitPerQuery, 10),
      maxQueriesPerRequest: num(sh.maxQueriesPerRequest, 12),
      githubDefaultBranch: sh.githubDefaultBranch != null ? String(sh.githubDefaultBranch) : 'main',
      discoveryQueries: skillhubDiscoveryQueries,
    },
    outboundHttpProxy: {
      host: outboundRec.host != null ? String(outboundRec.host) : '',
      port: num(outboundRec.port, 0),
    },
    githubZipMirror: {
      mode: ghmRec.mode != null ? String(ghmRec.mode) : 'none',
      prefix: ghmRec.prefix != null ? String(ghmRec.prefix) : '',
    },
    entries,
    skillsmp: {
      /** 与后端 SkillsMp.enabled 默认 false 一致；仅显式 true 视为开启 */
      enabled: sm.enabled === true,
      baseUrl: sm.baseUrl != null ? String(sm.baseUrl) : 'https://skillsmp.com/api/v1',
      apiKey: sm.apiKey != null ? String(sm.apiKey) : '',
      sortBy: sm.sortBy != null ? String(sm.sortBy) : 'stars',
      limitPerQuery: num(sm.limitPerQuery, 100),
      maxQueriesPerRequest: num(sm.maxQueriesPerRequest, 12),
      githubDefaultBranch: sm.githubDefaultBranch != null ? String(sm.githubDefaultBranch) : 'main',
      discoveryQueries,
    },
  };
}

function toSkillExternalCatalogSettingsResponse(raw: unknown): SkillExternalCatalogSettingsResponse {
  const o = raw as Record<string, unknown> | null | undefined;
  const cfgRaw = o?.config ?? o;
  const cfg =
    cfgRaw && typeof cfgRaw === 'object' && !Array.isArray(cfgRaw)
      ? (cfgRaw as Record<string, unknown>)
      : {};
  return {
    config: toSkillExternalCatalogProperties(cfg),
    skillsmpApiKeyConfigured: o?.skillsmpApiKeyConfigured === true,
  };
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
  /**
   * 技能在线市场分页列表（须 skill:read；keyword 匹配名称/简介/链接等）
   */
  listSkillExternalCatalog: async (query?: {
    keyword?: string;
    page?: number;
    pageSize?: number;
    /** 与后端 GET 参数对齐：星标区间、来源过滤 */
    minStars?: number;
    maxStars?: number;
    source?: 'skillhub' | 'skillsmp' | 'mirror';
  }): Promise<SkillExternalCatalogPage> => {
    const params: Record<string, string | number> = {
      page: query?.page ?? 1,
      pageSize: query?.pageSize ?? 20,
      _ts: Date.now(),
    };
    const kw = query?.keyword?.trim();
    if (kw) params.keyword = kw;
    if (query?.minStars != null && Number.isFinite(query.minStars)) {
      params.minStars = query.minStars;
    }
    if (query?.maxStars != null && Number.isFinite(query.maxStars)) {
      params.maxStars = query.maxStars;
    }
    if (query?.source) params.source = query.source;
    const raw = await http.get<unknown>('/resource-center/skill-external-catalog', {
      params,
      headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
    });
    return normalizeSkillExternalCatalogPage(raw);
  },

  /** 单条详情；key 为 itemKey/dedupe_key（建议 UTF-8 编码后作为 query 传递） */
  getSkillExternalCatalogItem: async (key: string): Promise<SkillExternalCatalogItemVO> => {
    const raw = await http.get<unknown>('/resource-center/skill-external-catalog/item', {
      params: { key },
      headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
    });
    return toSkillCatalogItem(raw);
  },

  /** GitHub 来源条目：服务端经 raw.githubusercontent.com 代拉 SKILL.md（超时/非 Git 时 markdown 可能为空） */
  getSkillExternalCatalogItemSkillMd: async (key: string): Promise<SkillExternalSkillMdResponse> => {
    const raw = await http.get<unknown>('/resource-center/skill-external-catalog/item/skill-md', {
      params: { key },
      headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
    });
    return toSkillExternalSkillMd(raw);
  },

  recordSkillExternalDownload: async (itemKey: string): Promise<void> => {
    await http.post<void>('/resource-center/skill-external-catalog/engagement/downloads', { itemKey });
  },

  recordSkillExternalView: async (itemKey: string): Promise<void> => {
    await http.post<void>('/resource-center/skill-external-catalog/engagement/views', { itemKey });
  },

  addSkillExternalFavorite: async (itemKey: string): Promise<void> => {
    await http.post<void>('/resource-center/skill-external-catalog/engagement/favorites', { itemKey });
  },

  removeSkillExternalFavorite: async (itemKey: string): Promise<void> => {
    await http.delete<void>('/resource-center/skill-external-catalog/engagement/favorites', {
      params: { itemKey },
    });
  },

  pageSkillExternalReviews: async (
    itemKey: string,
    page = 1,
    pageSize = 20,
  ): Promise<{ list: SkillExternalReviewVO[]; total: number; page: number; pageSize: number }> => {
    const raw = await http.get<unknown>('/resource-center/skill-external-catalog/engagement/reviews', {
      params: { itemKey, page, pageSize },
    });
    return normalizeSkillExternalReviewsPage(raw);
  },

  createSkillExternalReview: async (body: {
    itemKey: string;
    rating: number;
    comment?: string;
  }): Promise<SkillExternalReviewVO> => {
    const raw = await http.post<unknown>('/resource-center/skill-external-catalog/engagement/reviews', body);
    return toSkillExternalReview(raw);
  },

  deleteSkillExternalReview: async (id: number): Promise<void> => {
    await http.delete<void>(`/resource-center/skill-external-catalog/engagement/reviews/${id}`);
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
