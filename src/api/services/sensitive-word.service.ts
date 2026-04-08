import { http } from '../../lib/http';
import { tryBatchPost, tryBatchPut } from '../../utils/batchApi';
import { runWithConcurrency } from '../../utils/runWithConcurrency';
import { extractArray, normalizePaginated } from '../../utils/normalizeApiPayload';
import type {
  SensitiveWord,
  SensitiveWordAddRequest,
  SensitiveWordBatchAddRequest,
  SensitiveWordUpdateRequest,
  SensitiveWordCheckRequest,
  SensitiveWordCheckResult,
  SensitiveWordCategoryCount,
  SensitiveWordImportResult,
} from '../../types/dto/sensitive-word';

export const sensitiveWordService = {
  list: async (params?: {
    page?: number;
    pageSize?: number;
    keyword?: string;
    category?: string;
    enabled?: boolean;
  }) => {
    const raw = await http.get<unknown>('/sensitive-words', { params });
    return normalizePaginated<SensitiveWord>(raw, (row: any) => ({
      ...row,
      createdByName: row?.createdByName ? String(row.createdByName) : undefined,
    }));
  },

  categories: async () => {
    const raw = await http.get<unknown>('/sensitive-words/categories');
    return extractArray<SensitiveWordCategoryCount>(raw);
  },

  count: () =>
    http.get<{ total: number }>('/sensitive-words/count'),

  create: (payload: SensitiveWordAddRequest) =>
    http.post<SensitiveWord>('/sensitive-words', payload),

  batchCreate: (payload: SensitiveWordBatchAddRequest) =>
    http.post<SensitiveWordImportResult>('/sensitive-words/batch', payload),

  update: (id: number, payload: SensitiveWordUpdateRequest) =>
    http.put<void>(`/sensitive-words/${id}`, payload),

  remove: (id: number) =>
    http.delete<void>(`/sensitive-words/${id}`),

  /** 批量删除；优先 POST `/sensitive-words/batch-delete`，否则逐条 DELETE */
  batchRemove: async (ids: number[]): Promise<void> => {
    if (!ids.length) return;
    await tryBatchPost(
      '/sensitive-words/batch-delete',
      { ids },
      async () => {
        const r = await runWithConcurrency(ids, 4, async (id) => {
          await http.delete<void>(`/sensitive-words/${id}`);
        });
        if (r.errors.length) throw r.errors[0]!.error;
      },
    );
  },

  /** 批量启用/禁用；优先 PUT `/sensitive-words/batch`，否则逐条 PUT */
  batchSetEnabled: async (ids: number[], enabled: boolean): Promise<void> => {
    if (!ids.length) return;
    await tryBatchPut(
      '/sensitive-words/batch',
      { ids, enabled },
      async () => {
        const r = await runWithConcurrency(ids, 4, async (id) => {
          await http.put<void>(`/sensitive-words/${id}`, { enabled } as SensitiveWordUpdateRequest);
        });
        if (r.errors.length) throw r.errors[0]!.error;
      },
    );
  },

  check: (payload: SensitiveWordCheckRequest) =>
    http.post<any>('/sensitive-words/check', payload).then((raw) => ({
      containsSensitive: Boolean(raw?.containsSensitive ?? raw?.hasSensitive),
      sensitiveWords: Array.isArray(raw?.sensitiveWords)
        ? raw.sensitiveWords.map(String)
        : Array.isArray(raw?.matches)
          ? raw.matches.map(String)
          : [],
      filteredText: String(raw?.filteredText ?? ''),
    }) as SensitiveWordCheckResult),

  importTxt: (file: File, payload?: { category?: string; severity?: number; source?: string }) => {
    const form = new FormData();
    form.append('file', file);
    if (payload?.category) form.append('category', payload.category);
    if (payload?.severity !== undefined) form.append('severity', String(payload.severity));
    if (payload?.source) form.append('source', payload.source);
    return http.post<SensitiveWordImportResult>('/sensitive-words/import-txt', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  import: (file: File, payload?: { category?: string; severity?: number; source?: string }) => {
    const form = new FormData();
    form.append('file', file);
    if (payload?.category) form.append('category', payload.category);
    if (payload?.severity !== undefined) form.append('severity', String(payload.severity));
    if (payload?.source) form.append('source', payload.source);
    return http.post<SensitiveWordImportResult>('/sensitive-words/import', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};
