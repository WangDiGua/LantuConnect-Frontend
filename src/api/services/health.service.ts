import { http } from '../../lib/http';
import { extractArray } from '../../utils/normalizeApiPayload';
import type { HealthConfigItem, CircuitBreakerItem } from '../../types/dto/health';

export const healthService = {
  listHealthConfigs: async () => {
    const raw = await http.get<unknown>('/health/configs');
    return extractArray<HealthConfigItem>(raw);
  },

  createHealthConfig: (config: Partial<HealthConfigItem>) =>
    http.post<HealthConfigItem>('/health/configs', config),

  updateHealthConfig: (id: number, config: Partial<HealthConfigItem>) =>
    http.put<void>(`/health/configs/${id}`, config),

  deleteHealthConfig: (id: number) =>
    http.delete<void>(`/health/configs/${id}`),

  getSecurityConfig: () =>
    http.get<Record<string, unknown>>('/health/security-config'),

  listCircuitBreakers: async () => {
    const raw = await http.get<unknown>('/health/circuit-breakers');
    return extractArray<CircuitBreakerItem>(raw);
  },

  updateCircuitBreaker: (id: number, config: Partial<CircuitBreakerItem>) =>
    http.put<void>(`/health/circuit-breakers/${id}`, config),

  manualBreak: (id: number) =>
    http.post<void>(`/health/circuit-breakers/${id}/break`),

  manualRecover: (id: number) =>
    http.post<void>(`/health/circuit-breakers/${id}/recover`),
};
