export type DeveloperApplicationStatus = 'pending' | 'approved' | 'rejected' | 'unknown';

export interface DeveloperApplicationCreateRequest {
  contactEmail: string;
  contactPhone?: string;
  companyName?: string;
  applyReason: string;
}

export interface DeveloperApplicationQueryRequest {
  page?: number;
  pageSize?: number;
  status?: string;
  keyword?: string;
}

export interface DeveloperApplicationReviewRequest {
  reviewComment?: string;
}

export interface DeveloperApplicationVO {
  id: number;
  userId?: string;
  username?: string;
  userName?: string;
  contactEmail: string;
  contactPhone?: string;
  companyName?: string;
  applyReason: string;
  reviewComment?: string;
  reviewedByName?: string;
  status: DeveloperApplicationStatus;
  createTime?: string;
  updateTime?: string;
}
