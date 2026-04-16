import { http } from '../../lib/http';
import { extractArray } from '../../utils/normalizeApiPayload';
import type { HealthConfigItem, CircuitBreakerItem } from '../../types/dto/health';
import type { ResourceHealthPolicyVO, ResourceHealthSnapshotVO } from '../../types/dto/resource-center';

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

function normalizeResourceHealthDependency(
  dependency: ResourceHealthSnapshotVO['dependencies'] extends Array<infer T> ? T : never,
): NonNullable<ResourceHealthSnapshotVO['dependencies']>[number] {
  return {
    resourceId: toNum(dependency?.resourceId, 0),
    resourceType: String(dependency?.resourceType ?? 'mcp') as ResourceHealthSnapshotVO['resourceType'],
    resourceCode: dependency?.resourceCode ? String(dependency.resourceCode) : undefined,
    displayName: String(dependency?.displayName ?? ''),
    healthStatus: dependency?.healthStatus ? String(dependency.healthStatus) : undefined,
    callabilityState: dependency?.callabilityState ? String(dependency.callabilityState) : undefined,
    callabilityReason: dependency?.callabilityReason ? String(dependency.callabilityReason) : undefined,
    callable: typeof dependency?.callable === 'boolean' ? dependency.callable : undefined,
  };
}

function normalizeResourceHealthSnapshot(item: Partial<ResourceHealthSnapshotVO>): ResourceHealthSnapshotVO {
  return {
    resourceId: toNum(item.resourceId, 0),
    resourceType: String(item.resourceType ?? 'agent') as ResourceHealthSnapshotVO['resourceType'],
    resourceCode: String(item.resourceCode ?? ''),
    displayName: String(item.displayName ?? ''),
    resourceStatus: String(item.resourceStatus ?? ''),
    probeStrategy: item.probeStrategy ? String(item.probeStrategy) : undefined,
    checkType: item.checkType ? String(item.checkType) : undefined,
    checkUrl: item.checkUrl ? String(item.checkUrl) : undefined,
    healthStatus: String(item.healthStatus ?? 'unknown'),
    circuitState: String(item.circuitState ?? 'unknown'),
    callabilityState: String(item.callabilityState ?? 'unknown'),
    callabilityReason: item.callabilityReason ? String(item.callabilityReason) : undefined,
    callable: typeof item.callable === 'boolean' ? item.callable : undefined,
    resourceEnabled: typeof item.resourceEnabled === 'boolean' ? item.resourceEnabled : undefined,
    lastProbeAt: item.lastProbeAt ? String(item.lastProbeAt) : undefined,
    lastSuccessAt: item.lastSuccessAt ? String(item.lastSuccessAt) : undefined,
    lastFailureAt: item.lastFailureAt ? String(item.lastFailureAt) : undefined,
    lastFailureReason: item.lastFailureReason ? String(item.lastFailureReason) : undefined,
    consecutiveSuccess: toNum(item.consecutiveSuccess, 0),
    consecutiveFailure: toNum(item.consecutiveFailure, 0),
    probeLatencyMs: item.probeLatencyMs == null ? undefined : toNum(item.probeLatencyMs, 0),
    probePayloadSummary: item.probePayloadSummary ? String(item.probePayloadSummary) : undefined,
    intervalSec: item.intervalSec == null ? undefined : toNum(item.intervalSec, 0),
    healthyThreshold: item.healthyThreshold == null ? undefined : toNum(item.healthyThreshold, 0),
    timeoutSec: item.timeoutSec == null ? undefined : toNum(item.timeoutSec, 0),
    probeEvidence: item.probeEvidence && typeof item.probeEvidence === 'object' ? item.probeEvidence : undefined,
    lastProbeEvidence: item.lastProbeEvidence && typeof item.lastProbeEvidence === 'object' ? item.lastProbeEvidence : undefined,
    policy: item.policy && typeof item.policy === 'object' ? item.policy as ResourceHealthPolicyVO : undefined,
    dependencies: Array.isArray(item.dependencies)
      ? item.dependencies.map((dependency) => normalizeResourceHealthDependency(dependency))
      : undefined,
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

  listResourceHealth: async (params?: { resourceType?: string; healthStatus?: string; callabilityState?: string; probeStrategy?: string }) => {
    const raw = await http.get<unknown>('/health/resources', { params });
    return extractArray<Partial<ResourceHealthSnapshotVO>>(raw).map((item) => normalizeResourceHealthSnapshot(item));
  },

  getResourceHealth: async (resourceId: number) =>
    normalizeResourceHealthSnapshot(await http.get<Partial<ResourceHealthSnapshotVO>>(`/health/resources/${resourceId}`)),

  updateResourcePolicy: async (resourceId: number, policy: Partial<ResourceHealthPolicyVO>) =>
    normalizeResourceHealthSnapshot(await http.put<Partial<ResourceHealthSnapshotVO>>(`/health/resources/${resourceId}/policy`, policy)),

  probeResourceHealth: async (resourceId: number) =>
    normalizeResourceHealthSnapshot(await http.post<Partial<ResourceHealthSnapshotVO>>(`/health/resources/${resourceId}/probe`)),

  manualBreakResource: async (resourceId: number, openDurationSeconds?: number) =>
    normalizeResourceHealthSnapshot(await http.post<Partial<ResourceHealthSnapshotVO>>(`/health/resources/${resourceId}/break`, undefined, {
      params: openDurationSeconds ? { openDurationSeconds } : undefined,
    })),

  manualRecoverResource: async (resourceId: number) =>
    normalizeResourceHealthSnapshot(await http.post<Partial<ResourceHealthSnapshotVO>>(`/health/resources/${resourceId}/recover`)),

  updateCircuitBreaker: (id: number, config: Partial<CircuitBreakerItem>) =>
    http.put<void>(`/health/circuit-breakers/${id}`, config),

  manualBreak: (id: number) =>
    http.post<void>(`/health/circuit-breakers/${id}/break`),

  manualRecover: (id: number) =>
    http.post<void>(`/health/circuit-breakers/${id}/recover`),
};
