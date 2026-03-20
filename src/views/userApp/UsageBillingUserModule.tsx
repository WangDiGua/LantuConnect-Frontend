import React, { useState } from 'react';
import { Theme, FontSize } from '../../types';
import { UserAppShell, cardClass, inputClass, btnPrimaryClass, btnGhostClass } from './UserAppShell';
import { useBillingOverview, useBillingDetails, useInvoices, useQuotas, usePlans } from '../../hooks/queries/useBilling';
import { PageSkeleton } from '../../components/common/PageSkeleton';
import { PageError } from '../../components/common/PageError';
import { EmptyState } from '../../components/common/EmptyState';

interface UsageBillingUserModuleProps {
  activeSubItem: string;
  theme: Theme;
  fontSize: FontSize;
  showMessage: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const UsageBillingUserModule: React.FC<UsageBillingUserModuleProps> = ({
  activeSubItem,
  theme,
  fontSize,
  showMessage,
}) => {
  const [invoiceForm, setInvoiceForm] = useState({ title: '清华大学**学院', taxId: '', email: '' });
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  if (activeSubItem === '用量概览') {
    return <UsageOverviewPanel theme={theme} fontSize={fontSize} />;
  }

  if (activeSubItem === '调用明细') {
    return <BillingDetailsPanel theme={theme} fontSize={fontSize} />;
  }

  if (activeSubItem === '配额提醒') {
    return <QuotasPanel theme={theme} fontSize={fontSize} />;
  }

  if (activeSubItem === '账单') {
    return <InvoicesPanel theme={theme} fontSize={fontSize} showMessage={showMessage} />;
  }

  if (activeSubItem === '发票') {
    return (
      <UserAppShell theme={theme} fontSize={fontSize} title="发票" subtitle="提交开票信息（演示）">
        <div className={`${cardClass(theme)} p-5 space-y-3`}>
          <input className={inputClass(theme)} placeholder="发票抬头" value={invoiceForm.title} onChange={(e) => setInvoiceForm((f) => ({ ...f, title: e.target.value }))} />
          <input className={inputClass(theme)} placeholder="税号" value={invoiceForm.taxId} onChange={(e) => setInvoiceForm((f) => ({ ...f, taxId: e.target.value }))} />
          <input className={inputClass(theme)} placeholder="接收邮箱" value={invoiceForm.email} onChange={(e) => setInvoiceForm((f) => ({ ...f, email: e.target.value }))} />
          <button
            type="button"
            className={btnPrimaryClass}
            onClick={() => {
              if (!invoiceForm.email.includes('@')) {
                showMessage('请填写有效邮箱', 'error');
                return;
              }
              showMessage('开票申请已提交（Mock）', 'success');
            }}
          >
            提交申请
          </button>
        </div>
      </UserAppShell>
    );
  }

  if (activeSubItem === '套餐升级') {
    return <PlansPanel theme={theme} fontSize={fontSize} showMessage={showMessage} selectedPlanId={selectedPlanId} setSelectedPlanId={setSelectedPlanId} />;
  }

  return (
    <UserAppShell theme={theme} fontSize={fontSize} title={activeSubItem} subtitle="请选择左侧子菜单">
      <div className={cardClass(theme)} />
    </UserAppShell>
  );
};

function UsageOverviewPanel({ theme, fontSize }: Pick<UsageBillingUserModuleProps, 'theme' | 'fontSize'>) {
  const q = useBillingOverview();

  if (q.isLoading) {
    return (
      <UserAppShell theme={theme} fontSize={fontSize} title="用量概览" subtitle="本月资源消耗">
        <PageSkeleton type="detail" />
      </UserAppShell>
    );
  }
  if (q.isError) {
    return (
      <UserAppShell theme={theme} fontSize={fontSize} title="用量概览" subtitle="本月资源消耗">
        <PageError error={q.error as Error} onRetry={() => q.refetch()} />
      </UserAppShell>
    );
  }

  const o = q.data!;
  const tokenPct = o.tokensLimit > 0 ? Math.min(100, Math.round((o.tokensUsed / o.tokensLimit) * 100)) : 0;

  const statCards = [
    { k: '今日 API 调用', v: o.apiCallsToday.toLocaleString() },
    { k: '本月 Token 使用', v: `${(o.tokensUsed / 1_000_000).toFixed(2)}M / ${(o.tokensLimit / 1_000_000).toFixed(1)}M` },
    { k: '本月费用（元）', v: o.costThisMonth.toFixed(2) },
  ];

  return (
    <UserAppShell theme={theme} fontSize={fontSize} title="用量概览" subtitle={`当前套餐：${o.currentPlan}`}>
      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        {statCards.map((x) => (
          <div key={x.k} className={`${cardClass(theme)} p-5`}>
            <div className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>{x.k}</div>
            <div className={`text-2xl font-bold mt-1 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{x.v}</div>
          </div>
        ))}
      </div>
      <div className={`${cardClass(theme)} p-5 space-y-4`}>
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className={theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}>Token 配额占用</span>
            <span className="text-slate-500">{tokenPct}%</span>
          </div>
          <div className={`h-2 rounded-full overflow-hidden ${theme === 'light' ? 'bg-slate-100' : 'bg-white/10'}`}>
            <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${tokenPct}%` }} />
          </div>
        </div>
      </div>
    </UserAppShell>
  );
}

function BillingDetailsPanel({ theme, fontSize }: Pick<UsageBillingUserModuleProps, 'theme' | 'fontSize'>) {
  const q = useBillingDetails();

  if (q.isLoading) {
    return (
      <UserAppShell theme={theme} fontSize={fontSize} title="调用明细" subtitle="按日汇总">
        <PageSkeleton type="table" rows={8} />
      </UserAppShell>
    );
  }
  if (q.isError) {
    return (
      <UserAppShell theme={theme} fontSize={fontSize} title="调用明细" subtitle="按日汇总">
        <PageError error={q.error as Error} onRetry={() => q.refetch()} />
      </UserAppShell>
    );
  }

  const rows = q.data ?? [];

  return (
    <UserAppShell theme={theme} fontSize={fontSize} title="调用明细" subtitle="按日汇总">
      <div className={`${cardClass(theme)} overflow-x-auto`}>
        {rows.length === 0 ? (
          <EmptyState title="暂无明细" description="尚未产生调用记录" />
        ) : (
          <table className="w-full text-sm min-w-[640px]">
            <thead className={theme === 'light' ? 'bg-slate-50' : 'bg-white/5'}>
              <tr>
                <th className="text-left p-3">日期</th>
                <th className="text-right p-3">API 调用</th>
                <th className="text-right p-3">Tokens</th>
                <th className="text-right p-3">费用（元）</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.date} className={`border-t ${theme === 'light' ? 'border-slate-100' : 'border-white/10'}`}>
                  <td className="p-3 font-mono text-xs">{r.date}</td>
                  <td className="p-3 text-right">{r.apiCalls.toLocaleString()}</td>
                  <td className="p-3 text-right">{r.tokensUsed.toLocaleString()}</td>
                  <td className="p-3 text-right">{r.cost.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </UserAppShell>
  );
}

function QuotasPanel({ theme, fontSize }: Pick<UsageBillingUserModuleProps, 'theme' | 'fontSize'>) {
  const q = useQuotas();

  if (q.isLoading) {
    return (
      <UserAppShell theme={theme} fontSize={fontSize} title="配额提醒" subtitle="阈值与当前用量">
        <PageSkeleton type="form" />
      </UserAppShell>
    );
  }
  if (q.isError) {
    return (
      <UserAppShell theme={theme} fontSize={fontSize} title="配额提醒" subtitle="阈值与当前用量">
        <PageError error={q.error as Error} onRetry={() => q.refetch()} />
      </UserAppShell>
    );
  }

  const quotas = q.data ?? [];

  return (
    <UserAppShell theme={theme} fontSize={fontSize} title="配额提醒" subtitle="达到阈值时请关注用量">
      <div className={`${cardClass(theme)} p-5 space-y-4`}>
        {quotas.length === 0 ? (
          <EmptyState title="暂无配额策略" description="后端未配置配额告警时将显示为空" />
        ) : (
          quotas.map((qItem) => {
            const pct = qItem.threshold > 0 ? Math.min(100, Math.round((qItem.currentValue / qItem.threshold) * 100)) : 0;
            return (
              <div key={qItem.id} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className={theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}>{qItem.metric}</span>
                  <span className="text-slate-500">
                    当前 {qItem.currentValue}% / 阈值 {qItem.threshold}% {qItem.enabled ? '' : '（已关闭）'}
                  </span>
                </div>
                <div className={`h-2 rounded-full overflow-hidden ${theme === 'light' ? 'bg-slate-100' : 'bg-white/10'}`}>
                  <div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })
        )}
      </div>
    </UserAppShell>
  );
}

function InvoicesPanel({
  theme,
  fontSize,
  showMessage,
}: Pick<UsageBillingUserModuleProps, 'theme' | 'fontSize' | 'showMessage'>) {
  const q = useInvoices();

  if (q.isLoading) {
    return (
      <UserAppShell theme={theme} fontSize={fontSize} title="账单" subtitle="账单周期与支付状态">
        <PageSkeleton type="table" rows={5} />
      </UserAppShell>
    );
  }
  if (q.isError) {
    return (
      <UserAppShell theme={theme} fontSize={fontSize} title="账单" subtitle="账单周期与支付状态">
        <PageError error={q.error as Error} onRetry={() => q.refetch()} />
      </UserAppShell>
    );
  }

  const invoices = q.data ?? [];

  const statusBadge = (status: string) => {
    if (status === 'paid') return { cls: 'bg-emerald-500/15 text-emerald-600', label: '已支付' };
    if (status === 'overdue') return { cls: 'bg-red-500/15 text-red-600', label: '已逾期' };
    return { cls: 'bg-amber-500/15 text-amber-600', label: '待支付' };
  };

  return (
    <UserAppShell theme={theme} fontSize={fontSize} title="账单" subtitle="校内部署演示金额可能为 0">
      <div className={cardClass(theme)}>
        {invoices.length === 0 ? (
          <EmptyState title="暂无账单" description="生成账单后将显示在此" />
        ) : (
          invoices.map((inv) => {
            const b = statusBadge(inv.status);
            return (
              <div
                key={inv.id}
                className={`p-4 flex flex-wrap items-center justify-between gap-3 border-b last:border-0 ${
                  theme === 'light' ? 'border-slate-100' : 'border-white/10'
                }`}
              >
                <div>
                  <div className={theme === 'dark' ? 'text-white font-medium' : 'text-slate-900 font-medium'}>{inv.period}</div>
                  <div className="text-sm text-slate-500">¥{inv.amount.toFixed(2)}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${b.cls}`}>{b.label}</span>
                  {inv.status === 'unpaid' && (
                    <button type="button" className={btnPrimaryClass} onClick={() => showMessage('校内账务请通过财务流程处理', 'info')}>
                      申请支付
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </UserAppShell>
  );
}

function PlansPanel({
  theme,
  fontSize,
  showMessage,
  selectedPlanId,
  setSelectedPlanId,
}: Pick<UsageBillingUserModuleProps, 'theme' | 'fontSize' | 'showMessage'> & {
  selectedPlanId: string | null;
  setSelectedPlanId: (id: string | null) => void;
}) {
  const q = usePlans();

  if (q.isLoading) {
    return (
      <UserAppShell theme={theme} fontSize={fontSize} title="套餐升级" subtitle="对比与切换">
        <PageSkeleton type="cards" />
      </UserAppShell>
    );
  }
  if (q.isError) {
    return (
      <UserAppShell theme={theme} fontSize={fontSize} title="套餐升级" subtitle="对比与切换">
        <PageError error={q.error as Error} onRetry={() => q.refetch()} />
      </UserAppShell>
    );
  }

  const plans = q.data ?? [];
  const current = plans.find((p) => p.current);

  const formatPrice = (p: (typeof plans)[0]) => {
    if (p.price === 0) return p.name.includes('教育') || p.id === 'edu' ? '校内协议' : '¥0';
    return `¥${p.price.toLocaleString()}`;
  };

  return (
    <UserAppShell theme={theme} fontSize={fontSize} title="套餐升级" subtitle="对比与切换">
      {plans.length === 0 ? (
        <EmptyState title="暂无套餐" description="请联系管理员配置可购套餐" />
      ) : (
        <>
          <div className="grid sm:grid-cols-3 gap-4">
            {plans.map((p) => {
              const chosen = selectedPlanId === p.id || (selectedPlanId === null && p.current);
              return (
                <div key={p.id} className={`${cardClass(theme)} p-5 ${chosen ? 'ring-2 ring-blue-500' : ''}`}>
                  <h3 className={`font-bold text-lg ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{p.name}</h3>
                  <div className="text-2xl font-bold my-2 text-blue-600">{formatPrice(p)}</div>
                  <p className={`text-xs mb-2 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>Token 上限：{p.tokensLimit.toLocaleString()}</p>
                  <ul className={`text-sm space-y-1 mb-4 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                    {p.features.map((f) => (
                      <li key={f}>· {f}</li>
                    ))}
                  </ul>
                  <button type="button" className={btnGhostClass(theme)} onClick={() => setSelectedPlanId(p.id)}>
                    {p.current ? '当前套餐' : selectedPlanId === p.id ? '已选择' : '选择'}
                  </button>
                </div>
              );
            })}
          </div>
          <button
            type="button"
            className={`${btnPrimaryClass} mt-6`}
            onClick={() => {
              const id = selectedPlanId ?? current?.id ?? plans[0]?.id;
              showMessage(id ? `已提交套餐变更申请：${id}` : '请选择套餐', id ? 'success' : 'info');
            }}
          >
            确认变更
          </button>
        </>
      )}
    </UserAppShell>
  );
}
