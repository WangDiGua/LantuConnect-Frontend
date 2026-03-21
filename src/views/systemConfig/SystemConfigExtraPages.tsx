import React, { useEffect, useState } from 'react';
import { Theme, FontSize } from '../../types';
import { MgmtPageShell } from '../userMgmt/MgmtPageShell';
import { Sliders, Shield, Network, HardDrive, Lock } from 'lucide-react';
import { nativeInputClass, nativeSelectClass } from '../../utils/formFieldClasses';
import { useSysParams, useUpdateSysParams, useSysSecurity, useUpdateSysSecurity } from '../../hooks/queries/useSystemConfig';
import type { SystemParam, SecuritySetting } from '../../types/dto/system-config';
import { PageSkeleton } from '../../components/common/PageSkeleton';
import { PageError } from '../../components/common/PageError';
import { EmptyState } from '../../components/common/EmptyState';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { BentoCard } from '../../components/common/BentoCard';
import { btnPrimary, btnSecondary, textPrimary, textSecondary, textMuted } from '../../utils/uiClasses';

interface PageProps {
  theme: Theme;
  fontSize: FontSize;
  showMessage: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

const INPUT_FOCUS = 'focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/40';

export const SystemParamsPage: React.FC<PageProps> = ({ theme, fontSize, showMessage }) => {
  const isDark = theme === 'dark';
  const inputCls = `${nativeInputClass(theme)} ${INPUT_FOCUS}`;
  const labelCls = `text-sm font-medium ${textSecondary(theme)}`;

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
      onSuccess: () => { showMessage('系统参数已保存', 'success'); setConfirmOpen(false); },
      onError: (e) => showMessage(e instanceof Error ? e.message : '保存失败', 'error'),
    });
  };

  return (
    <MgmtPageShell theme={theme} fontSize={fontSize} titleIcon={Sliders} breadcrumbSegments={['系统配置', '系统参数']}>
      <div className="px-4 sm:px-6 pb-6">
        <BentoCard theme={theme} padding="lg" className="max-w-xl">
          <div className="space-y-4">
            {draft.map((p, idx) => (
              <div key={p.key}>
                <label className={`${labelCls} mb-1.5 block`}>
                  {p.description || p.key}
                  {p.category ? <span className={`ml-1 ${textMuted(theme)}`}>· {p.category}</span> : ''}
                </label>
                <input
                  className={inputCls}
                  value={p.value}
                  disabled={!p.editable}
                  onChange={(e) => {
                    const v = e.target.value;
                    setDraft((prev) => prev.map((x, i) => (i === idx ? { ...x, value: v } : x)));
                  }}
                />
              </div>
            ))}
            <button type="button" className={btnPrimary} onClick={() => setConfirmOpen(true)}>保存</button>
          </div>
        </BentoCard>
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
  theme, s, onChange,
}: {
  theme: Theme;
  s: SecuritySetting;
  onChange: (next: SecuritySetting) => void;
}) {
  const inputCls = `${nativeInputClass(theme)} ${INPUT_FOCUS}`;
  const labelCls = `text-sm font-medium ${textSecondary(theme)}`;

  if (s.type === 'boolean') {
    return (
      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={!!s.value}
          onChange={(e) => onChange({ ...s, value: e.target.checked })}
          className="toggle toggle-primary toggle-sm"
        />
        <span className={labelCls}>{s.label}</span>
      </label>
    );
  }
  if (s.type === 'number') {
    return (
      <div>
        <label className={`${labelCls} mb-1.5 block`}>{s.label}</label>
        <input
          className={inputCls}
          type="number"
          value={typeof s.value === 'number' ? s.value : Number(s.value)}
          onChange={(e) => onChange({ ...s, value: Number(e.target.value) })}
        />
        {s.description ? <p className={`text-xs mt-1 ${textMuted(theme)}`}>{s.description}</p> : null}
      </div>
    );
  }
  return (
    <div>
      <label className={`${labelCls} mb-1.5 block`}>{s.label}</label>
      <input className={inputCls} value={String(s.value ?? '')} onChange={(e) => onChange({ ...s, value: e.target.value })} />
      {s.description ? <p className={`text-xs mt-1 ${textMuted(theme)}`}>{s.description}</p> : null}
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
      onSuccess: () => { showMessage('安全策略已更新', 'success'); setConfirmOpen(false); },
      onError: (e) => showMessage(e instanceof Error ? e.message : '保存失败', 'error'),
    });
  };

  return (
    <MgmtPageShell theme={theme} fontSize={fontSize} titleIcon={Shield} breadcrumbSegments={['系统配置', '安全设置']}>
      <div className="px-4 sm:px-6 pb-6">
        <BentoCard theme={theme} padding="lg" className="max-w-xl">
          <div className="space-y-4">
            {draft.map((s, idx) => (
              <SecurityField
                key={s.key}
                theme={theme}
                s={s}
                onChange={(next) => setDraft((prev) => prev.map((x, i) => (i === idx ? next : x)))}
              />
            ))}
            <button type="button" className={btnPrimary} onClick={() => setConfirmOpen(true)}>保存</button>
          </div>
        </BentoCard>
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
  const inputCls = `${nativeInputClass(theme)} ${INPUT_FOCUS}`;
  const labelCls = `text-sm font-medium ${textSecondary(theme)}`;
  const [allowlist, setAllowlist] = useState('10.0.0.0/8\n172.16.0.0/12');

  return (
    <MgmtPageShell theme={theme} fontSize={fontSize} titleIcon={Network} breadcrumbSegments={['系统配置', '网络配置']}>
      <div className="px-4 sm:px-6 pb-6">
        <BentoCard theme={theme} padding="lg" className="max-w-xl">
          <div className="space-y-4">
            <div>
              <label className={`${labelCls} mb-1.5 block`}>管理端 IP 白名单（每行一个 CIDR）</label>
              <textarea className={`${inputCls} min-h-[120px] font-mono text-xs`} value={allowlist} onChange={(e) => setAllowlist(e.target.value)} />
            </div>
            <button type="button" className={btnPrimary} onClick={() => showMessage('白名单已下发至网关（Mock）', 'success')}>应用</button>
          </div>
        </BentoCard>
      </div>
    </MgmtPageShell>
  );
};

export const SystemQuotaPage: React.FC<PageProps> = ({ theme, fontSize, showMessage }) => {
  const inputCls = `${nativeInputClass(theme)} ${INPUT_FOCUS}`;
  const selectCls = `${nativeSelectClass(theme)} ${INPUT_FOCUS}`;
  const labelCls = `text-sm font-medium ${textSecondary(theme)}`;
  const [globalCap, setGlobalCap] = useState('1000000');

  return (
    <MgmtPageShell theme={theme} fontSize={fontSize} titleIcon={HardDrive} breadcrumbSegments={['系统配置', '配额管理']}>
      <div className="px-4 sm:px-6 pb-6">
        <BentoCard theme={theme} padding="lg" className="max-w-xl">
          <div className="space-y-4">
            <div>
              <label className={`${labelCls} mb-1.5 block`}>全平台日调用上限</label>
              <input className={inputCls} value={globalCap} onChange={(e) => setGlobalCap(e.target.value)} />
            </div>
            <div>
              <label className={`${labelCls} mb-1.5 block`}>超限策略</label>
              <select className={selectCls}>
                <option>仅告警</option>
                <option>软限流</option>
                <option>硬拒绝</option>
              </select>
            </div>
            <button type="button" className={btnPrimary} onClick={() => showMessage('全局配额已保存（Mock）', 'success')}>保存</button>
          </div>
        </BentoCard>
      </div>
    </MgmtPageShell>
  );
};

export const AccessControlPage: React.FC<PageProps> = ({ theme, fontSize, showMessage }) => {
  const isDark = theme === 'dark';
  const [rules, setRules] = useState<{ id: string; path: string; roles: string }[]>([
    { id: '1', path: '/admin/**', roles: 'super_admin' },
  ]);

  return (
    <MgmtPageShell theme={theme} fontSize={fontSize} titleIcon={Lock} breadcrumbSegments={['系统配置', '访问控制']}>
      <div className="px-4 sm:px-6 pb-6">
        <button
          type="button"
          className={`${btnPrimary} mb-4`}
          onClick={() => {
            setRules((prev) => [...prev, { id: `${Date.now()}`, path: '/api/**', roles: 'authenticated' }]);
            showMessage('已添加规则草稿', 'success');
          }}
        >
          新增规则
        </button>
        <BentoCard theme={theme} padding="sm">
          {rules.map((r) => (
            <div key={r.id} className={`px-4 py-3.5 flex flex-wrap justify-between gap-2 border-b last:border-0 ${isDark ? 'border-white/[0.06]' : 'border-slate-100'}`}>
              <div className={`font-mono text-sm ${textPrimary(theme)}`}>{r.path}</div>
              <div className={`text-sm ${textMuted(theme)}`}>{r.roles}</div>
            </div>
          ))}
        </BentoCard>
        <button
          type="button"
          className={`${btnSecondary(theme)} mt-4`}
          onClick={() => showMessage('ACL 已发布（Mock）', 'success')}
        >
          发布 ACL
        </button>
      </div>
    </MgmtPageShell>
  );
};
