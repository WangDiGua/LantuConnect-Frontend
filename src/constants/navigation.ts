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
  AppWindow,
  Boxes,
  Tag,
  Heart,
  ClipboardCheck,
  Code2,
  Terminal,
  User,
  KeyRound,
  Download,
  Compass,
  Braces,
  ScrollText,
  HeartPulse,
  GitBranch,
  Gauge,
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

/** 工作台核心入口：发布总览 / 使用记录（含最近使用）/ 用量统计 / 我的收藏 */
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
  /** 与开发者一致的「我的」资源登记入口；全站资源在「资源审核」 */
  { id: 'admin-workspace', icon: LayoutGrid, label: '个人工作台' },
  { id: 'admin-resource-ops', icon: Boxes, label: '资源与运营' },
  { id: 'user-management', icon: Users, label: '用户与权限' },
  { id: 'monitoring', icon: Activity, label: '监控运维' },
  { id: 'system-config', icon: Settings, label: '平台配置' },
];

// ==================== 用户菜单（师生使用视角）====================

export const USER_SIDEBAR_ITEMS = [
  { id: 'hub', icon: Compass, label: '探索发现' },
  { id: 'skills-center', icon: Braces, label: 'Skills 中心' },
  { id: 'mcp-center', icon: Puzzle, label: 'MCP 广场' },
  { id: 'dataset-center', icon: Database, label: '数据集' },
  { id: 'agents-center', icon: Bot, label: 'Agent 广场' },
  { id: 'apps-center', icon: AppWindow, label: '应用集' },
  { id: 'workspace', icon: LayoutGrid, label: '个人工作台' },
  { id: 'developer-portal', icon: Code2, label: '开发者中心' },
];

export const SIDEBAR_ITEMS = ADMIN_SIDEBAR_ITEMS;
export const DASHBOARD_GROUPS = [];

// ==================== 管理员子菜单 ====================

export const ADMIN_OVERVIEW_GROUPS: NavSubGroup[] = [
  {
    title: '运营总览',
    items: [
      { id: 'dashboard', icon: LayoutDashboard, label: '数据概览' },
      { id: 'health-check', icon: HeartPulse, label: '健康状态' },
      { id: 'usage-statistics', icon: BarChart3, label: '使用统计' },
      { id: 'data-reports', icon: ScrollText, label: '数据报表' },
    ],
  },
];

export const ADMIN_RESOURCE_MANAGEMENT_GROUPS: NavSubGroup[] = [
  {
    title: '运行诊断',
    items: [
      { id: 'agent-monitoring', icon: LineChart, label: '运行监控' },
      { id: 'agent-trace', icon: GitBranch, label: '链路追踪' },
    ],
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
    items: [{ id: 'resource-audit', icon: ClipboardCheck, label: '资源审核', tag: '全站' }],
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
    items: [
      { id: 'user-list', icon: Users, label: '用户管理' },
      { id: 'role-management', icon: Shield, label: '角色权限' },
      { id: 'organization', icon: Building2, label: '组织管理' },
      { id: 'api-key-management', icon: Fingerprint, label: '密钥管理' },
      { id: 'developer-applications', icon: ClipboardCheck, label: '入驻审批' },
    ],
  },
];

export const ADMIN_MONITORING_GROUPS: NavSubGroup[] = [
  {
    title: '运维',
    items: [
      { id: 'monitoring-overview', icon: LayoutDashboard, label: '监控概览' },
      { id: 'call-logs', icon: FileText, label: '调用日志' },
      { id: 'performance-analysis', icon: TrendingUp, label: '性能分析' },
      { id: 'alert-management', icon: Bell, label: '告警管理' },
      { id: 'alert-rules', icon: Sliders, label: '告警规则' },
      { id: 'health-config', icon: Wrench, label: '健康检查' },
      { id: 'circuit-breaker', icon: Zap, label: '熔断降级' },
    ],
  },
];

export const ADMIN_SYSTEM_CONFIG_GROUPS: NavSubGroup[] = [
  {
    title: '平台',
    items: [
      { id: 'tag-management', icon: Tag, label: '标签管理' },
      { id: 'system-params', icon: Sliders, label: '系统参数' },
      { id: 'security-settings', icon: Lock, label: '安全配置' },
      { id: 'network-config', icon: Globe2, label: '网络配置' },
      { id: 'rate-limit-policy', icon: Gauge, label: '限流策略' },
      { id: 'access-control', icon: ShieldCheck, label: '访问控制' },
      { id: 'audit-log', icon: Receipt, label: '审计日志' },
      { id: 'sensitive-words', icon: Eye, label: '敏感词库' },
      { id: 'announcements', icon: Sparkles, label: '平台公告' },
    ],
  },
];

export const ADMIN_DEVELOPER_PORTAL_GROUPS: NavSubGroup[] = [
  {
    title: '文档',
    items: [
      { id: 'api-docs', icon: FileText, label: '接入指南' },
      { id: 'sdk-download', icon: Download, label: 'SDK 下载' },
      { id: 'api-playground', icon: Terminal, label: 'API Playground' },
      { id: 'mcp-integration', icon: Puzzle, label: '网关集成' },
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
  { title: 'Skills', items: [{ id: 'skills-center', icon: Braces, label: 'Skills 中心' }] },
];

export const USER_MCP_CENTER_GROUPS: NavSubGroup[] = [
  { title: 'MCP', items: [{ id: 'mcp-center', icon: Puzzle, label: 'MCP 广场' }] },
];

export const USER_DATASET_CENTER_GROUPS: NavSubGroup[] = [
  { title: '数据集', items: [{ id: 'dataset-center', icon: Database, label: '数据集' }] },
];

export const USER_AGENTS_CENTER_GROUPS: NavSubGroup[] = [
  { title: 'Agent', items: [{ id: 'agents-center', icon: Bot, label: 'Agent 广场' }] },
];

export const USER_APPS_CENTER_GROUPS: NavSubGroup[] = [
  { title: '应用', items: [{ id: 'apps-center', icon: AppWindow, label: '应用集' }] },
];

/** 侧栏「个人工作台」：六项能力恢复为树状子菜单；显隐由权限与 `requiresPublish` 控制 */
export const USER_MY_CONSOLE_GROUPS: NavSubGroup[] = [
  {
    title: '常用总览',
    items: [{ id: 'overview', icon: LayoutGrid, label: '工作台总览' }],
  },
  {
    title: '使用分析',
    items: [
      { id: 'usage-records', icon: History, label: '使用记录' },
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

/**
 * 管理端「个人工作台」分组：与 {@link USER_MY_CONSOLE_GROUPS} 结构一致，
 * 供超管/审核员登记与维护**本人**资源（数据走 /resource-center/resources/mine）。
 */
export const ADMIN_PERSONAL_WORKBENCH_GROUPS: NavSubGroup[] = USER_MY_CONSOLE_GROUPS;

/** 个人设置（个人资料页内已含偏好 Tab；侧栏仅 profile / 密钥管理） */
export const USER_SETTINGS_GROUPS: NavSubGroup[] = [
  {
    title: '个人设置',
    items: [
      { id: 'profile', icon: User, label: '个人资料' },
      { id: 'my-api-keys', icon: KeyRound, label: '密钥管理' },
    ],
  },
];

// ==================== 子菜单分组路由 ====================

export function getNavSubGroups(sidebarId: string, isAdminRole: boolean): NavSubGroup[] {
  if (isAdminRole) {
    switch (sidebarId) {
      case 'overview':
        return ADMIN_OVERVIEW_GROUPS;
      case 'admin-workspace':
        return ADMIN_PERSONAL_WORKBENCH_GROUPS;
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
    case 'user-settings':
      return USER_SETTINGS_GROUPS;
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
