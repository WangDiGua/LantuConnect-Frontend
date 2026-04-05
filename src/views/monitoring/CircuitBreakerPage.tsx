import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AlertTriangle, Zap, RotateCcw, Search } from 'lucide-react';
import { Theme, FontSize } from '../../types';
import { MgmtPageShell } from '../userMgmt/MgmtPageShell';
import { nativeInputClass } from '../../utils/formFieldClasses';
import {
  btnPrimary, btnSecondary, btnGhost, iconMuted, mgmtTableActionGhost,
  pageBlockStack, tableHeadCell, tableBodyRow, tableCell, textPrimary, textSecondary, textMuted,
} from '../../utils/uiClasses';
import { TOOLBAR_ROW_LIST, toolbarSearchInputClass } from '../../utils/toolbarFieldClasses';
import { LantuSelect } from '../../components/common/LantuSelect';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { BentoCard } from '../../components/common/BentoCard';
import { PageSkeleton } from '../../components/common/PageSkeleton';
import { healthService } from '../../api/services/health.service';
import type { CircuitBreakerItem } from '../../types/dto/health';
import { formatDateTime } from '../../utils/formatDateTime';
import { RESOURCE_TYPE_LABEL, resourceTypeLabel } from '../../constants/resourceTypes';
import { AutoHeightTextarea } from '../../components/common/AutoHeightTextarea';

interface Props {
  theme: Theme;
  fontSize: FontSize;
  showMessage: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

type CBState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

const INPUT_FOCUS = 'focus:ring-2 focus:ring-neutral-900/20 focus:border-neutral-900/35';

const STATE_CFG: Record<CBState, { label: string; light: string; dark: string }> = {
  CLOSED:    { label: '正常',   light: 'bg-emerald-100 text-emerald-800', dark: 'bg-emerald-500/20 text-emerald-300' },
  OPEN:      { label: '已熔断', light: 'bg-red-100 text-red-800',         dark: 'bg-red-500/20 text-red-300' },
  HALF_OPEN: { label: '探测中', light: 'bg-amber-100 text-amber-800',     dark: 'bg-amber-500/20 text-amber-300' },
};

const CB_STATE_FILTER_OPTIONS = [
  { value: 'all', label: '全部状态' },
  { value: 'CLOSED', label: '正常' },
  { value: 'OPEN', label: '已熔断' },
  { value: 'HALF_OPEN', label: '探测中' },
];

export const CircuitBreakerPage: React.FC<Props> = ({ theme, fontSize, showMessage }) => {
  const isDark = theme === 'dark';
  const inputCls = `${nativeInputClass(theme)} ${INPUT_FOCUS}`;
  const labelCls = `text-sm font-medium ${textSecondary(theme)}`;

  const [data, setData] = useState<CircuitBreakerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<Partial<CircuitBreakerItem>>({});
  const [confirmAction, setConfirmAction] = useState<{ id: number; action: 'trip' | 'reset' } | null>(null);
  const [listQ, setListQ] = useState('');
  const [stateFilter, setStateFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  const fetchData = useCallback(() => {
    setLoading(true);
    healthService.listCircuitBreakers()
      .then(items => setData(items))
      .catch(err => { console.error(err); showMessage('加载熔断配置失败', 'error'); })
      .finally(() => setLoading(false));
  }, [showMessage]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openEdit = (item: CircuitBreakerItem) => {
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
    healthService.updateCircuitBreaker(editingId, draft)
      .then(() => { setEditingId(null); showMessage('熔断配置已保存', 'success'); fetchData(); })
      .catch(err => { console.error(err); showMessage('保存失败', 'error'); });
  };

  const executeAction = () => {
    if (!confirmAction) return;
    const { id, action } = confirmAction;
    const apiCall = action === 'trip' ? healthService.manualBreak(id) : healthService.manualRecover(id);

    apiCall
      .then(() => { setConfirmAction(null); showMessage(action === 'trip' ? '已手动熔断' : '已手动恢复', action === 'trip' ? 'info' : 'success'); fetchData(); })
      .catch(err => { console.error(err); showMessage('操作失败', 'error'); });
  };

  const confirmItem = confirmAction ? data.find((r) => r.id === confirmAction.id) : null;

  const filteredRows = useMemo(() => {
    let list = data;
    if (stateFilter !== 'all') list = list.filter((r) => r.currentState === stateFilter);
    if (typeFilter !== 'all') {
      list = list.filter((r) => String(r.resourceType ?? '').toLowerCase() === typeFilter);
    }
    const term = listQ.trim().toLowerCase();
    if (term) {
      list = list.filter(
        (r) => r.displayName.toLowerCase().includes(term) || String(r.fallbackAgentName ?? '').toLowerCase().includes(term),
      );
    }
    return list;
  }, [data, listQ, stateFilter, typeFilter]);

  const toolbar = (
    <div className={`${TOOLBAR_ROW_LIST} min-w-0`}>
      <div className="relative min-w-0 flex-1 shrink sm:max-w-md">
        <Search className={`absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${iconMuted(theme)}`} size={16} />
        <input
          type="search"
          placeholder="搜索名称或降级 Agent…"
          value={listQ}
          onChange={(e) => setListQ(e.target.value)}
          className={toolbarSearchInputClass(theme)}
          aria-label="筛选熔断策略"
        />
      </div>
      <LantuSelect
        theme={theme}
        value={stateFilter}
        onChange={setStateFilter}
        options={CB_STATE_FILTER_OPTIONS}
        placeholder="状态"
        className="!w-36 shrink-0"
        triggerClassName={`w-full !min-w-0 ${INPUT_FOCUS}`}
      />
      <LantuSelect
        theme={theme}
        value={typeFilter}
        onChange={setTypeFilter}
        options={[
          { value: 'all', label: '全部类型' },
          { value: 'agent', label: RESOURCE_TYPE_LABEL.agent },
          { value: 'skill', label: RESOURCE_TYPE_LABEL.skill },
          { value: 'mcp', label: RESOURCE_TYPE_LABEL.mcp },
          { value: 'app', label: RESOURCE_TYPE_LABEL.app },
          { value: 'dataset', label: RESOURCE_TYPE_LABEL.dataset },
        ]}
        placeholder="资源类型"
        className="!w-36 shrink-0"
        triggerClassName={`w-full !min-w-0 ${INPUT_FOCUS}`}
      />
    </div>
  );

  return (
    <MgmtPageShell theme={theme} fontSize={fontSize} titleIcon={AlertTriangle} breadcrumbSegments={['监控中心', '熔断降级']} description="按统一资源类型管理网关熔断：失败阈值、半开探测与降级目标（t_resource_circuit_breaker）" toolbar={toolbar}>
      <div className="min-w-0 px-4 sm:px-6 pb-6">
        {loading ? (
          <PageSkeleton type="table" />
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
                {([['CLOSED', '正常运行'], ['OPEN', '已熔断'], ['HALF_OPEN', '探测中']] as [CBState, string][]).map(([state, label]) => {
                const count = data.filter((r) => r.currentState === state).length;
                const cfg = STATE_CFG[state];
                return (
                  <BentoCard key={state} theme={theme} padding="sm">
                    <div className={`text-xs font-medium ${textMuted(theme)}`}>{label}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-2xl font-bold ${textPrimary(theme)}`}>{count}</span>
                      <span className={`inline-flex shrink-0 items-center whitespace-nowrap px-2 py-0.5 rounded-lg text-[11px] font-medium ${isDark ? cfg.dark : cfg.light}`}>{cfg.label}</span>
                    </div>
                  </BentoCard>
                );
              })}
            </div>

            <BentoCard theme={theme} padding="sm" className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm min-w-[960px]">
                  <thead>
                    <tr>
                      {['名称', '资源类型', '状态', '失败阈值', '熔断时长(s)', '降级资源', '最近熔断', '统计', '操作'].map((h) => (
                        <th key={h} className={tableHeadCell(theme)}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.map((r, i) => {
                      const stCfg = STATE_CFG[r.currentState];
                      return (
                        <tr key={r.id} className={tableBodyRow(theme, i)}>
                          <td className={`${tableCell()} ${textPrimary(theme)}`}>
                            <div className="font-medium">{r.displayName}</div>
                          </td>
                          <td className={`${tableCell()} text-xs ${textMuted(theme)}`}>
                            {resourceTypeLabel(r.resourceType)}
                          </td>
                          <td className={tableCell()}>
                            <span className={`inline-flex shrink-0 items-center whitespace-nowrap px-2.5 py-1 rounded-lg text-xs font-semibold ${isDark ? stCfg.dark : stCfg.light}`}>
                              {stCfg.label}
                            </span>
                          </td>
                          <td className={`${tableCell()} text-center ${textMuted(theme)}`}>{r.failureThreshold}</td>
                          <td className={`${tableCell()} text-center ${textMuted(theme)}`}>{r.openDurationSec}</td>
                          <td className={`${tableCell()} text-xs ${textMuted(theme)}`}>{r.fallbackAgentName ?? '—'}</td>
                          <td className={`${tableCell()} text-xs whitespace-nowrap ${textMuted(theme)}`}>{formatDateTime(r.lastOpenedAt)}</td>
                          <td className={tableCell()}>
                            <div className={`text-xs ${textMuted(theme)}`}>
                              <span className="text-emerald-500 font-medium">{r.successCount}</span>
                              <span className="mx-1">/</span>
                              <span className="text-red-500 font-medium">{r.failureCount}</span>
                            </div>
                          </td>
                          <td className={tableCell()}>
                            <div className="flex items-center gap-2">
                              <button type="button" onClick={() => openEdit(r)} className={mgmtTableActionGhost(theme)}>编辑</button>
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
            </BentoCard>
            {data.length > 0 && filteredRows.length === 0 && (
              <p className={`text-center py-8 text-sm ${textMuted(theme)}`}>无匹配项，请调整搜索或状态筛选</p>
            )}
          </>
        )}
      </div>

      <Modal
        open={editingId != null}
        onClose={() => setEditingId(null)}
        title={`熔断配置 · ${data.find((r) => r.id === editingId)?.displayName ?? ''}`}
        theme={theme}
        size="md"
        footer={
          <>
            <button type="button" onClick={() => setEditingId(null)} className={btnSecondary(theme)}>取消</button>
            <button type="button" onClick={saveEdit} className={btnPrimary}>保存</button>
          </>
        }
      >
        <div className={pageBlockStack}>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={`${labelCls} mb-1.5 block`}>失败阈值</label>
              <input type="number" className={inputCls} value={draft.failureThreshold ?? 5} onChange={(e) => setDraft((p) => ({ ...p, failureThreshold: Number(e.target.value) }))} />
            </div>
            <div>
              <label className={`${labelCls} mb-1.5 block`}>熔断时长(s)</label>
              <input type="number" className={inputCls} value={draft.openDurationSec ?? 30} onChange={(e) => setDraft((p) => ({ ...p, openDurationSec: Number(e.target.value) }))} />
            </div>
            <div>
              <label className={`${labelCls} mb-1.5 block`}>半开最大调用</label>
              <input type="number" className={inputCls} value={draft.halfOpenMaxCalls ?? 3} onChange={(e) => setDraft((p) => ({ ...p, halfOpenMaxCalls: Number(e.target.value) }))} />
            </div>
          </div>
          <div>
            <label className={`${labelCls} mb-1.5 block`}>降级 Agent</label>
            <input className={inputCls} value={draft.fallbackAgentName ?? ''} onChange={(e) => setDraft((p) => ({ ...p, fallbackAgentName: e.target.value || null }))} placeholder="降级 Agent 名称（留空不降级）" />
          </div>
          <div>
            <label className={`${labelCls} mb-1.5 block`}>降级提示消息</label>
            <AutoHeightTextarea className={`${inputCls} resize-none`} minRows={3} maxRows={16} value={draft.fallbackMessage ?? ''} onChange={(e) => setDraft((p) => ({ ...p, fallbackMessage: e.target.value }))} />
          </div>
        </div>
      </Modal>

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
