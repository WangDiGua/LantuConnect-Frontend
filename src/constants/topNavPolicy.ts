import type { LucideIcon } from 'lucide-react';
import type { ConsoleRole } from './consoleRoutes';
import type { NavSubGroup } from './navigation';
import type { ConsoleSidebarRow } from '../components/layout/ConsoleSidebar';

/** 应用端顶栏保留的一级侧栏 id（我的工作台 / 个人设置下沉到首页左栏） */
export const USER_TOP_NAV_SIDEBAR_IDS = ['hub', 'user-resource-assets', 'developer-portal'] as const;

export type UserTopNavSidebarId = (typeof USER_TOP_NAV_SIDEBAR_IDS)[number];

/** 首页 ExploreHub 左栏数据来源：与 sidebar id 一致，数据仍来自 getNavSubGroups + MainLayout 过滤 */
export const HUB_PERSONAL_RAIL_PARENT_IDS = ['workspace', 'user-settings'] as const;

export type HubPersonalRailRow = {
  subItemId: string;
  label: string;
  icon: LucideIcon;
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
  subtitle: string;
  avatarSeed: string;
  activeSidebar: string;
  activeSubItem: string;
  routeRole: ConsoleRole;
  onSubItemClick: (subItemId: string, parentSidebarId: string, domain: ConsoleRole) => void;
  onProfileClick: () => void;
};

/**
 * 将已与 MainLayout `filteredSubGroupsForSidebarId` 对齐后的分组展开为首页左栏区块（每个 NavSubGroup 一节）。
 * 勿手写第二份菜单：调用方传入的 `filteredGroups` 须与侧栏/顶栏下拉一致。
 */
export function buildHubPersonalNavModel(
  parentSidebarId: string,
  domain: ConsoleRole,
  filteredGroups: NavSubGroup[],
): HubPersonalRailSection[] {
  return filteredGroups.map((g) => ({
    heading: g.title,
    parentSidebarId,
    domain,
    rows: g.items.map((item) => ({
      subItemId: item.id,
      label: item.label,
      icon: item.icon,
    })),
  }));
}

const USER_TOP_NAV_SET = new Set<string>(USER_TOP_NAV_SIDEBAR_IDS);

/**
 * 顶栏横向：用户域仅保留 allowlist 内一级项；管理域项全保留；分区标题仅在后面仍有输出项时写入。
 */
export function filterSidebarRowsForUserTopNav(fullRows: ConsoleSidebarRow[]): ConsoleSidebarRow[] {
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
      flushSection();
      out.push(row);
      continue;
    }
    if (USER_TOP_NAV_SET.has(row.id)) {
      flushSection();
      out.push(row);
    } else {
      pendingSection = null;
    }
  }
  return out;
}
