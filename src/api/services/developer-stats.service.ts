import { http } from '../../lib/http';
import { extractArray } from '../../utils/normalizeApiPayload';
import type { DeveloperStatistics } from '../../types/dto/explore';

function num(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeDeveloperStatistics(raw: unknown): DeveloperStatistics {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const callsByDay = extractArray(o.callsByDay).map((item) => {
    const x = item && typeof item === 'object' ? (item as Record<string, unknown>) : {};
    return {
      date: String(x.date ?? x.day ?? ''),
      calls: num(x.calls ?? x.cnt),
      errors: num(x.errors),
    };
  });
  const topResources = extractArray(o.topResources).map((item) => {
    const x = item && typeof item === 'object' ? (item as Record<string, unknown>) : {};
    return {
      name: String(x.name ?? x.agent_name ?? x.resource_name ?? '-'),
      type: String(x.type ?? 'mcp'),
      calls: num(x.calls ?? x.cnt),
    };
  });
  const apiKeyUsage = extractArray(o.apiKeyUsage).map((item) => {
    const x = item && typeof item === 'object' ? (item as Record<string, unknown>) : {};
    return {
      keyPrefix: String(x.keyPrefix ?? x.key_prefix ?? '***'),
      calls: num(x.calls ?? x.call_count),
      lastUsed: String(x.lastUsed ?? x.last_used_at ?? '-'),
    };
  });
  return {
    totalCalls: num(o.totalCalls ?? o.total_calls),
    todayCalls: num(o.todayCalls ?? o.today_calls),
    errorRate: num(o.errorRate ?? o.error_rate),
    avgLatencyMs: num(o.avgLatencyMs ?? o.avg_latency_ms),
    callsByDay,
    topResources,
    apiKeyUsage,
  };
}

export const developerStatsService = {
  getMyStatistics: async () => {
    const raw = await http.get<unknown>('/developer/my-statistics');
    return normalizeDeveloperStatistics(raw);
  },
};
