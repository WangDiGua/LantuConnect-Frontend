import type { ComponentType } from 'react';
import type { ConsoleRole } from './consoleRoutes';

/** 侧栏图标组件（顶栏 / 菜单搜索等与 Lucide 一致） */
export type ConsoleNavIcon = ComponentType<{
  size?: number;
  strokeWidth?: number;
  className?: string;
}>;

/**
 * 控制台导航行：分区标题 + 一级菜单项（含路由域）。
 * MainLayout：`fullSidebarRows` 供左轨/侧栏抽屉；顶栏横向见 `topNavSidebarRows`；全局菜单搜索常用 `sidebarSearchRows`（可含顶栏独占项）。
 */
export type ConsoleSidebarRow =
  | { kind: 'section'; label: string }
  | { kind: 'item'; id: string; icon: ConsoleNavIcon; label: string; domain: ConsoleRole };
