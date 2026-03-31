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
}

export interface ExploreHubData {
  platformStats: {
    totalResources: number;
    totalAgents: number;
    totalSkills: number;
    totalMcps: number;
    totalApps: number;
    totalDatasets: number;
    totalUsers: number;
    totalCallsToday: number;
    callsTrend7d: { day: string; calls: number }[];
    newResourcesTrend7d: { day: string; count: number }[];
    byType: { type: string; cnt: number }[];
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
  topResourcesByCall: { name: string; type: string; calls: number }[];
  systemHealth: { component: string; status: 'healthy' | 'degraded' | 'down' }[];
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

export interface ResourceStatsVO {
  totalCalls: number;
  todayCalls: number;
  successRate: number;
  avgLatencyMs: number;
  favoriteCount: number;
  reviewCount: number;
  averageRating: number;
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
