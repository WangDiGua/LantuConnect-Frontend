import type { LucideIcon } from 'lucide-react';
import type { ConsoleRole } from './consoleRoutes';
import type { NavSubGroup } from './navigation';
import type { ConsoleSidebarRow } from './consoleNavModel';

/** 应用端顶栏保留的一级侧栏 id（工作台等入口见探索首页左侧树与侧栏抽屉） */
export const USER_TOP_NAV_SIDEBAR_IDS = [
  'hub',
  'agents-center',
  'mcp-center',
  'skills-center',
  'dataset-center',
  'apps-center',
] as const;

export type UserTopNavSidebarId = (typeof USER_TOP_NAV_SIDEBAR_IDS)[number];

/** 顶栏除「探索发现」外的五类资源入口：仅主内容区，不展示独立个人左轨 */
export const USER_TOP_NAV_NO_RAIL_SIDEBAR_IDS = USER_TOP_NAV_SIDEBAR_IDS.filter(
  (id): id is Exclude<UserTopNavSidebarId, 'hub'> => id !== 'hub',
);

export const USER_TOP_NAV_NO_RAIL_SIDEBAR_ID_SET = new Set<string>(USER_TOP_NAV_NO_RAIL_SIDEBAR_IDS);

/** 顶栏横向展示的六类入口 id（含「探索发现」） */
export const USER_TOP_NAV_SIDEBAR_ID_SET = new Set<string>(USER_TOP_NAV_SIDEBAR_IDS);

/**
 * 用户壳（consoleRole=user）顶栏：MainLayout 对 filterSidebarRowsForSlimTopNav 始终传入 omitAdminPrimary=true，
 * 横向不出现「平台管理」一级；总览等仍在侧栏抽屉与全局搜索（全量行）可达。
 */

/**
 * 首页 / 移动抽屉左轨：仅放「探索发现」「个人工作台」「开发者中心」。
 * 五类资源广场（技能/MCP/数据/智能体/应用）**只在顶栏**，不在侧栏重复列出。
 */
export const HUB_PERSONAL_RAIL_PARENT_IDS = [
  'hub',
  'workspace',
  'developer-portal',
] as const;

/**
 * 平台管理一级（与 ADMIN_SIDEBAR_ITEMS.id 一致；实际渲染顺序以 MainLayout 权限过滤后的 adminSidebarItems 为准）
 */
export const HUB_ADMIN_RAIL_PARENT_IDS = [
  'overview',
  'admin-workspace',
  'user-management',
  'monitoring',
  'system-config',
  'developer-portal',
] as const;

export type HubPersonalRailRow = {
  subItemId: string;
  label: string;
  icon: LucideIcon;
  badgeCount?: number;
};

export type HubPersonalRailSection = {
  heading: string;
  parentSidebarId: string;
  domain: ConsoleRole;
  rows: HubPersonalRailRow[];
};

/** 探索首页左侧个人轨（由 MainLayout 注入 ExploreHub） */
export type ExploreHubRailConfig = {
  sections: HubPersonalRailSection[];
  displayName: string;
  /** 平台角色展示名（顶栏 PLATFORM_ROLE_LABELS 一致） */
  roleLabel: string;
  avatarSeed: string;
  activeSidebar: string;
  activeSubItem: string;
  routeRole: ConsoleRole;
  onSubItemClick: (subItemId: string, parentSidebarId: string, domain: ConsoleRole) => void;
};

/**
 * 将已与 MainLayout `filteredSubGroupsForSidebarId` 对齐后的分组展开为首页左栏数据（按 NavSubGroup 分节；HubPersonalRail 内扁平渲染为单层列表）。
 * 勿手写第二份菜单：调用方传入的 `filteredGroups` 须与侧栏/顶栏下拉一致。
 */
export function buildHubPersonalNavModel(
  parentSidebarId: string,
  domain: ConsoleRole,
  filteredGroups: NavSubGroup[],
  badgeCounts?: Record<string, number>,
): HubPersonalRailSection[] {
  return filteredGroups.map((g) => ({
    heading: g.title,
    parentSidebarId,
    domain,
    rows: g.items.map((item) => ({
      subItemId: item.id,
      label: item.label,
      icon: item.icon,
      badgeCount: badgeCounts?.[item.id] ?? 0,
    })),
  }));
}

export type SlimTopNavOptions = {
  /**
   * 为 true 时不输出管理域一级项（用于探索首页顶栏瘦身；抽屉与搜索仍用全量行）
   */
  omitAdminPrimary?: boolean;
};

/**
 * 应用壳顶栏横向：用户域仅保留 allowlist 内一级项。
 * `omitAdminPrimary` 为 true 时跳过管理域一级（与探索首页左轨下沉管理目录配合）。
 */
export function filterSidebarRowsForSlimTopNav(fullRows: ConsoleSidebarRow[], options?: SlimTopNavOptions): ConsoleSidebarRow[] {
  const omitAdminPrimary = options?.omitAdminPrimary ?? false;
  const out: ConsoleSidebarRow[] = [];
  let pendingSection: Extract<ConsoleSidebarRow, { kind: 'section' }> | null = null;

  const flushSection = () => {
    if (pendingSection) {
      out.push(pendingSection);
      pendingSection = null;
    }
  };

  for (const row of fullRows) {
    if (row.kind === 'section') {
      pendingSection = row;
      continue;
    }
    if (row.domain === 'admin') {
      if (omitAdminPrimary) {
        pendingSection = null;
        continue;
      }
      flushSection();
      out.push(row);
      continue;
    }
    if (USER_TOP_NAV_SIDEBAR_ID_SET.has(row.id)) {
      flushSection();
      out.push(row);
    } else {
      pendingSection = null;
    }
  }
  return out;
}

/** @deprecated 使用 {@link filterSidebarRowsForSlimTopNav} */
export function filterSidebarRowsForUserTopNav(fullRows: ConsoleSidebarRow[]): ConsoleSidebarRow[] {
  return filterSidebarRowsForSlimTopNav(fullRows);
}
