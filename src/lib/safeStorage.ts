/** localStorage 安全与体积：校验结构、截断、防异常大包拖垮页面 */

export const MAX_STORED_API_KEY_LENGTH = 8192;
/** API Playground「最近请求」条数上限（本地 `lantu_playground_history` 同步） */
export const MAX_PLAYGROUND_HISTORY_ITEMS = 3;
export const MAX_PLAYGROUND_BODY_CHARS = 24_000;
export const MAX_PLAYGROUND_URL_LENGTH = 4096;
export const MAX_WORKSPACE_AGENT_IDS = 500;

const HTTP_METHODS = new Set(['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS']);

/** GET /catalog/resources 列表（非 /catalog/resources/{type}/{id}） */
function pathnameFromPlaygroundUrl(url: string): string {
  const t = url.trim();
  if (!t) return '';
  if (/^https?:\/\//i.test(t)) {
    try {
      return new URL(t).pathname.replace(/\/+$/, '') || '/';
    } catch {
      return t.split(/[?#]/)[0].replace(/\/+$/, '') || '/';
    }
  }
  return t.split(/[?#]/)[0].replace(/\/+$/, '') || '/';
}

function isCatalogResourcesListUrl(url: string): boolean {
  return /\/catalog\/resources$/.test(pathnameFromPlaygroundUrl(url));
}

/**
 * 试玩默认分页由 20 改为 10 后，迁移本地历史与地址栏中的旧 query（仅 GET 目录列表路径）。
 * 避免 `pageSize=200` 被误改：只匹配 `pageSize=20` 作为独立参数。
 */
export function normalizeCatalogResourcesListPageSizeInUrl(url: string): string {
  if (!url || url.length > MAX_PLAYGROUND_URL_LENGTH) return url;
  if (!isCatalogResourcesListUrl(url)) return url;
  if (!url.includes('pageSize=20')) return url;
  return url.replace(/([?&])pageSize=20(?=&|$)/g, '$1pageSize=10');
}

export interface PlaygroundHistoryEntry {
  method: string;
  url: string;
  status: number;
  time: number;
  body: string;
  responseBody: string;
}

export function truncateForStorage(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}\n… [已截断 ${text.length - max} 字符]`;
}

export function readBoundedLocalStorage(key: string, maxLen: number): string | null {
  try {
    const v = localStorage.getItem(key);
    if (v == null) return null;
    if (v.length > maxLen) return null;
    return v;
  } catch {
    return null;
  }
}

/** 网关 /catalog/resolve、/invoke 等使用的本地 API Key（与 App/MCP 共用 `lantu_api_key`） */
export function getStoredGatewayApiKey(): string | undefined {
  const raw = readBoundedLocalStorage('lantu_api_key', MAX_STORED_API_KEY_LENGTH);
  if (raw == null) return undefined;
  const t = raw.trim();
  return t.length > 0 ? t : undefined;
}

export function normalizePlaygroundHistory(entries: unknown): PlaygroundHistoryEntry[] {
  if (!Array.isArray(entries)) return [];
  const out: PlaygroundHistoryEntry[] = [];
  for (const e of entries) {
    if (!e || typeof e !== 'object') continue;
    const o = e as Record<string, unknown>;
    const methodRaw = typeof o.method === 'string' ? o.method.toUpperCase() : 'GET';
    if (!HTTP_METHODS.has(methodRaw)) continue;
    const urlRaw = typeof o.url === 'string' ? o.url : '';
    const url = normalizeCatalogResourcesListPageSizeInUrl(urlRaw);
    if (url.length > MAX_PLAYGROUND_URL_LENGTH) continue;
    const status = typeof o.status === 'number' && Number.isFinite(o.status) ? o.status : 0;
    const time = typeof o.time === 'number' && Number.isFinite(o.time) ? o.time : 0;
    const body = typeof o.body === 'string' ? truncateForStorage(o.body, MAX_PLAYGROUND_BODY_CHARS) : '';
    const responseBody =
      typeof o.responseBody === 'string' ? truncateForStorage(o.responseBody, MAX_PLAYGROUND_BODY_CHARS) : '';
    out.push({ method: methodRaw, url, status, time, body, responseBody });
    if (out.length >= MAX_PLAYGROUND_HISTORY_ITEMS) break;
  }
  return out;
}

export function parsePlaygroundHistoryFromStorage(raw: string | null): PlaygroundHistoryEntry[] {
  if (!raw) return [];
  try {
    return normalizePlaygroundHistory(JSON.parse(raw) as unknown);
  } catch {
    return [];
  }
}

export function parseQuickLinkIds(raw: string | null, fallback: readonly string[], allowed: Set<string>): string[] {
  try {
    const parsed = JSON.parse(raw ?? 'null') as unknown;
    if (!Array.isArray(parsed)) {
      return fallback.filter((id) => allowed.has(id));
    }
    const ids = parsed.filter((x): x is string => typeof x === 'string' && allowed.has(x));
    const uniq = [...new Set(ids)];
    return uniq.length > 0 ? uniq : fallback.filter((id) => allowed.has(id));
  } catch {
    return fallback.filter((id) => allowed.has(id));
  }
}

const AGENT_ID_STORAGE_PATTERN = /^[a-zA-Z0-9_-]{1,128}$/;

export function parseWorkspaceAgentIdsFromStorage(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const ids = parsed
      .filter((x): x is string => typeof x === 'string' && AGENT_ID_STORAGE_PATTERN.test(x))
      .slice(0, MAX_WORKSPACE_AGENT_IDS);
    return [...new Set(ids)];
  } catch {
    return [];
  }
}
