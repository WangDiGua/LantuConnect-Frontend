import { http } from '../../lib/http';
import type { PaginatedData } from '../../types/api';
import { extractArray, normalizePaginated } from '../../utils/normalizeApiPayload';
import type {
  UsageRecord,
  FavoriteItem,
  UserUsageStats,
  AuthorizedSkillItem,
  RecentUseItem,
  MyPublishItem,
} from '../../types/dto/user-activity';

const ACTIVITY_TYPES = ['agent', 'skill', 'app', 'dataset', 'mcp'] as const;
type ActivityType = (typeof ACTIVITY_TYPES)[number];

function normalizeActivityType(raw: unknown): ActivityType {
  const value = String(raw ?? '').toLowerCase();
  return (ACTIVITY_TYPES as readonly string[]).includes(value) ? (value as ActivityType) : 'agent';
}

function toAuthorizedSkill(raw: any): AuthorizedSkillItem {
  const id = Number(raw?.id ?? raw?.skillId ?? 0) || 0;
  return {
    id,
    skillId: Number(raw?.skillId ?? id) || id,
    displayName: String(raw?.displayName ?? raw?.skillName ?? raw?.name ?? `Skill-${id}`),
    description: String(raw?.description ?? ''),
    status: raw?.status ? String(raw.status) : undefined,
    grantScope: raw?.grantScope ? String(raw.grantScope) : undefined,
    grantedAt: raw?.grantedAt ? String(raw.grantedAt) : undefined,
  };
}

function normalizeAuthorizedSkills(raw: unknown): PaginatedData<AuthorizedSkillItem> {
  return normalizePaginated<AuthorizedSkillItem>(raw, toAuthorizedSkill);
}

function toRecentUse(raw: any): RecentUseItem {
  const id = Number(raw?.recordId ?? raw?.id ?? raw?.targetId ?? 0) || 0;
  const targetType = normalizeActivityType(raw?.targetType ?? raw?.type) as RecentUseItem['targetType'];
  return {
    id,
    targetType,
    targetId: Number(raw?.targetId ?? 0) || 0,
    targetCode: raw?.targetCode ? String(raw.targetCode) : undefined,
    displayName: String(raw?.targetName ?? raw?.displayName ?? raw?.name ?? `资源-${id}`),
    description: raw?.description ? String(raw.description) : undefined,
    action: raw?.action ? String(raw.action) : undefined,
    status: raw?.status ? String(raw.status) : undefined,
    tokenCost: Number(raw?.tokenCost ?? raw?.token_cost ?? 0) || 0,
    latencyMs: Number(raw?.latencyMs ?? raw?.latency_ms ?? 0) || 0,
    createTime: raw?.createTime ? String(raw.createTime) : undefined,
    lastUsedTime: raw?.lastUsedTime ? String(raw.lastUsedTime) : (raw?.createTime ? String(raw.createTime) : undefined),
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
    tokenCost: Number(r.tokenCost ?? r.token_cost ?? 0) || 0,
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
  const recentDays = days.map((d: any) => ({
    date: String(d?.date ?? d?.day ?? d?.statDate ?? d?.stat_date ?? ''),
    calls: num(d?.calls ?? d?.count ?? d?.cnt ?? d?.invokeCount ?? d?.invoke_count),
  }));

  const todayKey = new Date().toISOString().slice(0, 10);
  const todayCallsFromTrend = recentDays.find((d) => d.date === todayKey)?.calls ?? 0;
  const weekCallsFromTrend = recentDays.reduce((sum, d) => sum + num(d.calls), 0);

  return {
    todayCalls: num(
      o.todayCalls
      ?? (o as any).today_calls
      ?? (o as any).todayInvokeCount
      ?? (o as any).today_invoke_count
      ?? counters.todayCalls
      ?? (counters as any).today_calls
      ?? todayCallsFromTrend,
    ),
    weekCalls: num(
      o.weekCalls
      ?? (o as any).week_calls
      ?? (o as any).weekInvokeCount
      ?? (o as any).week_invoke_count
      ?? counters.weekCalls
      ?? (counters as any).week_calls
      ?? weekCallsFromTrend,
    ),
    monthCalls: num(o.monthCalls ?? (o as any).month_calls ?? (o as any).monthInvokeCount ?? (o as any).month_invoke_count),
    totalCalls: num(
      o.totalCalls
      ?? (o as any).total_calls
      ?? (o as any).totalInvokeCount
      ?? (o as any).total_invoke_count
      ?? counters.totalUsageRecords
      ?? (counters as any).total_usage_records,
    ),
    tokensUsed: num(o.tokensUsed ?? (o as any).tokens_used ?? (o as any).tokenConsumed ?? (o as any).token_consumed),
    favoriteCount: num(o.favoriteCount ?? (o as any).favorite_count ?? (o as any).favorites ?? (o as any).favoriteCnt),
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

  getAuthorizedSkills: async (query?: { page?: number; pageSize?: number }) => {
    const raw = await http.get<unknown>('/user/authorized-skills', { params: query });
    return normalizeAuthorizedSkills(raw);
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
