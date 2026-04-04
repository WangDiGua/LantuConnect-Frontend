import React, { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { Theme, FontSize, ThemeColor } from '../../types';
import type { ResourceType } from '../../types/dto/catalog';
import { RESOURCE_TYPES, RESOURCE_TYPE_LABEL_ZH, parseResourceType } from '../../constants/resourceTypes';
import { AgentMarket } from '../agent/AgentMarket';
import { SkillMarket } from '../skill/SkillMarket';
import { McpMarket } from '../mcp/McpMarket';
import { AppMarket } from '../apps/AppMarket';
import { DatasetMarket } from '../dataset/DatasetMarket';
import { textSecondary } from '../../utils/uiClasses';

interface Props {
  theme: Theme;
  fontSize: FontSize;
  themeColor: ThemeColor;
  showMessage?: (msg: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

export const UserResourceMarketHub: React.FC<Props> = ({ theme, fontSize, themeColor, showMessage }) => {
  const isDark = theme === 'dark';
  const [searchParams, setSearchParams] = useSearchParams();

  const tab = useMemo(() => parseResourceType(searchParams.get('tab')) ?? 'agent', [searchParams]);

  const setTab = useCallback(
    (next: ResourceType) => {
      setSearchParams(
        (prev) => {
          const p = new URLSearchParams(prev);
          p.set('tab', next);
          p.delete('resourceId');
          return p;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const ts = textSecondary(theme);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div
        className={`shrink-0 rounded-2xl border px-2 py-2 sm:px-3 ${
          isDark ? 'border-white/[0.08] bg-white/[0.03]' : 'border-slate-200/80 bg-white/80 shadow-sm'
        }`}
      >
        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="资源类型">
          {RESOURCE_TYPES.map((key) => {
            const active = tab === key;
            return (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(key)}
                className={`min-h-9 rounded-xl px-3 py-2 text-xs font-semibold transition-colors motion-reduce:transition-none sm:text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/45 focus-visible:ring-offset-2 ${
                  isDark ? 'focus-visible:ring-offset-lantu-card' : 'focus-visible:ring-offset-white'
                } ${
                  active
                    ? isDark
                      ? 'bg-white/12 text-white shadow-sm'
                      : 'bg-neutral-900 text-white shadow-sm'
                    : `${ts} ${isDark ? 'hover:bg-white/[0.06]' : 'hover:bg-slate-100'}`
                }`}
              >
                {RESOURCE_TYPE_LABEL_ZH[key]}
              </button>
            );
          })}
        </div>
      </div>

      <div className="min-h-0 flex-1">
        {tab === 'agent' && (
          <AgentMarket theme={theme} fontSize={fontSize} themeColor={themeColor} showMessage={showMessage} />
        )}
        {tab === 'skill' && <SkillMarket theme={theme} fontSize={fontSize} themeColor={themeColor} showMessage={showMessage} />}
        {tab === 'mcp' && <McpMarket theme={theme} fontSize={fontSize} showMessage={showMessage} />}
        {tab === 'app' && (
          <AppMarket theme={theme} fontSize={fontSize} themeColor={themeColor} showMessage={showMessage} />
        )}
        {tab === 'dataset' && (
          <DatasetMarket theme={theme} fontSize={fontSize} themeColor={themeColor} showMessage={showMessage} />
        )}
      </div>
    </div>
  );
};
