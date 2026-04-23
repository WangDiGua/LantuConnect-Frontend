import type { ResourceType } from '../types/dto/catalog';
import {
  catalogInvokeBlockedReason,
  catalogInvokeSupplementHint,
  catalogItemCallabilityReason,
  catalogItemCallabilityState,
  catalogItemHealthStatus,
  catalogRunBadgeHealthKeyForDisplay,
  isCatalogInvokeCallable,
} from './catalogObservability.ts';
import { resourceCallabilityLabelZh } from './resourceCallability.ts';

export interface ResourceMarketRuntimeInput {
  resourceType: ResourceType | string;
  executionMode?: string | null | undefined;
  observability?: Record<string, unknown>;
}

export type ResourceMarketInteractionState = 'available' | 'blocked' | 'resolve_only';

export interface ResourceMarketRuntimeState {
  healthProbeKey: string;
  runBadgeKey: string;
  interactionState: ResourceMarketInteractionState;
  interactionLabel: string;
  interactionDisabled: boolean;
  interactionHint?: string;
  supplementalHint?: string;
  callabilityState?: string;
  callabilityReason?: string;
}

function normalizeType(raw: string | null | undefined): string {
  return String(raw ?? '')
    .trim()
    .toLowerCase();
}

function isResolveOnlyResource(input: ResourceMarketRuntimeInput): boolean {
  return normalizeType(input.resourceType) === 'skill';
}

function blockedInteractionLabel(callabilityState: string | undefined): string {
  const state = normalizeType(callabilityState).replace(/-/g, '_');
  if (state && state !== 'unknown') return resourceCallabilityLabelZh(callabilityState);
  return '\u6682\u4e0d\u53ef\u8c03\u7528';
}

export function buildResourceMarketRuntimeState(input: ResourceMarketRuntimeInput): ResourceMarketRuntimeState {
  const healthProbeKey = catalogItemHealthStatus(input) ?? 'unknown';
  const runBadgeKey = catalogRunBadgeHealthKeyForDisplay(input);
  const callabilityState = catalogItemCallabilityState(input);
  const callabilityReason = catalogItemCallabilityReason(input);
  const supplementalHint = catalogInvokeSupplementHint(input);

  if (isResolveOnlyResource(input)) {
    return {
      healthProbeKey,
      runBadgeKey,
      interactionState: 'resolve_only',
      interactionLabel: '\u4ec5 resolve',
      interactionDisabled: false,
      interactionHint: 'Context Skill \u4ec5\u652f\u6301\u76ee\u5f55 resolve\uff0c\u4e0d\u652f\u6301 invoke\u3002',
      supplementalHint,
      callabilityState,
      callabilityReason,
    };
  }

  if (isCatalogInvokeCallable(input)) {
    return {
      healthProbeKey,
      runBadgeKey,
      interactionState: 'available',
      interactionLabel: '\u53ef\u8c03\u7528',
      interactionDisabled: false,
      supplementalHint,
      callabilityState,
      callabilityReason,
    };
  }

  return {
    healthProbeKey,
    runBadgeKey,
    interactionState: 'blocked',
    interactionLabel: blockedInteractionLabel(callabilityState),
    interactionDisabled: true,
    interactionHint: catalogInvokeBlockedReason(input),
    supplementalHint,
    callabilityState,
    callabilityReason,
  };
}
