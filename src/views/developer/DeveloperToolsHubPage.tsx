import React, { useCallback, useMemo } from 'react';
import { Puzzle, ScrollText, Terminal } from 'lucide-react';
import { useSearchParams, useLocation, useNavigate } from 'react-router-dom';
import type { Theme, FontSize } from '../../types';
import { buildPath, parseRoute } from '../../constants/consoleRoutes';
import { MgmtPageShell } from '../userMgmt/MgmtPageShell';
import { ApiPlaygroundPage, PlaygroundLinkToDocsButton } from './ApiPlaygroundPage';
import { GatewayIntegrationPage, GatewayIntegrationQuickLinksToolbar } from './GatewayIntegrationPage';

const TAB_QUERY = 'tab';
const TAB_GATEWAY = 'gateway';

type ToolsTab = 'playground' | 'gateway';

function parseTab(raw: string | null): ToolsTab {
  return raw === TAB_GATEWAY ? 'gateway' : 'playground';
}

/** 复杂流程与鉴权细则见接入指南「调试与网关页」 */
const HUB_DESCRIPTION = '发 HTTP、看集成说明、用下方网关工具。';

export interface DeveloperToolsHubPageProps {
  theme: Theme;
  fontSize: FontSize;
}

export const DeveloperToolsHubPage: React.FC<DeveloperToolsHubPageProps> = ({ theme, fontSize }) => {
  const navigate = useNavigate();
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

  /** 主 Tab 与辅助链分层：左侧分段控件、右侧次要操作，避免一行挤成四个同级按钮 */
  const hubToolbar = (
    <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div
        className={`inline-flex w-fit max-w-full flex-wrap rounded-xl p-1 ${
          isDark ? 'bg-white/[0.06]' : 'bg-slate-200/80'
        }`}
        role="tablist"
        aria-label="调试与网关子区"
      >
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
      <div className="flex min-w-0 flex-wrap items-center gap-2 sm:justify-end">
        <button
          type="button"
          className={`inline-flex min-h-9 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium ${
            isDark ? 'border-white/12 text-slate-300 hover:bg-white/[0.06]' : 'border-slate-200/90 text-slate-600 hover:bg-slate-50'
          }`}
          onClick={() => navigate(`${buildPath('user', 'developer-docs')}#doc-debug-gateway`)}
          aria-label="打开接入指南中的「调试与网关页」说明"
        >
          <ScrollText size={14} className="shrink-0 opacity-85" aria-hidden />
          页面说明
        </button>
        {tab === 'playground' ? <PlaygroundLinkToDocsButton theme={theme} /> : null}
        {tab === 'gateway' ? <GatewayIntegrationQuickLinksToolbar theme={theme} /> : null}
      </div>
    </div>
  );

  return (
    <MgmtPageShell
      theme={theme}
      fontSize={fontSize}
      titleIcon={Terminal}
      breadcrumbSegments={['开发者中心', '调试与网关']}
      description={HUB_DESCRIPTION}
      toolbar={hubToolbar}
      contentScroll="document"
    >
      {tab === 'playground' ? (
        <ApiPlaygroundPage theme={theme} fontSize={fontSize} embedInHub />
      ) : (
        <GatewayIntegrationPage theme={theme} fontSize={fontSize} embedInHub />
      )}
    </MgmtPageShell>
  );
};
