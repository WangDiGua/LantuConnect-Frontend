import React, { useEffect, useState } from 'react';
import { Theme, FontSize } from '../../types';
import { MgmtPageShell } from '../userMgmt/MgmtPageShell';
import { Sliders, Shield, Network, HardDrive, Lock } from 'lucide-react';
import { nativeSelectClass } from '../../utils/formFieldClasses';
import { useSysParams, useUpdateSysParams, useSysSecurity, useUpdateSysSecurity } from '../../hooks/queries/useSystemConfig';
import type { SystemParam, SecuritySetting } from '../../types/dto/system-config';
import { PageSkeleton } from '../../components/common/PageSkeleton';
import { PageError } from '../../components/common/PageError';
import { EmptyState } from '../../components/common/EmptyState';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';

interface PageProps {
  theme: Theme;
  fontSize: FontSize;
  showMessage: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

const card =
  (theme: Theme) =>
  `rounded-2xl border shadow-none p-4 sm:p-6 ${theme === 'light' ? 'bg-white border-slate-200/80' : 'bg-[#1C1C1E] border-white/10'}`;

const input = (theme: Theme) =>
  `w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-500/30 ${
    theme === 'light' ? 'border-slate-200 bg-white text-slate-900' : 'border-white/10 bg-black/30 text-white'
  }`;

const btn =
  'px-4 py-2 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors';

export const SystemParamsPage: React.FC<PageProps> = ({ theme, fontSize, showMessage }) => {
  const { data, isLoading, isError, error, refetch } = useSysParams();
  const updateMut = useUpdateSysParams();
  const [draft, setDraft] = useState<SystemParam[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    if (data) setDraft(data.map((p) => ({ ...p })));
  }, [data]);

  if (isLoading) {
    return (
      <MgmtPageShell theme={theme} fontSize={fontSize} titleIcon={Sliders} breadcrumbSegments={['系统配置', '系统参数']}>
        <PageSkeleton type="form" />
      </MgmtPageShell>
    );
  }

  if (isError) {
    return (
      <MgmtPageShell theme={theme} fontSize={fontSize} titleIcon={Sliders} breadcrumbSegments={['系统配置', '系统参数']}>
        <PageError error={error instanceof Error ? error : null} onRetry={() => refetch()} />
      </MgmtPageShell>
    );
  }

  if (!draft.length) {
    return (
      <MgmtPageShell theme={theme} fontSize={fontSize} titleIcon={Sliders} breadcrumbSegments={['系统配置', '系统参数']}>
        <EmptyState title="暂无系统参数" description="后端未返回可编辑参数" />
      </MgmtPageShell>
    );
  }

  const save = () => {
    updateMut.mutate(draft, {
      onSuccess: () => {
        showMessage('系统参数已保存', 'success');
        setConfirmOpen(false);
      },
      onError: (e) => showMessage(e instanceof Error ? e.message : '保存失败', 'error'),
    });
  };

  return (
    <MgmtPageShell theme={theme} fontSize={fontSize} titleIcon={Sliders} breadcrumbSegments={['系统配置', '系统参数']}>
      <div className={`max-w-xl ${card(theme)} space-y-4`}>
        {draft.map((p, idx) => (
          <div key={p.key}>
            <label className="text-xs text-slate-500 block mb-1">
              {p.description || p.key}
              {p.category ? ` · ${p.category}` : ''}
            </label>
            <input
              className={input(theme)}
              value={p.value}
              disabled={!p.editable}
              onChange={(e) => {
                const v = e.target.value;
                setDraft((prev) => prev.map((x, i) => (i === idx ? { ...x, value: v } : x)));
              }}
            />
          </div>
        ))}
        <button type="button" className={btn} onClick={() => setConfirmOpen(true)}>
          保存
        </button>
      </div>
      <ConfirmDialog
        open={confirmOpen}
        title="保存系统参数"
        message="确定将当前表单提交到服务器？"
        variant="info"
        confirmText="保存"
        loading={updateMut.isPending}
        onConfirm={save}
        onCancel={() => setConfirmOpen(false)}
      />
    </MgmtPageShell>
  );
};

function SecurityField({
  theme,
  s,
  onChange,
}: {
  theme: Theme;
  s: SecuritySetting;
  onChange: (next: SecuritySetting) => void;
}) {
  if (s.type === 'boolean') {
    return (
      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input
          type="checkbox"
          checked={!!s.value}
          onChange={(e) => onChange({ ...s, value: e.target.checked })}
          className="rounded"
        />
        {s.label}
      </label>
    );
  }
  if (s.type === 'number') {
    return (
      <div>
        <label className="text-xs text-slate-500 block mb-1">{s.label}</label>
        <input
          className={input(theme)}
          type="number"
          value={typeof s.value === 'number' ? s.value : Number(s.value)}
          onChange={(e) => onChange({ ...s, value: Number(e.target.value) })}
        />
        {s.description ? <p className="text-xs text-slate-500 mt-1">{s.description}</p> : null}
      </div>
    );
  }
  return (
    <div>
      <label className="text-xs text-slate-500 block mb-1">{s.label}</label>
      <input className={input(theme)} value={String(s.value ?? '')} onChange={(e) => onChange({ ...s, value: e.target.value })} />
      {s.description ? <p className="text-xs text-slate-500 mt-1">{s.description}</p> : null}
    </div>
  );
}

export const SecuritySettingsPage: React.FC<PageProps> = ({ theme, fontSize, showMessage }) => {
  const { data, isLoading, isError, error, refetch } = useSysSecurity();
  const updateMut = useUpdateSysSecurity();
  const [draft, setDraft] = useState<SecuritySetting[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    if (data) setDraft(data.map((s) => ({ ...s })));
  }, [data]);

  if (isLoading) {
    return (
      <MgmtPageShell theme={theme} fontSize={fontSize} titleIcon={Shield} breadcrumbSegments={['系统配置', '安全设置']}>
        <PageSkeleton type="form" />
      </MgmtPageShell>
    );
  }

  if (isError) {
    return (
      <MgmtPageShell theme={theme} fontSize={fontSize} titleIcon={Shield} breadcrumbSegments={['系统配置', '安全设置']}>
        <PageError error={error instanceof Error ? error : null} onRetry={() => refetch()} />
      </MgmtPageShell>
    );
  }

  if (!draft.length) {
    return (
      <MgmtPageShell theme={theme} fontSize={fontSize} titleIcon={Shield} breadcrumbSegments={['系统配置', '安全设置']}>
        <EmptyState title="暂无安全策略项" description="后端未返回安全设置" />
      </MgmtPageShell>
    );
  }

  const save = () => {
    updateMut.mutate(draft, {
      onSuccess: () => {
        showMessage('安全策略已更新', 'success');
        setConfirmOpen(false);
      },
      onError: (e) => showMessage(e instanceof Error ? e.message : '保存失败', 'error'),
    });
  };

  return (
    <MgmtPageShell theme={theme} fontSize={fontSize} titleIcon={Shield} breadcrumbSegments={['系统配置', '安全设置']}>
      <div className={`max-w-xl ${card(theme)} space-y-4`}>
        {draft.map((s, idx) => (
          <SecurityField
            key={s.key}
            theme={theme}
            s={s}
            onChange={(next) => setDraft((prev) => prev.map((x, i) => (i === idx ? next : x)))}
          />
        ))}
        <button type="button" className={btn} onClick={() => setConfirmOpen(true)}>
          保存
        </button>
      </div>
      <ConfirmDialog
        open={confirmOpen}
        title="保存安全设置"
        message="确定提交当前安全策略？"
        variant="warning"
        confirmText="保存"
        loading={updateMut.isPending}
        onConfirm={save}
        onCancel={() => setConfirmOpen(false)}
      />
    </MgmtPageShell>
  );
};

export const NetworkConfigPage: React.FC<PageProps> = ({ theme, fontSize, showMessage }) => {
  const [allowlist, setAllowlist] = useState('10.0.0.0/8\n172.16.0.0/12');
  return (
    <MgmtPageShell theme={theme} fontSize={fontSize} titleIcon={Network} breadcrumbSegments={['系统配置', '网络配置']}>
      <div className={`max-w-xl ${card(theme)} space-y-4`}>
        <div>
          <label className="text-xs text-slate-500 block mb-1">管理端 IP 白名单（每行一个 CIDR）</label>
          <textarea className={`${input(theme)} min-h-[120px] font-mono text-xs`} value={allowlist} onChange={(e) => setAllowlist(e.target.value)} />
        </div>
        <button type="button" className={btn} onClick={() => showMessage('白名单已下发至网关（Mock）', 'success')}>
          应用
        </button>
      </div>
    </MgmtPageShell>
  );
};

export const SystemQuotaPage: React.FC<PageProps> = ({ theme, fontSize, showMessage }) => {
  const [globalCap, setGlobalCap] = useState('1000000');
  return (
    <MgmtPageShell theme={theme} fontSize={fontSize} titleIcon={HardDrive} breadcrumbSegments={['系统配置', '配额管理']}>
      <div className={`max-w-xl ${card(theme)} space-y-4`}>
        <div>
          <label className="text-xs text-slate-500 block mb-1">全平台日调用上限</label>
          <input className={input(theme)} value={globalCap} onChange={(e) => setGlobalCap(e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-slate-500 block mb-1">超限策略</label>
          <select className={nativeSelectClass(theme)}>
            <option>仅告警</option>
            <option>软限流</option>
            <option>硬拒绝</option>
          </select>
        </div>
        <button type="button" className={btn} onClick={() => showMessage('全局配额已保存（Mock）', 'success')}>
          保存
        </button>
      </div>
    </MgmtPageShell>
  );
};

export const AccessControlPage: React.FC<PageProps> = ({ theme, fontSize, showMessage }) => {
  const [rules, setRules] = useState<{ id: string; path: string; roles: string }[]>([
    { id: '1', path: '/admin/**', roles: 'super_admin' },
  ]);
  return (
    <MgmtPageShell theme={theme} fontSize={fontSize} titleIcon={Lock} breadcrumbSegments={['系统配置', '访问控制']}>
      <button
        type="button"
        className={`${btn} mb-4`}
        onClick={() => {
          setRules((prev) => [...prev, { id: `${Date.now()}`, path: '/api/**', roles: 'authenticated' }]);
          showMessage('已添加规则草稿', 'success');
        }}
      >
        新增规则
      </button>
      <div className={card(theme)}>
        {rules.map((r) => (
          <div key={r.id} className={`p-4 flex flex-wrap justify-between gap-2 border-b last:border-0 ${theme === 'light' ? 'border-slate-100' : 'border-white/10'}`}>
            <div className="font-mono text-sm">{r.path}</div>
            <div className="text-sm text-slate-500">{r.roles}</div>
          </div>
        ))}
      </div>
      <button
        type="button"
        className={`mt-4 px-4 py-2 rounded-xl text-sm font-medium border ${theme === 'light' ? 'border-slate-200' : 'border-white/15'}`}
        onClick={() => showMessage('ACL 已发布（Mock）', 'success')}
      >
        发布 ACL
      </button>
    </MgmtPageShell>
  );
};
