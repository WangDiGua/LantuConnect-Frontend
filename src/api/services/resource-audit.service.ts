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

/** 取首个非空字符串；兼容后端 snake_case、嵌套 resource 快照 */
function firstNonEmpty(...vals: unknown[]): string | undefined {
  for (const v of vals) {
    if (v == null) continue;
    const s = String(v).trim();
    if (s.length > 0) return s;
  }
  return undefined;
}

function toAuditItem(raw: any): ResourceAuditItemVO {
  const res =
    raw?.resource != null && typeof raw.resource === 'object' ? (raw.resource as Record<string, unknown>) : undefined;

  const reason = firstNonEmpty(
    raw?.reason,
    raw?.reviewComment,
    raw?.review_comment,
    raw?.rejectReason,
    raw?.reject_reason,
    raw?.auditComment,
    raw?.audit_comment,
  );

  const resourceCode = firstNonEmpty(
    raw?.resourceCode,
    raw?.resource_code,
    res?.resourceCode,
    res?.resource_code,
  );

  const displayName =
    firstNonEmpty(raw?.displayName, raw?.display_name, raw?.name, res?.displayName, res?.display_name, res?.name) ??
    '未命名资源';

  const description =
    firstNonEmpty(raw?.description, res?.description, raw?.desc) ?? '';

  const submitterName = firstNonEmpty(
    raw?.submitterName,
    raw?.submitter_name,
    raw?.submitterRealName,
    raw?.submitter_real_name,
  );

  const submitter = firstNonEmpty(
    raw?.submitter,
    raw?.submitterUsername,
    raw?.submitter_username,
    raw?.submitUser,
    raw?.submit_user,
    submitterName,
  );

  return {
    id: Number(raw?.id ?? raw?.auditId ?? raw?.audit_id ?? 0) || 0,
    resourceId:
      Number(
        raw?.resourceId ??
          raw?.resource_id ??
          raw?.targetId ??
          raw?.target_id ??
          res?.resourceId ??
          res?.resource_id ??
          res?.id ??
          0,
      ) || 0,
    resourceType: String(
      raw?.resourceType ?? raw?.resource_type ?? raw?.targetType ?? raw?.target_type ?? res?.resourceType ?? res?.resource_type ?? 'agent',
    ) as ResourceAuditItemVO['resourceType'],
    accessPolicy:
      raw?.accessPolicy != null
        ? String(raw.accessPolicy)
        : raw?.access_policy != null
          ? String(raw.access_policy)
          : res?.accessPolicy != null
            ? String(res.accessPolicy)
            : res?.access_policy != null
              ? String(res.access_policy)
              : undefined,
    resourceCode,
    displayName,
    description,
    status: normalizeStatus(raw?.status ?? res?.status),
    submitter,
    submitterName: submitterName ?? submitter,
    reviewerName: firstNonEmpty(raw?.reviewerName, raw?.reviewer_name),
    submitTime: firstNonEmpty(raw?.submitTime, raw?.submit_time, raw?.createdAt, raw?.created_at),
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
