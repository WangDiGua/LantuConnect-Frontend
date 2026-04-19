import assert from 'node:assert/strict';
import test from 'node:test';

import {
  findCapabilityRegisterBindingResourceId,
  getCapabilityRegisterManualTarget,
  parseCapabilityRegisterRouteId,
} from './capabilityRegisterFlow.ts';

test('parseCapabilityRegisterRouteId only accepts positive integer ids', () => {
  assert.equal(parseCapabilityRegisterRouteId('12'), 12);
  assert.equal(parseCapabilityRegisterRouteId(7), 7);
  assert.equal(parseCapabilityRegisterRouteId('0'), null);
  assert.equal(parseCapabilityRegisterRouteId('-3'), null);
  assert.equal(parseCapabilityRegisterRouteId('1.5'), null);
  assert.equal(parseCapabilityRegisterRouteId('abc'), null);
  assert.equal(parseCapabilityRegisterRouteId(undefined), null);
});

test('findCapabilityRegisterBindingResourceId prefers a binding with the matching capability type', () => {
  const resourceId = findCapabilityRegisterBindingResourceId(
    {
      capabilityId: 101,
      capabilityType: 'mcp',
      displayName: 'Weather Tools',
      resourceCode: 'weather-tools',
      bindingClosure: [
        { resourceId: '19', resourceType: 'skill', displayName: '天气助手' },
        { resourceId: '33', resourceType: 'mcp', displayName: '天气服务' },
      ],
    },
    'mcp',
  );

  assert.equal(resourceId, 33);
});

test('getCapabilityRegisterManualTarget falls back to the first valid binding when no preferred type exists', () => {
  const target = getCapabilityRegisterManualTarget('agent', {
    capabilityId: 202,
    capabilityType: 'agent',
    displayName: 'Slides Copilot',
    resourceCode: 'slides-copilot',
    bindingClosure: [
      { resourceId: '55', resourceType: 'skill', displayName: '排版技能' },
      { resourceId: 'oops', resourceType: 'mcp', displayName: '坏数据' },
    ],
  });

  assert.equal(target.resourceType, 'agent');
  assert.equal(target.registerPage, 'agent-register');
  assert.equal(target.resourceId, 55);
});
