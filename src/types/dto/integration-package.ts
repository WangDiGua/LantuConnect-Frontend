export interface IntegrationPackageItemDTO {
  resourceType: string;
  resourceId: number;
}

export interface IntegrationPackageVO {
  id: string;
  name: string;
  description?: string | null;
  status: string;
  createdBy?: string | null;
  createTime?: string | null;
  updateTime?: string | null;
  items: IntegrationPackageItemDTO[];
}

export interface IntegrationPackageUpsertPayload {
  name: string;
  description?: string | null;
  status?: string | null;
  items: IntegrationPackageItemDTO[];
}
