import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, LayoutGrid, ExternalLink, MessageSquare, Loader2, Heart } from 'lucide-react';
import type { Theme, FontSize, ThemeColor } from '../../types';
import type { SmartApp, EmbedType } from '../../types/dto/smart-app';
import { smartAppService } from '../../api/services/smart-app.service';
import { userActivityService } from '../../api/services/user-activity.service';
import { tagService } from '../../api/services/tag.service';
import { filterTagsForResourceType } from '../../utils/marketTags';
import type { TagItem } from '../../types/dto/tag';
import { resourceCatalogService } from '../../api/services/resource-catalog.service';
import { mapInvokeFlowError } from '../../utils/invokeError';
import { ApiException } from '../../types/api';
import { env } from '../../config/env';
import {
  canvasBodyBg, mainScrollCompositorClass, bentoCard, btnPrimary, btnSecondary,
  textPrimary, textSecondary, textMuted, techBadge,
} from '../../utils/uiClasses';
import { BentoCard } from '../../components/common/BentoCard';
import { GlassPanel } from '../../components/common/GlassPanel';
import { Modal } from '../../components/common/Modal';
import { ResourceReviewsSection } from '../../components/business/ResourceReviewsSection';
import { GrantApplicationModal } from '../../components/business/GrantApplicationModal';
import { useLayoutChrome } from '../../context/LayoutChromeContext';
import { PageError } from '../../components/common/PageError';
import { PageSkeleton } from '../../components/common/PageSkeleton';
import { PageTitleTagline } from '../../components/common/PageTitleTagline';
import { formatDateTime } from '../../utils/formatDateTime';
import { usePersistedGatewayApiKey } from '../../hooks/usePersistedGatewayApiKey';
import { GatewayApiKeyInput } from '../../components/common/GatewayApiKeyInput';
import { safeOpenHttpUrl } from '../../lib/windowNavigate';

interface Props { theme: Theme; fontSize: FontSize; themeColor?: ThemeColor; showMessage?: (msg: string, type: 'success' | 'error' | 'info' | 'warning') => void; }

const EMBED_BADGE: Record<EmbedType, { label: string; cls: string }> = { iframe: { label: '嵌入式', cls: 'text-blue-600 bg-blue-500/10' }, redirect: { label: '外链', cls: 'text-amber-600 bg-amber-500/10' }, micro_frontend: { label: '微前端', cls: 'text-neutral-900 bg-neutral-900/10' } };
const SOURCE_BADGE: Record<string, { label: string; cls: string }> = { internal: { label: '自研', cls: 'text-sky-600 bg-sky-500/10' }, partner: { label: '合作方', cls: 'text-neutral-900 bg-neutral-900/10' }, cloud: { label: '云服务', cls: 'text-cyan-600 bg-cyan-500/10' } };
const ICON_COLORS = ['bg-neutral-900', 'bg-neutral-800', 'bg-neutral-700', 'bg-stone-800', 'bg-zinc-800', 'bg-neutral-600', 'bg-slate-800', 'bg-neutral-950'];
function pickColor(str: string): string { let h = 0; for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h); return ICON_COLORS[Math.abs(h) % ICON_COLORS.length]; }

function safeText(v: unknown): string { return String(v ?? ''); }
function resolveLaunchUrl(rawUrl?: string): string {
  const launchUrl = String(rawUrl ?? '').trim();
  if (!launchUrl) return '';
  if (/^https?:\/\//i.test(launchUrl)) return launchUrl;
  const base = env.VITE_API_BASE_URL;
  const absoluteBase = /^https?:\/\//i.test(base)
    ? base
    : `${window.location.origin}${base.startsWith('/') ? base : `/${base}`}`;
  return new URL(launchUrl, absoluteBase).toString();
}

export const AppMarket: React.FC<Props> = ({ theme, fontSize: _fontSize, themeColor: _themeColor, showMessage }) => {
  const { chromePageTitle } = useLayoutChrome();
  const isDark = theme === 'dark';
  const [apps, setApps] = useState<SmartApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<Error | null>(null);
  const [keyword, setKeyword] = useState('');
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [catalogTags, setCatalogTags] = useState<TagItem[]>([]);
  const [detailApp, setDetailApp] = useState<SmartApp | null>(null);
  const [grantModalOpen, setGrantModalOpen] = useState(false);
  const [openingAppId, setOpeningAppId] = useState<number | null>(null);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [detailTab, setDetailTab] = useState<'overview' | 'reviews'>('overview');
  const [searchParams, setSearchParams] = useSearchParams();
  const processedResourceId = useRef<string | null>(null);
  const [gatewayApiKeyDraft, setGatewayApiKeyDraft] = usePersistedGatewayApiKey();

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

  useEffect(() => {
    const rid = searchParams.get('resourceId');
    if (!rid) {
      processedResourceId.current = null;
      return;
    }
    if (loading || apps.length === 0) return;
    if (processedResourceId.current === rid) return;
    processedResourceId.current = rid;
    const next = new URLSearchParams(searchParams);
    next.delete('resourceId');
    setSearchParams(next, { replace: true });
    const hit = apps.find((a) => String(a.id) === String(rid));
    if (hit) {
      setDetailApp(hit);
      setDetailTab('overview');
    } else {
      showMessage?.('未在已上架列表中找到该应用，请确认资源已发布且 ID 正确', 'warning');
    }
  }, [loading, apps, searchParams, setSearchParams, showMessage]);

  useEffect(() => {
    if (!detailApp) {
      setIsFavorited(false);
      return;
    }
    let cancelled = false;
    setIsFavorited(false);
    userActivityService.getFavorites()
      .then((list) => {
        if (cancelled) return;
        const hit = list.some((item) => item.targetType === 'app' && String(item.targetId) === String(detailApp.id));
        setIsFavorited(hit);
      })
      .catch(() => {
        if (!cancelled) setIsFavorited(false);
      });
    return () => {
      cancelled = true;
    };
  }, [detailApp]);

  /** 列表项无 spec；GET /catalog/resources/app/{id} 含 embedType/icon/screenshots */
  useEffect(() => {
    const id = detailApp?.id;
    if (id == null) return;
    let cancelled = false;
    void smartAppService.getById(Number(id)).then((full) => {
      if (!cancelled) setDetailApp(full);
    }).catch(() => { /* 保留列表项兜底 */ });
    return () => {
      cancelled = true;
    };
  }, [detailApp?.id]);

  const filtered = useMemo(() => {
    if (!keyword.trim()) return apps;
    const kw = keyword.toLowerCase();
    return apps.filter((a) =>
      safeText(a.displayName).toLowerCase().includes(kw)
      || safeText(a.appName).toLowerCase().includes(kw)
      || safeText(a.description).toLowerCase().includes(kw)
      || (a.tags ?? []).some((t) => t.toLowerCase().includes(kw)));
  }, [apps, keyword]);

  const handleOpen = async (app: SmartApp) => {
    setOpeningAppId(app.id);
    try {
      const apiKey = gatewayApiKeyDraft.trim();
      if (!apiKey) {
        showMessage?.('请先选择并绑定 API Key', 'warning');
        return;
      }
      let resolved;
      try {
        resolved = await resourceCatalogService.resolve({
          resourceType: 'app',
          resourceId: String(app.id),
        }, {
          headers: { 'X-Api-Key': apiKey },
        });
      } catch (err) {
        if (err instanceof ApiException && err.code === 1009) {
          showMessage?.(err.message || '请绑定有效的 X-Api-Key', 'warning');
        } else if (err instanceof ApiException && (err.status === 401 || err.code === 1002)) {
          showMessage?.('请先选择有效 API Key', 'warning');
        } else if (err instanceof ApiException && (err.status === 403 || err.code === 1003)) {
          showMessage?.('你暂无该应用使用权限，请先申请授权', 'warning');
        } else if (err instanceof Error && (err.message.includes('X-Api-Key') || err.message.includes('API Key'))) {
          showMessage?.('请先选择并绑定 API Key', 'warning');
        } else {
          showMessage?.(mapInvokeFlowError(err, 'resolve'), 'error');
        }
        return;
      }
      if (resolved.invokeType === 'metadata') {
        showMessage?.(`该应用为元数据类型：${JSON.stringify(resolved.spec ?? {}, null, 2)}`, 'info');
        return;
      }
      if (resolved.invokeType !== 'redirect') {
        showMessage?.('当前应用不是可跳转类型，请联系管理员检查资源配置', 'warning');
        return;
      }
      const launchUrl = resolveLaunchUrl(resolved.launchUrl);
      if (launchUrl) {
        const opened = safeOpenHttpUrl(launchUrl);
        if (!opened) {
          showMessage?.('无法打开：地址非 http(s) 或浏览器拦截了弹窗', 'warning');
          return;
        }
        if (app.embedType === 'iframe') showMessage?.('应用已在新窗口打开', 'info');
        return;
      }
      if (resolved.endpoint) {
        if (!safeOpenHttpUrl(resolved.endpoint)) {
          showMessage?.('兼容地址无效或弹窗被拦截（仅支持 http/https）', 'warning');
          return;
        }
        showMessage?.('当前应用使用兼容地址打开（建议后端返回 launchUrl）', 'info');
        return;
      }
      showMessage?.('当前应用未返回可用启动地址，请联系管理员', 'warning');
    } finally {
      setOpeningAppId(null);
    }
  };

  const handleApplyAuthorization = () => {
    if (!detailApp) return;
    setGrantModalOpen(true);
  };

  const handleFavorite = useCallback(async (app: SmartApp) => {
    if (favoriteLoading || isFavorited) return;
    setFavoriteLoading(true);
    try {
      await userActivityService.addFavorite('app', Number(app.id));
      setIsFavorited(true);
      showMessage?.('已加入我的收藏', 'success');
    } catch (e) {
      const message = e instanceof Error ? e.message : '收藏失败';
      if (message.includes('FAVORITE_EXISTS') || message.includes('已收藏')) {
        setIsFavorited(true);
        showMessage?.('该资源已在收藏夹中', 'info');
      } else {
        showMessage?.(message, 'error');
      }
    } finally {
      setFavoriteLoading(false);
    }
  }, [favoriteLoading, isFavorited, showMessage]);

  return (
    <div className={`flex-1 flex flex-col min-h-0 overflow-hidden ${canvasBodyBg(theme)}`}>
      <div className={`flex-1 min-h-0 overflow-y-auto custom-scrollbar px-2 sm:px-3 lg:px-4 py-2 sm:py-3 ${mainScrollCompositorClass}`}>
        <div className={`${bentoCard(theme)} overflow-hidden p-4 sm:p-6 lg:p-8`}>
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className={`shrink-0 rounded-xl p-2 ${isDark ? 'bg-blue-500/15' : 'bg-blue-50'}`}><LayoutGrid size={22} className="text-blue-500" /></div>
            <PageTitleTagline
              subtitleOnly
              theme={theme}
              title={chromePageTitle || '应用广场'}
              tagline="智能应用一览"
              suffix={
                apps.length > 0 ? (
                  <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full ${isDark ? 'bg-white/5 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>{apps.length}</span>
                ) : null
              }
            />
          </div>
          <GlassPanel theme={theme} padding="sm" className="!p-0 w-full sm:w-72">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
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
            {filtered.map((app) => (
              <BentoCard key={app.id} theme={theme} hover glow="indigo" padding="md" onClick={() => setDetailApp(app)} className="flex flex-col h-full !rounded-[20px]">
                <div className="flex items-start gap-3 mb-3">
                  {app.icon ? (
                    <img src={app.icon} alt="" className="w-10 h-10 rounded-xl object-cover shrink-0 ring-1 ring-black/10" loading="lazy" />
                  ) : (
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0 ${pickColor(app.appName)}`}>{(app.displayName || app.appName).charAt(0)}</div>
                  )}
                  <div className="min-w-0 flex-1"><h3 className={`font-semibold truncate ${textPrimary(theme)}`}>{app.displayName}</h3></div>
                </div>
                <p className={`text-sm leading-relaxed mb-3 line-clamp-2 ${textSecondary(theme)}`}>{app.description || '暂无描述'}</p>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${EMBED_BADGE[app.embedType].cls}`}>{EMBED_BADGE[app.embedType].label}</span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${(SOURCE_BADGE[app.sourceType as string] ?? SOURCE_BADGE.internal).cls}`}>{(SOURCE_BADGE[app.sourceType as string] ?? SOURCE_BADGE.internal).label}</span>
                  {(app.tags ?? []).slice(0, 4).map((tg) => (
                    <span key={tg} className={techBadge(theme)}>{tg}</span>
                  ))}
                </div>
                <div className={`flex items-center justify-between gap-2 pt-3 border-t mt-auto ${isDark ? 'border-white/[0.08]' : 'border-slate-200/40'}`}>
                  <div className={`text-[11px] ${textMuted(theme)}`}>
                    {app.categoryName && <span>{app.categoryName} · </span>}
                    {app.createTime && <span>{formatDateTime(app.createTime)}</span>}
                  </div>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setDetailApp(app); setDetailTab('overview'); }}
                    className={`${btnPrimary} !py-1.5 !px-3 !text-xs`}
                  >
                    查看与使用
                  </button>
                </div>
              </BentoCard>
            ))}
          </div>
        )}
        </div>
      </div>

      {/* Detail + Reviews Modal */}
      <Modal open={!!detailApp} onClose={() => { setDetailApp(null); setGrantModalOpen(false); }} theme={theme} size="lg">
        {detailApp && (
          <>
            <div className="flex items-center gap-3 mb-4">
              {detailApp.icon ? (
                <img src={detailApp.icon} alt="" className="w-10 h-10 rounded-xl object-cover shrink-0 ring-1 ring-black/10" />
              ) : (
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0 ${pickColor(detailApp.appName)}`}>{(detailApp.displayName || detailApp.appName).charAt(0)}</div>
              )}
              <div className="min-w-0 flex-1">
                <h3 className={`text-lg font-bold truncate ${textPrimary(theme)}`}>{detailApp.displayName}</h3>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${EMBED_BADGE[detailApp.embedType].cls}`}>{EMBED_BADGE[detailApp.embedType].label}</span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${(SOURCE_BADGE[detailApp.sourceType as string] ?? SOURCE_BADGE.internal).cls}`}>{(SOURCE_BADGE[detailApp.sourceType as string] ?? SOURCE_BADGE.internal).label}</span>
                </div>
              </div>
              <div className="mr-8 flex flex-wrap items-center justify-end gap-2 sm:mr-9">
                <button
                  type="button"
                  disabled={favoriteLoading || isFavorited}
                  onClick={() => detailApp && void handleFavorite(detailApp)}
                  className={`${btnSecondary(theme)} shrink-0 disabled:opacity-50`}
                >
                  {favoriteLoading ? <><Loader2 size={14} className="animate-spin" /> 收藏中…</> : <><Heart size={14} className={isFavorited ? 'fill-current' : ''} /> {isFavorited ? '已收藏' : '收藏'}</>}
                </button>
                <button type="button" onClick={handleApplyAuthorization} className={`${btnSecondary(theme)} shrink-0`}>
                  获取授权指引
                </button>
                <button type="button" disabled={openingAppId === detailApp.id} onClick={(e) => { e.stopPropagation(); void handleOpen(detailApp); }} className={`${btnPrimary} shrink-0 disabled:opacity-50`}>{openingAppId === detailApp.id ? '打开中…' : '打开应用'} <ExternalLink size={12} /></button>
              </div>
            </div>
            <div className="space-y-5">
              <GatewayApiKeyInput
                theme={theme}
                id="app-market-gateway-key"
                value={gatewayApiKeyDraft}
                onChange={setGatewayApiKeyDraft}
              />
              <div
                className={`inline-flex rounded-xl p-1 ${isDark ? 'bg-white/[0.06]' : 'bg-slate-100'}`}
                role="tablist"
                aria-label="应用详情标签页"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={detailTab === 'overview'}
                  onClick={() => setDetailTab('overview')}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                    detailTab === 'overview'
                      ? isDark ? 'bg-white/12 text-white' : 'bg-white text-slate-900 shadow-sm'
                      : textMuted(theme)
                  }`}
                >
                  应用信息
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={detailTab === 'reviews'}
                  onClick={() => setDetailTab('reviews')}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                    detailTab === 'reviews'
                      ? isDark ? 'bg-white/12 text-white' : 'bg-white text-slate-900 shadow-sm'
                      : textMuted(theme)
                  }`}
                >
                  评分评论
                </button>
              </div>
              {detailTab === 'overview' ? (
                <p className={`text-sm leading-relaxed ${textSecondary(theme)}`}>{detailApp.description || '暂无描述'}</p>
              ) : (
                <div>
                  <h4 className={`font-bold text-base mb-4 flex items-center gap-2 ${textPrimary(theme)}`}><MessageSquare size={18} className="text-blue-500" /> 评分与评论</h4>
                  <ResourceReviewsSection targetType="app" targetId={detailApp.id} theme={theme} showMessage={showMessage} />
                </div>
              )}
            </div>
          </>
        )}
      </Modal>
      <GrantApplicationModal
        open={grantModalOpen}
        onClose={() => setGrantModalOpen(false)}
        theme={theme}
        resourceType="app"
        resourceId={detailApp?.id ?? ''}
        resourceName={detailApp?.displayName}
        showMessage={showMessage}
      />
    </div>
  );
};
