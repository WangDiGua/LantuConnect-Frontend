import React, { useState, useEffect, useCallback } from 'react';
import { ShieldCheck, Search, Loader2 } from 'lucide-react';
import { Theme, FontSize } from '../../types';
import { MgmtPageShell } from '../userMgmt/MgmtPageShell';
import { nativeInputClass, nativeSelectClass } from '../../utils/formFieldClasses';
import { TOOLBAR_ROW, toolbarSearchInputClass } from '../../utils/toolbarFieldClasses';
import { btnPrimary, btnSecondary, tableHeadCell, tableBodyRow, btnGhost } from '../../utils/uiClasses';
import { Modal } from '../../components/common/Modal';
import { healthService } from '../../api/services/health.service';
import type { HealthConfigItem } from '../../types/dto/health';

interface Props {
  theme: Theme;
  fontSize: FontSize;
  showMessage: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

type HealthStatus = 'healthy' | 'degraded' | 'down';

const STATUS_CFG: Record<HealthStatus, { dot: string; label: string; badge: { light: string; dark: string } }> = {
  healthy:  { dot: 'bg-emerald-500', label: '健康', badge: { light: 'bg-emerald-100 text-emerald-800', dark: 'bg-emerald-500/20 text-emerald-300' } },
  degraded: { dot: 'bg-amber-500',   label: '降级', badge: { light: 'bg-amber-100 text-amber-800',     dark: 'bg-amber-500/20 text-amber-300'   } },
  down:     { dot: 'bg-red-500',     label: '不可用', badge: { light: 'bg-red-100 text-red-800',         dark: 'bg-red-500/20 text-red-300'       } },
};

const TYPE_LABEL: Record<string, string> = { mcp: 'MCP', http_api: 'HTTP API', builtin: '内置' };

export const HealthConfigPage: React.FC<Props> = ({ theme, fontSize, showMessage }) => {
  const isDark = theme === 'dark';
  const [data, setData] = useState<HealthConfigItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<Partial<HealthConfigItem>>({});

  const fetchData = useCallback(() => {
    setLoading(true);
    healthService.listHealthConfigs()
      .then(items => setData(items))
      .catch(err => {
        console.error(err);
        showMessage('加载健康检查配置失败', 'error');
      })
      .finally(() => setLoading(false));
  }, [showMessage]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = data.filter((r) => {
    if (statusFilter !== 'all' && r.healthStatus !== statusFilter) return false;
    const term = q.trim().toLowerCase();
    if (!term) return true;
    return r.displayName.toLowerCase().includes(term) || r.checkUrl.toLowerCase().includes(term);
  });

  const openEdit = (item: HealthConfigItem) => {
    setEditingId(item.id);
    setDraft({ checkType: item.checkType, checkUrl: item.checkUrl, intervalSec: item.intervalSec, healthyThreshold: item.healthyThreshold, timeoutSec: item.timeoutSec });
  };

  const saveEdit = () => {
    if (editingId == null) return;
    healthService.updateHealthConfig(editingId, draft)
      .then(() => {
        setEditingId(null);
        showMessage('健康检查配置已保存', 'success');
        fetchData();
      })
      .catch(err => {
        console.error(err);
        showMessage('保存失败', 'error');
      });
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
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 size={32} className={`animate-spin ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
            <p className={`mt-3 text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>加载中…</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm min-w-[960px]">
                <thead>
                  <tr>
                    {['名称', '类型', '检查方式', '检查地址', '间隔(s)', '阈值', '状态', '最近检查', '操作'].map((h) => (
                      <th key={h} className={tableHeadCell(theme)}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r, i) => {
                    const st = STATUS_CFG[r.healthStatus];
                    return (
                      <tr key={r.id} className={tableBodyRow(theme, i)}>
                        <td className={`px-4 py-3 font-medium ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                          <div>{r.displayName}</div>
                        </td>
                        <td className={`px-4 py-3 text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{TYPE_LABEL[r.agentType] ?? r.agentType}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-0.5 rounded-lg text-xs font-medium ${isDark ? 'bg-white/10 text-slate-300' : 'bg-slate-100 text-slate-700'}`}>{r.checkType.toUpperCase()}</span>
                        </td>
                        <td className={`px-4 py-3 text-xs font-mono max-w-[200px] truncate ${isDark ? 'text-slate-400' : 'text-slate-600'}`} title={r.checkUrl}>{r.checkUrl}</td>
                        <td className={`px-4 py-3 text-xs text-center ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{r.intervalSec}</td>
                        <td className={`px-4 py-3 text-xs text-center ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{r.healthyThreshold}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-xs font-medium ${isDark ? st.badge.dark : st.badge.light}`}>
                            <span className={`w-2 h-2 rounded-full ${st.dot} ${r.healthStatus !== 'down' ? 'animate-pulse' : ''}`} />
                            {st.label}
                          </span>
                        </td>
                        <td className={`px-4 py-3 text-xs whitespace-nowrap ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>{r.lastCheckTime?.slice(11) ?? '—'}</td>
                        <td className="px-4 py-3">
                          <button type="button" onClick={() => openEdit(r)} className={btnGhost(theme)}>
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
          </>
        )}
      </div>

      <Modal
        open={editingId != null}
        onClose={() => setEditingId(null)}
        title={`健康检查配置 · ${data.find((r) => r.id === editingId)?.displayName ?? ''}`}
        theme={theme}
        size="md"
        footer={
          <>
            <button type="button" onClick={() => setEditingId(null)} className={btnSecondary(theme)}>取消</button>
            <button type="button" onClick={saveEdit} className={btnPrimary}>保存</button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className={`text-xs font-medium block mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>检查方式</label>
            <select className={sel} value={draft.checkType ?? 'http'} onChange={(e) => setDraft((p) => ({ ...p, checkType: e.target.value as HealthConfigItem['checkType'] }))}>
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
      </Modal>
    </MgmtPageShell>
  );
};
