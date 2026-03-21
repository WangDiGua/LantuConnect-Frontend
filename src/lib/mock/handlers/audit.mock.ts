import type MockAdapter from 'axios-mock-adapter';
import type { AuditItem } from '../../../types/dto/audit';
import { mockOk, paginate } from '../mockAdapter';

const pendingAgents: AuditItem[] = [
  {
    id: 1, displayName: '智能备课助手', agentName: 'lesson_planner',
    description: '基于课程标准自动生成教学计划与教案，支持多学科',
    agentType: 'mcp', sourceType: 'internal', submitter: '张教授',
    submitTime: '2026-03-18T09:00:00Z', status: 'pending_review',
  },
  {
    id: 2, displayName: '科研文献分析', agentName: 'paper_analyzer',
    description: '自动解析学术论文，提取关键信息并生成摘要报告',
    agentType: 'http_api', sourceType: 'partner', submitter: '李研究员',
    submitTime: '2026-03-17T14:30:00Z', status: 'pending_review',
  },
  {
    id: 3, displayName: '学生画像分析', agentName: 'student_profile',
    description: '综合分析学生学业、行为数据，生成个性化学情报告',
    agentType: 'mcp', sourceType: 'internal', submitter: '王老师',
    submitTime: '2026-03-16T10:20:00Z', status: 'testing',
  },
  {
    id: 4, displayName: '校园活动助手', agentName: 'campus_event',
    description: '协助策划校园活动，自动生成活动方案与通知',
    agentType: 'builtin', sourceType: 'internal', submitter: '赵辅导员',
    submitTime: '2026-03-15T16:00:00Z', status: 'pending_review',
  },
];

const pendingSkills: AuditItem[] = [
  {
    id: 101, displayName: 'PDF解析工具', agentName: 'pdf_parser',
    description: '提取PDF文档中的文字、表格和图片内容',
    agentType: 'mcp', sourceType: 'internal', submitter: '刘工程师',
    submitTime: '2026-03-19T08:30:00Z', status: 'pending_review',
  },
  {
    id: 102, displayName: '语音转文字', agentName: 'speech_to_text',
    description: '将音频文件或实时语音转换为文字，支持中英文',
    agentType: 'http_api', sourceType: 'cloud', submitter: '陈工程师',
    submitTime: '2026-03-18T11:00:00Z', status: 'pending_review',
  },
  {
    id: 103, displayName: '邮件发送工具', agentName: 'email_sender',
    description: '支持模板化邮件批量发送，包含附件管理',
    agentType: 'mcp', sourceType: 'internal', submitter: '周工程师',
    submitTime: '2026-03-17T09:45:00Z', status: 'testing',
  },
];

export function registerHandlers(mock: MockAdapter): void {
  mock.onGet('/audit/agents').reply((config) => {
    const p = config.params || {};
    return paginate(pendingAgents, Number(p.page) || 1, Number(p.pageSize) || 20);
  });

  mock.onGet('/audit/skills').reply((config) => {
    const p = config.params || {};
    return paginate(pendingSkills, Number(p.page) || 1, Number(p.pageSize) || 20);
  });

  mock.onPost(/\/audit\/agents\/(\d+)\/approve$/).reply((config) => {
    const id = Number(config.url!.match(/\/audit\/agents\/(\d+)\/approve$/)?.[1]);
    const item = pendingAgents.find((a) => a.id === id);
    if (item) item.status = 'published';
    return mockOk(null);
  });

  mock.onPost(/\/audit\/agents\/(\d+)\/reject$/).reply((config) => {
    const id = Number(config.url!.match(/\/audit\/agents\/(\d+)\/reject$/)?.[1]);
    const body = JSON.parse(config.data || '{}');
    const item = pendingAgents.find((a) => a.id === id);
    if (item) {
      item.status = 'rejected';
      item.rejectReason = body.reason;
    }
    return mockOk(null);
  });

  mock.onPost(/\/audit\/skills\/(\d+)\/approve$/).reply((config) => {
    const id = Number(config.url!.match(/\/audit\/skills\/(\d+)\/approve$/)?.[1]);
    const item = pendingSkills.find((s) => s.id === id);
    if (item) item.status = 'published';
    return mockOk(null);
  });

  mock.onPost(/\/audit\/skills\/(\d+)\/reject$/).reply((config) => {
    const id = Number(config.url!.match(/\/audit\/skills\/(\d+)\/reject$/)?.[1]);
    const body = JSON.parse(config.data || '{}');
    const item = pendingSkills.find((s) => s.id === id);
    if (item) {
      item.status = 'rejected';
      item.rejectReason = body.reason;
    }
    return mockOk(null);
  });
}
