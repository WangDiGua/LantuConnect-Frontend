import { http } from '../../lib/http';
import { extractArray } from '../../utils/normalizeApiPayload';
import type {
  AdminOverview,
  UserWorkspace,
  HealthSummary,
  UsageStatsData,
  DataReportsData,
} from '../../types/dto/dashboard';
import type { ExploreHubData, AdminRealtimeData, UserDashboardData, AnnouncementItem } from '../../types/dto/explore';

function toRecentItem(raw: any) {
  return {
    id: Number(raw?.id ?? raw?.resourceId ?? 0) || 0,
    displayName: String(raw?.displayName ?? raw?.agentName ?? raw?.skillName ?? raw?.name ?? '未命名资源'),
    icon: raw?.icon ? String(raw.icon) : null,
    lastUsedTime: String(raw?.lastUsedTime ?? raw?.updateTime ?? raw?.createTime ?? new Date().toISOString()),
  };
}

function num(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeUsageStatsData(raw: unknown): UsageStatsData {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const pointsRaw = extractArray(o.points);
  const points = pointsRaw.map((p: any) => ({
    date: String(p?.date ?? p?.statDate ?? p?.day ?? ''),
    calls: num(p?.calls ?? p?.callCount ?? p?.invokeCount),
    tokens: num(p?.tokens ?? p?.tokenCount ?? p?.totalTokens),
    users: num(p?.users ?? p?.activeUsers ?? p?.userCount),
  }));
  return {
    range: String(o.range ?? '7d'),
    points,
    totalCalls: num(o.totalCalls ?? o.total_calls),
    totalTokens: num(o.totalTokens ?? o.total_tokens),
    activeUsers: num(o.activeUsers ?? o.active_users),
  };
}

function normalizeUserWorkspace(raw: unknown): UserWorkspace {
  const r = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  return {
    recentAgents: extractArray(r.recentAgents).map(toRecentItem),
    recentSkills: extractArray(r.recentSkills).map(toRecentItem),
    favoriteCount: Number(r.favoriteCount ?? 0) || 0,
    totalUsageToday: Number(r.totalUsageToday ?? r.todayCalls ?? 0) || 0,
    quickActions: extractArray<{ label?: string; route?: string; icon?: string }>(r.quickActions)
      .map((item) => ({
        label: String(item?.label ?? ''),
        route: String(item?.route ?? ''),
        icon: String(item?.icon ?? ''),
      }))
      .filter((item) => item.label),
  };
}

function normalizeAdminOverview(raw: unknown): AdminOverview {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const hs = o.healthSummary && typeof o.healthSummary === 'object' ? (o.healthSummary as Record<string, unknown>) : {};
  return {
    kpis: extractArray(o.kpis),
    healthSummary: {
      healthy: num(hs.healthy),
      warning: num(hs.warning),
      down: num(hs.down),
    },
    recentRegistrations: extractArray(o.recentRegistrations),
  };
}

function normalizeHealthSummary(raw: unknown): HealthSummary {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  return {
    totalAgents: num(o.totalAgents),
    healthy: num(o.healthy),
    degraded: num(o.degraded),
    down: num(o.down),
    avgLatencyMs: num(o.avgLatencyMs),
    avgSuccessRate: num(o.avgSuccessRate),
    recentIncidents: extractArray(o.recentIncidents),
  };
}

function normalizeDataReportsData(raw: unknown): DataReportsData {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  return {
    range: String(o.range ?? '7d'),
    topAgents: extractArray(o.topAgents),
    topSkills: extractArray(o.topSkills),
    departmentUsage: extractArray(o.departmentUsage),
  };
}

function normalizeExploreHubData(raw: unknown): ExploreHubData {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const ps = o.platformStats && typeof o.platformStats === 'object' ? (o.platformStats as Record<string, unknown>) : {};
  const callsTrend7d = extractArray(ps.callsTrend7d ?? (ps as { calls_trend_7d?: unknown }).calls_trend_7d ?? (ps as { trend7d?: unknown }).trend7d)
    .map((item: unknown) => {
      const x = item && typeof item === 'object' ? (item as Record<string, unknown>) : {};
      return {
        day: String(x.day ?? x.date ?? ''),
        calls: num(x.calls ?? x.cnt ?? x.count),
      };
    });
  const newResourcesTrend7d = extractArray(
    ps.newResourcesTrend7d
    ?? (ps as { new_resources_trend_7d?: unknown }).new_resources_trend_7d
    ?? (ps as { resourceTrend7d?: unknown }).resourceTrend7d,
  ).map((item: unknown) => {
    const x = item && typeof item === 'object' ? (item as Record<string, unknown>) : {};
    return {
      day: String(x.day ?? x.date ?? ''),
      count: num(x.count ?? x.cnt ?? x.total),
    };
  });
  const byType = extractArray(ps.byType ?? (ps as { by_type?: unknown }).by_type).map((item: unknown) => {
    const x = item && typeof item === 'object' ? (item as Record<string, unknown>) : {};
    return {
      type: String(x.type ?? x.targetType ?? '').toLowerCase(),
      cnt: num(x.cnt ?? x.count ?? x.total),
    };
  });
  const announcements = extractArray(o.announcements).map((item: unknown) => {
    const a = item && typeof item === 'object' ? (item as Record<string, unknown>) : {};
    return {
      id: String(a.id ?? ''),
      title: String(a.title ?? ''),
      summary: String(a.summary ?? ''),
      content: a.content == null ? undefined : String(a.content),
      type: String(a.type ?? 'notice') as AnnouncementItem['type'],
      pinned: a.pinned == null ? undefined : Boolean(a.pinned),
      enabled: a.enabled == null ? undefined : Boolean(a.enabled),
      createdBy: a.createdBy == null ? undefined : String(a.createdBy),
      createdByName: a.createdByName == null ? undefined : String(a.createdByName),
      deleted: a.deleted == null ? undefined : Number(a.deleted),
      createdAt: String(a.createdAt ?? a.createTime ?? ''),
      updatedAt: String(a.updatedAt ?? a.updateTime ?? ''),
      url: a.url == null ? undefined : String(a.url),
    } satisfies AnnouncementItem;
  });
  return {
    platformStats: {
      totalResources: num(ps.totalResources ?? (ps as { total_resources?: unknown }).total_resources),
      totalAgents: num(ps.totalAgents),
      totalSkills: num(ps.totalSkills),
      totalMcps: num(ps.totalMcps ?? (ps as { totalMcp?: unknown }).totalMcp ?? (ps as { totalMcpServers?: unknown }).totalMcpServers ?? (ps as { total_mcp_servers?: unknown }).total_mcp_servers),
      totalApps: num(ps.totalApps),
      totalDatasets: num(ps.totalDatasets),
      totalUsers: num(ps.totalUsers),
      totalCallsToday: num(ps.totalCallsToday),
      callsTrend7d,
      newResourcesTrend7d,
      byType,
    },
    trendingResources: extractArray(o.trendingResources),
    recentPublished: extractArray(o.recentPublished),
    recommendedForUser: extractArray(o.recommendedForUser),
    announcements,
    topContributors: extractArray(o.topContributors),
  };
}

function normalizeAdminRealtime(raw: unknown): AdminRealtimeData {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  return {
    todayCalls: num(o.todayCalls),
    todayErrors: num(o.todayErrors),
    avgLatencyMs: num(o.avgLatencyMs),
    activeUsers: num(o.activeUsers),
    callTrend: extractArray(o.callTrend),
    resourceTrend: extractArray(o.resourceTrend),
    userGrowth: extractArray(o.userGrowth),
    pendingAudits: num(o.pendingAudits),
    activeAlerts: num(o.activeAlerts),
    topResourcesByCall: extractArray(o.topResourcesByCall),
    systemHealth: extractArray(o.systemHealth),
  };
}

function normalizeUserDashboard(raw: unknown): UserDashboardData {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const qu = o.quotaUsage && typeof o.quotaUsage === 'object' ? (o.quotaUsage as Record<string, unknown>) : {};
  const mr = o.myResources && typeof o.myResources === 'object' ? (o.myResources as Record<string, unknown>) : {};
  return {
    quotaUsage: {
      dailyLimit: num(qu.dailyLimit),
      dailyUsed: num(qu.dailyUsed),
      monthlyLimit: num(qu.monthlyLimit),
      monthlyUsed: num(qu.monthlyUsed),
    },
    myResources: {
      draft: num(mr.draft),
      pendingReview: num(mr.pendingReview),
      published: num(mr.published),
      total: num(mr.total),
    },
    recentActivity: extractArray(o.recentActivity),
    unreadNotifications: num(o.unreadNotifications),
  };
}

export const dashboardService = {
  getAdminOverview: async () => {
    const raw = await http.get<unknown>('/dashboard/admin-overview');
    return normalizeAdminOverview(raw);
  },

  getUserWorkspace: async () => {
    const raw = await http.get<unknown>('/dashboard/user-workspace');
    return normalizeUserWorkspace(raw);
  },

  getHealthSummary: async () => {
    const raw = await http.get<unknown>('/dashboard/health-summary');
    return normalizeHealthSummary(raw);
  },

  getUsageStats: async (range: string) => {
    const raw = await http.get<unknown>('/dashboard/usage-stats', { params: { range } });
    return normalizeUsageStatsData(raw);
  },

  getDataReports: async (range: string, params?: { startDate?: string; endDate?: string }) => {
    const raw = await http.get<unknown>('/dashboard/data-reports', { params: { range, ...params } });
    return normalizeDataReportsData(raw);
  },

  getExploreHub: async () => {
    const raw = await http.get<unknown>('/dashboard/explore-hub');
    return normalizeExploreHubData(raw);
  },

  getAdminRealtime: async () => {
    const raw = await http.get<unknown>('/dashboard/admin-realtime');
    return normalizeAdminRealtime(raw);
  },

  getUserDashboard: async () => {
    const raw = await http.get<unknown>('/dashboard/user-dashboard');
    return normalizeUserDashboard(raw);
  },
};
