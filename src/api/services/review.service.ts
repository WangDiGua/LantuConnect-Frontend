import { http } from '../../lib/http';
import { extractArray, normalizePaginated } from '../../utils/normalizeApiPayload';
import type { PaginatedData } from '../../types/api';
import type { Review, ReviewCreatePayload, ReviewSummary } from '../../types/dto/review';

/** 列表/详情 query 与创建 body 与后端 ReviewCreateRequest 一致：targetType、targetId（非 resource*） */
function normalizeTargetId(resourceId: number | string): number | string {
  if (typeof resourceId === 'string' && /^\d+$/.test(resourceId.trim())) {
    return Number(resourceId.trim());
  }
  return resourceId;
}

function normalizeReview(row: any): Review {
  const rawParent = row?.parentId ?? row?.parent_id ?? row?.replyToId;
  const parentId =
    rawParent != null && rawParent !== '' ? Number(rawParent) : undefined;
  const review: Review = {
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
  if (parentId != null && !Number.isNaN(parentId) && parentId > 0) {
    review.parentId = parentId;
  }
  return review;
}

export const reviewService = {
  list: async (resourceType: 'agent' | 'skill' | 'app' | 'mcp' | 'dataset', resourceId: number | string) => {
    const targetId = normalizeTargetId(resourceId);
    const raw = await http.get<unknown>('/reviews', { params: { targetType: resourceType, targetId } });
    return extractArray(raw).map(normalizeReview);
  },

  /** 分页评论（推荐）；全量请用本对象上的 `list`。 */
  pageList: async (
    resourceType: 'agent' | 'skill' | 'app' | 'mcp' | 'dataset',
    resourceId: number | string,
    page = 1,
    pageSize = 20,
  ): Promise<PaginatedData<Review>> => {
    const targetId = normalizeTargetId(resourceId);
    const raw = await http.get<unknown>('/reviews/page', {
      params: { targetType: resourceType, targetId, page, pageSize },
    });
    return normalizePaginated<Review>(raw, normalizeReview);
  },

  summary: (resourceType: 'agent' | 'skill' | 'app' | 'mcp' | 'dataset', resourceId: number | string) => {
    const targetId = normalizeTargetId(resourceId);
    return http.get<ReviewSummary>('/reviews/summary', { params: { targetType: resourceType, targetId } });
  },

  create: (payload: ReviewCreatePayload) => {
    const isReply = payload.parentId != null && payload.parentId > 0;
    const body: Record<string, unknown> = {
      targetType: payload.resourceType,
      targetId: normalizeTargetId(payload.resourceId),
      comment: payload.content,
    };
    if (isReply) {
      body.parentId = payload.parentId;
      if (payload.rating != null && payload.rating > 0) {
        body.rating = payload.rating;
      }
    } else {
      body.rating = payload.rating ?? 0;
    }
    return http.post<any>('/reviews', body).then(normalizeReview);
  },

  toggleHelpful: (reviewId: number) =>
    http.post<void>(`/reviews/${reviewId}/helpful`),

  /** 逻辑删除；需登录且 X-User-Id，作者本人或 platform_admin / reviewer */
  remove: (reviewId: number) => http.delete<void>(`/reviews/${reviewId}`),
};
