import { http } from '../../lib/http';
import type { PaginatedData, PaginationParams } from '../../types/api';
import type {
  Agent,
  AgentCreatePayload,
  AgentMarketItem,
  AgentVersion,
  DebugMessageRequest,
  DebugMessageResponse,
} from '../../types/dto/agent';

export const agentService = {
  list: (params?: PaginationParams) =>
    http.get<PaginatedData<Agent>>('/agents', { params }),

  getById: (id: string) => http.get<Agent>(`/agents/${id}`),

  create: (data: AgentCreatePayload) => http.post<Agent>('/agents', data),

  update: (id: string, data: Partial<AgentCreatePayload>) =>
    http.put<Agent>(`/agents/${id}`, data),

  delete: (id: string) => http.delete(`/agents/${id}`),

  listVersions: (agentId: string) =>
    http.get<AgentVersion[]>(`/agents/${agentId}/versions`),

  sendDebugMessage: (data: DebugMessageRequest) =>
    http.post<DebugMessageResponse>('/agents/debug', data),

  listMarket: (params?: PaginationParams) =>
    http.get<PaginatedData<AgentMarketItem>>('/agents/market', { params }),
};
