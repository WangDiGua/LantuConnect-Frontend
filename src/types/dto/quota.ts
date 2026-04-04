export type QuotaResourceCategory = 'all' | 'agent' | 'skill' | 'mcp' | 'app' | 'dataset';

export interface QuotaItem {
  id: number;
  targetType: 'user' | 'department' | 'global';
  targetId: number | null;
  targetName: string;
  resourceCategory: QuotaResourceCategory;
  dailyLimit: number;
  monthlyLimit: number;
  dailyUsed: number;
  monthlyUsed: number;
  enabled: boolean;
  createTime: string;
  updateTime: string;
}

export interface QuotaCreatePayload {
  subjectType: 'user' | 'department' | 'global';
  subjectName: string;
  subjectId?: string;
  resourceCategory?: QuotaResourceCategory;
  dailyLimit: number;
  monthlyLimit: number;
}

export type ResourceRateLimitTarget = 'agent' | 'skill' | 'mcp' | 'app' | 'dataset';

export interface RateLimitItem {
  id: number;
  name: string;
  targetType: ResourceRateLimitTarget | 'quota' | 'global';
  targetId: number | null;
  targetName: string;
  maxRequestsPerMin: number;
  maxRequestsPerHour: number;
  maxConcurrent: number;
  enabled: boolean;
  createTime: string;
  updateTime: string;
}

export interface RateLimitCreatePayload {
  name: string;
  targetType: ResourceRateLimitTarget;
  targetId: number;
  targetName: string;
  maxRequestsPerMin: number;
  maxRequestsPerHour: number;
  maxConcurrent: number;
}
