import type { ResourceType } from '../../types/dto/catalog';

export const UNIFIED_AGENT_EXPOSURE = 'unified_agent';
export const AGENT_DELIVERY_MODE_API = 'api';
export const AGENT_DELIVERY_MODE_PAGE = 'page';

export type AgentDeliveryMode = typeof AGENT_DELIVERY_MODE_API | typeof AGENT_DELIVERY_MODE_PAGE;

function normalize(value: string | null | undefined): string {
  return String(value ?? '').trim().toLowerCase();
}

export function isUnifiedAgentExposure(value: string | null | undefined): boolean {
  return normalize(value) === UNIFIED_AGENT_EXPOSURE;
}

export function resolveAgentDeliveryMode(input: {
  resourceType?: ResourceType | string | null;
  agentExposure?: string | null;
}): AgentDeliveryMode {
  const resourceType = normalize(input.resourceType);
  if (resourceType === 'app' && isUnifiedAgentExposure(input.agentExposure)) {
    return AGENT_DELIVERY_MODE_PAGE;
  }
  return AGENT_DELIVERY_MODE_API;
}

export function shouldOpenAgentRegisterAsPageMode(input: {
  resourceType?: ResourceType | string | null;
  agentExposure?: string | null;
}): boolean {
  return resolveAgentDeliveryMode(input) === AGENT_DELIVERY_MODE_PAGE;
}
