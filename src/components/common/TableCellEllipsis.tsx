import React from 'react';
import { Tooltip } from './Tooltip';

export interface TableCellEllipsisProps {
  text: string | null | undefined;
  /** 追加在截断文本上的 class（如主题色） */
  className?: string;
  mono?: boolean;
  emptyLabel?: string;
}

/**
 * 表格单元格内单行省略；悬停 / 键盘聚焦显示完整内容（{@link Tooltip}）。
 * 配合列 `max-w-*` 与 `min-w-0` 使用。
 */
export const TableCellEllipsis: React.FC<TableCellEllipsisProps> = ({
  text,
  className = '',
  mono = false,
  emptyLabel = '\u2014',
}) => {
  const raw = typeof text === 'string' ? text : '';
  const trimmed = raw.trim();
  if (!trimmed) {
    return <span className={className}>{emptyLabel}</span>;
  }

  return (
    <Tooltip
      content={raw}
      wrapContent
      preferSingleLine={mono}
      focusableTrigger
      triggerClassName="flex w-full min-w-0 max-w-full"
      preferredSide="auto"
    >
      <span
        className={`block w-full min-w-0 cursor-default truncate ${mono ? 'font-mono text-[12px]' : ''} ${className}`.trim()}
      >
        {raw}
      </span>
    </Tooltip>
  );
};
