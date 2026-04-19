import assert from 'node:assert/strict';
import test from 'node:test';

import { parseAgentConfigPaste } from './agentConfigImport.ts';

test('parseAgentConfigPaste recognizes a Dify app config and fills platform-agent fields', () => {
  const parsed = parseAgentConfigPaste(
    JSON.stringify({
      providerPreset: 'dify',
      endpoint: 'https://api.dify.ai/v1/chat-messages',
      appId: 'app-123',
      profile: 'dify_agent_app',
      credentialRef: 'env:DIFY_API_KEY',
    }),
  );

  assert.equal(parsed.providerPreset, 'dify');
  assert.equal(parsed.registrationProtocol, 'openai_compatible');
  assert.equal(parsed.upstreamEndpoint, 'https://api.dify.ai/v1/chat-messages');
  assert.equal(parsed.upstreamAgentId, 'app-123');
  assert.equal(parsed.transformProfile, 'dify_agent_app');
  assert.equal(parsed.modelAlias, 'app-123');
});

test('parseAgentConfigPaste recognizes a Baidu AppBuilder config from platform hints', () => {
  const parsed = parseAgentConfigPaste(
    JSON.stringify({
      provider: 'appbuilder',
      baseUrl: 'https://qianfan.baidubce.com/v2/app/conversation',
      agentId: 'appbuilder-001',
    }),
  );

  assert.equal(parsed.providerPreset, 'appbuilder');
  assert.equal(parsed.upstreamEndpoint, 'https://qianfan.baidubce.com/v2/app/conversation');
  assert.equal(parsed.upstreamAgentId, 'appbuilder-001');
  assert.equal(parsed.modelAlias, 'appbuilder-001');
});

test('parseAgentConfigPaste recognizes a Tencent Yuanqi config from endpoint and agent key hints', () => {
  const parsed = parseAgentConfigPaste(
    JSON.stringify({
      providerPreset: 'tencent_yuanqi',
      endpoint: 'https://lke.cloud.tencent.com/v1/qbot/chat/sse',
      agentId: 'bot-app-key-123',
      profile: 'tencent_yuanqi_agent',
    }),
  );

  assert.equal(parsed.providerPreset, 'tencent_yuanqi');
  assert.equal(parsed.registrationProtocol, 'openai_compatible');
  assert.equal(parsed.upstreamEndpoint, 'https://lke.cloud.tencent.com/v1/qbot/chat/sse');
  assert.equal(parsed.upstreamAgentId, 'bot-app-key-123');
  assert.equal(parsed.transformProfile, 'tencent_yuanqi_agent');
});
