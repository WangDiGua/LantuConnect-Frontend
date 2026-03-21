// 分类（树形）

export interface Category {
  id: number;
  categoryCode: string;
  categoryName: string;
  parentId: number | null;
  icon: string | null;
  sortOrder: number;
  children?: Category[];
  createTime: string;
  updateTime: string;
}

export interface CategoryCreatePayload {
  categoryCode: string;
  categoryName: string;
  parentId?: number;
  icon?: string;
  sortOrder?: number;
}

export interface CategoryUpdatePayload extends Partial<CategoryCreatePayload> {}
