import React, { useCallback, useLayoutEffect, useEffect, useRef } from 'react';
import { prepare, layout } from '@chenglou/pretext';

export type AutoHeightTextareaProps = Omit<
  React.TextareaHTMLAttributes<HTMLTextAreaElement>,
  'rows'
> & {
  /** 至少显示的行高倍数（内容为空时） */
  minRows?: number;
  /** 超过此行数时固定高度并出现纵向滚动 */
  maxRows?: number;
};

/**
 * 用 Pretext 按 `pre-wrap` 计算高度，避免依赖 `scrollHeight` 反复触发布局。
 * 字体与 `line-height` 须与 className 一致（通过 getComputedStyle 读取）。
 */
export const AutoHeightTextarea = React.forwardRef<HTMLTextAreaElement, AutoHeightTextareaProps>(
  function AutoHeightTextarea({ minRows = 2, maxRows = 24, className = '', value, onChange, ...rest }, forwardedRef) {
    const innerRef = useRef<HTMLTextAreaElement>(null);

    const setRefs = useCallback(
      (el: HTMLTextAreaElement | null) => {
        innerRef.current = el;
        if (typeof forwardedRef === 'function') forwardedRef(el);
        else if (forwardedRef) (forwardedRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = el;
      },
      [forwardedRef],
    );

    const syncHeight = useCallback(() => {
      const el = innerRef.current;
      if (!el) return;
      const cs = getComputedStyle(el);
      const font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
      let lineHeightPx = parseFloat(cs.lineHeight);
      if (!Number.isFinite(lineHeightPx) || lineHeightPx <= 0) {
        const fs = parseFloat(cs.fontSize);
        lineHeightPx = fs * 1.25;
      }
      const padY = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
      const borderY = parseFloat(cs.borderTopWidth) + parseFloat(cs.borderBottomWidth);
      const padX = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
      const borderX = parseFloat(cs.borderLeftWidth) + parseFloat(cs.borderRightWidth);
      const contentW = el.clientWidth - padX - borderX;
      if (contentW <= 4) return;

      const raw = value == null ? '' : String(value);
      const forMeasure = raw.length ? raw.replace(/\r\n/g, '\n') : ' ';
      const prepared = prepare(forMeasure, font, { whiteSpace: 'pre-wrap' });
      const { height: contentH } = layout(prepared, contentW, lineHeightPx);

      const minContentH = minRows * lineHeightPx;
      const maxContentH = maxRows * lineHeightPx;
      const clamped = Math.min(Math.max(contentH, minContentH), maxContentH);
      el.style.height = `${Math.ceil(clamped + padY + borderY)}px`;
      el.style.overflowY = contentH > maxContentH ? 'auto' : 'hidden';
    }, [value, minRows, maxRows]);

    useLayoutEffect(() => {
      syncHeight();
    }, [syncHeight]);

    useEffect(() => {
      const el = innerRef.current;
      if (!el) return;
      const ro = new ResizeObserver(() => syncHeight());
      ro.observe(el);
      return () => ro.disconnect();
    }, [syncHeight]);

    return (
      <textarea
        ref={setRefs}
        className={className}
        value={value}
        onChange={onChange}
        rows={1}
        {...rest}
      />
    );
  },
);
