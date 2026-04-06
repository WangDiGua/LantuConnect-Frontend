import React, { useEffect, useRef } from 'react';
import Vditor from 'vditor';
import 'vditor/dist/index.css';

function vditorCdnPrefix(): string {
  const base = import.meta.env.BASE_URL ?? '/';
  return `${String(base).replace(/\/$/, '')}/vditor`;
}

/** 无上传配置的通用工具栏：与评论区/公告编辑共用，避免误点上传 */
const SHARED_TOOLBAR = [
  'emoji',
  'headings',
  'bold',
  'italic',
  'strike',
  'link',
  '|',
  'list',
  'ordered-list',
  'check',
  'outdent',
  'indent',
  '|',
  'quote',
  'line',
  'code',
  'inline-code',
  'insert-before',
  'insert-after',
  '|',
  'table',
  '|',
  'undo',
  'redo',
  '|',
  'fullscreen',
  'edit-mode',
  {
    name: 'more',
    toolbar: ['both', 'code-theme', 'content-theme', 'export', 'outline', 'preview', 'help'],
  },
];

export interface VditorMarkdownEditorProps {
  /** 明亮 / 暗黑外观 */
  isDark: boolean;
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  /** 编辑器最小高度（px） */
  minHeight: number;
  /** `sv` 分屏；`ir` 即时渲染（偏单栏） */
  mode: 'sv' | 'ir';
  className?: string;
}

/**
 * Vditor 封装：同源 CDN、销毁重建与受控 value 同步。
 */
export const VditorMarkdownEditor: React.FC<VditorMarkdownEditorProps> = ({
  isDark,
  value,
  onChange,
  placeholder = '',
  minHeight,
  mode,
  className = '',
}) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const instRef = useRef<Vditor | null>(null);
  const readyRef = useRef(false);
  const onChangeRef = useRef(onChange);
  const valueRef = useRef(value);
  onChangeRef.current = onChange;
  valueRef.current = value;

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;

    readyRef.current = false;
    el.innerHTML = '';

    const vd = new Vditor(el, {
      cdn: vditorCdnPrefix(),
      width: '100%',
      height: minHeight,
      minHeight,
      theme: isDark ? 'dark' : 'classic',
      lang: 'zh_CN',
      mode,
      value,
      placeholder,
      cache: { enable: false },
      toolbar: [...SHARED_TOOLBAR],
      preview: {
        theme: { current: isDark ? 'dark' : 'light' },
        markdown: { gfmAutoLink: true },
      },
      counter: {
        enable: true,
        type: 'markdown',
      },
      after() {
        readyRef.current = true;
        instRef.current = vd;
        const v = valueRef.current;
        if (vd.getValue() !== v) vd.setValue(v);
      },
      input(v) {
        onChangeRef.current(v);
      },
    });

    instRef.current = vd;

    return () => {
      readyRef.current = false;
      instRef.current = null;
      vd.destroy();
    };
  }, [isDark, minHeight, mode, placeholder]);

  useEffect(() => {
    const vd = instRef.current;
    if (!vd || !readyRef.current) return;
    try {
      if (vd.getValue() !== value) vd.setValue(value);
    } catch {
      /* Lute 未就绪时 getValue 可能不可用 */
    }
  }, [value]);

  return <div className={className.trim()} ref={wrapRef} />;
};
