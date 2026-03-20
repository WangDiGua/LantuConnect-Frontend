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

const STORAGE_PREFIX = 'lc_enc_';

/**
 * 加密存储数据到localStorage
 * @param key 存储键名
 * @param value 要存储的值（可以是对象、数组等）
 */
export function encryptStorage(key: string, value: unknown): void {
  try {
    const jsonStr = JSON.stringify(value);
    const encoded = TOKEN_PREFIX + btoa(encodeURIComponent(jsonStr));
    localStorage.setItem(key, encoded);
  } catch (error) {
    // 如果加密失败，尝试直接存储（向后兼容）
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // 忽略存储配额错误
    }
  }
}

/**
 * 从localStorage解密读取数据
 * @param key 存储键名
 * @returns 解密后的值，如果不存在或解析失败则返回null
 */
export function decryptStorage<T = unknown>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    
    // 检查是否是加密格式
    if (raw.startsWith(TOKEN_PREFIX)) {
      try {
        const decoded = decodeURIComponent(atob(raw.slice(TOKEN_PREFIX.length)));
        return JSON.parse(decoded) as T;
      } catch {
        // 如果解密失败，尝试直接解析（向后兼容）
        return JSON.parse(raw) as T;
      }
    }
    
    // 向后兼容：尝试直接解析
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}
