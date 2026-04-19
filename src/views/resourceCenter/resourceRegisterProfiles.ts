export type AgentRegistrationProtocol =
  | 'openai_compatible'
  | 'bailian_compatible'
  | 'anthropic_messages'
  | 'gemini_generatecontent';

export type AgentProviderPreset =
  | 'openai'
  | 'deepseek'
  | 'openrouter'
  | 'ollama'
  | 'other_openai'
  | 'bailian'
  | 'anthropic'
  | 'gemini'
  | 'bailian_app'
  | 'appbuilder'
  | 'dify'
  | 'openai_agents'
  | 'tencent_yuanqi';

export type AgentProviderPresetKind = 'native_model' | 'platform_agent';

export type SupportedMcpRegisterMode = 'http_json' | 'http_sse' | 'websocket';

export type StructuredParamFieldType = 'string' | 'integer' | 'number' | 'boolean';

export interface StructuredParamField {
  id: string;
  key: string;
  label: string;
  type: StructuredParamFieldType;
  required: boolean;
  description?: string;
  defaultValue?: string | number | boolean;
}

export interface AgentProviderPresetMeta {
  value: AgentProviderPreset;
  label: string;
  hint: string;
  kind: AgentProviderPresetKind;
  protocolFamily: AgentRegistrationProtocol;
  defaultEndpoint?: string;
  endpointLabel?: string;
  endpointPlaceholder?: string;
  upstreamIdLabel?: string;
  upstreamIdPlaceholder?: string;
  modelAliasPlaceholder?: string;
  credentialHint?: string;
  transformProfilePlaceholder?: string;
}

const AGENT_PROVIDER_PRESET_REGISTRY: Record<AgentProviderPreset, AgentProviderPresetMeta> = {
  openai: {
    value: 'openai',
    label: 'OpenAI',
    hint: 'OpenAI 原生接口',
    kind: 'native_model',
    protocolFamily: 'openai_compatible',
    defaultEndpoint: 'https://api.openai.com/v1/chat/completions',
    modelAliasPlaceholder: 'gpt-4.1-mini',
  },
  deepseek: {
    value: 'deepseek',
    label: 'DeepSeek',
    hint: 'DeepSeek 的 OpenAI 兼容接口',
    kind: 'native_model',
    protocolFamily: 'openai_compatible',
    defaultEndpoint: 'https://api.deepseek.com/v1/chat/completions',
    modelAliasPlaceholder: 'deepseek-chat',
  },
  openrouter: {
    value: 'openrouter',
    label: 'OpenRouter',
    hint: 'OpenRouter 的 OpenAI 兼容接口',
    kind: 'native_model',
    protocolFamily: 'openai_compatible',
    defaultEndpoint: 'https://openrouter.ai/api/v1/chat/completions',
    modelAliasPlaceholder: 'openrouter/free',
  },
  ollama: {
    value: 'ollama',
    label: 'Ollama',
    hint: '本地或远程 Ollama 的 OpenAI 兼容接口',
    kind: 'native_model',
    protocolFamily: 'openai_compatible',
    defaultEndpoint: 'http://localhost:11434/v1/chat/completions',
    modelAliasPlaceholder: 'llama3.2',
  },
  other_openai: {
    value: 'other_openai',
    label: '其他 OpenAI 兼容',
    hint: '任意 OpenAI-style 上游',
    kind: 'native_model',
    protocolFamily: 'openai_compatible',
    modelAliasPlaceholder: 'custom-agent',
  },
  bailian: {
    value: 'bailian',
    label: '百炼模型',
    hint: '阿里云百炼兼容模型接口',
    kind: 'native_model',
    protocolFamily: 'bailian_compatible',
    defaultEndpoint: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
    modelAliasPlaceholder: 'qwen-plus',
  },
  anthropic: {
    value: 'anthropic',
    label: 'Claude / Anthropic',
    hint: 'Anthropic Messages API',
    kind: 'native_model',
    protocolFamily: 'anthropic_messages',
    defaultEndpoint: 'https://api.anthropic.com/v1/messages',
    modelAliasPlaceholder: 'claude-sonnet-4-0',
  },
  gemini: {
    value: 'gemini',
    label: 'Gemini',
    hint: 'Google Gemini generateContent API',
    kind: 'native_model',
    protocolFamily: 'gemini_generatecontent',
    defaultEndpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent',
    modelAliasPlaceholder: 'gemini-2.5-flash',
  },
  bailian_app: {
    value: 'bailian_app',
    label: '百炼智能体',
    hint: '阿里云百炼应用/智能体，通常需要 App ID 与 API 凭证',
    kind: 'platform_agent',
    protocolFamily: 'bailian_compatible',
    endpointLabel: '平台 API 地址 *',
    endpointPlaceholder: '填写百炼应用调用入口或平台代理地址',
    upstreamIdLabel: '百炼 App / Agent ID（建议填写）',
    upstreamIdPlaceholder: '例如 app-xxxx',
    modelAliasPlaceholder: 'bailian-agent-weather',
    credentialHint: '建议引用百炼应用专用 API Key',
    transformProfilePlaceholder: 'bailian_agent_app',
  },
  appbuilder: {
    value: 'appbuilder',
    label: '百度 AppBuilder',
    hint: '百度千帆 AppBuilder 智能体/应用，通常需要应用 ID 与密钥',
    kind: 'platform_agent',
    protocolFamily: 'openai_compatible',
    endpointLabel: '平台 API 地址 *',
    endpointPlaceholder: '填写 AppBuilder 的服务端 API 地址',
    upstreamIdLabel: 'AppBuilder 应用 ID（建议填写）',
    upstreamIdPlaceholder: '例如 appbuilder-001',
    modelAliasPlaceholder: 'appbuilder-weather-agent',
    credentialHint: '建议引用 AppBuilder 专用密钥',
    transformProfilePlaceholder: 'appbuilder_agent_app',
  },
  dify: {
    value: 'dify',
    label: 'Dify',
    hint: 'Dify Agent / Workflow 应用，通常需要 App ID、服务端 API 与密钥',
    kind: 'platform_agent',
    protocolFamily: 'openai_compatible',
    endpointLabel: 'Dify API 地址 *',
    endpointPlaceholder: '例如 https://api.dify.ai/v1/chat-messages',
    upstreamIdLabel: 'Dify App ID（建议填写）',
    upstreamIdPlaceholder: '例如 app-123456',
    modelAliasPlaceholder: 'dify-sales-agent',
    credentialHint: '建议引用 Dify Server API Key',
    transformProfilePlaceholder: 'dify_agent_app',
  },
  openai_agents: {
    value: 'openai_agents',
    label: 'OpenAI Agent Runtime',
    hint: 'OpenAI Responses / Agent Builder 运行时，通常需要 Agent/Assistant ID 与 API Key',
    kind: 'platform_agent',
    protocolFamily: 'openai_compatible',
    endpointLabel: 'OpenAI 运行时地址 *',
    endpointPlaceholder: '例如 https://api.openai.com/v1/responses',
    upstreamIdLabel: 'OpenAI Agent / Assistant ID（建议填写）',
    upstreamIdPlaceholder: '例如 asst_123',
    modelAliasPlaceholder: 'openai-support-agent',
    credentialHint: '建议引用 OpenAI Agent 专用 Key',
    transformProfilePlaceholder: 'openai_agent_runtime',
  },
  tencent_yuanqi: {
    value: 'tencent_yuanqi',
    label: '腾讯元器',
    hint: '腾讯元器智能体，通常需要 Agent / Bot App Key 与平台调用地址',
    kind: 'platform_agent',
    protocolFamily: 'openai_compatible',
    endpointLabel: '腾讯元器 API 地址 *',
    endpointPlaceholder: '例如 https://lke.cloud.tencent.com/v1/qbot/chat/sse',
    upstreamIdLabel: '元器 Agent / Bot App Key（建议填写）',
    upstreamIdPlaceholder: '例如 bot-app-key-123',
    modelAliasPlaceholder: 'yuanqi-support-agent',
    credentialHint: '如平台要求额外密钥，可引用腾讯元器专用凭证',
    transformProfilePlaceholder: 'tencent_yuanqi_agent',
  },
};

export const AGENT_PROVIDER_PRESET_OPTIONS: Array<{ value: AgentProviderPreset; label: string; hint: string }> =
  Object.values(AGENT_PROVIDER_PRESET_REGISTRY).map((item) => ({
    value: item.value,
    label: item.label,
    hint: item.hint,
  }));

function lower(value: string | null | undefined): string {
  return String(value ?? '').trim().toLowerCase();
}

export function isAgentProviderPreset(value: string | null | undefined): value is AgentProviderPreset {
  const normalized = lower(value);
  return normalized in AGENT_PROVIDER_PRESET_REGISTRY;
}

export function getAgentProviderPresetMeta(preset: AgentProviderPreset): AgentProviderPresetMeta {
  return AGENT_PROVIDER_PRESET_REGISTRY[preset];
}

export function isPlatformAgentProviderPreset(preset: AgentProviderPreset): boolean {
  return getAgentProviderPresetMeta(preset).kind === 'platform_agent';
}

export function protocolForAgentProviderPreset(preset: AgentProviderPreset): AgentRegistrationProtocol {
  return getAgentProviderPresetMeta(preset).protocolFamily;
}

export function resolveAgentProviderPreset(input: {
  registrationProtocol?: string | null;
  upstreamEndpoint?: string | null;
  providerPreset?: string | null;
  upstreamAgentId?: string | null;
}): AgentProviderPreset {
  const explicitPreset = lower(input.providerPreset);
  if (explicitPreset === 'openai') return 'openai';
  if (explicitPreset === 'deepseek') return 'deepseek';
  if (explicitPreset === 'openrouter') return 'openrouter';
  if (explicitPreset === 'ollama') return 'ollama';
  if (explicitPreset === 'other_openai') return 'other_openai';
  if (explicitPreset === 'bailian') return 'bailian';
  if (explicitPreset === 'anthropic') return 'anthropic';
  if (explicitPreset === 'gemini') return 'gemini';
  if (['bailian_app', 'bailian-agent', 'bailian_agent', 'aliyun_agent', 'dashscope_application'].includes(explicitPreset)) {
    return 'bailian_app';
  }
  if (['appbuilder', 'qianfan', 'qianfan_appbuilder', 'baidu_appbuilder'].includes(explicitPreset)) {
    return 'appbuilder';
  }
  if (['dify', 'dify_app'].includes(explicitPreset)) return 'dify';
  if (['openai_agents', 'openai_agent', 'openai_agent_builder', 'openai_assistant'].includes(explicitPreset)) {
    return 'openai_agents';
  }
  if (['tencent_yuanqi', 'yuanqi', 'tencent_lke', 'qbot'].includes(explicitPreset)) {
    return 'tencent_yuanqi';
  }

  const endpoint = lower(input.upstreamEndpoint);
  const upstreamAgentId = lower(input.upstreamAgentId);
  if (endpoint.includes('api.dify.ai') || endpoint.includes('/v1/chat-messages') || endpoint.includes('/v1/workflows/run')) {
    return 'dify';
  }
  if (endpoint.includes('qianfan.baidubce.com') || endpoint.includes('appbuilder.baidu') || endpoint.includes('/app/conversation')) {
    return 'appbuilder';
  }
  if (endpoint.includes('lke.cloud.tencent.com') || endpoint.includes('/qbot/chat') || endpoint.includes('/qbot/chat/sse')) {
    return 'tencent_yuanqi';
  }
  if (
    endpoint.includes('api.openai.com') &&
    (endpoint.includes('/v1/responses') || endpoint.includes('/v1/assistants') || endpoint.includes('/v1/threads') || upstreamAgentId.startsWith('asst_'))
  ) {
    return 'openai_agents';
  }
  if ((endpoint.includes('dashscope') || endpoint.includes('bailian') || endpoint.includes('qwen')) && Boolean(upstreamAgentId)) {
    return 'bailian_app';
  }
  if (endpoint.includes('api.deepseek.com') || endpoint.includes('deepseek')) return 'deepseek';
  if (endpoint.includes('openrouter.ai')) return 'openrouter';
  if (endpoint.includes('11434') || endpoint.includes('/api/chat') || endpoint.includes('/v1/chat/completions')) {
    if (endpoint.includes('localhost') || endpoint.includes('127.0.0.1') || endpoint.includes('ollama')) {
      return 'ollama';
    }
  }
  if (endpoint.includes('dashscope') || endpoint.includes('bailian') || endpoint.includes('qwen')) return 'bailian';
  if (endpoint.includes('anthropic') || endpoint.includes('/v1/messages') || endpoint.includes('claude')) return 'anthropic';
  if (endpoint.includes('generativelanguage.googleapis.com') || endpoint.includes('gemini') || endpoint.includes(':generatecontent')) {
    return 'gemini';
  }
  if (endpoint.includes('openai.com')) return 'openai';

  const protocol = lower(input.registrationProtocol);
  if (protocol === 'bailian_compatible') return Boolean(upstreamAgentId) ? 'bailian_app' : 'bailian';
  if (protocol === 'anthropic_messages') return 'anthropic';
  if (protocol === 'gemini_generatecontent') return 'gemini';
  return 'other_openai';
}

export function defaultEndpointForAgentProviderPreset(preset: AgentProviderPreset): string {
  return getAgentProviderPresetMeta(preset).defaultEndpoint ?? '';
}

const AGENT_ADAPTER_SPEC_KEYS = [
  'x_adapter_id',
  'x_adapter_kind',
  'x_protocol_family',
  'x_provider_label',
  'x_model_alias',
] as const;

export function buildAgentAdapterSpecMeta(
  preset: AgentProviderPreset,
  input?: {
    modelAlias?: string | null;
  },
): Record<string, unknown> {
  const meta = getAgentProviderPresetMeta(preset);
  return {
    x_adapter_id: meta.value,
    x_adapter_kind: meta.kind,
    x_protocol_family: meta.protocolFamily,
    x_provider_label: meta.label,
    ...(String(input?.modelAlias ?? '').trim() ? { x_model_alias: String(input?.modelAlias).trim() } : {}),
  };
}

export function extractAgentProviderPresetFromSpec(spec: Record<string, unknown> | null | undefined): AgentProviderPreset | undefined {
  const raw = typeof spec?.x_adapter_id === 'string' ? spec.x_adapter_id : '';
  return isAgentProviderPreset(raw) ? raw : undefined;
}

export function stripAgentAdapterSpecMeta(spec: Record<string, unknown> | null | undefined): Record<string, unknown> {
  const next = { ...(spec ?? {}) };
  for (const key of AGENT_ADAPTER_SPEC_KEYS) {
    delete next[key];
  }
  return next;
}

export function coerceMcpRegisterMode(input: {
  endpoint?: string | null;
  hintedMode?: string | null;
  transportHint?: string | null;
}): SupportedMcpRegisterMode {
  const endpoint = lower(input.endpoint);
  const hintedMode = lower(input.hintedMode);
  const transportHint = lower(input.transportHint);

  if (hintedMode === 'websocket' || transportHint === 'websocket' || endpoint.startsWith('ws://') || endpoint.startsWith('wss://')) {
    return 'websocket';
  }
  if (hintedMode === 'http_sse' || transportHint === 'sse' || transportHint === 'http_sse' || endpoint.includes('/sse')) {
    return 'http_sse';
  }
  return 'http_json';
}

export function createStructuredParamField(): StructuredParamField {
  return {
    id: `spf_${Math.random().toString(36).slice(2, 10)}`,
    key: '',
    label: '',
    type: 'string',
    required: false,
    defaultValue: '',
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function schemaToStructuredParamFields(schema: unknown): StructuredParamField[] {
  if (!isObject(schema) || schema.type !== 'object' || !isObject(schema.properties)) {
    return [];
  }
  const required = Array.isArray(schema.required) ? schema.required.map((item) => String(item)) : [];
  return Object.entries(schema.properties)
    .map(([key, raw]) => {
      if (!isObject(raw)) return null;
      const type = lower(String(raw.type ?? 'string')) as StructuredParamFieldType;
      if (!['string', 'integer', 'number', 'boolean'].includes(type)) return null;
      const field: StructuredParamField = {
        id: `spf_${key}`,
        key,
        label: typeof raw.title === 'string' && raw.title.trim() ? raw.title.trim() : key,
        type,
        required: required.includes(key),
        description: typeof raw.description === 'string' && raw.description.trim() ? raw.description.trim() : undefined,
        defaultValue:
          raw.default === undefined
            ? type === 'boolean'
              ? false
              : type === 'integer' || type === 'number'
                ? 0
              : ''
            : (raw.default as string | number | boolean),
      };
      return field;
    })
    .filter((field): field is StructuredParamField => field !== null);
}

export function structuredParamFieldsToSchema(fields: StructuredParamField[]): Record<string, unknown> {
  const properties: Record<string, unknown> = {};
  const required: string[] = [];

  for (const field of fields) {
    const key = field.key.trim();
    if (!key) continue;
    const property: Record<string, unknown> = { type: field.type };
    const label = field.label.trim();
    if (label) property.title = label;
    const description = field.description?.trim();
    if (description) property.description = description;
    if (field.defaultValue !== '' && field.defaultValue !== undefined) {
      property.default = field.defaultValue;
    }
    properties[key] = property;
    if (field.required) required.push(key);
  }

  return {
    type: 'object',
    properties,
    ...(required.length > 0 ? { required } : {}),
  };
}
