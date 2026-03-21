import type MockAdapter from 'axios-mock-adapter';
import type {
  AdminOverview,
  UserWorkspace,
  HealthSummary,
  UsageStatsData,
  UsageStatsPoint,
  DataReportsData,
} from '../../types/dto/dashboard';
import { mockOk } from '..';

const adminOverview: AdminOverview = {
  kpis: [
    { label: '注册Agent数', value: 48, trend: 12.5 },
    { label: '注册Skill数', value: 126, trend: 8.3 },
    { label: '今日调用量', value: 15680, trend: 5.2 },
    { label: '活跃用户数', value: 1243, trend: -2.1 },
    { label: '平均响应时间', value: 2350, trend: -8.6 },
    { label: '成功率', value: 96.8, trend: 1.2 },
  ],
  healthSummary: { healthy: 38, warning: 6, down: 4 },
  recentRegistrations: [
    { name: '智能备课助手', type: 'Agent', status: '审核中', time: '2026-03-18 09:00' },
    { name: 'PDF解析工具', type: 'Skill', status: '审核中', time: '2026-03-19 08:30' },
    { name: '科研文献分析', type: 'Agent', status: '审核中', time: '2026-03-17 14:30' },
    { name: '语音转文字', type: 'Skill', status: '测试中', time: '2026-03-18 11:00' },
    { name: '校园一卡通查询', type: 'App', status: '已发布', time: '2026-03-16 15:20' },
  ],
};

const userWorkspace: UserWorkspace = {
  recentAgents: [
    { id: 1, displayName: '图像生成', icon: '🎨', lastUsedTime: '2026-03-21T07:30:00Z' },
    { id: 6, displayName: '发起独立任务', icon: '📋', lastUsedTime: '2026-03-20T16:45:00Z' },
    { id: 2, displayName: '联网搜索', icon: '🔍', lastUsedTime: '2026-03-20T14:20:00Z' },
  ],
  recentSkills: [
    { id: 3, displayName: 'Word文档生成', icon: '📄', lastUsedTime: '2026-03-21T06:50:00Z' },
    { id: 8, displayName: '统计图表生成', icon: '📈', lastUsedTime: '2026-03-20T11:00:00Z' },
    { id: 4, displayName: 'Excel表格生成', icon: '📊', lastUsedTime: '2026-03-19T15:30:00Z' },
  ],
  favoriteCount: 12,
  totalUsageToday: 37,
  quickActions: [
    { label: '发起对话', route: '/chat', icon: '💬' },
    { label: '浏览市场', route: '/market', icon: '🏪' },
    { label: '我的收藏', route: '/user/favorites', icon: '⭐' },
    { label: '使用记录', route: '/user/usage', icon: '📊' },
  ],
};

const healthSummary: HealthSummary = {
  totalAgents: 48,
  healthy: 38,
  degraded: 6,
  down: 4,
  avgLatencyMs: 2350,
  avgSuccessRate: 96.8,
  recentIncidents: [
    { agentName: 'ppt_generate', displayName: 'PPT演示文稿生成', issue: '服务不可用', time: '2026-03-21 07:50' },
    { agentName: 'word_generate', displayName: 'Word文档生成', issue: '响应延迟升高', time: '2026-03-21 07:45' },
    { agentName: 'email_sender', displayName: '邮件发送', issue: 'SMTP连接超时', time: '2026-03-20 22:10' },
  ],
};

function generateUsagePoints(range: string): UsageStatsPoint[] {
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
  const points: UsageStatsPoint[] = [];
  const now = new Date('2026-03-21');
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    points.push({
      date: d.toISOString().slice(0, 10),
      calls: Math.floor(10000 + Math.random() * 8000),
      tokens: Math.floor(500000 + Math.random() * 400000),
      users: Math.floor(800 + Math.random() * 600),
    });
  }
  return points;
}

function buildUsageStats(range: string): UsageStatsData {
  const points = generateUsagePoints(range);
  return {
    range,
    points,
    totalCalls: points.reduce((s, p) => s + p.calls, 0),
    totalTokens: points.reduce((s, p) => s + p.tokens, 0),
    activeUsers: Math.floor(800 + Math.random() * 600),
  };
}

const dataReports: DataReportsData = {
  range: '30d',
  topAgents: [
    { name: '联网搜索', calls: 45280, successRate: 99.1 },
    { name: '发起独立任务', calls: 32100, successRate: 97.8 },
    { name: '统计图表生成', calls: 15680, successRate: 96.2 },
    { name: 'Word文档生成', calls: 12350, successRate: 94.8 },
    { name: 'Excel表格生成', calls: 9870, successRate: 95.2 },
  ],
  topSkills: [
    { name: '本地知识库搜索', calls: 58900, avgLatency: 650 },
    { name: '联网搜索', calls: 45280, avgLatency: 1850 },
    { name: '统计图表生成', calls: 15680, avgLatency: 2800 },
    { name: 'Word文档生成', calls: 12350, avgLatency: 4500 },
    { name: '图像生成', calls: 8742, avgLatency: 3200 },
  ],
  departmentUsage: [
    { department: '计算机学院', calls: 28500, users: 320 },
    { department: '管理学院', calls: 18200, users: 245 },
    { department: '外国语学院', calls: 12800, users: 186 },
    { department: '教务处', calls: 9600, users: 45 },
    { department: '图书馆', calls: 7500, users: 32 },
  ],
};

export function registerHandlers(mock: MockAdapter): void {
  mock.onGet('/dashboard/admin-overview').reply(() => mockOk(adminOverview));

  mock.onGet('/dashboard/user-workspace').reply(() => mockOk(userWorkspace));

  mock.onGet('/dashboard/health-summary').reply(() => mockOk(healthSummary));

  mock.onGet('/dashboard/usage-stats').reply((config) => {
    const range = config.params?.range || '7d';
    return mockOk(buildUsageStats(range));
  });

  mock.onGet('/dashboard/data-reports').reply((config) => {
    const range = config.params?.range || '30d';
    return mockOk({ ...dataReports, range });
  });
}
