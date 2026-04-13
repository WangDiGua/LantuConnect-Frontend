export interface Notification {
  id: number;
  userId: number;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  sourceType: string | null;
  sourceId: string | null;
  createTime: string;
  category?: 'workflow' | 'notice' | 'alert' | 'system' | 'security' | string | null;
  severity?: 'info' | 'success' | 'warning' | 'error' | string | null;
  aggregateKey?: string | null;
  flowStatus?: 'running' | 'success' | 'failed' | 'warning' | string | null;
  currentStep?: number | null;
  totalSteps?: number | null;
  stepsJson?: string | null;
  actionLabel?: string | null;
  actionUrl?: string | null;
  metadataJson?: string | null;
  updateTime?: string | null;
  lastEventTime?: string | null;
}
