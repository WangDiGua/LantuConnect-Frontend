import { http } from '../../lib/http';
import { normalizePaginated } from '../../utils/normalizeApiPayload';
import type { PaginatedData } from '../../types/api';
import type { Notification } from '../../types/dto/notification';

export const notificationService = {
  list: (params?: {
    page?: number;
    pageSize?: number;
    type?: string;
    category?: string;
    severity?: string;
    flowStatus?: string;
    isRead?: boolean;
    startTime?: string;
    endTime?: string;
  }) =>
    http.get<PaginatedData<Notification>>('/notifications', { params }),

  getById: (id: number) =>
    http.get<Notification>(`/notifications/${id}`),

  getUnreadCount: () =>
    http.get<{ count: number }>('/notifications/unread-count'),

  markRead: (id: number) =>
    http.post<void>(`/notifications/${id}/read`),

  markAllRead: () =>
    http.post<void>('/notifications/read-all'),
};
