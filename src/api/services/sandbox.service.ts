import { http } from '../../lib/http';
import { extractArray } from '../../utils/normalizeApiPayload';
import type { InvokeRequest, InvokeResponse, SandboxSessionCreateRequest, SandboxSessionVO } from '../../types/dto/catalog';

export const sandboxService = {
  createSession: (payload?: SandboxSessionCreateRequest, userId?: string, apiKey?: string) =>
    http.post<SandboxSessionVO>('/sandbox/sessions', payload ?? {}, {
      headers: {
        ...(userId ? { 'X-User-Id': userId } : {}),
        ...(apiKey ? { 'X-Api-Key': apiKey } : {}),
      },
    }),

  mine: async () => {
    const raw = await http.get<unknown>('/sandbox/sessions/mine');
    return extractArray<SandboxSessionVO>(raw);
  },

  invoke: (payload: InvokeRequest, sandboxToken: string, traceId?: string) =>
    http.post<InvokeResponse>('/sandbox/invoke', payload, {
      headers: {
        'X-Sandbox-Token': sandboxToken,
        ...(traceId ? { 'X-Trace-Id': traceId } : {}),
      },
    }),
};
