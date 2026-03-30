import { http } from '../../lib/http';
import { normalizePaginated } from '../../utils/normalizeApiPayload';
import type {
  InvokeRequest,
  InvokeResponse,
  ResourceCatalogItemVO,
  ResourceCatalogQueryRequest,
  ResourceResolveRequest,
  ResourceResolveVO,
} from '../../types/dto/catalog';

export const sdkService = {
  listResources: async (apiKey: string, params?: ResourceCatalogQueryRequest) => {
    const raw = await http.get<unknown>('/sdk/v1/resources', {
      params,
      headers: { 'X-Api-Key': apiKey },
    });
    return normalizePaginated<ResourceCatalogItemVO>(raw);
  },

  getResource: (apiKey: string, resourceType: string, resourceId: string | number) =>
    http.get(`/sdk/v1/resources/${resourceType}/${resourceId}`, {
      headers: { 'X-Api-Key': apiKey },
    }),

  resolve: (apiKey: string, payload: ResourceResolveRequest) =>
    http.post<ResourceResolveVO>('/sdk/v1/resolve', payload, {
      headers: { 'X-Api-Key': apiKey },
    }),

  invoke: (apiKey: string, payload: InvokeRequest, traceId?: string) =>
    http.post<InvokeResponse>('/sdk/v1/invoke', payload, {
      headers: {
        'X-Api-Key': apiKey,
        ...(traceId ? { 'X-Trace-Id': traceId } : {}),
      },
    }),
};
