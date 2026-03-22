import { http } from '../../lib/http';
import type {
  Category,
  CategoryCreatePayload,
  CategoryUpdatePayload,
} from '../../types/dto/category';

export const categoryService = {
  list: () => http.get<Category[]>('/v1/categories'),

  create: (payload: CategoryCreatePayload) =>
    http.post<Category>('/v1/categories', payload),

  update: (id: number, payload: CategoryUpdatePayload) =>
    http.put<Category>(`/v1/categories/${id}`, payload),

  remove: (id: number) => http.delete(`/v1/categories/${id}`),
};

export function buildCategoryTree(flatList: Category[]): Category[] {
  const map = new Map<number, Category>();
  const roots: Category[] = [];

  for (const item of flatList) {
    map.set(item.id, { ...item, children: [] });
  }

  for (const item of map.values()) {
    if (item.parentId === null) {
      roots.push(item);
    } else {
      const parent = map.get(item.parentId);
      if (parent) {
        parent.children ??= [];
        parent.children.push(item);
      } else {
        roots.push(item);
      }
    }
  }

  const sortNodes = (nodes: Category[]) => {
    nodes.sort((a, b) => a.sortOrder - b.sortOrder);
    for (const n of nodes) {
      if (n.children?.length) sortNodes(n.children);
    }
  };
  sortNodes(roots);

  return roots;
}
