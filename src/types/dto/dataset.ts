// 数据集

export type DatasetSourceType = 'department' | 'knowledge' | 'third_party';
export type DatasetDataType = 'document' | 'structured' | 'image' | 'audio' | 'video' | 'mixed';
export type DatasetStatus = 'draft' | 'published' | 'testing' | 'deprecated';

export interface Dataset {
  id: number;
  name: string;
  code?: string;
  description: string;
  providerId: number | null;
  categoryId: number | null;
  categoryName?: string;
  status: DatasetStatus;
  publishStatus?: string;
  tags?: string[];
  isPublic: boolean;
  createdBy?: number;
  createTime: string;
  updateTime: string;
  deleted?: number;
}

export interface DatasetCreatePayload {
  name: string;
  code?: string;
  description?: string;
  providerId: number;
  categoryId?: number;
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
  name?: string;
  categoryId?: number;
  providerId?: number;
  status?: DatasetStatus;
  publishStatus?: string;
}
