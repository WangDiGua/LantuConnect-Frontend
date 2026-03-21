import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, Eye, X, Wrench, Clock, User } from 'lucide-react';
import type { Theme, FontSize } from '../../types';
import type { AgentStatus, AgentType, SourceType } from '../../types/dto/agent';
import { statusBadgeClass, statusLabel, pageBg, btnSecondary } from '../../utils/uiClasses';
import type { DomainStatus } from '../../utils/uiClasses';

interface Props {
  theme: Theme;
  fontSize: FontSize;
  showMessage?: (msg: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

interface AuditSkill {
  id: number;
  displayName: string;
  description: string;
  agentType: AgentType;
  sourceType: SourceType;
  status: AgentStatus;
  submitter: string;
  submitterDept: string;
  submitTime: string;
  specUrl: string;
}

const INITIAL_QUEUE: AuditSkill[] = [
  { id: 201, displayName: '文档摘要生成', description: '对上传文档自动生成结构化摘要', agentType: 'mcp', sourceType: 'internal', status: 'pending_review', submitter: '张三 (2021001)', submitterDept: '计算机学院', submitTime: '2026-03-19 14:50', specUrl: 'https://nlp.example.edu/mcp/summarize' },
  { id: 202, displayName: '论文查重预检', description: '论文提交前进行查重率预估', agentType: 'http_api', sourceType: 'internal', status: 'pending_review', submitter: '刘七 (T20045)', submitterDept: '图书馆', submitTime: '2026-03-20 10:20', specUrl: 'https://check.example.edu/api/v1/precheck' },
  { id: 203, displayName: '日程提醒工具', description: '根据教务日历自动发送日程提醒', agentType: 'http_api', sourceType: 'internal', status: 'pending_review', submitter: '陈八 (2022030)', submitterDept: '信息工程学院', submitTime: '2026-03-21 08:30', specUrl: 'https://remind.example.edu/api/schedule' },
];

export const SkillAuditList: React.FC<Props> = ({ theme, fontSize, showMessage }) => {
  const isDark = theme === 'dark';
  const [queue, setQueue] = useState<AuditSkill[]>(INITIAL_QUEUE);
  const [approveTarget, setApproveTarget] = useState<AuditSkill | null>(null);
  const [rejectTarget, setRejectTarget] = useState<AuditSkill | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [detailTarget, setDetailTarget] = useState<AuditSkill | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending_review'>('pending_review');

  const handleApprove = (skill: AuditSkill) => {
    setQueue(prev => prev.map(s => s.id === skill.id ? { ...s, status: 'testing' as AgentStatus } : s));
    setApproveTarget(null);
    showMessage?.(`「${skill.displayName}」已通过审核，进入测试阶段`, 'success');
  };

  const handleReject = (skill: AuditSkill) => {
    if (!rejectReason.trim()) return;
    setQueue(prev => prev.map(s => s.id === skill.id ? { ...s, status: 'rejected' as AgentStatus } : s));
    setRejectTarget(null);
    setRejectReason('');
    showMessage?.(`「${skill.displayName}」已驳回`, 'info');
  };

  const filteredQueue = filterStatus === 'all' ? queue : queue.filter(s => s.status === filterStatus);
  const pendingCount = queue.filter(s => s.status === 'pending_review').length;

  const StatusBadge: React.FC<{ status: string }> = ({ status }) => (
    <span className={statusBadgeClass(status as DomainStatus, theme)}>
      {statusLabel(status as DomainStatus)}
    </span>
  );

  return (
    <div className={`flex-1 flex flex-col min-h-0 overflow-hidden ${pageBg(theme)}`}>
      <div className={`shrink-0 z-20 border-b px-4 sm:px-6 py-4 ${isDark ? 'border-white/10' : 'border-slate-200/80'} ${pageBg(theme)}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${isDark ? 'bg-amber-500/20' : 'bg-amber-50'}`}>
              <CheckCircle2 size={20} className={isDark ? 'text-amber-400' : 'text-amber-600'} />
            </div>
            <div>
              <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Skill 审核队列</h2>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>审核用户提交的 Skill，决定是否允许上线</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {pendingCount > 0 && (
              <span className="text-xs px-3 py-1.5 rounded-lg font-semibold bg-amber-500/20 text-amber-500">
                {pendingCount} 条待审核
              </span>
            )}
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value as any)}
              className={`text-xs px-3 py-1.5 rounded-xl border outline-none ${isDark ? 'bg-[#2C2C2E] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-700'}`}
            >
              <option value="pending_review">仅待审核</option>
              <option value="all">全部</option>
            </select>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-4 sm:px-6 py-4">
        {filteredQueue.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <CheckCircle2 size={48} className={isDark ? 'text-slate-600' : 'text-slate-300'} />
            <p className={`mt-4 text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>暂无待审核项目</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredQueue.map((skill) => (
              <motion.div
                key={skill.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`rounded-2xl border p-4 sm:p-5 transition-colors ${isDark ? 'bg-[#1C1C1E] border-white/10 hover:border-white/20' : 'bg-white border-slate-200/80 hover:border-slate-300'}`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <h3 className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{skill.displayName}</h3>
                      <StatusBadge status={skill.status} />
                      <span className={`text-xs px-2 py-0.5 rounded-md ${isDark ? 'bg-white/5 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                        {skill.agentType}
                      </span>
                    </div>
                    <p className={`text-sm mb-3 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{skill.description}</p>
                    <div className="flex items-center gap-4 flex-wrap">
                      <span className={`text-xs flex items-center gap-1.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                        <User size={12} /> {skill.submitter} · {skill.submitterDept}
                      </span>
                      <span className={`text-xs flex items-center gap-1.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                        <Clock size={12} /> {skill.submitTime}
                      </span>
                    </div>
                  </div>

                  {skill.status === 'pending_review' && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => setDetailTarget(skill)}
                        className={`p-2 rounded-xl transition-colors ${isDark ? 'hover:bg-white/10 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}
                        title="查看详情"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={() => setApproveTarget(skill)}
                        className={`px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors ${
                          isDark ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                        }`}
                      >
                        <CheckCircle2 size={14} />
                        通过
                      </button>
                      <button
                        onClick={() => setRejectTarget(skill)}
                        className={`px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors ${
                          isDark ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-red-50 text-red-700 hover:bg-red-100'
                        }`}
                      >
                        <XCircle size={14} />
                        驳回
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Approve dialog */}
      <AnimatePresence>
        {approveTarget && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setApproveTarget(null)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} onClick={e => e.stopPropagation()} className={`w-full max-w-md mx-4 p-6 rounded-2xl border shadow-2xl ${isDark ? 'bg-[#1C1C1E] border-white/10' : 'bg-white border-slate-200'}`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>确认审核通过</h3>
                <button onClick={() => setApproveTarget(null)} className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-white/10' : 'hover:bg-slate-100'}`}>
                  <X size={18} className={isDark ? 'text-slate-400' : 'text-slate-500'} />
                </button>
              </div>
              <p className={`text-sm mb-2 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                确定通过 <strong>{approveTarget.displayName}</strong> 的审核？
              </p>
              <p className={`text-xs mb-6 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                通过后该 Skill 将进入测试阶段，测试完成后可发布上线。
              </p>
              <div className="flex justify-end gap-3">
                <button onClick={() => setApproveTarget(null)} className={btnSecondary(theme)}>
                  取消
                </button>
                <button onClick={() => handleApprove(approveTarget)} className="px-4 py-2 rounded-xl text-sm font-medium bg-emerald-500 text-white hover:bg-emerald-600 transition-colors">
                  确认通过
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reject dialog */}
      <AnimatePresence>
        {rejectTarget && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => { setRejectTarget(null); setRejectReason(''); }}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} onClick={e => e.stopPropagation()} className={`w-full max-w-md mx-4 p-6 rounded-2xl border shadow-2xl ${isDark ? 'bg-[#1C1C1E] border-white/10' : 'bg-white border-slate-200'}`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>驳回审核</h3>
                <button onClick={() => { setRejectTarget(null); setRejectReason(''); }} className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-white/10' : 'hover:bg-slate-100'}`}>
                  <X size={18} className={isDark ? 'text-slate-400' : 'text-slate-500'} />
                </button>
              </div>
              <p className={`text-sm mb-4 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                请输入 <strong>{rejectTarget.displayName}</strong> 的驳回原因：
              </p>
              <textarea
                rows={3}
                placeholder="请说明驳回理由，提交者将看到此说明..."
                className={`w-full rounded-xl border px-3 py-2.5 text-sm resize-y outline-none focus:ring-1 focus:ring-red-500/30 mb-6 ${isDark ? 'bg-[#2C2C2E] border-white/10 text-white placeholder:text-slate-500' : 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400'}`}
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
              />
              <div className="flex justify-end gap-3">
                <button onClick={() => { setRejectTarget(null); setRejectReason(''); }} className={btnSecondary(theme)}>
                  取消
                </button>
                <button onClick={() => handleReject(rejectTarget)} disabled={!rejectReason.trim()} className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${rejectReason.trim() ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-red-500/40 text-white/60 cursor-not-allowed'}`}>
                  确认驳回
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Detail dialog */}
      <AnimatePresence>
        {detailTarget && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setDetailTarget(null)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} onClick={e => e.stopPropagation()} className={`w-full max-w-lg mx-4 p-6 rounded-2xl border shadow-2xl ${isDark ? 'bg-[#1C1C1E] border-white/10' : 'bg-white border-slate-200'}`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Skill 详情</h3>
                <button onClick={() => setDetailTarget(null)} className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-white/10' : 'hover:bg-slate-100'}`}>
                  <X size={18} className={isDark ? 'text-slate-400' : 'text-slate-500'} />
                </button>
              </div>
              <div className={`rounded-xl border divide-y ${isDark ? 'border-white/10 divide-white/10' : 'border-slate-200 divide-slate-100'}`}>
                {[
                  { label: '名称', value: detailTarget.displayName },
                  { label: '描述', value: detailTarget.description },
                  { label: '协议类型', value: detailTarget.agentType },
                  { label: '来源类型', value: detailTarget.sourceType },
                  { label: '接口地址', value: detailTarget.specUrl },
                  { label: '提交人', value: `${detailTarget.submitter} · ${detailTarget.submitterDept}` },
                  { label: '提交时间', value: detailTarget.submitTime },
                ].map(item => (
                  <div key={item.label} className="flex items-start justify-between px-4 py-3 gap-4">
                    <span className={`text-xs shrink-0 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{item.label}</span>
                    <span className={`text-sm font-medium text-right break-all ${isDark ? 'text-white' : 'text-slate-900'}`}>{item.value}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-end mt-4">
                <button onClick={() => setDetailTarget(null)} className={btnSecondary(theme)}>
                  关闭
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
