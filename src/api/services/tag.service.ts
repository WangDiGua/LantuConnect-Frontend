import { http } from '../../lib/http';
import { tryBatchPost } from '../../utils/batchApi';
import { runWithConcurrency } from '../../utils/runWithConcurrency';
import { extractArray } from '../../utils/normalizeApiPayload';
import type { TagItem } from '../../types/dto/tag';
import type { TagUpdateRequest } from '../../types/dto/explore';

export const tagService = {
  list: () =>
    http.get<TagItem[]>('/tags'),

  create: (payload: { name: string; category: string }) =>
    http.post<TagItem>('/tags', payload),

  update: (id: number, payload: TagUpdateRequest) =>
    http.put<TagItem>(`/tags/${id}`, payload),

  remove: (id: number) =>
    http.delete(`/tags/${id}`),

  batchCreate: async (tags: { name: string; category: string }[]) => {
    const raw = await http.post<unknown>('/tags/batch', tags);
    return extractArray<TagItem>(raw);
  },

  batchRemove: async (ids: number[]): Promise<void> => {
    if (!ids.length) return;
    await tryBatchPost(
      '/tags/batch-delete',
      { ids },
      async () => {
        const r = await runWithConcurrency(ids, 4, async (id) => {
          await http.delete(`/tags/${id}`);
        });
        if (r.errors.length) throw r.errors[0]!.error;
      },
    );
  },
};
