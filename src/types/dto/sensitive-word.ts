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

/** 与后端预设分类一致（兜底）；实际以下拉接口为准。 */
export const SENSITIVE_WORD_CATEGORY_PRESETS = [
  'agent',
  'skill',
  'mcp',
  'app',
  'dataset',
  'general',
  'default',
] as const;

export interface SensitiveWordImportResult {
  added: number;
  candidates: number;
  skippedBlankOrComment: number;
  skippedTooLong: number;
  skippedDuplicate: number;
}
