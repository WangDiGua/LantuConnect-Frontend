import React, { useCallback, useMemo, useState } from 'react';
import { BookOpen, Download } from 'lucide-react';
import { useSearchParams, useLocation } from 'react-router-dom';
import type { Theme, FontSize } from '../../types';
import { parseRoute } from '../../constants/consoleRoutes';
import { textMuted } from '../../utils/uiClasses';
import { MgmtPageShell } from '../userMgmt/MgmtPageShell';
import { ApiDocsPage, ApiDocsGuideReferenceToolbar } from './ApiDocsPage';
import { SdkDownloadPage } from './SdkDownloadPage';

const TAB_QUERY = 'tab';
const TAB_SDK = 'sdk';

type DocsTab = 'docs' | 'sdk';

function parseTab(raw: string | null): DocsTab {
  return raw === TAB_SDK ? 'sdk' : 'docs';
}

const HUB_DESCRIPTION =
  '本页把「读懂平台」与「按同一套契约写 HTTP」绑在一起：先读接入指南建立鉴权、目录与调用边界，再切到 SDK 查看与指南一致的 /sdk/v1 路径与可复制示例，避免文档与代码各说各话。';

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

  const [docsViewMode, setDocsViewMode] = useState<'guide' | 'reference'>('guide');

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

  const hubToolbar = (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="接入与文档子区">
        <button type="button" className={tabBtn(tab === 'docs', '接入指南')} onClick={() => setTab('docs')} aria-pressed={tab === 'docs'}>
          <BookOpen size={16} className="shrink-0 opacity-90" aria-hidden />
          接入指南
        </button>
        <button type="button" className={tabBtn(tab === 'sdk', 'SDK 与示例')} onClick={() => setTab('sdk')} aria-pressed={tab === 'sdk'}>
          <Download size={16} className="shrink-0 opacity-90" aria-hidden />
          SDK 与示例
        </button>
      </div>
      {tab === 'docs' ? (
        <div className="flex min-w-0 flex-wrap items-center gap-2 border-l border-dashed pl-2 sm:pl-3 border-slate-400/25 dark:border-white/15">
          <span className={`hidden sm:inline text-xs ${textMuted(theme)}`}>指南内视图</span>
          <ApiDocsGuideReferenceToolbar theme={theme} viewMode={docsViewMode} onViewModeChange={setDocsViewMode} />
        </div>
      ) : null}
    </div>
  );

  return (
    <MgmtPageShell
      theme={theme}
      fontSize={fontSize}
      titleIcon={BookOpen}
      breadcrumbSegments={['开发者中心', '接入与文档']}
      description={HUB_DESCRIPTION}
      toolbar={hubToolbar}
      contentScroll="document"
    >
      {tab === 'docs' ? (
        <ApiDocsPage
          theme={theme}
          fontSize={fontSize}
          embedInHub
          viewMode={docsViewMode}
          onViewModeChange={setDocsViewMode}
        />
      ) : (
        <SdkDownloadPage theme={theme} fontSize={fontSize} embedInHub />
      )}
    </MgmtPageShell>
  );
};
