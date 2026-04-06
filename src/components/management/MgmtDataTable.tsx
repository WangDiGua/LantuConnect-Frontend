import React, { type ReactElement } from 'react';
import type { Theme } from '../../types';
import { BentoCard } from '../common/BentoCard';
import { tableBodyRow, tableCell, tableHeadCell } from '../../utils/uiClasses';

export interface MgmtDataTableColumn<T> {
  id: string;
  header: React.ReactNode;
  headerClassName?: string;
  cell: (row: T) => React.ReactNode;
  cellClassName?: string;
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
}: MgmtDataTableProps<T>): ReactElement | null {
  const isDark = theme === 'dark';

  if (rows.length === 0) {
    return empty ? <>{empty}</> : null;
  }

  const tableBlock = (
    <div className="overflow-x-auto">
      <table className="w-full text-sm" style={{ minWidth }}>
        <thead className={`border-b ${isDark ? 'border-white/[0.06]' : 'border-slate-100'}`}>
          <tr>
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
          {rows.map((row, idx) => (
            <tr key={getRowKey(row, idx)} className={tableBodyRow(theme, idx)}>
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
