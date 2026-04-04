import { ApiException } from '../../types/api';
import type { PaginatedData } from '../../types/api';
import type {
  Agent,
  AgentCreatePayload,
  AgentUpdatePayload,
  AgentListQuery,
} from '../../types/dto/agent';
import { resourceCatalogService } from './resource-catalog.service';
import type { ResourceCatalogItemVO, ResourceCatalogQueryRequest } from '../../types/dto/catalog';

function toAgent(item: ResourceCatalogItemVO): Agent {
  const id = Number(item.resourceId) || 0;
  const createdBy =
    item.createdBy != null && Number.isFinite(Number(item.createdBy)) ? Number(item.createdBy) : undefined;
  return {
    id,
    agentName: item.resourceCode || `agent-${item.resourceId}`,
    displayName: item.displayName || item.resourceCode || String(item.resourceId),
    description: item.description || '',
    agentType: 'builtin',
    mode: 'SUBAGENT',
    sourceType: (item.sourceType as Agent['sourceType']) || 'internal',
    providerId: null,
    categoryId: null,
    categoryName: item.categoryName,
    tags: item.tags,
    status: (item.status as Agent['status']) || 'draft',
    specJson: {},
    isPublic: true,
    icon: null,
    sortOrder: 0,
    hidden: false,
    maxConcurrency: 1,
    maxSteps: null,
    temperature: null,
    systemPrompt: null,
    qualityScore: 0,
    avgLatencyMs: 0,
    successRate: 0,
    callCount: 0,
    createTime: item.updateTime || '',
    updateTime: item.updateTime || '',
    createdBy,
    createdByName: item.createdByName ?? undefined,
    ratingAvg: item.ratingAvg ?? undefined,
    reviewCount: item.reviewCount != null ? Number(item.reviewCount) : undefined,
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
    });
    return {
      ...page,
      list: page.list.map(toAgent),
    };
  },

  getById: async (id: number): Promise<Agent> => {
    const data = await resourceCatalogService.getByTypeAndId('agent', id);
    return toAgent(data);
  },

  create: (_payload: AgentCreatePayload): Promise<Agent> => deprecatedWriteError<Agent>(),

  update: (_id: number, _payload: AgentUpdatePayload): Promise<Agent> => deprecatedWriteError<Agent>(),

  remove: (_id: number): Promise<void> => deprecatedWriteError<void>(),
};
