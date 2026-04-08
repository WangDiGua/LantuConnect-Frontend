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
  Key,
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
  Store,
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

// ==================== 管理员菜单（接入平台管理视角）====================

export const ADMIN_SIDEBAR_ITEMS = [
  { id: 'overview', icon: LayoutDashboard, label: '运营总览' },
  { id: 'admin-resource-ops', icon: Boxes, label: '资源与运营' },
  { id: 'user-management', icon: Users, label: '用户与权限' },
  { id: 'monitoring', icon: Activity, label: '监控中心' },
  { id: 'system-config', icon: Settings, label: '系统配置' },
];

// ==================== 用户菜单（师生使用视角）====================

export const USER_SIDEBAR_ITEMS = [
  { id: 'hub', icon: Compass, label: '探索发现' },
  { id: 'skills-center', icon: Braces, label: 'Skills 中心' },
  { id: 'mcp-center', icon: Puzzle, label: 'MCP 广场' },
  { id: 'dataset-center', icon: Database, label: '数据集' },
  { id: 'agents-center', icon: Bot, label: 'Agent 广场' },
  { id: 'apps-center', icon: AppWindow, label: '应用集' },
  { id: 'workspace', icon: LayoutGrid, label: '我的' },
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
    items: [{ id: 'monitoring-hub', icon: Activity, label: '监控与运维' }],
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

// ==================== 用户子菜单 ====================

export const USER_WORKSPACE_GROUPS: NavSubGroup[] = [
  {
    title: '我的',
    items: [
      { id: 'overview', icon: LayoutGrid, label: '工作台总览' },
      { id: 'developer-onboarding', icon: Rocket, label: '开发者入驻' },
      { id: 'my-favorites', icon: Heart, label: '我的收藏' },
      { id: 'authorized-skills', icon: Key, label: '已授权技能' },
    ],
  },
];

export const USER_MY_SPACE_GROUPS: NavSubGroup[] = [
  {
    title: '使用',
    items: [
      { id: 'usage-records', icon: History, label: '使用记录' },
      { id: 'usage-stats', icon: BarChart3, label: '用量统计' },
    ],
  },
  {
    title: '授权与入驻',
    items: [
      { id: 'grant-applications', icon: ClipboardCheck, label: '授权审批待办' },
      { id: 'my-grant-applications', icon: ClipboardCheck, label: '我的授权申请' },
      { id: 'developer-applications', icon: Rocket, label: '入驻审批' },
    ],
  },
];

export const USER_MY_PUBLISH_GROUPS: NavSubGroup[] = [
  {
    title: '我的发布',
    requiresPublish: true,
    items: [
      { id: 'my-agents-pub', icon: Rocket, label: '发布总览' },
      { id: 'resource-center', icon: Boxes, label: '统一资源中心' },
    ],
  },
];

/** 用户端合并项：我的发布 → 使用与授权（浏览入口已迁至顶栏各资源中心） */
export const USER_RESOURCE_ASSETS_GROUPS: NavSubGroup[] = [
  ...USER_MY_PUBLISH_GROUPS,
  ...USER_MY_SPACE_GROUPS,
];

/** 侧栏「我的」：原工作台 + 资源与资产，按任务路径排序 */
export const USER_MY_CONSOLE_GROUPS: NavSubGroup[] = [
  {
    title: '概览',
    items: [
      { id: 'overview', icon: LayoutGrid, label: '工作台总览' },
      { id: 'developer-onboarding', icon: Rocket, label: '开发者入驻' },
    ],
  },
  ...USER_MY_PUBLISH_GROUPS,
  {
    title: '使用',
    items: [
      { id: 'usage-records', icon: History, label: '使用记录' },
      { id: 'usage-stats', icon: BarChart3, label: '用量统计' },
      { id: 'quick-access', icon: Zap, label: '快速入口' },
      { id: 'recent-use', icon: Clock, label: '最近使用' },
    ],
  },
  {
    title: '收藏与能力',
    items: [
      { id: 'my-favorites', icon: Heart, label: '我的收藏' },
      { id: 'authorized-skills', icon: Key, label: '已授权技能' },
    ],
  },
  {
    title: '工单与审批',
    items: [
      { id: 'grant-applications', icon: ClipboardCheck, label: '授权审批待办' },
      { id: 'my-grant-applications', icon: ClipboardCheck, label: '我的授权申请' },
      { id: 'developer-applications', icon: Rocket, label: '入驻审批' },
    ],
  },
];

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
    case 'mcp-center':
    case 'dataset-center':
    case 'agents-center':
    case 'apps-center':
      return [];
    case 'skills-center':
      return [
        {
          title: 'Skills',
          items: [
            { id: 'skills-center', icon: Braces, label: '平台技能' },
            { id: 'skill-external-market', icon: Store, label: '在线市场' },
          ],
        },
      ];
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
