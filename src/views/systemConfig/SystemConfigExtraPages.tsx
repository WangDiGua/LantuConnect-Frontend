import React, { useEffect, useState } from 'react';
import { Theme, FontSize } from '../../types';
import { MgmtPageShell } from '../userMgmt/MgmtPageShell';
import { Sliders, Shield, Network, HardDrive, Lock, Loader2, Braces } from 'lucide-react';
import { nativeInputClass } from '../../utils/formFieldClasses';
import { LantuSelect } from '../../components/common/LantuSelect';
import { useSysParams, useUpdateSysParams, useSysSecurity, useUpdateSysSecurity } from '../../hooks/queries/useSystemConfig';
import { securitySettingValueForApi, systemConfigService } from '../../api/services/system-config.service';
import { quotaService } from '../../api/services/quota.service';
import type { SystemParam, SecuritySetting } from '../../types/dto/system-config';
import { PageSkeleton } from '../../components/common/PageSkeleton';
import { PageError } from '../../components/common/PageError';
import { EmptyState } from '../../components/common/EmptyState';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { BentoCard } from '../../components/common/BentoCard';
import {
  btnPrimary, btnSecondary, textPrimary, textSecondary, textMuted, fieldErrorText, inputBaseError,
} from '../../utils/uiClasses';
import { AutoHeightTextarea } from '../../components/common/AutoHeightTextarea';

interface PageProps {
  theme: Theme;
  fontSize: FontSize;
  showMessage: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

const INPUT_FOCUS = 'focus:ring-2 focus:ring-neutral-900/20 focus:border-neutral-900/35';

/** 与 `application.yml` 注释一致：库内 JSON 合并覆盖 YAML，保存后数秒内生效 */
const RUNTIME_APP_CONFIG_KEY = 'runtime_app_config';

function isJsonSystemParam(p: SystemParam): boolean {
  return p.type === 'json' || p.key === RUNTIME_APP_CONFIG_KEY || p.key === 'skill_external_catalog';
}

function tryFormatJson(value: string): { ok: true; text: string } | { ok: false } {
  const t = value.trim();
  if (!t) return { ok: false };
  try {
    const formatted = `${JSON.stringify(JSON.parse(t), null, 2)}\n`;
    return { ok: true, text: formatted };
  } catch {
    return { ok: false };
  }
}

function collectJsonSystemParamErrors(items: SystemParam[]): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const p of items) {
    if (!isJsonSystemParam(p)) continue;
    const t = p.value.trim();
    const label = p.description || p.key;
    if (!t) {
      errors[p.key] = `「${label}」JSON 不能为空（无覆盖可填 {}）`;
      continue;
    }
    try {
      JSON.parse(t);
    } catch {
      errors[p.key] = `「${label}」不是合法 JSON`;
    }
  }
  return errors;
}

export const SystemParamsPage: React.FC<PageProps> = ({ theme, fontSize, showMessage }) => {
  const isDark = theme === 'dark';
  const inputCls = `${nativeInputClass(theme)} ${INPUT_FOCUS}`;
  const labelCls = `text-sm font-medium ${textSecondary(theme)}`;

  const { data, isLoading, isError, error, refetch } = useSysParams();
  const updateMut = useUpdateSysParams();
  const [draft, setDraft] = useState<SystemParam[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [jsonParamErrors, setJsonParamErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (data) setDraft(data.map((p) => ({ ...p })));
  }, [data]);

  const shellProps = {
    theme,
    fontSize,
    titleIcon: Sliders,
    breadcrumbSegments: ['系统配置', '系统参数'] as const,
    contentScroll: 'document' as const,
    description: '维护全局键值对与 JSON 覆盖项（如 runtime_app_config）。保存后数秒内合并进运行时配置；与五类统一资源（Agent / Skill / MCP / App / Dataset）相关的运行时开关也可放在 JSON 覆盖中。涉及鉴权/观测的项请与「安全设置」「监控中心」节奏协调。',
  };

  if (isLoading) {
    return (
      <MgmtPageShell {...shellProps}>
        <PageSkeleton type="form" />
      </MgmtPageShell>
    );
  }

  if (isError) {
    return (
      <MgmtPageShell {...shellProps}>
        <PageError error={error instanceof Error ? error : null} onRetry={() => refetch()} />
      </MgmtPageShell>
    );
  }

  if (!draft.length) {
    return (
      <MgmtPageShell {...shellProps}>
        <EmptyState title="暂无系统参数" description="后端未返回可编辑参数" />
      </MgmtPageShell>
    );
  }

  const save = () => {
    const baseline = data ?? [];
    const changed = draft.filter((p) => {
      const b = baseline.find((x) => x.key === p.key);
      if (!b) return true;
      return b.value !== p.value || b.description !== p.description;
    });
    if (changed.length === 0) {
      showMessage('没有修改项', 'info');
      setConfirmOpen(false);
      return;
    }
    const jsonErrs = collectJsonSystemParamErrors(changed);
    if (Object.keys(jsonErrs).length) {
      setJsonParamErrors(jsonErrs);
      setConfirmOpen(false);
      return;
    }
    setJsonParamErrors({});
    updateMut.mutate(changed, {
      onSuccess: () => { showMessage('系统参数已保存', 'success'); setConfirmOpen(false); },
      onError: (e) => showMessage(e instanceof Error ? e.message : '保存失败', 'error'),
    });
  };

  const formatJsonAt = (idx: number) => {
    const p = draft[idx];
    if (!p || !isJsonSystemParam(p)) return;
    const out = tryFormatJson(p.value);
    if (!out.ok) {
      setJsonParamErrors((prev) => ({
        ...prev,
        [p.key]: '当前不是合法 JSON，无法格式化（可先修正括号或引号）',
      }));
      return;
    }
    setJsonParamErrors((prev) => {
      const next = { ...prev };
      delete next[p.key];
      return next;
    });
    setDraft((prev) => prev.map((x, i) => (i === idx ? { ...x, value: out.text } : x)));
    showMessage('已格式化', 'success');
  };

  return (
    <MgmtPageShell {...shellProps}>
      <div className="px-4 sm:px-6 pb-10 max-w-4xl">
        <BentoCard theme={theme} padding="lg" className="w-full">
          <div className="space-y-5">
            {draft.map((p, idx) => (
              <div key={p.key}>
                <div className="mb-1.5 flex flex-wrap items-start justify-between gap-2">
                  <label className={`${labelCls} block flex-1 min-w-[12rem]`}>
                    {p.description || p.key}
                    {p.category ? <span className={`ml-1 ${textMuted(theme)}`}>· {p.category}</span> : ''}
                    {p.key === RUNTIME_APP_CONFIG_KEY ? (
                      <span className={`ml-1 text-xs font-normal ${textMuted(theme)}`}>(运行时合并 YAML，含 lantu / geoip / notification 等)</span>
                    ) : null}
                  </label>
                  {isJsonSystemParam(p) && p.editable ? (
                    <button
                      type="button"
                      className={`${btnSecondary} inline-flex items-center gap-1.5 shrink-0 text-xs py-1.5 px-2.5`}
                      onClick={() => formatJsonAt(idx)}
                    >
                      <Braces size={14} strokeWidth={2} aria-hidden />
                      格式化 JSON
                    </button>
                  ) : null}
                </div>
                {isJsonSystemParam(p) ? (
                  <>
                    <AutoHeightTextarea
                      id={`sys-param-json-${idx}`}
                      minRows={12}
                      maxRows={48}
                      className={`${inputCls} w-full font-mono text-xs leading-relaxed resize-none${
                        jsonParamErrors[p.key] ? ` ${inputBaseError()}` : ''
                      }`}
                      value={p.value}
                      disabled={!p.editable}
                      spellCheck={false}
                      aria-invalid={!!jsonParamErrors[p.key]}
                      aria-describedby={jsonParamErrors[p.key] ? `sys-param-json-${idx}-err` : undefined}
                      onChange={(e) => {
                        const v = e.target.value;
                        setJsonParamErrors((prev) => {
                          if (!prev[p.key]) return prev;
                          const next = { ...prev };
                          delete next[p.key];
                          return next;
                        });
                        setDraft((prev) => prev.map((x, i) => (i === idx ? { ...x, value: v } : x)));
                      }}
                    />
                    {jsonParamErrors[p.key] ? (
                      <p id={`sys-param-json-${idx}-err`} className={`mt-1.5 ${fieldErrorText()} text-xs`} role="alert">
                        {jsonParamErrors[p.key]}
                      </p>
                    ) : null}
                    {p.key === RUNTIME_APP_CONFIG_KEY && p.value.trim() === '{}' ? (
                      <p className={`mt-1.5 text-xs leading-relaxed ${textMuted(theme)}`}>
                        库里目前是空对象 <code className="font-mono">{}</code>，表示<strong className="font-medium text-inherit">不覆盖</strong>
                        application.yml；有数据后会与 YAML 合并。可点击「格式化 JSON」排版；编辑保存后数秒内后端生效。
                      </p>
                    ) : null}
                  </>
                ) : (
                  <input
                    className={`${inputCls} w-full`}
                    value={p.value}
                    disabled={!p.editable}
                    onChange={(e) => {
                      const v = e.target.value;
                      setDraft((prev) => prev.map((x, i) => (i === idx ? { ...x, value: v } : x)));
                    }}
                  />
                )}
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

  const securityDesc = '会话、验证码、登录失败锁定等与统一资源网关安全策略；资源级授权与路径规则在「访问控制」。';

  if (isLoading) {
    return (
      <MgmtPageShell theme={theme} fontSize={fontSize} titleIcon={Shield} breadcrumbSegments={['系统配置', '安全设置']} description={securityDesc}>
        <PageSkeleton type="form" />
      </MgmtPageShell>
    );
  }

  if (isError) {
    return (
      <MgmtPageShell theme={theme} fontSize={fontSize} titleIcon={Shield} breadcrumbSegments={['系统配置', '安全设置']} description={securityDesc}>
        <PageError error={error instanceof Error ? error : null} onRetry={() => refetch()} />
      </MgmtPageShell>
    );
  }

  if (!draft.length) {
    return (
      <MgmtPageShell theme={theme} fontSize={fontSize} titleIcon={Shield} breadcrumbSegments={['系统配置', '安全设置']} description={securityDesc}>
        <EmptyState title="暂无安全策略项" description="后端未返回安全设置" />
      </MgmtPageShell>
    );
  }

  const save = () => {
    const baseline = data ?? [];
    const changed = draft.filter((s) => {
      const b = baseline.find((x) => x.key === s.key);
      if (!b) return true;
      return securitySettingValueForApi(b.value) !== securitySettingValueForApi(s.value);
    });
    if (changed.length === 0) {
      showMessage('没有修改项', 'info');
      setConfirmOpen(false);
      return;
    }
    updateMut.mutate(changed, {
      onSuccess: () => { showMessage('安全策略已更新', 'success'); setConfirmOpen(false); },
      onError: (e) => showMessage(e instanceof Error ? e.message : '保存失败', 'error'),
    });
  };

  return (
    <MgmtPageShell theme={theme} fontSize={fontSize} titleIcon={Shield} breadcrumbSegments={['系统配置', '安全设置']} description={securityDesc}>
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
  const [allowlist, setAllowlist] = useState('');
  const [saving, setSaving] = useState(false);
  const [loadingList, setLoadingList] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoadingList(true);
      try {
        const rules = await systemConfigService.getNetworkAllowlist();
        if (!cancelled && rules.length > 0) {
          setAllowlist(rules.join('\n'));
        }
      } catch {
        if (!cancelled) showMessage('加载已保存白名单失败，可手动填写后应用', 'info');
      } finally {
        if (!cancelled) setLoadingList(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleApply = async () => {
    const rules = allowlist.split('\n').map((l) => l.trim()).filter(Boolean);
    setSaving(true);
    try {
      await systemConfigService.applyNetworkWhitelist(rules);
      showMessage('白名单已保存到系统参数并触发下发流程（集成 mock 时仅本地保存、不下发网关）', 'success');
    } catch (e) {
      showMessage(e instanceof Error ? e.message : '下发失败', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <MgmtPageShell
      theme={theme}
      fontSize={fontSize}
      titleIcon={Network}
      breadcrumbSegments={['系统配置', '网络配置']}
      description="管理端访问白名单：内容持久化到系统参数，刷新页面会回显已保存条目。五类统一资源的公网暴露策略在网关与本平台其它模块分别配置。"
    >
      <div className="px-4 sm:px-6 pb-6">
        <BentoCard theme={theme} padding="lg" className="max-w-xl">
          <div className="space-y-4">
            {loadingList ? (
              <p className={`text-sm ${textMuted(theme)}`}>正在加载已保存白名单…</p>
            ) : null}
            <div>
              <label className={`${labelCls} mb-1.5 block`}>管理端 IP 白名单（每行一个 CIDR）</label>
              <AutoHeightTextarea className={`${inputCls} font-mono text-xs resize-none`} minRows={8} maxRows={30} value={allowlist} onChange={(e) => setAllowlist(e.target.value)} aria-label="IP 白名单 CIDR 列表" disabled={loadingList} />
              <p className={`text-xs mt-1.5 leading-relaxed ${textMuted(theme)}`}>每行一条，例如 10.0.0.0/8；点击应用后即持久保存，并在关闭集成 mock 后可由真实网关接管下发。</p>
            </div>
            <button type="button" className={`${btnPrimary} disabled:opacity-50`} disabled={saving || loadingList} onClick={handleApply}>
              {saving ? <><Loader2 size={14} className="animate-spin" /> 应用中…</> : '应用'}
            </button>
          </div>
        </BentoCard>
      </div>
    </MgmtPageShell>
  );
};

const QUOTA_POLICY_OPTIONS = [
  { value: '仅告警', label: '仅告警' },
  { value: '软限流', label: '软限流' },
  { value: '硬拒绝', label: '硬拒绝' },
];

/** @deprecated 未被路由引用；配额请使用 {@link QuotaManagementPage}（`quota-management`）。保留便于历史对照。 */
/** 未被路由引用；菜单「配额管理」指向 `QuotaManagementPage`（`quota-management`）。 */
export const SystemQuotaPage: React.FC<PageProps> = ({ theme, fontSize, showMessage }) => {
  const inputCls = `${nativeInputClass(theme)} ${INPUT_FOCUS}`;
  const labelCls = `text-sm font-medium ${textSecondary(theme)}`;
  const [globalCap, setGlobalCap] = useState('1000000');
  const [policy, setPolicy] = useState('仅告警');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await quotaService.createQuota({
        subjectType: 'global',
        subjectName: '全平台',
        resourceCategory: 'all',
        dailyLimit: Number(globalCap) || 0,
        monthlyLimit: Math.max((Number(globalCap) || 0) * 30, Number(globalCap) || 0),
      });
      showMessage('全局配额已保存', 'success');
    } catch (e) {
      showMessage(e instanceof Error ? e.message : '保存失败', 'error');
    } finally {
      setSaving(false);
    }
  };

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
              <LantuSelect
                theme={theme}
                triggerClassName={INPUT_FOCUS}
                value={policy}
                onChange={setPolicy}
                options={QUOTA_POLICY_OPTIONS}
              />
            </div>
            <button type="button" className={`${btnPrimary} disabled:opacity-50`} disabled={saving} onClick={handleSave}>
              {saving ? <><Loader2 size={14} className="animate-spin" /> 保存中…</> : '保存'}
            </button>
          </div>
        </BentoCard>
      </div>
    </MgmtPageShell>
  );
};

export const AccessControlPage: React.FC<PageProps> = ({ theme, fontSize, showMessage }) => {
  const isDark = theme === 'dark';
  const inputCls = `${nativeInputClass(theme)} ${INPUT_FOCUS}`;
  const [rules, setRules] = useState<{ id: string; path: string; roles: string }[]>([]);
  const [publishing, setPublishing] = useState(false);
  const [loadingRules, setLoadingRules] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoadingRules(true);
    setLoadError(null);
    void (async () => {
      try {
        const list = await systemConfigService.getAclRules();
        if (!cancelled) setRules(list);
      } catch (e) {
        if (!cancelled) {
          const msg = e instanceof Error ? e.message : '加载 ACL 失败';
          setLoadError(msg);
          setRules([]);
          showMessage(msg, 'error');
        }
      } finally {
        if (!cancelled) setLoadingRules(false);
      }
    })();
    return () => { cancelled = true; };
  }, [showMessage]);

  const handlePublish = async () => {
    setPublishing(true);
    try {
      await systemConfigService.publishAcl(rules);
      showMessage('ACL 已发布', 'success');
    } catch (e) {
      showMessage(e instanceof Error ? e.message : '发布失败', 'error');
    } finally {
      setPublishing(false);
    }
  };

  const removeRule = (id: string) => {
    setRules((prev) => prev.filter((r) => r.id !== id));
  };

  return (
    <MgmtPageShell
      theme={theme}
      fontSize={fontSize}
      titleIcon={Lock}
      breadcrumbSegments={['系统配置', '访问控制']}
      description="路径模式 + 允许访问的平台角色列表（逗号分隔）。保存并发布后规则持久化；可通过「访问控制」接口拉取当前规则与角色清单。全站生效依赖网关与安全策略加载。"
    >
      <div className="px-4 sm:px-6 pb-6">
        {loadingRules ? (
          <div className="py-4">
            <PageSkeleton type="table" rows={5} />
          </div>
        ) : null}
        {!loadingRules && loadError && rules.length === 0 ? (
          <p className={`text-sm mb-4 ${textMuted(theme)}`}>无法拉取规则，可点击下方新增后发布，或稍后重试。</p>
        ) : null}
        <button
          type="button"
          className={`${btnPrimary} mb-4`}
          disabled={loadingRules}
          onClick={() => {
            setRules((prev) => [...prev, { id: `${Date.now()}`, path: '/regis/**', roles: 'authenticated' }]);
            showMessage('已添加规则草稿', 'success');
          }}
        >
          新增规则
        </button>
        <BentoCard theme={theme} padding="sm">
          {!loadingRules && rules.length === 0 ? (
            <div className={`px-4 py-8 text-center text-sm ${textMuted(theme)}`}>暂无规则，请新增一条或稍后重试加载。</div>
          ) : null}
          {rules.map((r) => (
            <div key={r.id} className={`px-4 py-3.5 flex flex-wrap items-center justify-between gap-2 border-b last:border-0 ${isDark ? 'border-white/[0.06]' : 'border-slate-100'}`}>
              <input
                className={`${inputCls} flex-1 min-w-[120px] font-mono text-xs`}
                value={r.path}
                onChange={(e) => setRules((prev) => prev.map((x) => x.id === r.id ? { ...x, path: e.target.value } : x))}
                aria-label="API 路径模式"
              />
              <input
                className={`${inputCls} w-40 text-xs`}
                value={r.roles}
                onChange={(e) => setRules((prev) => prev.map((x) => x.id === r.id ? { ...x, roles: e.target.value } : x))}
                aria-label="角色编码，逗号分隔"
              />
              <button
                type="button"
                className="text-rose-500 hover:text-rose-600 text-xs px-2"
                onClick={() => removeRule(r.id)}
              >
                移除
              </button>
            </div>
          ))}
        </BentoCard>
        <button
          type="button"
          className={`${btnSecondary(theme)} mt-4 disabled:opacity-50`}
          disabled={publishing}
          onClick={handlePublish}
        >
          {publishing ? <><Loader2 size={14} className="animate-spin" /> 发布中…</> : '发布 ACL'}
        </button>
      </div>
    </MgmtPageShell>
  );
};
