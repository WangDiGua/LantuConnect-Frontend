import React from 'react';
import { Editor } from '@bytemd/react';
import gfm from '@bytemd/plugin-gfm';
import type { Theme } from '../../types';
import { textMuted } from '../../utils/uiClasses';
import 'bytemd/dist/index.css';
import './review-markdown-editor.css';

const PLUGINS = [gfm()];

const LOCALE = {
  write: '编辑',
  preview: '预览',
  source: '源码',
  fullscreen: '全屏',
  exitFullscreen: '退出全屏',
  help: '帮助',
  top: '回到顶部',
  words: '字数',
  lines: '行数',
};

export interface ReviewMarkdownEditorProps {
  theme: Theme;
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  /** 主评价区略高，回复区更紧凑 */
  variant?: 'default' | 'compact';
  className?: string;
}

export const ReviewMarkdownEditor: React.FC<ReviewMarkdownEditorProps> = ({
  theme,
  value,
  onChange,
  placeholder = '支持 Markdown：列表、代码块、链接等',
  variant = 'default',
  className = '',
}) => {
  const isDark = theme === 'dark';
  return (
    <div
      className={[
        'review-md-editor',
        variant === 'compact' ? 'review-md-editor--compact' : '',
        isDark ? 'review-md-editor--dark' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <Editor value={value} plugins={PLUGINS} locale={LOCALE} onChange={onChange} mode="tab" />
      {placeholder ? <p className={`mt-1.5 text-[11px] ${textMuted(theme)}`}>{placeholder}</p> : null}
    </div>
  );
};
