import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Eye, Loader2, RefreshCw, Search, Star, Store, X } from 'lucide-react';
import type { Theme, FontSize, ThemeColor } from '../../types';
import type { SkillExternalCatalogItemVO } from '../../types/dto/resource-center';
import { resourceCenterService } from '../../api/services/resource-center.service';
import { safeOpenHttpUrl } from '../../lib/windowNavigate';
import {
  bentoCard,
  bentoCardHover,
  btnPrimary,
  canvasBodyBg,
  consoleContentTopPad,
  iconMuted,
  mainScrollPadBottom,
  mainScrollPadX,
  textMuted,
  textPrimary,
  textSecondary,
} from '../../utils/uiClasses';
import { MARKET_HERO_TITLE_CLASSES } from '../../constants/theme';
import { PageError } from '../../components/common/PageError';
import { PageSkeleton } from '../../components/common/PageSkeleton';
import { Pagination } from '../../components/common';
import { LantuSelect } from '../../components/common/LantuSelect';
import { buildSkillExternalMarketDetailPath, skillExternalCatalogRowKey } from '../../utils/skillExternalMarketPath';
import { useScrollPaginatedContentToTop } from '../../hooks/useScrollPaginatedContentToTop';

export interface SkillExternalMarketBrowsePageProps {
  theme: Theme;
  fontSize: FontSize;
  themeColor?: ThemeColor;
  showMessage?: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

function sourceHost(url: string | null | undefined): string {
  const u = url?.trim();
  if (!u) return '';
  try {
    return new URL(u).hostname;
  } catch {
    return u.slice(0, 40);
  }
}

function statNum(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—';
  if (n >= 10000) return `${(n / 10000).toFixed(1)}w`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

type SourceFilter = '' | 'skillhub' | 'skillsmp' | 'mirror';

const SOURCE_FILTER_OPTIONS: { value: SourceFilter; label: string }[] = [
  { value: '', label: '全部来源' },
  { value: 'skillhub', label: 'SkillHub' },
  { value: 'skillsmp', label: 'SkillsMP' },
  { value: 'mirror', label: '镜像 / 其他' },
];

/** 与 bento 列表卡片同壳内：无独立投影；水平 padding 由调用方区分（搜索需为左侧图标留 pl-12） */
function marketFieldShell(isDark: boolean): string {
  return `min-h-12 w-full rounded-2xl border py-3 text-sm shadow-none outline-none transition-[box-shadow,colors] placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-violet-500/40 ${
    isDark
      ? 'border-white/[0.1] bg-white/[0.05] text-white placeholder:text-slate-500'
      : 'border-slate-200/80 bg-slate-50/70 text-slate-900'
  }`;
}

function marketFieldInputClass(isDark: boolean): string {
  return `${marketFieldShell(isDark)} px-4 tabular-nums`;
}

/** 左侧放大镜 absolute left-4 + h-5 w-5 → 需 pl-12；右侧清除按钮需 pr-11 */
function marketSearchInputClass(isDark: boolean): string {
  return `${marketFieldShell(isDark)} pl-12 pr-11`;
}

export const SkillExternalMarketBrowsePage: React.FC<SkillExternalMarketBrowsePageProps> = ({
  theme,
  fontSize,
  showMessage,
}) => {
  const isDark = theme === 'dark';
  const navigate = useNavigate();
  const showMessageRef = useRef(showMessage);
  showMessageRef.current = showMessage;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [draftKeyword, setDraftKeyword] = useState('');
  const [appliedKeyword, setAppliedKeyword] = useState('');
  const [draftMinStars, setDraftMinStars] = useState('');
  const [draftMaxStars, setDraftMaxStars] = useState('');
  const [draftSource, setDraftSource] = useState<SourceFilter>('');
  const [appliedMinStars, setAppliedMinStars] = useState<number | undefined>(undefined);
  const [appliedMaxStars, setAppliedMaxStars] = useState<number | undefined>(undefined);
  const [appliedSource, setAppliedSource] = useState<SourceFilter>('');
  const [page, setPage] = useState(1);
  useScrollPaginatedContentToTop(page);
  const [total, setTotal] = useState(0);
  const [list, setList] = useState<SkillExternalCatalogItemVO[]>([]);
  const pageSize = 20;

  const load = useCallback(async (opts?: { toastOnSuccess?: boolean }) => {
    setLoading(true);
    setError(null);
    try {
      const res = await resourceCenterService.listSkillExternalCatalog({
        keyword: appliedKeyword.trim() || undefined,
        page,
        pageSize,
        minStars: appliedMinStars,
        maxStars: appliedMaxStars,
        ...(appliedSource ? { source: appliedSource } : {}),
      });
      setList(res.list);
      setTotal(res.total);
      if (opts?.toastOnSuccess) {
        showMessageRef.current?.('列表已更新', 'success');
      }
    } catch (e) {
      const err = e instanceof Error ? e : new Error('加载在线市场失败');
      setError(err);
      setList([]);
      setTotal(0);
      showMessageRef.current?.(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [appliedKeyword, page, pageSize, appliedMinStars, appliedMaxStars, appliedSource]);

  useEffect(() => {
    void load();
  }, [load]);

  const triggerDownload = (item: SkillExternalCatalogItemVO, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const url = item.packUrl?.trim();
    if (!url) {
      showMessage?.('暂无下载链接', 'warning');
      return;
    }
    if (!safeOpenHttpUrl(url)) {
      showMessage?.('链接无效（仅支持 http/https）', 'error');
      return;
    }
    const key = skillExternalCatalogRowKey(item);
    if (key) {
      void resourceCenterService.recordSkillExternalDownload(key).catch(() => {});
    }
  };

  const openDetail = (item: SkillExternalCatalogItemVO) => {
    navigate(buildSkillExternalMarketDetailPath(item));
  };

  return (
    <div className={`w-full min-h-0 ${canvasBodyBg(theme)}`}>
      <div className={`${mainScrollPadX} ${mainScrollPadBottom} ${consoleContentTopPad} space-y-6`}>
        <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-md sm:h-12 sm:w-12 ${
                isDark ? 'bg-gradient-to-br from-amber-500 to-rose-500' : 'bg-gradient-to-br from-amber-500 to-orange-600'
              }`}
              aria-hidden
            >
              <Store className="h-6 w-6" strokeWidth={2.25} />
            </div>
            <div className="min-w-0">
              <p className={`text-xs font-semibold uppercase tracking-wider ${textMuted(theme)}`}>External catalog</p>
              <h1 className={`mt-0.5 font-bold tracking-tight ${MARKET_HERO_TITLE_CLASSES[fontSize]}`}>
                <span className={textPrimary(theme)}>技能</span>
                <span className="bg-gradient-to-r from-amber-600 to-rose-500 bg-clip-text text-transparent dark:from-amber-400 dark:to-rose-400">
                  {' '}
                  在线市场
                </span>
              </h1>
              <p className={`mt-1 max-w-2xl text-xs leading-snug sm:text-sm ${textSecondary(theme)}`}>
                聚合 SkillHub / SkillsMP 等外部目录；直链下载技能包，不参与平台内 resolve / 授权流程。
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={loading}
              onClick={() => void load({ toastOnSuccess: true })}
              className={`inline-flex min-h-11 items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/45 disabled:cursor-not-allowed disabled:opacity-50 ${
                isDark ? 'border-white/[0.12] bg-white/[0.04] text-slate-200 hover:bg-white/[0.08]' : 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50'
              }`}
            >
              <RefreshCw size={16} className={loading ? 'animate-spin opacity-80' : 'opacity-80'} aria-hidden />
              刷新
            </button>
          </div>
        </header>

        <form
          className="w-full max-w-full"
          onSubmit={(e) => {
            e.preventDefault();
            const pMin = draftMinStars.trim() === '' ? undefined : Number(draftMinStars);
            const pMax = draftMaxStars.trim() === '' ? undefined : Number(draftMaxStars);
            const minOk = pMin === undefined || Number.isFinite(pMin);
            const maxOk = pMax === undefined || Number.isFinite(pMax);
            if (!minOk || !maxOk) {
              showMessageRef.current?.('星标请输入有效数字', 'warning');
              return;
            }
            setPage(1);
            setAppliedKeyword(draftKeyword);
            setAppliedMinStars(pMin);
            setAppliedMaxStars(pMax);
            setAppliedSource(draftSource);
          }}
        >
          <div className={`${bentoCard(theme)} p-4 sm:p-5`}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-stretch sm:gap-3">
              <div className="relative min-w-0 flex-1">
                <Search
                  className={`pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 ${iconMuted(theme)}`}
                  aria-hidden
                />
                <input
                  id="skill-external-market-keyword"
                  type="search"
                  name="skill-external-keyword"
                  autoComplete="off"
                  spellCheck={false}
                  value={draftKeyword}
                  onChange={(ev) => setDraftKeyword(ev.target.value)}
                  placeholder="搜索名称、简介或链接…"
                  aria-label="搜索在线市场"
                  className={marketSearchInputClass(isDark)}
                />
                {draftKeyword.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => setDraftKeyword('')}
                    className={`absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/45 ${
                      isDark ? 'text-slate-400 hover:bg-white/[0.08] hover:text-white' : 'text-slate-500 hover:bg-slate-100'
                    }`}
                    aria-label="清除搜索关键词"
                  >
                    <X size={16} aria-hidden />
                  </button>
                ) : null}
              </div>
              <button
                type="submit"
                className={`inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-2xl px-5 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/45 sm:min-w-[7.5rem] ${
                  isDark
                    ? 'bg-violet-500 text-white shadow-[0_4px_14px_-2px_rgba(139,92,246,0.45)] hover:bg-violet-400'
                    : 'bg-violet-600 text-white shadow-[0_4px_14px_-3px_rgba(91,33,182,0.28)] hover:bg-violet-500'
                }`}
              >
                <Search size={18} aria-hidden />
                搜索
              </button>
            </div>

            <fieldset
              className={`mt-5 border-t pt-5 ${isDark ? 'border-white/[0.08]' : 'border-slate-200/80'}`}
            >
              <legend className={`sr-only`}>筛选条件，与搜索一并应用</legend>
              <p className={`mb-3 text-xs font-semibold ${textMuted(theme)}`}>
                筛选条件
                <span className={`ml-2 font-normal ${textSecondary(theme)}`}>与上方搜索在同一操作中应用</span>
              </p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-12 lg:items-end">
                <div className="flex flex-col gap-1.5 sm:col-span-1 lg:col-span-2">
                  <label htmlFor="skill-external-min-stars" className={`text-xs font-medium ${textSecondary(theme)}`}>
                    最低星标
                  </label>
                  <input
                    id="skill-external-min-stars"
                    type="number"
                    min={0}
                    inputMode="numeric"
                    value={draftMinStars}
                    onChange={(ev) => setDraftMinStars(ev.target.value)}
                    placeholder="不限"
                    className={marketFieldInputClass(isDark)}
                  />
                </div>
                <div className="flex flex-col gap-1.5 sm:col-span-1 lg:col-span-2">
                  <label htmlFor="skill-external-max-stars" className={`text-xs font-medium ${textSecondary(theme)}`}>
                    最高星标
                  </label>
                  <input
                    id="skill-external-max-stars"
                    type="number"
                    min={0}
                    inputMode="numeric"
                    value={draftMaxStars}
                    onChange={(ev) => setDraftMaxStars(ev.target.value)}
                    placeholder="不限"
                    className={marketFieldInputClass(isDark)}
                  />
                </div>
                <div className="flex flex-col gap-1.5 sm:col-span-2 lg:col-span-4">
                  <span className={`text-xs font-medium ${textSecondary(theme)}`}>来源</span>
                  <LantuSelect
                    theme={theme}
                    value={draftSource}
                    onChange={(v) => setDraftSource(v as SourceFilter)}
                    options={SOURCE_FILTER_OPTIONS}
                    placeholder="全部来源"
                    ariaLabel="来源"
                    triggerClassName={`!min-h-12 !rounded-2xl !px-4 !py-3 !shadow-none ${
                      isDark ? '!bg-white/[0.05] !border-white/[0.1]' : '!bg-slate-50/70 !border-slate-200/80'
                    }`}
                  />
                </div>
                <div className="flex flex-col justify-end sm:col-span-2 lg:col-span-4">
                  <button
                    type="button"
                    onClick={() => {
                      setDraftMinStars('');
                      setDraftMaxStars('');
                      setDraftSource('');
                      setAppliedMinStars(undefined);
                      setAppliedMaxStars(undefined);
                      setAppliedSource('');
                      setPage(1);
                    }}
                    className={`min-h-12 w-full rounded-2xl border text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/45 lg:w-auto lg:px-5 ${
                      isDark
                        ? 'border-white/[0.12] text-slate-200 hover:bg-white/[0.06]'
                        : 'border-slate-200/90 bg-slate-50/50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    清除筛选条件
                  </button>
                </div>
              </div>
            </fieldset>
          </div>
        </form>

        {loading && list.length === 0 ? <PageSkeleton type="cards" /> : null}
        {!loading && error ? <PageError error={error} onRetry={() => void load()} /> : null}
        {!error && !loading && list.length === 0 ? (
          <div className={`rounded-2xl border border-dashed px-6 py-12 text-center text-sm ${textMuted(theme)}`}>
            暂无条目，请稍后再试或联系管理员检查市场配置。
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((item) => {
            const rowKey = skillExternalCatalogRowKey(item);
            return (
              <article
                key={rowKey || item.packUrl}
                role="button"
                tabIndex={0}
                onClick={() => openDetail(item)}
                onKeyDown={(ev) => {
                  if (ev.key === 'Enter' || ev.key === ' ') {
                    ev.preventDefault();
                    openDetail(item);
                  }
                }}
                className={`${bentoCard(theme)} ${bentoCardHover} cursor-pointer p-4 text-left outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-violet-500/45`}
              >
                <div className="flex items-start justify-between gap-2">
                  <h2 className={`line-clamp-2 text-base font-semibold ${textPrimary(theme)}`}>{item.name}</h2>
                  {typeof item.stars === 'number' && item.stars > 0 ? (
                    <span className="inline-flex shrink-0 items-center gap-0.5 tabular-nums text-xs font-semibold text-amber-600 dark:text-amber-400">
                      <Star size={13} className="fill-current" aria-hidden />
                      {item.stars}
                    </span>
                  ) : null}
                </div>
                <p className={`mt-1 text-xs ${textMuted(theme)}`}>
                  {sourceHost(item.sourceUrl) || '外部目录'}
                </p>
                <div className={`mt-2 flex flex-wrap gap-3 text-xs tabular-nums ${textSecondary(theme)}`}>
                  <span className="inline-flex items-center gap-1">
                    <Eye size={13} className="opacity-70" aria-hidden />
                    {statNum(item.viewCount ?? undefined)}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Download size={13} className="opacity-70" aria-hidden />
                    {statNum(item.downloadCount != null ? Number(item.downloadCount) : undefined)}
                  </span>
                </div>
                {item.summary?.trim() ? (
                  <pre
                    className={`mt-3 max-h-24 overflow-hidden rounded-lg border px-2 py-1.5 text-[11px] leading-relaxed ${
                      isDark ? 'border-white/[0.08] bg-black/20 text-slate-300' : 'border-slate-200/80 bg-slate-50 text-slate-700'
                    }`}
                  >
                    <code className="whitespace-pre-wrap break-words font-mono">{item.summary.trim()}</code>
                  </pre>
                ) : null}
                {item.licenseNote?.trim() ? (
                  <p className={`mt-2 line-clamp-2 text-xs ${textMuted(theme)}`}>{item.licenseNote.trim()}</p>
                ) : null}
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={(e) => triggerDownload(item, e)}
                    className={`${btnPrimary} inline-flex min-h-11 flex-1 items-center justify-center gap-2 sm:flex-none`}
                  >
                    <Download size={16} aria-hidden />
                    下载
                  </button>
                </div>
              </article>
            );
          })}
        </div>

        {total > pageSize ? (
          <Pagination theme={theme} page={page} pageSize={pageSize} total={total} onChange={setPage} />
        ) : null}

        {loading && list.length > 0 ? (
          <div className={`flex items-center justify-center gap-2 text-sm ${textMuted(theme)}`}>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            更新中…
          </div>
        ) : null}
      </div>
    </div>
  );
};
