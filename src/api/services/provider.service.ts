import { ApiException } from '../../types/api';
import type { PaginatedData } from '../../types/api';
import type {
  Provider,
  ProviderCreatePayload,
  ProviderUpdatePayload,
  ProviderListQuery,
} from '../../types/dto/provider';
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

function toProvider(item: ResourceCatalogItemVO): Provider {
  const id = Number(item.resourceId) || 0;
  return {
    id,
    providerCode: item.resourceCode || `provider-${item.resourceId}`,
    providerName: item.displayName || item.resourceCode || String(item.resourceId),
    providerType: 'internal',
    description: item.description || null,
    authType: 'none',
    authConfig: null,
    baseUrl: null,
    status: item.status === 'published' ? 'active' : 'inactive',
    agentCount: 0,
    skillCount: 0,
    createTime: item.updateTime || '',
    updateTime: item.updateTime || '',
  };
}

export const providerService = {
  list: async (params?: ProviderListQuery): Promise<PaginatedData<Provider>> => {
    const page = await resourceCatalogService.list({
      page: params?.page,
      pageSize: params?.pageSize,
      keyword: params?.name,
      status: params?.status,
      resourceType: 'mcp',
    });
    return { ...page, list: page.list.map(toProvider) };
  },

  getById: async (id: number): Promise<Provider> => {
    const data = await resourceCatalogService.getByTypeAndId('mcp', id);
    return toProvider(data);
  },

  create: (_data: ProviderCreatePayload): Promise<Provider> => deprecatedWriteError<Provider>(),

  update: (_id: number, _data: ProviderUpdatePayload): Promise<Provider> => deprecatedWriteError<Provider>(),

  remove: (_id: number): Promise<void> => deprecatedWriteError<void>(),
};
