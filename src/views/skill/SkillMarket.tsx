import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Zap, Clock, Activity, MessageSquare, Download, Loader2, Heart, Star } from 'lucide-react';
import type { Theme, FontSize, ThemeColor } from '../../types';
import type { Skill } from '../../types/dto/skill';
import type { AgentType, SourceType } from '../../types/dto/agent';
import { skillService } from '../../api/services/skill.service';
import { userActivityService } from '../../api/services/user-activity.service';
import { tagService } from '../../api/services/tag.service';
import { filterTagsForResourceType } from '../../utils/marketTags';
import type { TagItem } from '../../types/dto/tag';
import { resourceCatalogService } from '../../api/services/resource-catalog.service';
import { mapInvokeFlowError } from '../../utils/invokeError';
import { fetchSkillPackBlobDownload, resolveSkillArtifactTarget } from '../../utils/skillArtifactDownload';
import { safeOpenHttpUrl } from '../../lib/windowNavigate';
import {
  canvasBodyBg, mainScrollCompositorClass, bentoCard, btnPrimary, btnSecondary,
  iconMuted, textPrimary, textSecondary, textMuted, techBadge,
} from '../../utils/uiClasses';
import { BentoCard } from '../../components/common/BentoCard';
import { GlassPanel } from '../../components/common/GlassPanel';
import { Modal } from '../../components/common/Modal';
import { ResourceReviewsSection } from '../../components/business/ResourceReviewsSection';
import { GrantApplicationModal } from '../../components/business/GrantApplicationModal';
import { useLayoutChrome } from '../../context/LayoutChromeContext';
import { MarketLayout } from '../../components/layout/PageLayouts';
import { PageError } from '../../components/common/PageError';
import { PageSkeleton } from '../../components/common/PageSkeleton';
import { PageTitleTagline } from '../../components/common/PageTitleTagline';
import { formatDateTime } from '../../utils/formatDateTime';
import { buildPath } from '../../constants/consoleRoutes';
import { usePersistedGatewayApiKey } from '../../hooks/usePersistedGatewayApiKey';
import { GatewayApiKeyInput } from '../../components/common/GatewayApiKeyInput';
import { ApiException } from '../../types/api';
import { resolvePersonDisplay } from '../../utils/personDisplay';

interface Props { theme: Theme; fontSize: FontSize; themeColor?: ThemeColor; showMessage?: (msg: string, type: 'success' | 'error' | 'info' | 'warning') => void; }

const TYPE_BADGE: Record<AgentType, { label: string; cls: string }> = { mcp: { label: 'MCP', cls: 'text-neutral-900 bg-neutral-900/10' }, http_api: { label: 'HTTP API', cls: 'text-neutral-800 bg-neutral-800/10' }, builtin: { label: '内置', cls: 'text-neutral-700 bg-neutral-700/10' } };
const SOURCE_BADGE: Record<SourceType, { label: string; cls: string }> = { internal: { label: '自研', cls: 'text-sky-600 bg-sky-500/10' }, partner: { label: '合作方', cls: 'text-neutral-900 bg-neutral-900/10' }, cloud: { label: '云服务', cls: 'text-cyan-600 bg-cyan-500/10' } };
const ICON_COLORS = ['bg-neutral-900', 'bg-neutral-800', 'bg-neutral-700', 'bg-stone-800', 'bg-zinc-800', 'bg-neutral-600', 'bg-slate-800', 'bg-neutral-950'];
function pickColor(str: string): string { let h = 0; for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h); return ICON_COLORS[Math.abs(h) % ICON_COLORS.length]; }
function formatLatency(ms: number): string { return ms >= 1000 ? (ms / 1000).toFixed(1) + 's' : ms + 'ms'; }
function formatCount(n: number): string { if (n >= 10000) return (n / 10000).toFixed(1) + '万'; if (n >= 1000) return (n / 1000).toFixed(1) + 'k'; return String(n); }

function safeText(v: unknown): string { return String(v ?? ''); }


export const SkillMarket: React.FC<Props> = ({ theme, fontSize: _fontSize, themeColor: _themeColor, showMessage }) => {
  const navigate = useNavigate();
  const { chromePageTitle } = useLayoutChrome();
  const isDark = theme === 'dark';
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<Error | null>(null);
  const [keyword, setKeyword] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('全部');
  const [catalogTags, setCatalogTags] = useState<TagItem[]>([]);
  const [detailSkill, setDetailSkill] = useState<Skill | null>(null);
  const [useSkill, setUseSkill] = useState<Skill | null>(null);
  const [useLoading, setUseLoading] = useState(false);
  const [grantModalOpen, setGrantModalOpen] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [useResult, setUseResult] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const processedResourceId = useRef<string | null>(null);
  const [gatewayApiKeyDraft, setGatewayApiKeyDraft] = usePersistedGatewayApiKey();

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

  const handleFavorite = useCallback(async (skill: Skill) => {
    if (favoriteLoading) return;
    setFavoriteLoading(true);
    try {
      await userActivityService.addFavorite('skill', Number(skill.id));
      showMessage?.('已加入我的收藏', 'success');
    } catch (e) {
      const message = e instanceof Error ? e.message : '收藏失败';
      if (message.includes('FAVORITE_EXISTS') || message.includes('已收藏')) {
        showMessage?.('该资源已在收藏夹中', 'info');
      } else {
        showMessage?.(message, 'error');
      }
    } finally {
      setFavoriteLoading(false);
    }
  }, [favoriteLoading, showMessage]);

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
        if (!cancelled) setSkills(res.list);
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

  useEffect(() => {
    const rid = searchParams.get('resourceId');
    if (!rid) {
      processedResourceId.current = null;
      return;
    }
    if (loading || skills.length === 0) return;
    if (processedResourceId.current === rid) return;
    processedResourceId.current = rid;
    const next = new URLSearchParams(searchParams);
    next.delete('resourceId');
    setSearchParams(next, { replace: true });
    const hit = skills.find((s) => String(s.id) === String(rid));
    if (hit) {
      setDetailSkill(hit);
    } else {
      showMessage?.('未在已上架列表中找到该技能，请确认资源已发布且 ID 正确', 'warning');
    }
  }, [loading, skills, searchParams, setSearchParams, showMessage]);

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

  return (
    <div className={`flex-1 overflow-y-auto custom-scrollbar ${mainScrollCompositorClass} ${canvasBodyBg(theme)}`}>
      <MarketLayout>
        <div className={`${bentoCard(theme)} overflow-hidden p-4 sm:p-6 lg:p-8`}>
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className={`shrink-0 rounded-xl p-2 ${isDark ? 'bg-neutral-900/10' : 'bg-neutral-100'}`}><Zap size={22} className="text-neutral-800" /></div>
            <PageTitleTagline
              subtitleOnly
              theme={theme}
              title={chromePageTitle || '技能市场'}
              tagline="浏览技能包目录并下载制品；网关不接受 skill 的 invoke，调用统计不含下载（见资源成效中的技能包下载指标）"
            />
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:items-end">
            <button
              type="button"
              onClick={() => navigate(buildPath('user', 'skill-register'))}
              className={`${btnSecondary} shrink-0 px-3 py-2 text-xs font-semibold`}
            >
              发布技能（上传 / URL 导入）
            </button>
          <GlassPanel theme={theme} padding="sm" className="!p-0 w-full sm:w-72">
            <div className="relative">
              <Search size={16} className={`absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${iconMuted(theme)}`} />
              <input type="text" placeholder="搜索技能…" value={keyword} onChange={(e) => setKeyword(e.target.value)} className={`w-full bg-transparent pl-9 pr-3 py-2.5 text-sm outline-none ${textPrimary(theme)}`} />
            </div>
          </GlassPanel>
          </div>
        </div>

        {/* Tags from GET /tags (category Skill) */}
        <div className="flex flex-wrap gap-2 mb-5 items-center">
          <span className={`text-xs font-medium shrink-0 ${textMuted(theme)}`}>标签：</span>
          <button type="button" onClick={() => setActiveCategory('全部')} className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${activeCategory === '全部' ? 'bg-neutral-900 text-white shadow-sm shadow-neutral-900/15' : isDark ? 'text-slate-400 hover:bg-white/5' : 'text-slate-600 hover:bg-slate-100'}`}>全部</button>
          {catalogTags.map((t) => (
            <button key={t.id} type="button" onClick={() => setActiveCategory(t.name)} className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${activeCategory === t.name ? 'bg-neutral-900 text-white shadow-sm shadow-neutral-900/15' : isDark ? 'text-slate-400 hover:bg-white/5' : 'text-slate-600 hover:bg-slate-100'}`}>{t.name}</button>
          ))}
        </div>

        {/* Grid */}
        {loading ? <PageSkeleton type="cards" />
        : loadError ? <PageError error={loadError} onRetry={() => { loadSkills(); }} retryLabel="重试加载技能市场" />
        : filtered.length === 0 ? <div className="text-center py-20"><p className={`text-lg font-medium ${textMuted(theme)}`}>暂无匹配的技能</p><p className={`text-sm mt-1 ${textMuted(theme)}`}>尝试调整搜索关键词或分类筛选</p></div>
        : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((skill) => (
              <BentoCard key={skill.id} theme={theme} hover glow="indigo" padding="md" onClick={() => setDetailSkill(skill)} className="flex flex-col h-full !rounded-[20px]">
                <div className="flex items-start gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0 ${pickColor(skill.agentName)}`}>{(skill.displayName || skill.agentName).charAt(0)}</div>
                  <div className="min-w-0 flex-1">
                    <h3 className={`font-semibold truncate ${textPrimary(theme)}`}>{skill.displayName}</h3>
                    <p className={`text-xs truncate ${textMuted(theme)}`}>{skill.agentName}</p>
                  </div>
                </div>
                <p className={`text-sm leading-relaxed mb-3 line-clamp-2 ${textSecondary(theme)}`}>{skill.description || '暂无描述'}</p>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${TYPE_BADGE[skill.agentType].cls}`}>{TYPE_BADGE[skill.agentType].label}</span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${SOURCE_BADGE[skill.sourceType].cls}`}>{SOURCE_BADGE[skill.sourceType].label}</span>
                  {(skill.tags ?? []).slice(0, 4).map((t) => (
                    <span key={t} className={techBadge(theme)}>{t}</span>
                  ))}
                </div>
                <div className={`pt-3 border-t mt-auto space-y-3 ${isDark ? 'border-white/[0.08]' : 'border-slate-200/40'}`}>
                  <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 text-xs ${textMuted(theme)}`}>
                    <span
                      className="truncate max-w-[10rem]"
                      title={resolvePersonDisplay({ names: [skill.createdByName], ids: [skill.createdBy ?? undefined] })}
                    >
                      {resolvePersonDisplay({ names: [skill.createdByName], ids: [skill.createdBy ?? undefined] })}
                    </span>
                    <span className="inline-flex items-center gap-0.5 tabular-nums" title="目录聚合评分与评论数">
                      <Star size={12} className="shrink-0 text-amber-500" aria-hidden />
                      <span>{skill.ratingAvg != null ? skill.ratingAvg.toFixed(1) : '—'}</span>
                      <span className="opacity-80">({skill.reviewCount ?? 0})</span>
                    </span>
                    <span className="flex items-center gap-1" title="目录展示热度（网关 invoke 统计，不含技能包本地下载）"><Activity size={12} />{formatCount(skill.callCount)}</span>
                    <span className="flex items-center gap-1"><Clock size={12} />{formatLatency(skill.avgLatencyMs)}</span>
                    {skill.successRate > 0 && <span className="text-emerald-500">{skill.successRate}%</span>}
                    {skill.createTime && <span>{formatDateTime(skill.createTime)}</span>}
                  </div>
                  <div className="flex justify-end">
                    <button type="button" onClick={(e) => { e.stopPropagation(); handleOpenUse(skill); }} className={`${btnPrimary} px-3 py-1.5 text-xs`}>获取技能包</button>
                  </div>
                </div>
              </BentoCard>
            ))}
          </div>
        )}
        </div>
      </MarketLayout>

      {/* Detail + Reviews Modal */}
      <Modal open={!!detailSkill} onClose={() => setDetailSkill(null)} theme={theme} size="lg">
        {detailSkill && (
          <>
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0 ${pickColor(detailSkill.agentName)}`}>{(detailSkill.displayName || detailSkill.agentName).charAt(0)}</div>
              <div className="min-w-0">
                <h3 className={`text-lg font-bold truncate ${textPrimary(theme)}`}>{detailSkill.displayName}</h3>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-mono ${textMuted(theme)}`}>{detailSkill.agentName}</span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${TYPE_BADGE[detailSkill.agentType].cls}`}>{TYPE_BADGE[detailSkill.agentType].label}</span>
                </div>
              </div>
            </div>
            <div className="space-y-5">
              <p className={`text-sm leading-relaxed ${textSecondary(theme)}`}>{detailSkill.description || '暂无描述'}</p>
              <div className={`flex flex-wrap gap-3 text-xs ${textMuted(theme)}`}>
                <span>
                  创建者：{resolvePersonDisplay({ names: [detailSkill.createdByName], ids: [detailSkill.createdBy ?? undefined] })}
                </span>
                <span className="inline-flex items-center gap-0.5 tabular-nums">
                  <Star size={13} className="text-amber-500 shrink-0" aria-hidden />
                  目录评分 {detailSkill.ratingAvg != null ? detailSkill.ratingAvg.toFixed(1) : '—'}（{detailSkill.reviewCount ?? 0} 条）
                </span>
                <span className="flex items-center gap-1" title="目录展示热度（网关 invoke 统计，不含技能包本地下载）"><Activity size={13} /> {formatCount(detailSkill.callCount)} 热度</span>
                <span className="flex items-center gap-1"><Clock size={13} /> {formatLatency(detailSkill.avgLatencyMs)}</span>
                {detailSkill.successRate > 0 && <span className="text-emerald-500">{detailSkill.successRate}% 成功率</span>}
                {detailSkill.qualityScore > 0 && <span>评分: {detailSkill.qualityScore}</span>}
                <span className={`inline-flex items-center px-2 py-0.5 rounded-md font-medium ${SOURCE_BADGE[detailSkill.sourceType].cls}`}>{SOURCE_BADGE[detailSkill.sourceType].label}</span>
                {detailSkill.createTime && <span>创建: {formatDateTime(detailSkill.createTime)}</span>}
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  className={`${btnSecondary(theme)} disabled:opacity-50`}
                  disabled={favoriteLoading}
                  onClick={() => void handleFavorite(detailSkill)}
                >
                  {favoriteLoading ? <><Loader2 size={14} className="animate-spin" /> 收藏中…</> : <><Heart size={14} /> 收藏</>}
                </button>
              </div>
              <div>
                <h4 className={`font-bold text-base mb-4 flex items-center gap-2 ${textPrimary(theme)}`}><MessageSquare size={18} className="text-neutral-800" /> 评分与评论</h4>
                <ResourceReviewsSection targetType="skill" targetId={detailSkill.id} theme={theme} showMessage={showMessage} />
              </div>
            </div>
          </>
        )}
      </Modal>

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
              技能包通过目录解析（resolve）后下载制品；不在此走统一网关 invoke。远程可调用能力请作为 <strong className={textSecondary(theme)}>MCP</strong> 注册。
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
