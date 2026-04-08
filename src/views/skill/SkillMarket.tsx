import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Zap,
  Download,
  Eye,
  Loader2,
  Star,
  Braces,
  FileText,
  Sparkles,
  ChevronRight,
  Plus,
  LayoutGrid,
  FolderKanban,
  Wrench,
  Megaphone,
  Code2,
  Image,
  ShieldCheck,
  Smartphone,
  Puzzle,
  MoreHorizontal,
  Store,
} from 'lucide-react';
import type { Theme, FontSize, ThemeColor } from '../../types';
import type { Skill } from '../../types/dto/skill';
import type { AgentType, SourceType } from '../../types/dto/agent';
import { skillService } from '../../api/services/skill.service';
import { tagService } from '../../api/services/tag.service';
import { filterTagsForResourceType } from '../../utils/marketTags';
import type { TagItem } from '../../types/dto/tag';
import { resourceCatalogService } from '../../api/services/resource-catalog.service';
import { mapInvokeFlowError } from '../../utils/invokeError';
import { fetchSkillPackBlobDownload, resolveSkillArtifactTarget } from '../../utils/skillArtifactDownload';
import { safeOpenHttpUrl } from '../../lib/windowNavigate';
import {
  canvasBodyBg,
  mainScrollPadBottom,
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
import { MarketplaceListingCard, MarketplaceStatItem } from '../../components/market';
import { GrantApplicationModal } from '../../components/business/GrantApplicationModal';
import { useLayoutChrome } from '../../context/LayoutChromeContext';
import { PageError } from '../../components/common/PageError';
import { PageSkeleton } from '../../components/common/PageSkeleton';
import { buildPath } from '../../constants/consoleRoutes';
import { usePersistedGatewayApiKey } from '../../hooks/usePersistedGatewayApiKey';
import { GatewayApiKeyInput } from '../../components/common/GatewayApiKeyInput';
import { ApiException } from '../../types/api';
import { resolvePersonDisplay } from '../../utils/personDisplay';
import { MARKET_HERO_TITLE_CLASSES } from '../../constants/theme';
import {
  catalogAuthorDisplay,
  catalogPrimaryMetricLabel,
  catalogPrimaryMetricValue,
  catalogViewCountValue,
  formatMarketMetric,
} from '../../utils/marketMetrics';

interface Props { theme: Theme; fontSize: FontSize; themeColor?: ThemeColor; showMessage?: (msg: string, type: 'success' | 'error' | 'info' | 'warning') => void; }

const TYPE_BADGE: Record<AgentType, { label: string; cls: string }> = {
  mcp: { label: 'MCP', cls: 'text-neutral-900 bg-neutral-900/10' },
  http_api: { label: 'HTTP API', cls: 'text-neutral-800 bg-neutral-800/10' },
  builtin: { label: '内置', cls: 'text-neutral-700 bg-neutral-700/10' },
  skill_pack: { label: '技能包', cls: 'text-violet-900 bg-violet-500/15 dark:text-violet-200 dark:bg-violet-500/20' },
};
const SOURCE_BADGE: Record<SourceType, { label: string; cls: string }> = { internal: { label: '自研', cls: 'text-sky-600 bg-sky-500/10' }, partner: { label: '合作方', cls: 'text-neutral-900 bg-neutral-900/10' }, cloud: { label: '云服务', cls: 'text-cyan-600 bg-cyan-500/10' } };
const ICON_COLORS = ['bg-neutral-900', 'bg-neutral-800', 'bg-neutral-700', 'bg-stone-800', 'bg-zinc-800', 'bg-neutral-600', 'bg-slate-800', 'bg-neutral-950'];
function pickColor(str: string): string { let h = 0; for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h); return ICON_COLORS[Math.abs(h) % ICON_COLORS.length]; }
function safeText(v: unknown): string { return String(v ?? ''); }

const CATEGORY_SCROLL_ICON_CYCLE = [
  LayoutGrid,
  FolderKanban,
  Wrench,
  Megaphone,
  Code2,
  Image,
  ShieldCheck,
  Smartphone,
  Puzzle,
  MoreHorizontal,
] as const;

function formatTotalSkills(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(n % 10000 === 0 ? 0 : 1)} 万`;
  if (n >= 1000) return n.toLocaleString('zh-CN');
  return String(n);
}


export const SkillMarket: React.FC<Props> = ({ theme, fontSize, themeColor: _themeColor, showMessage }) => {
  const navigate = useNavigate();
  const { chromePageTitle } = useLayoutChrome();
  const isDark = theme === 'dark';
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<Error | null>(null);
  const [keyword, setKeyword] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('全部');
  const [catalogTags, setCatalogTags] = useState<TagItem[]>([]);
  const [useSkill, setUseSkill] = useState<Skill | null>(null);
  const [useLoading, setUseLoading] = useState(false);
  const [grantModalOpen, setGrantModalOpen] = useState(false);
  const [useResult, setUseResult] = useState<string | null>(null);
  const [gatewayApiKeyDraft, setGatewayApiKeyDraft] = usePersistedGatewayApiKey();
  const [listTotal, setListTotal] = useState<number | null>(null);

  const handleOpenUse = useCallback((skill: Skill) => { setUseSkill(skill); setUseResult(null); setUseLoading(false); }, []);
  const handleExecute = useCallback(async () => {
    if (!useSkill) return;
    setUseLoading(true);
    setUseResult(null);
    const apiKey = gatewayApiKeyDraft.trim();
    if (!apiKey) {
      setUseResult('请先填写并绑定有效的 X-Api-Key（创建 Key 时的完整 secretPlain）');
      setUseLoading(false);
      return;
    }
    try {
      let resolved;
      try {
        resolved = await resourceCatalogService.resolve({
          resourceType: 'skill',
          resourceId: String(useSkill.id),
        }, { headers: { 'X-Api-Key': apiKey } });
      } catch (err) {
        if (err instanceof ApiException && err.code === 1009) {
          setUseResult(err.message || '请绑定有效的 X-Api-Key（创建 Key 时的完整 secretPlain）');
        } else if (err instanceof ApiException && (err.status === 401 || err.code === 1002)) {
          setUseResult('请先选择有效 API Key');
        } else if (err instanceof ApiException && (err.status === 403 || err.code === 1003)) {
          setUseResult('你暂无该资源使用权限，请先申请授权');
        } else if (err instanceof Error && (err.message.includes('X-Api-Key') || err.message.includes('API Key'))) {
          setUseResult('请先填写并绑定 API Key');
        } else {
          setUseResult(`${mapInvokeFlowError(err, 'resolve')}\n请确认 Key 与 resolve 授权后重试`);
        }
        return;
      }
      if (resolved.invokeType === 'redirect' && resolved.endpoint) {
        if (!safeOpenHttpUrl(resolved.endpoint)) {
          setUseResult('无法打开该地址（仅支持 http/https）');
          return;
        }
        setUseResult(`该资源为跳转类型，已打开地址：${resolved.endpoint}`);
        return;
      }
      if (resolved.invokeType === 'metadata') {
        setUseResult(`目录返回元数据：${JSON.stringify(resolved.spec ?? {}, null, 2)}`);
        return;
      }
      if (resolved.invokeType === 'artifact') {
        const target = resolveSkillArtifactTarget(resolved);
        if (!target) {
          setUseResult('解析成功，但未找到可下载的制品地址。请确认技能已上传制品或联系管理员。');
          return;
        }
        if (target.mode === 'open_tab') {
          if (!safeOpenHttpUrl(target.url)) {
            setUseResult('公开制品地址无效（仅支持 http/https）');
            return;
          }
          setUseResult(`该技能为公开制品，已尝试打开直链。若未自动下载，请在新页面选择「另存为」。\n${target.url}`);
          return;
        }
        const safeName = `${(useSkill.displayName || useSkill.agentName || 'skill').replace(/[\\/:*?"<>|]+/g, '_')}.zip`;
        try {
          await fetchSkillPackBlobDownload(target.url, apiKey, safeName);
          setUseResult('已开始下载技能包（受控下载不计入网关 invoke 统计）。若被拦截，请检查浏览器下载权限。');
        } catch (e) {
          setUseResult(e instanceof Error ? e.message : '下载技能包失败');
        }
        return;
      }
      setUseResult(`解析返回类型：${resolved.invokeType ?? '未知'}。技能市场仅支持制品下载与目录信息，不提供统一 invoke。`);
    } catch (e) {
      setUseResult(`操作失败: ${e instanceof Error ? e.message : '未知错误'}`);
    } finally {
      setUseLoading(false);
    }
  }, [useSkill, gatewayApiKeyDraft]);
  const handleApplyAuthorization = useCallback(() => {
    if (!useSkill) return;
    setGrantModalOpen(true);
  }, [useSkill]);

  useEffect(() => {
    tagService.list()
      .then((list) => setCatalogTags(filterTagsForResourceType(list, 'skill')))
      .catch(() => setCatalogTags([]));
  }, []);

  const loadSkills = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    void skillService.list({
      status: 'published',
      pageSize: 50,
      keyword: keyword.trim() || undefined,
      tags: activeCategory !== '全部' ? [activeCategory] : undefined,
    } as any)
      .then((res) => {
        if (!cancelled) {
          setSkills(res.list);
          setListTotal(typeof res.total === 'number' ? res.total : res.list.length);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          const error = err instanceof Error ? err : new Error('加载技能列表失败');
          setLoadError(error);
          showMessage?.(error.message, 'error');
        }
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [showMessage, keyword, activeCategory]);

  useEffect(() => {
    const cleanup = loadSkills();
    return cleanup;
  }, [loadSkills]);

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    if (!kw) return skills;
    return skills.filter((s) =>
      safeText(s.displayName).toLowerCase().includes(kw)
      || safeText(s.agentName).toLowerCase().includes(kw)
      || safeText(s.description).toLowerCase().includes(kw)
      || (s.tags ?? []).some((t) => t.toLowerCase().includes(kw)),
    );
  }, [skills, keyword]);

  const searchPlaceholder = useMemo(() => {
    if (loading || listTotal == null) return '搜索 Skills…';
    return `搜索 Skills（共 ${formatTotalSkills(listTotal)} 条）`;
  }, [loading, listTotal]);

  const categoryRows = useMemo(() => {
    const rows: Array<{ key: string; label: string; Icon: (typeof CATEGORY_SCROLL_ICON_CYCLE)[number] }> = [
      { key: '__all', label: '全部', Icon: LayoutGrid },
    ];
    catalogTags.forEach((t, i) => {
      rows.push({
        key: String(t.id),
        label: t.name,
        Icon: CATEGORY_SCROLL_ICON_CYCLE[(i + 1) % CATEGORY_SCROLL_ICON_CYCLE.length],
      });
    });
    return rows;
  }, [catalogTags]);

  return (
    <div className={`w-full ${canvasBodyBg(theme)}`}>
      <div className={`${mainScrollPadBottom} space-y-5`}>
        {/* 顶栏：品牌区 + 轻量操作（紧凑版，减少首屏占用） */}
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
          <div className="flex min-w-0 items-start gap-3 sm:gap-3.5">
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-lg font-bold text-white shadow-md shadow-violet-500/20 sm:h-12 sm:w-12 ${
                isDark
                  ? 'bg-gradient-to-br from-violet-500 to-cyan-400'
                  : 'bg-gradient-to-br from-violet-600 to-sky-500'
              }`}
              aria-hidden
            >
              <Braces className="h-6 w-6 sm:h-6 sm:w-6" strokeWidth={2.25} />
            </div>
            <div className="min-w-0">
              <p className={`text-xs font-semibold uppercase tracking-wider ${textMuted(theme)}`}>Skill marketplace</p>
              <h1 className={`mt-0.5 font-bold tracking-tight ${MARKET_HERO_TITLE_CLASSES[fontSize]}`}>
                <span className="bg-gradient-to-r from-violet-600 via-fuchsia-600 to-cyan-500 bg-clip-text text-transparent dark:from-violet-400 dark:via-fuchsia-400 dark:to-cyan-400">
                  Skills
                </span>
                <span className={textPrimary(theme)}> 中心</span>
              </h1>
              <p className={`mt-1 max-w-2xl text-xs leading-snug sm:text-sm ${textSecondary(theme)}`}>
                汇聚可复用技能组件与技能包，连接智能体与工作流；浏览目录、筛选分类，一键获取制品（resolve 下载）。
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
            <button
              type="button"
              onClick={() => navigate(buildPath('user', 'skill-external-market'))}
              className={`inline-flex min-h-11 items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors motion-reduce:transition-none focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50 ${
                isDark ? 'border-amber-500/35 bg-amber-500/10 text-amber-100 hover:bg-amber-500/15' : 'border-amber-200/90 bg-amber-50 text-amber-900 shadow-sm hover:bg-amber-100/90'
              }`}
            >
              <Store className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-300" aria-hidden />
              在线市场
            </button>
            <button
              type="button"
              onClick={() => navigate(buildPath('user', 'api-docs'))}
              className={`inline-flex min-h-9 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors motion-reduce:transition-none focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50 ${
                isDark ? 'border-white/[0.12] bg-white/[0.04] text-slate-200 hover:bg-white/[0.08]' : 'border-slate-200/80 bg-white text-slate-800 shadow-sm hover:bg-slate-50'
              }`}
            >
              <FileText className="h-3.5 w-3.5 shrink-0 text-violet-500 dark:text-violet-400" aria-hidden />
              技术文档
            </button>
            <button
              type="button"
              onClick={() => navigate(buildPath('user', 'hub'))}
              className={`inline-flex min-h-9 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors motion-reduce:transition-none focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50 ${
                isDark ? 'border-white/[0.12] bg-white/[0.04] text-slate-200 hover:bg-white/[0.08]' : 'border-slate-200/80 bg-white text-slate-800 shadow-sm hover:bg-slate-50'
              }`}
              aria-label="回到探索发现"
            >
              <Sparkles className="h-3.5 w-3.5 shrink-0 text-cyan-500 dark:text-cyan-400" aria-hidden />
              探索发现
            </button>
          </div>
        </header>

        {/* Hero 双卡 */}
        <div className="grid gap-3 md:grid-cols-2">
          <div
            className={`relative overflow-hidden rounded-2xl border p-4 sm:p-5 ${
              isDark
                ? 'border-cyan-500/20 bg-gradient-to-br from-cyan-500/15 via-slate-900/40 to-violet-600/10'
                : 'border-sky-200/60 bg-gradient-to-br from-sky-100/90 via-white to-indigo-50/80'
            }`}
          >
            <div
              className={`pointer-events-none absolute -right-6 -top-6 text-8xl font-black opacity-[0.07] ${textPrimary(theme)}`}
              aria-hidden
            >
              /*
            </div>
            <div className="relative flex flex-col gap-3">
              <div className="inline-flex w-fit items-center gap-2 rounded-full bg-white/80 px-2.5 py-0.5 text-xs font-semibold text-cyan-800 shadow-sm dark:bg-white/10 dark:text-cyan-200">
                <Zap className="h-3.5 w-3.5" aria-hidden />
                Agent × Skills
              </div>
              <div>
                <h2 className={`text-base font-bold sm:text-lg ${textPrimary(theme)}`}>在统一目录中编排技能</h2>
                <p className={`mt-1.5 max-w-sm text-xs leading-snug sm:text-sm ${textSecondary(theme)}`}>
                  从智能体市场接入 MCP / API，再结合本页技能包，快速拼装校园与业务场景能力。
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate(buildPath('user', 'agents-center'))}
                className="inline-flex w-fit min-h-9 items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white shadow-md transition hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 sm:text-sm dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
              >
                去逛 Agent 市场
                <ChevronRight className="h-4 w-4" aria-hidden />
              </button>
            </div>
          </div>
          <div
            className={`relative overflow-hidden rounded-2xl border p-4 sm:p-5 ${
              isDark
                ? 'border-violet-500/25 bg-gradient-to-br from-violet-600/15 via-slate-900/35 to-fuchsia-600/10'
                : 'border-violet-200/70 bg-gradient-to-br from-violet-50/95 via-white to-fuchsia-50/70'
            }`}
          >
            <div
              className={`pointer-events-none absolute inset-0 opacity-[0.35] [background-image:linear-gradient(to_right,${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.06)'}_1px,transparent_1px),linear-gradient(to_bottom,${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.06)'}_1px,transparent_1px)] [background-size:24px_24px]`}
              aria-hidden
            />
            <div className="relative flex h-full flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                    isDark ? 'bg-fuchsia-500/25 text-fuchsia-100' : 'bg-fuchsia-100 text-fuchsia-800'
                  }`}
                >
                  精选合集
                </span>
                <span className={`text-xs font-semibold sm:text-sm ${textPrimary(theme)}`}>Skills 市集亮点</span>
              </div>
              <p className={`text-xs leading-snug sm:text-sm ${textSecondary(theme)}`}>
                按标签浏览办公、生成、翻译等场景化技能包；支持收藏、评价与 resolve 下载制品。
              </p>
              <div className="mt-auto flex items-center justify-between gap-3 pt-1">
                <div className="flex gap-1.5" role="presentation" aria-hidden>
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className={`h-1.5 w-1.5 rounded-full ${i === 0 ? 'bg-violet-500 dark:bg-violet-400' : isDark ? 'bg-white/20' : 'bg-slate-300'}`}
                    />
                  ))}
                </div>
                <span className={`text-xs font-medium tabular-nums ${textMuted(theme)}`}>
                  {listTotal != null && !loading ? `目录约 ${formatTotalSkills(listTotal)} 条` : '加载中…'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 分类 + 搜索 + 发布：大屏同一行；小屏纵向堆叠避免挤压 */}
        <div className="flex flex-col gap-3 lg:flex-row lg:flex-nowrap lg:items-center lg:gap-3">
          <nav aria-label="技能分类" className="min-w-0 lg:max-w-[min(100%,26rem)] lg:shrink-0 xl:max-w-none">
            <div
              className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] sm:gap-3 [&::-webkit-scrollbar]:hidden"
            >
              {categoryRows.map((row) => {
                const active = activeCategory === row.label;
                const Icon = row.Icon;
                return (
                  <button
                    key={row.key}
                    type="button"
                    onClick={() => setActiveCategory(row.label)}
                    aria-current={active ? 'true' : undefined}
                    className={`flex min-w-[4.5rem] shrink-0 flex-col items-center gap-1.5 rounded-2xl border px-3 py-3 text-center transition-colors motion-reduce:transition-none focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50 sm:min-w-[5.25rem] sm:px-4 lg:py-2.5 ${
                      active
                        ? isDark
                          ? 'border-violet-400/40 bg-violet-500/15 text-white'
                          : 'border-violet-300 bg-violet-50 text-violet-950'
                        : isDark
                          ? 'border-white/[0.08] bg-white/[0.03] text-slate-300 hover:bg-white/[0.06]'
                          : 'border-slate-200/80 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className={`h-5 w-5 sm:h-6 sm:w-6 lg:h-5 lg:w-5 ${active ? 'text-violet-600 dark:text-violet-300' : iconMuted(theme)}`} strokeWidth={1.75} aria-hidden />
                    <span className="max-w-[5.5rem] truncate text-xs font-semibold">{row.label}</span>
                  </button>
                );
              })}
            </div>
          </nav>
          <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:gap-3">
            <div className="relative min-w-0 flex-1">
              <Search className={`pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 ${iconMuted(theme)}`} aria-hidden />
              <input
                type="search"
                placeholder={searchPlaceholder}
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className={`min-h-12 w-full rounded-2xl border py-3 pl-12 pr-4 text-sm outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-violet-500/40 ${
                  isDark ? 'border-white/[0.1] bg-white/[0.05] text-white placeholder:text-slate-500' : 'border-slate-200/90 bg-white text-slate-900 shadow-sm placeholder:text-slate-400'
                }`}
                aria-label="搜索技能"
              />
            </div>
            <button
              type="button"
              onClick={() => navigate(buildPath('user', 'skill-register'))}
              className={`inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50 sm:whitespace-nowrap ${
                isDark ? 'bg-white text-slate-900 hover:bg-slate-100' : 'bg-slate-900 text-white hover:bg-slate-800'
              }`}
            >
              <Plus className="h-5 w-5" strokeWidth={2.25} aria-hidden />
              发布技能
            </button>
          </div>
        </div>

        {/* 说明条：保留业务提示，压缩为一条 */}
        <div
          className={`flex gap-3 rounded-2xl border px-4 py-3 text-sm leading-relaxed ${
            isDark ? 'border-amber-500/25 bg-amber-500/[0.07] text-amber-100/90' : 'border-amber-200/80 bg-amber-50/80 text-amber-950'
          }`}
        >
          <Zap className="mt-0.5 h-4 w-4 shrink-0 text-amber-500 dark:text-amber-400" aria-hidden />
          <p>
            <strong className="font-semibold">{chromePageTitle || 'Skills 中心'}</strong>
            ：浏览已发布技能包并下载制品。市场卡片展示下载量（技能包受控下载次数）与详情浏览量；调用统计见其它资源类型。
          </p>
        </div>

        {/* 卡片网格 */}
        {loading ? (
          <PageSkeleton type="cards" />
        ) : loadError ? (
          <PageError error={loadError} onRetry={() => { loadSkills(); }} retryLabel="重试加载技能市场" />
        ) : filtered.length === 0 ? (
          <div className={`rounded-2xl border py-20 text-center ${isDark ? 'border-white/[0.08] bg-white/[0.02]' : 'border-slate-200/80 bg-white/80'}`}>
            <p className={`text-lg font-semibold ${textMuted(theme)}`}>暂无匹配的技能</p>
            <p className={`mt-2 text-sm ${textMuted(theme)}`}>试试其它分类或清空搜索</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 lg:gap-5">
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
                    statusChip={{ label: '技能包', tone: 'accent' }}
                    trailing={(
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white ${pickColor(skill.agentName)}`}
                      >
                        {(skill.displayName || skill.agentName).charAt(0)}
                      </div>
                    )}
                    metaRow={(
                      <>
                        <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${TYPE_BADGE[skill.agentType].cls}`}>
                          {TYPE_BADGE[skill.agentType].label}
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
                        <MarketplaceStatItem icon={Download} title={catalogPrimaryMetricLabel('skill')}>
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
                        获取技能包
                      </button>
                    )}
                  />
                </BentoCard>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Use panel */}
      <Modal open={!!useSkill} onClose={() => { setUseSkill(null); setGrantModalOpen(false); }} title={useSkill ? `获取技能包 — ${useSkill.displayName}` : ''} theme={theme} size="md" footer={
        <><button type="button" className={btnSecondary(theme)} onClick={() => setUseSkill(null)}>关闭</button>
        <button type="button" className={btnSecondary(theme)} onClick={handleApplyAuthorization}>
          申请 resolve 授权
        </button>
        <button type="button" className={`${btnPrimary} disabled:opacity-50`} disabled={useLoading} onClick={handleExecute}>
          {useLoading ? <><Loader2 size={14} className="animate-spin" /> 处理中…</> : <><Download size={14} /> 解析并下载</>}
        </button></>
      }>
        {useSkill && (
          <div className="space-y-4">
            <GatewayApiKeyInput
              theme={theme}
              id="skill-market-gateway-key"
              value={gatewayApiKeyDraft}
              onChange={setGatewayApiKeyDraft}
            />
            <p className={`text-xs leading-relaxed ${textMuted(theme)}`}>
              技能包通过目录解析后下载制品；不在此走统一网关 invoke。远程可调用能力请作为 <strong className={textSecondary(theme)}>MCP</strong> 注册。
            </p>
            <p className={`text-xs ${textMuted(theme)}`}>{useSkill.description || '暂无描述'}</p>
            {useResult && <div className={`rounded-xl p-4 text-sm font-medium whitespace-pre-wrap ${isDark ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>{useResult}</div>}
          </div>
        )}
      </Modal>
      <GrantApplicationModal
        open={grantModalOpen}
        onClose={() => setGrantModalOpen(false)}
        theme={theme}
        resourceType="skill"
        resourceId={useSkill?.id ?? ''}
        resourceName={useSkill?.displayName}
        showMessage={showMessage}
      />
    </div>
  );
};
