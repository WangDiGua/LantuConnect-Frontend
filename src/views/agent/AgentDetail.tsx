import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Settings, FileText, Play, Edit2, Trash2,
  CheckCircle2, Clock, BarChart3, ShieldCheck, Code2, Globe, Activity,
} from 'lucide-react';
import { Theme, FontSize } from '../../types';
import { useAgent, useDeleteAgent } from '../../hooks/queries/useAgent';
import { PageSkeleton } from '../../components/common/PageSkeleton';
import { PageError } from '../../components/common/PageError';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import {
  pageBg, bentoCard, btnGhost, btnDanger,
  textPrimary, textSecondary, textMuted,
  statusBadgeClass, statusDot, statusLabel,
} from '../../utils/uiClasses';
import type { DomainStatus } from '../../utils/uiClasses';

interface AgentDetailProps { agentId: string; theme: Theme; fontSize: FontSize; onBack: () => void; }

const AGENT_TYPE_LABEL: Record<string, string> = { mcp: 'MCP 协议', http_api: 'HTTP API', builtin: '内置' };
const SOURCE_TYPE_LABEL: Record<string, string> = { internal: '内部', partner: '合作方', cloud: '云端' };

export const AgentDetail: React.FC<AgentDetailProps> = ({ agentId, theme, fontSize, onBack }) => {
  const isDark = theme === 'dark';
  const numericId = Number(agentId);
  const { data: agent, isLoading, isError, error, refetch } = useAgent(numericId);
  const deleteMut = useDeleteAgent();
  const [deleteOpen, setDeleteOpen] = useState(false);

  const handleDelete = () => { deleteMut.mutate(numericId, { onSuccess: () => { setDeleteOpen(false); onBack(); } }); };

  if (isLoading) return <div className={`flex-1 flex flex-col min-h-0 ${pageBg(theme)}`}><PageSkeleton type="detail" /></div>;
  if (isError || !agent) return <div className={`flex-1 flex flex-col min-h-0 ${pageBg(theme)}`}><PageError error={error instanceof Error ? error : new Error('加载失败')} onRetry={() => refetch()} /></div>;

  const formatCallCount = (n: number) => n >= 10000 ? (n / 10000).toFixed(2) + '万' : n.toLocaleString();

  return (
    <div className={`flex-1 flex flex-col min-h-0 overflow-hidden ${pageBg(theme)}`}>
      {/* Header */}
      <div className={`shrink-0 z-20 border-b px-4 sm:px-6 py-4 flex items-center justify-between ${isDark ? 'border-white/[0.06]' : 'border-slate-100'}`}>
        <div className="flex items-center gap-4 min-w-0">
          <button type="button" onClick={onBack} className={btnGhost(theme)}><ArrowLeft size={20} /></button>
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0 ${isDark ? 'bg-indigo-500/15' : 'bg-indigo-50'}`}>{agent.icon || '🤖'}</div>
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
          <button type="button" className={btnGhost(theme)}><Play size={16} /> <span className="hidden sm:inline">测试</span></button>
          <button type="button" className={btnGhost(theme)}><Edit2 size={16} /> <span className="hidden sm:inline">编辑</span></button>
          <button type="button" onClick={() => setDeleteOpen(true)} className={btnDanger}><Trash2 size={16} /> <span className="hidden sm:inline">删除</span></button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-2 sm:px-3 lg:px-4 py-3 grid grid-cols-1 lg:grid-cols-3 gap-4 content-start">
        {/* Left */}
        <div className="lg:col-span-2 space-y-4">
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
            <h3 className={`text-sm font-bold mb-4 flex items-center gap-2 ${textPrimary(theme)}`}><Settings size={18} className="text-purple-500" /> 配置详情</h3>
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

        {/* Right */}
        <div className="space-y-4">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 30, delay: 0.1 }} className={`${bentoCard(theme)} p-6`}>
            <h3 className={`text-sm font-bold mb-4 flex items-center gap-2 ${textPrimary(theme)}`}><BarChart3 size={18} className="text-emerald-500" /> 运行统计</h3>
            <div className="space-y-5">
              {[
                { label: '累计调用量', value: formatCallCount(agent.callCount), color: 'text-blue-500' },
                { label: '平均成功率', value: `${agent.successRate}%`, color: 'text-emerald-500', bar: agent.successRate },
                { label: '平均响应时间', value: `${agent.avgLatencyMs}ms`, color: 'text-orange-500' },
                { label: '质量评分', value: String(agent.qualityScore), color: 'text-purple-500' },
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
              <div className="flex justify-between text-xs"><span className={textMuted(theme)}>创建时间</span><span className={`font-mono ${textSecondary(theme)}`}>{agent.createTime}</span></div>
              <div className="flex justify-between text-xs"><span className={textMuted(theme)}>最后更新</span><span className={`font-mono ${textSecondary(theme)}`}>{agent.updateTime}</span></div>
            </div>
          </motion.div>
        </div>
      </div>

      <ConfirmDialog open={deleteOpen} title="删除 Agent" message={`确定要删除「${agent.displayName}」吗？此操作不可撤销。`} confirmText="删除" variant="danger" loading={deleteMut.isPending} onConfirm={handleDelete} onCancel={() => setDeleteOpen(false)} />
    </div>
  );
};
