/** 全站统一展示：本地时区 `YYYY-MM-DD HH:mm:ss` */

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function parseToDate(input: string | number | Date): Date | null {
  if (input instanceof Date) {
    return Number.isNaN(input.getTime()) ? null : input;
  }
  if (typeof input === 'number') {
    const d = new Date(input);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const s = String(input).trim();
  if (!s) return null;

  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (dateOnly) {
    const y = Number(dateOnly[1]);
    const mo = Number(dateOnly[2]);
    const day = Number(dateOnly[3]);
    const d = new Date(y, mo - 1, day, 0, 0, 0, 0);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * @param empty 无法解析或空值时展示文案（默认 「—」）
 */
export function formatDateTime(
  input: string | number | Date | null | undefined,
  empty = '—',
): string {
  if (input === null || input === undefined) return empty;
  if (typeof input === 'string' && !input.trim()) return empty;
  const d = parseToDate(input);
  if (!d) return empty;
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}

/** 过滤公告摘要里误写入的无效文案（如相对时间计算失败产生的 NaN） */
export function cleanAnnouncementSummary(input: string | null | undefined): string | null {
  const s = input?.trim();
  if (!s) return null;
  if (/\bNaN\b/i.test(s)) return null;
  return s;
}
