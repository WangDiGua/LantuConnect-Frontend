import React, { type ReactElement, useEffect, useMemo, useRef } from 'react';
import type { Theme } from '../../types';
import { BentoCard } from '../common/BentoCard';
import { tableBodyRow, tableCell, tableHeadCell } from '../../utils/uiClasses';
import { lantuCheckboxPrimaryClass } from '../../utils/formFieldClasses';

export interface MgmtDataTableColumn<T> {
  id: string;
  header: React.ReactNode;
  headerClassName?: string;
  cell: (row: T) => React.ReactNode;
  cellClassName?: string;
}

export interface MgmtDataTableSelectionConfig<T> {
  /** 与 `getRowKey` 字符串化结果一致 */
  selectedKeys: ReadonlySet<string>;
  onSelectionChange: (next: Set<string>) => void;
  /** 返回 false 时该行不可勾选（不纳入全选当前页） */
  getSelectable?: (row: T, index: number) => boolean;
}

export interface MgmtDataTableProps<T> {
  theme: Theme;
  columns: MgmtDataTableColumn<T>[];
  rows: T[];
  /** 第二参数为行序索引，便于时间序列等无稳定 id 的行 */
  getRowKey: (row: T, index: number) => string | number;
  /** 无数据时渲染（不传则由父组件控制是否挂载表格） */
  empty?: React.ReactNode;
  /** table min-width，宽表格便于横向滚动 */
  minWidth?: string;
  /**
   * `plain`：仅横向滚动 + 表（适合已包在 MgmtPageShell 大卡片内，避免套 Bento）。
   * `card`：外层 BentoCard，用于未包壳的独立列表块。
   */
  surface?: 'plain' | 'card';
  /** 多选；首列追加 checkbox，表头支持「当前页全选」 */
  selection?: MgmtDataTableSelectionConfig<T>;
}

function keyStr(getRowKey: (row: unknown, index: number) => string | number, row: unknown, index: number): string {
  return String(getRowKey(row, index));
}

/**
 * 管理端列表统一表格：默认 plain（壳内列表）；可选 BentoCard 包裹。
 */
export function MgmtDataTable<T>({
  theme,
  columns,
  rows,
  getRowKey,
  empty,
  minWidth = '56rem',
  surface = 'plain',
  selection,
}: MgmtDataTableProps<T>): ReactElement | null {
  const isDark = theme === 'dark';
  const headerSelectRef = useRef<HTMLInputElement>(null);

  const selectableMeta = useMemo(() => {
    const entries = rows.map((row, idx) => {
      const k = keyStr(getRowKey, row, idx);
      const selectable = selection?.getSelectable ? selection.getSelectable(row, idx) !== false : true;
      return { row, idx, key: k, selectable };
    });
    const selectableKeys = entries.filter((e) => e.selectable).map((e) => e.key);
    return { entries, selectableKeys };
  }, [rows, getRowKey, selection]);

  const allPageSelectableSelected =
    selection != null &&
    selectableMeta.selectableKeys.length > 0 &&
    selectableMeta.selectableKeys.every((k) => selection.selectedKeys.has(k));
  const somePageSelectableSelected =
    selection != null &&
    selectableMeta.selectableKeys.some((k) => selection.selectedKeys.has(k)) &&
    !allPageSelectableSelected;

  useEffect(() => {
    const el = headerSelectRef.current;
    if (!el) return;
    el.indeterminate = Boolean(somePageSelectableSelected);
  }, [somePageSelectableSelected, selection, rows.length]);

  if (rows.length === 0) {
    return empty ? <>{empty}</> : null;
  }

  const togglePageAll = () => {
    if (!selection) return;
    const next = new Set(selection.selectedKeys);
    if (allPageSelectableSelected) {
      selectableMeta.selectableKeys.forEach((k) => next.delete(k));
    } else {
      selectableMeta.selectableKeys.forEach((k) => next.add(k));
    }
    selection.onSelectionChange(next);
  };

  const toggleRow = (key: string, selectable: boolean) => {
    if (!selection || !selectable) return;
    const next = new Set(selection.selectedKeys);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    selection.onSelectionChange(next);
  };

  const tableBlock = (
    <div className="overflow-x-auto">
      <table className="w-full text-sm" style={{ minWidth }}>
        <thead className={`border-b ${isDark ? 'border-white/[0.06]' : 'border-slate-100'}`}>
          <tr>
            {selection ? (
              <th
                scope="col"
                className={[tableHeadCell(theme), 'w-10 align-middle'].filter(Boolean).join(' ')}
              >
                <input
                  ref={headerSelectRef}
                  type="checkbox"
                  className={lantuCheckboxPrimaryClass}
                  checked={allPageSelectableSelected}
                  onChange={togglePageAll}
                  aria-label="全选当前页"
                  disabled={selectableMeta.selectableKeys.length === 0}
                />
              </th>
            ) : null}
            {columns.map((col) => (
              <th
                key={col.id}
                scope="col"
                className={[tableHeadCell(theme), col.headerClassName ?? ''].filter(Boolean).join(' ')}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {selectableMeta.entries.map(({ row, idx, key, selectable }) => (
            <tr key={key} className={tableBodyRow(theme, idx)}>
              {selection ? (
                <td className={[tableCell(), 'w-10 align-middle'].join(' ')}>
                  <input
                    type="checkbox"
                    className={lantuCheckboxPrimaryClass}
                    checked={selection.selectedKeys.has(key)}
                    disabled={!selectable}
                    onChange={() => toggleRow(key, selectable)}
                    aria-label={selectable ? '选择此行' : '此行不可选'}
                  />
                </td>
              ) : null}
              {columns.map((col) => (
                <td
                  key={col.id}
                  className={[tableCell(), 'min-w-0', col.cellClassName ?? ''].filter(Boolean).join(' ')}
                >
                  {col.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  if (surface === 'card') {
    return (
      <BentoCard theme={theme} padding="sm" className="overflow-hidden">
        {tableBlock}
      </BentoCard>
    );
  }

  return tableBlock;
}
