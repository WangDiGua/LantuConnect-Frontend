import { ApiException } from '../../types/api';
import type { PaginatedData } from '../../types/api';
import type {
  EmbedType,
  SmartApp,
  SmartAppCreatePayload,
  SmartAppUpdatePayload,
  SmartAppListQuery,
} from '../../types/dto/smart-app';
import { resourceCatalogService } from './resource-catalog.service';
import type { CatalogResourceDetailVO, ResourceCatalogItemVO } from '../../types/dto/catalog';

function deprecatedWriteError<T>(): Promise<T> {
  return Promise.reject(
    new ApiException({
      code: 1004,
      status: 410,
      message: '接口已下线，请迁移到统一网关接口',
    }),
  );
}

function parseEmbedFromSpec(spec: Record<string, unknown> | undefined): EmbedType {
  const raw = spec && typeof spec.embedType === 'string' ? spec.embedType.trim().toLowerCase() : '';
  if (raw === 'iframe' || raw === 'redirect' || raw === 'micro_frontend') {
    return raw;
  }
  return 'redirect';
}

function toSmartApp(item: ResourceCatalogItemVO | CatalogResourceDetailVO): SmartApp {
  const id = Number(item.resourceId) || 0;
  const createdBy =
    item.createdBy != null && Number.isFinite(Number(item.createdBy)) ? Number(item.createdBy) : undefined;
  const detail = item as CatalogResourceDetailVO;
  const spec = detail.spec && typeof detail.spec === 'object' && !Array.isArray(detail.spec)
    ? (detail.spec as Record<string, unknown>)
    : undefined;
  const embedType = parseEmbedFromSpec(spec);
  const icon =
    spec && typeof spec.icon === 'string' && spec.icon.trim()
      ? spec.icon.trim()
      : null;
  const screenshots =
    spec && Array.isArray(spec.screenshots) ? spec.screenshots.map((x) => String(x)) : [];
  const endpointUrl = typeof detail.endpoint === 'string' && detail.endpoint.trim() ? detail.endpoint.trim() : '';
  return {
    id,
    appName: item.resourceCode || `app-${item.resourceId}`,
    displayName: item.displayName || item.resourceCode || String(item.resourceId),
    description: item.description || '',
    appUrl: endpointUrl,
    embedType,
    icon,
    screenshots,
    categoryId: null,
    categoryName: item.categoryName,
    tags: item.tags,
    sourceType: (item.sourceType as SmartApp['sourceType']) || 'internal',
    status: (item.status as SmartApp['status']) || 'draft',
    isPublic: true,
    sortOrder: 0,
    createTime: item.updateTime || '',
    updateTime: item.updateTime || '',
    createdBy,
    createdByName: item.createdByName ?? undefined,
    ratingAvg: item.ratingAvg ?? undefined,
    reviewCount: item.reviewCount != null ? Number(item.reviewCount) : undefined,
    usageCount: Number(item.usageCount ?? 0),
    viewCount: Number(item.viewCount ?? 0),
    serviceDetailMd: detail.serviceDetailMd,
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
