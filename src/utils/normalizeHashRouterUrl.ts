/**
 * Hash 路由下，真正生效的是 `#` 后面的路径（如 `#/user/workspace`）。
 * 用户若在地址栏写成 `http://host/login#/user/workspace`，pathname 里的 `/login` 不参与 React Router 匹配，
 * 但会造成「看起来像登录页地址却进了工作台」的错觉。
 *
 * 子路径部署（Vite `base` 非 `/`）时：React Router 的 `basename` 必须与当前 `location.pathname` 前缀一致，
 * 否则会报 “Router is not able to match the URL "/"”。访问根路径 `/` 时需收束到 `basename/`。
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
