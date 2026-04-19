import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildAgentAdapterSpecMeta,
  coerceMcpRegisterMode,
  createStructuredParamField,
  extractAgentProviderPresetFromSpec,
  resolveAgentProviderPreset,
  stripAgentAdapterSpecMeta,
  structuredParamFieldsToSchema,
} from './resourceRegisterProfiles.ts';

test('resolveAgentProviderPreset maps DeepSeek endpoints into the openai-compatible family preset', () => {
  const preset = resolveAgentProviderPreset({
    registrationProtocol: 'openai_compatible',
    upstreamEndpoint: 'https://api.deepseek.com/v1/chat/completions',
  });

  assert.equal(preset, 'deepseek');
});

test('resolveAgentProviderPreset recognizes platform-agent presets from endpoint and upstream id hints', () => {
  const difyPreset = resolveAgentProviderPreset({
    registrationProtocol: 'openai_compatible',
    upstreamEndpoint: 'https://api.dify.ai/v1/chat-messages',
    upstreamAgentId: 'app-123',
  });
  const openAiAgentsPreset = resolveAgentProviderPreset({
    registrationProtocol: 'openai_compatible',
    upstreamEndpoint: 'https://api.openai.com/v1/responses',
    upstreamAgentId: 'asst_123',
  });
  const yuanqiPreset = resolveAgentProviderPreset({
    registrationProtocol: 'openai_compatible',
    upstreamEndpoint: 'https://lke.cloud.tencent.com/v1/qbot/chat/sse',
    upstreamAgentId: 'bot-app-key-123',
  });

  assert.equal(difyPreset, 'dify');
  assert.equal(openAiAgentsPreset, 'openai_agents');
  assert.equal(yuanqiPreset, 'tencent_yuanqi');
});

test('agent adapter spec helpers preserve user spec while carrying hidden adapter metadata', () => {
  const merged = {
    timeout: 30,
    ...buildAgentAdapterSpecMeta('appbuilder'),
  };

  assert.equal(extractAgentProviderPresetFromSpec(merged), 'appbuilder');
  assert.deepEqual(stripAgentAdapterSpecMeta(merged), {
    timeout: 30,
  });
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
