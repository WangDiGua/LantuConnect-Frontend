import { ApiException } from '../../types/api';
import type { PaginatedData } from '../../types/api';
import type {
  SmartApp,
  SmartAppCreatePayload,
  SmartAppUpdatePayload,
  SmartAppListQuery,
} from '../../types/dto/smart-app';
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

function toSmartApp(item: ResourceCatalogItemVO): SmartApp {
  const id = Number(item.resourceId) || 0;
  return {
    id,
    appName: item.resourceCode || `app-${item.resourceId}`,
    displayName: item.displayName || item.resourceCode || String(item.resourceId),
    description: item.description || '',
    appUrl: '',
    embedType: 'redirect',
    icon: null,
    screenshots: [],
    categoryId: null,
    categoryName: item.categoryName,
    tags: item.tags,
    sourceType: (item.sourceType as SmartApp['sourceType']) || 'internal',
    status: (item.status as SmartApp['status']) || 'draft',
    isPublic: true,
    sortOrder: 0,
    createTime: item.updateTime || '',
    updateTime: item.updateTime || '',
  };
}

export const smartAppService = {
  list: async (params?: SmartAppListQuery): Promise<PaginatedData<SmartApp>> => {
    const page = await resourceCatalogService.list({
      page: params?.page,
      pageSize: params?.pageSize,
      keyword: params?.keyword,
      status: params?.status,
      resourceType: 'app',
      tags: params?.tags,
    });
    return { ...page, list: page.list.map(toSmartApp) };
  },

  getById: async (id: number): Promise<SmartApp> => {
    const data = await resourceCatalogService.getByTypeAndId('app', id);
    return toSmartApp(data);
  },

  create: (_data: SmartAppCreatePayload): Promise<SmartApp> => deprecatedWriteError<SmartApp>(),

  update: (_id: number, _data: SmartAppUpdatePayload): Promise<SmartApp> => deprecatedWriteError<SmartApp>(),

  remove: (_id: number): Promise<void> => deprecatedWriteError<void>(),
};
