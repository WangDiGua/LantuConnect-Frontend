import { http } from '../../lib/http';
import type { PaginatedData, PaginationParams } from '../../types/api';
import type { ModelEndpoint } from '../../types/dto/model-service';
import type { AuditLogEntry } from '../../types/dto/system-config';
import type { ToolReview } from '../../types/dto/tool';
import type {
  AdminStats,
  Announcement,
  BackupRecord,
  CreateGatewayRoutePayload,
  CreateModelEndpointDTO,
  ErrorLog,
  GatewayRoute,
  HealthCheck,
  OperationLog,
  OpsQueueItem,
  ResourceMetric,
  SensitiveWord,
} from '../../types/dto/admin';

export const adminService = {
  getResources: () =>
    http.get<ResourceMetric[]>('/admin/resources'),

  getStats: () => http.get<AdminStats>('/admin/stats'),

  getHealth: () => http.get<HealthCheck[]>('/admin/health'),

  listGatewayRoutes: () =>
    http.get<GatewayRoute[]>('/admin/gateway/routes'),

  createGatewayRoute: (data: CreateGatewayRoutePayload) =>
    http.post<GatewayRoute>('/admin/gateway/routes', data),

  deleteGatewayRoute: (id: string) =>
    http.delete(`/admin/gateway/routes/${id}`),

  listBackups: () => http.get<BackupRecord[]>('/admin/backups'),

  createBackup: (data: Pick<BackupRecord, 'name' | 'schedule' | 'target'>) =>
    http.post<BackupRecord>('/admin/backups', data),

  runBackup: (id: string) =>
    http.post<BackupRecord>(`/admin/backups/${id}/run`),

  listAnnouncements: () =>
    http.get<Announcement[]>('/admin/announcements'),

  listOpLogs: (params?: PaginationParams) =>
    http.get<PaginatedData<OperationLog>>('/admin/logs/operations', { params }),

  listErrLogs: (params?: PaginationParams) =>
    http.get<PaginatedData<ErrorLog>>('/admin/logs/errors', { params }),

  listAuditLogs: (params?: PaginationParams) =>
    http.get<PaginatedData<AuditLogEntry>>('/admin/logs/audit', { params }),

  listToolReviews: () =>
    http.get<ToolReview[]>('/admin/tool-reviews'),

  updateToolReview: (id: string, data: Pick<ToolReview, 'status' | 'reviewNote'>) =>
    http.patch<ToolReview>(`/admin/tool-reviews/${id}`, data),

  listOpsQueue: () =>
    http.get<OpsQueueItem[]>('/admin/ops-queue'),

  updateOpsItem: (id: string, data: Partial<Pick<OpsQueueItem, 'status' | 'priority' | 'assignee'>>) =>
    http.patch<OpsQueueItem>(`/admin/ops-queue/${id}`, data),

  listSensitiveWords: () =>
    http.get<string[]>('/admin/sensitive-words'),

  addSensitiveWord: (word: string) =>
    http.post<string>('/admin/sensitive-words', { word }),

  deleteSensitiveWord: (id: string) =>
    http.delete(`/admin/sensitive-words/${id}`),

  listModelEndpoints: () =>
    http.get<ModelEndpoint[]>('/admin/model-endpoints'),

  createModelEndpoint: (data: CreateModelEndpointDTO) =>
    http.post<ModelEndpoint>('/admin/model-endpoints', data),

  updateModelEndpoint: (id: string, data: Partial<CreateModelEndpointDTO>) =>
    http.put<ModelEndpoint>(`/admin/model-endpoints/${id}`, data),

  deleteModelEndpoint: (id: string) =>
    http.delete(`/admin/model-endpoints/${id}`),
};
