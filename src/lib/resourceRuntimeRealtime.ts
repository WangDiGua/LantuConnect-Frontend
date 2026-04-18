import type { RealtimeServerMessage } from './realtimePush.ts';

export type ResourceRuntimeUpdateKind = 'circuit_state_changed' | 'health_probe_status_changed';

export interface ResourceRuntimeUpdateSignal {
  kind: ResourceRuntimeUpdateKind;
  resourceType?: string;
  resourceId?: string;
  resourceCode?: string;
}

export interface ResourceRuntimeUpdateFilter {
  resourceType?: string;
  resourceId?: string;
  resourceCode?: string;
}

function readPayloadString(payload: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const raw = payload[key];
    if (raw == null) continue;
    const value = String(raw).trim();
    if (value) return value;
  }
  return undefined;
}

function isCircuitStateChanged(msg: RealtimeServerMessage): boolean {
  return msg.type === 'circuit' && msg.action === 'state_changed';
}

function isHealthProbeStatusChanged(msg: RealtimeServerMessage): boolean {
  return msg.type === 'health' && msg.action === 'probe_status_changed';
}

export function getResourceRuntimeUpdateSignal(
  msg: RealtimeServerMessage,
): ResourceRuntimeUpdateSignal | null {
  if (!isCircuitStateChanged(msg) && !isHealthProbeStatusChanged(msg)) {
    return null;
  }

  const payload =
    msg.payload && typeof msg.payload === 'object'
      ? (msg.payload as Record<string, unknown>)
      : {};

  return {
    kind: isCircuitStateChanged(msg) ? 'circuit_state_changed' : 'health_probe_status_changed',
    resourceType: readPayloadString(payload, 'resourceType', 'resource_type'),
    resourceId: readPayloadString(payload, 'resourceId', 'resource_id', 'id'),
    resourceCode: readPayloadString(payload, 'resourceCode', 'resource_code', 'code'),
  };
}

export function matchesResourceRuntimeUpdateSignal(
  signal: ResourceRuntimeUpdateSignal,
  filter: ResourceRuntimeUpdateFilter,
): boolean {
  const targetType = filter.resourceType?.trim().toLowerCase();
  const signalType = signal.resourceType?.trim().toLowerCase();
  if (targetType && signalType && targetType !== signalType) return false;

  const targetId = filter.resourceId?.trim();
  const signalId = signal.resourceId?.trim();
  if (targetId && signalId && targetId !== signalId) return false;

  const targetCode = filter.resourceCode?.trim().toLowerCase();
  const signalCode = signal.resourceCode?.trim().toLowerCase();
  if (targetCode && signalCode && targetCode !== signalCode) return false;

  return true;
}
