// 用户（映射 t_user，字段名不可改）

export interface User {
  userId: number;
  username: string;
  realName: string;
  sex: number;
  schoolId: number;
  menuId: number;
  major: string | null;
  class: string | null;
  role: number;
  mobile: string | null;
  mail: string | null;
  headImage: string | null;
  zw: string | null;
  zc: string | null;
  birthday: string | null;
  deleted: number;
  lastLogintime: string | null;
  createTime: string;
  platformRoles: PlatformRole[];
}

// 组织架构（映射 t_menu，树形）
export interface OrgNode {
  menuId: number;
  menuName: string;
  menuParentId: number;
  menuLevel: number;
  ifXy: number;
  children?: OrgNode[];
}

// 平台角色
export type RoleCode = 'platform_admin' | 'dept_admin' | 'developer' | 'consumer' | 'user';

export interface PlatformRole {
  id: number;
  roleCode: RoleCode;
  roleName: string;
  description: string;
  permissions: string[];
}

export interface UserRoleAssignment {
  userId: number;
  roleId: number;
}
