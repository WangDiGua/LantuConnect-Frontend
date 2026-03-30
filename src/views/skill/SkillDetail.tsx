import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Edit2, Trash2, FileText, Settings, BarChart3, Clock, Code2, Globe, Server } from 'lucide-react';
import type { Theme, FontSize } from '../../types';
import type { Skill } from '../../types/dto/skill';
import { skillService } from '../../api/services/skill.service';
import { buildPath } from '../../constants/consoleRoutes';
import { PageSkeleton } from '../../components/common/PageSkeleton';
import { PageError } from '../../components/common/PageError';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { DetailLayout } from '../../components/layout/PageLayouts';
import {
  canvasBodyBg, bentoCard, btnGhost, btnDanger,
  textPrimary, textSecondary, textMuted,
  statusBadgeClass, statusDot, statusLabel,
} from '../../utils/uiClasses';
import type { DomainStatus } from '../../utils/uiClasses';
import { formatDateTime } from '../../utils/formatDateTime';

interface Props { skillId: string; theme: Theme; fontSize: FontSize; onBack: () => void; }
const AGENT_TYPE_LABEL: Record<string, string> = { mcp: 'MCP 协议', http_api: 'HTTP API', builtin: '内置' };
const SOURCE_TYPE_LABEL: Record<string, string> = { internal: '内部', partner: '合作方', cloud: '云服务' };

export const SkillDetail: React.FC<Props> = ({ skillId, theme, fontSize: _fontSize, onBack }) => {
  const isDark = theme === 'dark';
  const navigate = useNavigate();
  const numericId = Number(skillId);
  const [skill, setSkill] = useState<Skill | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchSkill = () => {
    setLoading(true);
    setError(null);
    skillService.getById(numericId)
      .then(setSkill)
      .catch((err) => setError(err instanceof Error ? err : new Error('加载失败')))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchSkill(); }, [numericId]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await skillService.remove(numericId);
      setDeleteOpen(false);
      onBack();
    } catch {
      setDeleting(false);
    }
  };

  if (loading) return <div className={`flex-1 flex flex-col min-h-0 ${canvasBodyBg(theme)}`}><PageSkeleton type="detail" /></div>;
  if (error || !skill) return <div className={`flex-1 flex flex-col min-h-0 ${canvasBodyBg(theme)}`}><PageError error={error} onRetry={fetchSkill} /></div>;

  const specJson = (skill.specJson ?? {}) as Record<string, unknown>;
  const formatCallCount = (n: number) => n >= 10000 ? `${(n / 10000).toFixed(2)}万` : n.toLocaleString();

  return (
    <div className={`flex-1 flex flex-col min-h-0 overflow-hidden ${canvasBodyBg(theme)}`}>
      <div className={`shrink-0 z-20 border-b px-4 sm:px-6 py-4 flex items-center justify-between ${isDark ? 'border-white/[0.06]' : 'border-slate-100'}`}>
        <div className="flex items-center gap-4 min-w-0">
          <button type="button" onClick={onBack} className={btnGhost(theme)}><ArrowLeft size={20} /></button>
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0 ${isDark ? 'bg-neutral-500/15' : 'bg-neutral-100'}`}>{skill.icon || '🔧'}</div>
            <div className="min-w-0">
              <h2 className={`text-xl font-bold truncate ${textPrimary(theme)}`}>{skill.displayName}</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={statusBadgeClass(skill.status as DomainStatus, theme)}><span className={statusDot(skill.status as DomainStatus)} />{statusLabel(skill.status as DomainStatus)}</span>
                <span className={`text-xs font-mono ${textMuted(theme)}`}>{skill.agentName}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button type="button" onClick={() => navigate(buildPath('admin', 'skill-register', skillId))} className={btnGhost(theme)}><Edit2 size={16} /> <span className="hidden sm:inline">编辑</span></button>
          <button type="button" onClick={() => setDeleteOpen(true)} className={btnDanger}><Trash2 size={16} /> <span className="hidden sm:inline">删除</span></button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
        <DetailLayout className="items-start">
          <div className="space-y-4">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 30 }} className={`${bentoCard(theme)} p-6`}>
              <h3 className={`text-sm font-bold mb-4 flex items-center gap-2 ${textPrimary(theme)}`}><FileText size={18} className="text-blue-500" /> 基本信息</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {[
                  { label: '显示名称', value: skill.displayName },
                  { label: '标识名称', value: skill.agentName, mono: true },
                  { label: '协议类型', value: AGENT_TYPE_LABEL[skill.agentType] ?? skill.agentType },
                  { label: '来源', value: SOURCE_TYPE_LABEL[skill.sourceType] ?? skill.sourceType },
                  { label: '所属 MCP Server', value: skill.parentName ?? '独立技能' },
                  { label: '展示模板', value: skill.displayTemplate ?? '—' },
                  { label: '分类', value: skill.categoryName ?? '未分类' },
                  { label: '公开', value: skill.isPublic ? '是' : '否' },
                ].map((item) => (
                  <div key={item.label}>
                    <label className={`text-xs block mb-1 ${textMuted(theme)}`}>{item.label}</label>
                    <p className={`font-medium ${item.mono ? 'font-mono text-sm' : ''} ${textPrimary(theme)}`}>{String(item.value ?? '—')}</p>
                  </div>
                ))}
                <div className="sm:col-span-2">
                  <label className={`text-xs block mb-1 ${textMuted(theme)}`}>描述</label>
                  <p className={`text-sm leading-relaxed ${textSecondary(theme)}`}>{skill.description || '暂无描述'}</p>
                </div>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 30, delay: 0.05 }} className={`${bentoCard(theme)} p-6`}>
              <h3 className={`text-sm font-bold mb-4 flex items-center gap-2 ${textPrimary(theme)}`}><Settings size={18} className="text-neutral-800" /> 连接配置</h3>
              <div className="space-y-3">
                <div className={`flex items-start gap-3 p-3 rounded-xl ${isDark ? 'bg-white/[0.02]' : 'bg-slate-50'} border ${isDark ? 'border-white/[0.06]' : 'border-slate-100'}`}>
                  <div className={`p-2 rounded-xl shrink-0 ${isDark ? 'bg-blue-500/15 text-blue-400' : 'bg-blue-50 text-blue-600'}`}><Globe size={18} /></div>
                  <div className="min-w-0 flex-1"><p className={`text-sm font-bold mb-1 ${textPrimary(theme)}`}>服务地址</p><p className={`text-xs font-mono break-all ${textMuted(theme)}`}>{(specJson.url as string) || '—'}</p></div>
                </div>
                {specJson.api_key && (
                  <div className={`flex items-start gap-3 p-3 rounded-xl ${isDark ? 'bg-white/[0.02]' : 'bg-slate-50'} border ${isDark ? 'border-white/[0.06]' : 'border-slate-100'}`}>
                    <div className={`p-2 rounded-xl shrink-0 ${isDark ? 'bg-amber-500/15 text-amber-400' : 'bg-amber-50 text-amber-600'}`}><Settings size={18} /></div>
                    <div className="min-w-0"><p className={`text-sm font-bold mb-1 ${textPrimary(theme)}`}>API Key</p><p className={`text-xs font-mono ${textMuted(theme)}`}>••••••••</p></div>
                  </div>
                )}
                <div className={`flex items-start gap-3 p-3 rounded-xl ${isDark ? 'bg-white/[0.02]' : 'bg-slate-50'} border ${isDark ? 'border-white/[0.06]' : 'border-slate-100'}`}>
                  <div className={`p-2 rounded-xl shrink-0 ${isDark ? 'bg-orange-500/15 text-orange-400' : 'bg-orange-50 text-orange-600'}`}><Clock size={18} /></div>
                  <div className="min-w-0"><p className={`text-sm font-bold mb-1 ${textPrimary(theme)}`}>超时时间</p><p className={`text-xs ${textMuted(theme)}`}>{(specJson.timeout as number) ?? 30} 秒</p></div>
                </div>
                {skill.parentId && (
                  <div className={`flex items-start gap-3 p-3 rounded-xl ${isDark ? 'bg-white/[0.02]' : 'bg-slate-50'} border ${isDark ? 'border-white/[0.06]' : 'border-slate-100'}`}>
                    <div className={`p-2 rounded-xl shrink-0 ${isDark ? 'bg-neutral-900/10 text-neutral-300' : 'bg-neutral-100 text-neutral-900'}`}><Server size={18} /></div>
                    <div className="min-w-0"><p className={`text-sm font-bold mb-1 ${textPrimary(theme)}`}>MCP Server</p><p className={`text-xs ${textMuted(theme)}`}>{skill.parentName ?? `ID: ${skill.parentId}`}</p></div>
                  </div>
                )}
              </div>
            </motion.div>

            {skill.parametersSchema && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 30, delay: 0.1 }} className={`${bentoCard(theme)} p-6`}>
                <h3 className={`text-sm font-bold mb-4 flex items-center gap-2 ${textPrimary(theme)}`}><Code2 size={18} className="text-emerald-500" /> 参数 Schema</h3>
                <pre className={`text-xs font-mono p-4 rounded-xl overflow-auto max-h-64 ${isDark ? 'bg-white/[0.02] text-slate-300' : 'bg-slate-50 text-slate-700'}`}>{JSON.stringify(skill.parametersSchema, null, 2)}</pre>
              </motion.div>
            )}
          </div>

          <div className="space-y-4">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 30, delay: 0.1 }} className={`${bentoCard(theme)} p-6`}>
              <h3 className={`text-sm font-bold mb-4 flex items-center gap-2 ${textPrimary(theme)}`}><BarChart3 size={18} className="text-emerald-500" /> 运行指标</h3>
              <div className="space-y-5">
                {[
                  { label: '累计调用量', value: formatCallCount(skill.callCount), color: 'text-blue-500' },
                  { label: '平均成功率', value: `${skill.successRate}%`, color: skill.successRate >= 95 ? 'text-emerald-500' : skill.successRate >= 80 ? 'text-blue-500' : 'text-orange-500', bar: skill.successRate },
                  { label: '平均响应时间', value: skill.avgLatencyMs >= 1000 ? `${(skill.avgLatencyMs / 1000).toFixed(1)}s` : `${skill.avgLatencyMs}ms`, color: skill.avgLatencyMs <= 200 ? 'text-emerald-500' : skill.avgLatencyMs <= 1000 ? 'text-orange-500' : 'text-rose-500' },
                  { label: '质量评分', value: String(skill.qualityScore), color: 'text-neutral-800' },
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
                <div className="flex justify-between text-xs"><span className={textMuted(theme)}>创建时间</span><span className={`font-mono ${textSecondary(theme)}`}>{formatDateTime(skill.createTime)}</span></div>
                <div className="flex justify-between text-xs"><span className={textMuted(theme)}>最后更新</span><span className={`font-mono ${textSecondary(theme)}`}>{formatDateTime(skill.updateTime)}</span></div>
              </div>
            </motion.div>
          </div>
        </DetailLayout>
      </div>

      <ConfirmDialog open={deleteOpen} title="删除技能" message={`确定要删除「${skill.displayName}」吗？此操作不可撤销。`} confirmText="删除" variant="danger" loading={deleting} onConfirm={handleDelete} onCancel={() => setDeleteOpen(false)} />
    </div>
  );
};
