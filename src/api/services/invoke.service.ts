import { buildGatewayAuthHeaders, http } from '../../lib/http';
import { readStreamingInvoke } from '../../lib/gatewayInvokeStream';
import type { InvokeRequest, InvokeResponse } from '../../types/dto/catalog';

export const invokeService = {
  invoke: (payload: InvokeRequest, apiKey?: string, traceId?: string) =>
    http.post<InvokeResponse>('/invoke', payload, {
      headers: {
        ...(apiKey ? { 'X-Api-Key': apiKey } : {}),
        ...(traceId ? { 'X-Trace-Id': traceId } : {}),
      },
    }),

  invokeStream: (
    payload: InvokeRequest,
    apiKey: string,
    traceId: string | undefined,
    onChunk: (delta: string) => void,
    signal?: AbortSignal,
  ) =>
    readStreamingInvoke(
      '/invoke-stream',
      payload,
      buildGatewayAuthHeaders({ apiKey, traceId }),
      onChunk,
      signal,
    ),
};
