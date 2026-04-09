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
  /** 来源（与 `SENSITIVE_WORD_SOURCE_PRESETS` 一致；需后端 PUT 支持） */
  source?: string;
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

/** 严重级别 1–10，数值越大处置越严格（与历史库整型字段一致） */
export const SENSITIVE_WORD_SEVERITY_LEVELS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

const SEVERITY_LABELS: Record<number, string> = {
  1: '提示',
  2: '较轻',
  3: '一般',
  4: '较高',
  5: '高',
  6: '很高',
  7: '严重',
  8: '很重',
  9: '极高',
  10: '阻断',
};

export const DEFAULT_SENSITIVE_WORD_SEVERITY = 1;

export const SENSITIVE_WORD_SEVERITY_OPTIONS: { value: string; label: string }[] =
  SENSITIVE_WORD_SEVERITY_LEVELS.map((n) => ({
    value: String(n),
    label: `${n} · ${SEVERITY_LABELS[n]}`,
  }));

export function normalizeSensitiveWordSeverity(raw: unknown): number {
  const v = Math.round(Number(raw));
  if (!Number.isFinite(v)) return DEFAULT_SENSITIVE_WORD_SEVERITY;
  return Math.max(1, Math.min(10, v));
}

export function formatSensitiveWordSeverityLabel(severity: unknown): string {
  const n = normalizeSensitiveWordSeverity(severity);
  return `${n} · ${SEVERITY_LABELS[n]}`;
}

/** 来源：与导入/批量路径及运营录入方式对齐（非资源 Tag） */
export const SENSITIVE_WORD_SOURCE_PRESETS = [
  'manual',
  'seed',
  'json_batch',
  'txt_upload',
  'csv_upload',
  'xlsx_upload',
  'policy_sync',
  'other',
] as const;

export const SENSITIVE_WORD_SOURCE_LABELS: Record<string, string> = {
  manual: '手工录入',
  seed: '演示/种子数据',
  json_batch: 'JSON 批量',
  txt_upload: 'TXT 文件导入',
  csv_upload: 'CSV 文件导入',
  xlsx_upload: 'Excel 导入',
  policy_sync: '策略同步',
  other: '其他',
};

export const DEFAULT_SENSITIVE_WORD_SOURCE_MANUAL: (typeof SENSITIVE_WORD_SOURCE_PRESETS)[number] = 'manual';
export const DEFAULT_SENSITIVE_WORD_SOURCE_BATCH: (typeof SENSITIVE_WORD_SOURCE_PRESETS)[number] = 'json_batch';
export const DEFAULT_SENSITIVE_WORD_SOURCE_IMPORT: (typeof SENSITIVE_WORD_SOURCE_PRESETS)[number] = 'txt_upload';

export const SENSITIVE_WORD_SOURCE_OPTIONS: { value: string; label: string }[] = (
  SENSITIVE_WORD_SOURCE_PRESETS as readonly string[]
).map((code) => ({
  value: code,
  label: SENSITIVE_WORD_SOURCE_LABELS[code] ?? code,
}));

const PRESET_SOURCE_SET = new Set<string>(SENSITIVE_WORD_SOURCE_PRESETS);

export function isSensitiveWordPresetSource(code: string): boolean {
  return PRESET_SOURCE_SET.has((code ?? '').trim());
}

export function formatSensitiveWordSourceLabel(code: string | undefined | null): string {
  const c = (code ?? '').trim();
  if (!c) return '—';
  return SENSITIVE_WORD_SOURCE_LABELS[c] ?? c;
}

export interface SensitiveWordImportResult {
  added: number;
  candidates: number;
  skippedBlankOrComment: number;
  skippedTooLong: number;
  skippedDuplicate: number;
}
