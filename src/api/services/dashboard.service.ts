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

/** 后端 GET /dashboard/user-workspace 为 UserWorkspaceVO：profile、recent[]、widgets */
function normalizeUserWorkspace(raw: unknown): UserWorkspace {
  const r = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const widgets = r.widgets && typeof r.widgets === 'object' ? (r.widgets as Record<string, unknown>) : {};
  const recentRaw = extractArray(r.recent);

  const resourceTypeOf = (row: Record<string, unknown>) =>
    String(row.targetType ?? row.resourceType ?? '').toLowerCase().trim();

  const mapRow = (row: Record<string, unknown>) => ({
    id: num(row.id),
    displayName: String(row.displayName ?? row.targetId ?? row.name ?? '未命名资源'),
    icon: row.icon ? String(row.icon) : null,
    lastUsedTime: String(row.createTime ?? row.lastUsedTime ?? ''),
  });

  const recentAgents = recentRaw
    .filter((item) => resourceTypeOf(item as Record<string, unknown>) === 'agent')
    .map((item) => mapRow(item as Record<string, unknown>));
  const recentSkills = recentRaw
    .filter((item) => resourceTypeOf(item as Record<string, unknown>) === 'skill')
    .map((item) => mapRow(item as Record<string, unknown>));

  return {
    recentAgents,
    recentSkills,
    favoriteCount: num(widgets.favoriteCount),
    totalUsageToday: num(widgets.totalUsageToday ?? widgets.todayCalls),
    unreadNotifications: num(widgets.unreadNotifications),
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
      warning: num(hs.warning ?? hs.degraded),
      degraded: num(hs.degraded ?? hs.warning),
      down: num(hs.down),
    },
    recentRegistrations: extractArray(o.recentRegistrations),
  };
}

function normalizeHealthSummary(raw: unknown): HealthSummary {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const statusDistRaw = o.statusDistribution && typeof o.statusDistribution === 'object'
    ? (o.statusDistribution as Record<string, unknown>)
    : {};
  const statusDistribution: Record<string, number> = {};
  Object.entries(statusDistRaw).forEach(([k, v]) => {
    statusDistribution[k] = num(v);
  });
  const checks = extractArray(o.checks);
  const degradedResources = extractArray(o.degradedResources);
  const healthy = num(statusDistRaw.healthy);
  const degraded = num(statusDistRaw.degraded);
  const down = num(statusDistRaw.down);
  return {
    status: String(o.status ?? ''),
    healthConfigCount: num(o.healthConfigCount),
    circuitBreakersOpen: num(o.circuitBreakersOpen),
    totalAgents: num(o.totalAgents),
    healthy: healthy || num(o.healthy),
    degraded: degraded || num(o.degraded),
    down: down || num(o.down),
    avgLatencyMs: num(o.avgLatencyMs),
    avgSuccessRate: num(o.avgSuccessRate),
    recentIncidents: extractArray(o.recentIncidents),
    checks: checks as Array<Record<string, unknown>>,
    statusDistribution,
    degradedResources: degradedResources as Array<Record<string, unknown>>,
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
  const callTrend = extractArray(o.callTrend).map((item: unknown) => {
    const x = item && typeof item === 'object' ? (item as Record<string, unknown>) : {};
    return {
      hour: String(x.hour ?? x.bucket ?? ''),
      calls: num(x.calls ?? x.cnt ?? x.count),
      errors: num(x.errors ?? x.err ?? 0),
    };
  });
  const resourceTrend = extractArray(o.resourceTrend).map((item: unknown) => {
    const x = item && typeof item === 'object' ? (item as Record<string, unknown>) : {};
    return {
      date: String(x.date ?? x.day ?? ''),
      registrations: num(x.registrations ?? x.cnt ?? x.count),
    };
  });
  const userGrowth = extractArray(o.userGrowth).map((item: unknown) => {
    const x = item && typeof item === 'object' ? (item as Record<string, unknown>) : {};
    return {
      date: String(x.date ?? x.day ?? ''),
      newUsers: num(x.newUsers ?? x.cnt ?? x.count),
      totalUsers: num(x.totalUsers ?? x.total ?? 0),
    };
  });
  const topResourcesByCall = extractArray(o.topResourcesByCall).map((item: unknown) => {
    const x = item && typeof item === 'object' ? (item as Record<string, unknown>) : {};
    return {
      name: String(x.name ?? x.agent_name ?? ''),
      type: String(x.type ?? x.resource_type ?? 'resource'),
      calls: num(x.calls ?? x.cnt ?? x.count),
    };
  });
  const systemHealth = extractArray(o.systemHealth).map((item: unknown) => {
    const x = item && typeof item === 'object' ? (item as Record<string, unknown>) : {};
    const statusRaw = String(x.status ?? x.health_status ?? '').toLowerCase();
    const status = statusRaw === 'healthy' || statusRaw === 'degraded' || statusRaw === 'down' ? statusRaw : 'degraded';
    return {
      component: String(x.component ?? x.name ?? x.display_name ?? ''),
      status: status as 'healthy' | 'degraded' | 'down',
    };
  });
  return {
    todayCalls: num(o.todayCalls),
    todayErrors: num(o.todayErrors),
    avgLatencyMs: num(o.avgLatencyMs),
    activeUsers: num(o.activeUsers),
    callTrend,
    resourceTrend,
    userGrowth,
    pendingAudits: num(o.pendingAudits),
    activeAlerts: num(o.activeAlerts),
    topResourcesByCall,
    systemHealth,
  };
}

function normalizeUserDashboard(raw: unknown): UserDashboardData {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const qu = o.quotaUsage && typeof o.quotaUsage === 'object' ? (o.quotaUsage as Record<string, unknown>) : {};
  const mr = o.myResources && typeof o.myResources === 'object' ? (o.myResources as Record<string, unknown>) : {};
  const recentActivity = extractArray(o.recentActivity).map((item: unknown) => {
    const a = item && typeof item === 'object' ? (item as Record<string, unknown>) : {};
    const actionRaw = String(a.action ?? a.type ?? 'invoke').toLowerCase();
    const allowed = ['invoke', 'publish', 'favorite', 'review'] as const;
    const action = (allowed as readonly string[]).includes(actionRaw)
      ? actionRaw
      : 'invoke';
    return {
      action,
      resourceName: String(a.resourceName ?? ''),
      resourceType: String(a.resourceType ?? a.type ?? ''),
      timestamp: String(a.timestamp ?? a.createTime ?? ''),
    };
  });
  return {
    quotaUsage: {
      dailyLimit: num(qu.dailyLimit, -1),
      dailyUsed: num(qu.dailyUsed),
      monthlyLimit: num(qu.monthlyLimit, -1),
      monthlyUsed: num(qu.monthlyUsed),
    },
    myResources: {
      draft: num(mr.draft),
      pendingReview: num(mr.pendingReview),
      published: num(mr.published),
      total: num(mr.total),
    },
    recentActivity,
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
