import { http } from '../../lib/http';
import type { AxiosRequestConfig } from 'axios';
import { extractArray, normalizePaginated } from '../../utils/normalizeApiPayload';
import { normalizeExploreResourceItem } from './dashboard.service';
import type {
  CatalogResourceDetailVO,
  ResourceCatalogItemVO,
  ResourceCatalogQueryRequest,
  ResourceResolveRequest,
  ResourceResolveVO,
  ResourceType,
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
    observability:
      x.observability && typeof x.observability === 'object'
        ? (x.observability as Record<string, unknown>)
        : undefined,
    quality: x.quality && typeof x.quality === 'object' ? (x.quality as Record<string, unknown>) : undefined,
  };
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
    spec: x.spec && typeof x.spec === 'object' ? (x.spec as Record<string, unknown>) : undefined,
    serviceDetailMd: (() => {
      const raw = x.serviceDetailMd ?? x.service_detail_md;
      if (raw == null || raw === '') return undefined;
      const s = String(raw);
      return s.trim() === '' ? undefined : s;
    })(),
  };
  if (Array.isArray(x.tags)) merged.tags = (x.tags as unknown[]).map((t) => String(t));
  if (x.observability && typeof x.observability === 'object') {
    merged.observability = x.observability as Record<string, unknown>;
  }
  if (x.quality && typeof x.quality === 'object') {
    merged.quality = x.quality as Record<string, unknown>;
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

  resolve: (payload: ResourceResolveRequest, config?: AxiosRequestConfig) =>
    http.post<ResourceResolveVO>('/catalog/resolve', payload, config),

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
};
