import { http } from '../../lib/http';
import type {
  AdminOverview,
  UserWorkspace,
  HealthSummary,
  UsageStatsData,
  DataReportsData,
} from '../../types/dto/dashboard';

export const dashboardService = {
  getAdminOverview: () =>
    http.get<AdminOverview>('/dashboard/admin-overview'),

  getUserWorkspace: () =>
    http.get<UserWorkspace>('/dashboard/user-workspace'),

  getHealthSummary: () =>
    http.get<HealthSummary>('/dashboard/health-summary'),

  getUsageStats: (range: string) =>
    http.get<UsageStatsData>('/dashboard/usage-stats', { params: { range } }),

  getDataReports: (range: string) =>
    http.get<DataReportsData>('/dashboard/data-reports', { params: { range } }),
};
