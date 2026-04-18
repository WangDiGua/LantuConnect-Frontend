import assert from 'node:assert/strict';
import test from 'node:test';

import type { RealtimeServerMessage } from './realtimePush.ts';
import {
  getResourceRuntimeUpdateSignal,
  matchesResourceRuntimeUpdateSignal,
} from './resourceRuntimeRealtime.ts';

test('getResourceRuntimeUpdateSignal parses runtime state change pushes as silent updates', () => {
  const circuitMsg: RealtimeServerMessage = {
    type: 'circuit',
    action: 'state_changed',
    payload: {
      resourceType: 'mcp',
      resourceId: 42,
      resourceCode: 'supabase-community',
      newState: 'HALF_OPEN',
    },
  };

  const probeMsg: RealtimeServerMessage = {
    type: 'health',
    action: 'probe_status_changed',
    payload: {
      resource_type: 'agent',
      resource_id: '7',
      resource_code: 'campus-assistant',
      healthStatus: 'degraded',
    },
  };

  assert.deepEqual(getResourceRuntimeUpdateSignal(circuitMsg), {
    kind: 'circuit_state_changed',
    resourceType: 'mcp',
    resourceId: '42',
    resourceCode: 'supabase-community',
  });
  assert.deepEqual(getResourceRuntimeUpdateSignal(probeMsg), {
    kind: 'health_probe_status_changed',
    resourceType: 'agent',
    resourceId: '7',
    resourceCode: 'campus-assistant',
  });
});

test('matchesResourceRuntimeUpdateSignal only refreshes relevant pages when identifiers are present', () => {
  const signal = {
    kind: 'circuit_state_changed' as const,
    resourceType: 'skill',
    resourceId: '18',
    resourceCode: 'resume-skill',
  };

  assert.equal(matchesResourceRuntimeUpdateSignal(signal, { resourceType: 'skill' }), true);
  assert.equal(matchesResourceRuntimeUpdateSignal(signal, { resourceType: 'mcp' }), false);
  assert.equal(matchesResourceRuntimeUpdateSignal(signal, { resourceType: 'skill', resourceId: '18' }), true);
  assert.equal(matchesResourceRuntimeUpdateSignal(signal, { resourceType: 'skill', resourceId: '19' }), false);
  assert.equal(matchesResourceRuntimeUpdateSignal(signal, { resourceCode: 'resume-skill' }), true);
  assert.equal(matchesResourceRuntimeUpdateSignal(signal, { resourceCode: 'other' }), false);
});

test('matchesResourceRuntimeUpdateSignal falls back to broad silent refresh when push lacks identifiers', () => {
  const signal = {
    kind: 'health_probe_status_changed' as const,
    resourceType: undefined,
    resourceId: undefined,
    resourceCode: undefined,
  };

  assert.equal(matchesResourceRuntimeUpdateSignal(signal, { resourceType: 'agent' }), true);
  assert.equal(matchesResourceRuntimeUpdateSignal(signal, { resourceId: '9' }), true);
});
