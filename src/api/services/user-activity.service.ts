import { http } from '../../lib/http';
import type { PaginatedData } from '../../types/api';
import { extractArray, normalizePaginated } from '../../utils/normalizeApiPayload';
import type {
  UsageRecord,
  FavoriteItem,
  UserUsageStats,
  RecentUseItem,
  MyPublishItem,
} from '../../types/dto/user-activity';

const ACTIVITY_TYPES = ['agent', 'skill', 'app', 'dataset', 'mcp'] as const;
type ActivityType = (typeof ACTIVITY_TYPES)[number];

function normalizeActivityType(raw: unknown): ActivityType {
  const value = String(raw ?? '').toLowerCase();
  return (ACTIVITY_TYPES as readonly string[]).includes(value) ? (value as ActivityType) : 'agent';
}

function toRecentUse(raw: unknown): RecentUseItem {
  const r = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const id = Number(r.recordId ?? r.id ?? r.targetId ?? 0) || 0;
  const targetType = normalizeActivityType(r.targetType ?? r.type) as RecentUseItem['targetType'];
  return {
    id,
    targetType,
    targetId: Number(r.targetId ?? 0) || 0,
    targetCode: r.targetCode != null ? String(r.targetCode) : undefined,
    displayName: String(r.targetName ?? r.displayName ?? r.name ?? `资源-${id}`),
    description: r.description != null ? String(r.description) : undefined,
    action: r.action != null ? String(r.action) : undefined,
    status: r.status != null ? String(r.status) : undefined,
    latencyMs: Number(r.latencyMs ?? r.latency_ms ?? 0) || 0,
    createTime: r.createTime != null ? String(r.createTime) : undefined,
    lastUsedTime:
      r.lastUsedTime != null
        ? String(r.lastUsedTime)
        : r.createTime != null
          ? String(r.createTime)
          : undefined,
  };
}

function toUsageRecord(raw: unknown): UsageRecord {
  const r = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  return {
    id: Number(r.id ?? r.recordId ?? r.targetId ?? 0) || 0,
    agentName: String(r.agentName ?? r.agent_name ?? ''),
    displayName: String(r.displayName ?? r.display_name ?? r.name ?? '-'),
    type: normalizeActivityType(r.type ?? r.targetType ?? r.target_type),
    action: String(r.action ?? r.event ?? '-'),
    inputPreview: String(r.inputPreview ?? r.input_preview ?? ''),
    outputPreview: String(r.outputPreview ?? r.output_preview ?? ''),
    latencyMs: Number(r.latencyMs ?? r.latency_ms ?? 0) || 0,
    status: String(r.status ?? 'success') === 'success' ? 'success' : 'failed',
    createTime: String(r.createTime ?? r.create_time ?? ''),
  };
}

function toFavorite(raw: unknown): FavoriteItem {
  const r = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  return {
    id: Number(r.id ?? 0) || 0,
    targetType: normalizeActivityType(r.targetType ?? r.target_type),
    targetId: Number(r.targetId ?? r.target_id ?? 0) || 0,
    displayName: String(r.displayName ?? r.display_name ?? r.name ?? '-'),
    description: String(r.description ?? ''),
    icon: typeof r.icon === 'string' ? r.icon : null,
    createTime: String(r.createTime ?? r.create_time ?? ''),
  };
}

function normalizeRecentUse(raw: unknown): RecentUseItem[] {
  return extractArray(raw).map(toRecentUse);
}

const PUBLISH_STATUSES = ['draft', 'pending_review', 'testing', 'published', 'rejected', 'deprecated'] as const;

function normalizePublishStatus(raw: unknown): MyPublishItem['status'] {
  const s = String(raw ?? 'draft').toLowerCase().replace(/-/g, '_');
  return (PUBLISH_STATUSES as readonly string[]).includes(s)
    ? (s as MyPublishItem['status'])
    : 'draft';
}

function toMyPublish(raw: unknown): MyPublishItem {
  const r = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  return {
    id: Number(r.id ?? 0) || 0,
    displayName: String(r.displayName ?? r.display_name ?? r.name ?? '-'),
    description: String(r.description ?? ''),
    icon: typeof r.icon === 'string' ? r.icon : null,
    status: normalizePublishStatus(r.status),
    callCount: Number(r.callCount ?? r.call_count ?? 0) || 0,
    qualityScore: Number(r.qualityScore ?? r.quality_score ?? 0) || 0,
    createTime: String(r.createTime ?? r.create_time ?? ''),
    updateTime: String(r.updateTime ?? r.update_time ?? ''),
  };
}

function normalizeUserUsageStats(raw: unknown): UserUsageStats {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const counters = o.counters && typeof o.counters === 'object' ? (o.counters as Record<string, unknown>) : {};
  const trends = o.trends && typeof o.trends === 'object' ? (o.trends as Record<string, unknown>) : {};
  const num = (v: unknown) => {
    const x = Number(v);
    return Number.isFinite(x) ? x : 0;
  };

  const days = extractArray(
    o.recentDays
    ?? (o as { recent_days?: unknown }).recent_days
    ?? (o as { callsByDay?: unknown }).callsByDay
    ?? (o as { calls_by_day?: unknown }).calls_by_day
    ?? (o as { trend?: unknown }).trend
    ?? trends.last7Days,
  );
  const recentDays = days.map((d: unknown) => {
    const x = d && typeof d === 'object' ? (d as Record<string, unknown>) : {};
    return {
      date: String(x.date ?? x.day ?? x.statDate ?? x.stat_date ?? ''),
      calls: num(x.calls ?? x.count ?? x.cnt ?? x.invokeCount ?? x.invoke_count),
    };
  });

  const now = new Date();
  const todayKey = now.toISOString().slice(0, 10);
  const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  /** 从 recentDays 的 date 解析出 YYYY-MM，兼容 YYYY-MM-DD 与 MM-DD（缺省当前年） */
  const trendDayMonthPrefix = (dateRaw: string): string | null => {
    const key = String(dateRaw).trim();
    if (!key) return null;
    const ymd = key.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (ymd) return `${ymd[1]}-${ymd[2]}`;
    const md = key.match(/^(\d{2})-(\d{2})$/);
    if (md) return `${now.getFullYear()}-${md[1]}`;
    return null;
  };
  const todayCallsFromTrend = recentDays.find((d) => d.date === todayKey)?.calls ?? 0;
  const weekCallsFromTrend = recentDays.reduce((sum, d) => sum + num(d.calls), 0);
  const monthCallsFromTrend = recentDays.reduce((sum, d) => {
    const mp = trendDayMonthPrefix(d.date);
    return mp === monthPrefix ? sum + num(d.calls) : sum;
  }, 0);

  const rawMonth = num(
    o.monthCalls
      ?? o.month_calls
      ?? o.monthInvokeCount
      ?? o.month_invoke_count
      ?? counters.monthCalls
      ?? counters.month_calls
      ?? counters.monthInvokeCount
      ?? counters.month_invoke_count,
  );
  /** API 本月为 0 但趋势含当月数据时，用当月日汇总兜底 */
  const monthCalls =
    rawMonth === 0 && monthCallsFromTrend > 0 ? monthCallsFromTrend : rawMonth;

  return {
    todayCalls: num(
      o.todayCalls
      ?? o.today_calls
      ?? o.todayInvokeCount
      ?? o.today_invoke_count
      ?? counters.todayCalls
      ?? counters.today_calls
      ?? todayCallsFromTrend,
    ),
    weekCalls: num(
      o.weekCalls
      ?? o.week_calls
      ?? o.weekInvokeCount
      ?? o.week_invoke_count
      ?? counters.weekCalls
      ?? counters.week_calls
      ?? weekCallsFromTrend,
    ),
    monthCalls,
    totalCalls: num(
      o.totalCalls
      ?? o.total_calls
      ?? o.totalInvokeCount
      ?? o.total_invoke_count
      ?? counters.totalUsageRecords
      ?? counters.total_usage_records,
    ),
    favoriteCount: num(o.favoriteCount ?? o.favorite_count ?? o.favorites ?? o.favoriteCnt),
    recentDays,
  };
}

export const userActivityService = {
  getUsageRecords: async (query?: { page?: number; pageSize?: number; range?: string; type?: string }) => {
    const raw = await http.get<unknown>('/user/usage-records', { params: query });
    return normalizePaginated<UsageRecord>(raw, toUsageRecord);
  },

  getFavorites: async () => {
    const raw = await http.get<unknown>('/user/favorites');
    return extractArray(raw).map(toFavorite);
  },

  removeFavorite: (id: number) =>
    http.delete(`/user/favorites/${id}`),

  addFavorite: (targetType: string, targetId: number) =>
    http.post<void>('/user/favorites', { targetType, targetId }),

  getUsageStats: async (): Promise<UserUsageStats> => {
    const raw = await http.get<unknown>('/user/usage-stats');
    return normalizeUserUsageStats(raw);
  },

  getRecentUse: async (query?: { limit?: number; type?: string }) => {
    const raw = await http.get<unknown>('/user/recent-use', { params: query });
    return normalizeRecentUse(raw);
  },

  getMyAgents: async (): Promise<MyPublishItem[]> => {
    const raw = await http.get<unknown>('/user/my-agents');
    return extractArray(raw).map(toMyPublish);
  },

  getMySkills: async (): Promise<MyPublishItem[]> => {
    const raw = await http.get<unknown>('/user/my-skills');
    return extractArray(raw).map(toMyPublish);
  },
};
