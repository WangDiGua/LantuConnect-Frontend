// 数据集

export type DatasetSourceType = 'department' | 'knowledge' | 'third_party';
export type DatasetDataType = 'document' | 'structured' | 'image' | 'audio' | 'video' | 'mixed';
export type DatasetStatus = 'draft' | 'published' | 'testing' | 'deprecated';

export interface Dataset {
  id: number;
  datasetName: string;
  displayName: string;
  description: string;
  sourceType: DatasetSourceType;
  dataType: DatasetDataType;
  format: string;
  recordCount: number;
  fileSize: number;
  categoryId: number | null;
  categoryName?: string;
  status: DatasetStatus;
  tags: string[];
  isPublic: boolean;
  allowedDepartments: number[];
  relatedAgentIds: number[];
  createTime: string;
  updateTime: string;
}

export interface DatasetCreatePayload {
  datasetName: string;
  displayName: string;
  description: string;
  sourceType: DatasetSourceType;
  dataType: DatasetDataType;
  format: string;
  recordCount?: number;
  fileSize?: number;
  categoryId?: number;
  tags?: string[];
  isPublic?: boolean;
  allowedDepartments?: number[];
}

export interface DatasetUpdatePayload extends Partial<DatasetCreatePayload> {
  status?: DatasetStatus;
}

export interface DatasetListQuery {
  page?: number;
  pageSize?: number;
  keyword?: string;
  status?: DatasetStatus;
  sourceType?: DatasetSourceType;
  dataType?: DatasetDataType;
  categoryId?: number;
}
