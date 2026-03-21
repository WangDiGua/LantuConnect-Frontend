import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, Eye, X, Bot, Clock, User } from 'lucide-react';
import type { Theme, FontSize } from '../../types';
import type { AgentStatus, AgentType, SourceType } from '../../types/dto/agent';

interface Props {
  theme: Theme;
  fontSize: FontSize;
  showMessage?: (msg: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

interface AuditAgent {
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

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; darkBg: string; darkText: string }> = {
  pending_review: { label: '待审核', bg: 'bg-amber-50',    text: 'text-amber-700',  darkBg: 'bg-amber-500/20',    darkText: 'text-amber-400' },
  testing:        { label: '测试中', bg: 'bg-blue-50',     text: 'text-blue-700',   darkBg: 'bg-blue-500/20',     darkText: 'text-blue-400' },
  published:      { label: '已发布', bg: 'bg-emerald-50',  text: 'text-emerald-700',darkBg: 'bg-emerald-500/20',  darkText: 'text-emerald-400' },
  rejected:       { label: '已驳回', bg: 'bg-red-50',      text: 'text-red-700',    darkBg: 'bg-red-500/20',      darkText: 'text-red-400' },
};

const INITIAL_QUEUE: AuditAgent[] = [
  { id: 101, displayName: '图书检索 Agent', description: '接入图书馆检索 API，支持书名、ISBN 查询', agentType: 'http_api', sourceType: 'internal', status: 'pending_review', submitter: '张三 (2021001)', submitterDept: '计算机学院', submitTime: '2026-03-18 09:15', specUrl: 'https://lib.example.edu/api/v1/search' },
  { id: 102, displayName: '实验室预约助手', description: '查询并预约实验室空闲时间段', agentType: 'mcp', sourceType: 'internal', status: 'pending_review', submitter: '李四 (2021002)', submitterDept: '电子工程学院', submitTime: '2026-03-19 11:30', specUrl: 'https://lab.example.edu/mcp' },
  { id: 103, displayName: '宿舍报修 Bot', description: '提交宿舍维修工单并跟踪进度', agentType: 'http_api', sourceType: 'internal', status: 'pending_review', submitter: '王五 (2022015)', submitterDept: '后勤管理处', submitTime: '2026-03-20 14:00', specUrl: 'https://repair.example.edu/api/submit' },
  { id: 104, displayName: '校历查询工具', description: '查询学期校历、假期安排', agentType: 'http_api', sourceType: 'internal', status: 'pending_review', submitter: '赵六 (T10023)', submitterDept: '教务处', submitTime: '2026-03-20 16:45', specUrl: 'https://calendar.example.edu/api/v1' },
];

export const AgentAuditList: React.FC<Props> = ({ theme, fontSize, showMessage }) => {
  const isDark = theme === 'dark';
  const [queue, setQueue] = useState<AuditAgent[]>(INITIAL_QUEUE);
  const [approveTarget, setApproveTarget] = useState<AuditAgent | null>(null);
  const [rejectTarget, setRejectTarget] = useState<AuditAgent | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [detailTarget, setDetailTarget] = useState<AuditAgent | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending_review'>('pending_review');

  const handleApprove = (agent: AuditAgent) => {
    setQueue(prev => prev.map(a => a.id === agent.id ? { ...a, status: 'testing' as AgentStatus } : a));
    setApproveTarget(null);
    showMessage?.(`「${agent.displayName}」已通过审核，进入测试阶段`, 'success');
  };

  const handleReject = (agent: AuditAgent) => {
    if (!rejectReason.trim()) return;
    setQueue(prev => prev.map(a => a.id === agent.id ? { ...a, status: 'rejected' as AgentStatus } : a));
    setRejectTarget(null);
    setRejectReason('');
    showMessage?.(`「${agent.displayName}」已驳回`, 'info');
  };

  const filteredQueue = filterStatus === 'all' ? queue : queue.filter(a => a.status === filterStatus);
  const pendingCount = queue.filter(a => a.status === 'pending_review').length;

  const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
    const cfg = STATUS_CONFIG[status];
    if (!cfg) return null;
    return (
      <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold ${isDark ? `${cfg.darkBg} ${cfg.darkText}` : `${cfg.bg} ${cfg.text}`}`}>
        {cfg.label}
      </span>
    );
  };

  return (
    <div className={`flex-1 flex flex-col min-h-0 overflow-hidden ${isDark ? 'bg-[#000000]' : 'bg-[#F2F2F7]'}`}>
      <div className={`shrink-0 z-20 border-b px-4 sm:px-6 py-4 ${isDark ? 'border-white/10 bg-[#000000]' : 'border-slate-200/80 bg-[#F2F2F7]'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${isDark ? 'bg-amber-500/20' : 'bg-amber-50'}`}>
              <CheckCircle2 size={20} className={isDark ? 'text-amber-400' : 'text-amber-600'} />
            </div>
            <div>
              <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Agent 审核队列</h2>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>审核用户提交的 Agent，决定是否允许上线</p>
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
            {filteredQueue.map((agent) => (
              <motion.div
                key={agent.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`rounded-2xl border p-4 sm:p-5 transition-colors ${isDark ? 'bg-[#1C1C1E] border-white/10 hover:border-white/20' : 'bg-white border-slate-200/80 hover:border-slate-300'}`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <h3 className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{agent.displayName}</h3>
                      <StatusBadge status={agent.status} />
                      <span className={`text-xs px-2 py-0.5 rounded-md ${isDark ? 'bg-white/5 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                        {agent.agentType}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-md ${isDark ? 'bg-white/5 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                        {agent.sourceType}
                      </span>
                    </div>
                    <p className={`text-sm mb-3 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{agent.description}</p>
                    <div className="flex items-center gap-4 flex-wrap">
                      <span className={`text-xs flex items-center gap-1.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                        <User size={12} /> {agent.submitter} · {agent.submitterDept}
                      </span>
                      <span className={`text-xs flex items-center gap-1.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                        <Clock size={12} /> {agent.submitTime}
                      </span>
                    </div>
                  </div>

                  {agent.status === 'pending_review' && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => setDetailTarget(agent)}
                        className={`p-2 rounded-xl transition-colors ${isDark ? 'hover:bg-white/10 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}
                        title="查看详情"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={() => setApproveTarget(agent)}
                        className={`px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors ${
                          isDark ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                        }`}
                      >
                        <CheckCircle2 size={14} />
                        通过
                      </button>
                      <button
                        onClick={() => setRejectTarget(agent)}
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
                通过后该 Agent 将进入测试阶段，测试完成后可发布上线。
              </p>
              <div className="flex justify-end gap-3">
                <button onClick={() => setApproveTarget(null)} className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${isDark ? 'bg-white/10 text-slate-300 hover:bg-white/15' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
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
                <button onClick={() => { setRejectTarget(null); setRejectReason(''); }} className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${isDark ? 'bg-white/10 text-slate-300 hover:bg-white/15' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
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
                <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Agent 详情</h3>
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
                <button onClick={() => setDetailTarget(null)} className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${isDark ? 'bg-white/10 text-slate-300 hover:bg-white/15' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
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
