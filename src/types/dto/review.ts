export interface Review {
  id: number;
  targetType: 'agent' | 'skill' | 'app';
  targetId: number;
  userId: number;
  userName: string;
  avatar: string | null;
  rating: number;
  comment: string;
  helpfulCount: number;
  createTime: string;
}

export interface ReviewCreatePayload {
  targetType: 'agent' | 'skill' | 'app';
  targetId: number;
  rating: number;
  comment: string;
}

export interface ReviewSummary {
  avgRating: number;
  totalCount: number;
  distribution: Record<number, number>;
}
