import { http } from '../../lib/http';
import type { PaginationParams } from '../../types/api';
import type {
  DocumentAsset,
  MemoryEntry,
  PromptTemplate,
  SecretEntry,
  TermEntry,
} from '../../types/dto/asset';

export interface CreatePromptPayload {
  name: string;
  content: string;
  description?: string;
  category?: string;
  variables?: PromptTemplate['variables'];
  tags?: string[];
}

export interface CreateSecretPayload {
  key: string;
  value: string;
  scope?: 'project' | 'global';
  name?: string;
  type?: SecretEntry['type'];
  description?: string;
  expiresAt?: string;
}

export interface CreateMemoryPayload {
  userId?: string;
  content?: string;
  key?: string;
  value?: string;
  scope?: MemoryEntry['scope'];
  agentId?: string;
  ttl?: number;
}

export interface CreateTermPayload {
  term: string;
  definition: string;
  category?: string;
  synonyms?: string[];
}

export const assetService = {
  listPrompts: (params?: PaginationParams) =>
    http.get<PromptTemplate[]>('/assets/prompts', { params }),

  createPrompt: (data: CreatePromptPayload) =>
    http.post<PromptTemplate>('/assets/prompts', data),

  updatePrompt: (id: string, data: Partial<CreatePromptPayload>) =>
    http.put<PromptTemplate>(`/assets/prompts/${id}`, data),

  deletePrompt: (id: string) => http.delete(`/assets/prompts/${id}`),

  listTerms: () => http.get<TermEntry[]>('/assets/terms'),

  createTerm: (data: CreateTermPayload) =>
    http.post<TermEntry>('/assets/terms', data),

  deleteTerm: (id: string) => http.delete(`/assets/terms/${id}`),

  listSecrets: () => http.get<SecretEntry[]>('/assets/secrets'),

  createSecret: (data: CreateSecretPayload) =>
    http.post<SecretEntry>('/assets/secrets', data),

  deleteSecret: (id: string) => http.delete(`/assets/secrets/${id}`),

  listMemories: () => http.get<MemoryEntry[]>('/assets/memories'),

  createMemory: (data: CreateMemoryPayload) =>
    http.post<MemoryEntry>('/assets/memories', data),

  deleteMemory: (id: string) => http.delete(`/assets/memories/${id}`),

  listDocuments: () => http.get<DocumentAsset[]>('/assets/documents'),

  uploadDocument: (formData: FormData) =>
    http.upload<DocumentAsset>('/assets/documents', formData),
};
