import { ApiException } from '../../types/api';
import type { PaginatedData } from '../../types/api';
import type {
  Dataset,
  DatasetCreatePayload,
  DatasetUpdatePayload,
  DatasetListQuery,
} from '../../types/dto/dataset';
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

function toDataset(item: ResourceCatalogItemVO): Dataset {
  const id = Number(item.resourceId) || 0;
  return {
    id,
    name: item.displayName || item.resourceCode || String(item.resourceId),
    code: item.resourceCode || String(item.resourceId),
    description: item.description || '',
    providerId: null,
    categoryId: null,
    categoryName: item.categoryName,
    tags: item.tags,
    status: (item.status as Dataset['status']) || 'draft',
    isPublic: true,
    createdBy: (item as any).createdBy ? Number((item as any).createdBy) : undefined,
    createdByName: (item as any).createdByName ? String((item as any).createdByName) : undefined,
    createTime: item.updateTime || '',
    updateTime: item.updateTime || '',
    datasetName: item.resourceCode || '',
    displayName: item.displayName || item.resourceCode || String(item.resourceId),
    sourceType: undefined,
    dataType: undefined,
    format: undefined,
    recordCount: undefined,
    fileSize: undefined,
    relatedAgentIds: undefined,
  };
}

export const datasetService = {
  list: async (params?: DatasetListQuery): Promise<PaginatedData<Dataset>> => {
    const page = await resourceCatalogService.list({
      page: params?.page,
      pageSize: params?.pageSize,
      keyword: params?.keyword ?? params?.name,
      status: params?.status,
      resourceType: 'dataset',
      tags: params?.tags,
    });
    return { ...page, list: page.list.map(toDataset) };
  },

  getById: async (id: number): Promise<Dataset> => {
    const data = await resourceCatalogService.getByTypeAndId('dataset', id);
    return toDataset(data);
  },

  create: (_data: DatasetCreatePayload): Promise<Dataset> => deprecatedWriteError<Dataset>(),

  update: (_id: number, _data: DatasetUpdatePayload): Promise<Dataset> => deprecatedWriteError<Dataset>(),

  remove: (_id: number): Promise<void> => deprecatedWriteError<void>(),

  applyAccess: (_id: number): Promise<void> => deprecatedWriteError<void>(),
};
