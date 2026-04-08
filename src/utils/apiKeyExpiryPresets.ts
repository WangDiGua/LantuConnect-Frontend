/**
 * 创建 API Key 时有效期预设（管理端与个人设置页共用）
 * 与后端 LocalDateTime JSON 反序列化兼容
 */
export type ApiKeyExpiryPreset = 'never' | '1d' | '7d' | '30d';

/** 新建默认：避免全部落库为永不过期 */
export const DEFAULT_API_KEY_EXPIRY_PRESET: ApiKeyExpiryPreset = '30d';

export const API_KEY_EXPIRY_OPTIONS: { preset: ApiKeyExpiryPreset; label: string }[] = [
  { preset: '1d', label: '1 天' },
  { preset: '7d', label: '7 天' },
  { preset: '30d', label: '30 天' },
  { preset: 'never', label: '永不过期' },
];

/** 本地日历日 + 当前时刻，格式与 Spring Boot Jackson LocalDateTime 一致 */
export function computeExpiresAtForPreset(preset: ApiKeyExpiryPreset): string | undefined {
  if (preset === 'never') return undefined;
  const addDays = preset === '1d' ? 1 : preset === '7d' ? 7 : 30;
  const d = new Date();
  d.setDate(d.getDate() + addDays);
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  const s = String(d.getSeconds()).padStart(2, '0');
  return `${y}-${mo}-${day}T${h}:${min}:${s}`;
}
