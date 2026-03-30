import { http } from '../../lib/http';
import { normalizePaginated } from '../../utils/normalizeApiPayload';
import type { AuditItem } from '../../types/dto/audit';

export const auditService = {
  listPendingAgents: async (query?: { page?: number; pageSize?: number }) => {
    const raw = await http.get<unknown>('/audit/agents', { params: query });
    return normalizePaginated<AuditItem>(raw);
  },

  listPendingSkills: async (query?: { page?: number; pageSize?: number }) => {
    const raw = await http.get<unknown>('/audit/skills', { params: query });
    return normalizePaginated<AuditItem>(raw);
  },

  approve: (id: number, type: 'agent' | 'skill') =>
    http.post<void>(`/audit/${type}s/${id}/approve`),

  reject: (id: number, type: 'agent' | 'skill', reason: string) =>
    http.post<void>(`/audit/${type}s/${id}/reject`, { reason }),

  publish: (id: number, type: 'agent' | 'skill') =>
    http.post<void>(`/audit/${type}s/${id}/publish`),
};
