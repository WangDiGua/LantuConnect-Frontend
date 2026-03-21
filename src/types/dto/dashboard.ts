export interface KpiItem {
  label: string;
  value: number;
  trend: number;
}

export interface AdminOverview {
  kpis: KpiItem[];
  healthSummary: { healthy: number; warning: number; down: number };
  recentRegistrations: { name: string; type: string; status: string; time: string }[];
}

export interface UserWorkspace {
  recentAgents: { id: number; displayName: string; icon: string | null; lastUsedTime: string }[];
  recentSkills: { id: number; displayName: string; icon: string | null; lastUsedTime: string }[];
  favoriteCount: number;
  totalUsageToday: number;
  quickActions: { label: string; route: string; icon: string }[];
}

export interface HealthSummary {
  totalAgents: number;
  healthy: number;
  degraded: number;
  down: number;
  avgLatencyMs: number;
  avgSuccessRate: number;
  recentIncidents: { agentName: string; displayName: string; issue: string; time: string }[];
}

export interface UsageStatsPoint {
  date: string;
  calls: number;
  tokens: number;
  users: number;
}

export interface UsageStatsData {
  range: string;
  points: UsageStatsPoint[];
  totalCalls: number;
  totalTokens: number;
  activeUsers: number;
}

export interface DataReportsData {
  range: string;
  topAgents: { name: string; calls: number; successRate: number }[];
  topSkills: { name: string; calls: number; avgLatency: number }[];
  departmentUsage: { department: string; calls: number; users: number }[];
}
