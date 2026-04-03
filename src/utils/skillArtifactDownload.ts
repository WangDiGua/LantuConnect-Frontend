import { env } from '../config/env';
import { buildGatewayAuthHeaders } from '../lib/http';
import type { ResourceResolveVO } from '../types/dto/catalog';

function apiBase(): string {
  return String(env.VITE_API_BASE_URL || '').replace(/\/$/, '');
}

function toAbsoluteUrl(pathOrUrl: string): string {
  const t = pathOrUrl.trim();
  if (/^https?:\/\//i.test(t)) return t;
  const path = t.startsWith('/') ? t : `/${t}`;
  return `${apiBase()}${path}`;
}

/** 公开技能：直链；私有技能：受控下载 API（须 X-Api-Key 等，与 resolve 授权一致）。 */
export function resolveSkillArtifactTarget(
  resolved: ResourceResolveVO,
): { mode: 'open_tab'; url: string } | { mode: 'fetch_blob'; url: string } | null {
  const ep = resolved.endpoint?.trim();
  if (ep && /^https?:\/\//i.test(ep)) {
    return { mode: 'open_tab', url: ep };
  }
  const spec = resolved.spec as Record<string, unknown> | undefined;
  const api = spec?.artifactDownloadApi;
  if (typeof api === 'string' && api.trim()) {
    return { mode: 'fetch_blob', url: toAbsoluteUrl(api) };
  }
  if (resolved.resourceId) {
    return { mode: 'fetch_blob', url: toAbsoluteUrl(`/resource-center/resources/${resolved.resourceId}/skill-artifact`) };
  }
  return null;
}

function parseFilenameFromContentDisposition(cd: string | null): string | null {
  if (!cd) return null;
  const m = /filename\*=UTF-8''([^;\s]+)|filename="([^"]+)"|filename=([^;\s]+)/i.exec(cd);
  const raw = m?.[1] || m?.[2] || m?.[3];
  if (!raw) return null;
  try {
    return decodeURIComponent(raw.replace(/^"|"$/g, ''));
  } catch {
    return raw.replace(/^"|"$/g, '');
  }
}

/** GET 二进制制品并触发浏览器下载（不会写入网关 invoke 统计）。 */
export async function fetchSkillPackBlobDownload(
  url: string,
  apiKey: string,
  fallbackName: string,
): Promise<void> {
  const headers = { ...buildGatewayAuthHeaders({ apiKey }) };
  delete headers['Content-Type'];
  const res = await fetch(url, { method: 'GET', headers, credentials: 'include' });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(errText || `下载失败（HTTP ${res.status}）`);
  }
  const cd = res.headers.get('Content-Disposition');
  const fromHeader = parseFilenameFromContentDisposition(cd);
  const blob = await res.blob();
  const name = fromHeader || fallbackName;
  const objectUrl = URL.createObjectURL(blob);
  try {
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = name;
    a.rel = 'noopener';
    a.click();
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
