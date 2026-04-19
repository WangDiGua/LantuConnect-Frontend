import test from 'node:test';
import assert from 'node:assert/strict';

import {
  isUnifiedAgentExposure,
  resolveAgentDeliveryMode,
  shouldOpenAgentRegisterAsPageMode,
} from './agentDeliveryMode.ts';

test('isUnifiedAgentExposure recognizes unified app-backed agents', () => {
  assert.equal(isUnifiedAgentExposure('unified_agent'), true);
  assert.equal(isUnifiedAgentExposure(' UNIFIED_AGENT '), true);
  assert.equal(isUnifiedAgentExposure('app'), false);
  assert.equal(isUnifiedAgentExposure(undefined), false);
});

test('resolveAgentDeliveryMode distinguishes api and page agents', () => {
  assert.equal(resolveAgentDeliveryMode({ resourceType: 'agent' }), 'api');
  assert.equal(resolveAgentDeliveryMode({ resourceType: 'app', agentExposure: 'unified_agent' }), 'page');
  assert.equal(resolveAgentDeliveryMode({ resourceType: 'app' }), 'api');
});

test('shouldOpenAgentRegisterAsPageMode only for unified agent apps', () => {
  assert.equal(shouldOpenAgentRegisterAsPageMode({ resourceType: 'app', agentExposure: 'unified_agent' }), true);
  assert.equal(shouldOpenAgentRegisterAsPageMode({ resourceType: 'agent' }), false);
  assert.equal(shouldOpenAgentRegisterAsPageMode({ resourceType: 'app', agentExposure: 'app' }), false);
});
