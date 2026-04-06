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
  /** 审批通过后写入的资源授权 ID，用于待办「撤回授权」 */
  createdGrantId?: number | null;
  expiresAt?: string;
  createTime?: string;
}
