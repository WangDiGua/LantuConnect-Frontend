import { ApiException } from '../../types/api';
import type { PaginatedData } from '../../types/api';
import type {
  Skill,
  SkillCreatePayload,
  SkillUpdatePayload,
  SkillListQuery,
  McpServer,
} from '../../types/dto/skill';
import { invokeService } from './invoke.service';
import { resourceCatalogService } from './resource-catalog.service';
import type { ResourceCatalogItemVO } from '../../types/dto/catalog';

function deprecatedWriteError<T>(): Promise<T> {
  return Promise.reject(
    new ApiException({
      code: 1004,
      status: 410,
      message: '接口已下线，请迁移到统一网关接口',
    }),
  );
}

function toSkill(item: ResourceCatalogItemVO): Skill {
  const id = Number(item.resourceId) || 0;
  const createdBy =
    item.createdBy != null && Number.isFinite(Number(item.createdBy)) ? Number(item.createdBy) : undefined;
  return {
    id,
    agentName: item.resourceCode || `skill-${item.resourceId}`,
    displayName: item.displayName || item.resourceCode || String(item.resourceId),
    description: item.description || '',
    agentType: 'builtin',
    mode: 'TOOL',
    parentId: null,
    sourceType: (item.sourceType as Skill['sourceType']) || 'internal',
    providerId: null,
    categoryId: null,
    categoryName: item.categoryName,
    tags: item.tags,
    status: (item.status as Skill['status']) || 'draft',
    displayTemplate: null,
    specJson: {},
    parametersSchema: null,
    isPublic: true,
    icon: null,
    sortOrder: 0,
    maxConcurrency: 1,
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

export const skillService = {
  list: async (params?: SkillListQuery): Promise<PaginatedData<Skill>> => {
    const page = await resourceCatalogService.list({
      page: params?.page,
      pageSize: params?.pageSize,
      keyword: params?.keyword,
      status: params?.status,
      resourceType: 'skill',
      tags: params?.tags,
    });
    return { ...page, list: page.list.map(toSkill) };
  },

  getById: async (id: number): Promise<Skill> => {
    const data = await resourceCatalogService.getByTypeAndId('skill', id);
    return toSkill(data);
  },

  create: (_data: SkillCreatePayload): Promise<Skill> => deprecatedWriteError<Skill>(),

  update: (_id: number, _data: SkillUpdatePayload): Promise<Skill> => deprecatedWriteError<Skill>(),

  remove: (_id: number): Promise<void> => deprecatedWriteError<void>(),

  listMcpServers: async (): Promise<McpServer[]> => {
    const page = await resourceCatalogService.list({ page: 1, pageSize: 100, resourceType: 'mcp' });
    return page.list.map((item) => ({
      id: Number(item.resourceId) || 0,
      agentName: item.resourceCode || `mcp-${item.resourceId}`,
      displayName: item.displayName || item.resourceCode || String(item.resourceId),
      description: item.description || '',
      specJson: {},
      sourceType: (item.sourceType as McpServer['sourceType']) || 'internal',
      status: (item.status as McpServer['status']) || 'draft',
      skillCount: 0,
      createTime: item.updateTime || '',
    }));
  },

  invoke: async (id: number, params: Record<string, unknown>) => {
    const response = await invokeService.invoke({
      resourceType: 'skill',
      resourceId: String(id),
      payload: params,
    });
    return {
      result: response.body ?? '',
      latencyMs: response.latencyMs ?? 0,
    };
  },
};
