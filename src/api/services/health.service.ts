import { http } from '../../lib/http';
import { extractArray } from '../../utils/normalizeApiPayload';
import type { HealthConfigItem, CircuitBreakerItem } from '../../types/dto/health';

function toNum(v: unknown, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeHealthStatus(v: unknown): HealthConfigItem['healthStatus'] {
  const s = String(v ?? '').trim().toLowerCase();
  if (s === 'healthy') return 'healthy';
  if (s === 'degraded') return 'degraded';
  if (s === 'down' || s === 'disabled') return 'down';
  return 'degraded';
}

function normalizeCheckType(v: unknown): HealthConfigItem['checkType'] {
  const s = String(v ?? '').trim().toLowerCase();
  if (s === 'tcp') return 'tcp';
  if (s === 'ping') return 'ping';
  return 'http';
}

function normalizeHealthItem(item: Partial<HealthConfigItem>): HealthConfigItem {
  return {
    id: toNum(item.id, 0),
    agentName: String(item.agentName ?? ''),
    displayName: String(item.displayName ?? item.agentName ?? ''),
    agentType: String(item.agentType ?? ''),
    checkType: normalizeCheckType(item.checkType),
    checkUrl: String(item.checkUrl ?? ''),
    intervalSec: toNum(item.intervalSec, 30),
    healthyThreshold: toNum(item.healthyThreshold, 3),
    timeoutSec: toNum(item.timeoutSec, 10),
    healthStatus: normalizeHealthStatus(item.healthStatus),
    lastCheckTime: String(item.lastCheckTime ?? ''),
  };
}

function normalizeCircuitState(v: unknown): CircuitBreakerItem['currentState'] {
  const s = String(v ?? '').trim().toUpperCase();
  if (s === 'OPEN') return 'OPEN';
  if (s === 'HALF_OPEN') return 'HALF_OPEN';
  return 'CLOSED';
}

function normalizeCircuitItem(item: Partial<CircuitBreakerItem>): CircuitBreakerItem {
  return {
    id: toNum(item.id, 0),
    agentName: String(item.agentName ?? ''),
    resourceType: item.resourceType ? String(item.resourceType) : undefined,
    displayName: String(item.displayName ?? item.agentName ?? ''),
    currentState: normalizeCircuitState(item.currentState),
    failureThreshold: toNum(item.failureThreshold, 5),
    openDurationSec: toNum(item.openDurationSec, 60),
    halfOpenMaxCalls: toNum(item.halfOpenMaxCalls, 3),
    fallbackAgentName: item.fallbackAgentName == null ? null : String(item.fallbackAgentName),
    fallbackMessage: String(item.fallbackMessage ?? ''),
    lastOpenedAt: item.lastOpenedAt == null ? null : String(item.lastOpenedAt),
    successCount: toNum(item.successCount, 0),
    failureCount: toNum(item.failureCount, 0),
  };
}

export const healthService = {
  listHealthConfigs: async () => {
    const raw = await http.get<unknown>('/health/configs');
    return extractArray<Partial<HealthConfigItem>>(raw).map(normalizeHealthItem);
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
    return extractArray<Partial<CircuitBreakerItem>>(raw).map(normalizeCircuitItem);
  },

  updateCircuitBreaker: (id: number, config: Partial<CircuitBreakerItem>) =>
    http.put<void>(`/health/circuit-breakers/${id}`, config),

  manualBreak: (id: number) =>
    http.post<void>(`/health/circuit-breakers/${id}/break`),

  manualRecover: (id: number) =>
    http.post<void>(`/health/circuit-breakers/${id}/recover`),
};
