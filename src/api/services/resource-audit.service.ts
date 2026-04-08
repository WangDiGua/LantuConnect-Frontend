import { http } from '../../lib/http';
import { tryBatchPost } from '../../utils/batchApi';
import { runWithConcurrency } from '../../utils/runWithConcurrency';
import { normalizePaginated } from '../../utils/normalizeApiPayload';
import type {
  ResourceAuditItemVO,
  ResourceAuditPage,
  ResourceAuditQuery,
  ResourceRejectRequest,
} from '../../types/dto/resource-center';

function normalizeStatus(raw: unknown): ResourceAuditItemVO['status'] {
  const value = String(raw ?? '').toLowerCase();
  if (value === 'draft') return 'draft';
  if (value === 'pending_review') return 'pending_review';
  if (value === 'testing') return 'testing';
  if (value === 'published') return 'published';
  if (value === 'rejected') return 'rejected';
  if (value === 'deprecated') return 'deprecated';
  if (value === 'merged_live') return 'merged_live';
  return 'pending_review';
}

function toAuditItem(raw: any): ResourceAuditItemVO {
  const reason = raw?.reason ? String(raw.reason) : raw?.reviewComment ? String(raw.reviewComment) : undefined;
  return {
    id: Number(raw?.id ?? raw?.auditId ?? 0) || 0,
    resourceId: Number(raw?.resourceId ?? raw?.targetId ?? 0) || 0,
    resourceType: String(raw?.resourceType ?? raw?.targetType ?? 'agent') as ResourceAuditItemVO['resourceType'],
    accessPolicy: raw?.accessPolicy != null ? String(raw.accessPolicy) : raw?.access_policy != null ? String(raw.access_policy) : undefined,
    resourceCode: raw?.resourceCode ? String(raw.resourceCode) : undefined,
    displayName: String(raw?.displayName ?? raw?.name ?? '未命名资源'),
    description: raw?.description ? String(raw.description) : '',
    status: normalizeStatus(raw?.status),
    submitter: raw?.submitter ? String(raw.submitter) : raw?.submitterName ? String(raw.submitterName) : undefined,
    submitterName: raw?.submitterName ? String(raw.submitterName) : undefined,
    reviewerName: raw?.reviewerName ? String(raw.reviewerName) : undefined,
    submitTime: raw?.submitTime ? String(raw.submitTime) : undefined,
    reason,
    reviewComment: reason,
  };
}

export const resourceAuditService = {
  list: async (query?: ResourceAuditQuery): Promise<ResourceAuditPage> => {
    const raw = await http.get<unknown>('/audit/resources', { params: query });
    return normalizePaginated<ResourceAuditItemVO>(raw, (row) => toAuditItem(row));
  },

  approve: (id: number): Promise<void> =>
    http.post<void>(`/audit/resources/${id}/approve`),

  reject: (id: number, payload: ResourceRejectRequest): Promise<void> =>
    http.post<void>(`/audit/resources/${id}/reject`, payload),

  publish: (id: number): Promise<void> =>
    http.post<void>(`/audit/resources/${id}/publish`),

  /** 平台强制下架；body 可选 reason（后端空则记为「平台强制下架」） */
  platformForceDeprecate: (resourceId: number, payload?: ResourceRejectRequest): Promise<void> =>
    http.post<void>(`/audit/resources/${resourceId}/platform-force-deprecate`, payload ?? {}),

  /** 批量通过（待审核）；优先 POST `/audit/resources/batch-approve` */
  batchApprove: async (ids: number[]): Promise<void> => {
    if (!ids.length) return;
    await tryBatchPost(
      '/audit/resources/batch-approve',
      { ids },
      async () => {
        const r = await runWithConcurrency(ids, 4, async (id) => {
          await http.post<void>(`/audit/resources/${id}/approve`);
        });
        if (r.errors.length) throw r.errors[0]!.error;
      },
    );
  },

  /** 批量驳回；优先 POST `/audit/resources/batch-reject` */
  batchReject: async (ids: number[], payload: ResourceRejectRequest): Promise<void> => {
    if (!ids.length) return;
    await tryBatchPost(
      '/audit/resources/batch-reject',
      { ids, reason: payload.reason },
      async () => {
        const r = await runWithConcurrency(ids, 4, async (id) => {
          await http.post<void>(`/audit/resources/${id}/reject`, payload);
        });
        if (r.errors.length) throw r.errors[0]!.error;
      },
    );
  },

  /** 批量发布（测试中）；优先 POST `/audit/resources/batch-publish` */
  batchPublish: async (ids: number[]): Promise<void> => {
    if (!ids.length) return;
    await tryBatchPost(
      '/audit/resources/batch-publish',
      { ids },
      async () => {
        const r = await runWithConcurrency(ids, 4, async (id) => {
          await http.post<void>(`/audit/resources/${id}/publish`);
        });
        if (r.errors.length) throw r.errors[0]!.error;
      },
    );
  },
};
