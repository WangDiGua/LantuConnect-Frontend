import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { monitoringService } from '../../api/services/monitoring.service';
import type { PaginationParams } from '../../types/api';
import type { AlertListParams, CallLogListParams } from '../../api/services/monitoring.service';
import type { CreateAlertRulePayload } from '../../types/dto/monitoring';

export const monitoringKeys = {
  kpis: ['monitoring', 'kpis'] as const,
  performance: ['monitoring', 'performance'] as const,
  traces: (p?: PaginationParams) => ['monitoring', 'traces', p] as const,
  callLogs: (p?: CallLogListParams) => ['monitoring', 'callLogs', p] as const,
  alerts: (p?: AlertListParams) => ['monitoring', 'alerts', p] as const,
  alertRules: ['monitoring', 'alertRules'] as const,
  alertRuleMetrics: ['monitoring', 'alertRuleMetrics'] as const,
  qualityHistory: (resourceType: string, resourceId: number, from?: string, to?: string) =>
    ['monitoring', 'qualityHistory', resourceType, resourceId, from, to] as const,
};

export function useMonitoringKpis() {
  return useQuery({ queryKey: monitoringKeys.kpis, queryFn: () => monitoringService.getKpis() });
}

export function usePerformanceMetrics() {
  return useQuery({ queryKey: monitoringKeys.performance, queryFn: () => monitoringService.getPerformanceMetrics() });
}

export function useQualityHistory(resourceType: string, resourceId: number, from?: string, to?: string) {
  return useQuery({
    queryKey: monitoringKeys.qualityHistory(resourceType, resourceId, from, to),
    queryFn: () => monitoringService.getQualityHistory(resourceType, resourceId, { from, to }),
    enabled: Boolean(resourceType?.trim()) && resourceId > 0,
  });
}

export function useTraces(params?: PaginationParams) {
  return useQuery({
    queryKey: monitoringKeys.traces(params),
    queryFn: async () => {
      const page = await monitoringService.listTraces(params);
      return page.list;
    },
  });
}

export function useCallLogs(params?: CallLogListParams) {
  return useQuery({
    queryKey: monitoringKeys.callLogs(params),
    queryFn: () => monitoringService.listCallLogs(params),
  });
}

export function useAlerts(params?: AlertListParams) {
  return useQuery({
    queryKey: monitoringKeys.alerts(params),
    queryFn: () => monitoringService.listAlerts(params),
  });
}

export function useAlertRules() {
  return useQuery({ queryKey: monitoringKeys.alertRules, queryFn: () => monitoringService.listAlertRules() });
}

export function useAlertRuleMetrics() {
  return useQuery({
    queryKey: monitoringKeys.alertRuleMetrics,
    queryFn: () => monitoringService.listAlertRuleMetrics(),
    staleTime: 5 * 60_000,
  });
}

export function useCreateAlertRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateAlertRulePayload) => monitoringService.createAlertRule(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: monitoringKeys.alertRules }); },
  });
}

export function useUpdateAlertRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateAlertRulePayload> }) =>
      monitoringService.updateAlertRule(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: monitoringKeys.alertRules }); },
  });
}

export function useDeleteAlertRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => monitoringService.deleteAlertRule(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: monitoringKeys.alertRules }); },
  });
}
