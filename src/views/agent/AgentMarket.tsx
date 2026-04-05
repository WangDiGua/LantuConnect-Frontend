import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, Heart, TrendingUp, Rocket, ChevronRight, Package, MessageSquare } from 'lucide-react';
import type { Theme, FontSize, ThemeColor } from '../../types';
import { THEME_COLOR_CLASSES } from '../../constants/theme';
import { useMarketList, useMarketTags, useMarketDetail } from '../../hooks/market';
import type { MarketListParams } from '../../hooks/market/types';
import {
  MarketLayout,
  MarketHeader,
  MarketSearchBar,
  MarketTagFilter,
  MarketEmptyState,
  MarketplaceListingCard,
  MarketplaceStatItem,
} from '../../components/market';
import { BentoCard } from '../../components/common/BentoCard';
import { Modal } from '../../components/common/Modal';
import { AgentReviews } from './AgentReviews';
import { GrantApplicationModal } from '../../components/business/GrantApplicationModal';
import { buildPath } from '../../constants/consoleRoutes';
import { useLayoutChrome } from '../../context/LayoutChromeContext';
import { agentService } from '../../api/services/agent.service';
import type { Agent } from '../../types/dto/agent';
import { PageError } from '../../components/common/PageError';
import { PageSkeleton } from '../../components/common/PageSkeleton';
import { btnPrimary, btnSecondary, textPrimary, textSecondary, textMuted, techBadge } from '../../utils/uiClasses';

export interface AgentMarketProps {
  theme: Theme;
  fontSize: FontSize;
  themeColor: ThemeColor;
  showMessage: (content: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
}

interface MarketCard {
  id: string;
  name: string;
  emoji: string;
  description: string;
  author: string;
  tags: string[];
  installs: string;
  rating: string;
  reviewCount: number;
  featured: boolean;
}

function agentCardTrailing(emoji: string, isDark: boolean): React.ReactNode {
  const isUrl = /^https?:\/\//i.test(emoji);
  if (isUrl) {
    return (
      <img src={emoji} alt="" className="h-10 w-10 rounded-xl object-cover ring-1 ring-black/10" loading="lazy" />
    );
  }
  return (
    <div
      className={`flex h-10 w-10 items-center justify-center rounded-xl text-xl leading-none ${isDark ? 'bg-white/[0.06]' : 'bg-slate-100'}`}
    >
      {emoji}
    </div>
  );
}

function agentToCard(agent: Agent): MarketCard {
  const tags =
    agent.tags?.length
      ? [...agent.tags]
      : agent.categoryName
        ? [agent.categoryName, agent.agentType]
        : [agent.agentType];
  const authorFromCatalog =
    agent.createdByName?.trim()
    || (agent.createdBy != null ? `用户 #${agent.createdBy}` : '');
  const author =
    authorFromCatalog
    || (agent.sourceType === 'internal' ? '校内团队' : agent.sourceType === 'partner' ? '合作伙伴' : '云服务');
  const ratingStr =
    agent.ratingAvg != null && Number.isFinite(agent.ratingAvg)
      ? agent.ratingAvg.toFixed(1)
      : agent.qualityScore > 0
        ? (agent.qualityScore / 20).toFixed(1)
        : '—';
  return {
    id: String(agent.id),
    name: agent.displayName,
    emoji: agent.icon || '🤖',
    description: agent.description,
    author,
    tags,
    installs: agent.callCount > 1000 ? `${(agent.callCount / 1000).toFixed(1)}K` : String(agent.callCount),
    rating: ratingStr,
    reviewCount: Math.max(0, Math.floor(Number(agent.reviewCount ?? 0)) || 0),
    featured: agent.qualityScore >= 80 || (agent.ratingAvg != null && agent.ratingAvg >= 4.5),
  };
}

export const AgentMarket: React.FC<AgentMarketProps> = ({ theme, fontSize, themeColor, showMessage }) => {
  const { chromePageTitle } = useLayoutChrome();
  const isDark = theme === 'dark';
  const tc = THEME_COLOR_CLASSES[themeColor];
  const navigate = useNavigate();

  /** useMarketList 依赖 service 引用；内联对象会导致 loadItems/useEffect 每轮重跑、列表无法正常稳定渲染 */
  const agentMarketService = useMemo(
    () => ({
      list: async (params: MarketListParams) => {
        const result = await agentService.list({
          ...params,
          status: 'published',
        } as any);
        return {
          list: result.list,
          total: result.total,
        };
      },
    }),
    [],
  );

  const {
    items: agents,
    loading,
    error,
    keyword,
    setKeyword,
    refresh,
  } = useMarketList({
    resourceType: 'agent',
    service: agentMarketService,
    showMessage,
  });

  const { tags, activeTag, setActiveTag } = useMarketTags({
    resourceType: 'agent',
  });

  const cards = useMemo(() => agents.map(agentToCard), [agents]);

  const {
    detailItem: detailAgent,
    setDetailItem: setDetailAgent,
  } = useMarketDetail<MarketCard>({
    items: cards,
    loading,
    getId: (card) => card.id,
    showMessage,
  });

  const [confirmAgent, setConfirmAgent] = useState<MarketCard | null>(null);
  const [addingAgent, setAddingAgent] = useState(false);
  const [grantModalAgent, setGrantModalAgent] = useState<MarketCard | null>(null);

  const WS_KEY = 'lantu_workspace_agents';
  const [workspaceAgents, setWorkspaceAgents] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(WS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const isInWorkspace = (id: string) => workspaceAgents.includes(id);

  const addToWorkspace = async (agent: MarketCard) => {
    if (isInWorkspace(agent.id)) return;
    setAddingAgent(true);
    try {
      const { userActivityService } = await import('../../api/services/user-activity.service');
      await userActivityService.addFavorite('agent', Number(agent.id));
      setWorkspaceAgents((prev) => [...prev, agent.id]);
      try {
        localStorage.setItem(WS_KEY, JSON.stringify([...workspaceAgents, agent.id]));
      } catch {}
      showMessage(`已将「${agent.name}」添加到工作区`, 'success');
    } catch (e) {
      showMessage(e instanceof Error ? e.message : '添加失败', 'error');
    } finally {
      setAddingAgent(false);
    }
  };

  const filtered = useMemo(() => {
    let result = cards;
    if (activeTag) {
      result = result.filter((c) => c.tags.includes(activeTag));
    }
    return result;
  }, [cards, activeTag]);

  const featured = useMemo(() => filtered.filter((a) => a.featured), [filtered]);
  const list = useMemo(() => filtered, [filtered]);

  return (
    <div className={`w-full min-h-0 ${isDark ? 'bg-transparent' : 'bg-transparent'}`}>
      <MarketLayout theme={theme}>
        <MarketHeader
          theme={theme}
          icon={Package}
          title="智能体市场"
          tagline="浏览已发布智能体；试用为 resolve + invoke（须有效 X-Api-Key 与 scope；跨 owner 时尚需 Grant 或符合 accessPolicy）"
          chromePageTitle={chromePageTitle}
          actions={
            <>
              <button
                type="button"
                className={btnSecondary(theme)}
                onClick={() => navigate(buildPath('user', 'my-favorites'))}
              >
                <Heart size={14} /> 我的收藏
              </button>
              <button
                type="button"
                className={btnPrimary}
                onClick={() => navigate(buildPath('user', 'my-agents-pub'))}
              >
                我的发布
              </button>
            </>
          }
        />

        <div className="mb-4">
          <MarketSearchBar
            theme={theme}
            value={keyword}
            onChange={setKeyword}
            placeholder="搜索智能体名称、能力、提供方或标签…"
          />
        </div>

        <MarketTagFilter
          theme={theme}
          tags={tags}
          activeTag={activeTag}
          onTagChange={setActiveTag}
        />

        {loading ? (
          <PageSkeleton type="cards" />
        ) : error ? (
          <PageError error={error} onRetry={refresh} retryLabel="重试加载市场" />
        ) : filtered.length === 0 ? (
          <MarketEmptyState theme={theme} />
        ) : (
          <>
            {featured.length > 0 && (
              <section className="mb-10">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                  <div className="flex items-center gap-2">
                    <TrendingUp size={18} className={tc.text} />
                    <h3 className={`font-bold text-base ${textPrimary(theme)}`}>精选推荐</h3>
                  </div>
                  <span className={`text-xs ${textMuted(theme)}`}>编辑推荐与校园高频场景</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-5">
                  {featured.map((a) => (
                    <BentoCard
                      key={a.id}
                      theme={theme}
                      hover
                      glow="indigo"
                      padding="md"
                      selected={detailAgent != null && String(detailAgent.id) === String(a.id)}
                      className="flex flex-col sm:flex-row gap-4"
                    >
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shrink-0 ${isDark ? 'bg-white/[0.04]' : 'bg-slate-50'}`}>
                        {a.emoji}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <h4 className={`font-bold ${textPrimary(theme)}`}>{a.name}</h4>
                          {a.tags.slice(0, 2).map((t) => (
                            <span key={t} className={techBadge(theme)}>
                              {t}
                            </span>
                          ))}
                        </div>
                        <p className={`text-sm leading-relaxed line-clamp-3 mb-3 ${textSecondary(theme)}`}>
                          {a.description}
                        </p>
                        <div className="flex flex-col gap-3">
                          <div className={`text-xs ${textMuted(theme)}`}>
                            <span>{a.author}</span>
                            <span className="mx-2 opacity-40">|</span>
                            <span className="inline-flex items-center gap-0.5">
                              <Star size={12} className="text-amber-500 fill-amber-500" />
                              {a.rating}
                            </span>
                            <span className="mx-2 opacity-40">|</span>
                            <span>{a.reviewCount} 条评价</span>
                            <span className="mx-2 opacity-40">|</span>
                            <span>{a.installs} 次安装</span>
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              className={btnSecondary(theme)}
                              onClick={() => setDetailAgent(a)}
                            >
                              详情与评论
                              <ChevronRight size={14} />
                            </button>
                            <button
                              type="button"
                              className={`${btnPrimary} ${isInWorkspace(a.id) ? 'opacity-50 cursor-not-allowed' : ''}`}
                              disabled={isInWorkspace(a.id)}
                              onClick={() => !isInWorkspace(a.id) && setConfirmAgent(a)}
                            >
                              <Rocket size={14} />
                              {isInWorkspace(a.id) ? '已添加' : '一键部署'}
                            </button>
                          </div>
                        </div>
                      </div>
                    </BentoCard>
                  ))}
                </div>
              </section>
            )}

            <section>
              <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                <h3 className={`font-bold text-base ${textPrimary(theme)}`}>全部智能体</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {list.map((a) => (
                  <BentoCard
                    key={a.id}
                    theme={theme}
                    hover
                    glow="indigo"
                    padding="md"
                    selected={detailAgent != null && String(detailAgent.id) === String(a.id)}
                    onClick={() => setDetailAgent(a)}
                    className="flex flex-col h-full"
                  >
                    <MarketplaceListingCard
                      theme={theme}
                      title={a.name}
                      statusChip={{ label: '智能体', tone: a.featured ? 'accent' : 'neutral' }}
                      trailing={agentCardTrailing(a.emoji, isDark)}
                      metaRow={a.tags.slice(0, 6).map((t) => (
                        <span key={t} className={techBadge(theme)}>
                          {t}
                        </span>
                      ))}
                      description={a.description}
                      descriptionClamp={3}
                      footerLeft={(
                        <span className="truncate text-[11px]" title={a.author}>
                          {a.author}
                        </span>
                      )}
                      footerStats={(
                        <>
                          <MarketplaceStatItem icon={TrendingUp} title="调用/安装展示">
                            {a.installs}
                          </MarketplaceStatItem>
                          <MarketplaceStatItem icon={Star} title="评分">
                            {a.rating}
                          </MarketplaceStatItem>
                          <MarketplaceStatItem icon={MessageSquare} title="评论数">
                            {a.reviewCount}
                          </MarketplaceStatItem>
                        </>
                      )}
                      primaryAction={(
                        <button
                          type="button"
                          className={`${btnPrimary} !py-1.5 !px-3 !text-xs ${isInWorkspace(a.id) ? 'opacity-50 cursor-not-allowed' : ''}`}
                          disabled={isInWorkspace(a.id)}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!isInWorkspace(a.id)) setConfirmAgent(a);
                          }}
                        >
                          {isInWorkspace(a.id) ? '已添加' : '添加'}
                        </button>
                      )}
                    />
                  </BentoCard>
                ))}
              </div>
            </section>
          </>
        )}

        <Modal open={!!detailAgent} onClose={() => setDetailAgent(null)} theme={theme} size="lg">
          {detailAgent && (
            <>
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0 ${isDark ? 'bg-white/[0.04]' : 'bg-slate-50'}`}>
                  {detailAgent.emoji}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className={`text-lg font-bold truncate ${textPrimary(theme)}`}>{detailAgent.name}</h3>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`text-xs ${textMuted(theme)}`}>{detailAgent.author}</span>
                    <span className="inline-flex items-center gap-0.5 text-xs">
                      <Star size={12} className="text-amber-500 fill-amber-500" />
                      {detailAgent.rating}
                    </span>
                    <span className={`text-xs ${textMuted(theme)}`}>{detailAgent.reviewCount} 条评价</span>
                    <span className={`text-xs ${textMuted(theme)}`}>{detailAgent.installs} 次安装</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className={btnSecondary(theme)}
                    onClick={() => setGrantModalAgent(detailAgent)}
                  >
                    申请授权
                  </button>
                  <button
                    type="button"
                    className={`${btnPrimary} shrink-0 ${isInWorkspace(detailAgent.id) ? 'opacity-50 cursor-not-allowed' : ''}`}
                    disabled={isInWorkspace(detailAgent.id)}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!isInWorkspace(detailAgent.id)) setConfirmAgent(detailAgent);
                    }}
                  >
                    <Rocket size={14} />
                    {isInWorkspace(detailAgent.id) ? '已添加' : '一键部署'}
                  </button>
                </div>
              </div>
              <div className="space-y-5">
                <div>
                  <p className={`text-sm leading-relaxed ${textSecondary(theme)}`}>{detailAgent.description}</p>
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {detailAgent.tags.map((t) => (
                      <span key={t} className={techBadge(theme)}>
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className={`font-bold text-base mb-4 flex items-center gap-2 ${textPrimary(theme)}`}>
                    消息
                  </h4>
                  <AgentReviews agentId={Number(detailAgent.id)} theme={theme} fontSize={fontSize} showMessage={showMessage} />
                </div>
              </div>
            </>
          )}
        </Modal>

        <Modal
          open={!!confirmAgent}
          onClose={() => setConfirmAgent(null)}
          title="确认添加"
          theme={theme}
          size="sm"
          footer={
            <>
              <button type="button" className={btnSecondary(theme)} onClick={() => setConfirmAgent(null)}>
                取消
              </button>
              <button
                type="button"
                className={`${btnPrimary} disabled:opacity-50`}
                disabled={addingAgent}
                onClick={async () => {
                  if (confirmAgent) {
                    await addToWorkspace(confirmAgent);
                    setConfirmAgent(null);
                  }
                }}
              >
                {addingAgent ? '添加中…' : '确认添加'}
              </button>
            </>
          }
        >
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
