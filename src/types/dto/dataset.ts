// 数据集

import type { ResourceCatalogQueryRequest } from './catalog';

export type DatasetSourceType = 'department' | 'knowledge' | 'third_party';
export type DatasetDataType = 'document' | 'structured' | 'image' | 'audio' | 'video' | 'mixed';
export type DatasetStatus = 'draft' | 'published' | 'testing' | 'deprecated';

export interface Dataset {
  id: number;
  name: string;
  displayName?: string;
  datasetName?: string;
  code?: string;
  description: string;
  sourceType?: DatasetSourceType;
  dataType?: DatasetDataType;
  format?: string;
  recordCount?: number;
  fileSize?: number;
  relatedAgentIds?: number[];
  providerId: number | null;
  categoryId: number | null;
  categoryName?: string;
  status: DatasetStatus;
  publishStatus?: string;
  tags?: string[];
  isPublic: boolean;
  createdBy?: number;
  createdByName?: string;
  /** 目录聚合；无评论时可为 null */
  ratingAvg?: number | null;
  reviewCount?: number | null;
  /** 市场详情「数据集介绍」Markdown */
  serviceDetailMd?: string;
  createTime: string;
  updateTime: string;
  deleted?: number;
}

export interface DatasetCreatePayload {
  name?: string;
  datasetName?: string;
  displayName?: string;
  code?: string;
  description?: string;
  providerId?: number;
  categoryId?: number;
  sourceType?: DatasetSourceType;
  dataType?: DatasetDataType;
  format?: string;
  recordCount?: number;
  fileSize?: number;
  tags?: string[];
  isPublic?: boolean;
  relatedAgentIds?: number[];
  status?: DatasetStatus;
  publishStatus?: string;
  createdBy?: number;
  deptIds?: number[];
  agentIds?: number[];
  tagIds?: number[];
}

export interface DatasetUpdatePayload extends Partial<DatasetCreatePayload> {
  status?: DatasetStatus;
}

export interface DatasetListQuery {
  page?: number;
  pageSize?: number;
  keyword?: string;
  name?: string;
  categoryId?: number;
  providerId?: number;
  status?: DatasetStatus;
  sourceType?: DatasetSourceType;
  dataType?: DatasetDataType;
  publishStatus?: string;
  tags?: string[];
  sortBy?: ResourceCatalogQueryRequest['sortBy'];
  sortOrder?: ResourceCatalogQueryRequest['sortOrder'];
}
