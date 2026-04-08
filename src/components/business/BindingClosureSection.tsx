import React from 'react';
import { Link } from 'react-router-dom';
import type { Theme } from '../../types';
import type { ResourceBindingSummaryVO } from '../../types/dto/catalog';
import { buildUserResourceMarketUrl } from '../../constants/consoleRoutes';
import { textMuted, textPrimary, textSecondary } from '../../utils/uiClasses';

const TYPE_LABEL: Record<string, string> = {
  agent: '智能体',
  skill: '技能',
  mcp: 'MCP',
  app: '应用',
  dataset: '数据集',
};

export interface BindingClosureSectionProps {
  theme: Theme;
  /** 当前资源 id：用于在列表中弱化自身条目 */
  currentResourceId?: string;
  items?: ResourceBindingSummaryVO[];
  className?: string;
}

export const BindingClosureSection: React.FC<BindingClosureSectionProps> = ({
  theme,
  currentResourceId,
  items,
  className = '',
}) => {
  const isDark = theme === 'dark';
  if (!items?.length) return null;

  return (
    <div
      className={`rounded-2xl border p-4 ${
        isDark ? 'border-white/10 bg-white/[0.02]' : 'border-slate-200 bg-slate-50/60'
      } ${className}`}
    >
      <h4 className={`mb-2 text-sm font-semibold ${textPrimary(theme)}`}>绑定闭包（Agent / MCP / Skill）</h4>
      <p className={`mb-3 text-xs leading-relaxed ${textMuted(theme)}`}>
        与当前资源在登记关系中处于同一连通分量的资源（无向展开）。用于快速跳转关联能力。
      </p>
      <ul className="space-y-2">
        {items.map((it) => {
          const self = currentResourceId != null && String(it.resourceId) === String(currentResourceId);
          const href = buildUserResourceMarketUrl(it.resourceType, { resourceId: it.resourceId });
          const typeZh = TYPE_LABEL[it.resourceType] ?? it.resourceType;
          return (
            <li key={`${it.resourceType}-${it.resourceId}`}>
              <Link
                to={href}
                className={`flex flex-col rounded-lg border px-3 py-2 text-sm transition-colors hover:opacity-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/45 ${
                  isDark
                    ? 'border-white/10 bg-white/[0.04] hover:bg-white/[0.07]'
                    : 'border-slate-200/90 bg-white hover:bg-slate-50'
                } ${self ? 'opacity-70' : ''}`}
              >
                <span className={`font-medium ${textPrimary(theme)}`}>
                  {it.displayName?.trim() || it.resourceCode || `#${it.resourceId}`}
                  {self ? (
                    <span className={`ml-1.5 text-xs font-normal ${textMuted(theme)}`}>（当前资源）</span>
                  ) : null}
                </span>
                <span className={`mt-0.5 text-xs ${textSecondary(theme)}`}>
                  <span className="rounded bg-slate-500/15 px-1.5 py-0.5 font-mono text-[10px] uppercase">{typeZh}</span>
                  {it.resourceCode ? (
                    <>
                      <span className="mx-1 opacity-50">·</span>
                      <span className="font-mono">{it.resourceCode}</span>
                    </>
                  ) : null}
                  <span className="mx-1 opacity-50">·</span>
                  <span className="font-mono">id {it.resourceId}</span>
                  {it.status ? (
                    <>
                      <span className="mx-1 opacity-50">·</span>
                      <span>{it.status}</span>
                    </>
                  ) : null}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
