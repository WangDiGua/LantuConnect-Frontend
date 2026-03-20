import type MockAdapter from 'axios-mock-adapter';
import type {
  BillingOverview,
  BillingDetail,
  Invoice,
  Quota,
  Plan,
} from '../../../types/dto/billing';
import { mockOk, paginate } from '../mockAdapter';

function ts(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString();
}

const overview: BillingOverview = {
  currentBalance: 2580.5,
  totalSpent: 4219.5,
  monthlySpend: 680.3,
  monthlyBudget: 2000,
  tokenUsage: { input: 18500000, output: 6200000, total: 24700000 },
  apiCalls: 128340,
  activePlan: '教育版专业',
  nextBillingDate: '2026-04-01',
};

const models = ['通义千问-Turbo', 'GPT-4o-mini', '文心 4.0', 'DeepSeek-V3'];
const detailTypes: BillingDetail['type'][] = ['api_call', 'api_call', 'api_call', 'fine_tune', 'storage', 'subscription', 'top_up'];

const details: BillingDetail[] = Array.from({ length: 60 }, (_, i) => {
  const t = detailTypes[i % 7];
  const desc: Record<BillingDetail['type'], string> = {
    api_call: `Agent对话调用 - ${models[i % 4]}`,
    fine_tune: '模型微调训练费用',
    storage: '知识库向量存储',
    subscription: '教育版专业月度订阅',
    top_up: '账户充值',
  };
  const amounts: Record<BillingDetail['type'], number> = {
    api_call: +(Math.random() * 5 + 0.1).toFixed(2),
    fine_tune: +(Math.random() * 50 + 20).toFixed(2),
    storage: +(Math.random() * 10 + 2).toFixed(2),
    subscription: 199,
    top_up: -500,
  };
  return {
    id: `bd_${i + 1}`,
    date: ts(Math.floor(i / 3)),
    type: t,
    description: desc[t],
    model: t === 'api_call' ? models[i % 4] : undefined,
    tokens: t === 'api_call' ? 1000 + Math.floor(Math.random() * 10000) : 0,
    amount: amounts[t],
    balance: 2580 + (60 - i) * 10,
  };
});

const invoices: Invoice[] = [
  { id: 'inv01', invoiceNo: 'INV-2026-03', period: '2026-03', amount: 680.3, status: 'pending', createdAt: ts(0) },
  { id: 'inv02', invoiceNo: 'INV-2026-02', period: '2026-02', amount: 890.5, status: 'paid', paidAt: ts(20), downloadUrl: '#', createdAt: ts(30) },
  { id: 'inv03', invoiceNo: 'INV-2026-01', period: '2026-01', amount: 750.2, status: 'paid', paidAt: ts(50), downloadUrl: '#', createdAt: ts(60) },
  { id: 'inv04', invoiceNo: 'INV-2025-12', period: '2025-12', amount: 620.8, status: 'paid', paidAt: ts(80), downloadUrl: '#', createdAt: ts(90) },
  { id: 'inv05', invoiceNo: 'INV-2025-11', period: '2025-11', amount: 540.0, status: 'paid', paidAt: ts(110), downloadUrl: '#', createdAt: ts(120) },
  { id: 'inv06', invoiceNo: 'INV-2025-10', period: '2025-10', amount: 480.5, status: 'paid', paidAt: ts(140), downloadUrl: '#', createdAt: ts(150) },
];

const quotas: Quota[] = [
  { id: 'q1', resource: 'api_calls', label: 'API调用次数', used: 128340, limit: 500000, unit: '次/月', resetAt: '2026-04-01T00:00:00Z' },
  { id: 'q2', resource: 'tokens', label: 'Token用量', used: 24700000, limit: 100000000, unit: 'tokens/月', resetAt: '2026-04-01T00:00:00Z' },
  { id: 'q3', resource: 'storage', label: '存储空间', used: 15.2, limit: 50, unit: 'GB' },
  { id: 'q4', resource: 'agents', label: 'Agent数量', used: 16, limit: 50, unit: '个' },
  { id: 'q5', resource: 'knowledge_bases', label: '知识库数量', used: 8, limit: 20, unit: '个' },
  { id: 'q6', resource: 'team_members', label: '团队成员', used: 12, limit: 30, unit: '人' },
  { id: 'q7', resource: 'concurrent_sessions', label: '并发会话', used: 45, limit: 200, unit: '个' },
];

const plans: Plan[] = [
  { id: 'plan01', name: '免费版', description: '适合个人试用和小规模测试', price: 0, period: 'monthly', features: ['5个Agent', '1万次API调用/月', '1GB存储', '社区支持'], limits: { agents: 5, api_calls: 10000, storage_gb: 1 }, recommended: false, current: false },
  { id: 'plan02', name: '教育版基础', description: '适合院系级别的教学辅助', price: 99, period: 'monthly', features: ['20个Agent', '10万次API调用/月', '10GB存储', '邮件支持', '基础监控'], limits: { agents: 20, api_calls: 100000, storage_gb: 10 }, recommended: false, current: false },
  { id: 'plan03', name: '教育版专业', description: '适合全校级别的智能化部署', price: 199, period: 'monthly', features: ['50个Agent', '50万次API调用/月', '50GB存储', '专属客服', '高级监控', '自定义模型'], limits: { agents: 50, api_calls: 500000, storage_gb: 50 }, recommended: true, current: true },
  { id: 'plan04', name: '企业版', description: '私有化部署，定制化服务', price: 999, period: 'monthly', features: ['无限Agent', '无限API调用', '500GB存储', '7×24技术支持', '私有化部署', 'SLA保障'], limits: { agents: -1, api_calls: -1, storage_gb: 500 }, recommended: false, current: false },
];

export function registerHandlers(mock: MockAdapter): void {
  mock.onGet('/billing/overview').reply(() => mockOk(overview));

  mock.onGet('/billing/details').reply((config) => {
    const p = config.params || {};
    return paginate(details, Number(p.page) || 1, Number(p.pageSize) || 20);
  });

  mock.onGet('/billing/invoices').reply(() => mockOk(invoices));

  mock.onGet('/billing/quotas').reply(() => mockOk(quotas));

  mock.onGet('/billing/plans').reply(() => mockOk(plans));
}
