export interface Notification {
  id: number;
  userId: number;
  type: 'system' | 'notice' | 'alert';
  title: string;
  body: string;
  isRead: boolean;
  sourceType: string | null;
  sourceId: string | null;
  createTime: string;
}
