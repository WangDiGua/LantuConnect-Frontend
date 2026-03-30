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
}

export interface ReviewCreatePayload {
  resourceType: 'agent' | 'skill' | 'app' | 'mcp' | 'dataset';
  resourceId: number | string;
  rating: number;
  /** 正文；请求体映射为后端字段 `comment` */
  content: string;
}

export interface ReviewSummary {
  avgRating: number;
  totalCount: number;
  distribution: Record<number, number>;
}
