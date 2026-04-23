export interface ExploreResourceItem {
  resourceType: string;
  resourceId: string;
  resourceCode?: string;
  displayName: string;
  description: string;
  status?: string;
  icon?: string;
  categoryName?: string;
  /** 后端可能返回 null（尚无调用统计） */
  callCount: number | null;
  /** 后端可能返回 null（尚无评分） */
  rating: number | null;
  favoriteCount?: number | null;
  reviewCount?: number | null;
  /** 探索页「为你推荐」等场景由后端生成的说明 */
  reason?: string | null;
  author?: string | null;
  publishedAt: string;
}

export interface AnnouncementItem {
  id: string | number;
  title: string;
  summary: string;
  content?: string;
  type: 'feature' | 'maintenance' | 'update' | 'notice';
  pinned?: boolean;
  enabled?: boolean;
  createdBy?: number | string;
  createdByName?: string;
  deleted?: number | boolean;
  createdAt: string;
  updatedAt?: string;
  url?: string;
}

export interface ContributorItem {
  userId: string;
  username: string;
  userName?: string;
  avatar?: string;
  resourceCount: number;
  totalCalls: number;
  weeklyNewResources?: number;
  weeklyCalls?: number;
  likeCount?: number;
}

export type PlatformStatTrendDirection = 'up' | 'flat' | 'down';

export interface PlatformStatTrend {
  today: number;
  yesterday: number;
  delta: number;
  direction: PlatformStatTrendDirection;
  basis?: string;
}

export interface ExploreHubData {
  platformStats: {
    totalResources: number;
    totalAgents: number;
    totalSkills: number;
    totalMcps: number;
    totalApps: number;
    totalDatasets: number;
    totalDevelopers: number;
    totalUsers: number;
    activeUsersToday?: number;
    activeUsersYesterday?: number;
    totalCallsToday: number;
    totalCallsYesterday?: number;
    callsTrend7d: { day: string; calls: number }[];
    newResourcesTrend7d: { day: string; count: number }[];
    byType: { type: string; cnt: number }[];
    trends?: Record<string, PlatformStatTrend>;
  };
  trendingResources: ExploreResourceItem[];
  recentPublished: ExploreResourceItem[];
  recommendedForUser: ExploreResourceItem[];
  announcements: AnnouncementItem[];
  topContributors: ContributorItem[];
}

export interface AdminRealtimeData {
  todayCalls: number;
  todayErrors: number;
  avgLatencyMs: number;
  activeUsers: number;
  callTrend: { hour: string; calls: number; errors: number }[];
  resourceTrend: { date: string; registrations: number }[];
  userGrowth: { date: string; newUsers: number; totalUsers: number }[];
  pendingAudits: number;
  activeAlerts: number;
  topResourcesByCall: { name: string; type: string; calls: number; successRate?: number }[];
  systemHealth: { component: string; status: 'healthy' | 'degraded' | 'down' }[];
  /** 各类型已发布资源存量（t_resource 未删除） */
  publishedResourceCounts?: Partial<Record<'agent' | 'skill' | 'mcp' | 'app' | 'dataset', number>>;
  /** 近 7 日按 resource_type 网关调用量 */
  callsByResourceType7d?: { type: string; calls: number }[];
}

export interface UserDashboardData {
  quotaUsage: {
    dailyLimit: number;
    dailyUsed: number;
    monthlyLimit: number;
    monthlyUsed: number;
  };
  myResources: {
    draft: number;
    pendingReview: number;
    published: number;
    total: number;
  };
  /** 与 /dashboard/user-dashboard 一致：action 为行为；resourceType 为 agent/skill 等 */
  recentActivity: {
    action: 'invoke' | 'publish' | 'favorite' | 'review' | string;
    resourceName: string;
    resourceType: string;
    timestamp: string;
  }[];
  unreadNotifications: number;
}

/**
 * GET /catalog/resources/{type}/{id}/stats — 与后端 ResourceStatsVO 对齐。
 */
export interface ResourceStatsVO {
  callCount: number;
  successRate: number;
  /** 无评论时后端为 null */
  rating: number | null;
  favoriteCount: number;
  /** 后端 callTrend 为 day + cnt，前端统一为 date + calls */
  callTrend: { date: string; calls: number }[];
  relatedResources: ExploreResourceItem[];
}

export interface SearchSuggestion {
  resourceType: string;
  resourceId: string;
  displayName: string;
  description?: string;
  icon?: string;
}

export interface AnnouncementCreateRequest {
  title: string;
  summary: string;
  content?: string;
  type: 'feature' | 'maintenance' | 'update' | 'notice';
  pinned?: boolean;
  /** 是否对用户端（探索页等）展示；默认 true */
  enabled?: boolean;
}

export interface DeveloperStatistics {
  totalCalls: number;
  todayCalls: number;
  errorRate: number;
  avgLatencyMs: number;
  callsByDay: { date: string; calls: number; errors: number }[];
  topResources: { name: string; type: string; calls: number }[];
  apiKeyUsage: { keyPrefix: string; calls: number; lastUsed: string }[];
}

export interface SessionItem {
  id: string;
  device: string;
  os: string;
  browser: string;
  ip: string;
  location: string;
  loginAt: string;
  lastActiveAt: string;
  current: boolean;
}

export interface TagUpdateRequest {
  name?: string;
  category?: string;
}
