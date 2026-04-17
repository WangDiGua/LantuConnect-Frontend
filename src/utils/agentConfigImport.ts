import {
  protocolForAgentProviderPreset,
  resolveAgentProviderPreset,
  type AgentProviderPreset,
  type AgentRegistrationProtocol,
} from '../views/resourceCenter/resourceRegisterProfiles';

export type AgentImportProtocol = AgentRegistrationProtocol;

export type AgentImportResult = {
  registrationProtocol?: AgentImportProtocol;
  providerPreset?: AgentProviderPreset;
  upstreamEndpoint?: string;
  upstreamAgentId?: string;
  credentialRef?: string;
  transformProfile?: string;
  modelAlias?: string;
  enabled?: boolean;
  hint?: string;
};

function isObject(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

function firstString(obj: Record<string, unknown>, keys: string[]): string {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return '';
}

function findUrl(text: string): string {
  const m = text.match(/(https?:\/\/[^\s"'`]+|wss?:\/\/[^\s"'`]+)/i);
  return m?.[1]?.trim() ?? '';
}

function normalizeProtocol(raw: string): AgentImportProtocol | undefined {
  const s = raw.trim().toLowerCase();
  if (!s) return undefined;
  if (s.includes('bailian') || s.includes('dashscope') || s.includes('qwen')) return 'bailian_compatible';
  if (s.includes('anthropic') || s.includes('claude') || s.includes('messages')) return 'anthropic_messages';
  if (s.includes('gemini') || s.includes('google') || s.includes('generatecontent')) return 'gemini_generatecontent';
  if (s.includes('openai') || s.includes('deepseek') || s.includes('openrouter') || s.includes('ollama')) {
    return 'openai_compatible';
  }
  if (s === 'openai_compatible' || s === 'bailian_compatible' || s === 'anthropic_messages' || s === 'gemini_generatecontent') {
    return s as AgentImportProtocol;
  }
  return undefined;
}

function normalizeModelAlias(raw: string): string {
  const cleaned = raw.trim();
  if (!cleaned) return '';
  return cleaned
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 120);
}

function mapConfigObject(source: Record<string, unknown>): AgentImportResult {
  const root = source;
  const nested =
    (isObject(root.agent) && root.agent) ||
    (isObject(root.config) && root.config) ||
    (isObject(root.providerConfig) && root.providerConfig) ||
    (isObject(root.upstream) && root.upstream) ||
    root;

  const providerRaw =
    firstString(root, ['providerPreset', 'registrationProtocol', 'protocol', 'provider', 'type']) ||
    firstString(nested, ['providerPreset', 'registrationProtocol', 'protocol', 'provider', 'type']);

  const endpoint =
    firstString(nested, ['upstreamEndpoint', 'endpoint', 'url', 'baseUrl', 'baseURL', 'apiBase', 'api_base']) ||
    firstString(root, ['upstreamEndpoint', 'endpoint', 'url', 'baseUrl', 'baseURL']) ||
    findUrl(JSON.stringify(root));

  const upstreamAgentId =
    firstString(nested, ['upstreamAgentId', 'customizedModelId', 'customized_model_id', 'agentId', 'appId', 'assistantId', 'deployment', 'model']) ||
    firstString(root, ['upstreamAgentId', 'customizedModelId', 'customized_model_id', 'agentId', 'appId', 'assistantId', 'deployment', 'model']);

  const modelAliasRaw =
    firstString(nested, ['modelAlias', 'customizedModelId', 'customized_model_id', 'alias', 'model', 'name']) ||
    firstString(root, ['modelAlias', 'customizedModelId', 'customized_model_id', 'alias', 'model', 'name']) ||
    upstreamAgentId;

  const transformProfile = firstString(nested, ['transformProfile', 'profile']) || firstString(root, ['transformProfile', 'profile']);

  const credentialRef =
    firstString(nested, ['credentialRef', 'apiKeyRef', 'secretRef']) ||
    firstString(root, ['credentialRef', 'apiKeyRef', 'secretRef']) ||
    firstString(nested, ['apiKey', 'token', 'accessToken', 'clientSecret']) ||
    firstString(root, ['apiKey', 'token', 'accessToken', 'clientSecret']);

  const enabledRaw = (nested.enabled ?? root.enabled) as unknown;
  const enabled =
    enabledRaw == null
      ? undefined
      : enabledRaw === true ||
        enabledRaw === 1 ||
        String(enabledRaw).trim().toLowerCase() === 'true' ||
        String(enabledRaw).trim() === '1';

  const protocolFromRaw = normalizeProtocol(providerRaw);
  const providerPreset = resolveAgentProviderPreset({
    providerPreset: providerRaw,
    registrationProtocol: protocolFromRaw,
    upstreamEndpoint: endpoint,
  });

  const modelAlias = normalizeModelAlias(modelAliasRaw || '');

  return {
    registrationProtocol: protocolFromRaw ?? protocolForAgentProviderPreset(providerPreset),
    providerPreset,
    upstreamEndpoint: endpoint || undefined,
    upstreamAgentId: upstreamAgentId || undefined,
    credentialRef: credentialRef || undefined,
    transformProfile: transformProfile || undefined,
    modelAlias: modelAlias || undefined,
    enabled,
  };
}

export function parseAgentConfigPaste(text: string): AgentImportResult {
  const trimmed = text.trim();
  if (!trimmed) return { hint: '内容为空' };

  if (/^(https?:\/\/)/i.test(trimmed)) {
    const providerPreset = resolveAgentProviderPreset({ upstreamEndpoint: trimmed });
    return {
      registrationProtocol: protocolForAgentProviderPreset(providerPreset),
      providerPreset,
      upstreamEndpoint: trimmed,
      hint: '已识别为 URL，其它字段请按需补充。',
    };
  }

  let root: unknown;
  try {
    root = JSON.parse(trimmed);
  } catch {
    const url = findUrl(trimmed);
    if (url) {
      const providerPreset = resolveAgentProviderPreset({ upstreamEndpoint: url });
      return {
        registrationProtocol: protocolForAgentProviderPreset(providerPreset),
        providerPreset,
        upstreamEndpoint: url,
        hint: 'JSON 解析失败，但已从文本提取 URL 并填入。',
      };
    }
    return { hint: '不是合法 JSON，也未识别到可用 URL。' };
  }

  if (!isObject(root)) {
    return { hint: '根节点必须是 JSON 对象。' };
  }

  const mapped = mapConfigObject(root);
  if (!mapped.upstreamEndpoint && !mapped.modelAlias && !mapped.upstreamAgentId) {
    return { hint: '未识别到 Agent 核心字段（endpoint/modelAlias/customizedModelId/upstreamAgentId）。' };
  }
  return {
    ...mapped,
    hint: '已自动解析并填充 Agent 字段，请核对后保存。',
  };
}
