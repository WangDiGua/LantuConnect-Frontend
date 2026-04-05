import {
  LayoutDashboard,
  LayoutGrid,
  Users,
  Activity,
  Settings,
  User,
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
  GitBranch,
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
  UserCircle,
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
  Library,
  Plus,
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
  { id: 'overview', icon: LayoutDashboard, label: '总览' },
  { id: 'admin-resource-ops', icon: Boxes, label: '资源与运营' },
  { id: 'user-management', icon: Users, label: '用户与权限' },
  { id: 'monitoring', icon: Activity, label: '监控中心' },
  { id: 'system-config', icon: Settings, label: '系统配置' },
];

// ==================== 用户菜单（师生使用视角）====================

export const USER_SIDEBAR_ITEMS = [
  { id: 'hub', icon: Compass, label: '探索发现' },
  { id: 'workspace', icon: LayoutGrid, label: '我的工作台' },
  { id: 'user-resource-assets', icon: Library, label: '资源与资产' },
  { id: 'skills-center', icon: Braces, label: 'Skills 中心' },
  { id: 'mcp-center', icon: Puzzle, label: 'MCP 广场' },
  { id: 'dataset-center', icon: Database, label: '数据集中心' },
  { id: 'developer-portal', icon: Code2, label: '开发者中心' },
  { id: 'user-settings', icon: UserCircle, label: '个人设置' },
];

export const SIDEBAR_ITEMS = ADMIN_SIDEBAR_ITEMS;
export const DASHBOARD_GROUPS = [];

// ==================== 管理员子菜单 ====================

export const ADMIN_OVERVIEW_GROUPS: NavSubGroup[] = [
  {
    title: '总览',
    items: [
      { id: 'overview', icon: LayoutDashboard, label: '数据概览' },
      { id: 'health-check', icon: Activity, label: '健康状态' },
      { id: 'usage-statistics', icon: TrendingUp, label: '使用统计' },
      { id: 'data-reports', icon: BarChart3, label: '数据报表' },
    ],
  },
];

export const ADMIN_RESOURCE_MANAGEMENT_GROUPS: NavSubGroup[] = [
  {
    title: '资源目录',
    items: [
      { id: 'resource-catalog', icon: Boxes, label: '统一资源中心', tag: '审核' },
      { id: 'skill-external-market', icon: Store, label: '技能在线市场', tag: '管理员' },
    ],
  },
  {
    title: 'Agent 运维',
    items: [
      { id: 'agent-monitoring', icon: LineChart, label: '运行监控' },
      { id: 'agent-trace', icon: GitBranch, label: '调用追踪' },
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
    items: [
      { id: 'resource-audit', icon: ClipboardCheck, label: '资源审核' },
    ],
  },
];

export const ADMIN_PROVIDER_MANAGEMENT_GROUPS: NavSubGroup[] = [
  {
    title: 'Provider',
    items: [
      { id: 'provider-list', icon: Server, label: 'Provider 列表' },
      { id: 'provider-create', icon: Plus, label: '新建 Provider' },
    ],
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
    title: '用户',
    items: [
      { id: 'user-list', icon: Users, label: '用户管理' },
      { id: 'role-management', icon: Fingerprint, label: '角色管理' },
      { id: 'organization', icon: Building2, label: '组织架构' },
    ],
  },
  {
    title: '凭证',
    items: [
      { id: 'api-key-management', icon: Key, label: 'API Key 管理' },
      { id: 'token-management', icon: ScrollText, label: 'Token 管理' },
      { id: 'resource-grant-management', icon: Share2, label: '资源授权管理' },
      { id: 'grant-applications', icon: ClipboardCheck, label: '授权申请审批' },
    ],
  },
  {
    title: '入驻',
    items: [
      { id: 'developer-applications', icon: Rocket, label: '入驻审批' },
    ],
  },
];

export const ADMIN_MONITORING_GROUPS: NavSubGroup[] = [
  {
    title: '观测',
    items: [
      { id: 'monitoring-overview', icon: Activity, label: '监控概览' },
      { id: 'call-logs', icon: Search, label: '调用日志' },
      { id: 'performance-analysis', icon: BarChart3, label: '性能分析' },
    ],
  },
  {
    title: '告警',
    items: [
      { id: 'alert-management', icon: AlertTriangle, label: '告警管理' },
      { id: 'alert-rules', icon: Bell, label: '告警规则' },
    ],
  },
  {
    title: '治理',
    items: [
      { id: 'health-config', icon: ShieldCheck, label: '健康检查' },
      { id: 'circuit-breaker', icon: AlertTriangle, label: '熔断降级' },
    ],
  },
];

export const ADMIN_SYSTEM_CONFIG_GROUPS: NavSubGroup[] = [
  {
    title: '基础',
    items: [
      { id: 'tag-management', icon: Tag, label: '标签管理' },
      { id: 'system-params', icon: Braces, label: '系统参数' },
      { id: 'security-settings', icon: Shield, label: '安全设置' },
      { id: 'network-config', icon: Globe2, label: '网络配置' },
    ],
  },
  {
    title: '策略',
    items: [
      { id: 'quota-management', icon: CreditCard, label: '配额管理' },
      { id: 'rate-limit-policy', icon: Sliders, label: '限流策略' },
      { id: 'access-control', icon: Lock, label: '访问控制' },
    ],
  },
  {
    title: '审计',
    items: [
      { id: 'audit-log', icon: History, label: '审计日志' },
    ],
  },
  {
    title: '内容治理',
    items: [
      { id: 'sensitive-words', icon: ShieldCheck, label: '敏感词管理' },
      { id: 'announcements', icon: Bell, label: '平台公告' },
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

export const USER_MARKETPLACE_GROUPS: NavSubGroup[] = [
  {
    title: '浏览',
    items: [{ id: 'resource-market', icon: Store, label: '资源浏览' }],
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

/** 用户端合并项：浏览 → 我的发布 → 使用与授权 */
export const USER_RESOURCE_ASSETS_GROUPS: NavSubGroup[] = [
  ...USER_MARKETPLACE_GROUPS,
  ...USER_MY_PUBLISH_GROUPS,
  ...USER_MY_SPACE_GROUPS,
];

export const USER_SETTINGS_GROUPS: NavSubGroup[] = [
  {
    title: '账户',
    items: [
      { id: 'profile', icon: User, label: '个人资料' },
      { id: 'preferences', icon: Sliders, label: '偏好设置' },
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
    case 'skills-center':
    case 'mcp-center':
    case 'dataset-center':
      return [];
    case 'developer-portal':
      return ADMIN_DEVELOPER_PORTAL_GROUPS;
    case 'workspace':
      return USER_WORKSPACE_GROUPS;
    case 'user-resource-assets':
      return USER_RESOURCE_ASSETS_GROUPS;
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
