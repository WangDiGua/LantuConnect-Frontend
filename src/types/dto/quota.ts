export interface QuotaItem {
  id: number;
  targetType: 'user' | 'department' | 'global';
  targetId: number | null;
  targetName: string;
  dailyLimit: number;
  monthlyLimit: number;
  dailyUsed: number;
  monthlyUsed: number;
  enabled: boolean;
  createTime: string;
  updateTime: string;
}

export interface QuotaCreatePayload {
  targetType: 'user' | 'department' | 'global';
  targetId?: number;
  targetName: string;
  dailyLimit: number;
  monthlyLimit: number;
}

export interface RateLimitItem {
  id: number;
  name: string;
  targetType: 'agent' | 'skill' | 'global';
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
  targetType: 'agent' | 'skill' | 'global';
  targetId?: number;
  targetName: string;
  maxRequestsPerMin: number;
  maxRequestsPerHour: number;
  maxConcurrent: number;
}
