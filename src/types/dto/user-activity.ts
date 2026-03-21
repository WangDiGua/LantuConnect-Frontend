export interface UsageRecord {
  id: number;
  agentName: string;
  displayName: string;
  type: 'agent' | 'skill' | 'app';
  action: string;
  inputPreview: string;
  outputPreview: string;
  tokenCost: number;
  latencyMs: number;
  status: 'success' | 'failed';
  createTime: string;
}

export interface FavoriteItem {
  id: number;
  targetType: 'agent' | 'skill' | 'app';
  targetId: number;
  displayName: string;
  description: string;
  icon: string | null;
  createTime: string;
}

export interface UserUsageStats {
  todayCalls: number;
  weekCalls: number;
  monthCalls: number;
  totalCalls: number;
  tokensUsed: number;
  favoriteCount: number;
  recentDays: { date: string; calls: number }[];
}

export interface MyPublishItem {
  id: number;
  displayName: string;
  description: string;
  icon: string | null;
  status: 'draft' | 'pending_review' | 'testing' | 'published' | 'rejected';
  callCount: number;
  qualityScore: number;
  createTime: string;
  updateTime: string;
}
