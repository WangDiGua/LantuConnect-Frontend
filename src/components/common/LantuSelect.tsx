import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Theme } from '../../types';
import { nativeSelectTriggerClass } from '../../utils/formFieldClasses';
import { textMuted } from '../../utils/uiClasses';
import { PortalDropdown } from './PortalDropdown';

export interface LantuSelectOption {
  value: string;
  label: string;
}

export interface LantuSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: LantuSelectOption[];
  theme: Theme;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  align?: 'left' | 'right';
  /** 透传给触发按钮的额外 class（如 `!w-36`、`!text-xs`） */
  triggerClassName?: string;
  chevronSize?: number;
}

export const LantuSelect: React.FC<LantuSelectProps> = ({
  value,
  onChange,
  options,
  theme,
  placeholder = '请选择…',
  disabled = false,
  className = '',
  align = 'left',
  triggerClassName = '',
  chevronSize = 16,
}) => {
  const isDark = theme === 'dark';
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listboxId = useId();

  const selected = options.find((o) => o.value === value);
  const showPlaceholder = value === '' && !selected;
  const labelText = selected?.label ?? (value === '' ? placeholder : String(value));

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, close]);

  const menuSurface = isDark ? 'bg-[#1a1f2e] border-white/10' : 'bg-white border-neutral-200';
  const itemBase = isDark ? 'text-neutral-300' : 'text-neutral-600';
  const itemHover = isDark ? 'hover:bg-white/5' : 'hover:bg-neutral-50';
  const itemActive = isDark ? 'bg-white/10 font-medium text-white' : 'bg-neutral-50/80 font-medium text-neutral-900';

  const handlePick = (v: string) => {
    onChange(v);
    close();
    triggerRef.current?.focus();
  };

  return (
    <div className={`relative w-full ${className}`.trim()}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        id={`${listboxId}-trigger`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        onClick={() => !disabled && setOpen((o) => !o)}
        className={`${nativeSelectTriggerClass(theme)} flex items-center justify-between gap-2 text-left disabled:opacity-50 disabled:cursor-not-allowed ${triggerClassName}`.trim()}
      >
        <span className={`min-w-0 flex-1 truncate ${showPlaceholder ? textMuted(theme) : ''}`}>
          {labelText}
        </span>
        <ChevronDown
          size={chevronSize}
          className={`shrink-0 transition-transform duration-200 ${open ? 'rotate-180 text-neutral-900 dark:text-white' : ''} ${isDark ? 'text-neutral-400' : 'text-neutral-400'}`}
          aria-hidden
        />
      </button>

      <PortalDropdown
        open={open}
        onClose={close}
        anchorEl={triggerRef.current}
        align={align}
        matchAnchorWidth
        className={`rounded-xl border py-1.5 shadow-xl shadow-neutral-900/5 ${menuSurface}`}
      >
        <div
          id={listboxId}
          role="listbox"
          aria-labelledby={`${listboxId}-trigger`}
          className="max-h-60 overflow-y-auto overscroll-contain custom-scrollbar"
          style={{
            WebkitOverflowScrolling: 'touch',
            maxHeight: 'min(15rem, var(--portal-dropdown-max-height, 15rem))',
          }}
          onWheelCapture={(e) => e.stopPropagation()}
          onTouchMoveCapture={(e) => e.stopPropagation()}
        >
          {options.map((opt) => {
            const active = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => handlePick(opt.value)}
                className={`w-full px-4 py-2.5 text-left text-[13px] transition-colors flex items-center justify-between ${itemBase} ${itemHover} ${active ? itemActive : ''}`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </PortalDropdown>
    </div>
  );
};
