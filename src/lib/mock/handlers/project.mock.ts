import type MockAdapter from 'axios-mock-adapter';
import type { Project } from '../../../types/dto/project';
import { mockOk, paginate } from '../mockAdapter';

function ts(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString();
}

const projects: Project[] = [
  { id: 'pj01', name: '教务智能助手项目', description: '基于大模型的智能教务问答与流程自动化', icon: '🎓', color: '#1677ff', type: 'agent', status: 'active', agentCount: 5, workflowCount: 2, memberCount: 8, lastActivityAt: ts(0), createdBy: 'admin', createdAt: ts(90), updatedAt: ts(0) },
  { id: 'pj02', name: '招生咨询系统', description: '面向考生和家长的智能招生咨询平台', icon: '📋', color: '#52c41a', type: 'agent', status: 'active', agentCount: 3, workflowCount: 1, memberCount: 5, lastActivityAt: ts(1), createdBy: 'zhangsan', createdAt: ts(60), updatedAt: ts(1) },
  { id: 'pj03', name: '校园知识图谱', description: '构建校规、课程、教师等实体的知识图谱', icon: '🧠', color: '#722ed1', type: 'knowledge', status: 'active', agentCount: 1, workflowCount: 0, memberCount: 4, lastActivityAt: ts(3), createdBy: 'lisi', createdAt: ts(45), updatedAt: ts(3) },
  { id: 'pj04', name: '自动化办公流程', description: '办公审批与报表自动化工作流集合', icon: '⚙️', color: '#fa8c16', type: 'workflow', status: 'active', agentCount: 0, workflowCount: 6, memberCount: 3, lastActivityAt: ts(2), createdBy: 'wangwu', createdAt: ts(30), updatedAt: ts(2) },
  { id: 'pj05', name: '心理咨询AI试点', description: '心理健康领域AI辅助咨询试点项目', icon: '💚', color: '#13c2c2', type: 'agent', status: 'active', agentCount: 2, workflowCount: 1, memberCount: 6, lastActivityAt: ts(5), createdBy: 'admin', createdAt: ts(40), updatedAt: ts(5) },
  { id: 'pj06', name: '图书馆智能化改造', description: '图书馆检索与推荐系统智能化升级', icon: '📚', color: '#eb2f96', type: 'general', status: 'active', agentCount: 2, workflowCount: 0, memberCount: 3, lastActivityAt: ts(7), createdBy: 'zhangsan', createdAt: ts(50), updatedAt: ts(7) },
  { id: 'pj07', name: '旧版客服系统（已归档）', description: '已迁移至新平台', icon: '📦', color: '#8c8c8c', type: 'agent', status: 'archived', agentCount: 2, workflowCount: 1, memberCount: 0, lastActivityAt: ts(60), createdBy: 'admin', createdAt: ts(120), updatedAt: ts(60) },
  { id: 'pj08', name: '多语言服务项目', description: '面向留学生的多语种服务体系', icon: '🌐', color: '#2f54eb', type: 'agent', status: 'active', agentCount: 1, workflowCount: 0, memberCount: 4, lastActivityAt: ts(1), createdBy: 'lisi', createdAt: ts(15), updatedAt: ts(1) },
];

let nextId = 100;

export function registerHandlers(mock: MockAdapter): void {
  mock.onGet('/projects').reply((config) => {
    const p = config.params || {};
    return paginate(projects, Number(p.page) || 1, Number(p.pageSize) || 20);
  });

  mock.onPost('/projects').reply((config) => {
    const body = JSON.parse(config.data || '{}');
    const pj: Project = {
      id: 'pj_' + nextId++,
      name: body.name,
      description: body.description || '',
      icon: body.icon,
      color: body.color,
      type: body.type || 'general',
      status: 'active',
      agentCount: 0,
      workflowCount: 0,
      memberCount: 1,
      lastActivityAt: new Date().toISOString(),
      createdBy: 'current_user',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    projects.push(pj);
    return mockOk(pj);
  });

  mock.onPut(/\/projects\/([^/]+)$/).reply((config) => {
    const id = config.url!.match(/\/projects\/([^/]+)$/)?.[1];
    const body = JSON.parse(config.data || '{}');
    const idx = projects.findIndex((p) => p.id === id);
    if (idx >= 0) {
      projects[idx] = { ...projects[idx], ...body, updatedAt: new Date().toISOString() };
      return mockOk(projects[idx]);
    }
    return [404, { code: 404, message: 'Not found', timestamp: Date.now() }];
  });

  mock.onDelete(/\/projects\/([^/]+)$/).reply((config) => {
    const id = config.url!.match(/\/projects\/([^/]+)$/)?.[1];
    const idx = projects.findIndex((p) => p.id === id);
    if (idx >= 0) projects.splice(idx, 1);
    return mockOk(null);
  });
}
