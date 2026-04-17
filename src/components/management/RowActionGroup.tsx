import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { MoreHorizontal } from 'lucide-react';
import { PortalDropdown } from '../common/PortalDropdown';
import type { Theme } from '../../types';
import {
  mgmtTableActionDanger,
  mgmtTableActionGhost,
  mgmtTableActionPositive,
  mgmtTableRowActions,
} from '../../utils/uiClasses';

export type RowActionTone = 'neutral' | 'positive' | 'danger';

export interface RowActionItem {
  key: string;
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  tone?: RowActionTone;
  disabled?: boolean;
  hidden?: boolean;
  ariaLabel?: string;
  title?: string;
}

export interface RowActionButtonProps {
  theme: Theme;
  item: RowActionItem;
  onClick?: () => void;
}

export interface RowActionGroupProps {
  theme: Theme;
  actions: RowActionItem[];
  className?: string;
  maxVisible?: number;
  moreLabel?: string;
}

function toneClass(theme: Theme, tone: RowActionTone): string {
  if (tone === 'positive') return mgmtTableActionPositive(theme);
  if (tone === 'danger') return mgmtTableActionDanger;
  return mgmtTableActionGhost(theme);
}

function menuItemClass(theme: Theme, tone: RowActionTone): string {
  const base =
    'flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium transition-colors disabled:opacity-45 disabled:pointer-events-none';
  if (tone === 'positive') {
    return `${base} ${
      theme === 'dark'
        ? 'text-emerald-300 hover:bg-emerald-500/10'
        : 'text-emerald-700 hover:bg-emerald-50'
    }`;
  }
  if (tone === 'danger') {
    return `${base} ${
      theme === 'dark'
        ? 'text-rose-300 hover:bg-rose-500/10'
        : 'text-rose-700 hover:bg-rose-50'
    }`;
  }
  return `${base} ${
    theme === 'dark'
      ? 'text-slate-200 hover:bg-white/[0.06]'
      : 'text-slate-700 hover:bg-slate-50'
  }`;
}

export const RowActionButton: React.FC<RowActionButtonProps> = ({ theme, item, onClick }) => {
  const Icon = item.icon;
  const tone = item.tone ?? 'neutral';
  return (
    <button
      type="button"
      className={toneClass(theme, tone)}
      disabled={item.disabled}
      aria-label={item.ariaLabel ?? item.label}
      title={item.title}
      onClick={onClick ?? item.onClick}
    >
      <Icon size={14} aria-hidden />
      <span>{item.label}</span>
    </button>
  );
};

export const RowActionGroup: React.FC<RowActionGroupProps> = ({
  theme,
  actions,
  className = '',
  maxVisible = 3,
  moreLabel = '更多',
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const visibleActions = useMemo(
    () => actions.filter((action) => !action.hidden),
    [actions],
  );
  const directActions = visibleActions.slice(0, maxVisible);
  const overflowActions = visibleActions.slice(maxVisible);

  useEffect(() => {
    if (overflowActions.length === 0 && menuOpen) {
      setMenuOpen(false);
    }
  }, [menuOpen, overflowActions.length]);

  return (
    <div className={`${mgmtTableRowActions} ${className}`.trim()}>
      {directActions.map((item) => (
        <RowActionButton key={item.key} theme={theme} item={item} />
      ))}
      {overflowActions.length > 0 ? (
        <>
          <button
            ref={triggerRef}
            type="button"
            className={mgmtTableActionGhost(theme)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label={`展开更多操作（${overflowActions.length}项）`}
            onClick={() => setMenuOpen((prev) => !prev)}
          >
            <MoreHorizontal size={14} aria-hidden />
            <span>{moreLabel}</span>
          </button>
          <PortalDropdown
            open={menuOpen}
            onClose={() => setMenuOpen(false)}
            anchorEl={triggerRef.current}
            align="right"
            className={`w-56 rounded-[22px] border p-2 shadow-2xl ${
              theme === 'dark'
                ? 'border-white/[0.08] bg-lantu-card'
                : 'border-slate-200 bg-white'
            }`}
          >
            <div className="space-y-1">
              {overflowActions.map((item) => {
                const Icon = item.icon;
                const tone = item.tone ?? 'neutral';
                return (
                  <button
                    key={item.key}
                    type="button"
                    className={menuItemClass(theme, tone)}
                    disabled={item.disabled}
                    aria-label={item.ariaLabel ?? item.label}
                    title={item.title}
                    onClick={() => {
                      setMenuOpen(false);
                      item.onClick();
                    }}
                  >
                    <Icon size={15} aria-hidden />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </PortalDropdown>
        </>
      ) : null}
    </div>
  );
};
