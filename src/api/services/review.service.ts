import { http } from '../../lib/http';
import { extractArray } from '../../utils/normalizeApiPayload';
import type { Review, ReviewCreatePayload, ReviewSummary } from '../../types/dto/review';

/** 列表/详情 query 与创建 body 与后端 ReviewCreateRequest 一致：targetType、targetId（非 resource*） */
function normalizeTargetId(resourceId: number | string): number | string {
  if (typeof resourceId === 'string' && /^\d+$/.test(resourceId.trim())) {
    return Number(resourceId.trim());
  }
  return resourceId;
}

function normalizeReview(row: any): Review {
  return {
    id: Number(row?.id ?? 0),
    resourceType: (row?.resourceType ?? row?.targetType ?? 'agent') as Review['resourceType'],
    resourceId: row?.resourceId ?? row?.targetId ?? '',
    userId: Number(row?.userId ?? 0),
    userName: String(row?.userName ?? '匿名用户'),
    avatar: row?.avatar ?? null,
    rating: Number(row?.rating ?? 0),
    content: String(row?.content ?? row?.comment ?? ''),
    helpfulCount: Number(row?.helpfulCount ?? 0),
    createTime: String(row?.createTime ?? ''),
  };
}

export const reviewService = {
  list: async (resourceType: 'agent' | 'skill' | 'app' | 'mcp' | 'dataset', resourceId: number | string) => {
    const targetId = normalizeTargetId(resourceId);
    const raw = await http.get<unknown>('/reviews', { params: { targetType: resourceType, targetId } });
    return extractArray(raw).map(normalizeReview);
  },

  summary: (resourceType: 'agent' | 'skill' | 'app' | 'mcp' | 'dataset', resourceId: number | string) => {
    const targetId = normalizeTargetId(resourceId);
    return http.get<ReviewSummary>('/reviews/summary', { params: { targetType: resourceType, targetId } });
  },

  create: (payload: ReviewCreatePayload) =>
    http
      .post<any>('/reviews', {
        targetType: payload.resourceType,
        targetId: normalizeTargetId(payload.resourceId),
        rating: payload.rating,
        // 后端 ReviewCreateRequest 为 comment（@NotBlank），非 content
        comment: payload.content,
      })
      .then(normalizeReview),

  toggleHelpful: (reviewId: number) =>
    http.post<void>(`/reviews/${reviewId}/helpful`),

  /** 逻辑删除；需登录且 X-User-Id，作者本人或 platform_admin / reviewer */
  remove: (reviewId: number) => http.delete<void>(`/reviews/${reviewId}`),
};
