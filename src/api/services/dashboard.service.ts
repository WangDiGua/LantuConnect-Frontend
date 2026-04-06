import { http } from '../../lib/http';
import { extractArray } from '../../utils/normalizeApiPayload';
import type {
  AdminOverview,
  UserWorkspace,
  UserWorkspaceRecentUsage,
  HealthSummary,
  UsageStatsData,
  DataReportsData,
  DataReportResourceRow,
} from '../../types/dto/dashboard';
import type {
  ExploreHubData,
  AdminRealtimeData,
  UserDashboardData,
  AnnouncementItem,
  ExploreResourceItem,
  ContributorItem,
} from '../../types/dto/explore';

function num(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function optNum(v: unknown): number | null {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function normalizeExploreResourceItem(raw: unknown): ExploreResourceItem {
  const x = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const publishedRaw = x.publishedAt ?? x.published_at ?? x.updateTime ?? x.update_time;
  let publishedAt = '';
  if (publishedRaw != null) {
    if (typeof publishedRaw === 'string') publishedAt = publishedRaw;
    else if (Array.isArray(publishedRaw) && publishedRaw.length >= 3) {
      const ys = Number(publishedRaw[0]);
      const ms = Number(publishedRaw[1]);
      const ds = Number(publishedRaw[2]);
      const hs = publishedRaw.length > 3 ? Number(publishedRaw[3]) : 0;
      const mis = publishedRaw.length > 4 ? Number(publishedRaw[4]) : 0;
      const ss = publishedRaw.length > 5 ? Number(publishedRaw[5]) : 0;
      if (Number.isFinite(ys) && Number.isFinite(ms) && Number.isFinite(ds)) {
        publishedAt = new Date(ys, ms - 1, ds, hs, mis, ss).toISOString();
      }
    } else {
      publishedAt = String(publishedRaw);
    }
  }
  const callRaw = x.callCount ?? x.call_count;
  return {
    resourceType: String(x.resourceType ?? x.resource_type ?? '').toLowerCase(),
    resourceId: String(x.resourceId ?? x.resource_id ?? ''),
    resourceCode:
      x.resourceCode == null && x.resource_code == null ? undefined : String(x.resourceCode ?? x.resource_code),
    displayName: String(x.displayName ?? x.display_name ?? '未命名'),
    description: String(x.description ?? ''),
    status: x.status == null ? undefined : String(x.status),
    icon: x.icon == null ? undefined : String(x.icon),
    categoryName:
      x.categoryName == null && x.category_name == null ? undefined : String(x.categoryName ?? x.category_name),
    callCount: callRaw == null ? null : num(callRaw),
    rating: optNum(x.rating),
    favoriteCount:
      x.favoriteCount == null && x.favorite_count == null ? null : num(x.favoriteCount ?? x.favorite_count),
    reviewCount:
      x.reviewCount == null && x.review_count == null ? null : num(x.reviewCount ?? x.review_count),
    reason: x.reason == null ? undefined : String(x.reason),
    author: x.author == null ? undefined : String(x.author),
    publishedAt: publishedAt || '',
  };
}

function normalizeContributorItem(raw: unknown): ContributorItem {
  const x = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  return {
    userId: String(x.userId ?? x.user_id ?? ''),
    username: String(x.username ?? ''),
    userName:
      x.userName == null ? (x.user_name == null ? undefined : String(x.user_name)) : String(x.userName),
    avatar: x.avatar == null ? undefined : String(x.avatar),
    resourceCount: num(x.resourceCount ?? x.resource_count),
    totalCalls: num(x.totalCalls ?? x.total_calls),
    weeklyNewResources: num(x.weeklyNewResources ?? x.weekly_new_resources ?? 0),
    weeklyCalls: num(x.weeklyCalls ?? x.weekly_calls ?? 0),
    likeCount: num(x.likeCount ?? x.like_count ?? 0),
  };
}

function normalizeUsageStatsData(raw: unknown): UsageStatsData {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const agg = o.aggregates && typeof o.aggregates === 'object' ? (o.aggregates as Record<string, unknown>) : {};
  let pointsRaw = extractArray(o.points);
  if (pointsRaw.length === 0) {
    const series = extractArray(o.series);
    pointsRaw = series.map((row: unknown) => {
      const x = row && typeof row === 'object' ? (row as Record<string, unknown>) : {};
      return {
        date: String(x.day ?? x.date ?? ''),
        calls: num(x.cnt ?? x.calls ?? x.count),
        users: 0,
      };
    });
  }
  const points = pointsRaw.map((p: Record<string, unknown>) => ({
    date: String(p?.date ?? p?.statDate ?? p?.day ?? ''),
    calls: num(p?.calls ?? p?.callCount ?? p?.invokeCount ?? p?.cnt),
    users: num(p?.users ?? p?.activeUsers ?? p?.userCount),
  }));
  const totalCallsFromPoints = points.reduce((s, pt) => s + pt.calls, 0);
  const breakdown =
    o.breakdown && typeof o.breakdown === 'object' ? (o.breakdown as Record<string, unknown>) : {};
  const callsByResourceType = extractArray(breakdown.callsByResourceType).map((item: unknown) => {
    const x = item && typeof item === 'object' ? (item as Record<string, unknown>) : {};
    return {
      type: String(x.type ?? x.resource_type ?? '').toLowerCase(),
      calls: num(x.calls ?? x.cnt),
      successRate: num(x.successRate ?? x.success_rate),
    };
  });
  return {
    range: String(o.range ?? agg.range ?? '7d'),
    points,
    totalCalls: num(
      o.totalCalls ?? o.total_calls ?? agg.callLogsToday ?? (totalCallsFromPoints > 0 ? totalCallsFromPoints : 0),
    ),
    activeUsers: num(o.activeUsers ?? o.active_users ?? agg.activeUsers),
    callsByResourceType: callsByResourceType.length > 0 ? callsByResourceType : undefined,
  };
}

const WORKSPACE_USAGE_TYPES = ['agent', 'skill', 'mcp', 'app', 'dataset'] as const;
type WorkspaceUsageType = (typeof WORKSPACE_USAGE_TYPES)[number];

function isWorkspaceUsageType(s: string): s is WorkspaceUsageType {
  return (WORKSPACE_USAGE_TYPES as readonly string[]).includes(s);
}

/** 后端 GET /dashboard/user-workspace 为 UserWorkspaceVO：profile、recent[]、widgets */
function normalizeUserWorkspace(raw: unknown): UserWorkspace {
  const r = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const widgets = r.widgets && typeof r.widgets === 'object' ? (r.widgets as Record<string, unknown>) : {};
  const recentRaw = extractArray(r.recent);

  const resourceTypeOf = (row: Record<string, unknown>) =>
    String(row.targetType ?? row.resourceType ?? '').toLowerCase().trim();

  const mapUsage = (row: Record<string, unknown>, rt: WorkspaceUsageType): UserWorkspaceRecentUsage => ({
    id: num(row.id),
    resourceType: rt,
    resourceId: row.resourceId != null && row.resourceId !== '' ? num(row.resourceId) : null,
    displayName: String(row.displayName ?? row.targetId ?? row.name ?? '未命名资源'),
    icon: row.icon ? String(row.icon) : null,
    lastUsedTime: String(row.createTime ?? row.lastUsedTime ?? ''),
  });

  const recentUsages: UserWorkspaceRecentUsage[] = [];
  for (const item of recentRaw) {
    const row = item as Record<string, unknown>;
    const rt = resourceTypeOf(row);
    if (!isWorkspaceUsageType(rt)) continue;
    recentUsages.push(mapUsage(row, rt));
  }

  const narrow = (u: UserWorkspaceRecentUsage) => ({
    id: u.id,
    displayName: u.displayName,
    icon: u.icon,
    lastUsedTime: u.lastUsedTime,
  });

  return {
    recentUsages,
    recentAgents: recentUsages.filter((u) => u.resourceType === 'agent').map(narrow),
    recentSkills: recentUsages.filter((u) => u.resourceType === 'skill').map(narrow),
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

function mapDataReportResourceRow(raw: unknown): DataReportResourceRow {
  const x = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  return {
    name: String(x.name ?? x.agent_name ?? ''),
    calls: num(x.calls ?? x.cnt),
    successRate: num(x.successRate ?? x.success_rate),
    resourceType:
      x.resourceType == null && x.resource_type == null
        ? undefined
        : String(x.resourceType ?? x.resource_type ?? '').toLowerCase(),
  };
}

function normalizeDataReportsData(raw: unknown): DataReportsData {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const methodRows = extractArray(o.rows).map((item: unknown) => {
    const x = item && typeof item === 'object' ? (item as Record<string, unknown>) : {};
    return {
      path: String(x.path ?? ''),
      requests: num(x.requests ?? x.cnt),
      avgLatencyMs: num(x.avgLatencyMs ?? x.avg_latency_ms),
    };
  });
  const callsByResourceType = extractArray(o.callsByResourceType).map((item: unknown) => {
    const x = item && typeof item === 'object' ? (item as Record<string, unknown>) : {};
    return {
      type: String(x.type ?? x.resource_type ?? '').toLowerCase(),
      calls: num(x.calls ?? x.cnt),
      successRate: num(x.successRate ?? x.success_rate),
    };
  });
  const topResources = extractArray(o.topResources).map(mapDataReportResourceRow);
  const topAgents = extractArray(o.topAgents).map(mapDataReportResourceRow);
  const topSkills = extractArray(o.topSkills).map(mapDataReportResourceRow);
  const topMcps = extractArray(o.topMcps ?? o.top_mcps).map(mapDataReportResourceRow);
  const topApps = extractArray(o.topApps ?? o.top_apps).map(mapDataReportResourceRow);
  const topDatasets = extractArray(o.topDatasets ?? o.top_datasets).map(mapDataReportResourceRow);
  const departmentUsage = extractArray(o.departmentUsage).map((item: unknown) => {
    const x = item && typeof item === 'object' ? (item as Record<string, unknown>) : {};
    return {
      department: String(x.department ?? x.dept ?? ''),
      calls: num(x.calls ?? x.cnt),
      users: num(x.users ?? x.userCount),
    };
  });
  return {
    range: String(o.range ?? '7d'),
    methodBreakdown: methodRows.length > 0 ? methodRows : undefined,
    callsByResourceType,
    topResources,
    topAgents,
    topSkills,
    topMcps,
    topApps,
    topDatasets,
    departmentUsage,
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
    trendingResources: extractArray(o.trendingResources).map(normalizeExploreResourceItem),
    recentPublished: extractArray(o.recentPublished).map(normalizeExploreResourceItem),
    recommendedForUser: extractArray(o.recommendedForUser).map(normalizeExploreResourceItem),
    announcements,
    topContributors: extractArray(o.topContributors).map(normalizeContributorItem),
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
      successRate: num(x.successRate ?? x.success_rate),
    };
  });
  const publishedRaw = o.publishedResourceCounts ?? o.published_resource_counts;
  let publishedResourceCounts: AdminRealtimeData['publishedResourceCounts'];
  if (publishedRaw && typeof publishedRaw === 'object') {
    const pr = publishedRaw as Record<string, unknown>;
    publishedResourceCounts = {
      agent: num(pr.agent),
      skill: num(pr.skill),
      mcp: num(pr.mcp),
      app: num(pr.app),
      dataset: num(pr.dataset),
    };
  }
  const callsByResourceType7d = extractArray(o.callsByResourceType7d ?? o.calls_by_resource_type_7d).map(
    (item: unknown) => {
      const x = item && typeof item === 'object' ? (item as Record<string, unknown>) : {};
      return { type: String(x.type ?? x.resource_type ?? '').toLowerCase(), calls: num(x.calls ?? x.cnt) };
    },
  );
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
    publishedResourceCounts,
    callsByResourceType7d: callsByResourceType7d.length > 0 ? callsByResourceType7d : undefined,
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
