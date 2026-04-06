import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, LayoutGrid, MessageSquare, Star, Tag } from 'lucide-react';
import type { Theme, FontSize, ThemeColor } from '../../types';
import type { SmartApp, EmbedType, AppStatus } from '../../types/dto/smart-app';
import { smartAppService } from '../../api/services/smart-app.service';
import { tagService } from '../../api/services/tag.service';
import { filterTagsForResourceType } from '../../utils/marketTags';
import type { TagItem } from '../../types/dto/tag';
import {
  canvasBodyBg, consoleContentTopPad, mainScrollPadBottom, bentoCard, btnPrimary,
  iconMuted, textPrimary, textMuted, techBadge, statusLabel,
} from '../../utils/uiClasses';
import { BentoCard } from '../../components/common/BentoCard';
import { MarketplaceListingCard, MarketplaceStatItem } from '../../components/market';
import type { MarketplaceStatusTone } from '../../components/market';
import { GlassPanel } from '../../components/common/GlassPanel';
import { useLayoutChrome } from '../../context/LayoutChromeContext';
import { PageError } from '../../components/common/PageError';
import { PageSkeleton } from '../../components/common/PageSkeleton';
import { PageTitleTagline } from '../../components/common/PageTitleTagline';
import { buildPath } from '../../constants/consoleRoutes';

interface Props { theme: Theme; fontSize: FontSize; themeColor?: ThemeColor; showMessage?: (msg: string, type: 'success' | 'error' | 'info' | 'warning') => void; }

const EMBED_BADGE: Record<EmbedType, { label: string; cls: string }> = { iframe: { label: '嵌入式', cls: 'text-blue-600 bg-blue-500/10' }, redirect: { label: '外链', cls: 'text-amber-600 bg-amber-500/10' }, micro_frontend: { label: '微前端', cls: 'text-neutral-900 bg-neutral-900/10' } };
const SOURCE_BADGE: Record<string, { label: string; cls: string }> = { internal: { label: '自研', cls: 'text-sky-600 bg-sky-500/10' }, partner: { label: '合作方', cls: 'text-neutral-900 bg-neutral-900/10' }, cloud: { label: '云服务', cls: 'text-cyan-600 bg-cyan-500/10' } };
const ICON_COLORS = ['bg-neutral-900', 'bg-neutral-800', 'bg-neutral-700', 'bg-stone-800', 'bg-zinc-800', 'bg-neutral-600', 'bg-slate-800', 'bg-neutral-950'];
function pickColor(str: string): string { let h = 0; for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h); return ICON_COLORS[Math.abs(h) % ICON_COLORS.length]; }

function appStatusPresentation(status: AppStatus): { label: string; tone: MarketplaceStatusTone } {
  return {
    label: statusLabel(status),
    tone: status === 'published' ? 'published' : status === 'draft' ? 'draft' : 'neutral',
  };
}

function safeText(v: unknown): string { return String(v ?? ''); }

export const AppMarket: React.FC<Props> = ({ theme, fontSize: _fontSize, themeColor: _themeColor, showMessage }) => {
  const navigate = useNavigate();
  const { chromePageTitle } = useLayoutChrome();
  const isDark = theme === 'dark';
  const [apps, setApps] = useState<SmartApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<Error | null>(null);
  const [keyword, setKeyword] = useState('');
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [catalogTags, setCatalogTags] = useState<TagItem[]>([]);
  useEffect(() => {
    tagService.list()
      .then((list) => setCatalogTags(filterTagsForResourceType(list, 'app')))
      .catch(() => setCatalogTags([]));
  }, []);

  const loadApps = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    void smartAppService.list({
      status: 'published',
      pageSize: 50,
      keyword: keyword.trim() || undefined,
      tags: tagFilter ? [tagFilter] : undefined,
    } as any)
      .then((res) => { if (!cancelled) setApps(res.list); })
      .catch((err) => {
        if (!cancelled) {
          const error = err instanceof Error ? err : new Error('加载应用列表失败');
          setLoadError(error);
          showMessage?.(error.message, 'error');
        }
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [showMessage, keyword, tagFilter]);

  useEffect(() => {
    const cleanup = loadApps();
    return cleanup;
  }, [loadApps]);

  const filtered = useMemo(() => {
    if (!keyword.trim()) return apps;
    const kw = keyword.toLowerCase();
    return apps.filter((a) =>
      safeText(a.displayName).toLowerCase().includes(kw)
      || safeText(a.appName).toLowerCase().includes(kw)
      || safeText(a.description).toLowerCase().includes(kw)
      || (a.tags ?? []).some((t) => t.toLowerCase().includes(kw)));
  }, [apps, keyword]);

  return (
    <div className={`w-full ${canvasBodyBg(theme)}`}>
      <div className={`px-0 ${consoleContentTopPad} ${mainScrollPadBottom}`}>
        <div className={`${bentoCard(theme)} overflow-hidden p-4 sm:p-6 lg:p-8`}>
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className={`shrink-0 rounded-xl p-2 ${isDark ? 'bg-blue-500/15' : 'bg-blue-50'}`}><LayoutGrid size={22} className="text-blue-500" /></div>
            <PageTitleTagline
              subtitleOnly
              theme={theme}
              title={chromePageTitle || '应用广场'}
              tagline="浏览应用资产；以 resolve 获取 launch 为主，invoke 多为 redirect/票据；未走网关 invoke 的打开不计入调用统计"
              suffix={
                apps.length > 0 ? (
                  <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full ${isDark ? 'bg-white/5 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>{apps.length}</span>
                ) : null
              }
            />
          </div>
          <GlassPanel theme={theme} padding="sm" className="!p-0 w-full sm:w-72">
            <div className="relative">
              <Search size={16} className={`absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${iconMuted(theme)}`} />
              <input type="text" placeholder="搜索应用…" value={keyword} onChange={(e) => setKeyword(e.target.value)} className={`w-full bg-transparent pl-9 pr-3 py-2.5 text-sm outline-none ${textPrimary(theme)}`} />
            </div>
          </GlassPanel>
        </div>

        <div className="flex flex-wrap gap-2 mb-5 items-center">
          <span className={`text-xs font-medium shrink-0 ${textMuted(theme)}`}>标签：</span>
          <button type="button" onClick={() => setTagFilter(null)} className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${tagFilter === null ? 'bg-neutral-900 text-white shadow-sm shadow-neutral-900/15' : isDark ? 'text-slate-400 hover:bg-white/5' : 'text-slate-600 hover:bg-slate-100'}`}>全部</button>
          {catalogTags.map((t) => (
            <button key={t.id} type="button" onClick={() => setTagFilter((p) => (p === t.name ? null : t.name))} className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${tagFilter === t.name ? 'bg-neutral-900 text-white shadow-sm shadow-neutral-900/15' : isDark ? 'text-slate-400 hover:bg-white/5' : 'text-slate-600 hover:bg-slate-100'}`}>{t.name}</button>
          ))}
        </div>

        {/* Grid */}
        {loading ? <PageSkeleton type="cards" />
        : loadError ? <PageError error={loadError} onRetry={() => { loadApps(); }} retryLabel="重试加载应用市场" />
        : filtered.length === 0 ? <div className="text-center py-20"><p className={`text-lg font-medium ${textMuted(theme)}`}>暂无匹配的应用</p><p className={`text-sm mt-1 ${textMuted(theme)}`}>尝试调整搜索关键词</p></div>
        : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((app) => {
              const st = appStatusPresentation(app.status);
              return (
                <BentoCard
                  key={app.id}
                  theme={theme}
                  hover
                  glow="indigo"
                  padding="md"
                  onClick={() => navigate(buildPath('user', 'apps-center', app.id))}
                  className="flex flex-col h-full"
                >
                  <MarketplaceListingCard
                    theme={theme}
                    title={app.displayName}
                    statusChip={{ label: st.label, tone: st.tone }}
                    trailing={(
                      app.icon ? (
                        <img src={app.icon} alt="" className="h-10 w-10 rounded-xl object-cover ring-1 ring-black/10" loading="lazy" />
                      ) : (
                        <div className={`flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold text-white ${pickColor(app.appName)}`}>
                          {(app.displayName || app.appName).charAt(0)}
                        </div>
                      )
                    )}
                    metaRow={(
                      <>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${EMBED_BADGE[app.embedType].cls}`}>{EMBED_BADGE[app.embedType].label}</span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${(SOURCE_BADGE[app.sourceType as string] ?? SOURCE_BADGE.internal).cls}`}>
                          {(SOURCE_BADGE[app.sourceType as string] ?? SOURCE_BADGE.internal).label}
                        </span>
                        {(app.tags ?? []).slice(0, 4).map((tg) => (
                          <span key={tg} className={techBadge(theme)}>{tg}</span>
                        ))}
                      </>
                    )}
                    description={app.description || '暂无描述'}
                    footerLeft={(
                      <span className="block truncate font-mono text-[11px]" title={`@${app.appName}`}>
                        @{app.appName}
                      </span>
                    )}
                    footerStats={(
                      <>
                        <MarketplaceStatItem icon={Star} title="目录评分">
                          {app.ratingAvg != null ? app.ratingAvg.toFixed(1) : '—'}
                        </MarketplaceStatItem>
                        <MarketplaceStatItem icon={MessageSquare} title="评论数">
                          {app.reviewCount ?? 0}
                        </MarketplaceStatItem>
                        {app.categoryName ? (
                          <MarketplaceStatItem icon={Tag} title="分类">
                            {app.categoryName}
                          </MarketplaceStatItem>
                        ) : null}
                      </>
                    )}
                    primaryAction={(
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(buildPath('user', 'apps-center', app.id));
                        }}
                        className={`${btnPrimary} !py-1.5 !px-3 !text-xs`}
                      >
                        查看与使用
                      </button>
                    )}
                  />
                </BentoCard>
              );
            })}
          </div>
        )}
        </div>
      </div>
    </div>
  );
};
