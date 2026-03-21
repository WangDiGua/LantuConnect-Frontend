import { http } from '../../lib/http';
import type { AgentVersion } from '../../types/dto/agent';

export const versionService = {
  list: (agentId: number) =>
    http.get<AgentVersion[]>(`/agents/${agentId}/versions`),

  create: (agentId: number, payload: { version: string; changelog: string }) =>
    http.post<AgentVersion>(`/agents/${agentId}/versions`, payload),

  publish: (versionId: number) =>
    http.post<void>(`/versions/${versionId}/publish`),

  rollback: (versionId: number) =>
    http.post<void>(`/versions/${versionId}/rollback`),
};
