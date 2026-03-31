import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Search, Star, Heart, TrendingUp, Package,
  ChevronRight, MessageSquare, Rocket, Loader2, Play,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Theme, FontSize, ThemeColor } from '../../types';
import { THEME_COLOR_CLASSES } from '../../constants/theme';
import { LantuSelect } from '../../components/common/LantuSelect';
import {
  canvasBodyBg, mainScrollCompositorClass, bentoCard, bentoCardHover, btnPrimary, btnSecondary,
  textPrimary, textSecondary, textMuted, techBadge, glowIndigo,
} from '../../utils/uiClasses';
import { BentoCard } from '../../components/common/BentoCard';
import { GlassPanel } from '../../components/common/GlassPanel';
import { Modal } from '../../components/common/Modal';
import { AgentReviews } from './AgentReviews';
import { GrantApplicationModal } from '../../components/business/GrantApplicationModal';
import { MarketLayout } from '../../components/layout/PageLayouts';
import { useNavigate } from 'react-router-dom';
import { buildPath } from '../../constants/consoleRoutes';
import { useLayoutChrome } from '../../context/LayoutChromeContext';
import { agentService } from '../../api/services/agent.service';
import { tagService } from '../../api/services/tag.service';
import { filterTagsForResourceType } from '../../utils/marketTags';
import type { TagItem } from '../../types/dto/tag';
import { userActivityService } from '../../api/services/user-activity.service';
import { resourceCatalogService } from '../../api/services/resource-catalog.service';
import { invokeService } from '../../api/services/invoke.service';
import { nativeInputClass } from '../../utils/formFieldClasses';
import { mapInvokeFlowError } from '../../utils/invokeError';
import { parseWorkspaceAgentIdsFromStorage } from '../../lib/safeStorage';
import { safeOpenHttpUrl } from '../../lib/windowNavigate';
import type { Agent } from '../../types/dto/agent';
import { PageError } from '../../components/common/PageError';
import { PageSkeleton } from '../../components/common/PageSkeleton';
import { PageTitleTagline } from '../../components/common/PageTitleTagline';

export interface AgentMarketProps {
  theme: Theme; fontSize: FontSize; themeColor: ThemeColor;
  showMessage: (content: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
}

const MARKET_SORT_OPTIONS = [
  { value: 'hot', label: '热度' },
  { value: 'rating', label: '评分' },
  { value: 'new', label: '最新' },
];

interface MarketCard {
  id: string; name: string; emoji: string; description: string; author: string;
  tags: string[]; installs: string; rating: string; featured: boolean;
}

function agentToCard(agent: Agent): MarketCard {
  const tags =
    agent.tags?.length
      ? [...agent.tags]
      : agent.categoryName
        ? [agent.categoryName, agent.agentType]
        : [agent.agentType];
  return {
    id: String(agent.id), name: agent.displayName, emoji: agent.icon || '🤖', description: agent.description,
    author: agent.sourceType === 'internal' ? '校内团队' : agent.sourceType === 'partner' ? '合作伙伴' : '云服务',
    tags,
    installs: agent.callCount > 1000 ? `${(agent.callCount / 1000).toFixed(1)}K` : String(agent.callCount),
    rating: agent.qualityScore > 0 ? (agent.qualityScore / 20).toFixed(1) : '4.5',
    featured: agent.qualityScore >= 80,
  };
}

export const AgentMarket: React.FC<AgentMarketProps> = ({ theme, fontSize, themeColor, showMessage }) => {
  const { chromePageTitle } = useLayoutChrome();
  const isDark = theme === 'dark';
  const tc = THEME_COLOR_CLASSES[themeColor];
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [catalogTags, setCatalogTags] = useState<TagItem[]>([]);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<'hot' | 'rating' | 'new'>('hot');
  const [allCards, setAllCards] = useState<MarketCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<Error | null>(null);

  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const PAGE_SIZE = 20;
  const [searchParams, setSearchParams] = useSearchParams();
  const processedResourceId = useRef<string | null>(null);
  const [detailAgent, setDetailAgent] = useState<MarketCard | null>(null);

  useEffect(() => {
    tagService.list()
      .then((list) => setCatalogTags(filterTagsForResourceType(list, 'agent')))
      .catch(() => setCatalogTags([]));
  }, []);

  const hotTags = useMemo(() => catalogTags.slice(0, 10), [catalogTags]);
  const tagPillCls = (active: boolean) => `text-xs px-3 py-1 rounded-full border transition-colors ${
    active
      ? 'bg-neutral-900 text-white border-neutral-900'
      : isDark ? 'border-white/10 hover:bg-white/5 text-slate-300' : 'border-slate-200 hover:bg-slate-50 text-slate-600'
  }`;

  const fetchAgents = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const sortByMap: Record<string, string> = { hot: 'callCount', rating: 'rating', new: 'publishedAt' };
      const result = await agentService.list({
        status: 'published',
        pageSize: PAGE_SIZE,
        page,
        keyword: query.trim() || undefined,
        sortBy: sortByMap[sort] as any,
        sortOrder: sort === 'new' ? 'desc' : 'desc',
        tags: tagFilter ? [tagFilter] : undefined,
      } as any);
      setAllCards(result.list.map(agentToCard));
      setTotal(result.total ?? result.list.length);
    } catch (err) {
      // Failed to load agents
      setLoadError(err instanceof Error ? err : new Error('加载智能体列表失败'));
      showMessage(err instanceof Error ? err.message : '加载智能体列表失败', 'error');
    }
    finally { setLoading(false); }
  }, [page, query, showMessage, sort, tagFilter]);
  useEffect(() => { fetchAgents(); }, [fetchAgents]);
  useEffect(() => { setPage(1); }, [query, sort, tagFilter]);

  useEffect(() => {
    const rid = searchParams.get('resourceId');
    if (!rid) {
      processedResourceId.current = null;
      return;
    }
    if (loading || allCards.length === 0) return;
    if (processedResourceId.current === rid) return;
    processedResourceId.current = rid;
    const next = new URLSearchParams(searchParams);
    next.delete('resourceId');
    setSearchParams(next, { replace: true });
    const hit = allCards.find((a) => a.id === String(rid));
    if (hit) {
      setDetailAgent(hit);
    } else {
      showMessage('未在已上架列表中找到该智能体，请确认资源已发布且 ID 正确', 'warning');
    }
  }, [loading, allCards, searchParams, setSearchParams, showMessage]);

  const filterFn = useCallback((a: MarketCard) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return a.name.toLowerCase().includes(q) || a.description.toLowerCase().includes(q) || a.author.toLowerCase().includes(q) || a.tags.some((t) => t.toLowerCase().includes(q));
  }, [query]);

  const featured = useMemo(() => allCards.filter(a => a.featured).filter(filterFn), [allCards, filterFn]);
  const list = useMemo(() => {
    let rows = allCards.filter(filterFn);
    if (sort === 'rating') rows = [...rows].sort((a, b) => parseFloat(b.rating) - parseFloat(a.rating));
    else if (sort === 'new') rows = [...rows].reverse();
    return rows;
  }, [allCards, filterFn, sort]);

  const navigate = useNavigate();
  const WS_KEY = 'lantu_workspace_agents';
  const [workspaceAgents, setWorkspaceAgents] = useState<string[]>(() => parseWorkspaceAgentIdsFromStorage(localStorage.getItem(WS_KEY)));
  useEffect(() => {
    try {
      localStorage.setItem(WS_KEY, JSON.stringify(workspaceAgents));
    } catch {
      /* ignore quota */
    }
  }, [workspaceAgents]);
  const isInWorkspace = (id: string) => workspaceAgents.includes(id);

  const [confirmAgent, setConfirmAgent] = useState<MarketCard | null>(null);
  const [addingAgent, setAddingAgent] = useState(false);
  const addToWorkspace = async (agent: MarketCard) => {
    if (isInWorkspace(agent.id)) return;
    setAddingAgent(true);
    try {
      await userActivityService.addFavorite('agent', Number(agent.id));
      setWorkspaceAgents((prev) => [...prev, agent.id]);
      showMessage(`已将「${agent.name}」添加到工作区`, 'success');
    } catch (e) {
      showMessage(e instanceof Error ? e.message : '添加失败', 'error');
    } finally {
      setAddingAgent(false);
    }
  };
  const [grantModalAgent, setGrantModalAgent] = useState<MarketCard | null>(null);
  const [invoking, setInvoking] = useState(false);
  const [invokePayload, setInvokePayload] = useState('{\n  "input": "hello"\n}');
  const [invokeResult, setInvokeResult] = useState<string | null>(null);
  const applyAuthorization = (_agent: MarketCard) => {
    setGrantModalAgent(_agent);
  };
  const runInvoke = async (agent: MarketCard) => {
    setInvoking(true);
    setInvokeResult(null);
    let payload: Record<string, unknown> | undefined;
    const trimmed = invokePayload.trim();
    if (trimmed) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed === null || Array.isArray(parsed) || typeof parsed !== 'object') {
          setInvokeResult('调用参数必须是 JSON 对象');
          setInvoking(false);
          return;
        }
        payload = parsed as Record<string, unknown>;
      } catch {
        setInvokeResult('调用参数 JSON 解析失败');
        setInvoking(false);
        return;
      }
    }
    try {
      let resolved;
      try {
        resolved = await resourceCatalogService.resolve({ resourceType: 'agent', resourceId: agent.id });
      } catch (e) {
        setInvokeResult(`${mapInvokeFlowError(e, 'resolve')}\n可保留当前参数后重试解析`);
        return;
      }
      if (resolved.invokeType === 'redirect' && resolved.endpoint) {
        if (!safeOpenHttpUrl(resolved.endpoint)) {
          setInvokeResult('无法打开该地址（仅支持 http/https）');
          return;
        }
        setInvokeResult(`该 Agent 为跳转类型，已打开地址：${resolved.endpoint}`);
        return;
      }
      if (resolved.invokeType === 'metadata') {
        setInvokeResult(`该 Agent 返回元数据：${JSON.stringify(resolved.spec ?? {}, null, 2)}`);
        return;
      }
      try {
        const res = await invokeService.invoke({
          resourceType: 'agent',
          resourceId: agent.id,
          payload,
        });
        setInvokeResult(`状态: ${res.status} (${res.statusCode})\n耗时: ${res.latencyMs}ms\nTraceId: ${res.traceId}\n\n${res.body}`);
      } catch (e) {
        setInvokeResult(`${mapInvokeFlowError(e, 'invoke')}\n可保留当前参数后重试调用`);
      }
    } finally {
      setInvoking(false);
    }
  };

  return (
    <div className={`flex-1 overflow-y-auto custom-scrollbar ${mainScrollCompositorClass} ${canvasBodyBg(theme)}`}>
      <MarketLayout className="space-y-4">
        {/* Top bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 shrink-0">
          <div className="flex min-w-0 items-center gap-3">
            <div className={`shrink-0 rounded-xl p-2 ${isDark ? 'bg-neutral-900/10' : 'bg-neutral-100'}`}><Package size={22} className={tc.text} /></div>
            <PageTitleTagline
              subtitleOnly
              theme={theme}
              title={chromePageTitle || '智能体市场'}
              tagline="发现、试用与安装校园场景智能体"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button type="button" className={btnSecondary(theme)} onClick={() => navigate(buildPath('user', 'my-favorites'))}><Heart size={14} /> 我的收藏</button>
            <button type="button" className={btnPrimary} onClick={() => navigate(buildPath('user', 'my-agents-pub'))}>我的发布</button>
          </div>
        </div>

        {/* Main card */}
        <div className={`${bentoCard(theme)} overflow-hidden flex flex-col min-h-0`}>
          {/* Hero + Search */}
          <div className={`px-4 sm:px-5 lg:px-6 py-6 sm:py-8 border-b ${isDark ? 'border-white/[0.08]' : 'border-slate-200/40'}`}>
            <div className="max-w-3xl">
              <h2 className={`text-2xl sm:text-3xl font-bold tracking-tight mb-4 ${textPrimary(theme)}`}>为校园场景找到合适的智能体</h2>
              <p className={`text-sm mb-6 leading-relaxed ${textSecondary(theme)}`}>支持按平台标签筛选、关键词搜索与排序。安装后可在「智能体列表」中统一管理与调试。</p>
              <GlassPanel theme={theme} padding="sm" className="!p-0">
                <div className="relative">
                  <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input type="text" className={`w-full bg-transparent pl-12 pr-4 py-3 text-sm outline-none ${textPrimary(theme)} placeholder:${textMuted(theme)}`} placeholder="搜索智能体名称、能力、提供方或标签…" value={query} onChange={(e) => setQuery(e.target.value)} />
                </div>
              </GlassPanel>
              {hotTags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4 items-center">
                  <span className={`text-xs font-medium ${textMuted(theme)} shrink-0`}>热门：</span>
                  {hotTags.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTagFilter((p) => (p === t.name ? null : t.name))}
                      className={tagPillCls(tagFilter === t.name)}
                    >
                      {t.name}
                      {t.usageCount > 0 ? <span className="ml-1 opacity-70 tabular-nums">·{t.usageCount}</span> : null}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Tag filters from GET /tags (category Agent) */}
          <div className={`px-4 sm:px-6 py-3 border-b flex flex-wrap gap-2 items-center ${isDark ? 'border-white/[0.08]' : 'border-slate-200/40'}`}>
            <span className={`text-xs font-medium shrink-0 ${textMuted(theme)}`}>标签：</span>
            <button
              type="button"
              onClick={() => setTagFilter(null)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                tagFilter === null
                  ? 'bg-neutral-900 text-white shadow-sm shadow-neutral-900/15'
                  : isDark ? 'text-slate-400 hover:bg-white/5' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              全部
            </button>
            {catalogTags.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTagFilter((p) => (p === t.name ? null : t.name))}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  tagFilter === t.name
                    ? 'bg-neutral-900 text-white shadow-sm shadow-neutral-900/15'
                    : isDark ? 'text-slate-400 hover:bg-white/5' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {t.name}
              </button>
            ))}
          </div>

          <div className="p-4 sm:p-6 lg:p-8 space-y-10">
            {loading ? (
              <PageSkeleton type="cards" />
            ) : loadError ? (
              <PageError error={loadError} onRetry={() => void fetchAgents()} retryLabel="重试加载市场" />
            ) : (
              <>
                {/* Featured */}
                <section>
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                    <div className="flex items-center gap-2"><TrendingUp size={18} className={tc.text} /><h3 className={`font-bold text-base ${textPrimary(theme)}`}>精选推荐</h3></div>
                    <span className={`text-xs ${textMuted(theme)}`}>编辑推荐与校园高频场景</span>
                  </div>
                  {featured.length === 0 ? (
                    <p className={`text-sm py-8 text-center ${textMuted(theme)}`}>当前筛选下暂无精选，试试其它标签或清空搜索</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-5">
                      {featured.map((a) => (
                        <BentoCard key={a.id} theme={theme} hover glow="indigo" padding="md" className="flex flex-col sm:flex-row gap-4 !rounded-[20px]">
                          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shrink-0 ${isDark ? 'bg-white/[0.04]' : 'bg-slate-50'}`}>{a.emoji}</div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <h4 className={`font-bold ${textPrimary(theme)}`}>{a.name}</h4>
                              {a.tags.slice(0, 2).map((t) => <span key={t} className={techBadge(theme)}>{t}</span>)}
                            </div>
                            <p className={`text-sm leading-relaxed line-clamp-3 mb-3 ${textSecondary(theme)}`}>{a.description}</p>
                            <div className="flex flex-col gap-3">
                              <div className={`text-xs ${textMuted(theme)}`}>
                                <span>{a.author}</span><span className="mx-2 opacity-40">|</span>
                                <span className="inline-flex items-center gap-0.5"><Star size={12} className="text-amber-500 fill-amber-500" />{a.rating}</span>
                                <span className="mx-2 opacity-40">|</span><span>{a.installs} 次安装</span>
                              </div>
                              <div className="flex gap-2">
                                <button type="button" className={btnSecondary(theme)} onClick={() => setDetailAgent(a)}>详情与评论<ChevronRight size={14} /></button>
                                <button type="button" className={`${btnPrimary} ${isInWorkspace(a.id) ? 'opacity-50 cursor-not-allowed' : ''}`} disabled={isInWorkspace(a.id)} onClick={() => !isInWorkspace(a.id) && setConfirmAgent(a)}>
                                  <Rocket size={14} />{isInWorkspace(a.id) ? '已添加' : '一键部署'}
                                </button>
                              </div>
                            </div>
                          </div>
                        </BentoCard>
                      ))}
                    </div>
                  )}
                </section>

                {/* All list */}
                <section>
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                    <h3 className={`font-bold text-base ${textPrimary(theme)}`}>全部智能体</h3>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs ${textMuted(theme)}`}>排序</span>
                      <LantuSelect
                        theme={theme}
                        className="w-full min-w-[7.5rem] sm:w-[8.5rem]"
                        value={sort}
                        onChange={(v) => setSort(v as typeof sort)}
                        options={MARKET_SORT_OPTIONS}
                        placeholder="排序"
                      />
                    </div>
                  </div>
                  {list.length === 0 ? (
                    <p className={`text-sm py-8 text-center ${textMuted(theme)}`}>没有匹配的智能体，请调整标签或搜索词</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                      {list.map((a) => (
                        <BentoCard key={a.id} theme={theme} hover glow="indigo" padding="md" onClick={() => setDetailAgent(a)} className="flex flex-col h-full !rounded-[20px]">
                          <div className="flex items-start gap-3 mb-3">
                            <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-lg shrink-0 ${isDark ? 'bg-white/[0.04]' : 'bg-slate-50'}`}>{a.emoji}</div>
                            <div className="min-w-0 flex-1">
                              <h4 className={`font-bold text-sm truncate ${textPrimary(theme)}`}>{a.name}</h4>
                              <p className={`text-[11px] truncate ${textMuted(theme)}`}>{a.author}</p>
                            </div>
                          </div>
                          <p className={`text-xs leading-relaxed line-clamp-3 flex-1 mb-3 ${textSecondary(theme)}`}>{a.description}</p>
                          <div className="flex flex-wrap gap-1 mb-3">
                            {a.tags.map((t) => <span key={t} className={techBadge(theme)}>{t}</span>)}
                          </div>
                          <div className={`flex items-center justify-between gap-2 mt-auto pt-2 border-t border-dashed ${isDark ? 'border-white/[0.08]' : 'border-slate-200/40'}`}>
                            <span className={`text-[11px] tabular-nums ${textMuted(theme)}`}>
                              <span className="inline-flex items-center gap-0.5 mr-2"><Star size={11} className="text-amber-500 fill-amber-500" />{a.rating}</span>
                              {a.installs} 安装
                            </span>
                            <button type="button" className={`${btnPrimary} !py-1.5 !px-3 !text-xs ${isInWorkspace(a.id) ? 'opacity-50 cursor-not-allowed' : ''}`} disabled={isInWorkspace(a.id)} onClick={(e) => { e.stopPropagation(); if (!isInWorkspace(a.id)) setConfirmAgent(a); }}>
                              {isInWorkspace(a.id) ? '已添加' : '添加'}
                            </button>
                          </div>
                        </BentoCard>
                      ))}
                    </div>
                  )}
                </section>
              </>
            )}
          </div>
        </div>

        {/* Detail modal */}
        <Modal open={!!detailAgent} onClose={() => setDetailAgent(null)} theme={theme} size="lg">
          {detailAgent && (
            <>
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0 ${isDark ? 'bg-white/[0.04]' : 'bg-slate-50'}`}>{detailAgent.emoji}</div>
                <div className="min-w-0 flex-1">
                  <h3 className={`text-lg font-bold truncate ${textPrimary(theme)}`}>{detailAgent.name}</h3>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`text-xs ${textMuted(theme)}`}>{detailAgent.author}</span>
                    <span className="inline-flex items-center gap-0.5 text-xs"><Star size={12} className="text-amber-500 fill-amber-500" />{detailAgent.rating}</span>
                    <span className={`text-xs ${textMuted(theme)}`}>{detailAgent.installs} 次安装</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" className={btnSecondary(theme)} onClick={() => applyAuthorization(detailAgent)}>
                    申请授权
                  </button>
                  <button type="button" className={`${btnSecondary(theme)} disabled:opacity-50`} disabled={invoking} onClick={() => void runInvoke(detailAgent)}>
                    {invoking ? <><Loader2 size={14} className="animate-spin" /> 调用中…</> : <><Play size={14} /> 调用</>}
                  </button>
                  <button type="button" className={`${btnPrimary} shrink-0 ${isInWorkspace(detailAgent.id) ? 'opacity-50 cursor-not-allowed' : ''}`} disabled={isInWorkspace(detailAgent.id)} onClick={(e) => { e.stopPropagation(); if (!isInWorkspace(detailAgent.id)) setConfirmAgent(detailAgent); }}>
                    <Rocket size={14} />{isInWorkspace(detailAgent.id) ? '已添加' : '一键部署'}
                  </button>
                </div>
              </div>
              <div className="space-y-5">
                <div>
                  <p className={`text-sm leading-relaxed ${textSecondary(theme)}`}>{detailAgent.description}</p>
                  <div className="flex flex-wrap gap-1.5 mt-3">{detailAgent.tags.map((t) => <span key={t} className={techBadge(theme)}>{t}</span>)}</div>
                </div>
                <div className={`${bentoCard(theme)} p-4`}>
                  <h4 className={`font-bold text-sm mb-2 ${textPrimary(theme)}`}>调用参数</h4>
                  <textarea
                    rows={5}
                    value={invokePayload}
                    onChange={(e) => setInvokePayload(e.target.value)}
                    className={`${nativeInputClass(theme)} resize-none font-mono text-xs`}
                  />
                  {invokeResult && (
                    <pre className={`mt-3 max-h-72 overflow-auto rounded-xl border p-3 text-xs ${
                      isDark ? 'border-white/10 bg-white/[0.03] text-slate-200' : 'border-slate-200 bg-slate-50 text-slate-700'
                    }`}>{invokeResult}</pre>
                  )}
                </div>
                <div>
                  <h4 className={`font-bold text-base mb-4 flex items-center gap-2 ${textPrimary(theme)}`}><MessageSquare size={18} className="text-blue-500" /> 评分与评论</h4>
                  <AgentReviews agentId={Number(detailAgent.id)} theme={theme} fontSize={fontSize} showMessage={showMessage} />
                </div>
              </div>
            </>
          )}
        </Modal>

        {/* Confirm add modal */}
        <Modal open={!!confirmAgent} onClose={() => setConfirmAgent(null)} title="确认添加" theme={theme} size="sm" footer={
          <><button type="button" className={btnSecondary(theme)} onClick={() => setConfirmAgent(null)}>取消</button>
          <button type="button" className={`${btnPrimary} disabled:opacity-50`} disabled={addingAgent} onClick={async () => { if (confirmAgent) { await addToWorkspace(confirmAgent); setConfirmAgent(null); } }}>{addingAgent ? <><Loader2 size={14} className="animate-spin" /> 添加中…</> : '确认添加'}</button></>
        }>
          {confirmAgent && <p className={`text-sm ${textSecondary(theme)}`}>确认将「{confirmAgent.name}」添加到工作区？</p>}
        </Modal>
        <GrantApplicationModal
          open={!!grantModalAgent}
          onClose={() => setGrantModalAgent(null)}
          theme={theme}
          resourceType="agent"
          resourceId={grantModalAgent?.id ?? ''}
          resourceName={grantModalAgent?.name}
          showMessage={showMessage}
        />
      </MarketLayout>
    </div>
  );
};
