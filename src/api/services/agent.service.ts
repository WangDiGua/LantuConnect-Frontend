import { http } from '../../lib/http';
import type { PaginatedData } from '../../types/api';
import type {
  Agent,
  AgentCreatePayload,
  AgentUpdatePayload,
  AgentListQuery,
} from '../../types/dto/agent';

export const agentService = {
  list: (query?: AgentListQuery) =>
    http.get<PaginatedData<Agent>>('/agents', { params: query }),

  getById: (id: number) => http.get<Agent>(`/agents/${id}`),

  create: (payload: AgentCreatePayload) =>
    http.post<Agent>('/agents', payload),

  update: (id: number, payload: AgentUpdatePayload) =>
    http.put<Agent>(`/agents/${id}`, payload),

  remove: (id: number) => http.delete(`/agents/${id}`),
};
