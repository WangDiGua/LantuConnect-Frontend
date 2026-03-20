const HTML_ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
};

export function escapeHtml(str: string): string {
  return str.replace(/[&<>"']/g, (ch) => HTML_ESCAPE_MAP[ch] || ch);
}

export function sanitizeInput(input: string): string {
  return input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '').trim();
}

const TOKEN_PREFIX = 'lc_enc_';

export const tokenStorage = {
  set(key: string, value: string) {
    try {
      localStorage.setItem(key, TOKEN_PREFIX + btoa(encodeURIComponent(value)));
    } catch {
      localStorage.setItem(key, value);
    }
  },

  get(key: string): string | null {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    if (raw.startsWith(TOKEN_PREFIX)) {
      try {
        return decodeURIComponent(atob(raw.slice(TOKEN_PREFIX.length)));
      } catch {
        return raw;
      }
    }
    return raw;
  },

  remove(key: string) {
    localStorage.removeItem(key);
  },
};

export function maskSensitive(value: string, visibleChars = 4): string {
  if (value.length <= visibleChars * 2) return '****';
  return value.slice(0, visibleChars) + '****' + value.slice(-visibleChars);
}
