import React, { useState } from 'react';
import { ShieldCheck, X, Search } from 'lucide-react';
import { Theme, FontSize } from '../../types';
import { MgmtPageShell } from '../userMgmt/MgmtPageShell';
import { nativeInputClass, nativeSelectClass } from '../../utils/formFieldClasses';
import { TOOLBAR_ROW, toolbarSearchInputClass } from '../../utils/toolbarFieldClasses';

interface Props {
  theme: Theme;
  fontSize: FontSize;
  showMessage: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

type CheckType = 'http' | 'tcp' | 'ping';
type HealthStatus = 'healthy' | 'degraded' | 'down';

interface HealthCheckConfig {
  id: number;
  displayName: string;
  agentType: 'mcp' | 'http_api' | 'builtin';
  entityType: 'agent' | 'skill';
  checkType: CheckType;
  checkUrl: string;
  intervalSec: number;
  healthyThreshold: number;
  timeoutSec: number;
  currentStatus: HealthStatus;
  lastCheckedAt: string;
}

const INITIAL_DATA: HealthCheckConfig[] = [
  { id: 1, displayName: '智能问答 Agent', agentType: 'http_api', entityType: 'agent', checkType: 'http', checkUrl: 'https://qa.internal/health', intervalSec: 60, healthyThreshold: 3, timeoutSec: 5, currentStatus: 'healthy', lastCheckedAt: '2026-03-21 14:32:10' },
  { id: 2, displayName: '知识检索 Agent', agentType: 'mcp', entityType: 'agent', checkType: 'http', checkUrl: 'https://search.internal/ping', intervalSec: 30, healthyThreshold: 3, timeoutSec: 5, currentStatus: 'healthy', lastCheckedAt: '2026-03-21 14:32:05' },
  { id: 3, displayName: '课表查询 Skill', agentType: 'http_api', entityType: 'skill', checkType: 'http', checkUrl: 'https://schedule.internal/health', intervalSec: 120, healthyThreshold: 5, timeoutSec: 10, currentStatus: 'degraded', lastCheckedAt: '2026-03-21 14:31:50' },
  { id: 4, displayName: '成绩分析 Agent', agentType: 'builtin', entityType: 'agent', checkType: 'tcp', checkUrl: '10.0.1.22:8080', intervalSec: 60, healthyThreshold: 3, timeoutSec: 5, currentStatus: 'healthy', lastCheckedAt: '2026-03-21 14:32:08' },
  { id: 5, displayName: '文档解析 Skill', agentType: 'mcp', entityType: 'skill', checkType: 'http', checkUrl: 'https://docparse.internal/health', intervalSec: 60, healthyThreshold: 3, timeoutSec: 5, currentStatus: 'down', lastCheckedAt: '2026-03-21 14:28:00' },
  { id: 6, displayName: '邮件发送 Skill', agentType: 'http_api', entityType: 'skill', checkType: 'tcp', checkUrl: '10.0.1.30:25', intervalSec: 90, healthyThreshold: 2, timeoutSec: 3, currentStatus: 'healthy', lastCheckedAt: '2026-03-21 14:32:12' },
  { id: 7, displayName: '图像识别 Agent', agentType: 'http_api', entityType: 'agent', checkType: 'http', checkUrl: 'https://vision.internal/health', intervalSec: 60, healthyThreshold: 3, timeoutSec: 8, currentStatus: 'degraded', lastCheckedAt: '2026-03-21 14:30:45' },
  { id: 8, displayName: '数据同步 Agent', agentType: 'mcp', entityType: 'agent', checkType: 'ping', checkUrl: '10.0.1.50', intervalSec: 30, healthyThreshold: 3, timeoutSec: 5, currentStatus: 'healthy', lastCheckedAt: '2026-03-21 14:32:11' },
  { id: 9, displayName: '日程管理 Skill', agentType: 'builtin', entityType: 'skill', checkType: 'http', checkUrl: 'https://calendar.internal/health', intervalSec: 120, healthyThreshold: 4, timeoutSec: 5, currentStatus: 'healthy', lastCheckedAt: '2026-03-21 14:31:55' },
  { id: 10, displayName: '消息推送 Skill', agentType: 'http_api', entityType: 'skill', checkType: 'tcp', checkUrl: '10.0.1.40:9090', intervalSec: 45, healthyThreshold: 3, timeoutSec: 5, currentStatus: 'down', lastCheckedAt: '2026-03-21 14:25:30' },
];

const STATUS_CFG: Record<HealthStatus, { dot: string; label: string; badge: { light: string; dark: string } }> = {
  healthy:  { dot: 'bg-emerald-500', label: '健康', badge: { light: 'bg-emerald-100 text-emerald-800', dark: 'bg-emerald-500/20 text-emerald-300' } },
  degraded: { dot: 'bg-amber-500',   label: '降级', badge: { light: 'bg-amber-100 text-amber-800',     dark: 'bg-amber-500/20 text-amber-300'   } },
  down:     { dot: 'bg-red-500',     label: '不可用', badge: { light: 'bg-red-100 text-red-800',         dark: 'bg-red-500/20 text-red-300'       } },
};

const TYPE_LABEL: Record<string, string> = { mcp: 'MCP', http_api: 'HTTP API', builtin: '内置' };

export const HealthConfigPage: React.FC<Props> = ({ theme, fontSize, showMessage }) => {
  const isDark = theme === 'dark';
  const [data, setData] = useState<HealthCheckConfig[]>(INITIAL_DATA);
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<Partial<HealthCheckConfig>>({});

  const filtered = data.filter((r) => {
    if (statusFilter !== 'all' && r.currentStatus !== statusFilter) return false;
    const term = q.trim().toLowerCase();
    if (!term) return true;
    return r.displayName.toLowerCase().includes(term) || r.checkUrl.toLowerCase().includes(term);
  });

  const openEdit = (item: HealthCheckConfig) => {
    setEditingId(item.id);
    setDraft({ checkType: item.checkType, checkUrl: item.checkUrl, intervalSec: item.intervalSec, healthyThreshold: item.healthyThreshold, timeoutSec: item.timeoutSec });
  };

  const saveEdit = () => {
    if (editingId == null) return;
    setData((prev) => prev.map((r) => r.id === editingId ? { ...r, ...draft } as HealthCheckConfig : r));
    setEditingId(null);
    showMessage('健康检查配置已保存', 'success');
  };

  const sel = nativeSelectClass(theme);
  const inp = nativeInputClass(theme);
  const searchCls = toolbarSearchInputClass(theme);

  const toolbar = (
    <div className={TOOLBAR_ROW}>
      <div className="relative flex-1 min-w-0 sm:max-w-md">
        <Search className={`absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${isDark ? 'text-slate-500' : 'text-slate-400'}`} size={16} />
        <input type="search" placeholder="搜索名称或地址…" value={q} onChange={(e) => setQ(e.target.value)} className={searchCls} />
      </div>
      <select className={`${sel} w-full sm:w-[8rem] shrink-0`} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
        <option value="all">全部状态</option>
        <option value="healthy">健康</option>
        <option value="degraded">降级</option>
        <option value="down">不可用</option>
      </select>
    </div>
  );

  return (
    <MgmtPageShell theme={theme} fontSize={fontSize} titleIcon={ShieldCheck} breadcrumbSegments={['监控中心', '健康检查']} description="管理 Agent / Skill 的健康检查策略，实时查看连通性状态" toolbar={toolbar}>
      <div className="min-w-0 px-4 sm:px-6 pb-6 pt-1">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm min-w-[960px]">
            <thead>
              <tr className={`border-b ${isDark ? 'border-white/10 bg-[#2C2C2E]/80' : 'border-slate-200 bg-slate-50'}`}>
                {['名称', '类型', '检查方式', '检查地址', '间隔(s)', '阈值', '状态', '最近检查', '操作'].map((h) => (
                  <th key={h} className={`px-4 py-3 font-semibold whitespace-nowrap ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => {
                const st = STATUS_CFG[r.currentStatus];
                return (
                  <tr key={r.id} className={`border-b ${isDark ? `border-white/5 ${i % 2 === 0 ? 'bg-[#1C1C1E]' : 'bg-[#2C2C2E]/40'}` : `border-slate-100 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/80'}`}`}>
                    <td className={`px-4 py-3 font-medium ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                      <div>{r.displayName}</div>
                      <span className={`text-[11px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{r.entityType === 'agent' ? 'Agent' : 'Skill'}</span>
                    </td>
                    <td className={`px-4 py-3 text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{TYPE_LABEL[r.agentType]}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-lg text-xs font-medium ${isDark ? 'bg-white/10 text-slate-300' : 'bg-slate-100 text-slate-700'}`}>{r.checkType.toUpperCase()}</span>
                    </td>
                    <td className={`px-4 py-3 text-xs font-mono max-w-[200px] truncate ${isDark ? 'text-slate-400' : 'text-slate-600'}`} title={r.checkUrl}>{r.checkUrl}</td>
                    <td className={`px-4 py-3 text-xs text-center ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{r.intervalSec}</td>
                    <td className={`px-4 py-3 text-xs text-center ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{r.healthyThreshold}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-xs font-medium ${isDark ? st.badge.dark : st.badge.light}`}>
                        <span className={`w-2 h-2 rounded-full ${st.dot} ${r.currentStatus !== 'down' ? 'animate-pulse' : ''}`} />
                        {st.label}
                      </span>
                    </td>
                    <td className={`px-4 py-3 text-xs whitespace-nowrap ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>{r.lastCheckedAt.slice(11)}</td>
                    <td className="px-4 py-3">
                      <button type="button" onClick={() => openEdit(r)} className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${isDark ? 'bg-white/10 hover:bg-white/15 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}>
                        配置
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className={`text-center py-12 text-sm ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>无匹配结果</div>
        )}
      </div>

      {editingId != null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setEditingId(null)}>
          <div onClick={(e) => e.stopPropagation()} className={`w-full max-w-md mx-4 rounded-2xl border shadow-2xl ${isDark ? 'bg-[#1C1C1E] border-white/10' : 'bg-white border-slate-200'}`}>
            <div className={`flex items-center justify-between px-6 py-4 border-b ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
              <h3 className={`font-bold text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>
                健康检查配置 · {data.find((r) => r.id === editingId)?.displayName}
              </h3>
              <button type="button" onClick={() => setEditingId(null)} className={`p-1.5 rounded-xl transition-colors ${isDark ? 'hover:bg-white/10 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}>
                <X size={18} />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className={`text-xs font-medium block mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>检查方式</label>
                <select className={sel} value={draft.checkType ?? 'http'} onChange={(e) => setDraft((p) => ({ ...p, checkType: e.target.value as CheckType }))}>
                  <option value="http">HTTP</option>
                  <option value="tcp">TCP</option>
                  <option value="ping">Ping</option>
                </select>
              </div>
              <div>
                <label className={`text-xs font-medium block mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>检查地址</label>
                <input className={inp} value={draft.checkUrl ?? ''} onChange={(e) => setDraft((p) => ({ ...p, checkUrl: e.target.value }))} placeholder="https://example.com/health" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={`text-xs font-medium block mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>间隔(秒)</label>
                  <input type="number" className={inp} value={draft.intervalSec ?? 60} onChange={(e) => setDraft((p) => ({ ...p, intervalSec: Number(e.target.value) }))} />
                </div>
                <div>
                  <label className={`text-xs font-medium block mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>健康阈值</label>
                  <input type="number" className={inp} value={draft.healthyThreshold ?? 3} onChange={(e) => setDraft((p) => ({ ...p, healthyThreshold: Number(e.target.value) }))} />
                </div>
                <div>
                  <label className={`text-xs font-medium block mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>超时(秒)</label>
                  <input type="number" className={inp} value={draft.timeoutSec ?? 5} onChange={(e) => setDraft((p) => ({ ...p, timeoutSec: Number(e.target.value) }))} />
                </div>
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
    </MgmtPageShell>
  );
};
