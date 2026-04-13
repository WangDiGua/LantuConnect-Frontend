export type AgentImportProtocol =
  | 'openai_compatible'
  | 'bailian_compatible'
  | 'anthropic_messages'
  | 'gemini_generatecontent';

export type AgentImportResult = {
  registrationProtocol?: AgentImportProtocol;
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
  if (s.includes('openai') || s.includes('chat_completions') || s.includes('chat/completions')) return 'openai_compatible';
  if (s === 'openai_compatible' || s === 'bailian_compatible' || s === 'anthropic_messages' || s === 'gemini_generatecontent') {
    return s as AgentImportProtocol;
  }
  return undefined;
}

function inferProtocolByEndpoint(endpoint: string): AgentImportProtocol {
  const e = endpoint.toLowerCase();
  if (e.includes('dashscope') || e.includes('bailian')) return 'bailian_compatible';
  if (e.includes('anthropic')) return 'anthropic_messages';
  if (e.includes('generativelanguage.googleapis.com') || e.includes('gemini')) return 'gemini_generatecontent';
  return 'openai_compatible';
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
    firstString(root, ['registrationProtocol', 'protocol', 'provider', 'type']) ||
    firstString(nested, ['registrationProtocol', 'protocol', 'provider', 'type']);

  const endpoint =
    firstString(nested, ['upstreamEndpoint', 'endpoint', 'url', 'baseUrl', 'baseURL', 'apiBase', 'api_base']) ||
    firstString(root, ['upstreamEndpoint', 'endpoint', 'url', 'baseUrl', 'baseURL']) ||
    findUrl(JSON.stringify(root));

  const upstreamAgentId =
    firstString(nested, ['upstreamAgentId', 'agentId', 'appId', 'assistantId', 'deployment', 'model']) ||
    firstString(root, ['upstreamAgentId', 'agentId', 'appId', 'assistantId', 'deployment', 'model']);

  const modelAliasRaw =
    firstString(nested, ['modelAlias', 'alias', 'model', 'name']) ||
    firstString(root, ['modelAlias', 'alias', 'model', 'name']) ||
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
  const finalProtocol = protocolFromRaw ?? (endpoint ? inferProtocolByEndpoint(endpoint) : 'openai_compatible');

  const modelAlias = normalizeModelAlias(modelAliasRaw || '');

  return {
    registrationProtocol: finalProtocol,
    upstreamEndpoint: endpoint || undefined,
    upstreamAgentId: upstreamAgentId || undefined,
    credentialRef: credentialRef || undefined,
    transformProfile: transformProfile || undefined,
    modelAlias: modelAlias || undefined,
    enabled,
  };
}

/**
 * Agent 配置粘贴解析：
 * - 支持 URL 直贴
 * - 支持常见 JSON 配置对象（含嵌套）
 * - 自动推断协议与核心字段
 */
export function parseAgentConfigPaste(text: string): AgentImportResult {
  const trimmed = text.trim();
  if (!trimmed) return { hint: '内容为空' };

  if (/^(https?:\/\/)/i.test(trimmed)) {
    return {
      registrationProtocol: inferProtocolByEndpoint(trimmed),
      upstreamEndpoint: trimmed,
      hint: '已识别为 URL，其他字段请按需补充。',
    };
  }

  let root: unknown;
  try {
    root = JSON.parse(trimmed);
  } catch {
    const url = findUrl(trimmed);
    if (url) {
      return {
        registrationProtocol: inferProtocolByEndpoint(url),
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
    return { hint: '未识别到 Agent 核心字段（endpoint/modelAlias/upstreamAgentId）。' };
  }
  return {
    ...mapped,
    hint: '已自动解析并填充 Agent 字段，请核对后保存。',
  };
}
