import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { GitBranch, Plus, ArrowUpCircle, RotateCcw, Clock, FileText, ArrowRight, ChevronDown, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Theme, FontSize } from '../../types';
import type { Agent, AgentVersion } from '../../types/dto/agent';
import { agentService } from '../../api/services/agent.service';
import { versionService } from '../../api/services/version.service';
import { BentoCard } from '../../components/common/BentoCard';
import { Modal } from '../../components/common/Modal';
import { nativeInputClass } from '../../utils/formFieldClasses';
import { LantuSelect } from '../../components/common/LantuSelect';
import {
  canvasBodyBg, btnPrimary, btnSecondary, btnGhost, textPrimary, textSecondary, textMuted,
} from '../../utils/uiClasses';
import { useLayoutChrome } from '../../context/LayoutChromeContext';
import { formatDateTime } from '../../utils/formatDateTime';
import { PageTitleTagline } from '../../components/common/PageTitleTagline';

interface Props { theme: Theme; fontSize: FontSize; }
type VersionStatus = 'draft' | 'testing' | 'released' | 'rollback';

const STATUS_CONFIG: Record<VersionStatus, { label: string; light: string; dark: string; dot: string }> = {
  draft:    { label: '草稿',   light: 'bg-slate-50 text-slate-600 ring-1 ring-slate-200/60', dark: 'bg-slate-500/10 text-slate-400 ring-1 ring-slate-500/20', dot: 'bg-slate-400' },
  testing:  { label: '测试�?, light: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200/60',   dark: 'bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/20',   dot: 'bg-blue-500' },
  released: { label: '已发�?, light: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60', dark: 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20', dot: 'bg-emerald-500' },
  rollback: { label: '已回�?, light: 'bg-orange-50 text-orange-700 ring-1 ring-orange-200/60', dark: 'bg-orange-500/10 text-orange-400 ring-1 ring-orange-500/20', dot: 'bg-orange-500' },
};

export const AgentVersionPage: React.FC<Props> = ({ theme }) => {
  const { chromePageTitle } = useLayoutChrome();
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

  useEffect(() => { agentService.list({ pageSize: 100 }).then(res => setAgents(res.list)).catch(err => console.error(err)).finally(() => setAgentsLoading(false)); }, []);

  const fetchVersions = useCallback((agentId: number) => { setVersionsLoading(true); versionService.list(agentId).then(data => setVersions(data)).catch(err => console.error(err)).finally(() => setVersionsLoading(false)); }, []);

  useEffect(() => { if (selectedAgentId) fetchVersions(selectedAgentId as number); else setVersions([]); }, [selectedAgentId, fetchVersions]);

  const selectedAgent = agents.find((a) => a.id === selectedAgentId);

  const handleCreateVersion = () => {
    if (!selectedAgentId || !newVersion.trim()) return;
    versionService.create(selectedAgentId as number, { version: newVersion.startsWith('v') ? newVersion : `v${newVersion}`, changelog: newChangelog || '(无变更说�?' })
      .then(() => { setNewVersion(''); setNewChangelog(''); setShowCreateModal(false); fetchVersions(selectedAgentId as number); })
      .catch(err => console.error(err));
  };

  const handlePublish = (versionId: number) => { versionService.publish(versionId).then(() => fetchVersions(selectedAgentId as number)).catch(err => console.error(err)); };
  const handleRollback = (versionId: number) => { versionService.rollback(versionId).then(() => fetchVersions(selectedAgentId as number)).catch(err => console.error(err)); };

  const versionAData = versions.find((v) => v.id === compareA);
  const versionBData = versions.find((v) => v.id === compareB);

  const agentSelectOptions = useMemo(
    () => [
      { value: '', label: agentsLoading ? '加载中�? : '选择 Agent�? },
      ...agents.map((a) => ({ value: String(a.id), label: a.displayName })),
    ],
    [agents, agentsLoading],
  );

  const versionOptionsA = useMemo(
    () => [
      { value: '', label: '选择版本 A�? },
      ...versions.map((v) => ({
        value: String(v.id),
        label: `${v.version} (${STATUS_CONFIG[v.status].label})`,
      })),
    ],
    [versions],
  );

  const versionOptionsB = useMemo(
    () => [
      { value: '', label: '选择版本 B�? },
      ...versions.map((v) => ({
        value: String(v.id),
        label: `${v.version} (${STATUS_CONFIG[v.status].label})`,
      })),
    ],
    [versions],
  );

  return (
    <div className={`flex-1 flex flex-col min-h-0 overflow-hidden transition-colors duration-300 ${canvasBodyBg(theme)}`}>
      <div className="flex-1 min-h-0 overflow-y-auto px-2 sm:px-3 lg:px-4 py-2 sm:py-3 space-y-4">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className={`shrink-0 rounded-xl p-2 ${isDark ? 'bg-blue-500/15' : 'bg-blue-50'}`}><GitBranch size={20} className={isDark ? 'text-blue-400' : 'text-blue-600'} /></div>
            <PageTitleTagline subtitleOnly theme={theme} title={chromePageTitle || '版本管理'} tagline="Agent 版本迭代、发布与回滚" />
          </div>
          <div className="flex items-center gap-2">
            <div className="relative min-w-[12rem]">
              <LantuSelect
                theme={theme}
                value={selectedAgentId === '' ? '' : String(selectedAgentId)}
                onChange={(v) => {
                  setSelectedAgentId(v ? Number(v) : '');
                  setCompareMode(false);
                  setCompareA('');
                  setCompareB('');
                }}
                options={agentSelectOptions}
              />
            </div>
            {selectedAgentId && (
              <>
                <button type="button" onClick={() => setCompareMode((v) => !v)} className={compareMode ? btnPrimary : btnSecondary(theme)}><ArrowRight size={14} /> 对比</button>
                <button type="button" onClick={() => setShowCreateModal(true)} className={btnPrimary}><Plus size={14} /> 创建新版�?/button>
              </>
            )}
          </div>
        </div>

        {!selectedAgentId ? (
          <BentoCard theme={theme} className="p-12 text-center">
            <GitBranch size={48} className={`mx-auto mb-4 ${textMuted(theme)}`} />
            <p className={`text-lg font-medium ${textSecondary(theme)}`}>请先选择一�?Agent</p>
            <p className={`text-sm mt-1 ${textMuted(theme)}`}>选择后可查看和管理其版本历史</p>
          </BentoCard>
        ) : versionsLoading ? (
          <BentoCard theme={theme} className="p-12 text-center">
            <Loader2 size={32} className={`mx-auto mb-3 animate-spin ${textMuted(theme)}`} />
            <p className={`text-sm ${textMuted(theme)}`}>加载版本列表�?/p>
          </BentoCard>
        ) : (
          <>
            {/* Agent info bar */}
            <BentoCard theme={theme} padding="sm" className="flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-neutral-900 flex items-center justify-center text-white text-lg font-bold">{selectedAgent?.displayName.charAt(0)}</div>
                <div>
                  <p className={`font-bold ${textPrimary(theme)}`}>{selectedAgent?.displayName}</p>
                  <p className={`text-xs font-mono ${textMuted(theme)}`}>{selectedAgent?.agentName}</p>
                </div>
              </div>
              <div className={`flex items-center gap-4 text-xs ${textSecondary(theme)}`}>
                <span>�?{versions.length} 个版�?/span>
                <span>当前: <span className="font-bold text-emerald-500">{versions.find((v) => v.status === 'released')?.version || '�?}</span></span>
              </div>
            </BentoCard>

            {/* Timeline */}
            <BentoCard theme={theme}>
              <div className="space-y-0">
                {versions.map((v, idx) => {
                  const sc = STATUS_CONFIG[v.status];
                  const isLast = idx === versions.length - 1;
                  return (
                    <div key={v.id} className="flex gap-4">
                      <div className="flex flex-col items-center w-8 shrink-0">
                        <div className={`w-3 h-3 rounded-full shrink-0 z-10 ${sc.dot}`} />
                        {!isLast && <div className={`w-0.5 flex-1 ${isDark ? 'bg-white/10' : 'bg-slate-200'}`} />}
                      </div>
                      <div className={`flex-1 ${isLast ? 'pb-2' : 'pb-6'}`}>
                        <div className={`rounded-xl border p-4 transition-colors ${isDark ? 'border-white/[0.04] hover:border-white/10 bg-white/[0.02]' : 'border-slate-100 hover:border-slate-200 bg-slate-50/50'}`}>
                          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2">
                              <span className={`text-base font-bold font-mono ${textPrimary(theme)}`}>{v.version}</span>
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${isDark ? sc.dark : sc.light}`}>{sc.label}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              {(v.status === 'draft' || v.status === 'testing') && (
                                <button type="button" onClick={() => handlePublish(v.id)} className={`${btnGhost(theme)} !text-emerald-500`}><ArrowUpCircle size={13} /> 发布</button>
                              )}
                              {v.status === 'released' && (
                                <button type="button" onClick={() => handleRollback(v.id)} className={`${btnGhost(theme)} !text-orange-500`}><RotateCcw size={13} /> 回滚</button>
                              )}
                            </div>
                          </div>
                          <p className={`text-sm leading-relaxed mb-2 ${textSecondary(theme)}`}>{v.changelog}</p>
                          <div className={`flex items-center gap-1.5 text-xs ${textMuted(theme)}`}><Clock size={12} /> {formatDateTime(v.createTime)}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </BentoCard>

            {/* Version Comparison */}
            {compareMode && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <BentoCard theme={theme}>
                  <h3 className={`font-bold mb-4 flex items-center gap-2 ${textPrimary(theme)}`}><ArrowRight size={18} className="text-neutral-800" /> 版本对比</h3>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <LantuSelect
                      theme={theme}
                      value={compareA === '' ? '' : String(compareA)}
                      onChange={(v) => setCompareA(v ? Number(v) : '')}
                      options={versionOptionsA}
                    />
                    <LantuSelect
                      theme={theme}
                      value={compareB === '' ? '' : String(compareB)}
                      onChange={(v) => setCompareB(v ? Number(v) : '')}
                      options={versionOptionsB}
                    />
                  </div>
                  {versionAData && versionBData ? (
                    <div className="grid grid-cols-2 gap-4">
                      {[versionAData, versionBData].map((vd) => {
                        const s = STATUS_CONFIG[vd.status];
                        return (
                          <div key={vd.id} className={`rounded-xl border p-4 ${isDark ? 'border-white/[0.04] bg-white/[0.02]' : 'border-slate-100 bg-slate-50/50'}`}>
                            <div className="flex items-center gap-2 mb-3">
                              <span className={`font-bold font-mono ${textPrimary(theme)}`}>{vd.version}</span>
                              <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${isDark ? s.dark : s.light}`}>{s.label}</span>
                            </div>
                            <div className="space-y-2">
                              <div><label className={`text-[11px] font-medium ${textMuted(theme)}`}>变更说明</label><p className={`text-sm mt-0.5 ${textSecondary(theme)}`}>{vd.changelog}</p></div>
                              <div><label className={`text-[11px] font-medium ${textMuted(theme)}`}>时间</label><p className={`text-sm font-mono mt-0.5 ${textSecondary(theme)}`}>{formatDateTime(vd.createTime)}</p></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className={`text-sm text-center py-6 ${textMuted(theme)}`}>请在上方选择两个版本进行对比</p>
                  )}
                </BentoCard>
              </motion.div>
            )}
          </>
        )}
      </div>

      {/* Create Version Modal */}
      <Modal open={showCreateModal} onClose={() => setShowCreateModal(false)} title="创建新版�? theme={theme} size="md" footer={<><button type="button" className={btnSecondary(theme)} onClick={() => setShowCreateModal(false)}>取消</button><button type="button" className={btnPrimary} onClick={handleCreateVersion} disabled={!newVersion.trim()}><Plus size={14} /> 创建版本</button></>}>
        <div className="space-y-4">
          <div><label className={`text-xs font-semibold block mb-1 ${textSecondary(theme)}`}>版本�?/label><input type="text" value={newVersion} onChange={(e) => setNewVersion(e.target.value)} placeholder="例如: v2.2.0" className={nativeInputClass(theme)} /></div>
          <div><label className={`text-xs font-semibold block mb-1 ${textSecondary(theme)}`}>变更说明</label><textarea value={newChangelog} onChange={(e) => setNewChangelog(e.target.value)} placeholder="描述本次版本的主要变更内容�? rows={4} className={`${nativeInputClass(theme)} resize-none`} /></div>
          <div className={`flex items-start gap-2 p-3 rounded-xl text-xs ${isDark ? 'bg-neutral-900/10 text-neutral-300' : 'bg-neutral-100 text-neutral-900'}`}>
            <FileText size={14} className="shrink-0 mt-0.5" />
            <span>创建版本时将自动保存当前 Agent 配置快照�?/span>
          </div>
        </div>
      </Modal>
    </div>
  );
};
