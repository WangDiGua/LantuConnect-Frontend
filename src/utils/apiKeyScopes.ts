/**
 * 个人/用户侧创建 API Key 时的默认 scopes。
 * 若 POST body 不传或传空数组，部分后端会持久化为 []，网关在校验 catalog/resolve/invoke 时报 scope 不足（403）。
 * 与管理员入口 `POST /user-mgmt/api-keys` 常用 `['*']` 对齐。参见 docs/ai-handoff-docs/resource-registration-authorization-invocation-guide.md §7。
 */
export const DEFAULT_USER_API_KEY_SCOPES: readonly string[] = ['*'];

/**
 * 是否具备「目录 → 解析 → 调用」网关链路所需的 Key scope（与文档中 catalog/resolve/invoke 对应）。
 * 支持 `*`、`invoke`、`invoke:*` 等形式。
 */
export function apiKeyScopesAllowGatewayFlow(scopes: string[] | undefined | null): boolean {
  const list = Array.isArray(scopes) ? scopes : [];
  if (list.length === 0) return false;
  if (list.includes('*')) return true;
  const has = (verb: string) =>
    list.some((x) => {
      const t = String(x).toLowerCase();
      return t === verb || t === `${verb}:*` || t.startsWith(`${verb}:`);
    });
  return has('catalog') && has('resolve') && has('invoke');
}
