import {
  LayoutDashboard,
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
  Link2,
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
  Cpu,
  CheckCircle2,
  Code2,
  Terminal,
  Download,
} from 'lucide-react';

// ==================== 管理员菜单（接入平台管理视角）====================

export const ADMIN_SIDEBAR_ITEMS = [
  { id: 'overview', icon: LayoutDashboard, label: '总览' },
  { id: 'agent-management', icon: Bot, label: 'Agent 管理' },
  { id: 'skill-management', icon: Wrench, label: 'Skill 管理' },
  { id: 'app-management', icon: AppWindow, label: '智能应用' },
  { id: 'dataset-management', icon: Database, label: '数据集' },
  { id: 'provider-management', icon: Server, label: 'Provider' },
  { id: 'user-management', icon: Users, label: '用户与权限' },
  { id: 'monitoring', icon: Activity, label: '监控中心' },
  { id: 'system-config', icon: Settings, label: '系统配置' },
  { id: 'developer-portal', icon: Code2, label: '开发者中心' },
];

// ==================== 用户菜单（师生使用视角）====================

export const USER_SIDEBAR_ITEMS = [
  { id: 'workspace', icon: LayoutDashboard, label: '工作台' },
  { id: 'agent-market', icon: Bot, label: 'Agent 市场' },
  { id: 'skill-market', icon: Wrench, label: '技能市场' },
  { id: 'app-market', icon: AppWindow, label: '应用广场' },
  { id: 'dataset-market', icon: Database, label: '数据集' },
  { id: 'my-publish', icon: Rocket, label: '我的发布' },
  { id: 'my-space', icon: UserCircle, label: '我的空间' },
  { id: 'user-settings', icon: Settings, label: '个人设置' },
];

export const SIDEBAR_ITEMS = ADMIN_SIDEBAR_ITEMS;
export const DASHBOARD_GROUPS = [];

// ==================== 管理员子菜单 ====================

export const ADMIN_OVERVIEW_GROUPS = [
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

export const ADMIN_AGENT_MANAGEMENT_GROUPS = [
  {
    title: '管理',
    items: [
      { id: 'agent-list', icon: Bot, label: 'Agent 列表' },
      { id: 'agent-create', icon: Sparkles, label: '注册 Agent' },
      { id: 'agent-audit', icon: CheckCircle2, label: '审核队列' },
      { id: 'agent-versions', icon: GitBranch, label: '版本管理' },
    ],
  },
  {
    title: '运行',
    items: [
      { id: 'agent-monitoring', icon: LineChart, label: '运行监控' },
      { id: 'agent-trace', icon: GitBranch, label: '调用追踪' },
    ],
  },
];

export const ADMIN_SKILL_MANAGEMENT_GROUPS = [
  {
    title: '管理',
    items: [
      { id: 'skill-list', icon: Wrench, label: 'Skill 列表' },
      { id: 'skill-create', icon: Puzzle, label: '注册 Skill' },
      { id: 'skill-audit', icon: CheckCircle2, label: '审核队列' },
      { id: 'mcp-server-list', icon: Server, label: 'MCP Server' },
    ],
  },
];

export const ADMIN_APP_MANAGEMENT_GROUPS = [
  {
    title: '管理',
    items: [
      { id: 'app-list', icon: AppWindow, label: '应用列表' },
      { id: 'app-create', icon: Rocket, label: '注册应用' },
    ],
  },
];

export const ADMIN_DATASET_MANAGEMENT_GROUPS = [
  {
    title: '管理',
    items: [
      { id: 'dataset-list', icon: Database, label: '数据集列表' },
      { id: 'dataset-create', icon: FolderOpen, label: '注册数据集' },
    ],
  },
];

export const ADMIN_PROVIDER_MANAGEMENT_GROUPS = [
  {
    title: '服务提供商',
    items: [
      { id: 'provider-list', icon: Server, label: 'Provider 列表' },
      { id: 'provider-create', icon: Link2, label: '添加 Provider' },
    ],
  },
];

export const ADMIN_USER_MANAGEMENT_GROUPS = [
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
    ],
  },
];

export const ADMIN_MONITORING_GROUPS = [
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

export const ADMIN_SYSTEM_CONFIG_GROUPS = [
  {
    title: '基础',
    items: [
      { id: 'category-management', icon: Tag, label: '分类管理' },
      { id: 'tag-management', icon: Tag, label: '标签管理' },
      { id: 'model-config', icon: Cpu, label: '模型配置' },
      { id: 'security-settings', icon: Shield, label: '安全设置' },
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
];

export const ADMIN_DEVELOPER_PORTAL_GROUPS = [
  {
    title: '文档',
    items: [
      { id: 'api-docs', icon: FileText, label: 'API 文档' },
      { id: 'sdk-download', icon: Download, label: 'SDK 下载' },
      { id: 'api-playground', icon: Terminal, label: 'API Playground' },
    ],
  },
];

// ==================== 用户子菜单 ====================

export const USER_WORKSPACE_GROUPS = [
  {
    title: '开始',
    items: [
      { id: 'overview', icon: LayoutDashboard, label: '概览' },
      { id: 'quick-access', icon: Zap, label: '快捷入口' },
      { id: 'recent-use', icon: Clock, label: '最近使用' },
    ],
  },
];

export const USER_MY_SPACE_GROUPS = [
  {
    title: '使用',
    items: [
      { id: 'usage-records', icon: History, label: '使用记录' },
      { id: 'my-favorites', icon: Heart, label: '我的收藏' },
      { id: 'usage-stats', icon: BarChart3, label: '用量统计' },
    ],
  },
];

export const USER_MY_PUBLISH_GROUPS = [
  {
    title: '我的提交',
    items: [
      { id: 'my-agents', icon: Bot, label: '我的 Agent' },
      { id: 'my-skills', icon: Wrench, label: '我的 Skill' },
      { id: 'submit-agent', icon: Sparkles, label: '提交 Agent' },
      { id: 'submit-skill', icon: Puzzle, label: '提交 Skill' },
    ],
  },
];

export const USER_SETTINGS_GROUPS = [
  {
    title: '账户',
    items: [
      { id: 'profile', icon: User, label: '个人资料' },
      { id: 'preferences', icon: Settings, label: '偏好设置' },
    ],
  },
];

// ==================== 子菜单分组路由 ====================

export function getNavSubGroups(sidebarId: string, isAdminRole: boolean) {
  if (isAdminRole) {
    switch (sidebarId) {
      case 'overview':
        return ADMIN_OVERVIEW_GROUPS;
      case 'agent-management':
        return ADMIN_AGENT_MANAGEMENT_GROUPS;
      case 'skill-management':
        return ADMIN_SKILL_MANAGEMENT_GROUPS;
      case 'app-management':
        return ADMIN_APP_MANAGEMENT_GROUPS;
      case 'dataset-management':
        return ADMIN_DATASET_MANAGEMENT_GROUPS;
      case 'provider-management':
        return ADMIN_PROVIDER_MANAGEMENT_GROUPS;
      case 'user-management':
        return ADMIN_USER_MANAGEMENT_GROUPS;
      case 'monitoring':
        return ADMIN_MONITORING_GROUPS;
      case 'system-config':
        return ADMIN_SYSTEM_CONFIG_GROUPS;
      case 'developer-portal':
        return ADMIN_DEVELOPER_PORTAL_GROUPS;
      default:
        return [];
    }
  }
  switch (sidebarId) {
    case 'workspace':
      return USER_WORKSPACE_GROUPS;
    case 'my-publish':
      return USER_MY_PUBLISH_GROUPS;
    case 'my-space':
      return USER_MY_SPACE_GROUPS;
    case 'user-settings':
      return USER_SETTINGS_GROUPS;
    case 'agent-market':
    case 'skill-market':
    case 'app-market':
    case 'dataset-market':
      return [];
    default:
      return [];
  }
}

// 兼容导出
export const AGENT_WORKSPACE_SUBITEM_ID = 'agent-list';
export const TOOL_SQUARE_GROUPS = ADMIN_SKILL_MANAGEMENT_GROUPS;
export const AGENT_MANAGEMENT_GROUPS = ADMIN_AGENT_MANAGEMENT_GROUPS;
export const MONITORING_GROUPS = ADMIN_MONITORING_GROUPS;
export const SYSTEM_CONFIG_GROUPS = ADMIN_SYSTEM_CONFIG_GROUPS;
export const USER_MANAGEMENT_GROUPS = ADMIN_USER_MANAGEMENT_GROUPS;
export const MODEL_SERVICE_GROUPS = [] as any[];
