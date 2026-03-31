import { http } from '../../lib/http';
import type { AxiosRequestConfig } from 'axios';
import { extractArray, normalizePaginated } from '../../utils/normalizeApiPayload';
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

function normalizeResourceStats(raw: unknown): ResourceStatsVO {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  return {
    totalCalls: numStat(o.totalCalls),
    todayCalls: numStat(o.todayCalls),
    successRate: numStat(o.successRate),
    avgLatencyMs: numStat(o.avgLatencyMs),
    favoriteCount: numStat(o.favoriteCount),
    reviewCount: numStat(o.reviewCount),
    averageRating: numStat(o.averageRating),
    callTrend: extractArray(o.callTrend),
    relatedResources: extractArray<ExploreResourceItem>(o.relatedResources),
  };
}

export const resourceCatalogService = {
  list: async (params?: ResourceCatalogQueryRequest) => {
    const raw = await http.get<unknown>('/catalog/resources', { params });
    return normalizePaginated<ResourceCatalogItemVO>(raw);
  },

  getByTypeAndId: (
    resourceType: ResourceCatalogItemVO['resourceType'],
    resourceId: string | number,
    include?: string,
  ) =>
    http.get<CatalogResourceDetailVO>(`/catalog/resources/${resourceType}/${resourceId}`, {
      params: include ? { include } : undefined,
    }),

  resolve: (payload: ResourceResolveRequest, config?: AxiosRequestConfig) =>
    http.post<ResourceResolveVO>('/catalog/resolve', payload, config),

  getResourceStats: async (resourceType: ResourceType, resourceId: string | number) => {
    const raw = await http.get<unknown>(`/catalog/resources/${resourceType}/${resourceId}/stats`);
    return normalizeResourceStats(raw);
  },

  getTrending: async (params?: { resourceType?: ResourceType; limit?: number }) => {
    const raw = await http.get<unknown>('/catalog/resources/trending', { params });
    return extractArray<ExploreResourceItem>(raw);
  },

  getSearchSuggestions: async (q: string) => {
    const raw = await http.get<unknown>('/catalog/resources/search-suggestions', { params: { q } });
    return extractArray<SearchSuggestion>(raw);
  },
};
