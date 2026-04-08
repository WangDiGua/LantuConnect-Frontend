import { encryptStorage, decryptStorage } from '../lib/security';
import { CONSOLE_PATH_PREFIX, defaultPath } from '../constants/consoleRoutes';

export const NAV_STORAGE_KEY = 'lantu-main-nav';

export interface PersistedNavState {
  lastPath: string;
}

const DEFAULTS: PersistedNavState = {
  lastPath: defaultPath(),
};

const MAX_LAST_PATH_LEN = 2048;

/** 将旧版 `#/user/*`、`#/admin/*` 书签迁移为统一 `#/c/*` */
export function migrateLegacyConsolePath(path: string): string {
  const qIdx = path.indexOf('?');
  const pathOnly = qIdx >= 0 ? path.slice(0, qIdx) : path;
  const tail = qIdx >= 0 ? path.slice(qIdx) : '';
  if (pathOnly === '/user' || pathOnly === '/user/') return `/${CONSOLE_PATH_PREFIX}/hub${tail}`;
  if (pathOnly === '/admin' || pathOnly === '/admin/') return `/${CONSOLE_PATH_PREFIX}/dashboard${tail}`;
  if (pathOnly.startsWith('/user/')) return `/${CONSOLE_PATH_PREFIX}/${pathOnly.slice('/user/'.length)}${tail}`;
  if (pathOnly.startsWith('/admin/')) return `/${CONSOLE_PATH_PREFIX}/${pathOnly.slice('/admin/'.length)}${tail}`;
  return path;
}

/** 仅允许 Hash 路由路径形态，拒绝注入 javascript: 或其它协议 */
export function sanitizeConsoleLastPath(raw: string): string | null {
  const t = raw.trim();
  if (!t || t.length > MAX_LAST_PATH_LEN) return null;
  if (!t.startsWith('/')) return null;
  if (/^(https?|javascript|data|vbscript):/i.test(t)) return null;
  if (t.includes('\0') || t.includes('\r') || t.includes('\n')) return null;
  return t;
}

export function readPersistedNavState(): PersistedNavState {
  try {
    const p = decryptStorage<Partial<PersistedNavState>>(NAV_STORAGE_KEY);
    if (!p || typeof p.lastPath !== 'string') return { ...DEFAULTS };
    const path = sanitizeConsoleLastPath(p.lastPath);
    if (!path) return { ...DEFAULTS };
    return { lastPath: migrateLegacyConsolePath(path) };
  } catch {
    return { ...DEFAULTS };
  }
}

export function writePersistedNavState(state: PersistedNavState): void {
  try {
    const path = sanitizeConsoleLastPath(state.lastPath);
    if (!path) return;
    encryptStorage(NAV_STORAGE_KEY, { lastPath: path });
  } catch {
    /* ignore quota */
  }
}
