function normalizeText(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  return s ? s : null;
}

/**
 * 人员展示统一策略：
 * 1) *Name 字段
 * 2) username / nickname
 * 3) 用户#{id}
 */
export function resolvePersonDisplay(options: {
  names?: unknown[];
  usernames?: unknown[];
  ids?: unknown[];
  empty?: string;
}): string {
  const empty = options.empty ?? '—';

  for (const value of options.names ?? []) {
    const text = normalizeText(value);
    if (text) return text;
  }

  for (const value of options.usernames ?? []) {
    const text = normalizeText(value);
    if (text) return text;
  }

  for (const value of options.ids ?? []) {
    const text = normalizeText(value);
    if (text) return `用户#${text}`;
  }

  return empty;
}
