import { http } from '../../lib/http';
import { extractArray } from '../../utils/normalizeApiPayload';
import { ApiException } from '../../types/api';
import type {
  Category,
  CategoryCreatePayload,
  CategoryUpdatePayload,
} from '../../types/dto/category';

function deprecatedWriteError<T>(): Promise<T> {
  return Promise.reject(
    new ApiException({
      code: 1004,
      status: 410,
      message: '接口已下线，请迁移到统一网关接口',
    }),
  );
}

export const categoryService = {
  list: async (): Promise<Category[]> => {
    const raw = await http.get<unknown>('/tags');
    const tags = extractArray<{ id: number; name: string; category?: string; createTime?: string; updateTime?: string }>(raw);
    return tags.map((tag, idx) => ({
      id: Number(tag.id),
      categoryCode: `${tag.category || 'tag'}-${tag.id}`,
      categoryName: tag.name,
      parentId: null,
      icon: 'Tag',
      sortOrder: idx,
      createTime: tag.createTime || '',
      updateTime: tag.updateTime || '',
      children: [],
    }));
  },

  create: (_payload: CategoryCreatePayload): Promise<Category> => deprecatedWriteError<Category>(),

  update: (_id: number, _payload: CategoryUpdatePayload): Promise<Category> => deprecatedWriteError<Category>(),

  remove: (_id: number): Promise<void> => deprecatedWriteError<void>(),
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
