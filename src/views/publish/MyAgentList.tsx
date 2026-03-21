import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Eye, Pencil, Undo2, ArrowRight, X } from 'lucide-react';
import type { Theme, FontSize } from '../../types';
import type { AgentStatus } from '../../types/dto/agent';
import { statusBadgeClass, statusLabel, pageBg } from '../../utils/uiClasses';
import type { DomainStatus } from '../../utils/uiClasses';
import { Modal } from '../../components/common/Modal';
import { btnPrimary, btnSecondary } from '../../utils/uiClasses';
import { nativeInputClass } from '../../utils/formFieldClasses';

interface Props {
  theme: Theme;
  fontSize: FontSize;
}

interface MyAgent {
  id: number;
  displayName: string;
  description: string;
  agentType: 'mcp' | 'http_api' | 'builtin';
  status: AgentStatus;
  submitTime: string;
  reviewComment: string | null;
  specUrl?: string;
}

const STATUS_CONFIG: Record<AgentStatus, { label: string; bg: string; text: string; darkBg: string; darkText: string }> = {
  draft:          { label: '草稿',   bg: 'bg-slate-100',   text: 'text-slate-600',  darkBg: 'bg-slate-700/40',    darkText: 'text-slate-300' },
  pending_review: { label: '待审核', bg: 'bg-amber-50',    text: 'text-amber-700',  darkBg: 'bg-amber-500/20',    darkText: 'text-amber-400' },
  testing:        { label: '测试中', bg: 'bg-blue-50',     text: 'text-blue-700',   darkBg: 'bg-blue-500/20',     darkText: 'text-blue-400' },
  published:      { label: '已发布', bg: 'bg-emerald-50',  text: 'text-emerald-700',darkBg: 'bg-emerald-500/20',  darkText: 'text-emerald-400' },
  rejected:       { label: '已驳回', bg: 'bg-red-50',      text: 'text-red-700',    darkBg: 'bg-red-500/20',      darkText: 'text-red-400' },
  deprecated:     { label: '已废弃', bg: 'bg-slate-100',   text: 'text-slate-500',  darkBg: 'bg-slate-700/40',    darkText: 'text-slate-400' },
};

const STATUS_FLOW: AgentStatus[] = ['draft', 'pending_review', 'testing', 'published'];

const INITIAL_AGENTS: MyAgent[] = [
  { id: 1, displayName: '课表查询助手', description: '自动查询学期课表安排', agentType: 'http_api', status: 'published', submitTime: '2026-03-10 14:30', reviewComment: null, specUrl: 'https://api.example.com/schedule' },
  { id: 2, displayName: '图书检索 Agent', description: '接入图书馆检索 API', agentType: 'http_api', status: 'pending_review', submitTime: '2026-03-18 09:15', reviewComment: null, specUrl: 'https://api.example.com/library' },
  { id: 3, displayName: '教务通知推送', description: '汇总教务处通知并推送', agentType: 'mcp', status: 'draft', submitTime: '2026-03-20 16:00', reviewComment: null, specUrl: '' },
  { id: 4, displayName: '成绩分析 Agent', description: '分析学生各科成绩趋势', agentType: 'http_api', status: 'rejected', submitTime: '2026-03-15 11:00', reviewComment: '描述信息不够详细，请补充接口说明和使用场景', specUrl: 'https://api.example.com/grade' },
  { id: 5, displayName: '校园导航 Bot', description: '校内路线规划与导航', agentType: 'builtin', status: 'testing', submitTime: '2026-03-17 08:45', reviewComment: null, specUrl: '' },
];

export const MyAgentList: React.FC<Props> = ({ theme, fontSize }) => {
  const isDark = theme === 'dark';
  const [agents, setAgents] = useState<MyAgent[]>(INITIAL_AGENTS);
  const [withdrawTarget, setWithdrawTarget] = useState<MyAgent | null>(null);
  const [viewTarget, setViewTarget] = useState<MyAgent | null>(null);
  const [editTarget, setEditTarget] = useState<MyAgent | null>(null);
  const [editForm, setEditForm] = useState({ displayName: '', description: '', agentType: 'http_api' as MyAgent['agentType'], specUrl: '' });

  const inputCls = nativeInputClass(theme);
  const labelCls = `block text-xs font-medium mb-1 ${isDark ? 'text-slate-300' : 'text-slate-600'}`;

  const handleWithdraw = (agent: MyAgent) => {
    setAgents(prev => prev.map(a => a.id === agent.id ? { ...a, status: 'draft' as AgentStatus } : a));
    setWithdrawTarget(null);
  };

  const openEdit = (agent: MyAgent) => {
    setEditForm({ displayName: agent.displayName, description: agent.description, agentType: agent.agentType, specUrl: agent.specUrl ?? '' });
    setEditTarget(agent);
  };

  const saveEdit = () => {
    if (!editTarget || !editForm.displayName.trim()) return;
    setAgents(prev => prev.map(a =>
      a.id === editTarget.id
        ? { ...a, displayName: editForm.displayName.trim(), description: editForm.description.trim(), agentType: editForm.agentType, specUrl: editForm.specUrl }
        : a
    ));
    setEditTarget(null);
  };

  const StatusBadge: React.FC<{ status: AgentStatus }> = ({ status }) => (
    <span className={statusBadgeClass(status as DomainStatus, theme)}>
      {statusLabel(status as DomainStatus)}
    </span>
  );

  const StatusFlow: React.FC<{ current: AgentStatus }> = ({ current }) => {
    const currentIdx = STATUS_FLOW.indexOf(current);
    return (
      <div className="flex items-center gap-1">
        {STATUS_FLOW.map((s, i) => {
          const cfg = STATUS_CONFIG[s];
          const isActive = s === current;
          const isPast = currentIdx >= 0 && i < currentIdx;
          return (
            <React.Fragment key={s}>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium transition-all ${
                isActive
                  ? isDark ? `${cfg.darkBg} ${cfg.darkText}` : `${cfg.bg} ${cfg.text}`
                  : isPast
                    ? isDark ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600'
                    : isDark ? 'bg-white/5 text-slate-500' : 'bg-slate-100 text-slate-400'
              }`}>
                {cfg.label}
              </span>
              {i < STATUS_FLOW.length - 1 && (
                <ArrowRight size={10} className={isPast || isActive ? (isDark ? 'text-emerald-400' : 'text-emerald-500') : (isDark ? 'text-slate-600' : 'text-slate-300')} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    );
  };

  return (
    <div className={`flex-1 flex flex-col min-h-0 overflow-hidden ${pageBg(theme)}`}>
      <div className={`shrink-0 z-20 border-b px-4 sm:px-6 py-4 flex items-center justify-between ${isDark ? 'border-white/10' : 'border-slate-200/80'} ${pageBg(theme)}`}>
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl ${isDark ? 'bg-blue-500/20' : 'bg-blue-50'}`}>
            <Bot size={20} className={isDark ? 'text-blue-400' : 'text-blue-600'} />
          </div>
          <div>
            <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>我的 Agent</h2>
            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>管理您提交的 Agent，跟踪审核进度</p>
          </div>
        </div>
        <span className={`text-xs px-3 py-1.5 rounded-lg font-medium ${isDark ? 'bg-white/5 text-slate-400' : 'bg-white text-slate-500 border border-slate-200'}`}>
          共 {agents.length} 个
        </span>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-4 sm:px-6 py-4">
        <div className="space-y-3">
          {agents.map((agent) => (
            <motion.div
              key={agent.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`rounded-2xl border p-4 sm:p-5 transition-colors ${isDark ? 'bg-[#1C1C1E] border-white/10 hover:border-white/20' : 'bg-white border-slate-200/80 hover:border-slate-300'}`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className={`font-bold truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>{agent.displayName}</h3>
                    <StatusBadge status={agent.status} />
                    <span className={`text-xs px-2 py-0.5 rounded-md ${isDark ? 'bg-white/5 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                      {agent.agentType}
                    </span>
                  </div>
                  <p className={`text-sm mb-3 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{agent.description}</p>
                  <StatusFlow current={agent.status} />
                  <div className="flex items-center gap-4 mt-2">
                    <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>提交时间: {agent.submitTime}</span>
                  </div>
                  {agent.status === 'rejected' && agent.reviewComment && (
                    <div className={`mt-3 p-3 rounded-xl text-xs ${isDark ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-red-50 text-red-600 border border-red-200'}`}>
                      <span className="font-semibold">驳回原因：</span>{agent.reviewComment}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setViewTarget(agent)}
                    className={`p-2 rounded-xl transition-colors ${isDark ? 'hover:bg-white/10 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}
                    title="查看"
                  >
                    <Eye size={16} />
                  </button>
                  {(agent.status === 'draft' || agent.status === 'rejected') && (
                    <button
                      onClick={() => openEdit(agent)}
                      className={`p-2 rounded-xl transition-colors ${isDark ? 'hover:bg-white/10 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}
                      title="编辑"
                    >
                      <Pencil size={16} />
                    </button>
                  )}
                  {agent.status === 'pending_review' && (
                    <button
                      onClick={() => setWithdrawTarget(agent)}
                      className={`p-2 rounded-xl transition-colors ${isDark ? 'hover:bg-amber-500/20 text-amber-400' : 'hover:bg-amber-50 text-amber-600'}`}
                      title="撤回"
                    >
                      <Undo2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* 撤回确认弹窗 */}
      <AnimatePresence>
        {withdrawTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
            onClick={() => setWithdrawTarget(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className={`w-full max-w-md mx-4 p-6 rounded-2xl border shadow-2xl ${isDark ? 'bg-[#1C1C1E] border-white/10' : 'bg-white border-slate-200'}`}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>确认撤回</h3>
                <button onClick={() => setWithdrawTarget(null)} className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-white/10' : 'hover:bg-slate-100'}`}>
                  <X size={18} className={isDark ? 'text-slate-400' : 'text-slate-500'} />
                </button>
              </div>
              <p className={`text-sm mb-6 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                确定要撤回 <strong>{withdrawTarget.displayName}</strong> 的审核申请吗？撤回后状态将恢复为草稿。
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setWithdrawTarget(null)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${isDark ? 'bg-white/10 text-slate-300 hover:bg-white/15' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                >
                  取消
                </button>
                <button
                  onClick={() => handleWithdraw(withdrawTarget)}
                  className="px-4 py-2 rounded-xl text-sm font-medium bg-amber-500 text-white hover:bg-amber-600 transition-colors"
                >
                  确认撤回
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 详情查看弹窗 */}
      <Modal open={!!viewTarget} onClose={() => setViewTarget(null)} title="Agent 详情" theme={theme} size="lg">
        {viewTarget && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>名称</span>
                <p className={`text-sm font-semibold mt-0.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>{viewTarget.displayName}</p>
              </div>
              <div>
                <span className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>类型</span>
                <p className={`text-sm mt-0.5 ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>{viewTarget.agentType}</p>
              </div>
              <div>
                <span className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>状态</span>
                <div className="mt-1"><StatusBadge status={viewTarget.status} /></div>
              </div>
              <div>
                <span className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>提交时间</span>
                <p className={`text-sm mt-0.5 ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>{viewTarget.submitTime}</p>
              </div>
            </div>
            <div>
              <span className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>描述</span>
              <p className={`text-sm mt-0.5 ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>{viewTarget.description}</p>
            </div>
            {viewTarget.specUrl && (
              <div>
                <span className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>接口地址</span>
                <p className={`text-sm mt-0.5 font-mono ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{viewTarget.specUrl}</p>
              </div>
            )}
            {viewTarget.reviewComment && (
              <div className={`p-3 rounded-xl text-xs ${isDark ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-red-50 text-red-600 border border-red-200'}`}>
                <span className="font-semibold">驳回原因：</span>{viewTarget.reviewComment}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* 编辑弹窗 */}
      <Modal
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        title="编辑 Agent"
        theme={theme}
        size="lg"
        footer={
          <>
            <button className={btnSecondary(theme)} onClick={() => setEditTarget(null)}>取消</button>
            <button className={btnPrimary} onClick={saveEdit}>保存</button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className={labelCls}>显示名称</label>
            <input className={inputCls} value={editForm.displayName} onChange={e => setEditForm(f => ({ ...f, displayName: e.target.value }))} />
          </div>
          <div>
            <label className={labelCls}>描述</label>
            <textarea className={`${inputCls} min-h-[5rem]`} rows={3} value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div>
            <label className={labelCls}>Agent 类型</label>
            <select className={inputCls} value={editForm.agentType} onChange={e => setEditForm(f => ({ ...f, agentType: e.target.value as MyAgent['agentType'] }))}>
              <option value="http_api">http_api</option>
              <option value="mcp">mcp</option>
              <option value="builtin">builtin</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>接口地址 (specJson.url)</label>
            <input className={inputCls} value={editForm.specUrl} onChange={e => setEditForm(f => ({ ...f, specUrl: e.target.value }))} placeholder="https://..." />
          </div>
        </div>
      </Modal>
    </div>
  );
};
