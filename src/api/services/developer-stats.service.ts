import { http } from '../../lib/http';
import { extractArray } from '../../utils/normalizeApiPayload';
import type { DeveloperStatistics } from '../../types/dto/explore';
import type { OwnerDeveloperStatsVO, OwnerResourceTypeInvokeCount } from '../../types/dto/dashboard';

function num(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeOwnerResourceTypeInvokeCount(raw: unknown): OwnerResourceTypeInvokeCount {
  const x = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  return {
    resourceType: String(x.resourceType ?? x.resource_type ?? 'unknown'),
    invokeCount: num(x.invokeCount ?? x.invoke_count),
    successCount: num(x.successCount ?? x.success_count),
  };
}

function normalizeOwnerDeveloperStats(raw: unknown): OwnerDeveloperStatsVO {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const byType = extractArray(o.gatewayInvokesByResourceType ?? o.gateway_invokes_by_resource_type).map(
    normalizeOwnerResourceTypeInvokeCount,
  );
  return {
    ownerUserId: num(o.ownerUserId ?? o.owner_user_id),
    periodDays: num(o.periodDays ?? o.period_days, 7),
    periodStart: String(o.periodStart ?? o.period_start ?? ''),
    periodEnd: String(o.periodEnd ?? o.period_end ?? ''),
    gatewayInvokeTotal: num(o.gatewayInvokeTotal ?? o.gateway_invoke_total),
    gatewayInvokeSuccess: num(o.gatewayInvokeSuccess ?? o.gateway_invoke_success),
    usageRecordInvokeTotal: num(o.usageRecordInvokeTotal ?? o.usage_record_invoke_total),
    gatewayInvokesByResourceType: byType,
  };
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
  /** 旧版开发者仪表盘；与 owner-resource-stats 数据源不同 */
  getMyStatistics: async () => {
    const raw = await http.get<unknown>('/developer/my-statistics');
    return normalizeDeveloperStatistics(raw);
  },

  /**
   * Owner 维度：call_log 网关调用、usage_record(invoke)、目录下载等行为统计；权限见后端 OwnerDeveloperStatsService。
   */
  getOwnerResourceStats: async (params?: { periodDays?: number; ownerUserId?: number }) => {
    const raw = await http.get<unknown>('/dashboard/owner-resource-stats', { params });
    return normalizeOwnerDeveloperStats(raw);
  },
};
