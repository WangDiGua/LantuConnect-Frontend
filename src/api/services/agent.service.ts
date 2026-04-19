import { ApiException } from '../../types/api';
import type { PaginatedData } from '../../types/api';
import type {
  Agent,
  AgentCreatePayload,
  AgentUpdatePayload,
  AgentListQuery,
} from '../../types/dto/agent';
import { resourceCatalogService } from './resource-catalog.service';
import type { CatalogResourceDetailVO, ResourceCatalogItemVO, ResourceCatalogQueryRequest } from '../../types/dto/catalog';

export function mapCatalogItemToAgent(item: ResourceCatalogItemVO): Agent {
  const detail = item as CatalogResourceDetailVO;
  const id = Number(item.resourceId) || 0;
  const createdBy =
    item.createdBy != null && Number.isFinite(Number(item.createdBy)) ? Number(item.createdBy) : undefined;
  return {
    id,
    agentName: item.resourceCode || `agent-${item.resourceId}`,
    displayName: item.displayName || item.resourceCode || String(item.resourceId),
    description: item.description || '',
    agentType: (detail.agentType as Agent['agentType']) || 'http_api',
    mode: (detail.mode as Agent['mode']) || 'SUBAGENT',
    sourceType: (item.sourceType as Agent['sourceType']) || 'internal',
    categoryId: null,
    categoryName: item.categoryName,
    tags: item.tags,
    status: (item.status as Agent['status']) || 'draft',
    specJson: detail.spec ?? {},
    isPublic: true,
    icon:
      typeof detail.spec?.icon === 'string' && detail.spec.icon.trim()
        ? detail.spec.icon.trim()
        : null,
    sortOrder: 0,
    hidden: false,
    maxConcurrency: Number(detail.maxConcurrency ?? 1),
    maxSteps:
      detail.maxSteps != null && Number.isFinite(Number(detail.maxSteps))
        ? Number(detail.maxSteps)
        : null,
    temperature:
      detail.temperature != null && Number.isFinite(Number(detail.temperature))
        ? Number(detail.temperature)
        : null,
    systemPrompt: detail.systemPrompt ?? null,
    qualityScore: 0,
    avgLatencyMs: 0,
    successRate: 0,
    callCount: Number(item.callCount ?? 0),
    createTime: item.updateTime || '',
    updateTime: item.updateTime || '',
    createdBy,
    createdByName: item.createdByName ?? undefined,
    ratingAvg: item.ratingAvg ?? undefined,
    reviewCount: item.reviewCount != null ? Number(item.reviewCount) : undefined,
    viewCount: Number(item.viewCount ?? 0),
    observability: item.observability,
    endpoint: detail.endpoint ? String(detail.endpoint) : undefined,
    invokeType: detail.invokeType ? String(detail.invokeType) : undefined,
    launchUrl: detail.launchUrl ? String(detail.launchUrl) : undefined,
    agentExposure: detail.agentExposure,
    agentDeliveryMode: detail.agentDeliveryMode,
    serviceDetailMd: detail.serviceDetailMd,
  };
}

function deprecatedWriteError<T>(): Promise<T> {
  return Promise.reject(
    new ApiException({
      code: 1004,
      status: 410,
      message: '接口已下线，请迁移到统一网关接口',
    }),
  );
}

function catalogSortBy(raw: string | undefined): ResourceCatalogQueryRequest['sortBy'] | undefined {
  if (raw === 'callCount' || raw === 'rating' || raw === 'publishedAt' || raw === 'name') return raw;
  return undefined;
}

export const agentService = {
  list: async (query?: AgentListQuery): Promise<PaginatedData<Agent>> => {
    const page = await resourceCatalogService.list({
      page: query?.page,
      pageSize: query?.pageSize,
      keyword: query?.keyword,
      status: query?.status,
      resourceType: 'agent',
      sortBy: catalogSortBy(query?.sortBy),
      sortOrder: query?.sortOrder,
      tags: query?.tags,
      include: 'observability',
    });
    return {
      ...page,
      list: page.list.map(mapCatalogItemToAgent),
    };
  },

  getById: async (id: number): Promise<Agent> => {
    const data = await resourceCatalogService.getByTypeAndId('agent', id, 'observability');
    return mapCatalogItemToAgent(data);
  },

  create: (_payload: AgentCreatePayload): Promise<Agent> => deprecatedWriteError<Agent>(),

  update: (_id: number, _payload: AgentUpdatePayload): Promise<Agent> => deprecatedWriteError<Agent>(),

  remove: (_id: number): Promise<void> => deprecatedWriteError<void>(),
};
