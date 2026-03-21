import { http } from '../../lib/http';
import type { PaginatedData, PaginationParams } from '../../types/api';
import type {
  AuditLogEntry,
  CreateModelConfigDTO,
  CreateRateLimitDTO,
  ModelConfig,
  RateLimitRule,
  SecuritySetting,
  SystemParam,
} from '../../types/dto/system-config';

export const systemConfigService = {
  listModelConfigs: (params?: PaginationParams) =>
    http.get<PaginatedData<ModelConfig>>('/system-config/model-configs', { params }),

  createModelConfig: (data: CreateModelConfigDTO) =>
    http.post<ModelConfig>('/system-config/model-configs', data),

  updateModelConfig: (id: string, data: Partial<CreateModelConfigDTO>) =>
    http.put<ModelConfig>(`/system-config/model-configs/${id}`, data),

  deleteModelConfig: (id: string) =>
    http.delete(`/system-config/model-configs/${id}`),

  listRateLimits: () =>
    http.get<RateLimitRule[]>('/system-config/rate-limits'),

  createRateLimit: (data: CreateRateLimitDTO) =>
    http.post<RateLimitRule>('/system-config/rate-limits', data),

  updateRateLimit: (id: string, data: Partial<CreateRateLimitDTO>) =>
    http.put<RateLimitRule>(`/system-config/rate-limits/${id}`, data),

  deleteRateLimit: (id: string) =>
    http.delete(`/system-config/rate-limits/${id}`),

  listAuditLogs: (params?: PaginationParams) =>
    http.get<PaginatedData<AuditLogEntry>>('/system-config/audit-logs', { params }),

  getParams: () => http.get<SystemParam[]>('/system-config/params'),

  updateParams: (data: { key: string; value: string }[]) =>
    http.put<SystemParam[]>('/system-config/params', data),

  getSecurity: () =>
    http.get<SecuritySetting[]>('/system-config/security'),

  updateSecurity: (data: SecuritySetting[]) =>
    http.put<SecuritySetting[]>('/system-config/security', data),

  applyNetworkWhitelist: (rules: string[]) =>
    http.post<void>('/system-config/network/apply', { rules }),

  publishAcl: (rules: unknown[]) =>
    http.post<void>('/system-config/acl/publish', { rules }),
};
