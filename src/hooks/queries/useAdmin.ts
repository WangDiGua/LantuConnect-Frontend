import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminService } from '../../api/services/admin.service';
import type { PaginationParams } from '../../types/api';
import type {
  BackupRecord,
  CreateGatewayRoutePayload,
  CreateModelEndpointDTO,
  OpsQueueItem,
} from '../../types/dto/admin';
import type { ToolReview } from '../../types/dto/tool';

export const adminKeys = {
  backups: ['admin', 'backups'] as const,
  gatewayRoutes: ['admin', 'gatewayRoutes'] as const,
  modelEndpoints: ['admin', 'modelEndpoints'] as const,
  opsQueue: ['admin', 'opsQueue'] as const,
  sensitiveWords: ['admin', 'sensitiveWords'] as const,
  announcements: ['admin', 'announcements'] as const,
  resources: ['admin', 'resources'] as const,
  stats: ['admin', 'stats'] as const,
  health: ['admin', 'health'] as const,
  opLogs: (p?: PaginationParams) => ['admin', 'opLogs', p] as const,
  errLogs: (p?: PaginationParams) => ['admin', 'errLogs', p] as const,
  auditLogs: (p?: PaginationParams) => ['admin', 'auditLogs', p] as const,
  toolReviews: ['admin', 'toolReviews'] as const,
};

// --- Backups ---
export function useAdminBackups() {
  return useQuery({ queryKey: adminKeys.backups, queryFn: () => adminService.listBackups() });
}
export function useCreateBackup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Pick<BackupRecord, 'name' | 'schedule' | 'target'>) => adminService.createBackup(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: adminKeys.backups }); },
  });
}
export function useRunBackup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminService.runBackup(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: adminKeys.backups }); },
  });
}

// --- Gateway Routes ---
export function useAdminGatewayRoutes() {
  return useQuery({ queryKey: adminKeys.gatewayRoutes, queryFn: () => adminService.listGatewayRoutes() });
}
export function useCreateGatewayRoute() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateGatewayRoutePayload) => adminService.createGatewayRoute(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: adminKeys.gatewayRoutes }); },
  });
}
export function useDeleteGatewayRoute() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminService.deleteGatewayRoute(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: adminKeys.gatewayRoutes }); },
  });
}

// --- Model Endpoints ---
export function useAdminModelEndpoints() {
  return useQuery({ queryKey: adminKeys.modelEndpoints, queryFn: () => adminService.listModelEndpoints() });
}
export function useCreateModelEndpoint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateModelEndpointDTO) => adminService.createModelEndpoint(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: adminKeys.modelEndpoints }); },
  });
}
export function useUpdateModelEndpoint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateModelEndpointDTO> }) => adminService.updateModelEndpoint(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: adminKeys.modelEndpoints }); },
  });
}
export function useDeleteModelEndpoint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminService.deleteModelEndpoint(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: adminKeys.modelEndpoints }); },
  });
}

// --- Ops Queue ---
export function useAdminOpsQueue() {
  return useQuery({ queryKey: adminKeys.opsQueue, queryFn: () => adminService.listOpsQueue() });
}
export function useUpdateOpsItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Pick<OpsQueueItem, 'status' | 'priority' | 'assignee'>> }) => adminService.updateOpsItem(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: adminKeys.opsQueue }); },
  });
}

// --- Sensitive Words ---
export function useAdminSensitiveWords() {
  return useQuery({ queryKey: adminKeys.sensitiveWords, queryFn: () => adminService.listSensitiveWords() });
}
export function useAddSensitiveWord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (word: string) => adminService.addSensitiveWord(word),
    onSuccess: () => { qc.invalidateQueries({ queryKey: adminKeys.sensitiveWords }); },
  });
}
export function useDeleteSensitiveWord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminService.deleteSensitiveWord(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: adminKeys.sensitiveWords }); },
  });
}

// --- Read-only queries ---
export function useAdminAnnouncements() {
  return useQuery({ queryKey: adminKeys.announcements, queryFn: () => adminService.listAnnouncements() });
}
export function useAdminResources() {
  return useQuery({ queryKey: adminKeys.resources, queryFn: () => adminService.getResources() });
}
export function useAdminStats() {
  return useQuery({ queryKey: adminKeys.stats, queryFn: () => adminService.getStats() });
}
export function useAdminHealth() {
  return useQuery({ queryKey: adminKeys.health, queryFn: () => adminService.getHealth() });
}

// --- Logs ---
export function useAdminOpLogs(params?: PaginationParams) {
  return useQuery({ queryKey: adminKeys.opLogs(params), queryFn: () => adminService.listOpLogs(params) });
}
export function useAdminErrLogs(params?: PaginationParams) {
  return useQuery({ queryKey: adminKeys.errLogs(params), queryFn: () => adminService.listErrLogs(params) });
}
export function useAdminAuditLogs(params?: PaginationParams) {
  return useQuery({ queryKey: adminKeys.auditLogs(params), queryFn: () => adminService.listAuditLogs(params) });
}

// --- Tool Reviews ---
export function useAdminToolReviews() {
  return useQuery({ queryKey: adminKeys.toolReviews, queryFn: () => adminService.listToolReviews() });
}
export function useUpdateToolReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Pick<ToolReview, 'status' | 'reviewNote'> }) => adminService.updateToolReview(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: adminKeys.toolReviews }); },
  });
}
