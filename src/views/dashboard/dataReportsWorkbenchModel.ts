import { RESOURCE_TYPE_LABEL } from '../../constants/resourceTypes.ts';
import type { DataReportResourceRow, DataReportsData } from '../../types/dto/dashboard.ts';

export interface DataReportsStructureRow {
  type: string;
  label: string;
  calls: number;
  successRate: number;
  share: number;
}

export interface DataReportsLeaderboardRow extends DataReportResourceRow {
  rank: number;
  width: number;
  label: string;
}

export interface DataReportsMethodRow {
  path: string;
  requests: number;
  avgLatencyMs: number;
  requestShare: number;
}

export interface DataReportsDepartmentRow {
  department: string;
  calls: number;
  users: number;
  share: number;
}

export interface DataReportsCollectionSection {
  key: 'agent' | 'skill' | 'mcp' | 'app' | 'dataset';
  title: string;
  rows: DataReportResourceRow[];
}

export interface DataReportsWorkbenchModel {
  range: string;
  rangeLabel: string;
  totalCalls: number;
  weightedSuccessRate: number;
  activeTypeCount: number;
  activeUsers: number;
  departmentCount: number;
  leadingType: DataReportsStructureRow | null;
  structureRows: DataReportsStructureRow[];
  topLeaderboard: DataReportsLeaderboardRow[];
  methodRows: DataReportsMethodRow[];
  departmentRows: DataReportsDepartmentRow[];
  collectionSections: DataReportsCollectionSection[];
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function rangeLabel(range: string): string {
  if (range === 'today') return '今天';
  if (range === '30d') return '近 30 天';
  if (range === '90d') return '近 90 天';
  if (range === 'custom') return '自定义区间';
  return '近 7 天';
}

function buildStructureRows(data: DataReportsData, totalCalls: number): DataReportsStructureRow[] {
  const rows = data.callsByResourceType ?? [];
  if (rows.length === 0 || totalCalls <= 0) return [];
  return [...rows]
    .map((row) => ({
      type: row.type,
      label: RESOURCE_TYPE_LABEL[row.type] ?? row.type,
      calls: row.calls,
      successRate: round1(row.successRate),
      share: round1((row.calls / totalCalls) * 100),
    }))
    .sort((left, right) => right.calls - left.calls);
}

function buildLeaderboard(rows: DataReportResourceRow[]): DataReportsLeaderboardRow[] {
  if (rows.length === 0) return [];
  const maxCalls = rows.reduce((max, row) => Math.max(max, row.calls), 0);
  return rows.slice(0, 6).map((row, index) => ({
    ...row,
    rank: index + 1,
    width: maxCalls > 0 ? round1((row.calls / maxCalls) * 100) : 0,
    label: row.resourceType ? (RESOURCE_TYPE_LABEL[row.resourceType] ?? row.resourceType) : '未分类',
  }));
}

function buildMethodRows(rows: DataReportsData['methodBreakdown'], totalCalls: number): DataReportsMethodRow[] {
  if (!rows || rows.length === 0) return [];
  return [...rows]
    .sort((left, right) => right.requests - left.requests)
    .map((row) => ({
      path: row.path,
      requests: row.requests,
      avgLatencyMs: row.avgLatencyMs,
      requestShare: totalCalls > 0 ? round1((row.requests / totalCalls) * 100) : 0,
    }));
}

function buildDepartmentRows(rows: DataReportsData['departmentUsage'], totalCalls: number): DataReportsDepartmentRow[] {
  if (!rows || rows.length === 0) return [];
  return [...rows]
    .sort((left, right) => right.calls - left.calls)
    .map((row) => ({
      department: row.department,
      calls: row.calls,
      users: row.users,
      share: totalCalls > 0 ? round1((row.calls / totalCalls) * 100) : 0,
    }));
}

export function buildDataReportsWorkbenchModel(data: DataReportsData): DataReportsWorkbenchModel {
  const totalCalls =
    (data.callsByResourceType ?? []).reduce((sum, row) => sum + row.calls, 0)
    || (data.topResources ?? []).reduce((sum, row) => sum + row.calls, 0);
  const activeUsers = (data.departmentUsage ?? []).reduce((sum, row) => sum + row.users, 0);
  const structureRows = buildStructureRows(data, totalCalls);
  const weightedSuccessRate =
    totalCalls > 0
      ? round1(
          (data.callsByResourceType ?? []).reduce((sum, row) => sum + row.calls * row.successRate, 0) / totalCalls,
        )
      : 0;

  return {
    range: data.range,
    rangeLabel: rangeLabel(data.range),
    totalCalls,
    weightedSuccessRate,
    activeTypeCount: structureRows.filter((row) => row.calls > 0).length,
    activeUsers,
    departmentCount: data.departmentUsage?.length ?? 0,
    leadingType: structureRows[0] ?? null,
    structureRows,
    topLeaderboard: buildLeaderboard(data.topResources ?? []),
    methodRows: buildMethodRows(data.methodBreakdown, totalCalls),
    departmentRows: buildDepartmentRows(data.departmentUsage, totalCalls),
    collectionSections: [
      { key: 'agent', title: '智能体 TOP', rows: data.topAgents ?? [] },
      { key: 'skill', title: '技能 TOP', rows: data.topSkills ?? [] },
      { key: 'mcp', title: 'MCP TOP', rows: data.topMcps ?? [] },
      { key: 'app', title: '应用 TOP', rows: data.topApps ?? [] },
      { key: 'dataset', title: '数据集 TOP', rows: data.topDatasets ?? [] },
    ],
  };
}
