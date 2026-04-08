import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ExternalLink, Heart, Loader2, MessageSquare, Star, Tag } from 'lucide-react';
import type { Theme, FontSize, ThemeColor } from '../../types';
import type { SmartApp, EmbedType, AppStatus } from '../../types/dto/smart-app';
import { smartAppService } from '../../api/services/smart-app.service';
import { userActivityService } from '../../api/services/user-activity.service';
import { resourceCatalogService } from '../../api/services/resource-catalog.service';
import { mapInvokeFlowError } from '../../utils/invokeError';
import { ApiException } from '../../types/api';
import { env } from '../../config/env';
import { btnPrimary, btnSecondary, textPrimary, textSecondary, textMuted, techBadge, statusLabel } from '../../utils/uiClasses';
import { ResourceMarketDetailShell } from '../../components/market';
import { ResourceReviewsSection } from '../../components/business/ResourceReviewsSection';
import { GrantApplicationModal } from '../../components/business/GrantApplicationModal';
import { GatewayApiKeyInput } from '../../components/common/GatewayApiKeyInput';
import { PageError } from '../../components/common/PageError';
import { PageSkeleton } from '../../components/common/PageSkeleton';
import { usePersistedGatewayApiKey } from '../../hooks/usePersistedGatewayApiKey';
import { safeOpenHttpUrl } from '../../lib/windowNavigate';
import { resolvePersonDisplay } from '../../utils/personDisplay';
import type { MarketplaceStatusTone } from '../../components/market';
import { MarkdownView } from '../../components/common/MarkdownView';

export interface AppMarketDetailPageProps {
  resourceId: string;
  theme: Theme;
  fontSize: FontSize;
  themeColor: ThemeColor;
  showMessage?: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  onNavigateToList: () => void;
}

const EMBED_BADGE: Record<EmbedType, { label: string; cls: string }> = {
  iframe: { label: '嵌入式', cls: 'text-blue-600 bg-blue-500/10' },
  redirect: { label: '外链', cls: 'text-amber-600 bg-amber-500/10' },
  micro_frontend: { label: '微前端', cls: 'text-neutral-900 bg-neutral-900/10' },
};
const SOURCE_BADGE: Record<string, { label: string; cls: string }> = {
  internal: { label: '自研', cls: 'text-sky-600 bg-sky-500/10' },
  partner: { label: '合作方', cls: 'text-neutral-900 bg-neutral-900/10' },
  cloud: { label: '云服务', cls: 'text-cyan-600 bg-cyan-500/10' },
};
const ICON_COLORS = ['bg-neutral-900', 'bg-neutral-800', 'bg-neutral-700', 'bg-stone-800', 'bg-zinc-800', 'bg-neutral-600', 'bg-slate-800', 'bg-neutral-950'];
function pickColor(str: string): string {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
  return ICON_COLORS[Math.abs(h) % ICON_COLORS.length];
}

function appStatusPresentation(status: AppStatus): { label: string; tone: MarketplaceStatusTone } {
  return {
    label: statusLabel(status),
    tone: status === 'published' ? 'published' : status === 'draft' ? 'draft' : 'neutral',
  };
}

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

export const AppMarketDetailPage: React.FC<AppMarketDetailPageProps> = ({
  resourceId,
  theme,
  fontSize: _fontSize,
  themeColor: _themeColor,
  showMessage,
  onNavigateToList,
}) => {
  const isDark = theme === 'dark';
  const [app, setApp] = useState<SmartApp | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [tab, setTab] = useState<'intro' | 'use' | 'reviews'>('intro');
  const [grantOpen, setGrantOpen] = useState(false);
  const [opening, setOpening] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [gatewayApiKeyDraft, setGatewayApiKeyDraft] = usePersistedGatewayApiKey();
  const [gatewayOpenError, setGatewayOpenError] = useState('');

  const load = useCallback(async () => {
    const id = Number(resourceId);
    if (!Number.isFinite(id)) {
      setError(new Error('无效的应用 ID'));
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await smartAppService.getById(id);
      setApp(data);
    } catch (e) {
      setApp(null);
      setError(e instanceof Error ? e : new Error('加载失败'));
    } finally {
      setLoading(false);
    }
  }, [resourceId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setGatewayOpenError('');
  }, [app?.id]);

  useEffect(() => {
    if (!app) {
      setIsFavorited(false);
      return;
    }
    let cancelled = false;
    setIsFavorited(false);
    userActivityService
      .getFavorites()
      .then((list) => {
        if (cancelled) return;
        const hit = list.some((item) => item.targetType === 'app' && String(item.targetId) === String(app.id));
        setIsFavorited(hit);
      })
      .catch(() => {
        if (!cancelled) setIsFavorited(false);
      });
    return () => {
      cancelled = true;
    };
  }, [app]);

  const handleOpen = async () => {
    if (!app) return;
    setOpening(true);
    setGatewayOpenError('');
    try {
      const apiKey = gatewayApiKeyDraft.trim();
      if (!apiKey) {
        setGatewayOpenError('请先选择并绑定 API Key');
        return;
      }
      let resolved;
      try {
        resolved = await resourceCatalogService.resolve(
          { resourceType: 'app', resourceId: String(app.id) },
          { headers: { 'X-Api-Key': apiKey } },
        );
      } catch (err) {
        if (err instanceof ApiException && err.code === 1009) {
          setGatewayOpenError(err.message || '请绑定有效的 X-Api-Key');
        } else if (err instanceof ApiException && (err.status === 401 || err.code === 1002)) {
          setGatewayOpenError('请先选择有效 API Key');
        } else if (err instanceof ApiException && (err.status === 403 || err.code === 1003)) {
          setGatewayOpenError('你暂无该应用使用权限，请先申请授权');
        } else if (err instanceof Error && (err.message.includes('X-Api-Key') || err.message.includes('API Key'))) {
          setGatewayOpenError('请先选择并绑定 API Key');
        } else {
          setGatewayOpenError(mapInvokeFlowError(err, 'resolve'));
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
      setOpening(false);
    }
  };

  const handleFavorite = useCallback(async () => {
    if (!app || favoriteLoading || isFavorited) return;
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
  }, [app, favoriteLoading, isFavorited, showMessage]);

  const statusChip = useMemo(() => (app ? appStatusPresentation(app.status) : null), [app]);

  if (loading) return <PageSkeleton type="detail" />;
  if (error || !app) {
    return (
      <div className="px-4 py-8">
        <PageError error={error ?? new Error('未找到应用')} onRetry={() => void load()} retryLabel="重试" />
        <button type="button" className={`mt-4 ${btnSecondary(theme)}`} onClick={onNavigateToList}>
          返回市场
        </button>
      </div>
    );
  }

  const st = statusChip!;

  return (
    <>
      <ResourceMarketDetailShell
        theme={theme}
        onBack={onNavigateToList}
        backLabel="返回应用广场"
        titleBlock={(
          <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start">
            {app.icon ? (
              <img src={app.icon} alt="" className="h-14 w-14 shrink-0 rounded-2xl object-cover ring-1 ring-black/10" loading="lazy" />
            ) : (
              <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-lg font-bold text-white ${pickColor(app.appName)}`}>
                {(app.displayName || app.appName).charAt(0)}
              </div>
            )}
            <div className="min-w-0 flex-1 space-y-2">
              <h1 className={`text-2xl font-bold tracking-tight sm:text-3xl ${textPrimary(theme)}`}>{app.displayName}</h1>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className={`inline-flex items-center rounded-md px-2 py-0.5 font-semibold ${EMBED_BADGE[app.embedType].cls}`}>
                  {EMBED_BADGE[app.embedType].label}
                </span>
                <span className={`inline-flex items-center rounded-md px-2 py-0.5 font-semibold ${(SOURCE_BADGE[app.sourceType as string] ?? SOURCE_BADGE.internal).cls}`}>
                  {(SOURCE_BADGE[app.sourceType as string] ?? SOURCE_BADGE.internal).label}
                </span>
                <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${
                  st.tone === 'published'
                    ? isDark ? 'bg-emerald-500/20 text-emerald-200' : 'bg-emerald-100 text-emerald-800'
                    : isDark ? 'bg-white/10 text-slate-300' : 'bg-slate-100 text-slate-600'
                }`}
                >
                  {st.label}
                </span>
                <span className={`font-mono ${textMuted(theme)}`}>@{app.appName}</span>
              </div>
            </div>
          </div>
        )}
        headerActions={(
          <>
            <button
              type="button"
              className={`${btnSecondary(theme)} min-h-11 disabled:opacity-50`}
              disabled={favoriteLoading || isFavorited}
              onClick={() => void handleFavorite()}
            >
              {favoriteLoading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  收藏中…
                </>
              ) : (
                <>
                  <Heart size={14} className={isFavorited ? 'fill-current' : ''} />
                  {isFavorited ? '已收藏' : '收藏'}
                </>
              )}
            </button>
            <button type="button" className={`${btnSecondary(theme)} min-h-11`} onClick={() => setGrantOpen(true)}>
              获取授权指引
            </button>
            <button
              type="button"
              className={`${btnPrimary} inline-flex min-h-11 items-center justify-center gap-2`}
              disabled={opening}
              onClick={() => void handleOpen()}
            >
              {opening ? '打开中…' : '打开应用'}
              <ExternalLink size={16} className="shrink-0 opacity-90" aria-hidden />
            </button>
          </>
        )}
        tabs={[
          { id: 'intro', label: '应用介绍' },
          { id: 'use', label: '使用应用' },
          { id: 'reviews', label: '评分评论', badge: Math.max(0, Math.floor(Number(app.reviewCount ?? 0)) || 0) },
        ]}
        activeTabId={tab}
        onTabChange={(id) => setTab(id as 'intro' | 'use' | 'reviews')}
        mainColumn={(
          <div
            className={`rounded-[28px] border p-6 shadow-[0_8px_24px_-4px_rgba(0,0,0,0.02)] ${
              isDark ? 'border-white/10 bg-lantu-elevated' : 'border-transparent bg-white'
            }`}
          >
            {tab === 'intro' ? (
              <div className="space-y-4">
                {app.serviceDetailMd?.trim() ? (
                  <MarkdownView value={app.serviceDetailMd} className="text-sm" />
                ) : (
                  <p className={`text-sm ${textMuted(theme)}`}>
                    暂无详细介绍；资源所有方可在「资源注册」中填写「应用介绍」，正文支持 Markdown。
                  </p>
                )}
                <p className={`text-sm leading-relaxed ${textSecondary(theme)}`}>{app.description || '暂无描述'}</p>
                <div className={`flex flex-wrap gap-3 text-xs ${textMuted(theme)}`}>
                  <span>
                    创建者：
                    {resolvePersonDisplay({ names: [app.createdByName], ids: [app.createdBy ?? undefined] })}
                  </span>
                  <span className="inline-flex items-center gap-0.5 tabular-nums">
                    <Star size={13} className="shrink-0 text-amber-500" aria-hidden />
                    目录评分
                    {app.ratingAvg != null ? app.ratingAvg.toFixed(1) : '—'}
                    （
                    {app.reviewCount ?? 0}
                    {' '}
                    条）
                  </span>
                </div>
                {(app.tags ?? []).length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {(app.tags ?? []).map((tg) => (
                      <span key={tg} className={techBadge(theme)}>
                        {tg}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ) : tab === 'use' ? (
              <div className="space-y-4">
                <GatewayApiKeyInput
                  theme={theme}
                  id="app-detail-gateway-key"
                  value={gatewayApiKeyDraft}
                  errorText={gatewayOpenError || undefined}
                  onChange={(v) => {
                    setGatewayApiKeyDraft(v);
                    setGatewayOpenError('');
                  }}
                />
                <p className={`text-xs leading-relaxed ${textMuted(theme)}`}>
                  绑定 API Key 后通过目录 resolve 获取启动地址；顶部「打开应用」也可一键尝试。
                </p>
                <button
                  type="button"
                  className={`${btnPrimary} inline-flex min-h-11 items-center justify-center gap-2`}
                  disabled={opening}
                  onClick={() => void handleOpen()}
                >
                  {opening ? '打开中…' : '打开应用'}
                  <ExternalLink size={16} className="shrink-0 opacity-90" aria-hidden />
                </button>
              </div>
            ) : (
              <div>
                <h4 className={`mb-4 flex items-center gap-2 text-base font-bold ${textPrimary(theme)}`}>
                  <MessageSquare size={18} className="text-blue-500" aria-hidden />
                  评分与评论
                </h4>
                <ResourceReviewsSection targetType="app" targetId={app.id} theme={theme} showMessage={showMessage} />
              </div>
            )}
          </div>
        )}
        sidebarColumn={(
          <div className="space-y-4">
            <div
              className={`rounded-2xl border p-4 text-sm ${isDark ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200/80 bg-slate-50/80'}`}
            >
              <p className={`text-xs font-semibold ${textSecondary(theme)}`}>使用说明</p>
              <p className={`mt-2 text-xs leading-relaxed ${textMuted(theme)}`}>
                绑定 API Key 后点击「打开应用」会通过目录 resolve 获取启动地址；嵌入式应用通常在新窗口打开。
              </p>
            </div>
            {app.categoryName ? (
              <div
                className={`rounded-2xl border p-4 ${isDark ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200/80 bg-slate-50/80'}`}
              >
                <div className={`mb-1 flex items-center gap-1.5 text-xs font-semibold ${textSecondary(theme)}`}>
                  <Tag size={14} aria-hidden />
                  分类
                </div>
                <p className={`text-sm ${textPrimary(theme)}`}>{app.categoryName}</p>
              </div>
            ) : null}
          </div>
        )}
      />
      <GrantApplicationModal
        open={grantOpen}
        onClose={() => setGrantOpen(false)}
        theme={theme}
        resourceType="app"
        resourceId={app.id}
        resourceName={app.displayName}
        showMessage={showMessage}
      />
    </>
  );
};
