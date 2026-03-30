import { http } from '../../lib/http';
import { normalizePaginated } from '../../utils/normalizeApiPayload';
import type { ResourceGrantCreateRequest, ResourceGrantListQuery, ResourceGrantVO } from '../../types/dto/catalog';

function toGrantVO(raw: any): ResourceGrantVO {
  return {
    id: raw?.id ?? '',
    resourceType: raw?.resourceType,
    resourceId: String(raw?.resourceId ?? ''),
    granteeApiKeyId: raw?.granteeApiKeyId ? String(raw.granteeApiKeyId) : undefined,
    granteeApiKeyPrefix: raw?.granteeApiKeyPrefix ? String(raw.granteeApiKeyPrefix) : undefined,
    grantedBy: raw?.grantedBy != null ? String(raw.grantedBy) : undefined,
    grantedByName: raw?.grantedByName ? String(raw.grantedByName) : undefined,
    actions: Array.isArray(raw?.actions) ? raw.actions : undefined,
    createdAt: raw?.createdAt ? String(raw.createdAt) : undefined,
    expiresAt: raw?.expiresAt ? String(raw.expiresAt) : undefined,
  };
}

export const resourceGrantService = {
  create: (payload: ResourceGrantCreateRequest) =>
    http.post<ResourceGrantVO>('/resource-grants', payload).then(toGrantVO),

  list: async (resourceType: string, resourceId: string | number, query?: ResourceGrantListQuery) => {
    const raw = await http.get<unknown>('/resource-grants', {
      params: { resourceType, resourceId, ...query },
    });
    return normalizePaginated<ResourceGrantVO>(raw, (row) => toGrantVO(row));
  },

  remove: (grantId: string | number) =>
    http.delete<void>(`/resource-grants/${grantId}`),
};
