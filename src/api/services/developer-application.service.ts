import { http } from '../../lib/http';
import { normalizePaginated } from '../../utils/normalizeApiPayload';
import type {
  DeveloperApplicationCreateRequest,
  DeveloperApplicationQueryRequest,
  DeveloperApplicationReviewRequest,
  DeveloperApplicationStatus,
  DeveloperApplicationVO,
} from '../../types/dto/developer-application';

function normalizeStatus(status: unknown): DeveloperApplicationStatus {
  const raw = String(status ?? '').toLowerCase();
  if (raw === 'pending' || raw === 'approved' || raw === 'rejected') return raw;
  return 'unknown';
}

function toApplication(raw: any): DeveloperApplicationVO {
  return {
    id: Number(raw?.id ?? 0) || 0,
    userId: raw?.userId ? String(raw.userId) : undefined,
    username: raw?.username ? String(raw.username) : undefined,
    userName: raw?.userName ? String(raw.userName) : undefined,
    contactEmail: String(raw?.contactEmail ?? ''),
    contactPhone: raw?.contactPhone ? String(raw.contactPhone) : undefined,
    companyName: raw?.companyName ? String(raw.companyName) : undefined,
    applyReason: String(raw?.applyReason ?? ''),
    reviewComment: raw?.reviewComment ? String(raw.reviewComment) : undefined,
    reviewedByName: raw?.reviewedByName ? String(raw.reviewedByName) : undefined,
    status: normalizeStatus(raw?.status),
    createTime: raw?.createTime ? String(raw.createTime) : undefined,
    updateTime: raw?.updateTime ? String(raw.updateTime) : undefined,
  };
}

export const developerApplicationService = {
  create: async (payload: DeveloperApplicationCreateRequest): Promise<DeveloperApplicationVO> => {
    const raw = await http.post<unknown>('/developer/applications', payload);
    return toApplication(raw);
  },

  getMine: async (): Promise<DeveloperApplicationVO | null> => {
    const raw = await http.get<unknown>('/developer/applications/me');
    if (!raw || typeof raw !== 'object') return null;
    return toApplication(raw);
  },

  list: async (query?: DeveloperApplicationQueryRequest) => {
    const raw = await http.get<unknown>('/developer/applications', { params: query });
    return normalizePaginated<DeveloperApplicationVO>(raw, (row) => toApplication(row));
  },

  approve: (id: number, payload?: DeveloperApplicationReviewRequest) =>
    http.post<void>(`/developer/applications/${id}/approve`, payload),

  reject: (id: number, payload: DeveloperApplicationReviewRequest) =>
    http.post<void>(`/developer/applications/${id}/reject`, payload),
};
