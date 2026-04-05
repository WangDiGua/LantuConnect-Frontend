import { ApiException } from '../../types/api';
import type { PaginatedData } from '../../types/api';
import type {
  Dataset,
  DatasetCreatePayload,
  DatasetDataType,
  DatasetListQuery,
  DatasetSourceType,
  DatasetUpdatePayload,
} from '../../types/dto/dataset';
import { resourceCatalogService } from './resource-catalog.service';
import type { CatalogResourceDetailVO, ResourceCatalogItemVO } from '../../types/dto/catalog';

const DATASET_SOURCE_VALUES: readonly DatasetSourceType[] = ['department', 'knowledge', 'third_party'];
const DATASET_DATA_VALUES: readonly DatasetDataType[] = ['document', 'structured', 'image', 'audio', 'video', 'mixed'];

function parseDatasetSourceType(raw?: string): DatasetSourceType | undefined {
  if (!raw) return undefined;
  const s = raw.trim().toLowerCase();
  return DATASET_SOURCE_VALUES.find((v) => v === s);
}

function parseDatasetDataType(raw?: string): DatasetDataType | undefined {
  if (!raw) return undefined;
  const s = raw.trim().toLowerCase();
  return DATASET_DATA_VALUES.find((v) => v === s);
}

function readSpecField(spec: Record<string, unknown> | undefined, keys: string[]): string | undefined {
  if (!spec) return undefined;
  for (const k of keys) {
    const v = spec[k];
    if (v != null && v !== '') return String(v);
  }
  return undefined;
}

function optCount(v: unknown): number | undefined {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
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

function toDataset(item: ResourceCatalogItemVO): Dataset {
  const id = Number(item.resourceId) || 0;
  const createdBy =
    item.createdBy != null && Number.isFinite(Number(item.createdBy)) ? Number(item.createdBy) : undefined;
  const detail = item as CatalogResourceDetailVO;
  const spec = detail.spec && typeof detail.spec === 'object' ? (detail.spec as Record<string, unknown>) : undefined;
  const sourceRaw =
    item.sourceType ||
    readSpecField(spec, ['sourceType', 'source_type', 'datasetSourceType', 'dataset_source_type']);
  const dataRaw =
    item.dataType || readSpecField(spec, ['dataType', 'data_type', 'datasetDataType', 'dataset_data_type']);
  const formatRaw = item.format || readSpecField(spec, ['format', 'fileFormat', 'file_format']);
  const recordCount =
    item.recordCount ??
    optCount(spec?.recordCount ?? spec?.record_count ?? spec?.rowCount ?? spec?.row_count);
  const fileSize = item.fileSize ?? optCount(spec?.fileSize ?? spec?.file_size ?? spec?.sizeBytes ?? spec?.size_bytes);
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
    createdBy,
    createdByName: item.createdByName ?? undefined,
    ratingAvg: item.ratingAvg ?? undefined,
    reviewCount: item.reviewCount != null ? Number(item.reviewCount) : undefined,
    createTime: item.updateTime || '',
    updateTime: item.updateTime || '',
    datasetName: item.resourceCode || '',
    displayName: item.displayName || item.resourceCode || String(item.resourceId),
    sourceType: parseDatasetSourceType(sourceRaw),
    dataType: parseDatasetDataType(dataRaw),
    format: formatRaw,
    recordCount,
    fileSize,
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
      sortBy: params?.sortBy,
      sortOrder: params?.sortOrder,
      ...(params?.sourceType ? { sourceType: params.sourceType } : {}),
      ...(params?.dataType ? { dataType: params.dataType } : {}),
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
