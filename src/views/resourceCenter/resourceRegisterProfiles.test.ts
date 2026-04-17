import assert from 'node:assert/strict';
import test from 'node:test';

import {
  coerceMcpRegisterMode,
  createStructuredParamField,
  resolveAgentProviderPreset,
  structuredParamFieldsToSchema,
} from './resourceRegisterProfiles.ts';

test('resolveAgentProviderPreset maps DeepSeek endpoints into the openai-compatible family preset', () => {
  const preset = resolveAgentProviderPreset({
    registrationProtocol: 'openai_compatible',
    upstreamEndpoint: 'https://api.deepseek.com/v1/chat/completions',
  });

  assert.equal(preset, 'deepseek');
});

test('coerceMcpRegisterMode never keeps stdio as a registerable MCP transport', () => {
  const mode = coerceMcpRegisterMode({
    endpoint: 'https://example.com/mcp',
    hintedMode: 'stdio_sidecar',
  });

  assert.equal(mode, 'http_json');
});

test('structuredParamFieldsToSchema builds an object schema from the quick skill editor fields', () => {
  const schema = structuredParamFieldsToSchema([
    {
      ...createStructuredParamField(),
      key: 'city',
      label: '城市',
      type: 'string',
      required: true,
      description: '城市名',
    },
    {
      ...createStructuredParamField(),
      key: 'limit',
      label: '返回条数',
      type: 'integer',
      required: false,
      defaultValue: 10,
    },
  ]);

  assert.deepEqual(schema, {
    type: 'object',
    properties: {
      city: {
        type: 'string',
        title: '城市',
        description: '城市名',
      },
      limit: {
        type: 'integer',
        title: '返回条数',
        default: 10,
      },
    },
    required: ['city'],
  });
});
