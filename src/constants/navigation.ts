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
  { id: '系统概览', icon: LayoutDashboard, label: '系统概览' },
  { id: '系统配置', icon: Settings, label: '系统配置' },
  { id: '用户管理', icon: Users, label: '用户与权限' },
  { id: '模型服务管理', icon: Server, label: '模型与算力' },
  { id: '工具管理', icon: Puzzle, label: '工具与生态' },
  { id: '运营与安全', icon: ShieldCheck, label: '运营与安全' },
  { id: '集成与中台', icon: Link2, label: '集成与中台' },
  { id: '监控中心', icon: Activity, label: '观测与告警' },
  { id: '数据管理', icon: Database, label: '数据与存储' },
  { id: '系统日志', icon: FileText, label: '审计与日志' },
];

// ==================== 用户菜单（应用 / Studio 视角，参考 Coze、Dify、千帆）====================

export const USER_SIDEBAR_ITEMS = [
  { id: '工作台', icon: LayoutDashboard, label: '工作台' },
  { id: 'AI 助手', icon: Bot, label: 'AI 助手' },
  { id: '我的 Agent', icon: Sparkles, label: 'Agent 与编排' },
  { id: '工作流', icon: Workflow, label: '工作流' },
  { id: '我的资产', icon: FolderOpen, label: '资源与知识' },
  { id: '模型服务', icon: Layers, label: '模型与推理' },
  { id: '工具广场', icon: Wrench, label: '工具与插件' },
  { id: '发布与连接', icon: Share2, label: '发布与连接' },
  { id: '我的数据', icon: FileBarChart, label: '数据与评测' },
  { id: '用量账单', icon: CreditCard, label: '用量与账单' },
  { id: '个人设置', icon: UserCircle, label: '账户与偏好' },
  { id: '文档教程', icon: BookOpen, label: '文档与教程' },
];

export const SIDEBAR_ITEMS = ADMIN_SIDEBAR_ITEMS;

export const DASHBOARD_GROUPS = [];

// ==================== 管理员子菜单 ====================

export const ADMIN_OVERVIEW_GROUPS = [
  {
    title: '总览',
    items: [
      { id: '系统概览', icon: LayoutDashboard, label: '系统概览' },
      { id: '资源监控', icon: BarChart3, label: '资源监控' },
      { id: '使用统计', icon: TrendingUp, label: '使用统计' },
      { id: '健康检查', icon: Activity, label: '健康检查' },
    ],
  },
];

export const ADMIN_SYSTEM_CONFIG_GROUPS = [
  {
    title: '基础',
    items: [
      { id: '模型配置', icon: Cpu, label: '模型配置' },
      { id: '系统参数', icon: Sliders, label: '系统参数' },
      { id: '安全设置', icon: Shield, label: '安全设置' },
      { id: '网络配置', icon: Network, label: '网络配置' },
    ],
  },
  {
    title: '策略',
    items: [
      { id: '限流策略', icon: Sliders, label: '限流策略' },
      { id: '配额管理', icon: HardDrive, label: '配额管理' },
      { id: '访问控制', icon: Lock, label: '访问控制' },
    ],
  },
  {
    title: '审计',
    items: [{ id: '审计日志', icon: History, label: '审计日志' }],
  },
];

export const ADMIN_USER_MANAGEMENT_GROUPS = [
  {
    title: '用户',
    items: [
      { id: '用户管理', icon: Users, label: '用户管理' },
      { id: '角色管理', icon: Fingerprint, label: '角色管理' },
      { id: '组织架构', icon: Building2, label: '组织架构' },
    ],
  },
  {
    title: '凭证',
    items: [
      { id: 'API Key 管理', icon: Key, label: 'API Key 管理' },
      { id: 'Token 管理', icon: Shield, label: 'Token 管理' },
    ],
  },
];

export const ADMIN_MODEL_SERVICE_GROUPS = [
  {
    title: '接入',
    items: [
      { id: '模型接入', icon: UploadCloud, label: '模型接入' },
      { id: '模型配置', icon: Cpu, label: '模型配置' },
      { id: '模型测试', icon: FlaskConical, label: '模型测试' },
      { id: '推理路由', icon: GitBranch, label: '推理路由' },
    ],
  },
  {
    title: '算力与成本',
    items: [
      { id: '模型监控', icon: LineChart, label: '模型监控' },
      { id: '配额管理', icon: HardDrive, label: '配额管理' },
      { id: '成本统计', icon: BarChart3, label: '成本统计' },
      { id: 'GPU 资源池', icon: Server, label: 'GPU 资源池' },
    ],
  },
];

export const ADMIN_TOOL_MANAGEMENT_GROUPS = [
  {
    title: '审核',
    items: [
      { id: '工具审核', icon: CheckCircle2, label: '工具审核' },
      { id: 'MCP Server 审核', icon: Server, label: 'MCP 审核' },
      { id: '插件签名', icon: ShieldCheck, label: '插件签名' },
    ],
  },
  {
    title: '管理',
    items: [
      { id: '工具管理', icon: Package, label: '工具管理' },
      { id: 'MCP Server 管理', icon: Server, label: 'MCP Server' },
      { id: '工具分类', icon: FolderOpen, label: '工具分类' },
      { id: '官方工具集', icon: Hammer, label: '官方工具集' },
    ],
  },
];

export const ADMIN_OPS_SECURITY_GROUPS = [
  {
    title: '内容安全',
    items: [
      { id: '内容审核', icon: Eye, label: '内容审核队列' },
      { id: '敏感词库', icon: FileWarning, label: '敏感词库' },
      { id: '策略模板', icon: Shield, label: '安全策略模板' },
    ],
  },
  {
    title: '运营',
    items: [
      { id: '应用模板审核', icon: Package, label: '应用模板审核' },
      { id: '广场运营', icon: Globe2, label: '广场运营' },
      { id: '公告管理', icon: Bell, label: '公告管理' },
    ],
  },
];

export const ADMIN_INTEGRATION_GROUPS = [
  {
    title: '网关',
    items: [
      { id: 'API 网关', icon: Radio, label: 'API 网关' },
      { id: 'Webhook 路由', icon: Webhook, label: 'Webhook 路由' },
      { id: '沙箱环境', icon: TestTube2, label: '沙箱环境' },
    ],
  },
  {
    title: '开放能力',
    items: [
      { id: 'OAuth 客户端', icon: Key, label: 'OAuth 客户端' },
      { id: 'SDK 与密钥', icon: Code2, label: 'SDK 与密钥' },
    ],
  },
];

export const ADMIN_MONITORING_GROUPS = [
  {
    title: '观测',
    items: [
      { id: '监控概览', icon: Activity, label: '监控概览' },
      { id: '调用日志', icon: Search, label: '调用日志' },
      { id: '性能分析', icon: BarChart3, label: '性能分析' },
      { id: '资源监控', icon: Cpu, label: '资源监控' },
      { id: '全链路 Trace', icon: GitBranch, label: '全链路 Trace' },
    ],
  },
  {
    title: '告警',
    items: [
      { id: '告警管理', icon: AlertTriangle, label: '告警管理' },
      { id: '告警规则', icon: Bell, label: '告警规则' },
    ],
  },
];

export const ADMIN_DATA_MANAGEMENT_GROUPS = [
  {
    title: '备份',
    items: [
      { id: '数据备份', icon: Download, label: '数据备份' },
      { id: '数据恢复', icon: Upload, label: '数据恢复' },
    ],
  },
  {
    title: '维护',
    items: [
      { id: '数据清理', icon: Trash2, label: '数据清理' },
      { id: '数据归档', icon: Archive, label: '数据归档' },
      { id: '存储桶', icon: HardDrive, label: '对象存储' },
    ],
  },
];

export const ADMIN_SYSTEM_LOG_GROUPS = [
  {
    title: '日志',
    items: [
      { id: '操作日志', icon: History, label: '操作日志' },
      { id: '错误日志', icon: XCircle, label: '错误日志' },
      { id: '审计日志', icon: Eye, label: '审计日志' },
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
      { id: '概览', icon: LayoutDashboard, label: '概览' },
      { id: '快捷入口', icon: Zap, label: '快捷入口' },
      { id: '最近项目', icon: Clock, label: '最近项目' },
    ],
  },
];

export const USER_AGENT_MANAGEMENT_GROUPS = [
  {
    title: '构建',
    items: [
      { id: AGENT_WORKSPACE_SUBITEM_ID, icon: Library, label: '我的 Agent' },
      { id: '对话流编排', icon: GitBranch, label: '对话流编排' },
      { id: '版本与发布', icon: Rocket, label: '版本与发布' },
      { id: 'Agent 市场', icon: Package, label: 'Agent 市场' },
      { id: '我的应用', icon: Workflow, label: '已发布应用' },
    ],
  },
  {
    title: '运行观测',
    items: [
      { id: 'Agent监控', icon: LineChart, label: '运行监控' },
      { id: 'Trace追踪', icon: GitBranch, label: 'Trace 追踪' },
      { id: '调试会话', icon: Terminal, label: '调试会话' },
    ],
  },
];

export const USER_WORKFLOW_GROUPS = [
  {
    title: '工作流',
    items: [
      { id: '工作流列表', icon: Workflow, label: '工作流列表' },
      { id: '画布编排', icon: LayoutDashboard, label: '画布编排' },
      { id: '运行记录', icon: History, label: '运行记录' },
      { id: '定时与触发', icon: Timer, label: '定时与触发' },
    ],
  },
  {
    title: '模板',
    items: [
      { id: '工作流模板', icon: BookMarked, label: '工作流模板' },
      { id: '导入导出', icon: UploadCloud, label: '导入 / 导出' },
    ],
  },
];

export const USER_ASSETS_GROUPS = [
  {
    title: '知识',
    items: [
      { id: '知识库', icon: BookOpen, label: '知识库' },
      { id: '数据库', icon: Database, label: '数据库连接' },
      { id: '文档导入', icon: UploadCloud, label: '文档导入' },
    ],
  },
  {
    title: '提示与词表',
    items: [
      { id: 'Prompt模板', icon: MessageSquare, label: 'Prompt 模板' },
      { id: '专业词库', icon: GraduationCap, label: '专业词库' },
      { id: '对话卡片', icon: MessagesSquare, label: '对话卡片' },
    ],
  },
  {
    title: '记忆与变量',
    items: [
      { id: '长期记忆', icon: BrainCircuit, label: '长期记忆' },
      { id: '变量与密钥', icon: Key, label: '变量与密钥' },
    ],
  },
];

export const USER_MODEL_SERVICE_GROUPS = [
  {
    title: '体验',
    items: [
      { id: '文本模型', icon: FileText, label: '文本模型' },
      { id: '图像模型', icon: ImageIcon, label: '图像模型' },
      { id: '视频模型', icon: Video, label: '视频模型' },
      { id: '语音模型', icon: Mic, label: '语音模型' },
      { id: '多模态', icon: Layers, label: '多模态' },
    ],
  },
  {
    title: '推理',
    items: [
      { id: '在线推理', icon: Zap, label: '在线推理' },
      { id: '批量推理', icon: Layers, label: '批量推理' },
      { id: '流式输出', icon: Radio, label: '流式输出' },
    ],
  },
  {
    title: '调优',
    items: [
      { id: 'Prompt工程', icon: Terminal, label: 'Prompt 工程' },
      { id: '精调任务', icon: Cpu, label: '精调任务' },
      { id: '评测对比', icon: GitCompare, label: '评测对比' },
      { id: '模型蒸馏', icon: FlaskConical, label: '模型蒸馏' },
    ],
  },
];

export const USER_TOOL_SQUARE_GROUPS = [
  {
    title: '发现',
    items: [
      { id: '工具发现', icon: Search, label: '工具发现' },
      { id: 'MCP 广场', icon: Server, label: 'MCP 广场' },
      { id: '插件市场', icon: Puzzle, label: '插件市场' },
    ],
  },
  {
    title: '我的',
    items: [
      { id: '我的工具', icon: Package, label: '我的工具' },
      { id: '创建工具', icon: Plus, label: '创建工具 / 函数' },
      { id: '上架 MCP Server', icon: UploadCloud, label: '上架 MCP' },
      { id: '创建 MCP Server', icon: Code2, label: '创建 MCP' },
    ],
  },
];

export const USER_PUBLISH_GROUPS = [
  {
    title: '发布渠道',
    items: [
      { id: 'API 接入', icon: Terminal, label: 'API 接入' },
      { id: '嵌入网页', icon: Globe2, label: '嵌入网页' },
      { id: '分享链接', icon: Share2, label: '分享链接' },
      { id: '移动端 SDK', icon: Radio, label: '移动端 SDK' },
    ],
  },
  {
    title: '连接',
    items: [
      { id: 'Webhook', icon: Webhook, label: 'Webhook' },
      { id: '消息渠道', icon: MessageSquare, label: '企微 / 钉钉 / 飞书' },
      { id: '事件订阅', icon: Bell, label: '事件订阅' },
    ],
  },
];

export const USER_DATA_GROUPS = [
  {
    title: '数据',
    items: [
      { id: '对话历史', icon: History, label: '对话历史' },
      { id: '数据统计', icon: BarChart3, label: '数据统计' },
      { id: '导出数据', icon: Download, label: '导出数据' },
      { id: '数据集', icon: Database, label: '数据集管理' },
    ],
  },
  {
    title: '评测',
    items: [
      { id: '效果评测', icon: Scale, label: '效果评测' },
      { id: 'A/B 实验', icon: GitCompare, label: 'A/B 实验' },
      { id: '标注任务', icon: CheckCircle2, label: '标注任务' },
    ],
  },
];

export const USER_USAGE_GROUPS = [
  {
    title: '用量',
    items: [
      { id: '用量概览', icon: BarChart3, label: '用量概览' },
      { id: '调用明细', icon: Search, label: '调用明细' },
      { id: '配额提醒', icon: Bell, label: '配额提醒' },
    ],
  },
  {
    title: '账单',
    items: [
      { id: '账单', icon: Receipt, label: '账单' },
      { id: '发票', icon: FileText, label: '发票' },
      { id: '套餐升级', icon: Rocket, label: '套餐升级' },
    ],
  },
];

export const USER_SETTINGS_GROUPS = [
  {
    title: '账户',
    items: [
      { id: '个人资料', icon: User, label: '个人资料' },
      { id: '偏好设置', icon: Settings, label: '偏好设置' },
      { id: '工作空间', icon: Boxes, label: '工作空间设置' },
    ],
  },
  {
    title: '开发者',
    items: [
      { id: 'API Key', icon: Key, label: 'API Key' },
      { id: '使用统计', icon: TrendingUp, label: '使用统计' },
    ],
  },
];

/** 侧栏子菜单分组（供 MainLayout / 路由校验复用） */
export function getNavSubGroups(sidebarId: string, isAdminRole: boolean) {
  if (isAdminRole) {
    switch (sidebarId) {
      case '系统概览':
        return ADMIN_OVERVIEW_GROUPS;
      case '系统配置':
        return ADMIN_SYSTEM_CONFIG_GROUPS;
      case '用户管理':
        return ADMIN_USER_MANAGEMENT_GROUPS;
      case '模型服务管理':
        return ADMIN_MODEL_SERVICE_GROUPS;
      case '工具管理':
        return ADMIN_TOOL_MANAGEMENT_GROUPS;
      case '运营与安全':
        return ADMIN_OPS_SECURITY_GROUPS;
      case '集成与中台':
        return ADMIN_INTEGRATION_GROUPS;
      case '监控中心':
        return ADMIN_MONITORING_GROUPS;
      case '数据管理':
        return ADMIN_DATA_MANAGEMENT_GROUPS;
      case '系统日志':
        return ADMIN_SYSTEM_LOG_GROUPS;
      default:
        return [];
    }
  }
  switch (sidebarId) {
    case '工作台':
      return USER_WORKSPACE_GROUPS;
    case '我的 Agent':
      return USER_AGENT_MANAGEMENT_GROUPS;
    case '工作流':
      return USER_WORKFLOW_GROUPS;
    case '我的资产':
      return USER_ASSETS_GROUPS;
    case '模型服务':
      return USER_MODEL_SERVICE_GROUPS;
    case '工具广场':
      return USER_TOOL_SQUARE_GROUPS;
    case '发布与连接':
      return USER_PUBLISH_GROUPS;
    case '我的数据':
      return USER_DATA_GROUPS;
    case '用量账单':
      return USER_USAGE_GROUPS;
    case '个人设置':
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
