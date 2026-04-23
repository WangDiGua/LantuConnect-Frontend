import assert from 'node:assert/strict';
import test from 'node:test';

import { buildResourceMarketRuntimeState } from '../../utils/resourceMarketRuntime.ts';
import { normalizeCatalogObservability } from '../../utils/catalogObservability.ts';

test('normalizeCatalogObservability preserves root callability fields for market runtime', () => {
  const observability = normalizeCatalogObservability({
    healthStatus: 'healthy',
    circuitState: 'HALF_OPEN',
    callabilityState: 'circuit_half_open',
    callabilityReason: 'circuit breaker is half open',
  });

  assert.equal(observability?.healthStatus, 'healthy');
  assert.equal(observability?.circuitState, 'HALF_OPEN');
  assert.equal(observability?.callabilityState, 'circuit_half_open');
  assert.equal(observability?.callabilityReason, 'circuit breaker is half open');

  const runtime = buildResourceMarketRuntimeState({ resourceType: 'agent', observability });
  assert.equal(runtime.runBadgeKey, 'healthy');
  assert.equal(runtime.interactionState, 'blocked');
  assert.equal(runtime.interactionLabel, '\u534a\u5f00\u63a2\u6d4b');
});
