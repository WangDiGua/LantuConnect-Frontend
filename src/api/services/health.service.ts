import { http } from '../../lib/http';
import type { HealthConfigItem, CircuitBreakerItem } from '../../types/dto/health';

export const healthService = {
  listHealthConfigs: () =>
    http.get<HealthConfigItem[]>('/health/configs'),

  updateHealthConfig: (id: number, config: Partial<HealthConfigItem>) =>
    http.put<void>(`/health/configs/${id}`, config),

  listCircuitBreakers: () =>
    http.get<CircuitBreakerItem[]>('/health/circuit-breakers'),

  updateCircuitBreaker: (id: number, config: Partial<CircuitBreakerItem>) =>
    http.put<void>(`/health/circuit-breakers/${id}`, config),

  manualBreak: (id: number) =>
    http.post<void>(`/health/circuit-breakers/${id}/break`),

  manualRecover: (id: number) =>
    http.post<void>(`/health/circuit-breakers/${id}/recover`),
};
