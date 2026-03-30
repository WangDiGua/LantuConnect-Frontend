/**
 * Hash 路由下，真正生效的是 `#` 后面的路径（如 `#/user/workspace`）。
 * 用户若在地址栏写成 `http://host/login#/user/workspace`，pathname 里的 `/login` 不参与 React Router 匹配，
 * 但会造成「看起来像登录页地址却进了工作台」的错觉。
 *
 * 在应用启动时把「多余的 pathname」收束到站点根路径，只保留 search + hash，避免歧义。
 */
export function normalizeHashRouterUrl(): void {
  if (typeof window === 'undefined') return;

  const u = new URL(window.location.href);
  const rawBase = import.meta.env.BASE_URL || '/';
  const base = rawBase.replace(/\/$/, '') || '';
  const path = u.pathname.replace(/\/$/, '') || '/';

  const rootPath = base === '' ? '/' : base;
  const isCanonicalPath = path === '/' || path === rootPath;

  if (isCanonicalPath) return;

  const hasMeaningfulHash = u.hash.length > 1;
  if (!hasMeaningfulHash) {
    u.hash = '#/';
  }

  u.pathname = rootPath === '/' ? '/' : `${rootPath}/`;

  window.history.replaceState(window.history.state, document.title, u.pathname + u.search + u.hash);
}
