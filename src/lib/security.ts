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

/** JWT/不透明令牌体积上限，防止异常大包拖垮页面或掩盖存储污染 */
export const MAX_TOKEN_STORAGE_CHARS = 16_384;

type TokenStorageOptions = {
  persist?: boolean;
};

function encodeToken(value: string): string {
  return TOKEN_PREFIX + btoa(encodeURIComponent(value));
}

function decodeToken(raw: string): string | null {
  if (raw.length > MAX_TOKEN_STORAGE_CHARS + TOKEN_PREFIX.length + 256) return null;
  if (!raw.startsWith(TOKEN_PREFIX)) {
    return raw.length > MAX_TOKEN_STORAGE_CHARS ? null : raw;
  }
  try {
    const decoded = decodeURIComponent(atob(raw.slice(TOKEN_PREFIX.length)));
    if (decoded.length > MAX_TOKEN_STORAGE_CHARS) return null;
    return decoded;
  } catch {
    return raw.length > MAX_TOKEN_STORAGE_CHARS ? null : raw;
  }
}

function readToken(storage: Storage, key: string): string | null {
  try {
    const raw = storage.getItem(key);
    return raw ? decodeToken(raw) : null;
  } catch {
    return null;
  }
}

export const tokenStorage = {
  set(key: string, value: string, options: TokenStorageOptions = {}) {
    if (value.length > MAX_TOKEN_STORAGE_CHARS) return;
    const target = options.persist === false ? sessionStorage : localStorage;
    const staleTarget = options.persist === false ? localStorage : sessionStorage;
    try {
      target.setItem(key, encodeToken(value));
      staleTarget.removeItem(key);
    } catch {
      try {
        target.setItem(key, value);
        staleTarget.removeItem(key);
      } catch {
        /* 容量超限等 */
      }
    }
  },

  get(key: string): string | null {
    return readToken(sessionStorage, key) ?? readToken(localStorage, key);
  },

  isPersistent(key: string): boolean {
    try {
      return localStorage.getItem(key) != null && sessionStorage.getItem(key) == null;
    } catch {
      return false;
    }
  },

  remove(key: string) {
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
    try {
      sessionStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  },
};

const MAX_CSRF_TOKEN_LEN = 128;

export function getCsrfToken(): string {
  let token = sessionStorage.getItem('csrf_token');
  if (!token || token.length > MAX_CSRF_TOKEN_LEN) {
    token = crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 15)}`;
    try {
      sessionStorage.setItem('csrf_token', token);
    } catch {
      /* private mode 等 */
    }
  }
  return token;
}

export function isValidUrl(url: string): boolean {
  try { new URL(url); return true; } catch { return false; }
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isValidPhone(phone: string): boolean {
  return /^1[3-9]\d{9}$/.test(phone);
}

export function maskSensitive(value: string, visibleChars = 4): string {
  if (value.length <= visibleChars * 2) return '****';
  return value.slice(0, visibleChars) + '****' + value.slice(-visibleChars);
}

/** 加密/JSON 持久化单键上限（字符），避免存储超限炸弹 */
const MAX_ENCRYPTED_STORAGE_JSON_CHARS = 512_000;

function safeJsonStringify(value: unknown): string | null {
  try {
    const s = JSON.stringify(value);
    if (s.length > MAX_ENCRYPTED_STORAGE_JSON_CHARS) return null;
    return s;
  } catch {
    return null;
  }
}

/**
 * 加密存储数据到localStorage
 * @param key 存储键名
 * @param value 要存储的值（可以是对象、数组等）
 */
export function encryptStorage(key: string, value: unknown): void {
  try {
    const jsonStr = safeJsonStringify(value);
    if (!jsonStr) return;
    const encoded = TOKEN_PREFIX + btoa(encodeURIComponent(jsonStr));
    localStorage.setItem(key, encoded);
  } catch (error) {
    // 如果加密失败，尝试直接存储（向后兼容）
    try {
      const jsonStr = safeJsonStringify(value);
      if (!jsonStr) return;
      localStorage.setItem(key, jsonStr);
    } catch {
      // 忽略存储超限错误
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
    if (raw.length > MAX_ENCRYPTED_STORAGE_JSON_CHARS + TOKEN_PREFIX.length + 10_000) return null;

    // 检查是否是加密格式
    if (raw.startsWith(TOKEN_PREFIX)) {
      try {
        const decoded = decodeURIComponent(atob(raw.slice(TOKEN_PREFIX.length)));
        if (decoded.length > MAX_ENCRYPTED_STORAGE_JSON_CHARS) return null;
        return JSON.parse(decoded) as T;
      } catch {
        // 如果解密失败，尝试直接解析（向后兼容）
        if (raw.length > MAX_ENCRYPTED_STORAGE_JSON_CHARS + TOKEN_PREFIX.length) return null;
        return JSON.parse(raw) as T;
      }
    }

    // 向后兼容：尝试直接解析
    if (raw.length > MAX_ENCRYPTED_STORAGE_JSON_CHARS) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}
