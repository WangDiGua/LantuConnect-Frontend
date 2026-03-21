import { http } from '../../lib/http';
import type { PaginatedData } from '../../types/api';
import type {
  Skill,
  SkillCreatePayload,
  SkillUpdatePayload,
  SkillListQuery,
  McpServer,
} from '../../types/dto/skill';

export const skillService = {
  list: (params?: SkillListQuery) =>
    http.get<PaginatedData<Skill>>('/api/v1/skills', { params }),

  getById: (id: number) =>
    http.get<Skill>(`/api/v1/skills/${id}`),

  create: (data: SkillCreatePayload) =>
    http.post<Skill>('/api/v1/skills', data),

  update: (id: number, data: SkillUpdatePayload) =>
    http.put<Skill>(`/api/v1/skills/${id}`, data),

  remove: (id: number) =>
    http.delete(`/api/v1/skills/${id}`),

  listMcpServers: () =>
    http.get<McpServer[]>('/api/v1/mcp-servers'),
};
