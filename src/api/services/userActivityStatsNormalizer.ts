import type { UserUsageStats } from '../../types/dto/user-activity.ts';

function extractPayloadArray(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  if (!raw || typeof raw !== 'object') return [];
  const obj = raw as Record<string, unknown>;
  if (Array.isArray(obj.records)) return obj.records;
  if (Array.isArray(obj.items)) return obj.items;
  if (Array.isArray(obj.list)) return obj.list;
  if (Array.isArray(obj.rows)) return obj.rows;
  if (Array.isArray(obj.data)) return obj.data;
  return [];
}

export function normalizeUserUsageStats(raw: unknown): UserUsageStats {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const counters = o.counters && typeof o.counters === 'object' ? (o.counters as Record<string, unknown>) : {};
  const trends = o.trends && typeof o.trends === 'object' ? (o.trends as Record<string, unknown>) : {};
  const num = (v: unknown) => {
    const x = Number(v);
    return Number.isFinite(x) ? x : 0;
  };

  const days = extractPayloadArray(
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

  const byTargetType = extractPayloadArray(counters.byTargetType ?? counters.by_target_type ?? o.byTargetType ?? o.by_target_type)
    .map((row: unknown) => {
      const x = row && typeof row === 'object' ? (row as Record<string, unknown>) : {};
      return {
        type: String(x.targetType ?? x.target_type ?? x.type ?? 'unknown'),
        calls: num(x.cnt ?? x.calls ?? x.count ?? x.total),
      };
    })
    .filter((row) => row.calls > 0);

  return {
    todayCalls: num(
      o.todayCalls
      ?? o.today_calls
      ?? o.todayInvokeCount
      ?? o.today_invoke_count
      ?? counters.todayCalls
      ?? counters.today_calls
    ),
    weekCalls: num(
      o.weekCalls
      ?? o.week_calls
      ?? o.weekInvokeCount
      ?? o.week_invoke_count
      ?? counters.weekCalls
      ?? counters.week_calls
    ),
    monthCalls: num(
      o.monthCalls
      ?? o.month_calls
      ?? o.monthInvokeCount
      ?? o.month_invoke_count
      ?? counters.monthCalls
      ?? counters.month_calls
    ),
    totalCalls: num(
      o.totalCalls
      ?? o.total_calls
      ?? o.totalInvokeCount
      ?? o.total_invoke_count
      ?? counters.totalUsageRecords
      ?? counters.total_usage_records
    ),
    favoriteCount: num(
      o.favoriteCount
      ?? o.favorite_count
      ?? o.favorites
      ?? o.favoriteCnt
      ?? counters.favoriteCount
      ?? counters.favorite_count
    ),
    recentDays,
    byTargetType,
  };
}
