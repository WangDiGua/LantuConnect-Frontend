import React, { useCallback, useMemo } from 'react';
import { BookOpen, Download } from 'lucide-react';
import { useSearchParams, useLocation } from 'react-router-dom';
import type { Theme, FontSize } from '../../types';
import { parseRoute } from '../../constants/consoleRoutes';
import { textMuted } from '../../utils/uiClasses';
import { ApiDocsPage } from './ApiDocsPage';
import { SdkDownloadPage } from './SdkDownloadPage';

const TAB_QUERY = 'tab';
const TAB_SDK = 'sdk';

type DocsTab = 'docs' | 'sdk';

function parseTab(raw: string | null): DocsTab {
  return raw === TAB_SDK ? 'sdk' : 'docs';
}

export interface DeveloperDocsHubPageProps {
  theme: Theme;
  fontSize: FontSize;
}

export const DeveloperDocsHubPage: React.FC<DeveloperDocsHubPageProps> = ({ theme, fontSize }) => {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const slug = parseRoute(location.pathname)?.page ?? '';
  const legacySdk = slug === 'sdk-download';
  const tab = useMemo(() => {
    if (legacySdk) return 'sdk';
    return parseTab(searchParams.get(TAB_QUERY));
  }, [legacySdk, searchParams]);

  const setTab = useCallback(
    (next: DocsTab) => {
      setSearchParams(
        (prev) => {
          const p = new URLSearchParams(prev);
          if (next === 'docs') {
            p.delete(TAB_QUERY);
          } else {
            p.set(TAB_QUERY, TAB_SDK);
          }
          return p;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const isDark = theme === 'dark';
  const tabBtn = (active: boolean, label: string) =>
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
          <button type="button" className={tabBtn(tab === 'docs', '接入指南')} onClick={() => setTab('docs')} aria-pressed={tab === 'docs'}>
            <BookOpen size={16} className="shrink-0 opacity-90" aria-hidden />
            接入指南
          </button>
          <button type="button" className={tabBtn(tab === 'sdk', 'SDK 下载')} onClick={() => setTab('sdk')} aria-pressed={tab === 'sdk'}>
            <Download size={16} className="shrink-0 opacity-90" aria-hidden />
            SDK 下载
          </button>
        </div>
        <p className={`mt-2 text-xs ${textMuted(theme)}`}>接入说明与 HTTP SDK v1 路径、示例代码在同一入口切换查看。</p>
      </div>
      <div className="min-h-0 flex-1 flex flex-col">
        {tab === 'docs' ? <ApiDocsPage theme={theme} fontSize={fontSize} /> : <SdkDownloadPage theme={theme} fontSize={fontSize} />}
      </div>
    </div>
  );
};
