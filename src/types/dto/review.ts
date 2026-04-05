export interface Review {
  id: number;
  resourceType: 'agent' | 'skill' | 'app' | 'mcp' | 'dataset';
  resourceId: number | string;
  userId: number;
  userName: string;
  avatar: string | null;
  rating: number;
  content: string;
  helpfulCount: number;
  createTime: string;
  /** 回复所指向的评论 id；顶级评价通常无此字段 */
  parentId?: number;
}

export interface ReviewCreatePayload {
  resourceType: 'agent' | 'skill' | 'app' | 'mcp' | 'dataset';
  resourceId: number | string;
  /** 顶级评价必填；回复可不传或由后端忽略 */
  rating?: number;
  /** 正文；请求体映射为后端字段 `comment` */
  content: string;
  /** 若设置则为对某条评价的回复；需后端 POST /reviews 支持 parentId */
  parentId?: number;
}

export interface ReviewSummary {
  avgRating: number;
  totalCount: number;
  distribution: Record<number, number>;
}
