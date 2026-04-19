import { RESOURCE_TYPE_REGISTER_PAGE, parseResourceType } from '../../constants/resourceTypes.ts';
import type { CapabilityDetailVO, CapabilityType } from '../../types/dto/capability.ts';
import type { ResourceType } from '../../types/dto/catalog.ts';

export type CapabilityRegisterManualTarget = {
  resourceId: number | null;
  resourceType: ResourceType;
  registerPage: string;
};

export function parseCapabilityRegisterRouteId(routeId?: string | number | null): number | null {
  if (routeId == null || routeId === '') return null;
  const parsed = Number(routeId);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
}

export function getCapabilityRegisterResourceType(type: CapabilityType): ResourceType {
  return type;
}

export function findCapabilityRegisterBindingResourceId(
  detail?: CapabilityDetailVO | null,
  preferredType?: ResourceType,
): number | null {
  const normalizedBindings = (detail?.bindingClosure ?? [])
    .map((item) => ({
      resourceType: parseResourceType(item.resourceType),
      resourceId: parseCapabilityRegisterRouteId(item.resourceId),
    }))
    .filter((item): item is { resourceType: ResourceType; resourceId: number } => item.resourceType != null && item.resourceId != null);

  if (!normalizedBindings.length) return null;
  if (preferredType) {
    const preferred = normalizedBindings.find((item) => item.resourceType === preferredType);
    if (preferred) return preferred.resourceId;
  }
  return normalizedBindings[0]?.resourceId ?? null;
}

export function getCapabilityRegisterManualTarget(
  type: CapabilityType,
  detail?: CapabilityDetailVO | null,
): CapabilityRegisterManualTarget {
  const resourceType = getCapabilityRegisterResourceType(type);
  return {
    resourceId: findCapabilityRegisterBindingResourceId(detail, resourceType),
    resourceType,
    registerPage: RESOURCE_TYPE_REGISTER_PAGE[resourceType],
  };
}
