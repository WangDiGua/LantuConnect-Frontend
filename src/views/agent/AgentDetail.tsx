import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Settings, FileText, Play, Edit2, Trash2,
  CheckCircle2, Clock, BarChart3, ShieldCheck, Code2, Globe, Activity,
  Zap, Star, Heart, TrendingUp,
} from 'lucide-react';
import { Theme, FontSize } from '../../types';
import { useAgent, useDeleteAgent } from '../../hooks/queries/useAgent';
import { useMessage } from '../../components/common/Message';
import { resourceCatalogService } from '../../api/services/resource-catalog.service';
import type { ResourceBindingSummaryVO } from '../../types/dto/catalog';
import { BindingClosureSection } from '../../components/business/BindingClosureSection';
import { invokeService } from '../../api/services/invoke.service';
import { buildPath } from '../../constants/consoleRoutes';
import type { ResourceStatsVO } from '../../types/dto/explore';
import { PageSkeleton } from '../../components/common/PageSkeleton';
import { PageError } from '../../components/common/PageError';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { DetailLayout } from '../../components/layout/PageLayouts';
import {
  canvasBodyBg,
  mainScrollCompositorClass, bentoCard, btnGhost, btnDanger,
  textPrimary, textSecondary, textMuted,
  statusBadgeClass, statusDot, statusLabel,
  contentMaxWidth, contentPaddingX,
} from '../../utils/uiClasses';
import type { DomainStatus } from '../../utils/uiClasses';
import { formatDateTime } from '../../utils/formatDateTime';
import { safeOpenHttpUrl } from '../../lib/windowNavigate';

interface AgentDetailProps { agentId: string; theme: Theme; fontSize: FontSize; onBack: () => void; }

const AGENT_TYPE_LABEL: Record<string, string> = { mcp: 'MCP 协议', http_api: 'HTTP API', builtin: '内置' };
const SOURCE_TYPE_LABEL: Record<string, string> = { internal: '内部', partner: '合作方', cloud: '云端' };

export const AgentDetail: React.FC<AgentDetailProps> = ({ agentId, theme, fontSize, onBack }) => {
  const isDark = theme === 'dark';
  const navigate = useNavigate();
  const { showMessage } = useMessage();
  const numericId = Number(agentId);
  const { data: agent, isLoading, isError, error, refetch } = useAgent(numericId);
  const deleteMut = useDeleteAgent();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [stats, setStats] = useState<ResourceStatsVO | null>(null);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [bindingClosure, setBindingClosure] = useState<ResourceBindingSummaryVO[] | undefined>(undefined);

  useEffect(() => {
    resourceCatalogService.getResourceStats('agent', agentId)
      .then(setStats).catch(() => {});
  }, [agentId]);

  useEffect(() => {
    let cancelled = false;
    resourceCatalogService
      .getByTypeAndId('agent', agentId, 'closure')
      .then((d) => {
        if (!cancelled) setBindingClosure(d.bindingClosure);
      })
      .catch(() => {
        if (!cancelled) setBindingClosure(undefined);
      });
    return () => {
      cancelled = true;
    };
  }, [agentId]);

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const resolved = await resourceCatalogService.resolve({ resourceType: 'agent', resourceId: agentId });
      if (resolved.invokeType === 'redirect' && resolved.endpoint) {
        if (!safeOpenHttpUrl(resolved.endpoint)) {
          showMessage('无法打开该地址（仅支持 http/https）', 'warning');
          return;
        }
        setTestResult(`该资源为跳转类型，已打开地址：${resolved.endpoint}`);
        showMessage('已打开资源地址', 'success');
        return;
      }
      if (resolved.invokeType === 'metadata') {
        setTestResult(JSON.stringify(resolved.spec ?? {}, null, 2));
        showMessage('该资源返回元数据，已展示 resolve 结果', 'info');
        return;
      }
      const result = await invokeService.invoke({
        resourceType: (resolved.resourceType ?? 'agent') as 'agent',
        resourceId: resolved.resourceId || agentId,
        payload: { test: true },
      });
      setTestResult(result.body ?? JSON.stringify(result));
      showMessage('测试完成', 'success');
    } catch (err) {
      setTestResult(err instanceof Error ? err.message : '测试失败');
      showMessage('测试失败', 'error');
    } finally {
      setTesting(false);
    }
  };

  const handleEdit = () => {
    navigate(buildPath('admin', 'agent-register', agentId));
  };

  const handleDelete = () => {
    deleteMut.mutate(numericId, {
      onSuccess: () => { setDeleteOpen(false); showMessage('智能体已删除', 'success'); onBack(); },
      onError: (err) => { showMessage('删除失败: ' + (err instanceof Error ? err.message : '未知错误'), 'error'); },
    });
  };

  if (isLoading) return <div className={`flex-1 flex flex-col min-h-0 ${canvasBodyBg(theme)}`}><PageSkeleton type="detail" /></div>;
  if (isError || !agent) return <div className={`flex-1 flex flex-col min-h-0 ${canvasBodyBg(theme)}`}><PageError error={error instanceof Error ? error : new Error('加载失败')} onRetry={() => refetch()} /></div>;

  const formatCallCount = (n: number) => n >= 10000 ? (n / 10000).toFixed(2) + '万' : n.toLocaleString();

  return (
    <div className={`flex-1 flex flex-col min-h-0 overflow-hidden ${canvasBodyBg(theme)}`}>
      {/* Header */}
      <div className={`shrink-0 z-20 border-b px-4 sm:px-6 py-4 flex items-center justify-between ${isDark ? 'border-white/[0.06]' : 'border-slate-100'}`}>
        <div className="flex items-center gap-4 min-w-0">
          <button type="button" onClick={onBack} className={btnGhost(theme)}><ArrowLeft size={20} /></button>
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0 ${isDark ? 'bg-neutral-900/10' : 'bg-neutral-100'}`}>{agent.icon || '🤖'}</div>
            <div>
              <h2 className={`text-xl font-bold ${textPrimary(theme)}`}>{agent.displayName}</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={statusBadgeClass(agent.status as DomainStatus, theme)}><span className={statusDot(agent.status as DomainStatus)} />{statusLabel(agent.status as DomainStatus)}</span>
                <span className={`text-xs ${textMuted(theme)}`}>ID: {agentId}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button type="button" onClick={handleTest} disabled={testing} className={btnGhost(theme)}>{testing ? <Activity size={16} className="animate-spin" /> : <Play size={16} />} <span className="hidden sm:inline">{testing ? '测试中…' : '测试'}</span></button>
          <button type="button" onClick={handleEdit} className={btnGhost(theme)}><Edit2 size={16} /> <span className="hidden sm:inline">编辑</span></button>
          <button type="button" onClick={() => setDeleteOpen(true)} className={btnDanger}><Trash2 size={16} /> <span className="hidden sm:inline">删除</span></button>
        </div>
      </div>

      <div className={`flex-1 min-h-0 overflow-y-auto custom-scrollbar ${mainScrollCompositorClass}`}>
        <DetailLayout className="items-start">
          <div className="space-y-4">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 30 }} className={`${bentoCard(theme)} p-6`}>
            <h3 className={`text-sm font-bold mb-4 flex items-center gap-2 ${textPrimary(theme)}`}><FileText size={18} className="text-blue-500" /> 基本信息</h3>
            <div className="grid grid-cols-2 gap-5">
              {[
                { label: '显示名称', value: agent.displayName },
                { label: '标识名称', value: agent.agentName, mono: true },
                { label: '接入类型', value: AGENT_TYPE_LABEL[agent.agentType] ?? agent.agentType },
                { label: '来源', value: SOURCE_TYPE_LABEL[agent.sourceType] ?? agent.sourceType },
                { label: '模式', value: agent.mode },
                { label: '状态', value: statusLabel(agent.status as DomainStatus) },
                { label: '分类', value: (agent as any).categoryName || '—' },
                { label: '公开', value: (agent as any).isPublic ? '是' : '否' },
              ].map((item) => (
                <div key={item.label}>
                  <label className={`text-xs block mb-1 ${textMuted(theme)}`}>{item.label}</label>
                  <p className={`font-medium ${item.mono ? 'font-mono text-sm' : ''} ${textPrimary(theme)}`}>{item.value}</p>
                </div>
              ))}
              <div className="col-span-2">
                <label className={`text-xs block mb-1 ${textMuted(theme)}`}>描述</label>
                <p className={`text-sm leading-relaxed ${textSecondary(theme)}`}>{agent.description}</p>
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 30, delay: 0.05 }} className={`${bentoCard(theme)} p-6`}>
            <h3 className={`text-sm font-bold mb-4 flex items-center gap-2 ${textPrimary(theme)}`}><Settings size={18} className="text-neutral-800" /> 配置详情</h3>
            <div className="space-y-3">
              <div className={`flex items-start gap-3 p-3 rounded-xl ${isDark ? 'bg-white/[0.02]' : 'bg-slate-50'} border ${isDark ? 'border-white/[0.06]' : 'border-slate-100'}`}>
                <div className={`p-2 rounded-xl shrink-0 ${isDark ? 'bg-blue-500/15 text-blue-400' : 'bg-blue-50 text-blue-600'}`}><Globe size={18} /></div>
                <div className="min-w-0"><p className={`text-sm font-bold ${textPrimary(theme)}`}>连接配置</p><p className={`text-xs font-mono break-all ${textMuted(theme)}`}>{JSON.stringify(agent.specJson)}</p></div>
              </div>
              {agent.systemPrompt && (
                <div className={`flex items-start gap-3 p-3 rounded-xl ${isDark ? 'bg-white/[0.02]' : 'bg-slate-50'} border ${isDark ? 'border-white/[0.06]' : 'border-slate-100'}`}>
                  <div className={`p-2 rounded-xl shrink-0 ${isDark ? 'bg-emerald-500/15 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}><ShieldCheck size={18} /></div>
                  <div className="min-w-0 flex-1"><p className={`text-sm font-bold ${textPrimary(theme)}`}>系统提示词</p><p className={`text-xs line-clamp-2 ${textMuted(theme)}`}>{agent.systemPrompt}</p></div>
                  <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
                </div>
              )}
              <div className={`flex items-start gap-3 p-3 rounded-xl ${isDark ? 'bg-white/[0.02]' : 'bg-slate-50'} border ${isDark ? 'border-white/[0.06]' : 'border-slate-100'}`}>
                <div className={`p-2 rounded-xl shrink-0 ${isDark ? 'bg-orange-500/15 text-orange-400' : 'bg-orange-50 text-orange-600'}`}><Code2 size={18} /></div>
                <div><p className={`text-sm font-bold ${textPrimary(theme)}`}>运行参数</p><p className={`text-xs ${textMuted(theme)}`}>温度: {agent.temperature ?? '—'} | 最大并发: {agent.maxConcurrency} | 最大步数: {agent.maxSteps ?? '—'}</p></div>
              </div>
            </div>
          </motion.div>
          </div>

          <div className="space-y-4">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 30, delay: 0.1 }} className={`${bentoCard(theme)} p-6`}>
            <h3 className={`text-sm font-bold mb-4 flex items-center gap-2 ${textPrimary(theme)}`}><BarChart3 size={18} className="text-emerald-500" /> 运行统计</h3>
            <div className="space-y-5">
              {[
                { label: '累计调用量', value: formatCallCount(agent.callCount), color: 'text-blue-500' },
                { label: '平均成功率', value: `${agent.successRate}%`, color: 'text-emerald-500', bar: agent.successRate },
                { label: '平均响应时间', value: `${agent.avgLatencyMs}ms`, color: 'text-orange-500' },
                { label: '质量评分', value: String(agent.qualityScore), color: 'text-neutral-800' },
              ].map((item) => (
                <div key={item.label}>
                  <div className={`text-xs ${textMuted(theme)}`}>{item.label}</div>
                  <div className={`text-2xl font-bold ${item.color}`}>{item.value}</div>
                  {item.bar !== undefined && <div className={`w-full h-1.5 rounded-full mt-2 ${isDark ? 'bg-white/5' : 'bg-slate-100'}`}><div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${item.bar}%` }} /></div>}
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 30, delay: 0.15 }} className={`${bentoCard(theme)} p-6`}>
            <h3 className={`text-sm font-bold mb-4 flex items-center gap-2 ${textPrimary(theme)}`}><Clock size={18} className="text-slate-500" /> 时间信息</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-xs"><span className={textMuted(theme)}>创建时间</span><span className={`font-mono ${textSecondary(theme)}`}>{formatDateTime(agent.createTime)}</span></div>
              <div className="flex justify-between text-xs"><span className={textMuted(theme)}>最后更新</span><span className={`font-mono ${textSecondary(theme)}`}>{formatDateTime(agent.updateTime)}</span></div>
            </div>
          </motion.div>
          <BindingClosureSection theme={theme} currentResourceId={agentId} items={bindingClosure} className="mt-4" />
          </div>
        </DetailLayout>

        {testResult && (
          <div className={`mx-auto w-full ${contentMaxWidth} ${contentPaddingX} pb-3`}>
            <div className={`p-4 ${bentoCard(theme)}`}>
              <h3 className={`text-sm font-bold mb-2 flex items-center gap-2 ${textPrimary(theme)}`}><Play size={16} className="text-emerald-500" /> 测试结果</h3>
              <pre className={`text-xs font-mono whitespace-pre-wrap break-all p-3 rounded-xl max-h-48 overflow-auto ${isDark ? 'bg-black/30 text-slate-300' : 'bg-white text-slate-700'}`}>{testResult}</pre>
            </div>
          </div>
        )}

        {stats && (
          <div className="w-full min-w-0 pb-4">
            <div className={`p-4 ${bentoCard(theme)}`}>
              <h3 className={`text-sm font-bold mb-3 flex items-center gap-2 ${textPrimary(theme)}`}><TrendingUp size={16} className="text-blue-500" /> 使用统计</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                <div><div className="text-lg font-black text-blue-500">{stats.callCount.toLocaleString()}</div><div className={`text-xs ${textMuted(theme)}`}>总调用</div></div>
                <div><div className="text-lg font-black text-emerald-500">{stats.successRate}%</div><div className={`text-xs ${textMuted(theme)}`}>成功率</div></div>
                <div><div className="text-lg font-black text-amber-500"><Star size={14} className="inline mb-0.5" /> {stats.rating != null ? stats.rating.toFixed(1) : '—'}</div><div className={`text-xs ${textMuted(theme)}`}>评分</div></div>
                <div><div className="text-lg font-black text-rose-500"><Heart size={14} className="inline mb-0.5" /> {stats.favoriteCount}</div><div className={`text-xs ${textMuted(theme)}`}>收藏</div></div>
              </div>
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog open={deleteOpen} title="删除智能体" message={`确定要删除「${agent.displayName}」吗？此操作不可撤销。`} confirmText="删除" variant="danger" loading={deleteMut.isPending} onConfirm={handleDelete} onCancel={() => setDeleteOpen(false)} />
    </div>
  );
};
