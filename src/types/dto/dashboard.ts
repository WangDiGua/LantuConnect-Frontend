export interface KpiItem {
  label: string;
  value: number;
  trend: number;
}

export interface AdminOverview {
  kpis: KpiItem[];
  healthSummary: { healthy: number; warning?: number; degraded?: number; down: number };
  recentRegistrations: { name: string; type: string; status: string; time: string }[];
}

export interface UserWorkspace {
  recentAgents: { id: number; displayName: string; icon: string | null; lastUsedTime: string }[];
  recentSkills: { id: number; displayName: string; icon: string | null; lastUsedTime: string }[];
  favoriteCount: number;
  /** 后端 widgets 通常不含此项；「今日使用」以 user-dashboard.quotaUsage.dailyUsed 为准 */
  totalUsageToday: number;
  /** 与 widgets.unreadNotifications 一致；仪表盘失败时可作未读数回退 */
  unreadNotifications: number;
  quickActions: { label: string; route: string; icon: string }[];
}

export interface HealthSummary {
  status?: string;
  healthConfigCount?: number;
  circuitBreakersOpen?: number;
  totalAgents: number;
  healthy: number;
  degraded: number;
  down: number;
  avgLatencyMs: number;
  avgSuccessRate: number;
  recentIncidents: { agentName: string; displayName: string; issue: string; time: string }[];
  checks?: Array<Record<string, unknown>>;
  statusDistribution?: Record<string, number>;
  degradedResources?: Array<Record<string, unknown>>;
}

export interface UsageStatsPoint {
  date: string;
  calls: number;
  users: number;
}

export interface UsageStatsData {
  range: string;
  points: UsageStatsPoint[];
  totalCalls: number;
  activeUsers: number;
  /** 来自 UsageStatsVO.breakdown.callsByResourceType */
  callsByResourceType?: { type: string; calls: number; successRate: number }[];
}

export interface DataReportResourceRow {
  name: string;
  calls: number;
  successRate: number;
  resourceType?: string;
}

export interface DataReportsData {
  range: string;
  /** 按网关 method（POST /invoke 等）聚合 */
  methodBreakdown?: { path: string; requests: number; avgLatencyMs: number }[];
  callsByResourceType: { type: string; calls: number; successRate: number }[];
  topResources: DataReportResourceRow[];
  topAgents: DataReportResourceRow[];
  topSkills: DataReportResourceRow[];
  topMcps: DataReportResourceRow[];
  topApps: DataReportResourceRow[];
  topDatasets: DataReportResourceRow[];
  departmentUsage: { department: string; calls: number; users: number }[];
}

/** GET /dashboard/owner-resource-stats — 与后端 OwnerDeveloperStatsVO 一致 */
export interface OwnerResourceTypeInvokeCount {
  resourceType: string;
  invokeCount: number;
  successCount: number;
}

export interface OwnerDeveloperStatsVO {
  ownerUserId: number;
  periodDays: number;
  periodStart: string;
  periodEnd: string;
  gatewayInvokeTotal: number;
  gatewayInvokeSuccess: number;
  usageRecordInvokeTotal: number;
  skillPackDownloadTotal: number;
  gatewayInvokesByResourceType: OwnerResourceTypeInvokeCount[];
}
