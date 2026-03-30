import type { PaginatedData } from '../types/api';

function numPg(v: unknown, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * 将接口 data 规范为数组：兼容裸数组及 list / records / data / items 等分页包装字段。
 * 避免页面侧对非数组调用 .map / .filter 报错。
 */
export function extractArray<T = unknown>(raw: unknown): T[] {
  if (raw == null) return [];
  if (Array.isArray(raw)) return raw as T[];
  if (typeof raw !== 'object') return [];
  const o = raw as Record<string, unknown>;
  const inner =
    (Array.isArray(o.list) ? o.list : null)
    ?? (Array.isArray(o.records) ? o.records : null)
    ?? (Array.isArray(o.items) ? o.items : null)
    ?? (Array.isArray(o.data) ? o.data : null);
  return (inner ?? []) as T[];
}

/**
 * 将分页类响应规范为 PaginatedData：兼容 MyBatis records/current/size 与 list/page/pageSize 等。
 */
export function normalizePaginated<T>(raw: unknown, mapItem?: (row: unknown) => T): PaginatedData<T> {
  const empty = (ps: number): PaginatedData<T> => ({
    list: [],
    total: 0,
    page: 1,
    pageSize: ps,
  });

  const mapRows = (rows: unknown[]): T[] => (mapItem ? rows.map(mapItem) : (rows as T[]));

  if (raw == null) return empty(20);
  if (Array.isArray(raw)) {
    const list = mapRows(raw);
    return {
      list,
      total: list.length,
      page: 1,
      pageSize: list.length || 20,
    };
  }
  if (typeof raw !== 'object') return empty(20);

  const o = raw as Record<string, unknown>;
  const inner =
    (Array.isArray(o.list) ? o.list : null)
    ?? (Array.isArray(o.records) ? o.records : null)
    ?? (Array.isArray(o.data) ? o.data : null)
    ?? (Array.isArray(o.items) ? o.items : null)
    ?? [];

  const list = mapRows(inner);
  const pageSize = numPg(o.pageSize ?? o.size, 20) || 20;

  return {
    list,
    total: numPg(o.total ?? o.totalCount, list.length),
    page: numPg(o.page ?? o.current, 1) || 1,
    pageSize,
  };
}
