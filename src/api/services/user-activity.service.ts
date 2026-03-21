import { http } from '../../lib/http';
import type { PaginatedData } from '../../types/api';
import type {
  UsageRecord,
  FavoriteItem,
  UserUsageStats,
  MyPublishItem,
} from '../../types/dto/user-activity';

export const userActivityService = {
  getUsageRecords: (query?: { page?: number; pageSize?: number; range?: string; type?: string }) =>
    http.get<PaginatedData<UsageRecord>>('/user/usage-records', { params: query }),

  getFavorites: () =>
    http.get<FavoriteItem[]>('/user/favorites'),

  removeFavorite: (id: number) =>
    http.delete(`/user/favorites/${id}`),

  addFavorite: (targetType: string, targetId: number) =>
    http.post<void>('/user/favorites', { targetType, targetId }),

  getUsageStats: () =>
    http.get<UserUsageStats>('/user/usage-stats'),

  getMyAgents: () =>
    http.get<MyPublishItem[]>('/user/my-agents'),

  getMySkills: () =>
    http.get<MyPublishItem[]>('/user/my-skills'),
};
