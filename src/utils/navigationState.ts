import { encryptStorage, decryptStorage } from '../lib/security';
import { defaultPath, type ConsoleRole } from '../constants/consoleRoutes';

export const NAV_STORAGE_KEY = 'lantu-main-nav';

export interface PersistedNavState {
  lastPath: string;
}

const DEFAULTS: PersistedNavState = {
  lastPath: '/admin/dashboard',
};

export function readPersistedNavState(): PersistedNavState {
  try {
    const p = decryptStorage<Partial<PersistedNavState>>(NAV_STORAGE_KEY);
    if (!p || typeof p.lastPath !== 'string') return { ...DEFAULTS };
    return { lastPath: p.lastPath };
  } catch {
    return { ...DEFAULTS };
  }
}

export function writePersistedNavState(state: PersistedNavState): void {
  try {
    encryptStorage(NAV_STORAGE_KEY, state);
  } catch {
    /* ignore quota */
  }
}
