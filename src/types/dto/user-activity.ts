export interface UsageRecord {
  id: number;
  agentName: string;
  displayName: string;
  type: 'agent' | 'skill' | 'app' | 'mcp' | 'dataset';
  action: string;
  inputPreview: string;
  outputPreview: string;
  latencyMs: number;
  status: 'success' | 'failed';
  createTime: string;
}

export interface FavoriteItem {
  id: number;
  targetType: 'agent' | 'skill' | 'app' | 'mcp' | 'dataset';
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
  favoriteCount: number;
  recentDays: { date: string; calls: number }[];
  byTargetType: { type: string; calls: number }[];
}

export interface RecentUseItem {
  id: number;
  targetType: 'agent' | 'skill' | 'app' | 'dataset' | 'mcp';
  targetId: number;
  targetCode?: string;
  displayName: string;
  description?: string;
  action?: string;
  status?: 'success' | 'failed' | string;
  latencyMs?: number;
  createTime?: string;
  lastUsedTime?: string;
}

/** 发布列表卡片项（可由 /user/my-agents 等或统一资源中心 `/resource-center/resources/mine` 映射而来；五类资源结构一致） */
export interface MyPublishItem {
  id: number;
  displayName: string;
  description: string;
  icon: string | null;
  status: 'draft' | 'pending_review' | 'published' | 'rejected' | 'deprecated' | 'merged_live';
  /** 发布态下是否存在待审变更（允许撤回审核） */
  pendingPublishedUpdate?: boolean;
  callCount: number;
  qualityScore: number;
  createTime: string;
  updateTime: string;
}
