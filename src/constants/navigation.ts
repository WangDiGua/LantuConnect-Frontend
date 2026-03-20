import {
  LayoutDashboard,
  Users,
  Activity,
  Settings,
  User,
  Layers,
  Wrench,
  Bot,
  Zap,
  Library,
  Package,
  FileText,
  FlaskConical,
  Search,
  Shield,
  Cpu,
  Sliders,
  History,
  Fingerprint,
  Image as ImageIcon,
  Video,
  Mic,
  Terminal,
  BookOpen,
  Database,
  MessageSquare,
  GraduationCap,
  MessagesSquare,
  LineChart,
  GitBranch,
  UploadCloud,
  Plus,
  Server,
  Network,
  HardDrive,
  AlertTriangle,
  BarChart3,
  Key,
  Building2,
  CheckCircle2,
  XCircle,
  Download,
  Upload,
  Trash2,
  Bell,
  Lock,
  Eye,
  Sparkles,
  Workflow,
  FolderOpen,
  Archive,
  Boxes,
  Share2,
  Webhook,
  Radio,
  BrainCircuit,
  GitCompare,
  CreditCard,
  Receipt,
  TestTube2,
  ShieldCheck,
  Link2,
  Puzzle,
  Timer,
  BookMarked,
  Scale,
  FileWarning,
  Hammer,
  Globe2,
  Code2,
  Rocket,
  Inbox,
  FileBarChart,
  UserCircle,
  TrendingUp,
  Clock,
} from 'lucide-react';

// ==================== 管理员菜单（平台运维视角）====================

export const ADMIN_SIDEBAR_ITEMS = [
  { id: 'overview', icon: LayoutDashboard, label: '系统概览' },
  { id: 'system-config', icon: Settings, label: '系统配置' },
  { id: 'user-management', icon: Users, label: '用户与权限' },
  { id: 'model-service', icon: Server, label: '模型与算力' },
  { id: 'tool-management', icon: Puzzle, label: '工具与生态' },
  { id: 'ops-security', icon: ShieldCheck, label: '运营与安全' },
  { id: 'integration', icon: Link2, label: '集成与中台' },
  { id: 'monitoring', icon: Activity, label: '观测与告警' },
  { id: 'data-management', icon: Database, label: '数据与存储' },
  { id: 'system-log', icon: FileText, label: '审计与日志' },
];

// ==================== 用户菜单（应用 / Studio 视角，参考 Coze、Dify、千帆）====================

export const USER_SIDEBAR_ITEMS = [
  { id: 'workspace', icon: LayoutDashboard, label: '工作台' },
  { id: 'ai-assistant', icon: Bot, label: 'AI 助手' },
  { id: 'my-agent', icon: Sparkles, label: 'Agent 与编排' },
  { id: 'workflow', icon: Workflow, label: '工作流' },
  { id: 'my-assets', icon: FolderOpen, label: '资源与知识' },
  { id: 'model-service', icon: Layers, label: '模型与推理' },
  { id: 'tool-square', icon: Wrench, label: '工具与插件' },
  { id: 'publish-connect', icon: Share2, label: '发布与连接' },
  { id: 'my-data', icon: FileBarChart, label: '数据与评测' },
  { id: 'usage-billing', icon: CreditCard, label: '用量与账单' },
  { id: 'personal-settings', icon: UserCircle, label: '账户与偏好' },
  { id: 'docs-tutorials', icon: BookOpen, label: '文档与教程' },
];

export const SIDEBAR_ITEMS = ADMIN_SIDEBAR_ITEMS;

export const DASHBOARD_GROUPS = [];

// ==================== 管理员子菜单 ====================

export const ADMIN_OVERVIEW_GROUPS = [
  {
    title: '总览',
    items: [
      { id: 'overview', icon: LayoutDashboard, label: '系统概览' },
      { id: 'resource-monitoring', icon: BarChart3, label: '资源监控' },
      { id: 'usage-statistics', icon: TrendingUp, label: '使用统计' },
      { id: 'health-check', icon: Activity, label: '健康检查' },
    ],
  },
];

export const ADMIN_SYSTEM_CONFIG_GROUPS = [
  {
    title: '基础',
    items: [
      { id: 'model-config', icon: Cpu, label: '模型配置' },
      { id: 'system-params', icon: Sliders, label: '系统参数' },
      { id: 'security-settings', icon: Shield, label: '安全设置' },
      { id: 'network-config', icon: Network, label: '网络配置' },
    ],
  },
  {
    title: '策略',
    items: [
      { id: 'rate-limit-policy', icon: Sliders, label: '限流策略' },
      { id: 'quota-management', icon: HardDrive, label: '配额管理' },
      { id: 'access-control', icon: Lock, label: '访问控制' },
    ],
  },
  {
    title: '审计',
    items: [{ id: 'audit-log', icon: History, label: '审计日志' }],
  },
];

export const ADMIN_USER_MANAGEMENT_GROUPS = [
  {
    title: '用户',
    items: [
      { id: 'user-management', icon: Users, label: '用户管理' },
      { id: 'role-management', icon: Fingerprint, label: '角色管理' },
      { id: 'organization', icon: Building2, label: '组织架构' },
    ],
  },
  {
    title: '凭证',
    items: [
      { id: 'api-key-management', icon: Key, label: 'API Key 管理' },
      { id: 'token-management', icon: Shield, label: 'Token 管理' },
    ],
  },
];

export const ADMIN_MODEL_SERVICE_GROUPS = [
  {
    title: '接入',
    items: [
      { id: 'model-integration', icon: UploadCloud, label: '模型接入' },
      { id: 'model-config', icon: Cpu, label: '模型配置' },
      { id: 'model-testing', icon: FlaskConical, label: '模型测试' },
      { id: 'inference-routing', icon: GitBranch, label: '推理路由' },
    ],
  },
  {
    title: '算力与成本',
    items: [
      { id: 'model-monitoring', icon: LineChart, label: '模型监控' },
      { id: 'quota-management', icon: HardDrive, label: '配额管理' },
      { id: 'cost-statistics', icon: BarChart3, label: '成本统计' },
      { id: 'gpu-resource-pool', icon: Server, label: 'GPU 资源池' },
    ],
  },
];

export const ADMIN_TOOL_MANAGEMENT_GROUPS = [
  {
    title: '审核',
    items: [
      { id: 'tool-review', icon: CheckCircle2, label: '工具审核' },
      { id: 'mcp-server-review', icon: Server, label: 'MCP 审核' },
      { id: 'plugin-signature', icon: ShieldCheck, label: '插件签名' },
    ],
  },
  {
    title: '管理',
    items: [
      { id: 'tool-management', icon: Package, label: '工具管理' },
      { id: 'mcp-server-management', icon: Server, label: 'MCP Server' },
      { id: 'tool-category', icon: FolderOpen, label: '工具分类' },
      { id: 'official-toolset', icon: Hammer, label: '官方工具集' },
    ],
  },
];

export const ADMIN_OPS_SECURITY_GROUPS = [
  {
    title: '内容安全',
    items: [
      { id: 'content-review', icon: Eye, label: '内容审核队列' },
      { id: 'sensitive-word-library', icon: FileWarning, label: '敏感词库' },
      { id: 'policy-template', icon: Shield, label: '安全策略模板' },
    ],
  },
  {
    title: '运营',
    items: [
      { id: 'app-template-review', icon: Package, label: '应用模板审核' },
      { id: 'square-operations', icon: Globe2, label: '广场运营' },
      { id: 'announcement-management', icon: Bell, label: '公告管理' },
    ],
  },
];

export const ADMIN_INTEGRATION_GROUPS = [
  {
    title: '网关',
    items: [
      { id: 'api-gateway', icon: Radio, label: 'API 网关' },
      { id: 'webhook-routing', icon: Webhook, label: 'Webhook 路由' },
      { id: 'sandbox-environment', icon: TestTube2, label: '沙箱环境' },
    ],
  },
  {
    title: '开放能力',
    items: [
      { id: 'oauth-client', icon: Key, label: 'OAuth 客户端' },
      { id: 'sdk-keys', icon: Code2, label: 'SDK 与密钥' },
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
      { id: 'resource-monitoring', icon: Cpu, label: '资源监控' },
      { id: 'full-link-trace', icon: GitBranch, label: '全链路 Trace' },
    ],
  },
  {
    title: '告警',
    items: [
      { id: 'alert-management', icon: AlertTriangle, label: '告警管理' },
      { id: 'alert-rules', icon: Bell, label: '告警规则' },
    ],
  },
];

export const ADMIN_DATA_MANAGEMENT_GROUPS = [
  {
    title: '备份',
    items: [
      { id: 'data-backup', icon: Download, label: '数据备份' },
      { id: 'data-restore', icon: Upload, label: '数据恢复' },
    ],
  },
  {
    title: '维护',
    items: [
      { id: 'data-cleanup', icon: Trash2, label: '数据清理' },
      { id: 'data-archive', icon: Archive, label: '数据归档' },
      { id: 'storage-bucket', icon: HardDrive, label: '对象存储' },
    ],
  },
];

export const ADMIN_SYSTEM_LOG_GROUPS = [
  {
    title: '日志',
    items: [
      { id: 'operation-log', icon: History, label: '操作日志' },
      { id: 'error-log', icon: XCircle, label: '错误日志' },
      { id: 'audit-log', icon: Eye, label: '审计日志' },
    ],
  },
];

/**
 * Agent 工作区 id，须在引用它的菜单组之前声明。
 */
export const AGENT_WORKSPACE_SUBITEM_ID = 'agent-workspace';

// ==================== 用户子菜单 ====================

export const USER_WORKSPACE_GROUPS = [
  {
    title: '开始',
    items: [
      { id: 'overview', icon: LayoutDashboard, label: '概览' },
      { id: 'quick-access', icon: Zap, label: '快捷入口' },
      { id: 'recent-projects', icon: Clock, label: '最近项目' },
    ],
  },
];

export const USER_AGENT_MANAGEMENT_GROUPS = [
  {
    title: '构建',
    items: [
      { id: AGENT_WORKSPACE_SUBITEM_ID, icon: Library, label: '我的 Agent' },
      { id: 'conversation-flow', icon: GitBranch, label: '对话流编排' },
      { id: 'version-publish', icon: Rocket, label: '版本与发布' },
      { id: 'agent-marketplace', icon: Package, label: 'Agent 市场' },
      { id: 'my-apps', icon: Workflow, label: '已发布应用' },
    ],
  },
  {
    title: '运行观测',
    items: [
      { id: 'agent-monitoring', icon: LineChart, label: '运行监控' },
      { id: 'trace-tracking', icon: GitBranch, label: 'Trace 追踪' },
      { id: 'debug-session', icon: Terminal, label: '调试会话' },
    ],
  },
];

export const USER_WORKFLOW_GROUPS = [
  {
    title: '工作流',
    items: [
      { id: 'workflow-list', icon: Workflow, label: '工作流列表' },
      { id: 'canvas-editor', icon: LayoutDashboard, label: '画布编排' },
      { id: 'execution-history', icon: History, label: '运行记录' },
      { id: 'schedule-trigger', icon: Timer, label: '定时与触发' },
    ],
  },
  {
    title: '模板',
    items: [
      { id: 'workflow-template', icon: BookMarked, label: '工作流模板' },
      { id: 'import-export', icon: UploadCloud, label: '导入 / 导出' },
    ],
  },
];

export const USER_ASSETS_GROUPS = [
  {
    title: '知识',
    items: [
      { id: 'knowledge-base', icon: BookOpen, label: '知识库' },
      { id: 'database', icon: Database, label: '数据库连接' },
      { id: 'document-import', icon: UploadCloud, label: '文档导入' },
    ],
  },
  {
    title: '提示与词表',
    items: [
      { id: 'prompt-template', icon: MessageSquare, label: 'Prompt 模板' },
      { id: 'professional-vocabulary', icon: GraduationCap, label: '专业词库' },
      { id: 'conversation-card', icon: MessagesSquare, label: '对话卡片' },
    ],
  },
  {
    title: '记忆与变量',
    items: [
      { id: 'long-term-memory', icon: BrainCircuit, label: '长期记忆' },
      { id: 'variables-keys', icon: Key, label: '变量与密钥' },
    ],
  },
];

export const USER_MODEL_SERVICE_GROUPS = [
  {
    title: '体验',
    items: [
      { id: 'text-model', icon: FileText, label: '文本模型' },
      { id: 'image-model', icon: ImageIcon, label: '图像模型' },
      { id: 'video-model', icon: Video, label: '视频模型' },
      { id: 'audio-model', icon: Mic, label: '语音模型' },
      { id: 'multimodal', icon: Layers, label: '多模态' },
    ],
  },
  {
    title: '推理',
    items: [
      { id: 'online-inference', icon: Zap, label: '在线推理' },
      { id: 'batch-inference', icon: Layers, label: '批量推理' },
      { id: 'streaming-output', icon: Radio, label: '流式输出' },
    ],
  },
  {
    title: '调优',
    items: [
      { id: 'prompt-engineering', icon: Terminal, label: 'Prompt 工程' },
      { id: 'fine-tuning', icon: Cpu, label: '精调任务' },
      { id: 'evaluation-comparison', icon: GitCompare, label: '评测对比' },
      { id: 'model-distillation', icon: FlaskConical, label: '模型蒸馏' },
    ],
  },
];

export const USER_TOOL_SQUARE_GROUPS = [
  {
    title: '发现',
    items: [
      { id: 'tool-discovery', icon: Search, label: '工具发现' },
      { id: 'mcp-square', icon: Server, label: 'MCP 广场' },
      { id: 'plugin-marketplace', icon: Puzzle, label: '插件市场' },
    ],
  },
  {
    title: '我的',
    items: [
      { id: 'my-tools', icon: Package, label: '我的工具' },
      { id: 'create-tool', icon: Plus, label: '创建工具 / 函数' },
      { id: 'publish-mcp-server', icon: UploadCloud, label: '上架 MCP' },
      { id: 'create-mcp-server', icon: Code2, label: '创建 MCP' },
    ],
  },
];

export const USER_PUBLISH_GROUPS = [
  {
    title: '发布渠道',
    items: [
      { id: 'api-integration', icon: Terminal, label: 'API 接入' },
      { id: 'embed-webpage', icon: Globe2, label: '嵌入网页' },
      { id: 'share-link', icon: Share2, label: '分享链接' },
      { id: 'mobile-sdk', icon: Radio, label: '移动端 SDK' },
    ],
  },
  {
    title: '连接',
    items: [
      { id: 'webhook', icon: Webhook, label: 'Webhook' },
      { id: 'message-channels', icon: MessageSquare, label: '企微 / 钉钉 / 飞书' },
      { id: 'event-subscription', icon: Bell, label: '事件订阅' },
    ],
  },
];

export const USER_DATA_GROUPS = [
  {
    title: '数据',
    items: [
      { id: 'conversation-history', icon: History, label: '对话历史' },
      { id: 'data-statistics', icon: BarChart3, label: '数据统计' },
      { id: 'export-data', icon: Download, label: '导出数据' },
      { id: 'dataset', icon: Database, label: '数据集管理' },
    ],
  },
  {
    title: '评测',
    items: [
      { id: 'effectiveness-evaluation', icon: Scale, label: '效果评测' },
      { id: 'ab-testing', icon: GitCompare, label: 'A/B 实验' },
      { id: 'annotation-task', icon: CheckCircle2, label: '标注任务' },
    ],
  },
];

export const USER_USAGE_GROUPS = [
  {
    title: '用量',
    items: [
      { id: 'usage-overview', icon: BarChart3, label: '用量概览' },
      { id: 'call-details', icon: Search, label: '调用明细' },
      { id: 'quota-alert', icon: Bell, label: '配额提醒' },
    ],
  },
  {
    title: '账单',
    items: [
      { id: 'billing', icon: Receipt, label: '账单' },
      { id: 'invoice', icon: FileText, label: '发票' },
      { id: 'plan-upgrade', icon: Rocket, label: '套餐升级' },
    ],
  },
];

export const USER_SETTINGS_GROUPS = [
  {
    title: '账户',
    items: [
      { id: 'profile', icon: User, label: '个人资料' },
      { id: 'preferences', icon: Settings, label: '偏好设置' },
      { id: 'workspace-settings', icon: Boxes, label: '工作空间设置' },
    ],
  },
  {
    title: '开发者',
    items: [
      { id: 'api-key', icon: Key, label: 'API Key' },
      { id: 'usage-statistics', icon: TrendingUp, label: '使用统计' },
    ],
  },
];

/** 侧栏子菜单分组（供 MainLayout / 路由校验复用） */
export function getNavSubGroups(sidebarId: string, isAdminRole: boolean) {
  if (isAdminRole) {
    switch (sidebarId) {
      case 'overview':
        return ADMIN_OVERVIEW_GROUPS;
      case 'system-config':
        return ADMIN_SYSTEM_CONFIG_GROUPS;
      case 'user-management':
        return ADMIN_USER_MANAGEMENT_GROUPS;
      case 'model-service':
        return ADMIN_MODEL_SERVICE_GROUPS;
      case 'tool-management':
        return ADMIN_TOOL_MANAGEMENT_GROUPS;
      case 'ops-security':
        return ADMIN_OPS_SECURITY_GROUPS;
      case 'integration':
        return ADMIN_INTEGRATION_GROUPS;
      case 'monitoring':
        return ADMIN_MONITORING_GROUPS;
      case 'data-management':
        return ADMIN_DATA_MANAGEMENT_GROUPS;
      case 'system-log':
        return ADMIN_SYSTEM_LOG_GROUPS;
      default:
        return [];
    }
  }
  switch (sidebarId) {
    case 'workspace':
      return USER_WORKSPACE_GROUPS;
    case 'my-agent':
      return USER_AGENT_MANAGEMENT_GROUPS;
    case 'workflow':
      return USER_WORKFLOW_GROUPS;
    case 'my-assets':
      return USER_ASSETS_GROUPS;
    case 'model-service':
      return USER_MODEL_SERVICE_GROUPS;
    case 'tool-square':
      return USER_TOOL_SQUARE_GROUPS;
    case 'publish-connect':
      return USER_PUBLISH_GROUPS;
    case 'my-data':
      return USER_DATA_GROUPS;
    case 'usage-billing':
      return USER_USAGE_GROUPS;
    case 'personal-settings':
      return USER_SETTINGS_GROUPS;
    default:
      return [];
  }
}

// 兼容导出
export const TOOL_SQUARE_GROUPS = USER_TOOL_SQUARE_GROUPS;
export const AGENT_MANAGEMENT_GROUPS = USER_AGENT_MANAGEMENT_GROUPS;
export const MONITORING_GROUPS = ADMIN_MONITORING_GROUPS;
export const SYSTEM_CONFIG_GROUPS = ADMIN_SYSTEM_CONFIG_GROUPS;
export const USER_MANAGEMENT_GROUPS = ADMIN_USER_MANAGEMENT_GROUPS;
export const MODEL_SERVICE_GROUPS = USER_MODEL_SERVICE_GROUPS;
