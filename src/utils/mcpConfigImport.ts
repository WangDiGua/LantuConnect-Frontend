import { coerceMcpRegisterMode, type SupportedMcpRegisterMode } from '../views/resourceCenter/resourceRegisterProfiles';

/**
 * MCP 粘贴导入工具：
 * 1) 支持 mcpServers / servers / server / 单对象
 * 2) 支持直接粘贴 URL 或从文本中提取 URL
 * 3) 自动识别远程 transport 与鉴权并回填表单
 * 4) command / stdio 只提示先远程暴露，不再作为可提交注册方式
 */

export type McpImportResult = {
  endpoint?: string;
  mcpRegisterMode?: SupportedMcpRegisterMode;
  authType?: string;
  authConfig?: Record<string, unknown>;
  hint?: string;
};

type Candidate = { name?: string; entry: Record<string, unknown> };

function isObject(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

function pickString(obj: Record<string, unknown>, keys: string[]): string {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return '';
}

function extractUrlFromText(text: string): string {
  const m = text.match(/(https?:\/\/[^\s"'`]+|wss?:\/\/[^\s"'`]+)/i);
  return m?.[1]?.trim() ?? '';
}

function detectMode(url: string, transportHint: string): SupportedMcpRegisterMode {
  return coerceMcpRegisterMode({
    endpoint: url,
    transportHint,
    hintedMode: transportHint,
  });
}

function parseAuth(entry: Record<string, unknown>): Pick<McpImportResult, 'authType' | 'authConfig'> {
  const authConfig: Record<string, unknown> = { method: 'tools/call' };
  let authType: McpImportResult['authType'] = 'none';

  const authObj = isObject(entry.auth) ? entry.auth : {};
  const headersObj = isObject(entry.headers) ? entry.headers : isObject(authObj.headers) ? authObj.headers : {};
  if (Object.keys(headersObj).length > 0) {
    authConfig.headers = { ...headersObj };
  }

  const authHeader =
    (typeof headersObj.Authorization === 'string' && headersObj.Authorization) ||
    (typeof headersObj.authorization === 'string' && headersObj.authorization) ||
    (typeof authObj.authorization === 'string' && authObj.authorization) ||
    '';
  if (authHeader) {
    const val = authHeader.trim();
    if (/^bearer\s+/i.test(val)) {
      authType = 'bearer';
      authConfig.token = val.replace(/^bearer\s+/i, '').trim();
      const nextHeaders = { ...(authConfig.headers as Record<string, unknown>) };
      delete nextHeaders.Authorization;
      delete nextHeaders.authorization;
      authConfig.headers = nextHeaders;
    }
  }

  const xApiKey =
    (typeof headersObj['X-Api-Key'] === 'string' && headersObj['X-Api-Key']) ||
    (typeof headersObj['x-api-key'] === 'string' && headersObj['x-api-key']) ||
    (typeof authObj.apiKey === 'string' && authObj.apiKey) ||
    (typeof entry.apiKey === 'string' && entry.apiKey) ||
    '';
  if (xApiKey && String(xApiKey).trim()) {
    authType = 'api_key';
    authConfig.headerName = 'X-Api-Key';
    authConfig.apiKey = String(xApiKey).trim();
    const nextHeaders = { ...(authConfig.headers as Record<string, unknown>) };
    delete nextHeaders['X-Api-Key'];
    delete nextHeaders['x-api-key'];
    authConfig.headers = nextHeaders;
  }

  const token =
    pickString(authObj, ['token', 'bearerToken', 'accessToken']) ||
    pickString(entry, ['token', 'bearerToken', 'accessToken']);
  if (token) {
    authType = 'bearer';
    authConfig.token = token;
  }

  const authTypeRaw = pickString(authObj, ['type', 'authType']).toLowerCase();
  const oauthTokenUrl = pickString(authObj, ['tokenUrl', 'oauthTokenUrl']);
  const oauthClientId = pickString(authObj, ['clientId', 'oauthClientId']);
  const oauthClientSecret = pickString(authObj, ['clientSecret']);
  const oauthScope = pickString(authObj, ['scope']);
  if (authTypeRaw === 'oauth2' || authTypeRaw === 'oauth2_client' || oauthTokenUrl || oauthClientId) {
    authType = 'oauth2_client';
    if (oauthTokenUrl) authConfig.tokenUrl = oauthTokenUrl;
    if (oauthClientId) authConfig.clientId = oauthClientId;
    if (oauthClientSecret) authConfig.clientSecret = oauthClientSecret;
    if (oauthScope) authConfig.scope = oauthScope;
  }

  const basicUser = pickString(authObj, ['username', 'user']);
  const basicPass = pickString(authObj, ['password', 'pass']);
  if (authTypeRaw === 'basic' || (basicUser && basicPass)) {
    authType = 'basic';
    if (basicUser) authConfig.username = basicUser;
    if (basicPass) authConfig.password = basicPass;
  }

  return { authType, authConfig };
}

function mapRemoteEntry(entry: Record<string, unknown>, name?: string): McpImportResult {
  const command = pickString(entry, ['command']);
  const fromArgs = extractUrlFromText(JSON.stringify(entry.args ?? entry.argv ?? entry.commandLine ?? ''));
  const url = pickString(entry, ['url', 'serverUrl', 'endpoint', 'baseUrl']) || fromArgs;

  if (!url && command) {
    return {
      hint: `检测到 ${name ?? 'server'} 为 command/stdio。平台注册只接受远程可调用的 MCP，请先将服务暴露成 http(s)/ws(s) 地址后再登记。`,
    };
  }
  if (!url) {
    return {
      hint: `在 ${name ?? '当前配置'} 中未找到 url/serverUrl/endpoint/baseUrl。`,
    };
  }

  const transportHint =
    pickString(entry, ['transport', 'protocol']) ||
    (isObject(entry.auth) ? pickString(entry.auth, ['transport', 'protocol']) : '');
  const mode = detectMode(url, transportHint);
  const { authType, authConfig } = parseAuth(entry);
  return {
    endpoint: url,
    mcpRegisterMode: mode,
    authType,
    authConfig,
    hint: name ? `已从 ${name} 自动解析并填充。` : undefined,
  };
}

function collectCandidates(root: Record<string, unknown>): Candidate[] {
  const out: Candidate[] = [];

  const mcpServers = root.mcpServers;
  if (isObject(mcpServers)) {
    for (const [name, value] of Object.entries(mcpServers)) {
      if (isObject(value)) out.push({ name: `mcpServers.${name}`, entry: value });
    }
  }

  const servers = root.servers;
  if (Array.isArray(servers)) {
    servers.forEach((it, idx) => {
      if (isObject(it)) out.push({ name: `servers[${idx}]`, entry: it });
    });
  } else if (isObject(servers)) {
    for (const [name, value] of Object.entries(servers)) {
      if (isObject(value)) out.push({ name: `servers.${name}`, entry: value });
    }
  }

  if (isObject(root.server)) {
    out.push({ name: 'server', entry: root.server });
  }

  if (
    typeof root.url === 'string' ||
    typeof root.serverUrl === 'string' ||
    typeof root.endpoint === 'string' ||
    typeof root.command === 'string'
  ) {
    out.push({ name: 'root', entry: root });
  }

  return out;
}

export function parseMcpConfigPaste(text: string): McpImportResult {
  const trimmed = text.trim();
  if (!trimmed) return { hint: '内容为空' };

  if (/^(https?:\/\/|wss?:\/\/)/i.test(trimmed)) {
    return mapRemoteEntry({ url: trimmed }, 'URL');
  }

  let root: unknown;
  try {
    root = JSON.parse(trimmed);
  } catch {
    const url = extractUrlFromText(trimmed);
    if (url) {
      return {
        ...mapRemoteEntry({ url }, '文本片段'),
        hint: 'JSON 解析失败，但已从文本中提取 URL 并填入。',
      };
    }
    return { hint: '不是合法 JSON，且未识别到可用 MCP 地址。' };
  }

  if (!isObject(root)) {
    return { hint: '根节点必须是 JSON 对象。' };
  }

  const candidates = collectCandidates(root);
  if (candidates.length === 0) {
    const url = extractUrlFromText(JSON.stringify(root));
    if (url) {
      return {
        ...mapRemoteEntry({ url }, 'JSON 文本'),
        hint: '已从 JSON 文本中提取 URL 并填入。',
      };
    }
    return { hint: '未找到可解析的 server（mcpServers/servers/server/url）。' };
  }

  let firstHint: string | undefined;
  for (const c of candidates) {
    const r = mapRemoteEntry(c.entry, c.name);
    if (r.endpoint) {
      if (candidates.length > 1) {
        r.hint = `${r.hint ?? '已自动解析。'} 当前共识别到 ${candidates.length} 个 server，默认使用第一项。`;
      }
      return r;
    }
    if (!firstHint && r.hint) firstHint = r.hint;
  }

  return { hint: firstHint ?? '未能识别可用的远程 MCP 地址。' };
}
