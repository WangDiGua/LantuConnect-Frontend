import React, { useCallback, useMemo } from 'react';
import { Puzzle, Terminal } from 'lucide-react';
import { useSearchParams, useLocation } from 'react-router-dom';
import type { Theme, FontSize } from '../../types';
import { parseRoute } from '../../constants/consoleRoutes';
import { textMuted } from '../../utils/uiClasses';
import { ApiPlaygroundPage } from './ApiPlaygroundPage';
import { GatewayIntegrationPage } from './GatewayIntegrationPage';

const TAB_QUERY = 'tab';
const TAB_GATEWAY = 'gateway';

type ToolsTab = 'playground' | 'gateway';

function parseTab(raw: string | null): ToolsTab {
  return raw === TAB_GATEWAY ? 'gateway' : 'playground';
}

export interface DeveloperToolsHubPageProps {
  theme: Theme;
  fontSize: FontSize;
}

export const DeveloperToolsHubPage: React.FC<DeveloperToolsHubPageProps> = ({ theme, fontSize }) => {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const slug = parseRoute(location.pathname)?.page ?? '';
  const legacyGateway = slug === 'mcp-integration';
  const tab = useMemo(() => {
    if (legacyGateway) return 'gateway';
    return parseTab(searchParams.get(TAB_QUERY));
  }, [legacyGateway, searchParams]);

  const setTab = useCallback(
    (next: ToolsTab) => {
      setSearchParams(
        (prev) => {
          const p = new URLSearchParams(prev);
          if (next === 'playground') {
            p.delete(TAB_QUERY);
          } else {
            p.set(TAB_QUERY, TAB_GATEWAY);
          }
          return p;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const isDark = theme === 'dark';
  const tabBtn = (active: boolean) =>
    `inline-flex min-h-10 items-center gap-2 rounded-lg px-3.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40 focus-visible:ring-inset ${
      active
        ? isDark
          ? 'bg-white/[0.12] text-slate-100'
          : 'bg-slate-900/[0.06] text-slate-900'
        : isDark
          ? 'text-slate-400 hover:bg-white/[0.06] hover:text-slate-200'
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
    }`;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mb-3 shrink-0 px-1">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <button
            type="button"
            className={tabBtn(tab === 'playground')}
            onClick={() => setTab('playground')}
            aria-pressed={tab === 'playground'}
          >
            <Terminal size={16} className="shrink-0 opacity-90" aria-hidden />
            API Playground
          </button>
          <button type="button" className={tabBtn(tab === 'gateway')} onClick={() => setTab('gateway')} aria-pressed={tab === 'gateway'}>
            <Puzzle size={16} className="shrink-0 opacity-90" aria-hidden />
            网关集成
          </button>
        </div>
        <p className={`mt-2 text-xs ${textMuted(theme)}`}>在线调试网关请求与查看 MCP/绑定说明、工具导出等能力。</p>
      </div>
      <div className="min-h-0 flex-1 flex flex-col">
        {tab === 'playground' ? (
          <ApiPlaygroundPage theme={theme} fontSize={fontSize} />
        ) : (
          <GatewayIntegrationPage theme={theme} fontSize={fontSize} />
        )}
      </div>
    </div>
  );
};
