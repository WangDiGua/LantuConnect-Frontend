import React, { useEffect, useState } from 'react';
import type { Theme } from '../../types';
import { VditorMarkdownEditor } from './VditorMarkdownEditor';
import './review-markdown-editor.css';

export interface ReviewMarkdownEditorProps {
  theme: Theme;
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  /** 主评价区略高，回复区更紧凑 */
  variant?: 'default' | 'compact';
  className?: string;
  /**
   * `split` / `auto`（宽屏）：分屏编辑+预览；`tab` / `auto`（窄屏）：即时渲染单栏。
   */
  editorMode?: 'tab' | 'split' | 'auto';
  /**
   * 资源注册等表单：隐藏预览区「Desktop / Tablet / Mobile」等多设备切换条，仍保留左侧编辑+右侧实时预览（`auto` 宽屏为分屏）。
   */
  stripPreviewDeviceBar?: boolean;
}

export const ReviewMarkdownEditor: React.FC<ReviewMarkdownEditorProps> = ({
  theme,
  value,
  onChange,
  placeholder = '支持 Markdown：列表、代码块、链接等',
  variant = 'default',
  className = '',
  editorMode = 'split',
  stripPreviewDeviceBar = false,
}) => {
  const isDark = theme === 'dark';

  const minHeight = variant === 'compact' ? 160 : 240;

  const [autoMode, setAutoMode] = useState<'sv' | 'ir'>(() =>
    typeof window !== 'undefined' && window.matchMedia('(min-width: 800px)').matches ? 'sv' : 'ir',
  );

  useEffect(() => {
    if (editorMode !== 'auto') return;
    const mq = window.matchMedia('(min-width: 800px)');
    const apply = () => setAutoMode(mq.matches ? 'sv' : 'ir');
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [editorMode]);

  const vdMode: 'sv' | 'ir' =
    editorMode === 'tab' ? 'ir' : editorMode === 'split' ? 'sv' : autoMode;

  const embedPreset = stripPreviewDeviceBar ? 'formSplit' : 'default';

  return (
    <div
      className={[
        'review-md-editor',
        variant === 'compact' ? 'review-md-editor--compact' : '',
        isDark ? 'review-md-editor--dark' : '',
        stripPreviewDeviceBar ? 'review-md-editor--form-split' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <VditorMarkdownEditor
        key={vdMode}
        isDark={isDark}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        minHeight={minHeight}
        mode={vdMode}
        embedPreset={embedPreset}
      />
    </div>
  );
};
