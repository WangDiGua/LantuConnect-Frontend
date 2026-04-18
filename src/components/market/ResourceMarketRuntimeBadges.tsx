import React from 'react';

import type { Theme } from '../../types';
import type { ResourceType } from '../../types/dto/catalog';
import { circuitBreakerLabelZh, resourceHealthBadgeClass, resourceHealthLabelZh } from '../../utils/backendEnumLabels';
import { catalogItemCircuitState } from '../../utils/catalogObservability';
import { resourceCallabilityBadgeClass } from '../../utils/resourceCallability';
import { buildResourceMarketRuntimeState } from '../../utils/resourceMarketRuntime';

export interface ResourceMarketRuntimeBadgesProps {
  theme: Theme;
  resourceType: ResourceType;
  observability?: Record<string, unknown>;
  executionMode?: string | null | undefined;
  className?: string;
}

function resolveOnlyBadgeClass(theme: Theme): string {
  return theme === 'dark'
    ? 'border border-fuchsia-500/25 bg-fuchsia-500/12 text-fuchsia-200'
    : 'border border-fuchsia-200/80 bg-fuchsia-50 text-fuchsia-800';
}

export const ResourceMarketRuntimeBadges: React.FC<ResourceMarketRuntimeBadgesProps> = ({
  theme,
  resourceType,
  observability,
  executionMode,
  className = '',
}) => {
  const input = { resourceType, observability, executionMode };
  const runtime = buildResourceMarketRuntimeState(input);
  const circuitState = catalogItemCircuitState(input);
  const runTitle =
    `\u63a2\u6d4b\uff1a${resourceHealthLabelZh(runtime.healthProbeKey)}`
    + (circuitState && circuitState !== 'unknown' && circuitState !== 'closed'
      ? ` \u00b7 \u7194\u65ad\uff1a${circuitBreakerLabelZh(circuitState)}`
      : '')
    + (runtime.interactionState === 'blocked' && runtime.interactionHint ? ` \u00b7 ${runtime.interactionHint}` : '');
  const interactionClass = runtime.interactionState === 'resolve_only'
    ? resolveOnlyBadgeClass(theme)
    : resourceCallabilityBadgeClass(theme, runtime.interactionState === 'available' ? 'callable' : runtime.callabilityState);
  const interactionTitle = runtime.interactionHint
    ?? runtime.callabilityReason
    ?? (runtime.interactionState === 'available' ? '\u5f53\u524d\u8d44\u6e90\u6ee1\u8db3\u76ee\u5f55\u89c2\u6d4b\u4e0b\u7684\u4ea4\u4e92\u6761\u4ef6\u3002' : undefined);

  return (
    <>
      <span
        className={`inline-flex max-w-[12rem] shrink-0 items-center truncate rounded-md border px-2 py-0.5 text-xs font-semibold ${resourceHealthBadgeClass(theme, runtime.runBadgeKey)} ${className}`.trim()}
        title={runTitle}
      >
        {'\u8fd0\u884c '}{resourceHealthLabelZh(runtime.runBadgeKey)}
      </span>
      <span
        className={`inline-flex max-w-[12rem] shrink-0 items-center truncate rounded-md px-2 py-0.5 text-xs font-semibold ${interactionClass} ${className}`.trim()}
        title={interactionTitle}
      >
        {runtime.interactionLabel}
      </span>
    </>
  );
};
