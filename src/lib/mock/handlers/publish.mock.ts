import type MockAdapter from 'axios-mock-adapter';
import type {
  ShareLink,
  WebhookConfig,
  EmbedConfig,
  EventSubscription,
} from '../../../types/dto/publish';
import { mockOk } from '../mockAdapter';

function ts(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString();
}

let apiKey = {
  id: 'pk_001',
  key: 'sk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  prefix: 'sk_test_xxxx',
  createdAt: ts(60),
  lastUsedAt: ts(0),
  callCount: 45200,
};

const webhooks: WebhookConfig[] = [
  { id: 'wh01', name: '教务系统回调', url: 'https://api.school.edu/hooks/agent-response', secret: 'whsec_abc123', events: ['agent.completed', 'agent.error'], status: 'active', retryCount: 3, lastTriggeredAt: ts(0), failureCount: 2, createdAt: ts(45), updatedAt: ts(1) },
  { id: 'wh02', name: '监控告警推送', url: 'https://alert.school.edu/webhook', events: ['alert.fired', 'alert.resolved'], status: 'active', retryCount: 5, lastTriggeredAt: ts(1), failureCount: 0, createdAt: ts(30), updatedAt: ts(5) },
  { id: 'wh03', name: '飞书群通知', url: 'https://open.feishu.cn/open-apis/bot/v2/hook/xxx', events: ['agent.completed'], status: 'active', retryCount: 3, failureCount: 1, createdAt: ts(20), updatedAt: ts(10) },
  { id: 'wh04', name: '数据同步回调', url: 'https://sync.internal/callback', events: ['data.export.completed'], status: 'disabled', retryCount: 3, failureCount: 8, createdAt: ts(60), updatedAt: ts(15) },
];

const shares: ShareLink[] = [
  { id: 'sh01', agentId: 'ag01', agentName: '教务问答助手', token: 'x7k2m9', url: 'https://lantu.school.edu/s/x7k2m9', title: '招生咨询公开体验', status: 'active', usedCount: 1288, createdAt: ts(30) },
  { id: 'sh02', agentId: 'ag02', agentName: '招生咨询机器人', token: 'p3n8v5', url: 'https://lantu.school.edu/s/p3n8v5', title: '2026招生问答体验', password: '2026edu', expiresAt: ts(-30), maxUses: 5000, status: 'active', usedCount: 3450, createdAt: ts(20) },
  { id: 'sh03', agentId: 'ag05', agentName: '心理健康疏导', token: 'q1w2e3', url: 'https://lantu.school.edu/s/q1w2e3', title: '心理咨询试用', status: 'active', usedCount: 560, createdAt: ts(15) },
  { id: 'sh04', agentId: 'ag10', agentName: '就业指导顾问', token: 'r4t5y6', url: 'https://lantu.school.edu/s/r4t5y6', title: '就业指导体验版', expiresAt: ts(5), status: 'expired', usedCount: 210, createdAt: ts(45) },
  { id: 'sh05', agentId: 'ag06', agentName: '图书馆智能检索', token: 'u7i8o9', url: 'https://lantu.school.edu/s/u7i8o9', title: '图书检索试用', status: 'active', usedCount: 890, createdAt: ts(10) },
];

const events: EventSubscription[] = [
  { id: 'ev01', event: 'agent.completed', description: 'Agent对话完成时触发', enabled: true, webhookIds: ['wh01', 'wh03'] },
  { id: 'ev02', event: 'agent.error', description: 'Agent发生错误时触发', enabled: true, webhookIds: ['wh01'] },
  { id: 'ev03', event: 'alert.fired', description: '告警触发时通知', enabled: true, webhookIds: ['wh02'] },
  { id: 'ev04', event: 'alert.resolved', description: '告警恢复时通知', enabled: true, webhookIds: ['wh02'] },
  { id: 'ev05', event: 'data.export.completed', description: '数据导出完成', enabled: false, webhookIds: ['wh04'] },
  { id: 'ev06', event: 'user.login', description: '用户登录事件', enabled: false, webhookIds: [] },
  { id: 'ev07', event: 'model.switch', description: '模型切换事件', enabled: false, webhookIds: [] },
];

let nextWhId = 100;
let nextShId = 100;

export function registerHandlers(mock: MockAdapter): void {
  mock.onGet('/publish/api-key').reply(() => mockOk(apiKey));

  mock.onPost('/publish/api-key/regenerate').reply(() => {
    apiKey = {
      ...apiKey,
      key: 'sk_live_' + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2),
      prefix: 'sk_live_' + Math.random().toString(36).slice(2, 6),
      createdAt: new Date().toISOString(),
      callCount: 0,
    };
    return mockOk(apiKey);
  });

  mock.onGet(/\/publish\/embed\/([^/]+)$/).reply((config) => {
    const agentId = config.url!.match(/\/publish\/embed\/([^/]+)$/)?.[1];
    const embedConfig: EmbedConfig = {
      agentId: agentId || 'ag01',
      theme: 'light',
      primaryColor: '#1677ff',
      title: '蓝图智联助手',
      welcomeMessage: '您好！有什么可以帮您的？',
      position: 'bottom-right',
      width: 400,
      height: 600,
      scriptTag: `<script src="https://lantu.school.edu/embed.js" data-agent="${agentId}"></script>`,
    };
    return mockOk(embedConfig);
  });

  mock.onGet('/publish/webhooks').reply(() => mockOk(webhooks));

  mock.onPost('/publish/webhooks').reply((config) => {
    const body = JSON.parse(config.data || '{}');
    const wh: WebhookConfig = {
      id: 'wh_' + nextWhId++,
      name: body.name,
      url: body.url,
      secret: body.secret,
      events: body.events || [],
      status: 'active',
      retryCount: 3,
      failureCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    webhooks.push(wh);
    return mockOk(wh);
  });

  mock.onDelete(/\/publish\/webhooks\/([^/]+)$/).reply((config) => {
    const id = config.url!.match(/\/publish\/webhooks\/([^/]+)$/)?.[1];
    const idx = webhooks.findIndex((w) => w.id === id);
    if (idx >= 0) webhooks.splice(idx, 1);
    return mockOk(null);
  });

  mock.onGet('/publish/shares').reply(() => mockOk(shares));

  mock.onPost('/publish/shares').reply((config) => {
    const body = JSON.parse(config.data || '{}');
    const token = Math.random().toString(36).slice(2, 8);
    const share: ShareLink = {
      id: 'sh_' + nextShId++,
      agentId: body.agentId,
      agentName: body.agentId,
      token,
      url: 'https://lantu.school.edu/s/' + token,
      title: body.title,
      password: body.password,
      expiresAt: body.expiresAt,
      maxUses: body.maxUses,
      status: 'active',
      usedCount: 0,
      createdAt: new Date().toISOString(),
    };
    shares.push(share);
    return mockOk(share);
  });

  mock.onDelete(/\/publish\/shares\/([^/]+)$/).reply((config) => {
    const id = config.url!.match(/\/publish\/shares\/([^/]+)$/)?.[1];
    const idx = shares.findIndex((s) => s.id === id);
    if (idx >= 0) shares.splice(idx, 1);
    return mockOk(null);
  });

  mock.onGet('/publish/events').reply(() => mockOk(events));

  mock.onPut('/publish/events').reply((config) => {
    const body = JSON.parse(config.data || '{}');
    const idx = events.findIndex((e) => e.id === body.id);
    if (idx >= 0) {
      events[idx] = { ...events[idx], ...body };
    }
    return mockOk(events);
  });
}
