import React, { useState, useEffect, useCallback } from 'react';
import { ShieldCheck, Search } from 'lucide-react';
import { Theme, FontSize } from '../../types';
import { MgmtPageShell } from '../userMgmt/MgmtPageShell';
import { nativeInputClass } from '../../utils/formFieldClasses';
import { LantuSelect } from '../../components/common/LantuSelect';
import { TOOLBAR_ROW_LIST, toolbarSearchInputClass } from '../../utils/toolbarFieldClasses';
import { btnPrimary, btnSecondary, mgmtTableActionGhost, tableHeadCell, tableBodyRow, tableCell, tableCellScrollInnerMono, textPrimary, textSecondary, textMuted } from '../../utils/uiClasses';
import { Modal } from '../../components/common/Modal';
import { BentoCard } from '../../components/common/BentoCard';
import { PageSkeleton } from '../../components/common/PageSkeleton';
import { healthService } from '../../api/services/health.service';
import type { HealthConfigItem } from '../../types/dto/health';

interface Props {
  theme: Theme;
  fontSize: FontSize;
  showMessage: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

type HealthStatus = 'healthy' | 'degraded' | 'down';

const INPUT_FOCUS = 'focus:ring-2 focus:ring-neutral-900/20 focus:border-neutral-900/35';

const STATUS_CFG: Record<HealthStatus, { dot: string; label: string; badge: { light: string; dark: string } }> = {
  healthy:  { dot: 'bg-emerald-500', label: '健康', badge: { light: 'bg-emerald-100 text-emerald-800', dark: 'bg-emerald-500/20 text-emerald-300' } },
  degraded: { dot: 'bg-amber-500',   label: '降级', badge: { light: 'bg-amber-100 text-amber-800',     dark: 'bg-amber-500/20 text-amber-300'   } },
  down:     { dot: 'bg-red-500',     label: '不可用', badge: { light: 'bg-red-100 text-red-800',         dark: 'bg-red-500/20 text-red-300'       } },
};

const TYPE_LABEL: Record<string, string> = { mcp: 'MCP', http_api: 'HTTP API', builtin: '内置' };

function safeText(v: unknown): string { return String(v ?? ''); }

export const HealthConfigPage: React.FC<Props> = ({ theme, fontSize, showMessage }) => {
  const isDark = theme === 'dark';
  const inputCls = `${nativeInputClass(theme)} ${INPUT_FOCUS}`;
  const healthStatusFilterOptions = [
    { value: 'all', label: '全部状态' },
    { value: 'healthy', label: '健康' },
    { value: 'degraded', label: '降级' },
    { value: 'down', label: '不可用' },
  ];
  const checkTypeOptions: { value: HealthConfigItem['checkType']; label: string }[] = [
    { value: 'http', label: 'HTTP' },
    { value: 'tcp', label: 'TCP' },
    { value: 'ping', label: 'Ping' },
  ];
  const labelCls = `text-sm font-medium ${textSecondary(theme)}`;

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
      .catch(err => { console.error(err); showMessage('加载健康检查配置失败', 'error'); })
      .finally(() => setLoading(false));
  }, [showMessage]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = data.filter((r) => {
    if (statusFilter !== 'all' && r.healthStatus !== statusFilter) return false;
    const term = q.trim().toLowerCase();
    if (!term) return true;
    return safeText(r.displayName).toLowerCase().includes(term) || safeText(r.checkUrl).toLowerCase().includes(term);
  });

  const openEdit = (item: HealthConfigItem) => {
    setEditingId(item.id);
    setDraft({ checkType: item.checkType, checkUrl: item.checkUrl, intervalSec: item.intervalSec, healthyThreshold: item.healthyThreshold, timeoutSec: item.timeoutSec });
  };

  const saveEdit = () => {
    if (editingId == null) return;
    healthService.updateHealthConfig(editingId, draft)
      .then(() => { setEditingId(null); showMessage('健康检查配置已保存', 'success'); fetchData(); })
      .catch(err => { console.error(err); showMessage('保存失败', 'error'); });
  };

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createDraft, setCreateDraft] = useState({ displayName: '', checkUrl: '', checkType: 'http' as const, intervalSec: 30 });

  const handleCreate = async () => {
    if (!createDraft.displayName.trim() || !createDraft.checkUrl.trim()) return;
    try {
      await healthService.createHealthConfig({
        displayName: createDraft.displayName.trim(),
        agentName: createDraft.displayName.trim().toLowerCase().replace(/\s+/g, '-'),
        checkUrl: createDraft.checkUrl.trim(),
        checkType: createDraft.checkType,
        intervalSec: createDraft.intervalSec,
      } as any);
      showMessage('健康检查配置已创建', 'success');
      setShowCreateModal(false);
      setCreateDraft({ displayName: '', checkUrl: '', checkType: 'http', intervalSec: 30 });
      fetchData();
    } catch (err) {
      showMessage(err instanceof Error ? err.message : '创建失败', 'error');
    }
  };

  const toolbar = (
    <div className={`${TOOLBAR_ROW_LIST} min-w-0`}>
      <div className="relative min-w-0 flex-1 shrink sm:max-w-md">
        <Search className={`absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${textMuted(theme)}`} size={16} />
        <input type="search" placeholder="搜索名称或地址…" value={q} onChange={(e) => setQ(e.target.value)} className={toolbarSearchInputClass(theme)} />
      </div>
      <LantuSelect
        theme={theme}
        className="!w-[8rem] shrink-0"
        triggerClassName={INPUT_FOCUS}
        value={statusFilter}
        onChange={setStatusFilter}
        options={healthStatusFilterOptions}
      />
      <button type="button" onClick={() => setShowCreateModal(true)} className={`${btnPrimary} shrink-0`}>新增检查</button>
    </div>
  );

  return (
    <MgmtPageShell theme={theme} fontSize={fontSize} titleIcon={ShieldCheck} breadcrumbSegments={['监控中心', '健康检查']} description="管理 Agent / Skill 的健康检查策略，实时查看连通性状态" toolbar={toolbar}>
      <div className="min-w-0 px-4 sm:px-6 pb-6 pt-1">
        {loading ? (
          <PageSkeleton type="table" />
        ) : (
          <>
            <BentoCard theme={theme} padding="sm" className="overflow-hidden">
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
                          <td className={`${tableCell()} font-medium ${textPrimary(theme)}`}>{safeText(r.displayName) || '未命名资源'}</td>
                          <td className={`${tableCell()} text-xs ${textMuted(theme)}`}>{TYPE_LABEL[r.agentType] ?? r.agentType}</td>
                          <td className={tableCell()}>
                            <span className={`inline-flex shrink-0 items-center whitespace-nowrap px-2 py-0.5 rounded-lg text-xs font-medium ${isDark ? 'bg-white/10 text-slate-300' : 'bg-slate-100 text-slate-700'}`}>{safeText(r.checkType).toUpperCase() || 'HTTP'}</span>
                          </td>
                          <td className={`${tableCell()} max-w-[200px] align-middle ${textMuted(theme)}`}>
                            <div className={tableCellScrollInnerMono}>{safeText(r.checkUrl) || '—'}</div>
                          </td>
                          <td className={`${tableCell()} text-xs text-center ${textMuted(theme)}`}>{r.intervalSec}</td>
                          <td className={`${tableCell()} text-xs text-center ${textMuted(theme)}`}>{r.healthyThreshold}</td>
                          <td className={tableCell()}>
                            <span className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap px-2 py-0.5 rounded-lg text-xs font-medium ${isDark ? st.badge.dark : st.badge.light}`}>
                              <span className={`w-2 h-2 rounded-full ${st.dot} ${r.healthStatus !== 'down' ? 'animate-pulse' : ''}`} />
                              {st.label}
                            </span>
                          </td>
                          <td className={`${tableCell()} text-xs whitespace-nowrap ${textMuted(theme)}`}>{r.lastCheckTime?.slice(11) ?? '—'}</td>
                          <td className={tableCell()}>
                            <button type="button" onClick={() => openEdit(r)} className={mgmtTableActionGhost(theme)}>编辑</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </BentoCard>
            {filtered.length === 0 && (
              <div className={`text-center py-12 text-sm ${textMuted(theme)}`}>无匹配结果</div>
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
            <label className={`${labelCls} mb-1.5 block`}>检查方式</label>
            <LantuSelect
              theme={theme}
              triggerClassName={INPUT_FOCUS}
              value={draft.checkType ?? 'http'}
              onChange={(v) => setDraft((p) => ({ ...p, checkType: v as HealthConfigItem['checkType'] }))}
              options={checkTypeOptions}
            />
          </div>
          <div>
            <label className={`${labelCls} mb-1.5 block`}>检查地址</label>
            <input className={inputCls} value={draft.checkUrl ?? ''} onChange={(e) => setDraft((p) => ({ ...p, checkUrl: e.target.value }))} placeholder="https://example.com/health" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={`${labelCls} mb-1.5 block`}>间隔(秒)</label>
              <input type="number" className={inputCls} value={draft.intervalSec ?? 60} onChange={(e) => setDraft((p) => ({ ...p, intervalSec: Number(e.target.value) }))} />
            </div>
            <div>
              <label className={`${labelCls} mb-1.5 block`}>健康阈值</label>
              <input type="number" className={inputCls} value={draft.healthyThreshold ?? 3} onChange={(e) => setDraft((p) => ({ ...p, healthyThreshold: Number(e.target.value) }))} />
            </div>
            <div>
              <label className={`${labelCls} mb-1.5 block`}>超时(秒)</label>
              <input type="number" className={inputCls} value={draft.timeoutSec ?? 5} onChange={(e) => setDraft((p) => ({ ...p, timeoutSec: Number(e.target.value) }))} />
            </div>
          </div>
        </div>
      </Modal>

      <Modal open={showCreateModal} onClose={() => setShowCreateModal(false)} title="新增健康检查配置" theme={theme} size="md"
        footer={<div className="flex justify-end gap-2">
          <button type="button" className={btnSecondary(theme)} onClick={() => setShowCreateModal(false)}>取消</button>
          <button type="button" className={btnPrimary} onClick={handleCreate}>创建</button>
        </div>}>
        <div className="space-y-4">
          <div><label className={`${labelCls} mb-1.5 block`}>名称</label><input className={inputCls} value={createDraft.displayName} onChange={(e) => setCreateDraft(d => ({ ...d, displayName: e.target.value }))} placeholder="服务名称" /></div>
          <div><label className={`${labelCls} mb-1.5 block`}>检查地址</label><input className={inputCls} value={createDraft.checkUrl} onChange={(e) => setCreateDraft(d => ({ ...d, checkUrl: e.target.value }))} placeholder="https://..." /></div>
          <div><label className={`${labelCls} mb-1.5 block`}>检查间隔(秒)</label><input type="number" className={inputCls} value={createDraft.intervalSec} onChange={(e) => setCreateDraft(d => ({ ...d, intervalSec: Number(e.target.value) }))} /></div>
        </div>
      </Modal>
    </MgmtPageShell>
  );
};
