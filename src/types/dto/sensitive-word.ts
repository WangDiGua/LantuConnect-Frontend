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

/** 敏感词专用固定分类（与资源 Tag / 五类资源无关）；顺序与后端 SensitiveWordFixedCategories 一致。存库为稳定英文 code，界面展示中文 label（同公告「类型」模式）。 */
export const SENSITIVE_WORD_CATEGORY_PRESETS = [
  'default',
  'general',
  'review',
  'user_profile',
  'announcement',
  'other',
] as const;

/** 管理端下拉展示用中文（对应存库的 code） */
export const SENSITIVE_WORD_CATEGORY_LABELS: Record<string, string> = {
  default: '默认',
  general: '全站通用',
  review: '评论与反馈',
  user_profile: '用户资料',
  announcement: '公告与通知',
  other: '其他场景',
};

/** 新增/批量/导入时的默认分类（与 AnnouncementPage 中默认 `notice` 类似） */
export const DEFAULT_SENSITIVE_WORD_CATEGORY: (typeof SENSITIVE_WORD_CATEGORY_PRESETS)[number] = 'general';

/** 与 `AnnouncementPage` 的 `TYPE_OPTIONS` 相同用法：固定 `{ value, label }` 下拉 */
export const SENSITIVE_WORD_CATEGORY_OPTIONS: { value: string; label: string }[] = (
  SENSITIVE_WORD_CATEGORY_PRESETS as readonly string[]
).map((code) => ({
  value: code,
  label: SENSITIVE_WORD_CATEGORY_LABELS[code] ?? code,
}));

const PRESET_CATEGORY_SET = new Set<string>(SENSITIVE_WORD_CATEGORY_PRESETS);

export function isSensitiveWordPresetCategory(code: string): boolean {
  return PRESET_CATEGORY_SET.has((code ?? '').trim());
}

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
