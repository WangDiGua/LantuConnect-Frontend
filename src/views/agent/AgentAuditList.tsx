// @deprecated - This file is no longer used in the current routing. Replaced by unified resource management.
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, Eye, X, Clock, User, Loader2 } from 'lucide-react';
import type { Theme, FontSize } from '../../types';
import {
  canvasBodyBg, bentoCard, bentoCardHover, btnSecondary,
  statusBadgeClass, statusDot, statusLabel,
  techBadge,
  textPrimary, textSecondary, textMuted,
} from '../../utils/uiClasses';
import type { DomainStatus } from '../../utils/uiClasses';
import { AnimatedList } from '../../components/common/AnimatedList';
import { LantuSelect } from '../../components/common/LantuSelect';
import { auditService } from '../../api/services/audit.service';
import { formatDateTime } from '../../utils/formatDateTime';
import type { AuditItem } from '../../types/dto/audit';

interface Props {
  theme: Theme;
  fontSize: FontSize;
  showMessage?: (msg: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

export const AgentAuditList: React.FC<Props> = ({ theme, fontSize, showMessage }) => {
  const isDark = theme === 'dark';
  const [queue, setQueue] = useState<AuditItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [approveTarget, setApproveTarget] = useState<AuditItem | null>(null);
  const [rejectTarget, setRejectTarget] = useState<AuditItem | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [detailTarget, setDetailTarget] = useState<AuditItem | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending_review'>('pending_review');

  const fetchData = useCallback(() => {
    setLoading(true);
    auditService.listPendingAgents()
      .then(res => setQueue(res.list))
      .catch(err => { console.error(err); showMessage?.('加载审核列表失败', 'error'); })
      .finally(() => setLoading(false));
  }, [showMessage]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleApprove = (agent: AuditItem) => {
    auditService.approve(agent.id, 'agent')
      .then(() => { setApproveTarget(null); showMessage?.(`�?{agent.displayName}」已通过审核，进入测试阶段`, 'success'); fetchData(); })
      .catch(err => { console.error(err); showMessage?.('审核操作失败', 'error'); });
  };

  const handleReject = (agent: AuditItem) => {
    if (!rejectReason.trim()) return;
    auditService.reject(agent.id, 'agent', rejectReason.trim())
      .then(() => { setRejectTarget(null); setRejectReason(''); showMessage?.(`�?{agent.displayName}」已驳回`, 'info'); fetchData(); })
      .catch(err => { console.error(err); showMessage?.('驳回操作失败', 'error'); });
  };

  const filteredQueue = filterStatus === 'all' ? queue : queue.filter(a => a.status === filterStatus);
  const pendingCount = queue.filter(a => a.status === 'pending_review').length;
  const auditFilterOptions = [
    { value: 'pending_review', label: '仅待审核' },
    { value: 'all', label: '全部' },
  ];

  return (
    <div className={`flex-1 flex flex-col min-h-0 overflow-hidden ${canvasBodyBg(theme)}`}>
      {/* Header */}
      <div className={`shrink-0 z-20 border-b px-4 sm:px-6 py-4 ${isDark ? 'border-white/[0.06]' : 'border-slate-100'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${isDark ? 'bg-amber-500/15' : 'bg-amber-50'}`}>
              <CheckCircle2 size={20} className={isDark ? 'text-amber-400' : 'text-amber-600'} />
            </div>
            <div>
              <h2 className={`text-lg font-bold ${textPrimary(theme)}`}>Agent 审核队列</h2>
              <p className={`text-xs ${textMuted(theme)}`}>审核用户提交�?Agent，决定是否允许上�?/p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {pendingCount > 0 && (
              <span className="text-xs px-3 py-1.5 rounded-lg font-semibold bg-amber-500/20 text-amber-500">{pendingCount} 条待审核</span>
            )}
            <LantuSelect
              theme={theme}
              className="!w-auto"
              triggerClassName="!min-h-0 !text-xs !px-3 !py-1.5"
              chevronSize={14}
              value={filterStatus}
              onChange={(v) => setFilterStatus(v as 'all' | 'pending_review')}
              options={auditFilterOptions}
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-4 sm:px-6 py-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 size={32} className={`animate-spin ${textMuted(theme)}`} />
            <p className={`mt-3 text-sm ${textMuted(theme)}`}>加载中�?/p>
          </div>
        ) : filteredQueue.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <CheckCircle2 size={48} className={isDark ? 'text-slate-600' : 'text-slate-300'} />
            <p className={`mt-4 text-sm font-medium ${textMuted(theme)}`}>暂无待审核项�?/p>
          </div>
        ) : (
          <AnimatedList className="space-y-2">
            {filteredQueue.map((agent) => (
              <motion.div
                key={agent.id}
                className={`${bentoCardHover(theme)} p-4 sm:p-5 ${isDark ? 'hover:bg-neutral-900/[0.03]' : 'hover:bg-neutral-100/40'}`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <h3 className={`font-bold ${textPrimary(theme)}`}>{agent.displayName}</h3>
                      <span className={statusBadgeClass(agent.status as DomainStatus, theme)}>
                        <span className={statusDot(agent.status as DomainStatus)} />
                        {statusLabel(agent.status as DomainStatus)}
                      </span>
                      <span className={techBadge(theme)}>{agent.agentType}</span>
                      <span className={techBadge(theme)}>{agent.sourceType}</span>
                    </div>
                    <p className={`text-sm mb-3 ${textSecondary(theme)}`}>{agent.description}</p>
                    <div className="flex items-center gap-4 flex-wrap">
                      <span className={`text-xs flex items-center gap-1.5 ${textMuted(theme)}`}><User size={12} /> {agent.submitter}</span>
                      <span className={`text-xs flex items-center gap-1.5 ${textMuted(theme)}`}><Clock size={12} /> {formatDateTime(agent.submitTime)}</span>
                    </div>
                  </div>
                  {agent.status === 'pending_review' && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => setDetailTarget(agent)} className={`p-2 rounded-xl transition-colors ${isDark ? 'hover:bg-white/5 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`} title="查看详情"><Eye size={16} /></button>
                      <button onClick={() => setApproveTarget(agent)} className={`px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors ${isDark ? 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}><CheckCircle2 size={14} /> 通过</button>
                      <button onClick={() => setRejectTarget(agent)} className={`px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors ${isDark ? 'bg-rose-500/15 text-rose-400 hover:bg-rose-500/25' : 'bg-rose-50 text-rose-700 hover:bg-rose-100'}`}><XCircle size={14} /> 驳回</button>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatedList>
        )}
      </div>

      {/* Approve dialog */}
      <AnimatePresence>
        {approveTarget && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setApproveTarget(null)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} onClick={e => e.stopPropagation()} className={`w-full max-w-md mx-4 p-6 ${bentoCard(theme)}`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-lg font-bold ${textPrimary(theme)}`}>确认审核通过</h3>
                <button onClick={() => setApproveTarget(null)} className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-white/10' : 'hover:bg-slate-100'}`}><X size={18} className={textMuted(theme)} /></button>
              </div>
              <p className={`text-sm mb-2 ${textSecondary(theme)}`}>确定通过 <strong>{approveTarget.displayName}</strong> 的审核？</p>
              <p className={`text-xs mb-6 ${textMuted(theme)}`}>通过后该 Agent 将进入测试阶段，测试完成后可发布上线�?/p>
              <div className="flex justify-end gap-3">
                <button onClick={() => setApproveTarget(null)} className={btnSecondary(theme)}>取消</button>
                <button onClick={() => handleApprove(approveTarget)} className="px-4 py-2.5 rounded-xl text-sm font-medium bg-emerald-500 text-white hover:bg-emerald-600 transition-colors">确认通过</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reject dialog */}
      <AnimatePresence>
        {rejectTarget && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => { setRejectTarget(null); setRejectReason(''); }}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} onClick={e => e.stopPropagation()} className={`w-full max-w-md mx-4 p-6 ${bentoCard(theme)}`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-lg font-bold ${textPrimary(theme)}`}>驳回审核</h3>
                <button onClick={() => { setRejectTarget(null); setRejectReason(''); }} className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-white/10' : 'hover:bg-slate-100'}`}><X size={18} className={textMuted(theme)} /></button>
              </div>
              <p className={`text-sm mb-4 ${textSecondary(theme)}`}>请输�?<strong>{rejectTarget.displayName}</strong> 的驳回原因：</p>
              <textarea rows={3} placeholder="请说明驳回理由，提交者将看到此说�?.." className={`w-full rounded-xl border px-3 py-2.5 text-sm resize-y outline-none focus:ring-1 focus:ring-rose-500/30 mb-6 ${isDark ? 'bg-[#141820] border-white/10 text-white placeholder:text-slate-500' : 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400'}`} value={rejectReason} onChange={e => setRejectReason(e.target.value)} />
              <div className="flex justify-end gap-3">
                <button onClick={() => { setRejectTarget(null); setRejectReason(''); }} className={btnSecondary(theme)}>取消</button>
                <button onClick={() => handleReject(rejectTarget)} disabled={!rejectReason.trim()} className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${rejectReason.trim() ? 'bg-rose-500 text-white hover:bg-rose-600' : 'bg-rose-500/40 text-white/60 cursor-not-allowed'}`}>确认驳回</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Detail dialog */}
      <AnimatePresence>
        {detailTarget && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setDetailTarget(null)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} onClick={e => e.stopPropagation()} className={`w-full max-w-lg mx-4 p-6 ${bentoCard(theme)}`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-lg font-bold ${textPrimary(theme)}`}>Agent 详情</h3>
                <button onClick={() => setDetailTarget(null)} className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-white/10' : 'hover:bg-slate-100'}`}><X size={18} className={textMuted(theme)} /></button>
              </div>
              <div className={`rounded-xl border divide-y ${isDark ? 'border-white/[0.06] divide-white/[0.06]' : 'border-slate-100 divide-slate-100'}`}>
                {[
                  { label: '名称', value: detailTarget.displayName },
                  { label: '描述', value: detailTarget.description },
                  { label: '协议类型', value: detailTarget.agentType },
                  { label: '来源类型', value: detailTarget.sourceType },
                  { label: 'Agent 标识', value: detailTarget.agentName },
                  { label: '提交�?, value: detailTarget.submitter },
                  { label: '提交时间', value: formatDateTime(detailTarget.submitTime) },
                ].map(item => (
                  <div key={item.label} className="flex items-start justify-between px-4 py-3 gap-4">
                    <span className={`text-xs shrink-0 ${textMuted(theme)}`}>{item.label}</span>
                    <span className={`text-sm font-medium text-right break-all ${textPrimary(theme)}`}>{item.value}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-end mt-4">
                <button onClick={() => setDetailTarget(null)} className={btnSecondary(theme)}>关闭</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
