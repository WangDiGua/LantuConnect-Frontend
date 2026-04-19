import type { RealtimeServerMessage } from './realtimePush.ts';
import { getResourceRuntimeUpdateSignal } from './resourceRuntimeRealtime.ts';

export const RESOURCE_WORKFLOW_NOTIFICATION_TYPES = [
  'resource_submitted',
  'audit_approved',
  'audit_rejected',
  'resource_withdrawn',
  'resource_deprecated',
  'resource_version_switched',
  'platform_resource_force_deprecated',
] as const;

export const ONBOARDING_WORKFLOW_NOTIFICATION_TYPES = [
  'onboarding_submitted',
  'onboarding_approved',
  'onboarding_rejected',
] as const;

const WORKFLOW_NOTIFICATION_TYPE_SET = new Set<string>([
  ...RESOURCE_WORKFLOW_NOTIFICATION_TYPES,
  ...ONBOARDING_WORKFLOW_NOTIFICATION_TYPES,
]);

export type RealtimeUiSignalCategory =
  | 'critical_alert'
  | 'audit_sync'
  | 'health_runtime_sync'
  | 'health_config_sync'
  | 'monitoring_sync'
  | 'workflow_notification_sync';

export interface RealtimeUiSignal {
  category: RealtimeUiSignalCategory;
  notificationType?: string;
  resourceType?: string;
  resourceId?: string;
  resourceCode?: string;
}

export interface RealtimeUiSignalFilter {
  categories?: RealtimeUiSignalCategory[];
  notificationTypes?: string[];
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

function getObjectPayload(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function isAlertFiring(msg: RealtimeServerMessage): boolean {
  return msg.type === 'alert' && msg.action === 'firing';
}

function isAuditPendingChanged(msg: RealtimeServerMessage): boolean {
  return msg.type === 'audit' && msg.action === 'pending_changed';
}

function isHealthConfigUpdated(msg: RealtimeServerMessage): boolean {
  return msg.type === 'health' && msg.action === 'config_updated';
}

function isMonitoringKpiDigest(msg: RealtimeServerMessage): boolean {
  return msg.type === 'monitoring' && msg.action === 'kpi_digest';
}

function getNotificationType(msg: RealtimeServerMessage): string | undefined {
  const notification = getObjectPayload(msg.notification);
  const raw = notification.type;
  if (typeof raw !== 'string') return undefined;
  const value = raw.trim().toLowerCase();
  return value || undefined;
}

function buildResourceIdentity(payload: Record<string, unknown>) {
  return {
    resourceType: readPayloadString(payload, 'resourceType', 'resource_type', 'targetType', 'target_type'),
    resourceId: readPayloadString(payload, 'resourceId', 'resource_id', 'targetId', 'target_id', 'id'),
    resourceCode: readPayloadString(payload, 'resourceCode', 'resource_code', 'targetCode', 'target_code', 'code'),
  };
}

export function getRealtimeUiSignal(msg: RealtimeServerMessage): RealtimeUiSignal | null {
  if (isAlertFiring(msg)) {
    return { category: 'critical_alert' };
  }

  if (isAuditPendingChanged(msg)) {
    return { category: 'audit_sync' };
  }

  const runtimeSignal = getResourceRuntimeUpdateSignal(msg);
  if (runtimeSignal) {
    return {
      category: 'health_runtime_sync',
      resourceType: runtimeSignal.resourceType,
      resourceId: runtimeSignal.resourceId,
      resourceCode: runtimeSignal.resourceCode,
    };
  }

  if (isHealthConfigUpdated(msg)) {
    return {
      category: 'health_config_sync',
      ...buildResourceIdentity(getObjectPayload(msg.payload)),
    };
  }

  if (isMonitoringKpiDigest(msg)) {
    return { category: 'monitoring_sync' };
  }

  const notificationType = getNotificationType(msg);
  if (notificationType && WORKFLOW_NOTIFICATION_TYPE_SET.has(notificationType)) {
    return {
      category: 'workflow_notification_sync',
      notificationType,
      ...buildResourceIdentity(getObjectPayload(msg.notification)),
    };
  }

  return null;
}

export function isExplicitRealtimeUiSignal(signal: RealtimeUiSignal): boolean {
  return signal.category === 'critical_alert';
}

export function matchesRealtimeUiSignal(
  signal: RealtimeUiSignal,
  filter: RealtimeUiSignalFilter,
): boolean {
  if (filter.categories?.length && !filter.categories.includes(signal.category)) {
    return false;
  }

  if (filter.notificationTypes?.length) {
    const signalType = signal.notificationType?.trim().toLowerCase();
    if (!signalType) return false;
    const allowed = new Set(filter.notificationTypes.map((item) => item.trim().toLowerCase()).filter(Boolean));
    if (!allowed.has(signalType)) return false;
  }

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
