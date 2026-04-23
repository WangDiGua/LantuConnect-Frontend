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

  assert.equal(state.runBadgeKey, 'down');
  assert.equal(state.interactionState, 'blocked');
  assert.equal(state.interactionLabel, '\u7194\u65ad\u4e2d');
  assert.equal(state.interactionDisabled, true);
  assert.match(state.interactionHint ?? '', /circuit/i);
});

test('buildResourceMarketRuntimeState keeps probe health separate from half-open callability', () => {
  const state = buildResourceMarketRuntimeState({
    resourceType: 'agent',
    observability: {
      healthStatus: 'healthy',
      circuitState: 'HALF_OPEN',
      callabilityState: 'circuit_half_open',
      callabilityReason: 'circuit breaker is half open',
    },
  });

  assert.equal(state.healthProbeKey, 'healthy');
  assert.equal(state.runBadgeKey, 'healthy');
  assert.equal(state.interactionState, 'blocked');
  assert.equal(state.interactionLabel, '\u534a\u5f00\u63a2\u6d4b');
  assert.equal(state.interactionDisabled, true);
  assert.match(state.interactionHint ?? '', /half open/i);
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
