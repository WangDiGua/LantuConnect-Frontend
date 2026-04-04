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
  const id = Number(raw?.id ?? 0) || 0;
  const userIdRaw = raw?.userId ?? raw?.user_id;
  return {
    id,
    userId: userIdRaw != null ? String(userIdRaw) : undefined,
    username: raw?.username ? String(raw.username) : undefined,
    userName: raw?.userName != null ? String(raw.userName) : raw?.user_name != null ? String(raw.user_name) : undefined,
    contactEmail: String(raw?.contactEmail ?? raw?.contact_email ?? ''),
    contactPhone: raw?.contactPhone != null ? String(raw.contactPhone) : raw?.contact_phone != null ? String(raw.contact_phone) : undefined,
    companyName: raw?.companyName != null ? String(raw.companyName) : raw?.company_name != null ? String(raw.company_name) : undefined,
    applyReason: String(raw?.applyReason ?? raw?.apply_reason ?? ''),
    reviewComment: raw?.reviewComment != null ? String(raw.reviewComment) : raw?.review_comment != null ? String(raw.review_comment) : undefined,
    reviewedByName: raw?.reviewedByName != null ? String(raw.reviewedByName) : raw?.reviewed_by_name != null ? String(raw.reviewed_by_name) : undefined,
    status: normalizeStatus(raw?.status),
    createTime: raw?.createTime != null ? String(raw.createTime) : raw?.create_time != null ? String(raw.create_time) : undefined,
    updateTime: raw?.updateTime != null ? String(raw.updateTime) : raw?.update_time != null ? String(raw.update_time) : undefined,
  };
}

/** 后端 GET /developer/applications/me 返回列表（按 create_time 降序）；优先取待审核一条以便与入驻页逻辑一致 */
function pickMineFromPayload(raw: unknown): DeveloperApplicationVO | null {
  if (raw == null) return null;
  if (Array.isArray(raw)) {
    if (raw.length === 0) return null;
    const vos = raw.map((row) => toApplication(row)).filter((v) => v.id > 0);
    if (vos.length === 0) return null;
    const pending = vos.find((v) => v.status === 'pending');
    return pending ?? vos[0];
  }
  if (typeof raw !== 'object') return null;
  const one = toApplication(raw);
  return one.id > 0 ? one : null;
}

export const developerApplicationService = {
  create: async (payload: DeveloperApplicationCreateRequest): Promise<DeveloperApplicationVO> => {
    const raw = await http.post<unknown>('/developer/applications', payload);
    return toApplication(raw);
  },

  getMine: async (): Promise<DeveloperApplicationVO | null> => {
    const raw = await http.get<unknown>('/developer/applications/me');
    return pickMineFromPayload(raw);
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
