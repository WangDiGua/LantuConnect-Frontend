import React, { useEffect, useState } from 'react';
import { Theme, FontSize } from '../../types';
import { MgmtPageShell } from '../userMgmt/MgmtPageShell';
import { Sliders, Shield, Network, HardDrive, Lock, Loader2, Braces, Plus, Trash2 } from 'lucide-react';
import { nativeInputClass } from '../../utils/formFieldClasses';
import { LantuSelect } from '../../components/common/LantuSelect';
import { useSysParams, useUpdateSysParams, useSysSecurity, useUpdateSysSecurity } from '../../hooks/queries/useSystemConfig';
import { securitySettingValueForApi, systemConfigService } from '../../api/services/system-config.service';
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

function newAllowlistRowId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

interface NetworkAllowlistRow {
  id: string;
  value: string;
}

/** IPv4 单地址或 IPv4 CIDR（前缀 0–32）；无后缀时表示单个主机 */
function validateAllowlistCidrRule(raw: string): string | null {
  const s = raw.trim();
  if (!s) return '协议与网段不能为空';
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})(\/([0-9]|[12][0-9]|3[0-2]))?$/.exec(s);
  if (!m) return '请使用 IPv4 或 IPv4 CIDR，例如 10.0.0.0/8 或 192.168.1.10';
  const oct = [m[1], m[2], m[3], m[4]].map((x) => Number(x));
  if (oct.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return '每段数字须在 0–255';
  if (m[5] !== undefined && m[6] !== undefined) {
    const p = Number(m[6]);
    if (p < 0 || p > 32) return '前缀长度须为 0–32';
  }
  return null;
}

/** 与 `application.yml` 注释一致：库内 JSON 合并覆盖 YAML，保存后数秒内生效 */
const RUNTIME_APP_CONFIG_KEY = 'runtime_app_config';

function isJsonSystemParam(p: SystemParam): boolean {
  return p.type === 'json' || p.key === RUNTIME_APP_CONFIG_KEY;
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
                ) : p.type === 'boolean' ? (
                  <div>
                    <label className="flex w-fit cursor-pointer items-center gap-3">
                      <input
                        type="checkbox"
                        className="toggle toggle-primary toggle-sm"
                        checked={p.value === 'true' || p.value === '1'}
                        disabled={!p.editable}
                        onChange={(e) => {
                          const v = e.target.checked ? 'true' : 'false';
                          setDraft((prev) => prev.map((x, i) => (i === idx ? { ...x, value: v } : x)));
                        }}
                      />
                      <span className={`text-sm ${textMuted(theme)}`}>
                        {p.value === 'true' || p.value === '1' ? '是' : '否'}
                      </span>
                    </label>
                  </div>
                ) : p.type === 'number' ? (
                  <input
                    className={`${inputCls} w-full`}
                    type="number"
                    inputMode="decimal"
                    value={Number.isFinite(Number(p.value)) ? Number(p.value) : 0}
                    disabled={!p.editable}
                    onChange={(e) => {
                      const n = Number(e.target.value);
                      const v = Number.isFinite(n) ? String(n) : '0';
                      setDraft((prev) => prev.map((x, i) => (i === idx ? { ...x, value: v } : x)));
                    }}
                  />
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

/** 与库内字典值对应（见 t_security_setting） */
const PASSWORD_COMPLEXITY_LABELS: Record<string, string> = {
  low: '低',
  medium: '中',
  high: '高',
};
const SESSION_BINDING_LABELS: Record<string, string> = {
  none: '不绑定',
  ip: 'IP 绑定',
  device: '设备绑定',
};

function securitySelectOptionLabel(settingKey: string, optionValue: string): string {
  if (settingKey === 'password_complexity') return PASSWORD_COMPLEXITY_LABELS[optionValue] ?? optionValue;
  if (settingKey === 'session_binding') return SESSION_BINDING_LABELS[optionValue] ?? optionValue;
  return optionValue;
}

/** 与后端 {@code AuditLogRetentionTask} 一致：0=不自动清理；1–3650=保留天数 */
const AUDIT_LOG_RETENTION_MIN_DAYS = 1;
const AUDIT_LOG_RETENTION_MAX_DAYS = 3650;
const AUDIT_LOG_RETENTION_CUSTOM_FALLBACK = 90;

const AUDIT_LOG_RETENTION_PRESET_OPTIONS: { value: string; label: string }[] = [
  { value: '1', label: '1 天' },
  { value: '7', label: '7 天' },
  { value: '30', label: '约一个月（30 天）' },
  { value: '0', label: '永远保留（不自动清理）' },
  { value: 'custom', label: '自定义天数' },
];

function normalizeAuditLogRetentionDays(raw: SecuritySetting['value']): number {
  const n = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(n)) return AUDIT_LOG_RETENTION_CUSTOM_FALLBACK;
  return Math.round(n);
}

function auditLogRetentionSelectMode(days: number): string {
  if (days === 0) return '0';
  if (days === 1) return '1';
  if (days === 7) return '7';
  if (days === 30) return '30';
  return 'custom';
}

function clampAuditRetentionCustomDays(n: number): number {
  if (!Number.isFinite(n)) return AUDIT_LOG_RETENTION_CUSTOM_FALLBACK;
  return Math.min(
    AUDIT_LOG_RETENTION_MAX_DAYS,
    Math.max(AUDIT_LOG_RETENTION_MIN_DAYS, Math.round(n)),
  );
}

function securityBoolValue(v: SecuritySetting['value']): boolean {
  if (typeof v === 'boolean') return v;
  const t = String(v ?? '').trim().toLowerCase();
  return t === 'true' || t === '1' || t === 'yes';
}

function SecurityField({
  theme, s, onChange,
}: {
  theme: Theme;
  s: SecuritySetting;
  onChange: (next: SecuritySetting) => void;
}) {
  const inputCls = `${nativeInputClass(theme)} ${INPUT_FOCUS}`;
  const labelCls = `text-sm font-medium ${textSecondary(theme)}`;
  const titleCls = `${labelCls} mb-1.5 block`;
  const descriptionEl = s.description ? (
    <p className={`text-xs mt-1.5 ${textMuted(theme)}`}>{s.description}</p>
  ) : null;

  if (s.type === 'toggle' || s.type === 'boolean') {
    const checked = securityBoolValue(s.value);
    return (
      <div>
        <div className={titleCls}>{s.label}</div>
        <label className="flex cursor-pointer items-center gap-3 w-fit">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => onChange({ ...s, value: e.target.checked })}
            className="toggle toggle-primary toggle-sm"
          />
          <span className={`text-sm ${textMuted(theme)}`}>{checked ? '已开启' : '已关闭'}</span>
        </label>
        {descriptionEl}
      </div>
    );
  }

  if (s.key === 'audit_log_retention') {
    const days = normalizeAuditLogRetentionDays(s.value);
    const mode = auditLogRetentionSelectMode(days);
    return (
      <div>
        <label className={titleCls}>{s.label}</label>
        <LantuSelect
          theme={theme}
          value={mode}
          options={AUDIT_LOG_RETENTION_PRESET_OPTIONS}
          onChange={(next) => {
            if (next === 'custom') {
              const seed = mode === 'custom' ? days : AUDIT_LOG_RETENTION_CUSTOM_FALLBACK;
              onChange({ ...s, value: clampAuditRetentionCustomDays(seed) });
            } else {
              onChange({ ...s, value: Number(next) });
            }
          }}
          ariaLabel="审计日志保留策略"
        />
        {mode === 'custom' ? (
          <input
            className={`${inputCls} mt-2`}
            type="number"
            min={AUDIT_LOG_RETENTION_MIN_DAYS}
            max={AUDIT_LOG_RETENTION_MAX_DAYS}
            step={1}
            inputMode="numeric"
            value={days}
            onChange={(e) => {
              const next = Number(e.target.value);
              onChange({
                ...s,
                value: clampAuditRetentionCustomDays(Number.isFinite(next) ? next : AUDIT_LOG_RETENTION_CUSTOM_FALLBACK),
              });
            }}
            aria-label="自定义保留天数"
          />
        ) : null}
        {descriptionEl}
      </div>
    );
  }

  if (s.type === 'number') {
    const n = typeof s.value === 'number' ? s.value : Number(s.value);
    const safe = Number.isFinite(n) ? n : 0;
    return (
      <div>
        <label className={titleCls}>{s.label}</label>
        <input
          className={inputCls}
          type="number"
          min={1}
          max={3650}
          step={1}
          inputMode="numeric"
          value={safe}
          onChange={(e) => {
            const next = Number(e.target.value);
            onChange({ ...s, value: Number.isFinite(next) ? next : 0 });
          }}
        />
        {descriptionEl}
      </div>
    );
  }

  if (s.type === 'select' && s.options && s.options.length > 0) {
    const v = String(s.value ?? '');
    const selectOptions = s.options.map((opt) => ({
      value: opt,
      label: securitySelectOptionLabel(s.key, opt),
    }));
    return (
      <div>
        <label className={titleCls}>{s.label}</label>
        <LantuSelect
          theme={theme}
          value={v}
          options={selectOptions}
          onChange={(next) => onChange({ ...s, value: next })}
        />
        {descriptionEl}
      </div>
    );
  }

  return (
    <div>
      <label className={titleCls}>{s.label}</label>
      <input
        className={inputCls}
        value={String(s.value ?? '')}
        onChange={(e) => onChange({ ...s, value: e.target.value })}
      />
      {descriptionEl}
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

  const securityDesc = '会话、验证码、登录失败锁定等与统一资源网关安全策略；访问控制与路径规则在「访问控制」。管理端访问 IP（CIDR）请在「网络配置」中维护，写入 admin_network_allowlist。';

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
  const [rows, setRows] = useState<NetworkAllowlistRow[]>([{ id: newAllowlistRowId(), value: '' }]);
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [loadingList, setLoadingList] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoadingList(true);
      try {
        const rules = await systemConfigService.getNetworkAllowlist();
        if (!cancelled) {
          setRows(
            rules.length > 0
              ? rules.map((v) => ({ id: newAllowlistRowId(), value: v }))
              : [{ id: newAllowlistRowId(), value: '' }],
          );
          setRowErrors({});
        }
      } catch {
        if (!cancelled) showMessage('加载已保存白名单失败，可手动填写后应用', 'info');
      } finally {
        if (!cancelled) setLoadingList(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [showMessage]);

  const updateRowValue = (id: string, value: string) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, value } : r)));
    setRowErrors((prev) => {
      if (!prev[id]) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const addRow = () => {
    setRows((prev) => [...prev, { id: newAllowlistRowId(), value: '' }]);
  };

  const removeRow = (id: string) => {
    setRows((prev) => {
      const next = prev.filter((r) => r.id !== id);
      return next.length === 0 ? [{ id: newAllowlistRowId(), value: '' }] : next;
    });
    setRowErrors((prev) => {
      if (!prev[id]) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const handleApply = async () => {
    const nextErrors: Record<string, string> = {};
    for (const r of rows) {
      const v = r.value.trim();
      if (!v) continue;
      const err = validateAllowlistCidrRule(v);
      if (err) nextErrors[r.id] = err;
    }
    setRowErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      showMessage('请修正标红行的 IPv4 / CIDR 格式后再应用', 'error');
      return;
    }

    const rules = rows.map((r) => r.value.trim()).filter(Boolean);
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
        <BentoCard theme={theme} padding="lg" className="max-w-2xl">
          <div className="space-y-4">
            {loadingList ? (
              <p className={`text-sm ${textMuted(theme)}`}>正在加载已保存白名单…</p>
            ) : null}
            <div>
              <div className="flex flex-wrap items-end justify-between gap-2 mb-2">
                <span className={`${labelCls} block`} id="network-allowlist-heading">
                  管理端 IP 白名单
                </span>
                <button
                  type="button"
                  className={`${btnSecondary(theme)} inline-flex items-center gap-1 text-xs py-1.5`}
                  onClick={addRow}
                  disabled={loadingList}
                  aria-label="新增一条网段"
                >
                  <Plus size={14} aria-hidden /> 添加网段
                </button>
              </div>
              <p className={`text-xs mb-3 leading-relaxed ${textMuted(theme)}`} id="network-allowlist-hint">
                每条填写 IPv4 地址或 CIDR（前缀 0–32），例如 <span className="font-mono">10.0.0.0/8</span>、
                <span className="font-mono"> 172.16.0.0/12</span>；单主机可写 <span className="font-mono">192.168.1.10</span>。留空的行在保存时会被忽略。
              </p>
              <ul className="space-y-2.5 list-none p-0 m-0" aria-labelledby="network-allowlist-heading" aria-describedby="network-allowlist-hint">
                {rows.map((r, i) => (
                  <li key={r.id} className="flex flex-wrap items-start gap-2 sm:flex-nowrap">
                    <div className="min-w-0 flex-1">
                      <label htmlFor={`allowlist-row-${r.id}`} className="sr-only">
                        白名单条目 {i + 1}
                      </label>
                      <input
                        id={`allowlist-row-${r.id}`}
                        type="text"
                        inputMode="text"
                        autoComplete="off"
                        spellCheck={false}
                        placeholder="例如 10.0.0.0/8"
                        className={`${inputCls} w-full font-mono text-xs ${rowErrors[r.id] ? inputBaseError() : ''}`}
                        value={r.value}
                        onChange={(e) => updateRowValue(r.id, e.target.value)}
                        disabled={loadingList}
                        aria-invalid={Boolean(rowErrors[r.id])}
                        aria-describedby={rowErrors[r.id] ? `allowlist-err-${r.id}` : undefined}
                      />
                      {rowErrors[r.id] ? (
                        <p id={`allowlist-err-${r.id}`} className={`text-xs mt-1 ${fieldErrorText}`} role="alert">
                          {rowErrors[r.id]}
                        </p>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      className={`${btnSecondary(theme)} shrink-0 inline-flex items-center justify-center gap-1 px-2.5 py-2`}
                      onClick={() => removeRow(r.id)}
                      disabled={loadingList}
                      aria-label={`删除第 ${i + 1} 条`}
                      title="删除此条"
                    >
                      <Trash2 size={15} aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
              <p className={`text-xs mt-3 leading-relaxed ${textMuted(theme)}`}>
                点击「应用」后写入系统参数；关闭集成 mock 后可由真实网关接管下发。
              </p>
            </div>
            <button type="button" className={`${btnPrimary} disabled:opacity-50`} disabled={saving || loadingList} onClick={handleApply}>
              {saving ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> 应用中…
                </>
              ) : (
                '应用'
              )}
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
