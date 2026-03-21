import { http } from '../../lib/http';
import type { Review, ReviewCreatePayload, ReviewSummary } from '../../types/dto/review';

export const reviewService = {
  list: (targetType: 'agent' | 'skill' | 'app', targetId: number) =>
    http.get<Review[]>('/reviews', { params: { targetType, targetId } }),

  summary: (targetType: 'agent' | 'skill' | 'app', targetId: number) =>
    http.get<ReviewSummary>('/reviews/summary', { params: { targetType, targetId } }),

  create: (payload: ReviewCreatePayload) =>
    http.post<Review>('/reviews', payload),

  toggleHelpful: (reviewId: number) =>
    http.post<void>(`/reviews/${reviewId}/helpful`),
};
