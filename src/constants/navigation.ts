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
  Layout,
  BookOpen,
  Database,
  MessageSquare,
  GraduationCap,
  MessagesSquare,
  LineChart,
  GitBranch,
  UploadCloud,
  Plus,
} from 'lucide-react';

export const SIDEBAR_ITEMS = [
  { id: '概览', icon: LayoutDashboard, label: '概览' },
  { id: '快捷入口', icon: Zap, label: '快捷入口' },
  { id: 'AI 助手', icon: Bot, label: 'AI 助手' },
  { id: 'Agent 管理', icon: Users, label: 'Agent 管理' },
  { id: '监控中心', icon: Activity, label: '监控中心' },
  { id: '系统配置', icon: Settings, label: '系统配置' },
  { id: '用户管理', icon: User, label: '用户管理' },
  { id: '模型服务', icon: Layers, label: '模型服务' },
  { id: '工具广场', icon: Wrench, label: '工具广场' },
  { id: '文档教程', icon: BookOpen, label: '文档&教程' },
];

export const DASHBOARD_GROUPS = [];

/** 工具广场子菜单 */
export const TOOL_SQUARE_GROUPS = [
  {
    title: '广场',
    items: [
      { id: '工具发现', icon: Search, label: '工具发现' },
      { id: '我的工具', icon: Package, label: '我的工具' },
      { id: '上架 MCP Server', icon: UploadCloud, label: '上架 MCP Server' },
      { id: '创建 MCP Server', icon: Plus, label: '创建 MCP Server' },
    ],
  },
];

/**
 * Agent 子菜单：列表 / 创建 / 详情 / 行内测试 均在同一大屏「Agent列表」内完成，不单独占菜单项。
 */
export const AGENT_WORKSPACE_SUBITEM_ID = 'agent-workspace';

export const AGENT_MANAGEMENT_GROUPS = [
  {
    title: '管理',
    items: [
      { id: AGENT_WORKSPACE_SUBITEM_ID, icon: Library, label: 'Agent列表' },
      { id: 'Agent 市场', icon: Package, label: 'Agent 市场' },
    ],
  },
  {
    title: 'Agent资产',
    items: [
      { id: '知识库', icon: BookOpen, label: '知识库' },
      { id: '数据库', icon: Database, label: '数据库' },
      { id: 'Prompt模板', icon: MessageSquare, label: 'Prompt模板' },
      { id: '专业词库', icon: GraduationCap, label: '专业词库' },
      { id: '对话卡片', icon: MessagesSquare, label: '对话卡片' },
    ],
  },
  {
    title: 'Agent观测',
    items: [
      { id: 'Agent监控', icon: LineChart, label: 'Agent监控' },
      { id: 'Trace追踪', icon: GitBranch, label: 'Trace追踪' },
    ],
  },
];

export const MONITORING_GROUPS = [
  {
    title: '中心',
    items: [
      { id: '监控概览', icon: Activity, label: '监控概览' },
      { id: '调用日志', icon: Search, label: '调用日志' },
      { id: '告警管理', icon: Shield, label: '告警管理' },
    ]
  }
];

export const SYSTEM_CONFIG_GROUPS = [
  {
    title: '配置',
    items: [
      { id: '模型配置', icon: Cpu, label: '模型配置' },
      { id: '限流策略', icon: Sliders, label: '限流策略' },
      { id: '审计日志', icon: History, label: '审计日志' },
    ]
  }
];

export const USER_MANAGEMENT_GROUPS = [
  {
    title: '管理',
    items: [
      { id: '用户管理', icon: Users, label: '用户管理' },
      { id: '角色管理', icon: Fingerprint, label: '角色管理' },
      { id: 'API Key 管理', icon: Zap, label: 'API Key 管理' },
      { id: 'Token 管理', icon: Shield, label: 'Token 管理' },
    ]
  }
];

export const MODEL_SERVICE_GROUPS = [
  {
    title: '体验中心',
    items: [
      { id: '文本模型', icon: FileText, label: '文本模型' },
      { id: '图像模型', icon: ImageIcon, label: '图像模型' },
      { id: '视频模型', icon: Video, label: '视频模型' },
      { id: '语音模型', icon: Mic, label: '语音模型' },
    ]
  },
  {
    title: '模型推理',
    items: [
      { id: '在线推理', icon: Zap, label: '在线推理', hasDropdown: true },
      { id: '批量推理', icon: Layers, label: '批量推理' },
    ]
  },
  {
    title: '模型开发',
    items: [
      { id: 'Prompt工程', icon: Terminal, label: 'Prompt工程', hasDropdown: true },
      { id: '精调样板', icon: Layout, label: '精调样板' },
      { id: '模型精调', icon: Cpu, label: '模型精调' },
      { id: '模型蒸馏', icon: FlaskConical, label: '模型蒸馏' },
    ]
  }
];
