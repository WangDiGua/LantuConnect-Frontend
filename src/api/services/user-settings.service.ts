import { http } from '../../lib/http';
import type {
  CreateUserApiKeyPayload,
  UserApiKey,
  UserStats,
  UserWorkspace,
} from '../../types/dto/user-settings';

export const userSettingsService = {
  getWorkspace: () =>
    http.get<UserWorkspace>('/user-settings/workspace'),

  updateWorkspace: (data: Partial<Omit<UserWorkspace, 'id' | 'createdAt' | 'updatedAt'>>) =>
    http.put<UserWorkspace>('/user-settings/workspace', data),

  listApiKeys: () =>
    http.get<UserApiKey[]>('/user-settings/api-keys'),

  createApiKey: (data: CreateUserApiKeyPayload) =>
    http.post<UserApiKey & { plainKey: string }>('/user-settings/api-keys', data),

  deleteApiKey: (id: string) =>
    http.delete(`/user-settings/api-keys/${id}`),

  getStats: () => http.get<UserStats>('/user-settings/stats'),
};
