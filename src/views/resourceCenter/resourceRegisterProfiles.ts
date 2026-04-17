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
  | 'gemini';

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

export const AGENT_PROVIDER_PRESET_OPTIONS: Array<{ value: AgentProviderPreset; label: string; hint: string }> = [
  { value: 'openai', label: 'OpenAI', hint: 'OpenAI 原生接口' },
  { value: 'deepseek', label: 'DeepSeek', hint: 'DeepSeek 的 OpenAI 兼容接口' },
  { value: 'openrouter', label: 'OpenRouter', hint: 'OpenRouter 的 OpenAI 兼容接口' },
  { value: 'ollama', label: 'Ollama', hint: '本地或远程 Ollama 的 OpenAI 兼容接口' },
  { value: 'other_openai', label: '其他 OpenAI 兼容', hint: '任意 OpenAI-style 上游' },
  { value: 'bailian', label: '百炼', hint: '阿里云百炼兼容接口' },
  { value: 'anthropic', label: 'Claude / Anthropic', hint: 'Anthropic Messages API' },
  { value: 'gemini', label: 'Gemini', hint: 'Google Gemini generateContent API' },
];

const OPENAI_COMPATIBLE_PRESETS = new Set<AgentProviderPreset>([
  'openai',
  'deepseek',
  'openrouter',
  'ollama',
  'other_openai',
]);

function lower(value: string | null | undefined): string {
  return String(value ?? '').trim().toLowerCase();
}

export function protocolForAgentProviderPreset(preset: AgentProviderPreset): AgentRegistrationProtocol {
  if (OPENAI_COMPATIBLE_PRESETS.has(preset)) return 'openai_compatible';
  if (preset === 'bailian') return 'bailian_compatible';
  if (preset === 'anthropic') return 'anthropic_messages';
  return 'gemini_generatecontent';
}

export function resolveAgentProviderPreset(input: {
  registrationProtocol?: string | null;
  upstreamEndpoint?: string | null;
  providerPreset?: string | null;
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

  const endpoint = lower(input.upstreamEndpoint);
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
  if (protocol === 'bailian_compatible') return 'bailian';
  if (protocol === 'anthropic_messages') return 'anthropic';
  if (protocol === 'gemini_generatecontent') return 'gemini';
  return 'other_openai';
}

export function defaultEndpointForAgentProviderPreset(preset: AgentProviderPreset): string {
  switch (preset) {
    case 'openai':
      return 'https://api.openai.com/v1/chat/completions';
    case 'deepseek':
      return 'https://api.deepseek.com/v1/chat/completions';
    case 'openrouter':
      return 'https://openrouter.ai/api/v1/chat/completions';
    case 'ollama':
      return 'http://localhost:11434/v1/chat/completions';
    case 'bailian':
      return 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';
    case 'anthropic':
      return 'https://api.anthropic.com/v1/messages';
    case 'gemini':
      return 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent';
    default:
      return '';
  }
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
