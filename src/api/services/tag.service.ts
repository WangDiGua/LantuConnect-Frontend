import { http } from '../../lib/http';
import type { TagItem } from '../../types/dto/tag';

export const tagService = {
  list: () =>
    http.get<TagItem[]>('/tags'),

  create: (payload: { name: string; category: string }) =>
    http.post<TagItem>('/tags', payload),

  remove: (id: number) =>
    http.delete(`/tags/${id}`),

  batchCreate: (tags: { name: string; category: string }[]) =>
    http.post<TagItem[]>('/tags/batch', tags),
};
