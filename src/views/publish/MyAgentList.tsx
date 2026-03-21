import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Eye, Undo2, ArrowRight, X, Loader2 } from 'lucide-react';
import type { Theme, FontSize } from '../../types';
import type { AgentStatus } from '../../types/dto/agent';
import {
  pageBg, bentoCard, bentoCardHover, btnSecondary,
  statusBadgeClass, statusDot, statusLabel,
  textPrimary, textSecondary, textMuted,
} from '../../utils/uiClasses';
import type { DomainStatus } from '../../utils/uiClasses';
import { Modal } from '../../components/common/Modal';
import { AnimatedList } from '../../components/common/AnimatedList';
import { userActivityService } from '../../api/services/user-activity.service';
import type { MyPublishItem } from '../../types/dto/user-activity';

interface Props { theme: Theme; fontSize: FontSize; }

const STATUS_CONFIG: Record<AgentStatus, { label: string; bg: string; text: string; darkBg: string; darkText: string }> = {
  draft:          { label: '草稿',   bg: 'bg-slate-100',   text: 'text-slate-600',  darkBg: 'bg-slate-700/40',    darkText: 'text-slate-300' },
  pending_review: { label: '待审核', bg: 'bg-amber-50',    text: 'text-amber-700',  darkBg: 'bg-amber-500/20',    darkText: 'text-amber-400' },
  testing:        { label: '测试中', bg: 'bg-blue-50',     text: 'text-blue-700',   darkBg: 'bg-blue-500/20',     darkText: 'text-blue-400' },
  published:      { label: '已发布', bg: 'bg-emerald-50',  text: 'text-emerald-700',darkBg: 'bg-emerald-500/20',  darkText: 'text-emerald-400' },
  rejected:       { label: '已驳回', bg: 'bg-red-50',      text: 'text-red-700',    darkBg: 'bg-red-500/20',      darkText: 'text-red-400' },
  deprecated:     { label: '已废弃', bg: 'bg-slate-100',   text: 'text-slate-500',  darkBg: 'bg-slate-700/40',    darkText: 'text-slate-400' },
};
const STATUS_FLOW: AgentStatus[] = ['draft', 'pending_review', 'testing', 'published'];

export const MyAgentList: React.FC<Props> = ({ theme }) => {
  const isDark = theme === 'dark';
  const [agents, setAgents] = useState<MyPublishItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [withdrawTarget, setWithdrawTarget] = useState<MyPublishItem | null>(null);
  const [viewTarget, setViewTarget] = useState<MyPublishItem | null>(null);

  const fetchData = useCallback(() => {
    setLoading(true);
    userActivityService.getMyAgents().then(data => setAgents(data)).catch(err => console.error(err)).finally(() => setLoading(false));
  }, []);
  useEffect(() => { fetchData(); }, [fetchData]);

  const handleWithdraw = (agent: MyPublishItem) => {
    setAgents(prev => prev.map(a => a.id === agent.id ? { ...a, status: 'draft' as MyPublishItem['status'] } : a));
    setWithdrawTarget(null);
  };

  const StatusFlow: React.FC<{ current: string }> = ({ current }) => {
    const currentIdx = STATUS_FLOW.indexOf(current as AgentStatus);
    return (
      <div className="flex items-center gap-1">
        {STATUS_FLOW.map((s, i) => {
          const cfg = STATUS_CONFIG[s];
          const isActive = s === current;
          const isPast = currentIdx >= 0 && i < currentIdx;
          return (
            <React.Fragment key={s}>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium transition-all ${isActive ? (isDark ? `${cfg.darkBg} ${cfg.darkText}` : `${cfg.bg} ${cfg.text}`) : isPast ? (isDark ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600') : (isDark ? 'bg-white/5 text-slate-500' : 'bg-slate-100 text-slate-400')}`}>{cfg.label}</span>
              {i < STATUS_FLOW.length - 1 && <ArrowRight size={10} className={isPast || isActive ? (isDark ? 'text-emerald-400' : 'text-emerald-500') : (isDark ? 'text-slate-600' : 'text-slate-300')} />}
            </React.Fragment>
          );
        })}
      </div>
    );
  };

  return (
    <div className={`flex-1 flex flex-col min-h-0 overflow-hidden ${pageBg(theme)}`}>
      {/* Header */}
      <div className={`shrink-0 z-20 border-b px-4 sm:px-6 py-4 flex items-center justify-between ${isDark ? 'border-white/[0.06]' : 'border-slate-100'}`}>
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl ${isDark ? 'bg-indigo-500/15' : 'bg-indigo-50'}`}><Bot size={20} className={isDark ? 'text-indigo-400' : 'text-indigo-600'} /></div>
          <div>
            <h2 className={`text-lg font-bold ${textPrimary(theme)}`}>我的 Agent</h2>
            <p className={`text-xs ${textMuted(theme)}`}>管理您提交的 Agent，跟踪审核进度</p>
          </div>
        </div>
        <span className={`text-xs px-3 py-1.5 rounded-lg font-medium ${isDark ? 'bg-white/5 text-slate-400' : 'bg-slate-50 text-slate-500 border border-slate-100'}`}>共 {agents.length} 个</span>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-4 sm:px-6 py-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 size={32} className={`animate-spin ${textMuted(theme)}`} />
            <p className={`mt-3 text-sm ${textMuted(theme)}`}>加载中…</p>
          </div>
        ) : (
          <AnimatedList className="space-y-2">
            {agents.map((agent) => (
              <motion.div key={agent.id} whileHover={{ y: -2 }} transition={{ type: 'spring', stiffness: 400, damping: 30 }} className={`${bentoCardHover(theme)} p-4 sm:p-5 ${isDark ? 'hover:bg-indigo-500/[0.03]' : 'hover:bg-indigo-50/40'}`}>
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className={`font-bold truncate ${textPrimary(theme)}`}>{agent.displayName}</h3>
                      <span className={statusBadgeClass(agent.status as DomainStatus, theme)}><span className={statusDot(agent.status as DomainStatus)} />{statusLabel(agent.status as DomainStatus)}</span>
                    </div>
                    <p className={`text-sm mb-3 ${textSecondary(theme)}`}>{agent.description}</p>
                    <StatusFlow current={agent.status} />
                    <div className="flex items-center gap-4 mt-2">
                      <span className={`text-xs ${textMuted(theme)}`}>创建时间: {agent.createTime}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => setViewTarget(agent)} className={`p-2 rounded-xl transition-colors ${isDark ? 'hover:bg-white/5 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`} title="查看"><Eye size={16} /></button>
                    {agent.status === 'pending_review' && (
                      <button onClick={() => setWithdrawTarget(agent)} className={`p-2 rounded-xl transition-colors ${isDark ? 'hover:bg-amber-500/15 text-amber-400' : 'hover:bg-amber-50 text-amber-600'}`} title="撤回"><Undo2 size={16} /></button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatedList>
        )}
      </div>

      {/* Withdraw dialog */}
      <AnimatePresence>
        {withdrawTarget && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setWithdrawTarget(null)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} onClick={e => e.stopPropagation()} className={`w-full max-w-md mx-4 p-6 ${bentoCard(theme)}`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-lg font-bold ${textPrimary(theme)}`}>确认撤回</h3>
                <button onClick={() => setWithdrawTarget(null)} className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-white/10' : 'hover:bg-slate-100'}`}><X size={18} className={textMuted(theme)} /></button>
              </div>
              <p className={`text-sm mb-6 ${textSecondary(theme)}`}>确定要撤回 <strong>{withdrawTarget.displayName}</strong> 的审核申请吗？撤回后状态将恢复为草稿。</p>
              <div className="flex justify-end gap-3">
                <button onClick={() => setWithdrawTarget(null)} className={btnSecondary(theme)}>取消</button>
                <button onClick={() => handleWithdraw(withdrawTarget)} className="px-4 py-2.5 rounded-xl text-sm font-medium bg-amber-500 text-white hover:bg-amber-600 transition-colors">确认撤回</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Detail modal */}
      <Modal open={!!viewTarget} onClose={() => setViewTarget(null)} title="Agent 详情" theme={theme} size="lg">
        {viewTarget && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: '名称', value: viewTarget.displayName, bold: true },
                { label: '状态', value: null, badge: true },
                { label: '调用次数', value: String(viewTarget.callCount) },
                { label: '创建时间', value: viewTarget.createTime },
              ].map((item) => (
                <div key={item.label}>
                  <span className={`text-xs font-medium ${textMuted(theme)}`}>{item.label}</span>
                  {item.badge ? (
                    <div className="mt-1"><span className={statusBadgeClass(viewTarget.status as DomainStatus, theme)}><span className={statusDot(viewTarget.status as DomainStatus)} />{statusLabel(viewTarget.status as DomainStatus)}</span></div>
                  ) : (
                    <p className={`text-sm mt-0.5 ${item.bold ? `font-semibold ${textPrimary(theme)}` : textSecondary(theme)}`}>{item.value}</p>
                  )}
                </div>
              ))}
            </div>
            <div>
              <span className={`text-xs font-medium ${textMuted(theme)}`}>描述</span>
              <p className={`text-sm mt-0.5 ${textSecondary(theme)}`}>{viewTarget.description}</p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
