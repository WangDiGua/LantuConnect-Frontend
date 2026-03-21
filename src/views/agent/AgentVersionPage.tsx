import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  GitBranch,
  Plus,
  ArrowUpCircle,
  RotateCcw,
  CheckCircle2,
  Clock,
  FileText,
  X,
  ChevronDown,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Theme, FontSize } from '../../types';
import type { Agent, AgentVersion } from '../../types/dto/agent';
import { agentService } from '../../api/services/agent.service';
import { versionService } from '../../api/services/version.service';

interface Props {
  theme: Theme;
  fontSize: FontSize;
}

type VersionStatus = 'draft' | 'testing' | 'released' | 'rollback';

const STATUS_CONFIG: Record<VersionStatus, { label: string; color: string; bgLight: string; bgDark: string }> = {
  draft: { label: '草稿', color: 'text-slate-600', bgLight: 'bg-slate-100', bgDark: 'bg-slate-700/40' },
  testing: { label: '测试中', color: 'text-blue-600', bgLight: 'bg-blue-100', bgDark: 'bg-blue-900/40' },
  released: { label: '已发布', color: 'text-emerald-600', bgLight: 'bg-emerald-100', bgDark: 'bg-emerald-900/40' },
  rollback: { label: '已回滚', color: 'text-orange-600', bgLight: 'bg-orange-100', bgDark: 'bg-orange-900/40' },
};

export const AgentVersionPage: React.FC<Props> = ({ theme, fontSize }) => {
  const isDark = theme === 'dark';
  const [agents, setAgents] = useState<Agent[]>([]);
  const [agentsLoading, setAgentsLoading] = useState(true);
  const [selectedAgentId, setSelectedAgentId] = useState<number | ''>('');
  const [versions, setVersions] = useState<AgentVersion[]>([]);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newVersion, setNewVersion] = useState('');
  const [newChangelog, setNewChangelog] = useState('');
  const [compareMode, setCompareMode] = useState(false);
  const [compareA, setCompareA] = useState<number | ''>('');
  const [compareB, setCompareB] = useState<number | ''>('');

  useEffect(() => {
    agentService.list({ pageSize: 100 })
      .then(res => setAgents(res.list))
      .catch(err => console.error(err))
      .finally(() => setAgentsLoading(false));
  }, []);

  const fetchVersions = useCallback((agentId: number) => {
    setVersionsLoading(true);
    versionService.list(agentId)
      .then(data => setVersions(data))
      .catch(err => console.error(err))
      .finally(() => setVersionsLoading(false));
  }, []);

  useEffect(() => {
    if (selectedAgentId) {
      fetchVersions(selectedAgentId as number);
    } else {
      setVersions([]);
    }
  }, [selectedAgentId, fetchVersions]);

  const selectedAgent = agents.find((a) => a.id === selectedAgentId);

  const handleCreateVersion = () => {
    if (!selectedAgentId || !newVersion.trim()) return;
    versionService.create(selectedAgentId as number, {
      version: newVersion.startsWith('v') ? newVersion : `v${newVersion}`,
      changelog: newChangelog || '(无变更说明)',
    })
      .then(() => {
        setNewVersion('');
        setNewChangelog('');
        setShowCreateModal(false);
        fetchVersions(selectedAgentId as number);
      })
      .catch(err => console.error(err));
  };

  const handlePublish = (versionId: number) => {
    versionService.publish(versionId)
      .then(() => fetchVersions(selectedAgentId as number))
      .catch(err => console.error(err));
  };

  const handleRollback = (versionId: number) => {
    versionService.rollback(versionId)
      .then(() => fetchVersions(selectedAgentId as number))
      .catch(err => console.error(err));
  };

  const cardCls = `rounded-2xl border shadow-none ${isDark ? 'bg-[#1C1C1E] border-white/10' : 'bg-white border-slate-200/80'}`;
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';
  const textMuted = isDark ? 'text-slate-500' : 'text-slate-400';

  const versionAData = versions.find((v) => v.id === compareA);
  const versionBData = versions.find((v) => v.id === compareB);

  return (
    <div className={`flex-1 flex flex-col min-h-0 overflow-hidden ${isDark ? 'bg-[#000000]' : 'bg-[#F2F2F7]'}`}>
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-2 sm:px-3 lg:px-4 py-2 sm:py-3">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${isDark ? 'bg-white/10' : 'bg-white border border-slate-200/80'}`}>
              <GitBranch size={22} className="text-blue-500" />
            </div>
            <div>
              <h1 className={`text-xl font-bold ${textPrimary}`}>版本管理</h1>
              <p className={`text-xs ${textMuted}`}>管理 Agent 版本迭代、发布与回滚</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Agent Selector */}
            <div className="relative">
              <select
                value={selectedAgentId}
                onChange={(e) => {
                  setSelectedAgentId(e.target.value ? Number(e.target.value) : '');
                  setCompareMode(false);
                  setCompareA('');
                  setCompareB('');
                }}
                className={`appearance-none pr-8 pl-4 py-2.5 rounded-xl text-sm font-medium border transition-colors cursor-pointer ${
                  isDark
                    ? 'bg-[#1C1C1E] border-white/10 text-white'
                    : 'bg-white border-slate-200 text-slate-900'
                } ${fontSize === 'small' ? 'text-xs' : 'text-sm'}`}
              >
                <option value="">{agentsLoading ? '加载中…' : '选择 Agent…'}</option>
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>{a.displayName}</option>
                ))}
              </select>
              <ChevronDown size={14} className={`absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none ${textMuted}`} />
            </div>
            {selectedAgentId && (
              <>
                <button
                  type="button"
                  onClick={() => setCompareMode((v) => !v)}
                  className={`btn btn-sm h-9 min-h-0 gap-1.5 rounded-xl ${
                    compareMode ? 'btn-primary' : 'btn-ghost'
                  }`}
                >
                  <ArrowRight size={14} />
                  对比
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(true)}
                  className="btn btn-primary btn-sm h-9 min-h-0 gap-1.5 rounded-xl"
                >
                  <Plus size={14} />
                  创建新版本
                </button>
              </>
            )}
          </div>
        </div>

        {!selectedAgentId ? (
          <div className={`${cardCls} p-12 text-center`}>
            <GitBranch size={48} className={`mx-auto mb-4 ${textMuted}`} />
            <p className={`text-lg font-medium ${textSecondary}`}>请先选择一个 Agent</p>
            <p className={`text-sm mt-1 ${textMuted}`}>选择后可查看和管理其版本历史</p>
          </div>
        ) : versionsLoading ? (
          <div className={`${cardCls} p-12 text-center`}>
            <Loader2 size={32} className={`mx-auto mb-3 animate-spin ${textMuted}`} />
            <p className={`text-sm ${textMuted}`}>加载版本列表…</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Agent info bar */}
            <div className={`${cardCls} px-5 py-4 flex items-center justify-between`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white text-lg font-bold">
                  {selectedAgent?.displayName.charAt(0)}
                </div>
                <div>
                  <p className={`font-bold ${textPrimary}`}>{selectedAgent?.displayName}</p>
                  <p className={`text-xs font-mono ${textMuted}`}>{selectedAgent?.agentName}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <span className={textSecondary}>共 {versions.length} 个版本</span>
                <span className={textSecondary}>
                  当前版本: <span className="font-bold text-emerald-500">{versions.find((v) => v.status === 'released')?.version || '—'}</span>
                </span>
              </div>
            </div>

            {/* Version Timeline */}
            <div className={cardCls}>
              <div className="p-5 space-y-0">
                {versions.map((v, idx) => {
                  const statusCfg = STATUS_CONFIG[v.status];
                  const isLast = idx === versions.length - 1;
                  return (
                    <div key={v.id} className="flex gap-4">
                      {/* Timeline line */}
                      <div className="flex flex-col items-center w-8 shrink-0">
                        <div className={`w-3 h-3 rounded-full border-2 shrink-0 z-10 ${
                          v.status === 'released'
                            ? 'bg-emerald-500 border-emerald-300'
                            : v.status === 'testing'
                              ? 'bg-blue-500 border-blue-300'
                              : v.status === 'rollback'
                                ? 'bg-orange-500 border-orange-300'
                                : 'bg-slate-400 border-slate-300'
                        }`} />
                        {!isLast && (
                          <div className={`w-0.5 flex-1 ${isDark ? 'bg-white/10' : 'bg-slate-200'}`} />
                        )}
                      </div>
                      {/* Version Card */}
                      <div className={`flex-1 pb-6 ${isLast ? 'pb-2' : ''}`}>
                        <div className={`rounded-xl border p-4 transition-colors ${
                          isDark ? 'border-white/5 hover:border-white/10 bg-white/[0.02]' : 'border-slate-100 hover:border-slate-200 bg-slate-50/50'
                        }`}>
                          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2">
                              <span className={`text-base font-bold font-mono ${textPrimary}`}>{v.version}</span>
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-bold ${statusCfg.color} ${isDark ? statusCfg.bgDark : statusCfg.bgLight}`}>
                                {statusCfg.label}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              {(v.status === 'draft' || v.status === 'testing') && (
                                <button
                                  type="button"
                                  onClick={() => handlePublish(v.id)}
                                  className="btn btn-ghost btn-xs h-7 min-h-0 gap-1 rounded-lg text-emerald-600"
                                >
                                  <ArrowUpCircle size={13} />
                                  发布
                                </button>
                              )}
                              {v.status === 'released' && (
                                <button
                                  type="button"
                                  onClick={() => handleRollback(v.id)}
                                  className="btn btn-ghost btn-xs h-7 min-h-0 gap-1 rounded-lg text-orange-600"
                                >
                                  <RotateCcw size={13} />
                                  回滚到此版本
                                </button>
                              )}
                              {v.status === 'draft' && (
                                <button
                                  type="button"
                                  onClick={() => handlePublish(v.id)}
                                  className="btn btn-ghost btn-xs h-7 min-h-0 gap-1 rounded-lg text-blue-600"
                                >
                                  开始测试
                                </button>
                              )}
                            </div>
                          </div>
                          <p className={`text-sm leading-relaxed mb-2 ${textSecondary}`}>{v.changelog}</p>
                          <div className={`flex items-center gap-1.5 text-xs ${textMuted}`}>
                            <Clock size={12} />
                            {v.createTime}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Version Comparison */}
            {compareMode && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cardCls}
              >
                <div className="p-5">
                  <h3 className={`font-bold mb-4 flex items-center gap-2 ${textPrimary}`}>
                    <ArrowRight size={18} className="text-blue-500" />
                    版本对比
                  </h3>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <select
                      value={compareA}
                      onChange={(e) => setCompareA(e.target.value ? Number(e.target.value) : '')}
                      className={`rounded-xl border px-3 py-2 text-sm ${
                        isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
                      }`}
                    >
                      <option value="">选择版本 A…</option>
                      {versions.map((v) => (
                        <option key={v.id} value={v.id}>{v.version} ({STATUS_CONFIG[v.status].label})</option>
                      ))}
                    </select>
                    <select
                      value={compareB}
                      onChange={(e) => setCompareB(e.target.value ? Number(e.target.value) : '')}
                      className={`rounded-xl border px-3 py-2 text-sm ${
                        isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
                      }`}
                    >
                      <option value="">选择版本 B…</option>
                      {versions.map((v) => (
                        <option key={v.id} value={v.id}>{v.version} ({STATUS_CONFIG[v.status].label})</option>
                      ))}
                    </select>
                  </div>
                  {versionAData && versionBData ? (
                    <div className="grid grid-cols-2 gap-4">
                      {[versionAData, versionBData].map((vd) => {
                        const sc = STATUS_CONFIG[vd.status];
                        return (
                          <div
                            key={vd.id}
                            className={`rounded-xl border p-4 ${
                              isDark ? 'border-white/5 bg-white/[0.02]' : 'border-slate-100 bg-slate-50/50'
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-3">
                              <span className={`font-bold font-mono ${textPrimary}`}>{vd.version}</span>
                              <span className={`text-[11px] px-2 py-0.5 rounded-lg font-bold ${sc.color} ${isDark ? sc.bgDark : sc.bgLight}`}>
                                {sc.label}
                              </span>
                            </div>
                            <div className="space-y-2">
                              <div>
                                <label className={`text-[11px] font-medium ${textMuted}`}>变更说明</label>
                                <p className={`text-sm mt-0.5 ${textSecondary}`}>{vd.changelog}</p>
                              </div>
                              <div>
                                <label className={`text-[11px] font-medium ${textMuted}`}>时间</label>
                                <p className={`text-sm font-mono mt-0.5 ${textSecondary}`}>{vd.createTime}</p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className={`text-sm text-center py-6 ${textMuted}`}>请在上方选择两个版本进行对比</p>
                  )}
                </div>
              </motion.div>
            )}
          </div>
        )}
      </div>

      {/* Create Version Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50"
            onClick={() => setShowCreateModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className={`w-full max-w-lg rounded-2xl border p-6 ${
                isDark ? 'bg-[#1C1C1E] border-white/10' : 'bg-white border-slate-200'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className={`text-lg font-bold ${textPrimary}`}>创建新版本</h3>
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn btn-ghost btn-sm btn-circle">
                  <X size={18} />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className={`text-sm font-medium block mb-1.5 ${textSecondary}`}>版本号</label>
                  <input
                    type="text"
                    value={newVersion}
                    onChange={(e) => setNewVersion(e.target.value)}
                    placeholder="例如: v2.2.0"
                    className={`w-full px-4 py-2.5 rounded-xl border text-sm ${
                      isDark ? 'bg-white/5 border-white/10 text-white placeholder:text-slate-600' : 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400'
                    }`}
                  />
                </div>
                <div>
                  <label className={`text-sm font-medium block mb-1.5 ${textSecondary}`}>变更说明</label>
                  <textarea
                    value={newChangelog}
                    onChange={(e) => setNewChangelog(e.target.value)}
                    placeholder="描述本次版本的主要变更内容…"
                    rows={4}
                    className={`w-full px-4 py-2.5 rounded-xl border text-sm resize-none ${
                      isDark ? 'bg-white/5 border-white/10 text-white placeholder:text-slate-600' : 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400'
                    }`}
                  />
                </div>
                <div className={`flex items-start gap-2 p-3 rounded-xl text-xs ${
                  isDark ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-600'
                }`}>
                  <FileText size={14} className="shrink-0 mt-0.5" />
                  <span>创建版本时将自动保存当前 Agent 配置快照，包括连接参数、系统提示词、运行参数等。</span>
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-5">
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn btn-ghost btn-sm rounded-xl">
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleCreateVersion}
                  disabled={!newVersion.trim()}
                  className="btn btn-primary btn-sm rounded-xl gap-1.5"
                >
                  <Plus size={14} />
                  创建版本
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
