import { http } from '../../lib/http';
import type { PaginatedData, PaginationParams } from '../../types/api';
import type {
  CreateKBPayload,
  HitTestResult,
  KBDocument,
  KnowledgeBase,
} from '../../types/dto/knowledge';

export const knowledgeService = {
  list: (params?: PaginationParams) =>
    http.get<PaginatedData<KnowledgeBase>>('/knowledge-bases', { params }),

  getById: (id: string) => http.get<KnowledgeBase>(`/knowledge-bases/${id}`),

  create: (data: CreateKBPayload) =>
    http.post<KnowledgeBase>('/knowledge-bases', data),

  update: (id: string, data: Partial<CreateKBPayload>) =>
    http.put<KnowledgeBase>(`/knowledge-bases/${id}`, data),

  delete: (id: string) => http.delete(`/knowledge-bases/${id}`),

  listDocuments: (kbId: string) =>
    http.get<KBDocument[]>(`/knowledge-bases/${kbId}/documents`),

  uploadDocument: (kbId: string, formData: FormData) =>
    http.upload<KBDocument>(`/knowledge-bases/${kbId}/documents`, formData),

  hitTest: (kbId: string, query: string, topK?: number) =>
    http.post<HitTestResult[]>(`/knowledge-bases/${kbId}/hit-test`, { query, topK }),
};
