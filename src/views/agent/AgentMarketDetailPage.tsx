import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Heart, Star } from 'lucide-react';

import type { Theme, FontSize, ThemeColor } from '../../types';
import type { Agent } from '../../types/dto/agent';
import type { ResourceBindingSummaryVO } from '../../types/dto/catalog';
import {
  MarketDetailSectionCard,
  MarketDetailSidebarCard,
  MarketDetailStatusNotice,
  ResourceMarketDetailShell,
} from '../../components/market';
import { AgentReviews } from './AgentReviews';
import { buildPath } from '../../constants/consoleRoutes';
import { agentService } from '../../api/services/agent.service';
import { resourceCatalogService } from '../../api/services/resource-catalog.service';
import { BindingClosureSection } from '../../components/business/BindingClosureSection';
import { PageError } from '../../components/common/PageError';
import { PageSkeleton } from '../../components/common/PageSkeleton';
import {
  btnPrimary,
  btnSecondary,
  statusBadgeClass,
  statusDot,
  statusLabel,
  techBadge,
  textMuted,
  textPrimary,
  textSecondary,
} from '../../utils/uiClasses';
import { MarkdownView } from '../../components/common/MarkdownView';
import { AgentQuickTestPanel } from '../../components/market/testing/AgentQuickTestPanel';

export interface AgentMarketDetailPageProps {
  resourceId: string;
  theme: Theme;
  fontSize: FontSize;
  themeColor: ThemeColor;
  showMessage: (content: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
  onNavigateToList: () => void;
}

type AgentDetailTab = 'service' | 'testing' | 'capability' | 'reviews';

function agentTrailingIcon(agent: Agent, isDark: boolean): React.ReactNode {
  const raw = agent.icon?.trim() || '';
  if (/^https?:\/\//i.test(raw)) {
    return (
      <img src={raw} alt="" className="h-14 w-14 shrink-0 rounded-2xl object-cover ring-1 ring-black/10" loading="lazy" />
    );
  }
  const emoji = raw || '🤖';
  return (
    <div
      className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-3xl leading-none ${
        isDark ? 'bg-white/[0.06]' : 'bg-slate-100'
      }`}
    >
      {emoji}
    </div>
  );
}

export const AgentMarketDetailPage: React.FC<AgentMarketDetailPageProps> = ({
  resourceId,
  theme,
  fontSize,
  themeColor: _themeColor,
  showMessage,
  onNavigateToList,
}) => {
  const navigate = useNavigate();
  const isDark = theme === 'dark';
  const [agent, setAgent] = useState<Agent | null>(null);
  const [bindingClosure, setBindingClosure] = useState<ResourceBindingSummaryVO[] | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [tab, setTab] = useState<AgentDetailTab>('service');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [adding, setAdding] = useState(false);

  const workspaceKey = 'lantu_workspace_agents';
  const [workspaceAgents, setWorkspaceAgents] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(workspaceKey);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const isInWorkspace = useCallback((id: string) => workspaceAgents.includes(id), [workspaceAgents]);

  const load = useCallback(async () => {
    const id = Number(resourceId);
    if (!Number.isFinite(id)) {
      setError(new Error('无效的智能体 ID'));
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [data, detail] = await Promise.all([
        agentService.getById(id),
        resourceCatalogService.getByTypeAndId('agent', String(id), 'closure').catch(() => null),
      ]);
      setAgent(data);
      setBindingClosure(detail?.bindingClosure);
    } catch (reason) {
      setAgent(null);
      setBindingClosure(undefined);
      setError(reason instanceof Error ? reason : new Error('加载失败'));
    } finally {
      setLoading(false);
    }
  }, [resourceId]);

  useEffect(() => {
    void load();
  }, [load]);

  const author = useMemo(() => {
    if (!agent) return '';
    return (
      agent.createdByName?.trim()
      || (agent.createdBy != null ? `用户 #${agent.createdBy}` : '')
      || (agent.sourceType === 'internal' ? '校内团队' : agent.sourceType === 'partner' ? '合作伙伴' : '云服务')
    );
  }, [agent]);

  const sourceLabel = useMemo(() => {
    if (!agent) return '未知来源';
    if (agent.sourceType === 'internal') return '校内团队';
    if (agent.sourceType === 'partner') return '合作伙伴';
    return '云服务';
  }, [agent]);

  const ratingStr = useMemo(() => {
    if (!agent) return '—';
    if (agent.ratingAvg != null && Number.isFinite(agent.ratingAvg)) return agent.ratingAvg.toFixed(1);
    if (agent.qualityScore > 0) return (agent.qualityScore / 20).toFixed(1);
    return '—';
  }, [agent]);

  const usageLabel = useMemo(() => {
    if (!agent) return '0';
    return agent.callCount > 1000 ? `${(agent.callCount / 1000).toFixed(1)}K` : String(agent.callCount);
  }, [agent]);

  const tags = useMemo(() => {
    if (!agent) return [] as string[];
    return agent.tags?.length
      ? [...agent.tags]
      : agent.categoryName
        ? [agent.categoryName, agent.agentType]
        : [agent.agentType];
  }, [agent]);

  const registrationProtocol = useMemo(() => {
    if (!agent) return '';
    const raw = agent.specJson?.registrationProtocol;
    return typeof raw === 'string' ? raw.trim().toLowerCase() : '';
  }, [agent]);

  const modelAlias = useMemo(() => {
    if (!agent) return '';
    const raw = agent.specJson?.modelAlias;
    if (typeof raw === 'string' && raw.trim()) return raw.trim();
    return agent.agentName?.trim() || String(agent.id);
  }, [agent]);

  const upstreamEndpoint = useMemo(() => {
    if (!agent) return '';
    const raw = agent.endpoint || agent.specJson?.upstreamEndpoint || agent.specJson?.endpoint;
    return typeof raw === 'string' ? raw.trim() : '';
  }, [agent]);

  const addToWorkspace = async () => {
    if (!agent || isInWorkspace(String(agent.id))) return;
    setAdding(true);
    try {
      const { userActivityService } = await import('../../api/services/user-activity.service');
      await userActivityService.addFavorite('agent', Number(agent.id));
      setWorkspaceAgents((previous) => {
        const next = [...previous, String(agent.id)];
        try {
          localStorage.setItem(workspaceKey, JSON.stringify(next));
        } catch {
          // ignore
        }
        return next;
      });
      showMessage(`已收藏「${agent.displayName}」`, 'success');
      setConfirmOpen(false);
    } catch (reason) {
      showMessage(reason instanceof Error ? reason.message : '收藏失败', 'error');
    } finally {
      setAdding(false);
    }
  };

  if (loading) {
    return <PageSkeleton type="detail" />;
  }
  if (error || !agent) {
    return (
      <div className="px-4 py-8">
        <PageError error={error ?? new Error('未找到智能体')} onRetry={() => void load()} retryLabel="重试" />
        <button type="button" className={`mt-4 ${btnSecondary(theme)}`} onClick={onNavigateToList}>
          返回市场
        </button>
      </div>
    );
  }

  const idStr = String(agent.id);
  const reviewCount = Math.max(0, Math.floor(Number(agent.reviewCount ?? 0)) || 0);
  const successRateLabel = Number.isFinite(agent.successRate) && agent.successRate > 0 ? `${agent.successRate}%` : '—';
  const latencyLabel = Number.isFinite(agent.avgLatencyMs) && agent.avgLatencyMs > 0 ? `${agent.avgLatencyMs} ms` : '—';
  const testingNotice =
    tab === 'service'
      ? {
          title: '服务详情聚焦业务价值与使用边界',
          description: '这里保留对外说明、标签、作者和市场指标，帮助你先判断这个智能体是否适合当前场景。',
        }
      : tab === 'testing'
        ? {
            title: '试用测试集中在主内容区完成',
            description: '快速试用和高级协议调试都在同一页，避免信息散落在右侧栏里来回切换。',
          }
        : tab === 'capability'
          ? {
              title: '能力说明聚焦接入与运行信息',
              description: '这里集中展示系统提示词、注册协议、模型别名、上游地址和并发配置，便于做接入评估。',
            }
          : {
              title: '评分评论独立成页',
              description: '把市场反馈单独抽离，避免和服务介绍混写，阅读路径会更清晰。',
            };

  return (
    <>
      <ResourceMarketDetailShell
        theme={theme}
        onBack={onNavigateToList}
        backLabel="返回智能体市场"
        titleBlock={(
          <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start">
            {agentTrailingIcon(agent, isDark)}
            <div className="min-w-0 flex-1 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className={`min-w-0 text-2xl font-bold tracking-tight sm:text-3xl ${textPrimary(theme)}`}>{agent.displayName}</h1>
                <span className={statusBadgeClass(agent.status ?? 'unknown', theme)}>
                  <span className={statusDot(agent.status ?? 'unknown')} />
                  {statusLabel(agent.status)}
                </span>
              </div>
              <div className={`flex flex-wrap items-center gap-2 text-xs ${textMuted(theme)}`}>
                <span>{author || '未知作者'}</span>
                <span className="font-mono">@{agent.agentName || agent.id}</span>
                <span className="inline-flex items-center gap-0.5">
                  <Star size={12} className="fill-amber-500 text-amber-500" aria-hidden />
                  {ratingStr}
                </span>
                <span>{reviewCount} 条评论</span>
                <span>{usageLabel} 次调用</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {tags.map((tag) => (
                  <span key={tag} className={techBadge(theme)}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
        headerActions={(
          <button
            type="button"
            className={`${btnPrimary} min-h-11 ${isInWorkspace(idStr) ? 'cursor-not-allowed opacity-50' : ''}`}
            disabled={isInWorkspace(idStr)}
            onClick={() => !isInWorkspace(idStr) && setConfirmOpen(true)}
          >
            <Heart size={16} className={`shrink-0 ${isInWorkspace(idStr) ? 'fill-current' : ''}`} aria-hidden />
            {isInWorkspace(idStr) ? '已收藏' : '收藏'}
          </button>
        )}
        tabs={[
          { id: 'service', label: '服务详情' },
          { id: 'testing', label: '试用测试' },
          { id: 'capability', label: '能力说明' },
          { id: 'reviews', label: '评分评论', badge: reviewCount },
        ]}
        activeTabId={tab}
        onTabChange={(id) => setTab(id as AgentDetailTab)}
        mainColumn={(
          <div className="space-y-5">
            <MarketDetailStatusNotice theme={theme} title={testingNotice.title} description={testingNotice.description} />

            {tab === 'service' ? (
              <>
                <MarketDetailSectionCard
                  theme={theme}
                  title="服务详情"
                  description="这里集中展示发布者整理的智能体介绍、能力边界和业务背景，阅读路径和 MCP 服务详情保持一致。"
                >
                  {agent.serviceDetailMd?.trim() ? (
                    <MarkdownView value={agent.serviceDetailMd} className="text-sm" />
                  ) : (
                    <p className={`text-sm leading-relaxed ${textMuted(theme)}`}>
                      暂无详细介绍。资源所有方可以在资源注册页补充 Markdown 版的服务说明，用来说明用途、适用场景、限制条件和示例输入。
                    </p>
                  )}
                  <div className={`mt-4 border-t pt-4 text-sm leading-relaxed ${textSecondary(theme)}`}>
                    {agent.description || '暂无补充描述。'}
                  </div>
                </MarketDetailSectionCard>

                <MarketDetailSectionCard
                  theme={theme}
                  title="资源概览"
                  description="把市场指标、运行画像和基础接入信息拆到单独区块里，避免和服务正文混成一整片长文本。"
                >
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <div className={`rounded-2xl border px-4 py-3 ${isDark ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-slate-50'}`}>
                      <div className={`text-xs ${textMuted(theme)}`}>资源编码</div>
                      <div className={`mt-1 font-mono text-sm ${textPrimary(theme)}`}>{agent.agentName || agent.id}</div>
                    </div>
                    <div className={`rounded-2xl border px-4 py-3 ${isDark ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-slate-50'}`}>
                      <div className={`text-xs ${textMuted(theme)}`}>来源</div>
                      <div className={`mt-1 text-sm font-semibold ${textPrimary(theme)}`}>{sourceLabel}</div>
                    </div>
                    <div className={`rounded-2xl border px-4 py-3 ${isDark ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-slate-50'}`}>
                      <div className={`text-xs ${textMuted(theme)}`}>平均延迟</div>
                      <div className={`mt-1 text-sm font-semibold ${textPrimary(theme)}`}>{latencyLabel}</div>
                    </div>
                    <div className={`rounded-2xl border px-4 py-3 ${isDark ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-slate-50'}`}>
                      <div className={`text-xs ${textMuted(theme)}`}>成功率</div>
                      <div className={`mt-1 text-sm font-semibold ${textPrimary(theme)}`}>{successRateLabel}</div>
                    </div>
                  </div>

                  <dl className="mt-5 grid gap-3 sm:grid-cols-2">
                    <div>
                      <dt className={`text-xs ${textMuted(theme)}`}>智能体类型</dt>
                      <dd className={`mt-1 text-sm ${textPrimary(theme)}`}>{agent.agentType}</dd>
                    </div>
                    <div>
                      <dt className={`text-xs ${textMuted(theme)}`}>运行模式</dt>
                      <dd className={`mt-1 text-sm ${textPrimary(theme)}`}>{agent.mode}</dd>
                    </div>
                    <div>
                      <dt className={`text-xs ${textMuted(theme)}`}>质量分</dt>
                      <dd className={`mt-1 text-sm ${textPrimary(theme)}`}>{agent.qualityScore > 0 ? agent.qualityScore : '—'}</dd>
                    </div>
                    <div>
                      <dt className={`text-xs ${textMuted(theme)}`}>最近更新时间</dt>
                      <dd className={`mt-1 text-sm ${textPrimary(theme)}`}>{agent.updateTime || '—'}</dd>
                    </div>
                  </dl>
                </MarketDetailSectionCard>
              </>
            ) : null}

            {tab === 'testing' ? (
              <AgentQuickTestPanel theme={theme} agent={agent} showMessage={showMessage} />
            ) : null}

            {tab === 'capability' ? (
              <>
                <MarketDetailSectionCard
                  theme={theme}
                  title="能力说明"
                  description="先看提示词和能力边界，再看接入参数和模型别名，避免把业务介绍和接入说明混在同一块长文里。"
                >
                  {agent.systemPrompt?.trim() ? (
                    <pre
                      className={`overflow-auto whitespace-pre-wrap rounded-2xl border px-4 py-3 text-sm leading-relaxed ${
                        isDark ? 'border-white/10 bg-black/20 text-slate-100' : 'border-slate-200 bg-slate-50 text-slate-800'
                      }`}
                    >
                      {agent.systemPrompt}
                    </pre>
                  ) : (
                    <p className={`text-sm leading-relaxed ${textMuted(theme)}`}>
                      当前资源没有公开的系统提示词。通常这意味着平台只对外开放调用能力，而不在市场页透出完整 Prompt。
                    </p>
                  )}
                </MarketDetailSectionCard>

                <MarketDetailSectionCard
                  theme={theme}
                  title="运行信息"
                  description="这些字段用于做接入评估：注册协议、模型别名、上游地址、并发与步数约束都会直接影响调试方式。"
                >
                  <dl className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <dt className={`text-xs ${textMuted(theme)}`}>注册协议</dt>
                      <dd className={`mt-1 text-sm font-medium ${textPrimary(theme)}`}>{registrationProtocol || '未声明'}</dd>
                    </div>
                    <div>
                      <dt className={`text-xs ${textMuted(theme)}`}>模型别名</dt>
                      <dd className={`mt-1 text-sm font-medium ${textPrimary(theme)}`}>{modelAlias || '—'}</dd>
                    </div>
                    <div>
                      <dt className={`text-xs ${textMuted(theme)}`}>上游地址</dt>
                      <dd className={`mt-1 break-all text-sm font-medium ${textPrimary(theme)}`}>{upstreamEndpoint || '—'}</dd>
                    </div>
                    <div>
                      <dt className={`text-xs ${textMuted(theme)}`}>调用模式</dt>
                      <dd className={`mt-1 text-sm font-medium ${textPrimary(theme)}`}>{agent.mode || '—'}</dd>
                    </div>
                    <div>
                      <dt className={`text-xs ${textMuted(theme)}`}>最大并发</dt>
                      <dd className={`mt-1 text-sm font-medium ${textPrimary(theme)}`}>{agent.maxConcurrency || '—'}</dd>
                    </div>
                    <div>
                      <dt className={`text-xs ${textMuted(theme)}`}>最大步骤</dt>
                      <dd className={`mt-1 text-sm font-medium ${textPrimary(theme)}`}>{agent.maxSteps ?? '—'}</dd>
                    </div>
                    <div>
                      <dt className={`text-xs ${textMuted(theme)}`}>温度</dt>
                      <dd className={`mt-1 text-sm font-medium ${textPrimary(theme)}`}>{agent.temperature ?? '—'}</dd>
                    </div>
                    <div>
                      <dt className={`text-xs ${textMuted(theme)}`}>调用类型</dt>
                      <dd className={`mt-1 text-sm font-medium ${textPrimary(theme)}`}>{agent.invokeType || '统一 invoke'}</dd>
                    </div>
                  </dl>
                </MarketDetailSectionCard>
              </>
            ) : null}

            {tab === 'reviews' ? (
              <MarketDetailSectionCard
                theme={theme}
                title="评分评论"
                description="真实评分和评论单独成页，避免和说明文字挤在一起，让市场反馈可以独立阅读。"
              >
                <AgentReviews agentId={Number(agent.id)} theme={theme} fontSize={fontSize} showMessage={showMessage} />
              </MarketDetailSectionCard>
            ) : null}
          </div>
        )}
        sidebarColumn={(
          <div className="space-y-4">
            <MarketDetailSidebarCard
              theme={theme}
              title="资源摘要"
              description="右侧栏只保留静态信息，帮助你快速确认资源身份和接入线索。"
            >
              <dl className="space-y-3 text-sm">
                <div>
                  <dt className={`text-xs ${textMuted(theme)}`}>资源编码</dt>
                  <dd className={`mt-1 font-mono ${textPrimary(theme)}`}>{agent.agentName || idStr}</dd>
                </div>
                <div>
                  <dt className={`text-xs ${textMuted(theme)}`}>作者</dt>
                  <dd className={`mt-1 ${textPrimary(theme)}`}>{author || '—'}</dd>
                </div>
                <div>
                  <dt className={`text-xs ${textMuted(theme)}`}>智能体类型</dt>
                  <dd className={`mt-1 ${textPrimary(theme)}`}>{agent.agentType}</dd>
                </div>
                <div>
                  <dt className={`text-xs ${textMuted(theme)}`}>描述</dt>
                  <dd className={`mt-1 leading-relaxed ${textSecondary(theme)}`}>{agent.description || '暂无描述'}</dd>
                </div>
              </dl>
            </MarketDetailSidebarCard>

            <BindingClosureSection theme={theme} currentResourceId={idStr} items={bindingClosure} />

            <MarketDetailSidebarCard
              theme={theme}
              title="调用方式说明"
              description="统一 invoke 适合快速试用，协议原生适合排查注册协议和上游兼容性。"
              className={isDark ? 'border-sky-500/20 bg-sky-500/[0.08]' : 'border-sky-200 bg-sky-50'}
            >
              <p className={`text-xs leading-relaxed ${isDark ? 'text-sky-100/85' : 'text-sky-950/80'}`}>
                右侧栏不再承载交互表单。需要试用或调试时，直接切到「试用测试」主区即可完成快速试用、统一 invoke 和协议原生调试。
              </p>
              <button
                type="button"
                className={`mt-3 inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold ${
                  isDark ? 'bg-white/10 text-sky-100 hover:bg-white/[0.14]' : 'bg-white text-sky-900 hover:bg-sky-100'
                }`}
                onClick={() => navigate(buildPath('user', 'developer-docs'))}
              >
                <FileText size={14} aria-hidden />
                查看接入与 API 文档
              </button>
            </MarketDetailSidebarCard>
          </div>
        )}
      />

      {confirmOpen ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div
            className={`max-w-md rounded-2xl border p-6 shadow-[var(--shadow-modal)] ${isDark ? 'border-white/10 bg-lantu-card' : 'border-slate-200 bg-white'}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-add-title"
          >
            <h2 id="confirm-add-title" className={`text-lg font-bold ${textPrimary(theme)}`}>
              确认收藏
            </h2>
            <p className={`mt-2 text-sm ${textSecondary(theme)}`}>
              确认将「{agent.displayName}」加入我的收藏吗？
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" className={btnSecondary(theme)} onClick={() => setConfirmOpen(false)}>
                取消
              </button>
              <button type="button" className={`${btnPrimary} disabled:opacity-50`} disabled={adding} onClick={() => void addToWorkspace()}>
                {adding ? '处理中...' : '确认收藏'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
};
