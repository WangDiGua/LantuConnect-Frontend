// 智能应用

import type { SourceType } from './agent';

export type EmbedType = 'iframe' | 'micro_frontend' | 'redirect';
export type AppStatus = 'draft' | 'published' | 'testing' | 'deprecated';

export interface SmartApp {
  id: number;
  appName: string;
  displayName: string;
  description: string;
  appUrl: string;
  embedType: EmbedType;
  icon: string | null;
  screenshots: string[];
  categoryId: number | null;
  categoryName?: string;
  tags?: string[];
  sourceType: SourceType | 'internal' | 'partner';
  status: AppStatus;
  isPublic: boolean;
  sortOrder: number;
  createTime: string;
  updateTime: string;
}

export interface SmartAppCreatePayload {
  appName: string;
  displayName: string;
  description: string;
  appUrl: string;
  embedType: EmbedType;
  icon?: string;
  screenshots?: string[];
  categoryId?: number;
  sourceType?: SourceType;
  isPublic?: boolean;
}

export interface SmartAppUpdatePayload extends Partial<SmartAppCreatePayload> {
  status?: AppStatus;
  sortOrder?: number;
}

export interface SmartAppListQuery {
  page?: number;
  pageSize?: number;
  keyword?: string;
  status?: AppStatus;
  embedType?: EmbedType;
  categoryId?: number;
  tags?: string[];
}
