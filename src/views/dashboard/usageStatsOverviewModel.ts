import { RESOURCE_TYPE_LABEL } from '../../constants/resourceTypes.ts';
import type {
  DataReportResourceRow,
  UsageStatsData,
  UsageStatsPoint,
} from '../../types/dto/dashboard.ts';

export interface UsageStatsResourceBreakdownRow {
  type: string;
  label: string;
  calls: number;
  successRate: number;
  share: number;
}

export interface UsageStatsOverviewModel {
  range: string;
  rangeLabel: string;
  points: UsageStatsPoint[];
  dailyRanking: UsageStatsPoint[];
  latestCalls: number;
  totalCalls: number;
  activeUsers: number;
  overallSuccessRate: number;
  averageDailyCalls: number;
  peakPoint: UsageStatsPoint | null;
  latestVsAverageDelta: number | null;
  leadingResourceType: UsageStatsResourceBreakdownRow | null;
  resourceTypeBreakdown: UsageStatsResourceBreakdownRow[];
  departmentRows: UsageStatsData['departmentUsage'];
  ownerRows: UsageStatsData['ownerUsage'];
  topResources: DataReportResourceRow[];
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function rangeLabel(range: string): string {
  if (range === '30d') return '近 30 天';
  if (range === '90d') return '近 90 天';
  return '近 7 天';
}

function latestPoint(points: UsageStatsPoint[]): UsageStatsPoint | null {
  return points.length > 0 ? points[points.length - 1] : null;
}

function peakPoint(points: UsageStatsPoint[]): UsageStatsPoint | null {
  if (points.length === 0) return null;
  return points.reduce((peak, point) => (point.calls > peak.calls ? point : peak), points[0]!);
}

function latestVsAverageDelta(latestCalls: number, averageDailyCalls: number): number | null {
  if (averageDailyCalls <= 0) return null;
  return round1(((latestCalls - averageDailyCalls) / averageDailyCalls) * 100);
}

function overallSuccessRate(rows: UsageStatsData['callsByResourceType'], totalCalls: number): number {
  if (!rows || rows.length === 0 || totalCalls <= 0) return 0;
  const weightedTotal = rows.reduce((sum, row) => sum + row.calls * row.successRate, 0);
  return round1(weightedTotal / totalCalls);
}

function buildResourceTypeBreakdown(
  rows: UsageStatsData['callsByResourceType'],
  totalCalls: number,
): UsageStatsResourceBreakdownRow[] {
  if (!rows || rows.length === 0 || totalCalls <= 0) return [];
  return [...rows]
    .map((row) => ({
      type: row.type,
      label: RESOURCE_TYPE_LABEL[row.type] ?? row.type,
      calls: row.calls,
      successRate: row.successRate,
      share: round1((row.calls / totalCalls) * 100),
    }))
    .sort((left, right) => right.calls - left.calls);
}

export function buildUsageStatsOverviewModel(data: UsageStatsData): UsageStatsOverviewModel {
  const points = data.points ?? [];
  const totalCalls = data.totalCalls ?? 0;
  const latest = latestPoint(points);
  const averageDailyCalls = points.length > 0 ? Math.round(totalCalls / points.length) : 0;
  const resourceTypeBreakdown = buildResourceTypeBreakdown(data.callsByResourceType, totalCalls);

  return {
    range: data.range,
    rangeLabel: rangeLabel(data.range),
    points,
    dailyRanking: [...points].sort((left, right) => right.calls - left.calls),
    latestCalls: latest?.calls ?? 0,
    totalCalls,
    activeUsers: data.activeUsers ?? 0,
    overallSuccessRate: overallSuccessRate(data.callsByResourceType, totalCalls),
    averageDailyCalls,
    peakPoint: peakPoint(points),
    latestVsAverageDelta: latestVsAverageDelta(latest?.calls ?? 0, averageDailyCalls),
    leadingResourceType: resourceTypeBreakdown[0] ?? null,
    resourceTypeBreakdown,
    departmentRows: data.departmentUsage ?? [],
    ownerRows: data.ownerUsage ?? [],
    topResources: data.topResources ?? [],
  };
}
