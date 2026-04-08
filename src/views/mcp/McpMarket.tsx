import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { tagService } from '../../api/services/tag.service';
import { filterTagsForResourceType } from '../../utils/marketTags';
import type { TagItem } from '../../types/dto/tag';
import {
  FileText,
  Heart,
  Loader2,
  MessageSquare,
  Puzzle,
  Search,
  Send,
  Sparkles,
  Star,
  Zap,
  Eye,
  BarChart2,
} from 'lucide-react';
import type { Theme, FontSize, ThemeColor } from '../../types';
import type { CatalogResourceDetailVO, ResourceCatalogItemVO } from '../../types/dto/catalog';
import { resourceCatalogService } from '../../api/services/resource-catalog.service';
import { AccessPolicyBadge } from '../../components/business/AccessPolicyBadge';
import { userActivityService } from '../../api/services/user-activity.service';
import { resolvePersonDisplay } from '../../utils/personDisplay';
import { BentoCard } from '../../components/common/BentoCard';
import { MarketplaceListingCard, MarketplaceStatItem } from '../../components/market';
import { ResourceReviewsSection } from '../../components/business/ResourceReviewsSection';
import { ResourceMarketDetailShell } from '../../components/market';
import { GrantApplicationModal } from '../../components/business/GrantApplicationModal';
import { McpDetailInvokeTab } from '../../components/mcp/McpDetailInvokeTab';
import {
  btnPrimary,
  btnSecondary,
  canvasBodyBg,
  iconMuted,
  mainScrollPadBottom,
  statusBadgeClass,
  statusDot,
  statusLabel,
  textMuted,
  textPrimary,
  textSecondary,
} from '../../utils/uiClasses';
import { useLayoutChrome } from '../../context/LayoutChromeContext';
import { PageError } from '../../components/common/PageError';
import { PageSkeleton } from '../../components/common/PageSkeleton';
import { MarkdownView } from '../../components/common/MarkdownView';
import { buildPath } from '../../constants/consoleRoutes';
import { MARKET_HERO_TITLE_CLASSES } from '../../constants/theme';
import {
  catalogAuthorDisplay,
  catalogPrimaryMetricLabel,
  catalogPrimaryMetricValue,
  catalogViewCountValue,
  formatMarketMetric,
} from '../../utils/marketMetrics';
import {
  catalogInvokeSupplementHint,
  catalogItemCircuitState,
  catalogItemHealthStatus,
  catalogRunBadgeHealthKeyForDisplay,
  isCatalogMcpCallable,
  mcpInvokeBlockedReason,
} from '../../utils/catalogObservability';
import { circuitBreakerLabelZh, resourceHealthBadgeClass, resourceHealthLabelZh } from '../../utils/backendEnumLabels';

interface Props {
  theme: Theme;
  fontSize: FontSize;
  themeColor?: ThemeColor;
  showMessage?: (msg: string, type: 'success' | 'error' | 'info' | 'warning') => void;
  /** 路径 `/user/mcp-center/:id` 时由 MainLayout 传入，全页详情 */
  detailResourceId?: string | null;
}

type McpDetailTab = 'service' | 'invoke' | 'reviews';

export const McpMarket: React.FC<Props> = ({ theme, fontSize, themeColor: _themeColor, showMessage, detailResourceId }) => {
  const navigate = useNavigate();
  const { chromePageTitle } = useLayoutChrome();
  const isDark = theme === 'dark';
  const [keyword, setKeyword] = useState('');
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [catalogTags, setCatalogTags] = useState<TagItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<Error | null>(null);
  const [rows, setRows] = useState<ResourceCatalogItemVO[]>([]);
  const [detail, setDetail] = useState<CatalogResourceDetailVO | null>(null);
  const [grantModalOpen, setGrantModalOpen] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [detailTab, setDetailTab] = useState<McpDetailTab>('service');
  const [detailPageLoading, setDetailPageLoading] = useState(false);
  const [detailPageError, setDetailPageError] = useState<Error | null>(null);
  /** 未按标签筛选时的列表快照，用于侧栏标签数量（筛选后仍显示「上次全量列表」分布） */
  const [tagStatsRows, setTagStatsRows] = useState<ResourceCatalogItemVO[]>([]);

  useEffect(() => {
    tagService.list()
      .then((list) => setCatalogTags(filterTagsForResourceType(list, 'mcp')))
      .catch(() => setCatalogTags([]));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      /** 与布局改版前一致：GET /catalog/resources + resourceType=mcp + status=published（服务端筛选，不再二次过滤以免状态枚举与后端不一致导致空列表） */
      const data = await resourceCatalogService.list({
        resourceType: 'mcp',
        status: 'published',
        page: 1,
        pageSize: 100,
        tags: tagFilter ? [tagFilter] : undefined,
        include: 'observability',
      });
      setRows(data.list);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('加载 MCP 市场失败');
      setLoadError(error);
      showMessage?.(error.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [showMessage, tagFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const ridKey = (detailResourceId ?? '').trim();

  const loadMcpDetailByPath = useCallback(async () => {
    if (!ridKey) return;
    setDetailPageLoading(true);
    setDetailPageError(null);
    try {
      const row = await resourceCatalogService.getByTypeAndId('mcp', ridKey, 'observability');
      setDetail(row);
    } catch (e) {
      setDetail(null);
      setDetailPageError(e instanceof Error ? e : new Error('加载失败'));
    } finally {
      setDetailPageLoading(false);
    }
  }, [ridKey]);

  useEffect(() => {
    if (!ridKey) {
      setDetail(null);
      setDetailPageError(null);
      setDetailPageLoading(false);
      return;
    }
    void loadMcpDetailByPath();
  }, [ridKey, loadMcpDetailByPath]);

  useEffect(() => {
    if (!loading && !loadError && tagFilter == null) {
      setTagStatsRows(rows);
    }
  }, [loading, loadError, tagFilter, rows]);

  useEffect(() => {
    if (!detail) return;
    setDetailTab('service');
  }, [detail]);

  useEffect(() => {
    if (!detail) {
      setIsFavorited(false);
      return;
    }
    let cancelled = false;
    setIsFavorited(false);
    userActivityService.getFavorites()
      .then((list) => {
        if (cancelled) return;
        const hit = list.some((item) => item.targetType === 'mcp' && String(item.targetId) === String(detail.resourceId));
        setIsFavorited(hit);
      })
      .catch(() => {
        if (!cancelled) setIsFavorited(false);
      });
    return () => {
      cancelled = true;
    };
  }, [detail]);

  /** 关键词筛选后：可调用靠前，其次按浏览量、调用量、评分依次降序，最后按名称稳定序 */
  const filtered = useMemo(() => {
    const term = keyword.trim().toLowerCase();
    const base = !term
      ? rows
      : rows.filter((item) => {
          const blob = `${item.displayName} ${item.resourceCode} ${item.description ?? ''} ${(item.tags ?? []).join(' ')}`.toLowerCase();
          return blob.includes(term);
        });
    return [...base].sort((a, b) => {
      const tier = (x: ResourceCatalogItemVO) => (isCatalogMcpCallable(x) ? 0 : 1);
      const dTier = tier(a) - tier(b);
      if (dTier !== 0) return dTier;
      const dView = catalogViewCountValue(b) - catalogViewCountValue(a);
      if (dView !== 0) return dView;
      const dCall = catalogPrimaryMetricValue('mcp', b) - catalogPrimaryMetricValue('mcp', a);
      if (dCall !== 0) return dCall;
      const ra = Number(a.ratingAvg ?? 0);
      const rb = Number(b.ratingAvg ?? 0);
      if (ra !== rb) return rb - ra;
      return String(a.displayName ?? '').localeCompare(String(b.displayName ?? ''), 'zh-CN');
    });
  }, [keyword, rows]);

  const tagCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of tagStatsRows) {
      for (const tg of r.tags ?? []) {
        map.set(tg, (map.get(tg) ?? 0) + 1);
      }
    }
    return map;
  }, [tagStatsRows]);

  /** 与目录详情一致：发布者在资源中心「设为当前」的默认解析版本；为空则调用链路与「不指定版本」相同。 */
  const invokeCatalogVersion = useMemo(() => (detail?.version ?? '').trim(), [detail?.version]);

  const listCountLabel = tagStatsRows.length;

  const CategoryNav = ({ className }: { className?: string }) => (
    <nav aria-label="MCP 标签分类" className={className}>
      <ul className="space-y-1">
        <li>
          <button
            type="button"
            aria-current={tagFilter === null ? 'true' : undefined}
            onClick={() => setTagFilter(null)}
            className={`flex min-h-11 w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition-colors motion-reduce:transition-none focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/45 ${
              tagFilter === null
                ? isDark
                  ? 'bg-violet-500/20 text-white'
                  : 'bg-violet-100 text-violet-950'
                : `${textSecondary(theme)} ${isDark ? 'hover:bg-white/[0.06]' : 'hover:bg-slate-100'}`
            }`}
          >
            <span>全部</span>
            <span className={`tabular-nums text-xs font-medium ${textMuted(theme)}`}>{listCountLabel}</span>
          </button>
        </li>
        {catalogTags.map((t) => {
          const n = tagCounts.get(t.name) ?? 0;
          const active = tagFilter === t.name;
          return (
            <li key={t.id}>
              <button
                type="button"
                aria-current={active ? 'true' : undefined}
                onClick={() => setTagFilter((p) => (p === t.name ? null : t.name))}
                className={`flex min-h-11 w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition-colors motion-reduce:transition-none focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/45 ${
                  active
                    ? isDark
                      ? 'bg-violet-500/20 text-white'
                      : 'bg-violet-100 text-violet-950'
                    : `${textSecondary(theme)} ${isDark ? 'hover:bg-white/[0.06]' : 'hover:bg-slate-100'}`
                }`}
              >
                <span className="min-w-0 truncate">{t.name}</span>
                <span className={`shrink-0 tabular-nums text-xs font-medium ${textMuted(theme)}`}>{n}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );

  const handleApply = useCallback(() => {
    if (!detail) return;
    setGrantModalOpen(true);
  }, [detail]);

  const handleFavorite = useCallback(async () => {
    if (!detail || favoriteLoading || isFavorited) return;
    setFavoriteLoading(true);
    try {
      await userActivityService.addFavorite('mcp', Number(detail.resourceId));
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
  }, [detail, favoriteLoading, isFavorited, showMessage]);

  if (ridKey) {
    if (detailPageLoading) {
      return (
        <div className={`w-full min-h-0 ${canvasBodyBg(theme)}`}>
          <PageSkeleton type="detail" />
        </div>
      );
    }
    if (detailPageError || !detail) {
      return (
        <div className={`w-full px-4 py-8 ${canvasBodyBg(theme)}`}>
          <PageError error={detailPageError ?? new Error('未找到 MCP 资源')} onRetry={() => void loadMcpDetailByPath()} retryLabel="重试" />
          <button type="button" className={`mt-4 ${btnSecondary(theme)}`} onClick={() => navigate(buildPath('user', 'mcp-center'))}>
            返回 MCP 市场
          </button>
        </div>
      );
    }
    const mcpCallable = isCatalogMcpCallable(detail);
    const mcpBlockReason = mcpInvokeBlockedReason(detail);
    const mcpSupplementHint = catalogInvokeSupplementHint(detail);
    const detailHealthProbeKey = catalogItemHealthStatus(detail) ?? 'unknown';
    const detailRunBadgeKey = catalogRunBadgeHealthKeyForDisplay(detail);
    const detailCircuit = catalogItemCircuitState(detail);
    return (
      <>
        <ResourceMarketDetailShell
          theme={theme}
          onBack={() => navigate(buildPath('user', 'mcp-center'))}
          backLabel="返回 MCP 市场"
          titleBlock={(
            <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start">
              <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-white shadow-lg ${isDark ? 'bg-gradient-to-br from-violet-500 to-indigo-500' : 'bg-gradient-to-br from-violet-600 to-indigo-600'}`}>
                <Puzzle className="h-7 w-7" aria-hidden />
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                <h1 className={`text-2xl font-bold tracking-tight sm:text-3xl ${textPrimary(theme)}`}>{detail.displayName}</h1>
                <div className={`flex flex-wrap items-center gap-2 text-xs ${textMuted(theme)}`}>
                  <span className="font-mono">@{detail.resourceCode || detail.resourceId}</span>
                  <span className={statusBadgeClass(detail.status ?? 'unknown', theme)}>
                    <span className={statusDot(detail.status ?? 'unknown')} />
                    {statusLabel(detail.status)}
                  </span>
                  <span
                    className={`inline-flex items-center rounded-lg border px-2 py-0.5 text-xs font-semibold ${resourceHealthBadgeClass(theme, detailRunBadgeKey)}`}
                    title={
                      `探测：${resourceHealthLabelZh(detailHealthProbeKey)}` +
                      (detailCircuit && detailCircuit !== 'unknown' && detailCircuit !== 'closed'
                        ? ` · 熔断：${circuitBreakerLabelZh(detailCircuit)}`
                        : '') +
                      (mcpCallable ? '' : ` · ${mcpBlockReason}`)
                    }
                  >
                    运行 {resourceHealthLabelZh(detailRunBadgeKey)}
                  </span>
                  {detailCircuit && detailCircuit !== 'unknown' && detailCircuit !== 'closed' ? (
                    <span className="opacity-90" title="熔断器状态">
                      · {circuitBreakerLabelZh(detailCircuit)}
                    </span>
                  ) : null}
                  <span className="inline-flex items-center gap-0.5 tabular-nums">
                    <Star size={12} className="text-amber-500" aria-hidden />
                    {detail.ratingAvg != null ? detail.ratingAvg.toFixed(1) : '—'}
                  </span>
                  <span>{Number(detail.reviewCount ?? 0)} 条评论</span>
                </div>
              </div>
            </div>
          )}
          headerActions={(
            <>
              <button type="button" className={`${btnSecondary(theme)} min-h-11 disabled:opacity-50`} disabled={favoriteLoading || isFavorited} onClick={() => void handleFavorite()}>
                {favoriteLoading ? <><Loader2 size={14} className="animate-spin" /> 收藏中…</> : <><Heart size={14} className={isFavorited ? 'fill-current' : ''} /> {isFavorited ? '已收藏' : '收藏'}</>}
              </button>
              <button type="button" className={`${btnSecondary(theme)} inline-flex min-h-11 items-center gap-2`} onClick={handleApply}>
                <Send size={14} />
                获取授权指引
              </button>
            </>
          )}
          tabs={[
            { id: 'service', label: '服务详情' },
            { id: 'invoke', label: '工具测试' },
            { id: 'reviews', label: '评分评论', badge: Number(detail.reviewCount ?? 0) },
          ]}
          activeTabId={detailTab}
          onTabChange={(id) => setDetailTab(id as McpDetailTab)}
          mainColumn={(
            <div className="space-y-5">
              {!mcpCallable ? (
                <div
                  role="alert"
                  className={`rounded-2xl border px-4 py-3 text-sm leading-relaxed ${
                    isDark ? 'border-rose-500/35 bg-rose-500/10 text-rose-100' : 'border-rose-200 bg-rose-50 text-rose-950'
                  }`}
                >
                  <p className="font-semibold">当前 MCP 不可通过网关调用</p>
                  <p className={`mt-1 text-xs ${isDark ? 'text-rose-100/85' : 'text-rose-900/85'}`}>{mcpBlockReason}</p>
                  <p className={`mt-2 text-xs ${isDark ? 'text-rose-100/70' : 'text-rose-900/70'}`}>
                    您仍可查看服务说明与评论；待运行恢复或熔断闭合后，「工具测试」将自动可用。
                  </p>
                </div>
              ) : null}
              {mcpCallable && mcpSupplementHint ? (
                <div
                  role="status"
                  className={`rounded-2xl border px-4 py-3 text-sm leading-relaxed ${
                    isDark ? 'border-sky-500/30 bg-sky-500/10 text-sky-100' : 'border-sky-200 bg-sky-50 text-sky-950'
                  }`}
                >
                  <p className="font-semibold">网关提示（可能因账号或配额而异）</p>
                  <p className={`mt-1 text-xs ${isDark ? 'text-sky-100/90' : 'text-sky-950/90'}`}>{mcpSupplementHint}</p>
                </div>
              ) : null}
              <p className={`text-xs ${textMuted(theme)}`}>
                {detailTab === 'service'
                  ? '当前：服务详情'
                  : detailTab === 'invoke'
                    ? '当前：工具测试 · 上方为快速试用，协议与流式见折叠面板'
                    : '当前：资源评论区'}
              </p>
              {detailTab === 'service' ? (
                <div
                  className={`rounded-2xl border p-4 ${isDark ? 'border-white/10 bg-white/[0.02]' : 'border-slate-200 bg-slate-50/60'}`}
                >
                  {detail.serviceDetailMd?.trim() ? (
                    <MarkdownView value={detail.serviceDetailMd} className="text-sm" />
                  ) : (
                    <p className={`text-sm leading-relaxed ${textMuted(theme)}`}>
                      尚未填写服务详情。发布者可在「资源注册 / 编辑 MCP」中的「服务详情」补充 Markdown 说明（接口能力、鉴权、配额与示例等）。
                    </p>
                  )}
                </div>
              ) : detailTab === 'invoke' ? (
                <McpDetailInvokeTab
                  theme={theme}
                  detail={detail}
                  invokeCatalogVersion={invokeCatalogVersion}
                  loadMcpDetailByPath={loadMcpDetailByPath}
                  detailPageLoading={detailPageLoading}
                  showMessage={showMessage}
                  invokeDisabled={!mcpCallable}
                  invokeDisabledReason={mcpBlockReason}
                />
              ) : detailTab === 'reviews' ? (
                <div className={`rounded-2xl border p-4 ${isDark ? 'border-white/10 bg-white/[0.02]' : 'border-slate-200 bg-slate-50/60'}`}>
                  <h4 className={`mb-3 flex items-center gap-2 text-sm font-semibold ${textPrimary(theme)}`}>
                    <MessageSquare size={16} className="text-neutral-800" />
                    评分与评论
                  </h4>
                  <ResourceReviewsSection
                    targetType="mcp"
                    targetId={detail.resourceId}
                    theme={theme}
                    appearance="airy"
                    showMessage={showMessage}
                  />
                </div>
              ) : null}
            </div>
          )}
          sidebarColumn={(
            <div className="space-y-4">
              <div className={`rounded-2xl border p-4 ${isDark ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-slate-50/70'}`}>
                <p className={`text-xs ${textMuted(theme)}`}>资源编码：{detail.resourceCode || detail.resourceId}</p>
                <div className="mt-2">
                  <AccessPolicyBadge theme={theme} value={detail.accessPolicy} showHint={true} />
                </div>
                <p className={`mt-1 text-xs ${textMuted(theme)}`}>
                  调用目标：mcp{' / '}
                  <span className="font-mono">{detail.resourceId}</span>
                </p>
                <p className={`mt-2 text-sm leading-relaxed ${textSecondary(theme)}`}>{detail.description || '暂无描述'}</p>
              </div>
              <div className={`rounded-xl border p-3 text-xs leading-relaxed ${isDark ? 'border-amber-500/25 bg-amber-500/[0.07] text-amber-100/90' : 'border-amber-200 bg-amber-50 text-amber-950/85'}`}>
                <p className="font-semibold">统一网关 MCP 试用说明</p>
                <p className={`mt-1.5 ${isDark ? 'text-amber-100/75' : 'text-amber-950/70'}`}>
                  在「工具测试」中使用<strong className="font-semibold">快速试用</strong>可自动完成握手并拉取工具列表；需要手动 JSON-RPC、Trace 或流式时，展开主栏底部的
                  <strong className="font-semibold">协议与网关调试</strong>。
                  <code className="mx-0.5 rounded px-1 py-0.5 font-mono text-xs opacity-90">Mcp-Session-Id</code>
                  由网关按密钥与 endpoint 维护。工具名以
                  <code className="mx-0.5 rounded px-1 py-0.5 font-mono text-xs opacity-90">tools/list</code>
                  返回为准。
                </p>
                <button
                  type="button"
                  onClick={() => navigate(buildPath('user', 'api-docs'))}
                  className={`mt-2 inline-flex min-h-9 items-center gap-1 rounded-lg px-2 py-1.5 font-semibold underline-offset-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/45 ${
                    isDark ? 'text-amber-200 hover:text-white' : 'text-amber-900 hover:text-amber-950'
                  }`}
                >
                  <FileText className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  查看接入与 API 文档
                </button>
              </div>
            </div>
          )}
        />
        <GrantApplicationModal
          open={grantModalOpen}
          onClose={() => setGrantModalOpen(false)}
          theme={theme}
          resourceType="mcp"
          resourceId={detail.resourceId}
          resourceName={detail.displayName}
          showMessage={showMessage}
        />
      </>
    );
  }

  const searchPlaceholder =
    listCountLabel > 0
      ? `搜索 MCP 服务（本页已加载 ${rows.length} 条）…`
      : '搜索 MCP 名称或编码…';

  return (
    <div className={`w-full ${canvasBodyBg(theme)}`}>
      <div className={`${mainScrollPadBottom} space-y-5`}>
        <header className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
          <div className="flex min-w-0 items-start gap-3 sm:gap-3.5">
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-md shadow-violet-500/20 sm:h-12 sm:w-12 ${
                isDark
                  ? 'bg-gradient-to-br from-violet-500 to-indigo-500'
                  : 'bg-gradient-to-br from-violet-600 to-indigo-600'
              }`}
              aria-hidden
            >
              <Puzzle className="h-6 w-6 sm:h-6 sm:w-6" strokeWidth={2.25} />
            </div>
            <div className="min-w-0">
              <p className={`text-xs font-semibold uppercase tracking-wider ${textMuted(theme)}`}>MCP plaza</p>
              <h1 className={`mt-0.5 font-bold tracking-tight ${MARKET_HERO_TITLE_CLASSES[fontSize]}`}>
                <span className="bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 bg-clip-text text-transparent dark:from-violet-400 dark:via-indigo-400 dark:to-cyan-400">
                  {chromePageTitle || 'MCP 广场'}
                </span>
              </h1>
              <p className={`mt-1 max-w-2xl text-xs leading-snug sm:text-sm ${textSecondary(theme)}`}>
                浏览已发布 MCP 服务；统一网关 resolve、invoke 与 invoke-stream（须有效 Key 与授权 scope）。
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2 lg:justify-end">
            <button
              type="button"
              onClick={() => navigate(buildPath('user', 'api-docs'))}
              className={`inline-flex min-h-9 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors motion-reduce:transition-none focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50 ${
                isDark ? 'border-white/[0.12] bg-white/[0.04] text-slate-200 hover:bg-white/[0.08]' : 'border-slate-200/80 bg-white text-slate-800 shadow-sm hover:bg-slate-50'
              }`}
            >
              <FileText className="h-3.5 w-3.5 shrink-0 text-violet-500 dark:text-violet-400" aria-hidden />
              接入与部署
            </button>
            <button
              type="button"
              onClick={() => navigate(buildPath('user', 'mcp-register'))}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white shadow-md transition hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/45 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 sm:text-sm"
            >
              发布 MCP
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div
            className={`rounded-2xl border p-4 ${
              isDark ? 'border-violet-500/20 bg-gradient-to-br from-violet-600/15 to-slate-900/30' : 'border-violet-200/70 bg-gradient-to-br from-violet-50 to-white'
            }`}
          >
            <div className="mb-2 inline-flex rounded-full bg-violet-500/15 px-2.5 py-0.5 text-xs font-bold text-violet-700 dark:text-violet-200">
              <Zap className="mr-1 h-3.5 w-3.5" aria-hidden />
              接入
            </div>
            <p className={`text-sm font-semibold ${textPrimary(theme)}`}>统一网关 resolve</p>
            <p className={`mt-1 text-xs leading-relaxed ${textSecondary(theme)}`}>
              解析接入端点、传输方式与元数据，与目录消费策略及资源授权规则一致。
            </p>
          </div>
          <div
            className={`rounded-2xl border p-4 ${
              isDark ? 'border-cyan-500/20 bg-gradient-to-br from-cyan-600/12 to-slate-900/30' : 'border-cyan-200/70 bg-gradient-to-br from-cyan-50/90 to-white'
            }`}
          >
            <div className="mb-2 inline-flex rounded-full bg-cyan-500/15 px-2.5 py-0.5 text-xs font-bold text-cyan-800 dark:text-cyan-200">
              调试
            </div>
            <p className={`text-sm font-semibold ${textPrimary(theme)}`}>JSON-RPC 模板</p>
            <p className={`mt-1 text-xs leading-relaxed ${textSecondary(theme)}`}>
              initialize、tools/list、tools/call 快捷组装，支持流式与普通 invoke。
            </p>
          </div>
          <div
            className={`rounded-2xl border p-4 ${
              isDark ? 'border-fuchsia-500/20 bg-gradient-to-br from-fuchsia-600/12 to-slate-900/30' : 'border-fuchsia-200/70 bg-gradient-to-br from-fuchsia-50/90 to-white'
            }`}
          >
            <div className="mb-2 inline-flex rounded-full bg-fuchsia-500/15 px-2.5 py-0.5 text-xs font-bold text-fuchsia-800 dark:text-fuchsia-200">
              治理
            </div>
            <p className={`text-sm font-semibold ${textPrimary(theme)}`}>收藏与评价</p>
            <p className={`mt-1 text-xs leading-relaxed ${textSecondary(theme)}`}>
              目录评分、评论与授权申请与资源目录打通。
            </p>
          </div>
        </div>

        <div
          className={`flex gap-2.5 rounded-2xl border px-3.5 py-2.5 text-sm leading-snug ${
            isDark ? 'border-amber-500/25 bg-amber-500/[0.07] text-amber-100/90' : 'border-amber-200/80 bg-amber-50/80 text-amber-950'
          }`}
        >
          <Zap className="mt-0.5 h-4 w-4 shrink-0 text-amber-500 dark:text-amber-400" aria-hidden />
          <p>
            <strong className="font-semibold">{chromePageTitle || 'MCP 广场'}</strong>
            ：侧栏标签数量基于最近一次「全部」列表快照（单页最多 100 条）；筛选标签后列表为接口筛选结果。
          </p>
        </div>

        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <CategoryNav className="hidden w-full shrink-0 lg:block lg:w-52 xl:w-56" />
          <div className="min-w-0 flex-1 space-y-4">
            <div className="lg:hidden">
              <p className={`mb-2 text-xs font-semibold ${textMuted(theme)}`}>分类</p>
              <div
                className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                role="tablist"
                aria-label="MCP 标签"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={tagFilter === null}
                  onClick={() => setTagFilter(null)}
                  className={`shrink-0 rounded-full px-3.5 py-2 text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/45 ${
                    tagFilter === null
                      ? isDark
                        ? 'bg-violet-500/25 text-white'
                        : 'bg-violet-600 text-white'
                      : isDark
                        ? 'bg-white/[0.06] text-slate-300'
                        : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  全部
                  <span className="ml-1 tabular-nums opacity-80">({listCountLabel})</span>
                </button>
                {catalogTags.map((t) => {
                  const n = tagCounts.get(t.name) ?? 0;
                  const active = tagFilter === t.name;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setTagFilter((p) => (p === t.name ? null : t.name))}
                      className={`max-w-[10rem] shrink-0 truncate rounded-full px-3.5 py-2 text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/45 ${
                        active
                          ? isDark
                            ? 'bg-violet-500/25 text-white'
                            : 'bg-violet-600 text-white'
                          : isDark
                            ? 'bg-white/[0.06] text-slate-300'
                            : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {t.name}
                      <span className="ml-1 tabular-nums opacity-80">({n})</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
              <span className={`shrink-0 text-sm font-semibold ${textPrimary(theme)}`}>
                MCP 服务
                {tagFilter != null && (
                  <span className={`ml-2 text-xs font-normal ${textMuted(theme)}`}>· {tagFilter}</span>
                )}
              </span>
              <div className="relative min-w-0 flex-1">
                <Search
                  className={`pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 ${iconMuted(theme)}`}
                  aria-hidden
                />
                <input
                  type="search"
                  name="mcp-market-search"
                  autoComplete="off"
                  spellCheck={false}
                  placeholder={searchPlaceholder}
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  aria-label="搜索 MCP 服务"
                  className={`min-h-12 w-full rounded-2xl border py-3 pl-12 pr-4 text-sm outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-violet-500/40 ${
                    isDark
                      ? 'border-white/[0.1] bg-white/[0.05] text-white placeholder:text-slate-500'
                      : 'border-slate-200/90 bg-white text-slate-900 shadow-sm placeholder:text-slate-400'
                  }`}
                />
              </div>
            </div>

            {loading ? (
              <PageSkeleton type="cards" />
            ) : loadError ? (
              <PageError error={loadError} onRetry={() => void load()} retryLabel="重试加载 MCP 市场" />
            ) : filtered.length === 0 ? (
              <div className={`py-16 text-center text-sm ${textMuted(theme)}`}>暂无可用 MCP 资源</div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {filtered.map((item) => {
                  const mcpCallableRow = isCatalogMcpCallable(item);
                  const mcpBlockReasonRow = mcpInvokeBlockedReason(item);
                  const healthProbeKeyRow = catalogItemHealthStatus(item) ?? 'unknown';
                  const runBadgeKeyRow = catalogRunBadgeHealthKeyForDisplay(item);
                  const circuitRow = catalogItemCircuitState(item);
                  return (
                  <BentoCard
                    key={item.resourceId}
                    theme={theme}
                    hover
                    glow="indigo"
                    padding="md"
                    className={`flex h-full flex-col ${!mcpCallableRow ? (isDark ? 'opacity-[0.92]' : 'opacity-95') : ''}`}
                    onClick={() => navigate(buildPath('user', 'mcp-center', item.resourceId))}
                  >
                    <MarketplaceListingCard
                      theme={theme}
                      title={item.displayName}
                      statusChip={{
                        label: statusLabel(item.status),
                        tone: item.status === 'published' ? 'published' : 'neutral',
                      }}
                      trailing={(
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-900 text-white ${isDark ? 'opacity-95' : ''}`}
                        >
                          <Puzzle size={17} aria-hidden />
                        </div>
                      )}
                      metaRow={(
                        <>
                          <span
                            className={`inline-flex max-w-[12rem] shrink-0 items-center truncate rounded-md border px-2 py-0.5 text-xs font-semibold ${resourceHealthBadgeClass(theme, runBadgeKeyRow)}`}
                            title={
                              `探测：${resourceHealthLabelZh(healthProbeKeyRow)}` +
                              (circuitRow && circuitRow !== 'unknown' && circuitRow !== 'closed'
                                ? ` · ${circuitBreakerLabelZh(circuitRow)}`
                                : '') +
                              (mcpCallableRow ? '' : ` · ${mcpBlockReasonRow}`)
                            }
                          >
                            运行 {resourceHealthLabelZh(runBadgeKeyRow)}
                          </span>
                          {(item.tags ?? []).slice(0, 5).map((tg) => (
                            <span
                              key={tg}
                              className={`rounded-md px-2 py-0.5 text-xs font-medium ${
                                isDark ? 'bg-white/10 text-slate-300' : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {tg}
                            </span>
                          ))}
                          <AccessPolicyBadge className="contents" theme={theme} value={item.accessPolicy} whenMissing="hide" />
                        </>
                      )}
                      description={item.description || '暂无描述'}
                      descriptionClamp={3}
                      footerLeft={(
                        <div className="min-w-0 space-y-0.5">
                          <div
                            className={`truncate text-xs ${textSecondary(theme)}`}
                            title={catalogAuthorDisplay(item)}
                          >
                            作者：{catalogAuthorDisplay(item)}
                          </div>
                          <span
                            className="block truncate font-mono text-xs"
                            title={item.resourceCode || item.resourceId}
                          >
                            @{item.resourceCode || item.resourceId}
                          </span>
                        </div>
                      )}
                      footerStats={(
                        <>
                          <MarketplaceStatItem icon={BarChart2} title={catalogPrimaryMetricLabel('mcp')}>
                            {formatMarketMetric(catalogPrimaryMetricValue('mcp', item))}
                          </MarketplaceStatItem>
                          <MarketplaceStatItem icon={Eye} title="浏览量">
                            {formatMarketMetric(catalogViewCountValue(item))}
                          </MarketplaceStatItem>
                          <MarketplaceStatItem icon={Star} title="目录评分">
                            {item.ratingAvg != null ? item.ratingAvg.toFixed(1) : '—'}
                          </MarketplaceStatItem>
                          <MarketplaceStatItem icon={MessageSquare} title="评论数">
                            {Number(item.reviewCount ?? 0)}
                          </MarketplaceStatItem>
                        </>
                      )}
                      primaryAction={(
                        <button
                          type="button"
                          className={`${btnPrimary} !px-3 !py-1.5 !text-xs disabled:cursor-not-allowed disabled:opacity-45`}
                          disabled={!mcpCallableRow}
                          title={!mcpCallableRow ? mcpBlockReasonRow : '查看服务说明或发起工具测试'}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!mcpCallableRow) return;
                            navigate(buildPath('user', 'mcp-center', item.resourceId));
                          }}
                        >
                          {mcpCallableRow ? '查看与使用' : '暂不可调用'}
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
    </div>
  );
};
