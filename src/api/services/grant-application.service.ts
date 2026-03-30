import { http } from '../../lib/http';
import type { PaginatedData } from '../../types/api';
import { normalizePaginated } from '../../utils/normalizeApiPayload';
import type { GrantApplicationRequest, GrantApplicationVO } from '../../types/dto/grant-application';
import type { ResourceRejectRequest } from '../../types/dto/resource-center';

function normalizeVO(raw: any): GrantApplicationVO {
  return {
    id: Number(raw?.id ?? 0),
    applicantId: Number(raw?.applicantId ?? 0),
    applicantName: raw?.applicantName ? String(raw.applicantName) : undefined,
    resourceType: String(raw?.resourceType ?? ''),
    resourceId: Number(raw?.resourceId ?? 0),
    apiKeyId: String(raw?.apiKeyId ?? ''),
    actions: Array.isArray(raw?.actions) ? raw.actions.map(String) : [],
    useCase: raw?.useCase ? String(raw.useCase) : undefined,
    callFrequency: raw?.callFrequency ? String(raw.callFrequency) : undefined,
    status: raw?.status ?? 'pending',
    reviewerId: raw?.reviewerId ? Number(raw.reviewerId) : undefined,
    reviewerName: raw?.reviewerName ? String(raw.reviewerName) : undefined,
    rejectReason: raw?.rejectReason ? String(raw.rejectReason) : undefined,
    reviewTime: raw?.reviewTime ? String(raw.reviewTime) : undefined,
    expiresAt: raw?.expiresAt ? String(raw.expiresAt) : undefined,
    createTime: raw?.createTime ? String(raw.createTime) : undefined,
  };
}

export const grantApplicationService = {
  submit: async (payload: GrantApplicationRequest): Promise<{ applicationId: number }> => {
    const raw = await http.post<unknown>('/grant-applications', payload);
    const id = typeof raw === 'object' && raw !== null ? Number((raw as any).applicationId ?? 0) : 0;
    return { applicationId: id };
  },

  listMine: async (query?: { status?: string; page?: number; pageSize?: number }): Promise<PaginatedData<GrantApplicationVO>> => {
    const raw = await http.get<unknown>('/grant-applications/mine', { params: query });
    return normalizePaginated<GrantApplicationVO>(raw, (row) => normalizeVO(row));
  },

  listPending: async (query?: { status?: string; page?: number; pageSize?: number; keyword?: string }): Promise<PaginatedData<GrantApplicationVO>> => {
    const raw = await http.get<unknown>('/grant-applications/pending', { params: query });
    return normalizePaginated<GrantApplicationVO>(raw, (row) => normalizeVO(row));
  },

  approve: (id: number): Promise<void> =>
    http.post<void>(`/grant-applications/${id}/approve`),

  reject: (id: number, payload: ResourceRejectRequest): Promise<void> =>
    http.post<void>(`/grant-applications/${id}/reject`, payload),
};
