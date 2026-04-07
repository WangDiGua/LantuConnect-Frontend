import { buildPath } from '../constants/consoleRoutes';
import type { SkillExternalCatalogItemVO } from '../types/dto/resource-center';

/**
 * 路由用 v1 前缀：itemKey 本身可能含 `#`、`/`、`%` 或与路径段冲突的字符；
 * 使用 UTF-8 → Base64URL（无 `+` `/` padding）后仅含 [A-Za-z0-9_-]，避免 fragment、额外路径段与百分号二次编码问题。
 * 旧链接仍支持：`encodeURIComponent(itemKey)` 单段（无前缀时走 decodeURIComponent 兼容）。
 */
const SKILL_EXT_ROUTE_KEY_V1 = '__skext_v1__';

function utf8ToBase64Url(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]!);
  const b64 = btoa(bin);
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToUtf8(b64url: string): string {
  let b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
  const pad = b64.length % 4;
  if (pad) b64 += '='.repeat(4 - pad);
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i) & 0xff;
  return new TextDecoder().decode(bytes);
}

/** 写入路径段（单一路由 param，勿再套 encodeURIComponent） */
export function encodeSkillExternalItemKeyForRoute(key: string): string {
  const k = key.trim();
  if (!k) return '';
  return `${SKILL_EXT_ROUTE_KEY_V1}${utf8ToBase64Url(k)}`;
}

/** 与 {@link encodeSkillExternalItemKeyForRoute} 对称；兼容旧版 URI 组件编码 */
export function decodeSkillExternalItemKeyFromRoute(segment: string): string {
  const s = segment.trim();
  if (!s) return '';
  if (s.startsWith(SKILL_EXT_ROUTE_KEY_V1)) {
    try {
      return base64UrlToUtf8(s.slice(SKILL_EXT_ROUTE_KEY_V1.length));
    } catch {
      return '';
    }
  }
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

/** 稳定路由键：优先后端 itemKey，否则回退展示 id */
export function skillExternalCatalogRowKey(item: Pick<SkillExternalCatalogItemVO, 'itemKey' | 'id'>): string {
  const k = item.itemKey?.trim() || item.id?.trim();
  return k || '';
}

export function buildSkillExternalMarketDetailPath(
  item: Pick<SkillExternalCatalogItemVO, 'itemKey' | 'id'>,
): string {
  const k = skillExternalCatalogRowKey(item);
  const seg = encodeSkillExternalItemKeyForRoute(k);
  return buildPath('user', 'skill-external-market', seg);
}
