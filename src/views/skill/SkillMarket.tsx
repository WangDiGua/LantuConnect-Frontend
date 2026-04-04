import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, Download, Heart, Loader2, Activity, Clock } from 'lucide-react';
import type { Theme, FontSize, ThemeColor } from '../../types';
import type { Skill } from '../../types/dto/skill';
import { useMarketList, useMarketTags, useMarketDetail, useMarketFavorite } from '../../hooks/market';
import { MarketLayout, MarketHeader, MarketSearchBar, MarketTagFilter, MarketEmptyState } from '../../components/market';
import { BentoCard } from '../../components/common/BentoCard';
import { Modal } from '../../components/common/Modal';
import { ResourceReviewsSection } from '../../components/business/ResourceReviewsSection';
import { GrantApplicationModal } from '../../components/business/GrantApplicationModal';
import { GatewayApiKeyInput } from '../../components/common/GatewayApiKeyInput';
import { usePersistedGatewayApiKey } from '../../hooks/usePersistedGatewayApiKey';
import { skillService } from '../../api/services/skill.service';
import { resourceCatalogService } from '../../api/services/resource-catalog.service';
import { mapInvokeFlowError } from '../../utils/invokeError';
import { fetchSkillPackBlobDownload, resolveSkillArtifactTarget } from '../../utils/skillArtifactDownload';
import { safeOpenHttpUrl } from '../../lib/windowNavigate';
import { ApiException } from '../../types/api';
import { btnPrimary, btnSecondary, textPrimary, textSecondary, textMuted, techBadge } from '../../utils/uiClasses';
import { formatDateTime } from '../../utils/formatDateTime';
import { buildPath } from '../../constants/consoleRoutes';

interface Props {
  theme: Theme;
  fontSize: FontSize;
  themeColor?: ThemeColor;
  showMessage?: (msg: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

const TYPE_BADGE: Record<string, { label: string; cls: string }> = {
  mcp: { label: 'MCP', cls: 'text-neutral-900 bg-neutral-900/10' },
  http_api: { label: 'HTTP API', cls: 'text-neutral-800 bg-neutral-800/10' },
  builtin: { label: '内置', cls: 'text-neutral-700 bg-neutral-700/10' },
};

const SOURCE_BADGE: Record<string, { label: string; cls: string }> = {
  internal: { label: '自研', cls: 'text-sky-600 bg-sky-500/10' },
  partner: { label: '合作方', cls: 'text-neutral-900 bg-neutral-900/10' },
  cloud: { label: '云服务', cls: 'text-cyan-600 bg-cyan-500/10' },
};

const ICON_COLORS = [
  'bg-neutral-900',
  'bg-neutral-800',
  'bg-neutral-700',
  'bg-stone-800',
  'bg-zinc-800',
  'bg-neutral-600',
  'bg-slate-800',
  'bg-neutral-950',
];

function pickColor(str: string): string {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
  return ICON_COLORS[Math.abs(h) % ICON_COLORS.length];
}

function formatLatency(ms: number): string {
  return ms >= 1000 ? (ms / 1000).toFixed(1) + 's' : ms + 'ms';
}

function formatCount(n: number): string {
  if (n >= 10000) return (n / 10000).toFixed(1) + '万';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
  return String(n);
}

export const SkillMarket: React.FC<Props> = ({ theme, fontSize: _fontSize, themeColor: _themeColor, showMessage }) => {
  const navigate = useNavigate();
  const isDark = theme === 'dark';
  const [gatewayApiKeyDraft, setGatewayApiKeyDraft] = usePersistedGatewayApiKey();

  const {
    items: skills,
    loading,
    error,
    keyword,
    setKeyword,
    refresh,
  } = useMarketList<Skill>({
    resourceType: 'skill',
    service: {
      list: async (params) => {
        const result = await skillService.list({
          ...params,
          status: 'published',
        } as any);
        return {
          list: result.list,
          total: result.total,
        };
      },
    },
    showMessage,
  });

  const { tags, activeTag, setActiveTag } = useMarketTags({
    resourceType: 'skill',
  });

  const {
    detailItem: detailSkill,
    setDetailItem: setDetailSkill,
  } = useMarketDetail<Skill>({
    items: skills,
    loading,
    getId: (skill) => skill.id,
    showMessage,
  });

  const [useSkill, setUseSkill] = useState<Skill | null>(null);
  const [useLoading, setUseLoading] = useState(false);
  const [useResult, setUseResult] = useState<string | null>(null);
  const [grantModalOpen, setGrantModalOpen] = useState(false);

  const favorite = useMarketFavorite({
    resourceType: 'skill',
    resourceId: detailSkill?.id ?? '',
    showMessage,
  });

  const filtered = useMemo(() => {
    let result = skills;
    if (activeTag) {
      result = result.filter((s) => s.tags?.includes(activeTag));
    }
    return result;
  }, [skills, activeTag]);

  const handleExecute = async () => {
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
        resolved = await resourceCatalogService.resolve(
          {
            resourceType: 'skill',
            resourceId: String(useSkill.id),
          },
          { headers: { 'X-Api-Key': apiKey } }
        );
      } catch (err) {
        if (err instanceof ApiException && err.code === 1009) {
          setUseResult(err.message || '请绑定有效的 X-Api-Key');
        } else if (err instanceof ApiException && (err.status === 401 || err.code === 1002)) {
          setUseResult('请先选择有效 API Key');
        } else if (err instanceof ApiException && (err.status === 403 || err.code === 1003)) {
          setUseResult('你暂无该资源使用权限，请先申请授权');
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
          setUseResult(`该技能为公开制品，已尝试打开直链。\n${target.url}`);
          return;
        }
        const safeName = `${(useSkill.displayName || useSkill.agentName || 'skill').replace(/[\\/:*?"<>|]+/g, '_')}.zip`;
        try {
          await fetchSkillPackBlobDownload(target.url, apiKey, safeName);
          setUseResult('已开始下载技能包。若被拦截，请检查浏览器下载权限。');
        } catch (e) {
          setUseResult(e instanceof Error ? e.message : '下载技能包失败');
        }
        return;
      }

      setUseResult(`解析返回类型：${resolved.invokeType ?? '未知'}。技能市场仅支持制品下载与目录信息。`);
    } catch (e) {
      setUseResult(`操作失败: ${e instanceof Error ? e.message : '未知错误'}`);
    } finally {
      setUseLoading(false);
    }
  };

  return (
    <MarketLayout theme={theme}>
      <MarketHeader
        theme={theme}
        icon={Zap}
        title="技能市场"
        tagline="浏览技能包目录并下载制品；网关不接受 skill 的 invoke，调用统计不含下载"
        actions={
          <button
            type="button"
            onClick={() => navigate(buildPath('user', 'skill-register'))}
            className={`${btnSecondary} shrink-0 px-3 py-2 text-xs font-semibold`}
          >
            发布技能（上传 / URL 导入）
          </button>
        }
      />

      <div className="mb-4">
        <MarketSearchBar
          theme={theme}
          value={keyword}
          onChange={setKeyword}
          placeholder="搜索技能…"
        />
      </div>

      <MarketTagFilter theme={theme} tags={tags} activeTag={activeTag} onTagChange={setActiveTag} />

      {loading ? (
        <div className="text-center py-20">加载中...</div>
      ) : error ? (
        <div className="text-center py-20">
          <p className={`text-lg font-medium ${textMuted(theme)}`}>加载失败</p>
          <button onClick={refresh} className={btnPrimary}>重试</button>
        </div>
      ) : filtered.length === 0 ? (
        <MarketEmptyState theme={theme} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((skill) => (
            <BentoCard
              key={skill.id}
              theme={theme}
              hover
              glow="indigo"
              padding="md"
              onClick={() => setDetailSkill(skill)}
              className="flex flex-col h-full !rounded-[20px]"
            >
              <div className="flex items-start gap-3 mb-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0 ${pickColor(
                    skill.agentName
                  )}`}
                >
                  {(skill.displayName || skill.agentName).charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className={`font-semibold truncate ${textPrimary(theme)}`}>{skill.displayName}</h3>
                  <p className={`text-xs truncate ${textMuted(theme)}`}>{skill.agentName}</p>
                </div>
              </div>
              <p className={`text-sm leading-relaxed mb-3 line-clamp-2 ${textSecondary(theme)}`}>
                {skill.description || '暂无描述'}
              </p>
              <div className="flex flex-wrap gap-1.5 mb-3">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${TYPE_BADGE[skill.agentType]?.cls || ''}`}>
                  {TYPE_BADGE[skill.agentType]?.label || skill.agentType}
                </span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${SOURCE_BADGE[skill.sourceType]?.cls || ''}`}>
                  {SOURCE_BADGE[skill.sourceType]?.label || skill.sourceType}
                </span>
                {(skill.tags ?? []).slice(0, 4).map((t) => (
                  <span key={t} className={techBadge(theme)}>
                    {t}
                  </span>
                ))}
              </div>
              <div className={`pt-3 border-t mt-auto space-y-3 ${isDark ? 'border-white/[0.08]' : 'border-slate-200/40'}`}>
                <div className={`flex items-center gap-3 text-xs ${textMuted(theme)}`}>
                  <span className="flex items-center gap-1">
                    <Activity size={12} />
                    {formatCount(skill.callCount)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock size={12} />
                    {formatLatency(skill.avgLatencyMs)}
                  </span>
                  {skill.successRate > 0 && <span className="text-emerald-500">{skill.successRate}%</span>}
                  {skill.createTime && <span>{formatDateTime(skill.createTime)}</span>}
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setUseSkill(skill);
                      setUseResult(null);
                    }}
                    className={`${btnPrimary} px-3 py-1.5 text-xs`}
                  >
                    获取技能包
                  </button>
                </div>
              </div>
            </BentoCard>
          ))}
        </div>
      )}

      <Modal
        open={!!detailSkill}
        onClose={() => setDetailSkill(null)}
        theme={theme}
        size="lg"
      >
        {detailSkill && (
          <>
            <div className="flex items-center gap-3 mb-4">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0 ${pickColor(
                  detailSkill.agentName
                )}`}
              >
                {(detailSkill.displayName || detailSkill.agentName).charAt(0)}
              </div>
              <div className="min-w-0">
                <h3 className={`text-lg font-bold truncate ${textPrimary(theme)}`}>{detailSkill.displayName}</h3>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-mono ${textMuted(theme)}`}>{detailSkill.agentName}</span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${TYPE_BADGE[detailSkill.agentType]?.cls || ''}`}>
                    {TYPE_BADGE[detailSkill.agentType]?.label || detailSkill.agentType}
                  </span>
                </div>
              </div>
            </div>
            <div className="space-y-5">
              <p className={`text-sm leading-relaxed ${textSecondary(theme)}`}>{detailSkill.description || '暂无描述'}</p>
              <div className={`flex flex-wrap gap-3 text-xs ${textMuted(theme)}`}>
                <span className="flex items-center gap-1">
                  <Activity size={13} /> {formatCount(detailSkill.callCount)} 热度
                </span>
                <span className="flex items-center gap-1">
                  <Clock size={13} /> {formatLatency(detailSkill.avgLatencyMs)}
                </span>
                {detailSkill.successRate > 0 && <span className="text-emerald-500">{detailSkill.successRate}% 成功率</span>}
                {detailSkill.qualityScore > 0 && <span>评分: {detailSkill.qualityScore}</span>}
                <span className={`inline-flex items-center px-2 py-0.5 rounded-md font-medium ${SOURCE_BADGE[detailSkill.sourceType]?.cls || ''}`}>
                  {SOURCE_BADGE[detailSkill.sourceType]?.label || detailSkill.sourceType}
                </span>
                {detailSkill.createTime && <span>创建: {formatDateTime(detailSkill.createTime)}</span>}
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  className={`${btnSecondary(theme)} disabled:opacity-50`}
                  disabled={favorite.loading}
                  onClick={() => void favorite.toggleFavorite()}
                >
                  {favorite.loading ? (
                    <>
                      <Loader2 size={14} className="animate-spin" /> 收藏中…
                    </>
                  ) : (
                    <>
                      <Heart size={14} className={favorite.isFavorited ? 'fill-current' : ''} />{' '}
                      {favorite.isFavorited ? '已收藏' : '收藏'}
                    </>
                  )}
                </button>
              </div>
              <div>
                <h4 className={`font-bold text-base mb-4 flex items-center gap-2 ${textPrimary(theme)}`}>
                  评论
                </h4>
                <ResourceReviewsSection targetType="skill" targetId={detailSkill.id} theme={theme} showMessage={showMessage} />
              </div>
            </div>
          </>
        )}
      </Modal>

      <Modal
        open={!!useSkill}
        onClose={() => {
          setUseSkill(null);
          setGrantModalOpen(false);
        }}
        title={useSkill ? `获取技能包 — ${useSkill.displayName}` : ''}
        theme={theme}
        size="md"
        footer={
          <>
            <button type="button" className={btnSecondary(theme)} onClick={() => setUseSkill(null)}>
              关闭
            </button>
            <button type="button" className={btnSecondary(theme)} onClick={() => setGrantModalOpen(true)}>
              申请 resolve 授权
            </button>
            <button
              type="button"
              className={`${btnPrimary} disabled:opacity-50`}
              disabled={useLoading}
              onClick={handleExecute}
            >
              {useLoading ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> 处理中…
                </>
              ) : (
                <>
                  <Download size={14} /> 解析并下载
                </>
              )}
            </button>
          </>
        }
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
              技能包通过目录解析（resolve）后下载制品；不在此走统一网关 invoke。
            </p>
            <p className={`text-xs ${textMuted(theme)}`}>{useSkill.description || '暂无描述'}</p>
            {useResult && (
              <div
                className={`rounded-xl p-4 text-sm font-medium whitespace-pre-wrap ${
                  isDark
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}
              >
                {useResult}
              </div>
            )}
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
    </MarketLayout>
  );
};
