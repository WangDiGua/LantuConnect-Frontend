import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wrench, Eye, Pencil, Undo2, ArrowRight, X } from 'lucide-react';
import type { Theme, FontSize } from '../../types';
import type { AgentStatus } from '../../types/dto/agent';

interface Props {
  theme: Theme;
  fontSize: FontSize;
}

interface MySkill {
  id: number;
  displayName: string;
  description: string;
  agentType: 'mcp' | 'http_api' | 'builtin';
  status: AgentStatus;
  submitTime: string;
  reviewComment: string | null;
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

const INITIAL_SKILLS: MySkill[] = [
  { id: 1, displayName: '天气查询', description: '实时查询指定城市天气', agentType: 'http_api', status: 'published', submitTime: '2026-03-08 10:20', reviewComment: null },
  { id: 2, displayName: '文档摘要生成', description: '对上传文档进行自动摘要', agentType: 'mcp', status: 'pending_review', submitTime: '2026-03-19 14:50', reviewComment: null },
  { id: 3, displayName: '邮件发送工具', description: '发送格式化通知邮件', agentType: 'http_api', status: 'draft', submitTime: '2026-03-21 09:00', reviewComment: null },
  { id: 4, displayName: '成绩导出工具', description: '将成绩数据导出为 Excel', agentType: 'http_api', status: 'rejected', submitTime: '2026-03-14 16:30', reviewComment: '缺少参数 Schema 定义，需补充输入输出格式说明' },
];

export const MySkillList: React.FC<Props> = ({ theme, fontSize }) => {
  const isDark = theme === 'dark';
  const [skills, setSkills] = useState<MySkill[]>(INITIAL_SKILLS);
  const [withdrawTarget, setWithdrawTarget] = useState<MySkill | null>(null);

  const handleWithdraw = (skill: MySkill) => {
    setSkills(prev => prev.map(s => s.id === skill.id ? { ...s, status: 'draft' as AgentStatus } : s));
    setWithdrawTarget(null);
  };

  const StatusBadge: React.FC<{ status: AgentStatus }> = ({ status }) => {
    const cfg = STATUS_CONFIG[status];
    return (
      <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold ${isDark ? `${cfg.darkBg} ${cfg.darkText}` : `${cfg.bg} ${cfg.text}`}`}>
        {cfg.label}
      </span>
    );
  };

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
    <div className={`flex-1 flex flex-col min-h-0 overflow-hidden ${isDark ? 'bg-[#000000]' : 'bg-[#F2F2F7]'}`}>
      <div className={`shrink-0 z-20 border-b px-4 sm:px-6 py-4 flex items-center justify-between ${isDark ? 'border-white/10 bg-[#000000]' : 'border-slate-200/80 bg-[#F2F2F7]'}`}>
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl ${isDark ? 'bg-purple-500/20' : 'bg-purple-50'}`}>
            <Wrench size={20} className={isDark ? 'text-purple-400' : 'text-purple-600'} />
          </div>
          <div>
            <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>我的 Skill</h2>
            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>管理您提交的技能，跟踪审核进度</p>
          </div>
        </div>
        <span className={`text-xs px-3 py-1.5 rounded-lg font-medium ${isDark ? 'bg-white/5 text-slate-400' : 'bg-white text-slate-500 border border-slate-200'}`}>
          共 {skills.length} 个
        </span>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-4 sm:px-6 py-4">
        <div className="space-y-3">
          {skills.map((skill) => (
            <motion.div
              key={skill.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`rounded-2xl border p-4 sm:p-5 transition-colors ${isDark ? 'bg-[#1C1C1E] border-white/10 hover:border-white/20' : 'bg-white border-slate-200/80 hover:border-slate-300'}`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className={`font-bold truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>{skill.displayName}</h3>
                    <StatusBadge status={skill.status} />
                    <span className={`text-xs px-2 py-0.5 rounded-md ${isDark ? 'bg-white/5 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                      {skill.agentType}
                    </span>
                  </div>
                  <p className={`text-sm mb-3 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{skill.description}</p>
                  <StatusFlow current={skill.status} />
                  <div className="flex items-center gap-4 mt-2">
                    <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>提交时间: {skill.submitTime}</span>
                  </div>
                  {skill.status === 'rejected' && skill.reviewComment && (
                    <div className={`mt-3 p-3 rounded-xl text-xs ${isDark ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-red-50 text-red-600 border border-red-200'}`}>
                      <span className="font-semibold">驳回原因：</span>{skill.reviewComment}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button className={`p-2 rounded-xl transition-colors ${isDark ? 'hover:bg-white/10 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`} title="查看">
                    <Eye size={16} />
                  </button>
                  {(skill.status === 'draft' || skill.status === 'rejected') && (
                    <button className={`p-2 rounded-xl transition-colors ${isDark ? 'hover:bg-white/10 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`} title="编辑">
                      <Pencil size={16} />
                    </button>
                  )}
                  {skill.status === 'pending_review' && (
                    <button
                      onClick={() => setWithdrawTarget(skill)}
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
    </div>
  );
};
