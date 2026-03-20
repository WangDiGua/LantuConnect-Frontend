import { http } from '../../lib/http';
import type { PaginatedData, PaginationParams } from '../../types/api';
import type {
  AlertRecord,
  AlertRule,
  CallLogEntry,
  CreateAlertRulePayload,
  KpiMetric,
  PerformanceMetric,
  TraceSpan,
} from '../../types/dto/monitoring';

export const monitoringService = {
  getKpis: () => http.get<KpiMetric[]>('/monitoring/kpis'),

  listCallLogs: (params?: PaginationParams) =>
    http.get<PaginatedData<CallLogEntry>>('/monitoring/call-logs', { params }),

  listAlerts: (params?: PaginationParams) =>
    http.get<PaginatedData<AlertRecord>>('/monitoring/alerts', { params }),

  listAlertRules: () => http.get<AlertRule[]>('/monitoring/alert-rules'),

  createAlertRule: (data: CreateAlertRulePayload) =>
    http.post<AlertRule>('/monitoring/alert-rules', data),

  updateAlertRule: (id: string, data: Partial<CreateAlertRulePayload>) =>
    http.put<AlertRule>(`/monitoring/alert-rules/${id}`, data),

  deleteAlertRule: (id: string) =>
    http.delete(`/monitoring/alert-rules/${id}`),

  listTraces: (params?: PaginationParams) =>
    http.get<PaginatedData<TraceSpan>>('/monitoring/traces', { params }),

  getPerformanceMetrics: () =>
    http.get<PerformanceMetric[]>('/monitoring/performance'),
};
