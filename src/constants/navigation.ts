import {
  LayoutDashboard,
  LayoutGrid,
  Users,
  Activity,
  Settings,
  Wrench,
  Bot,
  Zap,
  Package,
  FileText,
  Search,
  Shield,
  Sliders,
  History,
  Fingerprint,
  BookOpen,
  Database,
  LineChart,
  Server,
  AlertTriangle,
  BarChart3,
  Building2,
  Bell,
  Lock,
  Eye,
  Sparkles,
  FolderOpen,
  Share2,
  CreditCard,
  Receipt,
  ShieldCheck,
  Puzzle,
  Globe2,
  Rocket,
  TrendingUp,
  Clock,
  AppWindow,
  Boxes,
  Tag,
  Heart,
  ClipboardCheck,
  Code2,
  Terminal,
  Download,
  Compass,
  Braces,
  ScrollText,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/** 侧栏二级分组；requiresPublish 为 true 时无发布权限的用户不显示整组 */
export interface NavSubGroup {
  title: string;
  requiresPublish?: boolean;
  items: Array<{ id: string; icon: LucideIcon; label: string; tag?: string }>;
}

/**
 * 工作台总览页内可复用的导航元数据（侧栏树与部分页面「发现与成效」区）。
 * `page` 为控制台 page slug；`marketTab` 有值时跳转资源市场深链。
 */
export interface UserWorkbenchNavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  page?: string;
  /** 与 buildUserResourceMarketUrl 一致 */
  marketTab?: string;
  perm?: string;
  anyPerm?: readonly string[];
}

/** 图二核心六项：发布总览 / 使用记录 / 用量统计 / 快速入口 / 最近使用 / 我的收藏 */
export const USER_WORKBENCH_CORE_NAV: UserWorkbenchNavItem[] = [
  {
    id: 'my-agents-pub',
    label: '发布总览',
    icon: Rocket,
    page: 'my-agents-pub',
    anyPerm: ['agent:create', 'skill:create', 'mcp:create', 'app:create', 'dataset:create'],
  },
  { id: 'usage-records', label: '使用记录', icon: History, page: 'usage-records' },
  { id: 'usage-stats', label: '用量统计', icon: BarChart3, page: 'usage-stats' },
  { id: 'quick-access', label: '快速入口', icon: Zap, page: 'quick-access' },
  { id: 'recent-use', label: '最近使用', icon: Clock, page: 'recent-use' },
  { id: 'my-favorites', label: '我的收藏', icon: Heart, page: 'my-favorites' },
];

/** 工作台页「发现与成效」补充入口（非侧栏收束范围） */
export const USER_WORKBENCH_EXPLORE_NAV: UserWorkbenchNavItem[] = [
  { id: 'explore-agent', label: '智能体市场', icon: Bot, page: 'resource-market', marketTab: 'agent' },
  { id: 'explore-skill', label: '技能市场', icon: Zap, page: 'resource-market', marketTab: 'skill' },
  { id: 'dev-stats', label: '资源成效统计', icon: TrendingUp, page: 'developer-statistics', perm: 'developer:portal' },
];

/** 个人工作台下独立路由子页；用于 `pageToSubItem` 高亮对应侧栏子项 */
export const USER_WORKBENCH_SATELLITE_PAGES = new Set<string>(
  USER_WORKBENCH_CORE_NAV.map((x) => x.page).filter((p): p is string => Boolean(p)),
);

// ==================== 管理员菜单（接入平台管理视角）====================

export const ADMIN_SIDEBAR_ITEMS = [
  { id: 'overview', icon: LayoutDashboard, label: '运营总览' },
  { id: 'admin-resource-ops', icon: Boxes, label: '资源与运营' },
  { id: 'user-management', icon: Users, label: '用户与权限' },
  { id: 'monitoring', icon: Activity, label: '监控运维' },
  { id: 'system-config', icon: Settings, label: '平台配置' },
];

// ==================== 用户菜单（师生使用视角）====================

export const USER_SIDEBAR_ITEMS = [
  { id: 'hub', icon: Compass, label: '探索发现' },
  { id: 'skills-center', icon: Braces, label: '技能广场' },
  { id: 'mcp-center', icon: Puzzle, label: '接入广场' },
  { id: 'dataset-center', icon: Database, label: '数据集市' },
  { id: 'agents-center', icon: Bot, label: '智能广场' },
  { id: 'apps-center', icon: AppWindow, label: '应用广场' },
  { id: 'workspace', icon: LayoutGrid, label: '个人工作台' },
  { id: 'developer-portal', icon: Code2, label: '开发者中心' },
];

export const SIDEBAR_ITEMS = ADMIN_SIDEBAR_ITEMS;
export const DASHBOARD_GROUPS = [];

// ==================== 管理员子菜单 ====================

export const ADMIN_OVERVIEW_GROUPS: NavSubGroup[] = [
  {
    title: '总览',
    items: [{ id: 'overview', icon: LayoutDashboard, label: '运营总览' }],
  },
];

export const ADMIN_RESOURCE_MANAGEMENT_GROUPS: NavSubGroup[] = [
  {
    title: '资源目录',
    items: [{ id: 'resource-catalog', icon: Boxes, label: '统一资源中心', tag: '审核' }],
  },
  {
    title: '运行诊断',
    items: [{ id: 'agent-diagnostics', icon: LineChart, label: '运行诊断' }],
  },
];

// Legacy aliases for any external references
export const ADMIN_AGENT_MANAGEMENT_GROUPS = ADMIN_RESOURCE_MANAGEMENT_GROUPS;
export const ADMIN_SKILL_MANAGEMENT_GROUPS = ADMIN_RESOURCE_MANAGEMENT_GROUPS;
export const ADMIN_MCP_MANAGEMENT_GROUPS = ADMIN_RESOURCE_MANAGEMENT_GROUPS;
export const ADMIN_APP_MANAGEMENT_GROUPS = ADMIN_RESOURCE_MANAGEMENT_GROUPS;
export const ADMIN_DATASET_MANAGEMENT_GROUPS = ADMIN_RESOURCE_MANAGEMENT_GROUPS;

export const ADMIN_AUDIT_CENTER_GROUPS: NavSubGroup[] = [
  {
    title: '待审核资源',
    items: [
      { id: 'resource-audit', icon: ClipboardCheck, label: '资源审核' },
    ],
  },
];

export const ADMIN_PROVIDER_MANAGEMENT_GROUPS: NavSubGroup[] = [
  {
    title: 'Provider',
    items: [{ id: 'provider-list', icon: Server, label: 'Provider' }],
  },
];

/** 管理端合并项：资源目录与运维 → 审核 → Provider */
export const ADMIN_RESOURCE_OPS_GROUPS: NavSubGroup[] = [
  ...ADMIN_RESOURCE_MANAGEMENT_GROUPS,
  ...ADMIN_AUDIT_CENTER_GROUPS,
  ...ADMIN_PROVIDER_MANAGEMENT_GROUPS,
];

export const ADMIN_USER_MANAGEMENT_GROUPS: NavSubGroup[] = [
  {
    title: '治理',
    items: [{ id: 'user-hub', icon: Users, label: '用户与权限' }],
  },
];

export const ADMIN_MONITORING_GROUPS: NavSubGroup[] = [
  {
    title: '运维',
    items: [{ id: 'monitoring-hub', icon: Activity, label: '监控运维台' }],
  },
];

export const ADMIN_SYSTEM_CONFIG_GROUPS: NavSubGroup[] = [
  {
    title: '平台',
    items: [{ id: 'config-hub', icon: Settings, label: '平台配置' }],
  },
];

export const ADMIN_DEVELOPER_PORTAL_GROUPS: NavSubGroup[] = [
  {
    title: '文档',
    items: [
      { id: 'api-docs', icon: FileText, label: '接入指南' },
      { id: 'sdk-download', icon: Download, label: 'SDK 下载' },
      { id: 'api-playground', icon: Terminal, label: 'API Playground' },
      { id: 'mcp-integration', icon: Puzzle, label: 'MCP 对外集成' },
    ],
  },
  {
    title: '统计',
    items: [
      { id: 'developer-statistics', icon: BarChart3, label: '开发者统计' },
    ],
  },
];

// ==================== 用户子菜单（树状：主菜单 + 二级分组）====================

/** 探索发现：子级入口（顶栏一级仍为「探索发现」） */
export const USER_HUB_GROUPS: NavSubGroup[] = [
  {
    title: '首页入口',
    items: [{ id: 'hub', icon: Compass, label: '探索首页' }],
  },
];

export const USER_SKILLS_CENTER_GROUPS: NavSubGroup[] = [
  { title: '技能资源', items: [{ id: 'skills-center', icon: Braces, label: '技能广场' }] },
];

export const USER_MCP_CENTER_GROUPS: NavSubGroup[] = [
  { title: '互联资源', items: [{ id: 'mcp-center', icon: Puzzle, label: '接入广场' }] },
];

export const USER_DATASET_CENTER_GROUPS: NavSubGroup[] = [
  { title: '数据资源', items: [{ id: 'dataset-center', icon: Database, label: '数据集市' }] },
];

export const USER_AGENTS_CENTER_GROUPS: NavSubGroup[] = [
  { title: '智能资源', items: [{ id: 'agents-center', icon: Bot, label: '智能广场' }] },
];

export const USER_APPS_CENTER_GROUPS: NavSubGroup[] = [
  { title: '应用资源', items: [{ id: 'apps-center', icon: AppWindow, label: '应用广场' }] },
];

/** 侧栏「个人工作台」：六项能力恢复为树状子菜单；显隐由权限与 `requiresPublish` 控制 */
export const USER_MY_CONSOLE_GROUPS: NavSubGroup[] = [
  {
    title: '常用总览',
    items: [
      { id: 'overview', icon: LayoutGrid, label: '工作台总览' },
      { id: 'quick-access', icon: Zap, label: '快速入口' },
    ],
  },
  {
    title: '使用分析',
    items: [
      { id: 'usage-records', icon: History, label: '使用记录' },
      { id: 'recent-use', icon: Clock, label: '最近使用' },
      { id: 'usage-stats', icon: BarChart3, label: '用量统计' },
    ],
  },
  {
    title: '个人收藏',
    items: [{ id: 'my-favorites', icon: Heart, label: '我的收藏' }],
  },
  {
    title: '我的发布',
    requiresPublish: true,
    items: [
      { id: 'my-agents-pub', icon: Rocket, label: '发布总览' },
      { id: 'resource-center', icon: Boxes, label: '资源中心' },
    ],
  },
  {
    title: '入驻服务',
    items: [
      { id: 'developer-onboarding', icon: Rocket, label: '开发者入驻' },
      { id: 'developer-applications', icon: ClipboardCheck, label: '入驻审批' },
    ],
  },
];

/** @deprecated 等同于 {@link USER_MY_CONSOLE_GROUPS}，保留旧名导出 */
export const USER_WORKSPACE_GROUPS: NavSubGroup[] = USER_MY_CONSOLE_GROUPS;

/** @deprecated 结构已并入 {@link USER_MY_CONSOLE_GROUPS} */
export const USER_MY_SPACE_GROUPS: NavSubGroup[] = [];

/** @deprecated 结构已并入 {@link USER_MY_CONSOLE_GROUPS} */
export const USER_MY_PUBLISH_GROUPS: NavSubGroup[] = [];

/** @deprecated 等同于 {@link USER_MY_CONSOLE_GROUPS} */
export const USER_RESOURCE_ASSETS_GROUPS: NavSubGroup[] = USER_MY_CONSOLE_GROUPS;

// ==================== 子菜单分组路由 ====================

export function getNavSubGroups(sidebarId: string, isAdminRole: boolean): NavSubGroup[] {
  if (isAdminRole) {
    switch (sidebarId) {
      case 'overview':
        return ADMIN_OVERVIEW_GROUPS;
      case 'admin-resource-ops':
        return ADMIN_RESOURCE_OPS_GROUPS;
      case 'user-management':
        return ADMIN_USER_MANAGEMENT_GROUPS;
      case 'monitoring':
        return ADMIN_MONITORING_GROUPS;
      case 'system-config':
        return ADMIN_SYSTEM_CONFIG_GROUPS;
      default:
        return [];
    }
  }
  switch (sidebarId) {
    case 'hub':
      return USER_HUB_GROUPS;
    case 'skills-center':
      return USER_SKILLS_CENTER_GROUPS;
    case 'mcp-center':
      return USER_MCP_CENTER_GROUPS;
    case 'dataset-center':
      return USER_DATASET_CENTER_GROUPS;
    case 'agents-center':
      return USER_AGENTS_CENTER_GROUPS;
    case 'apps-center':
      return USER_APPS_CENTER_GROUPS;
    case 'developer-portal':
      return ADMIN_DEVELOPER_PORTAL_GROUPS;
    case 'workspace':
      return USER_MY_CONSOLE_GROUPS;
    default:
      return [];
  }
}

// 兼容导出
export const AGENT_WORKSPACE_SUBITEM_ID = 'agent-list';
export const TOOL_SQUARE_GROUPS = ADMIN_RESOURCE_MANAGEMENT_GROUPS;
export const AGENT_MANAGEMENT_GROUPS = ADMIN_RESOURCE_MANAGEMENT_GROUPS;
export const MONITORING_GROUPS = ADMIN_MONITORING_GROUPS;
export const SYSTEM_CONFIG_GROUPS = ADMIN_SYSTEM_CONFIG_GROUPS;
export const USER_MANAGEMENT_GROUPS = ADMIN_USER_MANAGEMENT_GROUPS;
export const MODEL_SERVICE_GROUPS = [] as any[];
