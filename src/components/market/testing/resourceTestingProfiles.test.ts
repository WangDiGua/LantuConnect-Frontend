import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildAgentTestingProfile,
  buildSimpleSchemaFields,
  buildSkillToolCatalog,
} from './resourceTestingProfiles.ts';

test('buildAgentTestingProfile prefers resolve suggested payload over protocol fallback', () => {
  const profile = buildAgentTestingProfile({
    registrationProtocol: 'anthropic_messages',
    modelAlias: 'claude-3-7-sonnet',
    suggestedPayload: {
      messages: [{ role: 'user', content: 'hello from resolve' }],
      max_tokens: 1024,
    },
  });

  assert.equal(profile.protocol, 'anthropic_messages');
  assert.deepEqual(profile.defaultPayload, {
    messages: [{ role: 'user', content: 'hello from resolve' }],
    max_tokens: 1024,
  });
  assert.deepEqual(profile.nativePayload, {
    model: 'claude-3-7-sonnet',
    max_tokens: 1024,
    messages: [{ role: 'user', content: 'hello' }],
  });
});

test('buildSkillToolCatalog merges binding closure source labels into the unified tool list', () => {
  const tools = buildSkillToolCatalog(
    [
      {
        resourceId: '64',
        resourceType: 'mcp',
        resourceCode: 'weather-mcp',
        displayName: '天气服务',
      },
    ],
    {
      capabilityId: 11,
      capabilityType: 'skill',
      tools: [
        {
          name: 'weather.search',
          description: '查天气',
          parameters: {
            type: 'object',
            properties: {
              city: { type: 'string' },
            },
            required: ['city'],
          },
        },
      ],
      routes: [
        {
          unifiedFunctionName: 'weather.search',
          resourceType: 'mcp',
          resourceId: '64',
          upstreamToolName: 'weather.search',
        },
      ],
      warnings: [],
    },
  );

  assert.equal(tools.length, 1);
  assert.deepEqual(tools[0], {
    name: 'weather.search',
    description: '查天气',
    sourceResourceId: '64',
    sourceResourceCode: 'weather-mcp',
    sourceDisplayName: '天气服务',
    sourceLabel: '天气服务',
    defaultArguments: {
      city: '',
    },
  });
});

test('buildSimpleSchemaFields keeps only top-level scalar fields for the quick skill form', () => {
  const fields = buildSimpleSchemaFields({
    type: 'object',
    properties: {
      city: { type: 'string', title: '城市' },
      limit: { type: 'integer' },
      streaming: { type: 'boolean' },
      filters: {
        type: 'object',
        properties: {
          district: { type: 'string' },
        },
      },
    },
    required: ['city', 'streaming'],
  });

  assert.deepEqual(fields, [
    {
      key: 'city',
      label: '城市',
      type: 'string',
      required: true,
      defaultValue: '',
    },
    {
      key: 'limit',
      label: 'limit',
      type: 'integer',
      required: false,
      defaultValue: 0,
    },
    {
      key: 'streaming',
      label: 'streaming',
      type: 'boolean',
      required: true,
      defaultValue: false,
    },
  ]);
});
