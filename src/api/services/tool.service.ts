import { http } from '../../lib/http';
import type { PaginatedData, PaginationParams } from '../../types/api';
import type {
  CreateMcpServerPayload,
  McpServer,
  ToolItem,
  ToolReview,
} from '../../types/dto/tool';

export const toolService = {
  discover: (params?: PaginationParams) =>
    http.get<PaginatedData<ToolItem>>('/tools/discover', { params }),

  listMine: () => http.get<McpServer[]>('/tools/mine'),

  createMcpServer: (data: CreateMcpServerPayload) =>
    http.post<McpServer>('/tools/mcp-servers', data),

  updateMcpServer: (id: string, data: Partial<CreateMcpServerPayload>) =>
    http.put<McpServer>(`/tools/mcp-servers/${id}`, data),

  deleteMcpServer: (id: string) =>
    http.delete(`/tools/mcp-servers/${id}`),

  listReviews: (params?: PaginationParams) =>
    http.get<PaginatedData<ToolReview>>('/tools/reviews', { params }),

  updateReview: (id: string, data: Pick<ToolReview, 'status' | 'reviewNote'>) =>
    http.patch<ToolReview>(`/tools/reviews/${id}`, data),
};
