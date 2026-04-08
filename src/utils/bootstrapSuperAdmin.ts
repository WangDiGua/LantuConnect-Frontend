/**
 * 与后端约定：登录用户名为 admin 的内置超级管理员，管理端禁止勾选、编辑、启停、删除及批量变更。
 */
export function isBootstrapSuperAdminUsername(username: string | null | undefined): boolean {
  return String(username ?? '').trim().toLowerCase() === 'admin';
}
