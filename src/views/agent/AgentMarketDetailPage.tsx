import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Rocket, Star, Heart } from 'lucide-react';
import type { Theme, FontSize, ThemeColor } from '../../types';
import { ResourceMarketDetailShell } from '../../components/market';
import { AgentReviews } from './AgentReviews';
import { GrantApplicationModal } from '../../components/business/GrantApplicationModal';
import { buildPath } from '../../constants/consoleRoutes';
import { agentService } from '../../api/services/agent.service';
import type { Agent } from '../../types/dto/agent';
import { PageError } from '../../components/common/PageError';
import { PageSkeleton } from '../../components/common/PageSkeleton';
import { btnPrimary, btnSecondary, textPrimary, textSecondary, textMuted, techBadge } from '../../utils/uiClasses';

export interface AgentMarketDetailPageProps {
  resourceId: string;
  theme: Theme;
  fontSize: FontSize;
  themeColor: ThemeColor;
  showMessage: (content: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
  onNavigateToList: () => void;
}

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [tab, setTab] = useState<'overview' | 'reviews'>('overview');
  const [grantOpen, setGrantOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [adding, setAdding] = useState(false);

  const WS_KEY = 'lantu_workspace_agents';
  const [workspaceAgents, setWorkspaceAgents] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(WS_KEY);
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
      const data = await agentService.getById(id);
      setAgent(data);
    } catch (e) {
      setAgent(null);
      setError(e instanceof Error ? e : new Error('加载失败'));
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

  const ratingStr = useMemo(() => {
    if (!agent) return '—';
    if (agent.ratingAvg != null && Number.isFinite(agent.ratingAvg)) return agent.ratingAvg.toFixed(1);
    if (agent.qualityScore > 0) return (agent.qualityScore / 20).toFixed(1);
    return '—';
  }, [agent]);

  const installsLabel = useMemo(() => {
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

  const addToWorkspace = async () => {
    if (!agent || isInWorkspace(String(agent.id))) return;
    setAdding(true);
    try {
      const { userActivityService } = await import('../../api/services/user-activity.service');
      await userActivityService.addFavorite('agent', Number(agent.id));
      setWorkspaceAgents((prev) => [...prev, String(agent.id)]);
      try {
        localStorage.setItem(WS_KEY, JSON.stringify([...workspaceAgents, String(agent.id)]));
      } catch {}
      showMessage(`已将「${agent.displayName}」添加到工作区`, 'success');
      setConfirmOpen(false);
    } catch (e) {
      showMessage(e instanceof Error ? e.message : '添加失败', 'error');
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

  return (
    <>
      <ResourceMarketDetailShell
        theme={theme}
        onBack={onNavigateToList}
        backLabel="返回智能体市场"
        titleBlock={(
          <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start">
            {agentTrailingIcon(agent, isDark)}
            <div className="min-w-0 flex-1 space-y-2">
              <h1 className={`text-2xl font-bold tracking-tight sm:text-3xl ${textPrimary(theme)}`}>{agent.displayName}</h1>
              <div className={`flex flex-wrap items-center gap-2 text-xs ${textMuted(theme)}`}>
                <span>{author}</span>
                <span className="inline-flex items-center gap-0.5">
                  <Star size={12} className="fill-amber-500 text-amber-500" aria-hidden />
                  {ratingStr}
                </span>
                <span>{Math.max(0, Math.floor(Number(agent.reviewCount ?? 0)) || 0)} 条评价</span>
                <span>{installsLabel} 次安装</span>
              </div>
              <p className={`text-sm leading-relaxed ${textSecondary(theme)}`}>{agent.description}</p>
              <div className="flex flex-wrap gap-1.5">
                {tags.map((t) => (
                  <span key={t} className={techBadge(theme)}>
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
        headerActions={(
          <>
            <button type="button" className={`${btnSecondary(theme)} min-h-11`} onClick={() => setGrantOpen(true)}>
              申请授权
            </button>
            <button
              type="button"
              className={`${btnPrimary} min-h-11 ${isInWorkspace(idStr) ? 'cursor-not-allowed opacity-50' : ''}`}
              disabled={isInWorkspace(idStr)}
              onClick={() => !isInWorkspace(idStr) && setConfirmOpen(true)}
            >
              <Rocket size={16} className="shrink-0" aria-hidden />
              {isInWorkspace(idStr) ? '已添加' : '一键部署'}
            </button>
          </>
        )}
        tabs={[
          { id: 'overview', label: '智能体详情' },
          { id: 'reviews', label: '评分评论', badge: Math.max(0, Math.floor(Number(agent.reviewCount ?? 0)) || 0) },
        ]}
        activeTabId={tab}
        onTabChange={(id) => setTab(id as 'overview' | 'reviews')}
        mainColumn={(
          <div
            className={`rounded-[28px] border p-6 shadow-[0_8px_24px_-4px_rgba(0,0,0,0.02)] ${
              isDark ? 'border-white/10 bg-lantu-elevated' : 'border-transparent bg-white'
            }`}
          >
            {tab === 'overview' ? (
              <div className="space-y-4">
                <p className={`text-sm leading-relaxed ${textSecondary(theme)}`}>
                  {agent.systemPrompt
                    ? (
                      <>
                        <span className={`font-semibold ${textPrimary(theme)}`}>系统提示（节选）</span>
                        <span className="mt-2 block whitespace-pre-wrap">{agent.systemPrompt}</span>
                      </>
                    )
                    : '该智能体未公开系统提示；接入与调用说明见「申请授权」或 API 文档。'}
                </p>
              </div>
            ) : (
              <AgentReviews agentId={Number(agent.id)} theme={theme} fontSize={fontSize} showMessage={showMessage} />
            )}
          </div>
        )}
        sidebarColumn={(
          <div
            className={`space-y-4 rounded-[28px] border p-5 shadow-[0_8px_24px_-4px_rgba(0,0,0,0.02)] ${
              isDark ? 'border-white/10 bg-lantu-elevated' : 'border-transparent bg-white'
            }`}
          >
            <h3 className={`text-sm font-bold ${textPrimary(theme)}`}>快捷操作</h3>
            <p className={`text-xs leading-relaxed ${textMuted(theme)}`}>
              试用智能体须具备有效 X-Api-Key 与正确授权范围；跨 owner 时尚需 Grant 或符合 accessPolicy。
            </p>
            <button
              type="button"
              className={`${btnSecondary(theme)} inline-flex w-full min-h-11 items-center justify-center gap-2`}
              onClick={() => navigate(buildPath('user', 'my-favorites'))}
            >
              <Heart size={14} aria-hidden />
              我的收藏
            </button>
            <button
              type="button"
              className={`${btnPrimary} inline-flex w-full min-h-11 items-center justify-center`}
              onClick={() => navigate(buildPath('user', 'api-docs'))}
            >
              打开 API 文档
            </button>
          </div>
        )}
      />

      <GrantApplicationModal
        open={grantOpen}
        onClose={() => setGrantOpen(false)}
        theme={theme}
        resourceType="agent"
        resourceId={idStr}
        resourceName={agent.displayName}
        showMessage={showMessage}
      />

      {confirmOpen ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div
            className={`max-w-md rounded-2xl border p-6 shadow-xl ${isDark ? 'border-white/10 bg-lantu-card' : 'border-slate-200 bg-white'}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-add-title"
          >
            <h2 id="confirm-add-title" className={`text-lg font-bold ${textPrimary(theme)}`}>
              确认添加
            </h2>
            <p className={`mt-2 text-sm ${textSecondary(theme)}`}>
              确认将「{agent.displayName}」添加到工作区？
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" className={btnSecondary(theme)} onClick={() => setConfirmOpen(false)}>
                取消
              </button>
              <button type="button" className={`${btnPrimary} disabled:opacity-50`} disabled={adding} onClick={() => void addToWorkspace()}>
                {adding ? '添加中…' : '确认添加'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
};
