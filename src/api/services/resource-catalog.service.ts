import { http } from '../../lib/http';
import type { AxiosRequestConfig } from 'axios';
import { extractArray, normalizePaginated } from '../../utils/normalizeApiPayload';
import { normalizeExploreResourceItem } from './dashboard.service';
import { normalizeCatalogObservability } from '../../utils/catalogObservability';
import type {
  AggregatedCapabilityToolsVO,
  CatalogResourceDetailVO,
  GatewayIntegrationHintsVO,
  ResourceBindingSummaryVO,
  ResourceCatalogItemVO,
  ResourceCatalogQueryRequest,
  ResourceResolveRequest,
  ResourceType,
  ToolDispatchRouteVO,
} from '../../types/dto/catalog';
import type { ResourceStatsVO, SearchSuggestion, ExploreResourceItem } from '../../types/dto/explore';

function numStat(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function optRating(v: unknown): number | null {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function normalizeStatsCallTrend(raw: unknown): ResourceStatsVO['callTrend'] {
  return extractArray(raw).map((row: unknown) => {
    const x = row && typeof row === 'object' ? (row as Record<string, unknown>) : {};
    return {
      date: String(x.day ?? x.date ?? ''),
      calls: numStat(x.cnt ?? x.calls ?? x.count),
    };
  });
}

function optLong(v: unknown): number | null {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** SDK 列表等与控制台目录共用行映射 */
export function normalizeCatalogItem(row: unknown): ResourceCatalogItemVO {
  const x = row && typeof row === 'object' ? (row as Record<string, unknown>) : {};
  const rt = String(x.resourceType ?? x.resource_type ?? 'agent').toLowerCase();
  const ratingRaw = x.ratingAvg ?? x.rating_avg;
  const reviewRaw = x.reviewCount ?? x.review_count;
  return {
    resourceType: rt as ResourceCatalogItemVO['resourceType'],
    resourceId: String(x.resourceId ?? x.resource_id ?? ''),
    resourceCode: String(x.resourceCode ?? x.resource_code ?? ''),
    displayName: String(x.displayName ?? x.display_name ?? ''),
    description: x.description == null ? undefined : String(x.description),
    status: String(x.status ?? ''),
    sourceType: x.sourceType == null && x.source_type == null ? undefined : String(x.sourceType ?? x.source_type),
    updateTime: x.updateTime == null && x.update_time == null ? undefined : String(x.updateTime ?? x.update_time),
    createdBy: optLong(x.createdBy ?? x.created_by),
    createdByName:
      x.createdByName == null && x.created_by_name == null
        ? undefined
        : String(x.createdByName ?? x.created_by_name),
    ratingAvg: ratingRaw == null ? null : optLong(ratingRaw),
    reviewCount: reviewRaw == null ? null : numStat(reviewRaw),
    tags: Array.isArray(x.tags) ? (x.tags as unknown[]).map((t) => String(t)) : undefined,
    accessPolicy:
      x.accessPolicy == null && x.access_policy == null ? undefined : String(x.accessPolicy ?? x.access_policy),
    categoryName:
      x.categoryName == null && x.category_name == null ? undefined : String(x.categoryName ?? x.category_name),
    dataType: x.dataType == null && x.data_type == null ? undefined : String(x.dataType ?? x.data_type),
    format: x.format == null ? undefined : String(x.format),
    recordCount:
      x.recordCount == null && x.record_count == null ? undefined : numStat(x.recordCount ?? x.record_count),
    fileSize: x.fileSize == null && x.file_size == null ? undefined : numStat(x.fileSize ?? x.file_size),
    callCount: numStat(x.callCount ?? x.call_count),
    usageCount: numStat(x.usageCount ?? x.usage_count),
    downloadCount: numStat(x.downloadCount ?? x.download_count),
    viewCount: numStat(x.viewCount ?? x.view_count),
    agentExposure:
      x.agentExposure == null && x.agent_exposure == null ? undefined : String(x.agentExposure ?? x.agent_exposure),
    agentDeliveryMode:
      x.agentDeliveryMode == null && x.agent_delivery_mode == null
        ? undefined
        : String(x.agentDeliveryMode ?? x.agent_delivery_mode).trim().toLowerCase(),
    observability: normalizeCatalogObservability(x),
    quality: x.quality && typeof x.quality === 'object' ? (x.quality as Record<string, unknown>) : undefined,
    hasGrantForKey:
      x.hasGrantForKey == null && x.has_grant_for_key == null ? undefined : Boolean(x.hasGrantForKey ?? x.has_grant_for_key),
    executionMode: (() => {
      const raw = x.executionMode ?? x.execution_mode;
      if (raw == null || raw === '') return undefined;
      const s = String(raw).trim().toLowerCase();
      return s || undefined;
    })(),
  };
}

function normalizeBindingClosure(raw: unknown): ResourceBindingSummaryVO[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out: ResourceBindingSummaryVO[] = [];
  for (const row of raw) {
    const o = row && typeof row === 'object' ? (row as Record<string, unknown>) : {};
    const id = o.resourceId ?? o.resource_id;
    if (id == null || id === '') continue;
    out.push({
      resourceId: String(id),
      resourceType: String(o.resourceType ?? o.resource_type ?? '').toLowerCase(),
      resourceCode: o.resourceCode != null ? String(o.resourceCode) : o.resource_code != null ? String(o.resource_code) : undefined,
      displayName: o.displayName != null ? String(o.displayName) : o.display_name != null ? String(o.display_name) : undefined,
      status: o.status != null ? String(o.status) : undefined,
    });
  }
  return out.length ? out : undefined;
}

function normalizeCatalogDetail(raw: unknown): CatalogResourceDetailVO {
  const base = normalizeCatalogItem(raw);
  const x = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const versionRaw = x.version ?? x.currentVersion ?? x.current_version;
  const merged: CatalogResourceDetailVO = {
    ...base,
    version: versionRaw == null || versionRaw === '' ? undefined : String(versionRaw),
    invokeType: x.invokeType == null && x.invoke_type == null ? undefined : String(x.invokeType ?? x.invoke_type),
    endpoint: x.endpoint == null ? undefined : String(x.endpoint),
    launchToken: x.launchToken == null && x.launch_token == null ? undefined : String(x.launchToken ?? x.launch_token),
    launchUrl: x.launchUrl == null && x.launch_url == null ? undefined : String(x.launchUrl ?? x.launch_url),
    agentExposure:
      x.agentExposure == null && x.agent_exposure == null ? base.agentExposure : String(x.agentExposure ?? x.agent_exposure),
    agentDeliveryMode:
      x.agentDeliveryMode == null && x.agent_delivery_mode == null
        ? base.agentDeliveryMode
        : String(x.agentDeliveryMode ?? x.agent_delivery_mode).trim().toLowerCase(),
    spec: x.spec && typeof x.spec === 'object' ? (x.spec as Record<string, unknown>) : undefined,
    agentType:
      x.agentType == null && x.agent_type == null
        ? undefined
        : String(x.agentType ?? x.agent_type),
    mode:
      x.mode == null && x.executionMode == null && x.execution_mode == null
        ? undefined
        : String(x.mode ?? x.executionMode ?? x.execution_mode),
    maxConcurrency:
      x.maxConcurrency == null && x.max_concurrency == null
        ? undefined
        : numStat(x.maxConcurrency ?? x.max_concurrency),
    maxSteps:
      x.maxSteps == null && x.max_steps == null
        ? undefined
        : numStat(x.maxSteps ?? x.max_steps),
    temperature: x.temperature == null ? undefined : numStat(x.temperature),
    systemPrompt:
      x.systemPrompt == null && x.system_prompt == null
        ? undefined
        : String(x.systemPrompt ?? x.system_prompt),
    serviceDetailMd: (() => {
      const raw = x.serviceDetailMd ?? x.service_detail_md;
      if (raw == null || raw === '') return undefined;
      const s = String(raw);
      return s.trim() === '' ? undefined : s;
    })(),
  };
  if (Array.isArray(x.tags)) merged.tags = (x.tags as unknown[]).map((t) => String(t));
  /** 勿仅用嵌套 observability 覆盖：须与行根 healthStatus/circuitState 合并（与 normalizeCatalogItem 一致） */
  merged.observability = normalizeCatalogObservability(x);
  if (x.quality && typeof x.quality === 'object') {
    merged.quality = x.quality as Record<string, unknown>;
  }
  const bc = normalizeBindingClosure(x.bindingClosure ?? x.binding_closure);
  if (bc) merged.bindingClosure = bc;
  if (merged.resourceType === 'skill') {
    if (!merged.executionMode && merged.spec && typeof merged.spec === 'object') {
      const em = String((merged.spec as Record<string, unknown>).executionMode ?? '').trim().toLowerCase();
      if (em === 'context') merged.executionMode = 'context';
    }
    if (!merged.executionMode && merged.invokeType && String(merged.invokeType).toLowerCase() === 'portal_context') {
      merged.executionMode = 'context';
    }
    if (!merged.executionMode) {
      merged.executionMode = 'context';
    }
  }
  return merged;
}

function normalizeStatsRelated(raw: unknown): ExploreResourceItem {
  const x = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  return {
    resourceType: String(x.resourceType ?? x.resource_type ?? '').toLowerCase(),
    resourceId: String(x.resourceId ?? x.resource_id ?? x.id ?? ''),
    resourceCode:
      x.resourceCode == null && x.resource_code == null ? undefined : String(x.resourceCode ?? x.resource_code),
    displayName: String(x.displayName ?? x.display_name ?? '—'),
    description: '',
    callCount: null,
    rating: null,
    publishedAt: '',
  };
}

function normalizeResourceStats(raw: unknown): ResourceStatsVO {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const callCount = numStat(o.callCount ?? o.totalCalls);
  const rating = optRating(o.rating ?? o.averageRating);
  return {
    callCount,
    successRate: numStat(o.successRate),
    rating,
    favoriteCount: numStat(o.favoriteCount),
    callTrend: normalizeStatsCallTrend(o.callTrend),
    relatedResources: extractArray(o.relatedResources).map(normalizeStatsRelated),
  };
}

function normalizeToolRouteRow(raw: unknown): ToolDispatchRouteVO {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  return {
    unifiedFunctionName: String(o.unifiedFunctionName ?? o.unified_function_name ?? ''),
    resourceType: String(o.resourceType ?? o.resource_type ?? ''),
    resourceId: String(o.resourceId ?? o.resource_id ?? ''),
    upstreamToolName:
      o.upstreamToolName != null
        ? String(o.upstreamToolName)
        : o.upstream_tool_name != null
          ? String(o.upstream_tool_name)
          : undefined,
  };
}

function normalizeAggregatedCapabilityTools(raw: unknown): AggregatedCapabilityToolsVO {
  const x = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const oa = x.openAiTools ?? x.open_ai_tools;
  return {
    entry:
      x.entry && typeof x.entry === 'object' && !Array.isArray(x.entry)
        ? (x.entry as Record<string, string>)
        : undefined,
    openAiTools: extractArray(oa),
    routes: extractArray(x.routes).map(normalizeToolRouteRow),
    warnings: extractArray(x.warnings).map((w) => String(w)),
    mcpQueriedCount: optLong(x.mcpQueriedCount ?? x.mcp_queried_count),
    toolFunctionCount: optLong(x.toolFunctionCount ?? x.tool_function_count),
    aggregateTruncated:
      x.aggregateTruncated != null
        ? Boolean(x.aggregateTruncated)
        : x.aggregate_truncated != null
          ? Boolean(x.aggregate_truncated)
          : undefined,
  };
}

function normalizeGatewayIntegrationHints(raw: unknown): GatewayIntegrationHintsVO {
  const x = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const be = x.bindingExpansion && typeof x.bindingExpansion === 'object' ? (x.bindingExpansion as Record<string, unknown>) : {};
  const cap = x.capabilities && typeof x.capabilities === 'object' ? (x.capabilities as Record<string, unknown>) : {};
  const mergeRaw = be.mergeActiveSkillMcps ?? be.merge_active_skill_mcps;
  return {
    bindingExpansion: {
      enabled: Boolean(be.enabled),
      agent: Boolean(be.agent),
      /** 旧后端未返回该字段时与 Java 默认 true 对齐，避免误显 false */
      mergeActiveSkillMcps: mergeRaw === undefined ? true : Boolean(mergeRaw),
    },
    capabilities: {
      maxMcpsPerAggregate: numStat(cap.maxMcpsPerAggregate ?? cap.max_mcps_per_aggregate, 0),
      maxToolsPerResponse: numStat(cap.maxToolsPerResponse ?? cap.max_tools_per_response, 0),
    },
  };
}

export const resourceCatalogService = {
  list: async (params?: ResourceCatalogQueryRequest) => {
    const raw = await http.get<unknown>('/catalog/resources', { params });
    return normalizePaginated<ResourceCatalogItemVO>(raw, normalizeCatalogItem);
  },

  getByTypeAndId: async (
    resourceType: ResourceCatalogItemVO['resourceType'],
    resourceId: string | number,
    include?: string,
  ) => {
    const raw = await http.get<unknown>(`/catalog/resources/${resourceType}/${resourceId}`, {
      params: include ? { include } : undefined,
    });
    return normalizeCatalogDetail(raw);
  },

  resolve: async (payload: ResourceResolveRequest, config?: AxiosRequestConfig): Promise<CatalogResourceDetailVO> => {
    const raw = await http.post<unknown>('/catalog/resolve', payload, config);
    return normalizeCatalogDetail(raw);
  },

  getResourceStats: async (resourceType: ResourceType, resourceId: string | number) => {
    const raw = await http.get<unknown>(`/catalog/resources/${resourceType}/${resourceId}/stats`);
    return normalizeResourceStats(raw);
  },

  getTrending: async (params?: { resourceType?: ResourceType; limit?: number }) => {
    const raw = await http.get<unknown>('/catalog/resources/trending', { params });
    return extractArray(raw).map(normalizeExploreResourceItem);
  },

  getSearchSuggestions: async (q: string) => {
    const raw = await http.get<unknown>('/catalog/resources/search-suggestions', { params: { q } });
    return extractArray<SearchSuggestion>(raw);
  },

  /** 须 X-Api-Key（http 拦截器从偏好设置注入） */
  fetchAggregatedTools: async (
    entryResourceType: string,
    entryResourceId: string,
    config?: AxiosRequestConfig,
  ): Promise<AggregatedCapabilityToolsVO> => {
    const raw = await http.get<unknown>('/catalog/capabilities/tools', {
      params: { entryResourceType, entryResourceId },
      ...config,
    });
    return normalizeAggregatedCapabilityTools(raw);
  },

  fetchGatewayIntegrationHints: async (): Promise<GatewayIntegrationHintsVO> => {
    const raw = await http.get<unknown>('/catalog/gateway/integration-hints');
    return normalizeGatewayIntegrationHints(raw);
  },
};
