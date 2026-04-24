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
import { normalizeUserUsageStats } from './userActivityStatsNormalizer';

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
    targetId: Number(r.targetId ?? r.resourceId ?? 0) || 0,
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

function normalizeRecentUsePage(raw: unknown): PaginatedData<RecentUseItem> {
  return normalizePaginated<RecentUseItem>(raw, toRecentUse);
}

const PUBLISH_STATUSES = ['draft', 'pending_review', 'published', 'rejected', 'deprecated'] as const;

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

export const userActivityService = {
  getUsageRecords: async (query?: { page?: number; pageSize?: number; range?: string; type?: string; keyword?: string }) => {
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

  getRecentUse: async (query?: { page?: number; pageSize?: number; type?: string }) => {
    const raw = await http.get<unknown>('/user/recent-use', { params: query });
    return normalizeRecentUsePage(raw);
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
