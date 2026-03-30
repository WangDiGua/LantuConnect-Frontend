export type GrantApplicationStatus = 'pending' | 'approved' | 'rejected';

export interface GrantApplicationRequest {
  resourceType: string;
  resourceId: number;
  apiKeyId: string;
  actions: string[];
  useCase?: string;
  callFrequency?: string;
  expiresAt?: string;
}

export interface GrantApplicationVO {
  id: number;
  applicantId: number;
  applicantName?: string;
  resourceType: string;
  resourceId: number;
  apiKeyId: string;
  actions: string[];
  useCase?: string;
  callFrequency?: string;
  status: GrantApplicationStatus;
  reviewerId?: number;
  reviewerName?: string;
  rejectReason?: string;
  reviewTime?: string;
  expiresAt?: string;
  createTime?: string;
}
