import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildResourceMarketRuntimeState,
} from './resourceMarketRuntime.ts';

test('buildResourceMarketRuntimeState marks callable invoke resources as available', () => {
  const state = buildResourceMarketRuntimeState({
    resourceType: 'mcp',
    observability: {
      healthStatus: 'healthy',
      circuitState: 'CLOSED',
      callabilityState: 'callable',
      callabilityReason: 'resource callable',
    },
  });

  assert.equal(state.runBadgeKey, 'healthy');
  assert.equal(state.interactionState, 'available');
  assert.equal(state.interactionLabel, '\u53ef\u8c03\u7528');
  assert.equal(state.interactionDisabled, false);
  assert.equal(state.interactionHint, undefined);
});

test('buildResourceMarketRuntimeState marks blocked invoke resources as unavailable', () => {
  const state = buildResourceMarketRuntimeState({
    resourceType: 'agent',
    observability: {
      healthStatus: 'down',
      circuitState: 'HALF_OPEN',
      callabilityState: 'circuit_open',
      callabilityReason: 'circuit breaker is open',
    },
  });

  assert.equal(state.runBadgeKey, 'gateway_blocked');
  assert.equal(state.interactionState, 'blocked');
  assert.equal(state.interactionLabel, '\u6682\u4e0d\u53ef\u8c03\u7528');
  assert.equal(state.interactionDisabled, true);
  assert.match(state.interactionHint ?? '', /circuit/i);
});

test('buildResourceMarketRuntimeState treats context skills as resolve-only resources', () => {
  const state = buildResourceMarketRuntimeState({
    resourceType: 'skill',
    executionMode: 'context',
    observability: {
      healthStatus: 'unknown',
      circuitState: 'unknown',
      callabilityState: 'unknown',
    },
  });

  assert.equal(state.runBadgeKey, 'unknown');
  assert.equal(state.interactionState, 'resolve_only');
  assert.equal(state.interactionLabel, '\u4ec5 resolve');
  assert.equal(state.interactionDisabled, false);
  assert.match(state.interactionHint ?? '', /resolve/i);
  assert.match(state.interactionHint ?? '', /invoke/i);
});
