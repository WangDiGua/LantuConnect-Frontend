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
 * 数据源唯一来源：MainLayout `fullSidebarRows`；顶栏筛选见 {@link filterSidebarRowsForSlimTopNav}。
 */
export type ConsoleSidebarRow =
  | { kind: 'section'; label: string }
  | { kind: 'item'; id: string; icon: ConsoleNavIcon; label: string; domain: ConsoleRole };
