import { http } from '../../lib/http';
import type { PaginatedData } from '../../types/api';
import type { AuditItem } from '../../types/dto/audit';

export const auditService = {
  listPendingAgents: (query?: { page?: number; pageSize?: number }) =>
    http.get<PaginatedData<AuditItem>>('/audit/agents', { params: query }),

  listPendingSkills: (query?: { page?: number; pageSize?: number }) =>
    http.get<PaginatedData<AuditItem>>('/audit/skills', { params: query }),

  approve: (id: number, type: 'agent' | 'skill') =>
    http.post<void>(`/audit/${type}s/${id}/approve`),

  reject: (id: number, type: 'agent' | 'skill', reason: string) =>
    http.post<void>(`/audit/${type}s/${id}/reject`, { reason }),
};
