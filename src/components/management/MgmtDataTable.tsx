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
  getRowKey: (row: T) => string | number;
  /** 无数据时渲染（不传则由父组件控制是否挂载表格） */
  empty?: React.ReactNode;
  /** table min-width，宽表格便于横向滚动 */
  minWidth?: string;
}

/**
 * 管理端列表统一表格：BentoCard + 横向滚动 + tableHeadCell/tableBodyRow/tableCell
 */
export function MgmtDataTable<T>({
  theme,
  columns,
  rows,
  getRowKey,
  empty,
  minWidth = '56rem',
}: MgmtDataTableProps<T>): ReactElement | null {
  const isDark = theme === 'dark';

  if (rows.length === 0) {
    return empty ? <>{empty}</> : null;
  }

  return (
    <BentoCard theme={theme} padding="sm" className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm" style={{ minWidth }}>
          <thead className={`border-b ${isDark ? 'border-white/[0.06]' : 'border-slate-100'}`}>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.id}
                  className={[tableHeadCell(theme), col.headerClassName ?? ''].filter(Boolean).join(' ')}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={getRowKey(row)} className={tableBodyRow(theme, idx)}>
                {columns.map((col) => (
                  <td
                    key={col.id}
                    className={[tableCell(), col.cellClassName ?? ''].filter(Boolean).join(' ')}
                  >
                    {col.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </BentoCard>
  );
}
