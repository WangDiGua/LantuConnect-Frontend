import type { LucideIcon } from 'lucide-react';
import {
  GraduationCap,
  Building2,
  BookOpen,
  LineChart,
  Headphones,
  Sparkles,
  Bot,
  FileText,
  Calendar,
  Shield,
  Zap,
} from 'lucide-react';

/** 市场分类（参考 GPT Store / 扣子 / Dify 发现页的品类划分） */
export const AGENT_MARKET_CATEGORIES = [
  { id: 'all', label: '全部' },
  { id: 'edu', label: '教务教学' },
  { id: 'service', label: '办事服务' },
  { id: 'library', label: '图书馆' },
  { id: 'research', label: '科研办公' },
  { id: 'data', label: '数据分析' },
  { id: 'support', label: '客服咨询' },
  { id: 'general', label: '通用助手' },
] as const;

export type AgentMarketCategoryId = (typeof AGENT_MARKET_CATEGORIES)[number]['id'];

export interface AgentMarketCard {
  id: string;
  name: string;
  emoji: string;
  description: string;
  author: string;
  category: AgentMarketCategoryId;
  tags: string[];
  installs: string;
  rating: string;
  featured?: boolean;
  icon?: LucideIcon;
}

/** 精选位（大卡片，类似「编辑推荐」） */
export const AGENT_MARKET_FEATURED: AgentMarketCard[] = [
  {
    id: 'feat-1',
    name: '校园办事向导',
    emoji: '🎓',
    description: '覆盖请假、证明、缴费等高频流程，引导式问答 + 对接教务中台，减少窗口排队。',
    author: '智能体接入平台官方',
    category: 'service',
    tags: ['官方', '多轮对话', '流程编排'],
    installs: '12.4k',
    rating: '4.9',
    featured: true,
    icon: Building2,
  },
  {
    id: 'feat-2',
    name: '课程与考试助手',
    emoji: '📚',
    description: '课表查询、教室变更提醒、考试安排与成绩说明（只读），支持自然语言追问。',
    author: '教务处联合实验室',
    category: 'edu',
    tags: ['课表', '考试', '只读接口'],
    installs: '8.2k',
    rating: '4.8',
    featured: true,
    icon: Calendar,
  },
  {
    id: 'feat-3',
    name: '图书馆智能馆员',
    emoji: '📖',
    description: '馆藏检索、预约规则说明、座位与研修间政策问答，可转人工工单。',
    author: '图书馆数字化中心',
    category: 'library',
    tags: ['检索', '预约', '工单'],
    installs: '5.1k',
    rating: '4.7',
    featured: true,
    icon: BookOpen,
  },
  {
    id: 'feat-4',
    name: '科研数据看板助手',
    emoji: '📊',
    description: '对接校内数据仓库元数据，用对话生成统计口径说明与图表建议（不直接出数）。',
    author: '数据中心',
    category: 'data',
    tags: ['BI', '元数据', '合规'],
    installs: '3.6k',
    rating: '4.6',
    featured: true,
    icon: LineChart,
  },
];

/** 列表区（更多 Agent，参考「全部/趋势」流） */
export const AGENT_MARKET_LIST: AgentMarketCard[] = [
  {
    id: 'm1',
    name: '论文格式检查员',
    emoji: '📝',
    description: '按学院模板检查 Word 章节、参考文献格式，标出可疑处。',
    author: '研究生院',
    category: 'research',
    tags: ['文档', '规则引擎'],
    installs: '2.1k',
    rating: '4.5',
    icon: FileText,
  },
  {
    id: 'm2',
    name: '迎新问答机器人',
    emoji: '👋',
    description: '新生报到、宿舍、缴费、军训等常见问题一站式解答。',
    author: '学工处',
    category: 'service',
    tags: ['FAQ', '迎新'],
    installs: '15k',
    rating: '4.8',
    icon: Headphones,
  },
  {
    id: 'm3',
    name: '实验室安全巡检',
    emoji: '🧪',
    description: '危化品台账问答、检查清单生成，配合隐患上报链接。',
    author: '资产与实验室处',
    category: 'research',
    tags: ['安全', '清单'],
    installs: '980',
    rating: '4.4',
    icon: Shield,
  },
  {
    id: 'm4',
    name: '奖学金政策解读',
    emoji: '💰',
    description: '按学年政策回答申请条件、材料与时间线，附原文链接。',
    author: '资助管理中心',
    category: 'edu',
    tags: ['政策', '链接溯源'],
    installs: '4.3k',
    rating: '4.7',
    icon: GraduationCap,
  },
  {
    id: 'm5',
    name: 'IT 报障分流',
    emoji: '💻',
    description: '网络、邮箱、VPN 常见问题自助排障，复杂问题生成工单摘要。',
    author: '信息化办',
    category: 'support',
    tags: ['工单', '排障'],
    installs: '6.7k',
    rating: '4.6',
    icon: Zap,
  },
  {
    id: 'm6',
    name: '通用写作润色',
    emoji: '✨',
    description: '公文、通知、邮件语气与结构优化，不代写敏感内容。',
    author: '第三方·文心合作',
    category: 'general',
    tags: ['写作', '合规'],
    installs: '22k',
    rating: '4.5',
    icon: Sparkles,
  },
  {
    id: 'm7',
    name: '会议室智能预订',
    emoji: '🏢',
    description: '根据人数、设备需求推荐可用会议室，并给出预订步骤。',
    author: '后勤管理处',
    category: 'service',
    tags: ['资源预约'],
    installs: '1.9k',
    rating: '4.3',
    icon: Building2,
  },
  {
    id: 'm8',
    name: '心理健康轻疏导',
    emoji: '🌿',
    description: '情绪识别与自助资源推荐，危机话术转人工热线（演示数据）。',
    author: '心理中心',
    category: 'support',
    tags: ['公益', '转人工'],
    installs: '3.2k',
    rating: '4.8',
    icon: Bot,
  },
];

export const AGENT_MARKET_HOT_KEYWORDS = ['办事大厅', '课表', '图书馆', '奖学金', '报修', '论文'];
