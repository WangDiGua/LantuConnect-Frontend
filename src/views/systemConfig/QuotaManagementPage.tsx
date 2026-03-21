import React, { useState } from 'react';
import { CreditCard, X, Plus } from 'lucide-react';
import { Theme, FontSize } from '../../types';
import { MgmtPageShell } from '../userMgmt/MgmtPageShell';
import { nativeInputClass, nativeSelectClass } from '../../utils/formFieldClasses';

interface Props {
  theme: Theme;
  fontSize: FontSize;
  showMessage: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

type ScopeType = 'global' | 'department' | 'user';

interface QuotaRule {
  id: number;
  scopeType: ScopeType;
  scopeName: string;
  dailyLimit: number;
  monthlyLimit: number;
  qpsLimit: number;
  currentDailyUsage: number;
  currentMonthlyUsage: number;
}

interface RateLimitRule {
  id: number;
  targetName: string;
  dimension: 'APP' | 'USER' | 'IP' | 'AGENT';
  qpsLimit: number;
  burstSize: number;
  enabled: boolean;
}

const INITIAL_QUOTAS: QuotaRule[] = [
  { id: 1, scopeType: 'global', scopeName: '全平台', dailyLimit: 1000000, monthlyLimit: 20000000, qpsLimit: 500, currentDailyUsage: 423100, currentMonthlyUsage: 8450000 },
  { id: 2, scopeType: 'department', scopeName: '计算机学院', dailyLimit: 100000, monthlyLimit: 2000000, qpsLimit: 100, currentDailyUsage: 67200, currentMonthlyUsage: 1240000 },
  { id: 3, scopeType: 'department', scopeName: '教务处', dailyLimit: 50000, monthlyLimit: 1000000, qpsLimit: 50, currentDailyUsage: 12300, currentMonthlyUsage: 280000 },
  { id: 4, scopeType: 'user', scopeName: '张三 (2021001)', dailyLimit: 1000, monthlyLimit: 20000, qpsLimit: 10, currentDailyUsage: 856, currentMonthlyUsage: 15600 },
  { id: 5, scopeType: 'user', scopeName: '李四 (T2019052)', dailyLimit: 5000, monthlyLimit: 100000, qpsLimit: 20, currentDailyUsage: 4200, currentMonthlyUsage: 87000 },
  { id: 6, scopeType: 'department', scopeName: '图书馆', dailyLimit: 30000, monthlyLimit: 600000, qpsLimit: 30, currentDailyUsage: 1850, currentMonthlyUsage: 42000 },
];

const INITIAL_RATE_LIMITS: RateLimitRule[] = [
  { id: 1, targetName: '全局默认', dimension: 'USER', qpsLimit: 10, burstSize: 20, enabled: true },
  { id: 2, targetName: '智能问答 Agent', dimension: 'AGENT', qpsLimit: 50, burstSize: 80, enabled: true },
  { id: 3, targetName: '外部 API 接入', dimension: 'APP', qpsLimit: 100, burstSize: 150, enabled: true },
  { id: 4, targetName: 'IP 防刷', dimension: 'IP', qpsLimit: 30, burstSize: 50, enabled: false },
];

const SCOPE_CFG: Record<ScopeType, { label: string; light: string; dark: string }> = {
  global:     { label: '全局', light: 'bg-blue-100 text-blue-800',     dark: 'bg-blue-500/20 text-blue-300' },
  department: { label: '部门', light: 'bg-purple-100 text-purple-800', dark: 'bg-purple-500/20 text-purple-300' },
  user:       { label: '用户', light: 'bg-teal-100 text-teal-800',     dark: 'bg-teal-500/20 text-teal-300' },
};

const DIM_CFG: Record<string, { label: string; light: string; dark: string }> = {
  APP:   { label: 'APP',   light: 'bg-indigo-100 text-indigo-800', dark: 'bg-indigo-500/20 text-indigo-300' },
  USER:  { label: 'USER',  light: 'bg-sky-100 text-sky-800',       dark: 'bg-sky-500/20 text-sky-300' },
  IP:    { label: 'IP',    light: 'bg-orange-100 text-orange-800', dark: 'bg-orange-500/20 text-orange-300' },
  AGENT: { label: 'AGENT', light: 'bg-rose-100 text-rose-800',     dark: 'bg-rose-500/20 text-rose-300' },
};

function ProgressBar({ value, max, theme }: { value: number; max: number; theme: Theme }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const isDark = theme === 'dark';
  let barColor = 'bg-emerald-500';
  if (pct >= 90) barColor = 'bg-red-500';
  else if (pct >= 70) barColor = 'bg-amber-500';

  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      <div className={`flex-1 h-2 rounded-full overflow-hidden ${isDark ? 'bg-white/10' : 'bg-slate-200'}`}>
        <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-xs font-medium tabular-nums w-10 text-right ${pct >= 90 ? 'text-red-500' : pct >= 70 ? 'text-amber-500' : isDark ? 'text-slate-400' : 'text-slate-600'}`}>
        {pct.toFixed(0)}%
      </span>
    </div>
  );
}

function formatNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export const QuotaManagementPage: React.FC<Props> = ({ theme, fontSize, showMessage }) => {
  const isDark = theme === 'dark';
  const [tab, setTab] = useState<'quota' | 'rate-limit'>('quota');
  const [quotas, setQuotas] = useState<QuotaRule[]>(INITIAL_QUOTAS);
  const [rateLimits, setRateLimits] = useState<RateLimitRule[]>(INITIAL_RATE_LIMITS);

  const [showQuotaModal, setShowQuotaModal] = useState(false);
  const [quotaDraft, setQuotaDraft] = useState<Partial<QuotaRule>>({ scopeType: 'global', dailyLimit: 10000, monthlyLimit: 200000, qpsLimit: 20 });

  const [showRLModal, setShowRLModal] = useState(false);
  const [rlDraft, setRlDraft] = useState<Partial<RateLimitRule>>({ targetName: '', dimension: 'USER', qpsLimit: 10, burstSize: 20, enabled: true });

  const sel = nativeSelectClass(theme);
  const inp = nativeInputClass(theme);

  const addQuota = () => {
    const next: QuotaRule = {
      id: Date.now(),
      scopeType: quotaDraft.scopeType ?? 'global',
      scopeName: quotaDraft.scopeType === 'global' ? '全平台' : quotaDraft.scopeName ?? '未命名',
      dailyLimit: quotaDraft.dailyLimit ?? 10000,
      monthlyLimit: quotaDraft.monthlyLimit ?? 200000,
      qpsLimit: quotaDraft.qpsLimit ?? 20,
      currentDailyUsage: 0,
      currentMonthlyUsage: 0,
    };
    setQuotas((prev) => [...prev, next]);
    setShowQuotaModal(false);
    setQuotaDraft({ scopeType: 'global', dailyLimit: 10000, monthlyLimit: 200000, qpsLimit: 20 });
    showMessage('配额规则已添加', 'success');
  };

  const addRateLimit = () => {
    const next: RateLimitRule = {
      id: Date.now(),
      targetName: rlDraft.targetName || '未命名规则',
      dimension: rlDraft.dimension ?? 'USER',
      qpsLimit: rlDraft.qpsLimit ?? 10,
      burstSize: rlDraft.burstSize ?? 20,
      enabled: rlDraft.enabled ?? true,
    };
    setRateLimits((prev) => [...prev, next]);
    setShowRLModal(false);
    setRlDraft({ targetName: '', dimension: 'USER', qpsLimit: 10, burstSize: 20, enabled: true });
    showMessage('限流规则已添加', 'success');
  };

  const toggleRL = (id: number) => {
    setRateLimits((prev) => prev.map((r) => r.id === id ? { ...r, enabled: !r.enabled } : r));
  };

  const tabs = [
    { key: 'quota' as const, label: '配额管理' },
    { key: 'rate-limit' as const, label: '限流策略' },
  ];

  const tabBar = (
    <div className="flex gap-1 px-4 sm:px-6 pt-4 pb-1">
      {tabs.map((t) => (
        <button
          key={t.key}
          type="button"
          onClick={() => setTab(t.key)}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
            tab === t.key
              ? isDark ? 'bg-white/10 text-white' : 'bg-blue-50 text-blue-700 shadow-sm'
              : isDark ? 'text-slate-400 hover:bg-white/5' : 'text-slate-500 hover:bg-slate-100'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );

  return (
    <MgmtPageShell theme={theme} fontSize={fontSize} titleIcon={CreditCard} breadcrumbSegments={['系统配置', '配额管理']} description="管理调用配额与限流策略，按全局 / 部门 / 用户维度配置用量上限">
      {tabBar}

      {tab === 'quota' && (
        <div className="min-w-0 px-4 sm:px-6 pb-6 pt-3">
          <div className="flex justify-end mb-3">
            <button type="button" onClick={() => setShowQuotaModal(true)} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors">
              <Plus size={15} />
              新增配额
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm min-w-[860px]">
              <thead>
                <tr className={`border-b ${isDark ? 'border-white/10 bg-[#2C2C2E]/80' : 'border-slate-200 bg-slate-50'}`}>
                  {['范围', '名称', '日配额', '日用量', '月配额', '月用量', 'QPS 上限'].map((h) => (
                    <th key={h} className={`px-4 py-3 font-semibold whitespace-nowrap ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {quotas.map((r, i) => {
                  const sc = SCOPE_CFG[r.scopeType];
                  return (
                    <tr key={r.id} className={`border-b ${isDark ? `border-white/5 ${i % 2 === 0 ? 'bg-[#1C1C1E]' : 'bg-[#2C2C2E]/40'}` : `border-slate-100 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/80'}`}`}>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-lg text-xs font-medium ${isDark ? sc.dark : sc.light}`}>{sc.label}</span>
                      </td>
                      <td className={`px-4 py-3 font-medium ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{r.scopeName}</td>
                      <td className={`px-4 py-3 text-xs tabular-nums ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{formatNum(r.dailyLimit)}</td>
                      <td className="px-4 py-3">
                        <div className={`text-xs mb-1 tabular-nums ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{formatNum(r.currentDailyUsage)}</div>
                        <ProgressBar value={r.currentDailyUsage} max={r.dailyLimit} theme={theme} />
                      </td>
                      <td className={`px-4 py-3 text-xs tabular-nums ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{formatNum(r.monthlyLimit)}</td>
                      <td className="px-4 py-3">
                        <div className={`text-xs mb-1 tabular-nums ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{formatNum(r.currentMonthlyUsage)}</div>
                        <ProgressBar value={r.currentMonthlyUsage} max={r.monthlyLimit} theme={theme} />
                      </td>
                      <td className={`px-4 py-3 text-xs font-mono text-center ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{r.qpsLimit}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'rate-limit' && (
        <div className="min-w-0 px-4 sm:px-6 pb-6 pt-3">
          <div className="flex justify-end mb-3">
            <button type="button" onClick={() => setShowRLModal(true)} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors">
              <Plus size={15} />
              新增规则
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm min-w-[700px]">
              <thead>
                <tr className={`border-b ${isDark ? 'border-white/10 bg-[#2C2C2E]/80' : 'border-slate-200 bg-slate-50'}`}>
                  {['目标', '维度', 'QPS 上限', '突发容量', '状态'].map((h) => (
                    <th key={h} className={`px-4 py-3 font-semibold whitespace-nowrap ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rateLimits.map((r, i) => {
                  const dim = DIM_CFG[r.dimension];
                  return (
                    <tr key={r.id} className={`border-b ${isDark ? `border-white/5 ${i % 2 === 0 ? 'bg-[#1C1C1E]' : 'bg-[#2C2C2E]/40'}` : `border-slate-100 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/80'}`}`}>
                      <td className={`px-4 py-3 font-medium ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{r.targetName}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-lg text-xs font-medium ${isDark ? dim.dark : dim.light}`}>{dim.label}</span>
                      </td>
                      <td className={`px-4 py-3 text-sm font-mono text-center ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{r.qpsLimit}</td>
                      <td className={`px-4 py-3 text-sm font-mono text-center ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{r.burstSize}</td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => toggleRL(r.id)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${r.enabled ? 'bg-blue-600' : isDark ? 'bg-white/20' : 'bg-slate-300'}`}
                          role="switch"
                          aria-checked={r.enabled}
                        >
                          <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${r.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Quota modal */}
      {showQuotaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowQuotaModal(false)}>
          <div onClick={(e) => e.stopPropagation()} className={`w-full max-w-md mx-4 rounded-2xl border shadow-2xl ${isDark ? 'bg-[#1C1C1E] border-white/10' : 'bg-white border-slate-200'}`}>
            <div className={`flex items-center justify-between px-6 py-4 border-b ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
              <h3 className={`font-bold text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>新增配额规则</h3>
              <button type="button" onClick={() => setShowQuotaModal(false)} className={`p-1.5 rounded-xl transition-colors ${isDark ? 'hover:bg-white/10 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}>
                <X size={18} />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className={`text-xs font-medium block mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>范围类型</label>
                <select className={sel} value={quotaDraft.scopeType ?? 'global'} onChange={(e) => setQuotaDraft((p) => ({ ...p, scopeType: e.target.value as ScopeType }))}>
                  <option value="global">全局</option>
                  <option value="department">部门</option>
                  <option value="user">用户</option>
                </select>
              </div>
              {quotaDraft.scopeType !== 'global' && (
                <div>
                  <label className={`text-xs font-medium block mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    {quotaDraft.scopeType === 'department' ? '部门名称' : '用户标识'}
                  </label>
                  <input className={inp} placeholder={quotaDraft.scopeType === 'department' ? '如：信息工程学院' : '如：王五 (2022003)'} value={quotaDraft.scopeName ?? ''} onChange={(e) => setQuotaDraft((p) => ({ ...p, scopeName: e.target.value }))} />
                </div>
              )}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={`text-xs font-medium block mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>日配额</label>
                  <input type="number" className={inp} value={quotaDraft.dailyLimit ?? 10000} onChange={(e) => setQuotaDraft((p) => ({ ...p, dailyLimit: Number(e.target.value) }))} />
                </div>
                <div>
                  <label className={`text-xs font-medium block mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>月配额</label>
                  <input type="number" className={inp} value={quotaDraft.monthlyLimit ?? 200000} onChange={(e) => setQuotaDraft((p) => ({ ...p, monthlyLimit: Number(e.target.value) }))} />
                </div>
                <div>
                  <label className={`text-xs font-medium block mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>QPS 上限</label>
                  <input type="number" className={inp} value={quotaDraft.qpsLimit ?? 20} onChange={(e) => setQuotaDraft((p) => ({ ...p, qpsLimit: Number(e.target.value) }))} />
                </div>
              </div>
            </div>
            <div className={`flex justify-end gap-3 px-6 py-4 border-t ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
              <button type="button" onClick={() => setShowQuotaModal(false)} className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${isDark ? 'bg-white/10 hover:bg-white/15 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}>
                取消
              </button>
              <button type="button" onClick={addQuota} className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors">
                添加
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rate limit modal */}
      {showRLModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowRLModal(false)}>
          <div onClick={(e) => e.stopPropagation()} className={`w-full max-w-md mx-4 rounded-2xl border shadow-2xl ${isDark ? 'bg-[#1C1C1E] border-white/10' : 'bg-white border-slate-200'}`}>
            <div className={`flex items-center justify-between px-6 py-4 border-b ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
              <h3 className={`font-bold text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>新增限流规则</h3>
              <button type="button" onClick={() => setShowRLModal(false)} className={`p-1.5 rounded-xl transition-colors ${isDark ? 'hover:bg-white/10 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}>
                <X size={18} />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className={`text-xs font-medium block mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>目标名称</label>
                <input className={inp} placeholder="如：智能问答 Agent" value={rlDraft.targetName ?? ''} onChange={(e) => setRlDraft((p) => ({ ...p, targetName: e.target.value }))} />
              </div>
              <div>
                <label className={`text-xs font-medium block mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>限流维度</label>
                <select className={sel} value={rlDraft.dimension ?? 'USER'} onChange={(e) => setRlDraft((p) => ({ ...p, dimension: e.target.value as RateLimitRule['dimension'] }))}>
                  <option value="APP">APP</option>
                  <option value="USER">USER</option>
                  <option value="IP">IP</option>
                  <option value="AGENT">AGENT</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`text-xs font-medium block mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>QPS 上限</label>
                  <input type="number" className={inp} value={rlDraft.qpsLimit ?? 10} onChange={(e) => setRlDraft((p) => ({ ...p, qpsLimit: Number(e.target.value) }))} />
                </div>
                <div>
                  <label className={`text-xs font-medium block mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>突发容量</label>
                  <input type="number" className={inp} value={rlDraft.burstSize ?? 20} onChange={(e) => setRlDraft((p) => ({ ...p, burstSize: Number(e.target.value) }))} />
                </div>
              </div>
              <label className="flex items-center gap-2.5 cursor-pointer">
                <button
                  type="button"
                  onClick={() => setRlDraft((p) => ({ ...p, enabled: !p.enabled }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${rlDraft.enabled ? 'bg-blue-600' : isDark ? 'bg-white/20' : 'bg-slate-300'}`}
                  role="switch"
                  aria-checked={!!rlDraft.enabled}
                >
                  <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${rlDraft.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
                <span className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>立即启用</span>
              </label>
            </div>
            <div className={`flex justify-end gap-3 px-6 py-4 border-t ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
              <button type="button" onClick={() => setShowRLModal(false)} className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${isDark ? 'bg-white/10 hover:bg-white/15 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}>
                取消
              </button>
              <button type="button" onClick={addRateLimit} className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors">
                添加
              </button>
            </div>
          </div>
        </div>
      )}
    </MgmtPageShell>
  );
};
