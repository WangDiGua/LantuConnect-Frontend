import React, { useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { Theme, FontSize, ThemeColor } from '../../types';
import type { ResourceType } from '../../types/dto/catalog';
import { RESOURCE_TYPES, RESOURCE_TYPE_LABEL_ZH, parseResourceType } from '../../constants/resourceTypes';
import { buildPath } from '../../constants/consoleRoutes';
import { AgentMarket } from '../agent/AgentMarket';
import { SkillMarket } from '../skill/SkillMarket';
import { McpMarket } from '../mcp/McpMarket';
import { AppMarket } from '../apps/AppMarket';
import { DatasetMarket } from '../dataset/DatasetMarket';
import { mainScrollPadBottom, mainScrollPadX, textMuted, textSecondary } from '../../utils/uiClasses';

interface Props {
  theme: Theme;
  fontSize: FontSize;
  themeColor: ThemeColor;
  showMessage?: (msg: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

export const UserResourceMarketHub: React.FC<Props> = ({ theme, fontSize, themeColor, showMessage }) => {
  const isDark = theme === 'dark';
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const tab = useMemo(() => parseResourceType(searchParams.get('tab')) ?? 'agent', [searchParams]);

  const setTab = useCallback(
    (next: ResourceType) => {
      if (next === 'skill') {
        navigate(buildPath('user', 'skills-center'), { replace: true });
        return;
      }
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
    [navigate, setSearchParams],
  );

  const ts = textSecondary(theme);
  const tm = textMuted(theme);

  return (
    <div
      className={`flex min-h-0 flex-1 flex-col gap-5 sm:gap-6 ${mainScrollPadX} ${mainScrollPadBottom} pt-5 sm:pt-6`}
    >
      <div
        className={`shrink-0 rounded-2xl border px-5 py-5 sm:px-7 sm:py-6 ${
          isDark ? 'border-white/[0.08] bg-white/[0.03]' : 'border-slate-200/80 bg-white/80 shadow-sm'
        }`}
      >
        <p className={`mb-4 text-[11px] leading-relaxed sm:text-xs ${tm}`}>
          各类型列表卡片均展示<strong className="font-semibold">创建者</strong>与<strong className="font-semibold">目录评分·评论数</strong>（无数据时显示「—」或 0，与统一目录接口一致）。
        </p>
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="资源类型">
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
