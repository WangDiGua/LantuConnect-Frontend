/**
 * Hash 路由下，真正生效的是 `#` 后面的路径（如 `#/user/workspace`）。
 * 用户若在地址栏写成 `http://host/login#/user/workspace`，pathname 里的 `/login` 不参与 React Router 匹配，
 * 但会造成「看起来像登录页地址却进了工作台」的错觉。
 *
 * 子路径部署（Vite `base` 非 `/`）时：把地址栏 pathname 收束到与 `BASE_URL` 一致（便于分享链接、避免多余 path），
 * 与路由渲染无关（HashRouter 不用 Vite base 作 basename）。
 */
export function normalizeHashRouterUrl(): void {
  if (typeof window === 'undefined') return;

  const u = new URL(window.location.href);
  const rawBase = import.meta.env.BASE_URL || '/';
  /** 无前缀根部署时为 ''，否则为 `/factory/.../nexus`（不含末尾 /） */
  const baseTrim = rawBase === '/' ? '' : rawBase.replace(/\/$/, '');
  const pathTrim = u.pathname.replace(/\/$/, '') || '/';

  if (!baseTrim) {
    if (pathTrim === '/') return;
    const hasMeaningfulHash = u.hash.length > 1;
    if (!hasMeaningfulHash) u.hash = '#/';
    u.pathname = '/';
    window.history.replaceState(window.history.state, document.title, u.pathname + u.search + u.hash);
    return;
  }

  const underBase = pathTrim === baseTrim || pathTrim.startsWith(`${baseTrim}/`);
  if (underBase && pathTrim === baseTrim) return;

  if (!underBase || pathTrim !== baseTrim) {
    if (u.hash.length <= 1) u.hash = '#/';
    u.pathname = `${baseTrim}/`;
    window.history.replaceState(window.history.state, document.title, u.pathname + u.search + u.hash);
  }
}
