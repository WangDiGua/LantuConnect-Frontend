export function isSafeHttpOrHttpsUrl(url: string): boolean {
  try {
    const u = new URL(url.trim(), typeof window !== 'undefined' ? window.location.origin : 'https://localhost');
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * 仅允许 http(s) 的外链新窗口打开，统一附带 noopener/noreferrer。
 */
export function safeOpenHttpUrl(url: string): Window | null {
  const trimmed = url.trim();
  if (!trimmed) return null;
  try {
    const u = new URL(trimmed, typeof window !== 'undefined' ? window.location.origin : 'https://localhost');
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    return window.open(u.toString(), '_blank', 'noopener,noreferrer');
  } catch {
    return null;
  }
}
