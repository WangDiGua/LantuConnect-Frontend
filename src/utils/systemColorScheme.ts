/** 与操作系统浅色/深色偏好同步（Logo、主题「跟随系统」等共用） */

export const COLOR_SCHEME_QUERY = '(prefers-color-scheme: dark)';

export function subscribeColorScheme(onStoreChange: () => void) {
  const mql = window.matchMedia(COLOR_SCHEME_QUERY);
  mql.addEventListener('change', onStoreChange);
  return () => mql.removeEventListener('change', onStoreChange);
}

export function getColorSchemeSnapshot() {
  return window.matchMedia(COLOR_SCHEME_QUERY).matches;
}

export function getColorSchemeServerSnapshot() {
  return false;
}
