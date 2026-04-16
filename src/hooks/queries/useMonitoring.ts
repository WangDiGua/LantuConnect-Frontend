import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { monitoringService } from '../../api/services/monitoring.service';
import type { AlertBatchActionRequest, CreateAlertRulePayload } from '../../types/dto/monitoring';
import type { PaginationParams } from '../../types/api';
import type {
  AlertListParams,
  AlertRuleListParams,
  CallLogListParams,
  PerformanceAnalysisParams,
} from '../../api/services/monitoring.service';

export const monitoringKeys = {
  kpis: ['monitoring', 'kpis'] as const,
  performance: (resourceType?: string) => ['monitoring', 'performance', resourceType ?? 'all'] as const,
  performanceAnalysis: (params?: PerformanceAnalysisParams) => ['monitoring', 'performanceAnalysis', params] as const,
  callSummary: (hours: number) => ['monitoring', 'callSummary', hours] as const,
  traces: (params?: PaginationParams) => ['monitoring', 'traces', params] as const,
  callLogs: (params?: CallLogListParams) => ['monitoring', 'callLogs', params] as const,
  alerts: (params?: AlertListParams) => ['monitoring', 'alerts', params] as const,
  alertSummary: ['monitoring', 'alertSummary'] as const,
  alertDetail: (id?: string) => ['monitoring', 'alertDetail', id ?? ''] as const,
  alertActions: (id?: string) => ['monitoring', 'alertActions', id ?? ''] as const,
  alertRules: (params?: AlertRuleListParams) => ['monitoring', 'alertRules', params] as const,
  alertRuleMetrics: ['monitoring', 'alertRuleMetrics'] as const,
  alertRuleScopeOptions: ['monitoring', 'alertRuleScopeOptions'] as const,
  qualityHistory: (resourceType: string, resourceId: number, from?: string, to?: string) =>
    ['monitoring', 'qualityHistory', resourceType, resourceId, from, to] as const,
};

export function useMonitoringKpis() {
  return useQuery({ queryKey: monitoringKeys.kpis, queryFn: () => monitoringService.getKpis() });
}

export function usePerformanceMetrics(resourceType?: string) {
  return useQuery({
    queryKey: monitoringKeys.performance(resourceType),
    queryFn: () => monitoringService.getPerformanceMetrics(resourceType),
  });
}

export function usePerformanceAnalysis(params?: PerformanceAnalysisParams) {
  return useQuery({
    queryKey: monitoringKeys.performanceAnalysis(params),
    queryFn: () => monitoringService.getPerformanceAnalysis(params),
  });
}

export function useCallSummaryByResource(hours = 24) {
  return useQuery({
    queryKey: monitoringKeys.callSummary(hours),
    queryFn: () => monitoringService.getCallSummaryByResource(hours),
    staleTime: 30_000,
  });
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

export function useAlertSummary() {
  return useQuery({
    queryKey: monitoringKeys.alertSummary,
    queryFn: () => monitoringService.getAlertSummary(),
  });
}

export function useAlertDetail(id?: string) {
  return useQuery({
    queryKey: monitoringKeys.alertDetail(id),
    queryFn: () => monitoringService.getAlertDetail(id!),
    enabled: Boolean(id),
  });
}

export function useAlertRules(params?: AlertRuleListParams) {
  return useQuery({
    queryKey: monitoringKeys.alertRules(params),
    queryFn: async () => {
      const page = await monitoringService.listAlertRules(params);
      return page.list;
    },
  });
}

export function useAlertRulesPage(params?: AlertRuleListParams) {
  return useQuery({
    queryKey: [...monitoringKeys.alertRules(params), 'page'] as const,
    queryFn: () => monitoringService.listAlertRules(params),
  });
}

export function useAlertRuleMetrics() {
  return useQuery({
    queryKey: monitoringKeys.alertRuleMetrics,
    queryFn: () => monitoringService.listAlertRuleMetrics(),
    staleTime: 5 * 60_000,
  });
}

export function useAlertRuleScopeOptions() {
  return useQuery({
    queryKey: monitoringKeys.alertRuleScopeOptions,
    queryFn: () => monitoringService.getAlertRuleScopeOptions(),
    staleTime: 5 * 60_000,
  });
}

export function useCreateAlertRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateAlertRulePayload) => monitoringService.createAlertRule(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monitoring', 'alertRules'] });
      queryClient.invalidateQueries({ queryKey: monitoringKeys.alertSummary });
    },
  });
}

export function useUpdateAlertRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateAlertRulePayload> }) =>
      monitoringService.updateAlertRule(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monitoring', 'alertRules'] });
      queryClient.invalidateQueries({ queryKey: monitoringKeys.alertSummary });
    },
  });
}

export function useDeleteAlertRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => monitoringService.deleteAlertRule(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monitoring', 'alertRules'] });
      queryClient.invalidateQueries({ queryKey: monitoringKeys.alertSummary });
    },
  });
}

function invalidateAlertQueries(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ['monitoring', 'alerts'] });
  queryClient.invalidateQueries({ queryKey: monitoringKeys.alertSummary });
}

export function useAckAlert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) => monitoringService.ackAlert(id, note),
    onSuccess: () => invalidateAlertQueries(queryClient),
  });
}

export function useAssignAlert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, assigneeUserId, note }: { id: string; assigneeUserId: number; note?: string }) =>
      monitoringService.assignAlert(id, assigneeUserId, note),
    onSuccess: () => invalidateAlertQueries(queryClient),
  });
}

export function useSilenceAlert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) => monitoringService.silenceAlert(id, note),
    onSuccess: () => invalidateAlertQueries(queryClient),
  });
}

export function useResolveAlert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) => monitoringService.resolveAlert(id, note),
    onSuccess: () => invalidateAlertQueries(queryClient),
  });
}

export function useReopenAlert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) => monitoringService.reopenAlert(id, note),
    onSuccess: () => invalidateAlertQueries(queryClient),
  });
}

export function useBatchAlertAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: AlertBatchActionRequest) => monitoringService.batchAlertAction(payload),
    onSuccess: () => invalidateAlertQueries(queryClient),
  });
}
