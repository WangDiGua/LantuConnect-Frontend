export interface SensitiveWord {
  id: number;
  word: string;
  category: string;
  severity?: number;
  source?: string;
  enabled: boolean;
  createdBy?: string;
  createdByName?: string;
  createTime?: string;
  updateTime?: string;
}

export interface SensitiveWordAddRequest {
  word: string;
  category?: string;
  severity?: number;
  source?: string;
}

export interface SensitiveWordBatchAddRequest {
  words: string[];
  category?: string;
  severity?: number;
  source?: string;
}

export interface SensitiveWordUpdateRequest {
  category?: string;
  severity?: number;
  enabled?: boolean;
}

export interface SensitiveWordCheckRequest {
  text: string;
}

export interface SensitiveWordCheckResult {
  containsSensitive: boolean;
  sensitiveWords: string[];
  filteredText: string;
}

export interface SensitiveWordCategoryCount {
  category: string;
  count: number;
}

/** 敏感词专用固定分类（与资源 Tag / 五类资源无关）；顺序与后端 SensitiveWordFixedCategories 一致。 */
export const SENSITIVE_WORD_CATEGORY_PRESETS = [
  'default',
  'general',
  'review',
  'user_profile',
  'announcement',
  'other',
] as const;

/** 管理端展示用中文说明（存库仍为左侧 code） */
export const SENSITIVE_WORD_CATEGORY_LABELS: Record<string, string> = {
  default: '默认',
  general: '全站通用',
  review: '评论与反馈',
  user_profile: '用户资料',
  announcement: '公告与通知',
  other: '其他场景',
};

export function formatSensitiveWordCategoryLabel(code: string): string {
  const c = code?.trim() ?? '';
  return SENSITIVE_WORD_CATEGORY_LABELS[c] ?? c;
}

export interface SensitiveWordImportResult {
  added: number;
  candidates: number;
  skippedBlankOrComment: number;
  skippedTooLong: number;
  skippedDuplicate: number;
}
