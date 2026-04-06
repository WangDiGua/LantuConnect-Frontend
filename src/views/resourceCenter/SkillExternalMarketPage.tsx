import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, ExternalLink, RefreshCw, Settings2, List, Store } from 'lucide-react';
import type { Theme, FontSize } from '../../types';
import type { SkillExternalCatalogItemVO } from '../../types/dto/resource-center';
import { resourceCenterService } from '../../api/services/resource-center.service';
import { buildPath } from '../../constants/consoleRoutes';
import { PageError } from '../../components/common/PageError';
import { PageSkeleton } from '../../components/common/PageSkeleton';
import { Pagination, SearchInput } from '../../components/common';
import { MgmtDataTable } from '../../components/management/MgmtDataTable';
import type { MgmtDataTableColumn } from '../../components/management/MgmtDataTable';
import {
  bentoCard,
  btnGhost,
  btnPrimary,
  textMuted,
  textPrimary,
  textSecondary,
} from '../../utils/uiClasses';
import { MgmtPageShell } from '../userMgmt/MgmtPageShell';
import { nullDisplay } from '../../utils/errorHandler';
import { SkillExternalMarketSettingsForm } from './SkillExternalMarketSettingsForm';
import { useScrollPaginatedContentToTop } from '../../hooks/useScrollPaginatedContentToTop';

interface Props {
  theme: Theme;
  fontSize: FontSize;
  showMessage: (msg: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

type MarketTab = 'list' | 'settings';

const PAGE_SIZE = 20;
const PAGE_DESC =
  '列表数据由管理员在「市场配置」的生效方式中指定（合并多源 / 仅 SkillHub / 仅 SkillsMP / 仅镜像），并在各标签页维护对应站点参数。支持关键字与分页。导入 zip 有结构校验。';

export const SkillExternalMarketPage: React.FC<Props> = ({ theme, fontSize, showMessage }) => {
  const isDark = theme === 'dark';
  const navigate = useNavigate();
  const [tab, setTab] = useState<MarketTab>('list');
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<SkillExternalCatalogItemVO[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  useScrollPaginatedContentToTop(page);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(id);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const selectMarketTab = (next: MarketTab) => {
    if (tab === 'list' && next !== 'list') {
      const ae = document.activeElement;
      if (ae instanceof HTMLElement) ae.blur();
    }
    setTab(next);
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await resourceCenterService.listSkillExternalCatalog({
        ...(debouncedSearch ? { keyword: debouncedSearch } : {}),
        page,
        pageSize: PAGE_SIZE,
      });
      setRows(res.list);
      setTotal(Number.isFinite(res.total) ? res.total : 0);
    } catch (e) {
      const err = e instanceof Error ? e : new Error('加载市场列表失败');
      setError(err);
      setRows([]);
      setTotal(0);
      showMessage(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, page, showMessage]);

  useEffect(() => {
    if (tab === 'list') void load();
  }, [load, tab]);

  const goImport = useCallback(
    (packUrl: string) => {
      const q = `?skillTrack=hosted&skillPackUrl=${encodeURIComponent(packUrl.trim())}`;
      navigate(`${buildPath('admin', 'skill-register')}${q}`);
    },
    [navigate],
  );

  const marketColumns = useMemo<MgmtDataTableColumn<SkillExternalCatalogItemVO>[]>(
    () => [
      {
        id: 'name',
        header: '名称',
        cellClassName: 'font-medium align-top',
        cell: (row) => (
          <div className="flex flex-col gap-0.5">
            <span className={textPrimary(theme)}>{row.name}</span>
            {row.sourceUrl ? (
              <a
                href={row.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center gap-1 text-xs font-normal ${isDark ? 'text-sky-400 hover:text-sky-300' : 'text-sky-600 hover:text-sky-700'}`}
              >
                <ExternalLink size={12} />
                来源页
              </a>
            ) : null}
          </div>
        ),
      },
      {
        id: 'stars',
        header: '星标',
        cellClassName: 'tabular-nums align-top',
        cell: (row) => <span className={textSecondary(theme)}>{row.stars != null && row.stars > 0 ? row.stars : '—'}</span>,
      },
      {
        id: 'summary',
        header: '简介',
        cellClassName: 'min-w-[200px] align-top',
        cell: (row) => <span className={textSecondary(theme)}>{nullDisplay(row.summary)}</span>,
      },
      {
        id: 'pack',
        header: 'ZIP / 下载地址',
        cellClassName: 'min-w-[180px] align-top',
        cell: (row) => (
          <a
            href={row.packUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-1 break-all ${isDark ? 'text-sky-400 hover:text-sky-300' : 'text-sky-600 hover:text-sky-700'}`}
          >
            <Download size={14} />
            {row.packUrl}
          </a>
        ),
      },
      {
        id: 'license',
        header: '许可说明',
        cellClassName: 'min-w-[160px] align-top',
        cell: (row) => <span className={textSecondary(theme)}>{nullDisplay(row.licenseNote)}</span>,
      },
      {
        id: 'actions',
        header: '操作',
        cellClassName: 'align-top',
        cell: (row) => (
          <button type="button" className={btnPrimary} onClick={() => goImport(row.packUrl)}>
            导入到本平台
          </button>
        ),
      },
    ],
    [theme, isDark, goImport],
  );

  const densityClass = fontSize === 'small' ? 'text-xs' : fontSize === 'large' ? 'text-base' : 'text-sm';

  const toolbar = (
    <div className={`flex flex-col gap-3 w-full lg:flex-row lg:items-center lg:justify-between ${densityClass}`}>
      <button
        type="button"
        onClick={() => navigate(`${buildPath('admin', 'resource-catalog')}?type=skill`)}
        className={`${btnGhost(theme)} self-start`}
        aria-label="返回统一资源中心"
      >
        <ArrowLeft size={15} aria-hidden />
        返回资源中心
      </button>
      <div className="flex flex-wrap items-center gap-2">
        <div className={`inline-flex rounded-xl border p-0.5 ${isDark ? 'border-white/[0.08] bg-white/[0.04]' : 'border-slate-200 bg-slate-50'}`}>
          <button
            type="button"
            onClick={() => setTab('list')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors motion-reduce:transition-none ${
              tab === 'list'
                ? isDark
                  ? 'bg-white/10 text-white'
                  : 'bg-white text-slate-900 shadow-sm'
                : `${textMuted(theme)} hover:opacity-90`
            }`}
            aria-pressed={tab === 'list'}
          >
            <List size={15} aria-hidden />
            市场列表
          </button>
          <button
            type="button"
            onClick={() => selectMarketTab('settings')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors motion-reduce:transition-none ${
              tab === 'settings'
                ? isDark
                  ? 'bg-white/10 text-white'
                  : 'bg-white text-slate-900 shadow-sm'
                : `${textMuted(theme)} hover:opacity-90`
            }`}
            aria-pressed={tab === 'settings'}
          >
            <Settings2 size={15} aria-hidden />
            市场配置
          </button>
        </div>
        {tab === 'list' ? (
          <button type="button" onClick={() => void load()} className={btnGhost(theme)} disabled={loading} aria-label="刷新市场列表">
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} aria-hidden />
            刷新
          </button>
        ) : null}
      </div>
    </div>
  );

  return (
    <MgmtPageShell
      theme={theme}
      fontSize={fontSize}
      titleIcon={Store}
      breadcrumbSegments={['资源目录', '技能在线市场']}
      description={PAGE_DESC}
      toolbar={toolbar}
      contentScroll="document"
    >
      <div className={`px-4 sm:px-6 pb-8 ${densityClass}`}>
        <div className={`${bentoCard(theme)} overflow-hidden`}>
          <div className="p-3">
            {tab === 'settings' ? (
              <SkillExternalMarketSettingsForm
                theme={theme}
                fontSize={fontSize}
                showMessage={showMessage}
                onSaved={() => void load()}
              />
            ) : (
              <>
                <div
                  className={`mb-3 flex flex-col gap-2 px-3 sm:flex-row sm:flex-wrap sm:items-center ${isDark ? '' : ''}`}
                >
                  <div className="min-w-[min(100%,240px)] flex-1">
                    <SearchInput
                      value={search}
                      onChange={setSearch}
                      placeholder="筛选：名称、简介、ZIP 链接、来源…"
                      theme={theme}
                    />
                  </div>
                  {!loading && total > 0 ? (
                    <span className={`text-xs ${textMuted(theme)}`}>
                      共 {total} 条
                      {debouncedSearch ? `（已筛选）` : ''}
                    </span>
                  ) : null}
                </div>
                {loading ? (
                  <PageSkeleton type="table" rows={6} />
                ) : error ? (
                  <PageError error={error} onRetry={() => void load()} retryLabel="重试" />
                ) : rows.length === 0 ? (
                  <p className={`px-4 py-8 text-center text-sm ${textSecondary(theme)}`}>
                    {debouncedSearch
                      ? '无匹配条目，请调整关键字。'
                      : '暂无数据。可在「市场配置」中设置 SkillHub、SkillsMP、镜像 JSON、代理与 provider；亦可使用环境变量与 YAML 默认值。'}
                  </p>
                ) : (
                  <>
                    <MgmtDataTable<SkillExternalCatalogItemVO>
                      theme={theme}
                      surface="plain"
                      minWidth="min(100%, 72rem)"
                      columns={marketColumns}
                      rows={rows}
                      getRowKey={(row) => String(row.id)}
                    />
                    <div className="mt-4 flex justify-center px-2 pb-2">
                      <Pagination theme={theme} page={page} pageSize={PAGE_SIZE} total={total} onChange={setPage} />
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </MgmtPageShell>
  );
};
