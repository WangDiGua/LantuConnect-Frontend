import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Zap,
  Eye,
  Loader2,
  Star,
  Braces,
  FileText,
  Sparkles,
  Wrench,
} from 'lucide-react';
import type { Theme, FontSize, ThemeColor } from '../../types';
import type { Skill } from '../../types/dto/skill';
import type { AgentType, SourceType } from '../../types/dto/agent';
import type { ResourceCatalogItemVO } from '../../types/dto/catalog';
import { skillService } from '../../api/services/skill.service';
import { resourceCatalogService } from '../../api/services/resource-catalog.service';
import { tagService } from '../../api/services/tag.service';
import { filterTagsForResourceType } from '../../utils/marketTags';
import type { TagItem } from '../../types/dto/tag';
import { mapInvokeFlowError } from '../../utils/invokeError';
import {
  btnPrimary,
  btnSecondary,
  iconMuted,
  textPrimary,
  textSecondary,
  textMuted,
  techBadge,
} from '../../utils/uiClasses';
import { BentoCard } from '../../components/common/BentoCard';
import { Modal } from '../../components/common/Modal';
import { MarketplaceListingCard, MarketplaceStatItem, MarketPlazaPageShell, ResourceMarketRuntimeBadges } from '../../components/market';
import { useLayoutChrome } from '../../context/LayoutChromeContext';
import { PageError } from '../../components/common/PageError';
import { PageSkeleton } from '../../components/common/PageSkeleton';
import { buildPath } from '../../constants/consoleRoutes';
import { usePersistedGatewayApiKey } from '../../hooks/usePersistedGatewayApiKey';
import { GatewayApiKeyInput } from '../../components/common/GatewayApiKeyInput';
import {
  catalogAuthorDisplay,
  catalogPrimaryMetricLabel,
  catalogPrimaryMetricValue,
  catalogViewCountValue,
  formatMarketMetric,
} from '../../utils/marketMetrics';

interface Props {
  theme: Theme;
  fontSize: FontSize;
  themeColor?: ThemeColor;
  showMessage?: (msg: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

const TYPE_BADGE: Record<AgentType, { label: string; cls: string }> = {
  mcp: { label: 'MCP', cls: 'text-neutral-900 bg-neutral-900/10' },
  http_api: { label: 'HTTP API', cls: 'text-neutral-800 bg-neutral-800/10' },
  builtin: { label: '内置', cls: 'text-neutral-700 bg-neutral-700/10' },
  context_skill: { label: 'Context 技能', cls: 'text-fuchsia-900 bg-fuchsia-500/15 dark:text-fuchsia-200 dark:bg-fuchsia-500/20' },
};
const SOURCE_BADGE: Record<SourceType, { label: string; cls: string }> = {
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
function safeText(v: unknown): string {
  return String(v ?? '');
}

export const SkillMarket: React.FC<Props> = ({ theme, fontSize, themeColor: _themeColor, showMessage }) => {
  const navigate = useNavigate();
  const { chromePageTitle } = useLayoutChrome();
  const isDark = theme === 'dark';
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<Error | null>(null);
  const [keyword, setKeyword] = useState('');
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [catalogTags, setCatalogTags] = useState<TagItem[]>([]);
  const [tagStatsRows, setTagStatsRows] = useState<ResourceCatalogItemVO[]>([]);
  const [useSkill, setUseSkill] = useState<Skill | null>(null);
  const [useLoading, setUseLoading] = useState(false);
  const [useResult, setUseResult] = useState<string | null>(null);
  const [gatewayApiKeyDraft, setGatewayApiKeyDraft] = usePersistedGatewayApiKey();

  const handleOpenUse = useCallback((skill: Skill) => {
    setUseSkill(skill);
    setUseResult(null);
    setUseLoading(false);
  }, []);

  const handleResolvePreview = useCallback(async () => {
    if (!useSkill) return;
    setUseLoading(true);
    setUseResult(null);
    const apiKey = gatewayApiKeyDraft.trim();
    if (!apiKey) {
      setUseResult('请先填写并绑定有效的 X-Api-Key（须含 resolve scope）');
      setUseLoading(false);
      return;
    }
    try {
      const data = await resourceCatalogService.resolve(
        { resourceType: 'skill', resourceId: String(useSkill.id) },
        { headers: { 'X-Api-Key': apiKey } },
      );
      setUseResult(JSON.stringify(data, null, 2));
    } catch (err) {
      setUseResult(mapInvokeFlowError(err, 'resolve'));
    } finally {
      setUseLoading(false);
    }
  }, [useSkill, gatewayApiKeyDraft]);

  useEffect(() => {
    tagService
      .list()
      .then((list) => setCatalogTags(filterTagsForResourceType(list, 'skill')))
      .catch(() => setCatalogTags([]));
  }, []);

  useEffect(() => {
    resourceCatalogService
      .list({ resourceType: 'skill', status: 'published', page: 1, pageSize: 100 })
      .then((p) => setTagStatsRows(p.list))
      .catch(() => setTagStatsRows([]));
  }, []);

  const loadSkills = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    void skillService
      .list({
        status: 'published',
        pageSize: 100,
        keyword: keyword.trim() || undefined,
        tags: tagFilter ? [tagFilter] : undefined,
      })
      .then((res) => {
        if (!cancelled) setSkills(res.list);
      })
      .catch((err) => {
        if (!cancelled) {
          const error = err instanceof Error ? err : new Error('加载技能列表失败');
          setLoadError(error);
          showMessage?.(error.message, 'error');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [showMessage, keyword, tagFilter]);

  useEffect(() => {
    const cleanup = loadSkills();
    return cleanup;
  }, [loadSkills]);

  useEffect(() => {
    if (!loading && !loadError && tagFilter == null) {
      void resourceCatalogService
        .list({ resourceType: 'skill', status: 'published', page: 1, pageSize: 100 })
        .then((p) => setTagStatsRows(p.list))
        .catch(() => {});
    }
  }, [loading, loadError, tagFilter]);

  useEffect(() => {
    if (catalogTags.length === 0 && tagFilter !== null) setTagFilter(null);
  }, [catalogTags.length, tagFilter]);

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    if (!kw) return skills;
    return skills.filter((s) =>
      safeText(s.displayName).toLowerCase().includes(kw) ||
      safeText(s.agentName).toLowerCase().includes(kw) ||
      safeText(s.description).toLowerCase().includes(kw) ||
      (s.tags ?? []).some((t) => t.toLowerCase().includes(kw)),
    );
  }, [skills, keyword]);

  const tagCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of tagStatsRows) {
      for (const tg of r.tags ?? []) {
        map.set(tg, (map.get(tg) ?? 0) + 1);
      }
    }
    return map;
  }, [tagStatsRows]);

  const listCountLabel = tagStatsRows.length;

  const searchPlaceholder =
    listCountLabel > 0
      ? `搜索 Skill 服务（本页已加载 ${skills.length} 条）…`
      : '搜索 Skill 名称或编码…';

  const CategoryNav = ({ className }: { className?: string }) => (
    <nav aria-label="Skill 标签分类" className={className}>
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

  const plazaFeatures = [
    {
      variant: 'violet' as const,
      pill: '接入',
      pillIcon: Zap,
      title: '统一网关 resolve',
      description: '获取 Context 规范、绑定 MCP 闭包与目录元数据；须有效 Key 与 resolve scope。',
    },
    {
      variant: 'cyan' as const,
      pill: '调试',
      pillIcon: Wrench,
      title: '预览 resolve',
      description: '在卡片内快速拉取 resolve JSON，核对 contextPrompt 与 spec。',
    },
    {
      variant: 'fuchsia' as const,
      pill: '治理',
      pillIcon: Star,
      title: '收藏与评价',
      description: '目录评分、评论与资源中心数据打通。',
    },
  ] as const;

  return (
    <>
      <MarketPlazaPageShell
        theme={theme}
        fontSize={fontSize}
        heroIcon={Braces}
        kicker="Skill plaza"
        title={(
          <span className="bg-gradient-to-r from-violet-600 via-fuchsia-600 to-cyan-500 bg-clip-text text-transparent dark:from-violet-400 dark:via-fuchsia-400 dark:to-cyan-400">
            {chromePageTitle || 'Skills 中心'}
          </span>
        )}
        description="浏览已发布 Context 技能；通过 GET /catalog 与 POST /catalog/resolve 获取正文与绑定关系（不可对 skill 使用 POST /invoke）。"
        actions={(
          <>
            <button
              type="button"
              onClick={() => navigate(buildPath('user', 'developer-docs'))}
              className={`inline-flex min-h-9 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors motion-reduce:transition-none focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50 ${
                isDark ? 'border-white/[0.12] bg-white/[0.04] text-slate-200 hover:bg-white/[0.08]' : 'border-slate-200/80 bg-white text-slate-800 shadow-sm hover:bg-slate-50'
              }`}
            >
              <FileText className="h-3.5 w-3.5 shrink-0 text-violet-500 dark:text-violet-400" aria-hidden />
              接入与调用
            </button>
            <button
              type="button"
              onClick={() => navigate(buildPath('user', 'skill-register'))}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white shadow-md transition hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/45 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 sm:text-sm"
            >
              发布 Skill
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
            </button>
          </>
        )}
        features={plazaFeatures}
        tip={(
          <p>
            <strong className="font-semibold">{chromePageTitle || 'Skills 中心'}</strong>
            ：侧栏标签数量基于最近一次「全部」列表快照（单页最多 100 条）；筛选标签后列表为接口筛选结果。平台技能为 Context 模式，不可使用 POST /invoke（resourceType=skill）。
          </p>
        )}
        sidebar={<CategoryNav className="hidden w-full shrink-0 lg:block lg:w-52 xl:w-56" />}
        main={(
          <>
            <div className="lg:hidden">
              <p className={`mb-2 text-xs font-semibold ${textMuted(theme)}`}>分类</p>
              <div
                className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                role="tablist"
                aria-label="Skill 标签"
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
                Skill 服务
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
                  name="skill-market-search"
                  autoComplete="off"
                  spellCheck={false}
                  placeholder={searchPlaceholder}
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  aria-label="搜索 Skill 服务"
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
              <PageError error={loadError} onRetry={() => { loadSkills(); }} retryLabel="重试加载技能市场" />
            ) : filtered.length === 0 ? (
              <div className={`py-16 text-center text-sm ${textMuted(theme)}`}>
                <p className="text-lg font-medium">暂无匹配的技能</p>
                <p className="mt-1 text-sm">尝试调整搜索或标签筛选</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {filtered.map((skill) => (
                  <div
                    key={skill.id}
                    className="h-full cursor-pointer outline-none"
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        navigate(buildPath('user', 'skills-center', skill.id));
                      }
                    }}
                  >
                    <BentoCard
                      theme={theme}
                      hover
                      glow="indigo"
                      padding="md"
                      className="flex h-full flex-col"
                      onClick={() => navigate(buildPath('user', 'skills-center', skill.id))}
                    >
                      <MarketplaceListingCard
                        theme={theme}
                        title={skill.displayName}
                        statusChip={{ label: 'Context 技能', tone: 'accent' }}
                        trailing={(
                          <div
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white ${pickColor(skill.agentName)}`}
                          >
                            {(skill.displayName || skill.agentName).charAt(0)}
                          </div>
                        )}
                        metaRow={(
                          <>
                            <ResourceMarketRuntimeBadges
                              theme={theme}
                              resourceType="skill"
                              executionMode={skill.executionMode}
                              observability={skill.observability}
                            />
                            <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold text-fuchsia-900 bg-fuchsia-500/15 dark:text-fuchsia-200 dark:bg-fuchsia-500/20">
                              {TYPE_BADGE.context_skill.label}
                            </span>
                            <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${SOURCE_BADGE[skill.sourceType].cls}`}>
                              {SOURCE_BADGE[skill.sourceType].label}
                            </span>
                            {(skill.tags ?? []).slice(0, 3).map((t) => (
                              <span key={t} className={`rounded-md px-2 py-0.5 text-xs font-medium ${techBadge(theme)}`}>
                                {t}
                              </span>
                            ))}
                          </>
                        )}
                        descriptionClamp={3}
                        description={skill.description || '暂无描述'}
                        footerLeft={(
                          <div className="min-w-0 space-y-0.5">
                            <div
                              className={`truncate text-xs ${textSecondary(theme)}`}
                              title={catalogAuthorDisplay(skill)}
                            >
                              作者：{catalogAuthorDisplay(skill)}
                            </div>
                            <span className="truncate font-mono text-xs" title={`@${skill.agentName}`}>
                              @{skill.agentName}
                            </span>
                          </div>
                        )}
                        footerStats={(
                          <>
                            <MarketplaceStatItem icon={Zap} title={catalogPrimaryMetricLabel('skill')}>
                              {formatMarketMetric(catalogPrimaryMetricValue('skill', skill))}
                            </MarketplaceStatItem>
                            <MarketplaceStatItem icon={Eye} title="浏览量">
                              {formatMarketMetric(catalogViewCountValue(skill))}
                            </MarketplaceStatItem>
                            <MarketplaceStatItem icon={Star} title="目录评分">
                              {skill.ratingAvg != null ? skill.ratingAvg.toFixed(1) : '—'}
                            </MarketplaceStatItem>
                          </>
                        )}
                        primaryAction={(
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenUse(skill);
                            }}
                            className={`${btnPrimary} !rounded-xl !px-4 !py-2 !text-xs !font-bold`}
                          >
                            预览 resolve
                          </button>
                        )}
                      />
                    </BentoCard>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      />

      <Modal
        open={!!useSkill}
        onClose={() => setUseSkill(null)}
        title={useSkill ? `POST /catalog/resolve — ${useSkill.displayName}` : ''}
        theme={theme}
        size="md"
        footer={(
          <>
            <button type="button" className={btnSecondary(theme)} onClick={() => setUseSkill(null)}>
              关闭
            </button>
            <button type="button" className={`${btnPrimary} disabled:opacity-50`} disabled={useLoading} onClick={() => void handleResolvePreview()}>
              {useLoading ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> 处理中…
                </>
              ) : (
                <>拉取 resolve 结果</>
              )}
            </button>
          </>
        )}
      >
        {useSkill && (
          <div className="space-y-4">
            <GatewayApiKeyInput
              theme={theme}
              id="skill-market-gateway-key"
              value={gatewayApiKeyDraft}
              onChange={setGatewayApiKeyDraft}
            />
            <p className={`text-xs leading-relaxed ${textMuted(theme)}`}>
              使用 <strong className={textSecondary(theme)}>POST /catalog/resolve</strong> 获取 <span className="font-mono">invokeType</span>、
              <span className="font-mono">spec</span>（含 <span className="font-mono">contextPrompt</span>）与绑定闭包。Key 须含 <strong className={textSecondary(theme)}>resolve</strong> scope。
            </p>
            <p className={`text-xs ${textMuted(theme)}`}>{useSkill.description || '暂无描述'}</p>
            {useResult ? (
              <div
                className={`rounded-xl p-4 text-sm font-medium whitespace-pre-wrap ${
                  isDark ? 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-400' : 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                }`}
              >
                {useResult}
              </div>
            ) : null}
          </div>
        )}
      </Modal>
    </>
  );
};
