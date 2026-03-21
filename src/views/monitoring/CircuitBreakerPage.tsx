import React, { useState } from 'react';
import { AlertTriangle, X, Zap, RotateCcw } from 'lucide-react';
import { Theme, FontSize } from '../../types';
import { MgmtPageShell } from '../userMgmt/MgmtPageShell';
import { nativeInputClass, nativeSelectClass } from '../../utils/formFieldClasses';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';

interface Props {
  theme: Theme;
  fontSize: FontSize;
  showMessage: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

type CBState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

interface CircuitBreakerConfig {
  id: number;
  displayName: string;
  agentType: 'mcp' | 'http_api' | 'builtin';
  currentState: CBState;
  failureThreshold: number;
  openDurationSec: number;
  halfOpenMaxCalls: number;
  fallbackAgentName: string | null;
  fallbackMessage: string;
  failureCount: number;
  successCount: number;
  lastOpenedAt: string | null;
}

const AGENT_NAMES = [
  '智能问答 Agent', '知识检索 Agent', '成绩分析 Agent',
  '图像识别 Agent', '数据同步 Agent', '教务查询 Agent',
];

const INITIAL_DATA: CircuitBreakerConfig[] = [
  {
    id: 1, displayName: '智能问答 Agent', agentType: 'http_api', currentState: 'CLOSED',
    failureThreshold: 5, openDurationSec: 30, halfOpenMaxCalls: 3,
    fallbackAgentName: '知识检索 Agent', fallbackMessage: '服务暂时不可用，请稍后再试',
    failureCount: 1, successCount: 2847, lastOpenedAt: null,
  },
  {
    id: 2, displayName: '知识检索 Agent', agentType: 'mcp', currentState: 'OPEN',
    failureThreshold: 3, openDurationSec: 60, halfOpenMaxCalls: 2,
    fallbackAgentName: null, fallbackMessage: '检索服务正在恢复中，请稍候',
    failureCount: 5, successCount: 1203, lastOpenedAt: '2026-03-21 14:28:15',
  },
  {
    id: 3, displayName: '课表查询 Skill', agentType: 'http_api', currentState: 'HALF_OPEN',
    failureThreshold: 5, openDurationSec: 30, halfOpenMaxCalls: 3,
    fallbackAgentName: '教务查询 Agent', fallbackMessage: '课表查询暂不可用',
    failureCount: 3, successCount: 1, lastOpenedAt: '2026-03-21 14:25:00',
  },
  {
    id: 4, displayName: '成绩分析 Agent', agentType: 'builtin', currentState: 'CLOSED',
    failureThreshold: 10, openDurationSec: 45, halfOpenMaxCalls: 5,
    fallbackAgentName: null, fallbackMessage: '成绩分析服务暂不可用',
    failureCount: 0, successCount: 892, lastOpenedAt: null,
  },
  {
    id: 5, displayName: '图像识别 Agent', agentType: 'http_api', currentState: 'CLOSED',
    failureThreshold: 5, openDurationSec: 30, halfOpenMaxCalls: 3,
    fallbackAgentName: null, fallbackMessage: '图像识别暂时不可用',
    failureCount: 2, successCount: 456, lastOpenedAt: '2026-03-20 09:10:00',
  },
];

const STATE_CFG: Record<CBState, { label: string; light: string; dark: string }> = {
  CLOSED:    { label: '正常',   light: 'bg-emerald-100 text-emerald-800', dark: 'bg-emerald-500/20 text-emerald-300' },
  OPEN:      { label: '已熔断', light: 'bg-red-100 text-red-800',         dark: 'bg-red-500/20 text-red-300' },
  HALF_OPEN: { label: '探测中', light: 'bg-amber-100 text-amber-800',     dark: 'bg-amber-500/20 text-amber-300' },
};

export const CircuitBreakerPage: React.FC<Props> = ({ theme, fontSize, showMessage }) => {
  const isDark = theme === 'dark';
  const [data, setData] = useState<CircuitBreakerConfig[]>(INITIAL_DATA);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<Partial<CircuitBreakerConfig>>({});
  const [confirmAction, setConfirmAction] = useState<{ id: number; action: 'trip' | 'reset' } | null>(null);

  const sel = nativeSelectClass(theme);
  const inp = nativeInputClass(theme);

  const openEdit = (item: CircuitBreakerConfig) => {
    setEditingId(item.id);
    setDraft({
      failureThreshold: item.failureThreshold,
      openDurationSec: item.openDurationSec,
      halfOpenMaxCalls: item.halfOpenMaxCalls,
      fallbackAgentName: item.fallbackAgentName,
      fallbackMessage: item.fallbackMessage,
    });
  };

  const saveEdit = () => {
    if (editingId == null) return;
    setData((prev) => prev.map((r) => r.id === editingId ? { ...r, ...draft } as CircuitBreakerConfig : r));
    setEditingId(null);
    showMessage('熔断配置已保存', 'success');
  };

  const executeAction = () => {
    if (!confirmAction) return;
    const { id, action } = confirmAction;
    setData((prev) => prev.map((r) => {
      if (r.id !== id) return r;
      if (action === 'trip') {
        return { ...r, currentState: 'OPEN' as CBState, lastOpenedAt: new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-'), failureCount: r.failureThreshold };
      }
      return { ...r, currentState: 'CLOSED' as CBState, failureCount: 0 };
    }));
    setConfirmAction(null);
    showMessage(action === 'trip' ? '已手动熔断' : '已手动恢复', action === 'trip' ? 'info' : 'success');
  };

  const confirmItem = confirmAction ? data.find((r) => r.id === confirmAction.id) : null;

  return (
    <MgmtPageShell theme={theme} fontSize={fontSize} titleIcon={AlertTriangle} breadcrumbSegments={['监控中心', '熔断降级']} description="配置 Agent / Skill 的熔断策略，支持手动熔断与恢复">
      <div className="min-w-0 px-4 sm:px-6 pb-6 pt-4">
        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
          {([['CLOSED', '正常运行'], ['OPEN', '已熔断'], ['HALF_OPEN', '探测中']] as [CBState, string][]).map(([state, label]) => {
            const count = data.filter((r) => r.currentState === state).length;
            const cfg = STATE_CFG[state];
            return (
              <div key={state} className={`rounded-2xl border px-4 py-3 ${isDark ? 'bg-[#2C2C2E]/60 border-white/10' : 'bg-white border-slate-200/80'}`}>
                <div className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{label}</div>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{count}</span>
                  <span className={`inline-flex px-2 py-0.5 rounded-lg text-[11px] font-medium ${isDark ? cfg.dark : cfg.light}`}>{cfg.label}</span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm min-w-[960px]">
            <thead>
              <tr className={`border-b ${isDark ? 'border-white/10 bg-[#2C2C2E]/80' : 'border-slate-200 bg-slate-50'}`}>
                {['名称', '状态', '失败阈值', '熔断时长(s)', '降级 Agent', '最近熔断', '统计', '操作'].map((h) => (
                  <th key={h} className={`px-4 py-3 font-semibold whitespace-nowrap ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((r, i) => {
                const stCfg = STATE_CFG[r.currentState];
                return (
                  <tr key={r.id} className={`border-b ${isDark ? `border-white/5 ${i % 2 === 0 ? 'bg-[#1C1C1E]' : 'bg-[#2C2C2E]/40'}` : `border-slate-100 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/80'}`}`}>
                    <td className={`px-4 py-3 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                      <div className="font-medium">{r.displayName}</div>
                      <span className={`text-[11px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                        {r.agentType === 'mcp' ? 'MCP' : r.agentType === 'http_api' ? 'HTTP API' : '内置'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-semibold ${isDark ? stCfg.dark : stCfg.light}`}>
                        {stCfg.label}
                      </span>
                    </td>
                    <td className={`px-4 py-3 text-center ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{r.failureThreshold}</td>
                    <td className={`px-4 py-3 text-center ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{r.openDurationSec}</td>
                    <td className={`px-4 py-3 text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{r.fallbackAgentName ?? '—'}</td>
                    <td className={`px-4 py-3 text-xs whitespace-nowrap ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>{r.lastOpenedAt ?? '—'}</td>
                    <td className="px-4 py-3">
                      <div className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                        <span className="text-emerald-500 font-medium">{r.successCount}</span>
                        <span className="mx-1">/</span>
                        <span className="text-red-500 font-medium">{r.failureCount}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={() => openEdit(r)} className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${isDark ? 'bg-white/10 hover:bg-white/15 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}>
                          配置
                        </button>
                        {r.currentState !== 'OPEN' ? (
                          <button type="button" onClick={() => setConfirmAction({ id: r.id, action: 'trip' })} className="p-1.5 rounded-xl text-red-500 hover:bg-red-500/10 transition-colors" title="手动熔断">
                            <Zap size={15} />
                          </button>
                        ) : (
                          <button type="button" onClick={() => setConfirmAction({ id: r.id, action: 'reset' })} className="p-1.5 rounded-xl text-emerald-500 hover:bg-emerald-500/10 transition-colors" title="手动恢复">
                            <RotateCcw size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Config modal */}
      {editingId != null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setEditingId(null)}>
          <div onClick={(e) => e.stopPropagation()} className={`w-full max-w-md mx-4 rounded-2xl border shadow-2xl ${isDark ? 'bg-[#1C1C1E] border-white/10' : 'bg-white border-slate-200'}`}>
            <div className={`flex items-center justify-between px-6 py-4 border-b ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
              <h3 className={`font-bold text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>
                熔断配置 · {data.find((r) => r.id === editingId)?.displayName}
              </h3>
              <button type="button" onClick={() => setEditingId(null)} className={`p-1.5 rounded-xl transition-colors ${isDark ? 'hover:bg-white/10 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}>
                <X size={18} />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={`text-xs font-medium block mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>失败阈值</label>
                  <input type="number" className={inp} value={draft.failureThreshold ?? 5} onChange={(e) => setDraft((p) => ({ ...p, failureThreshold: Number(e.target.value) }))} />
                </div>
                <div>
                  <label className={`text-xs font-medium block mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>熔断时长(s)</label>
                  <input type="number" className={inp} value={draft.openDurationSec ?? 30} onChange={(e) => setDraft((p) => ({ ...p, openDurationSec: Number(e.target.value) }))} />
                </div>
                <div>
                  <label className={`text-xs font-medium block mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>半开最大调用</label>
                  <input type="number" className={inp} value={draft.halfOpenMaxCalls ?? 3} onChange={(e) => setDraft((p) => ({ ...p, halfOpenMaxCalls: Number(e.target.value) }))} />
                </div>
              </div>
              <div>
                <label className={`text-xs font-medium block mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>降级 Agent</label>
                <select className={sel} value={draft.fallbackAgentName ?? ''} onChange={(e) => setDraft((p) => ({ ...p, fallbackAgentName: e.target.value || null }))}>
                  <option value="">不降级</option>
                  {AGENT_NAMES.filter((n) => n !== data.find((r) => r.id === editingId)?.displayName).map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={`text-xs font-medium block mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>降级提示消息</label>
                <textarea className={`${inp} min-h-[80px] resize-y`} value={draft.fallbackMessage ?? ''} onChange={(e) => setDraft((p) => ({ ...p, fallbackMessage: e.target.value }))} />
              </div>
            </div>
            <div className={`flex justify-end gap-3 px-6 py-4 border-t ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
              <button type="button" onClick={() => setEditingId(null)} className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${isDark ? 'bg-white/10 hover:bg-white/15 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}>
                取消
              </button>
              <button type="button" onClick={saveEdit} className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors">
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!confirmAction}
        title={confirmAction?.action === 'trip' ? '手动熔断' : '手动恢复'}
        message={
          confirmAction?.action === 'trip'
            ? `确认对「${confirmItem?.displayName}」执行手动熔断？熔断后该 Agent 将暂停服务。`
            : `确认恢复「${confirmItem?.displayName}」？恢复后将重新开始接收请求。`
        }
        variant={confirmAction?.action === 'trip' ? 'warning' : 'info'}
        confirmText={confirmAction?.action === 'trip' ? '确认熔断' : '确认恢复'}
        loading={false}
        onConfirm={executeAction}
        onCancel={() => setConfirmAction(null)}
      />
    </MgmtPageShell>
  );
};
