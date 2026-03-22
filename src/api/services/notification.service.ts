import { http } from '../../lib/http';
import type { MpPageData } from '../../types/api';
import type { Notification } from '../../types/dto/notification';

export const notificationService = {
  list: (params?: { page?: number; pageSize?: number }) =>
    http.get<MpPageData<Notification>>('/notifications', { params }),

  getUnreadCount: () =>
    http.get<{ count: number }>('/notifications/unread-count'),

  markRead: (id: number) =>
    http.post<void>(`/notifications/${id}/read`),

  markAllRead: () =>
    http.post<void>('/notifications/read-all'),
};
