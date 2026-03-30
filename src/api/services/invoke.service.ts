import { http } from '../../lib/http';
import type { InvokeRequest, InvokeResponse } from '../../types/dto/catalog';

export const invokeService = {
  invoke: (payload: InvokeRequest, apiKey?: string, traceId?: string) =>
    http.post<InvokeResponse>('/invoke', payload, {
      headers: {
        ...(apiKey ? { 'X-Api-Key': apiKey } : {}),
        ...(traceId ? { 'X-Trace-Id': traceId } : {}),
      },
    }),
};
