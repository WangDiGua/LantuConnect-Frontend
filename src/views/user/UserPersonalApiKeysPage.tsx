import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import {
  KeyRound, Loader2, Plus, Copy, Check, DownloadCloud, Info, RefreshCw, Eye, EyeOff,
} from 'lucide-react';
import type { Theme, ThemeColor } from '../../types';
import { THEME_COLOR_CLASSES } from '../../constants/theme';
import { userSettingsService } from '../../api/services/user-settings.service';
import { nativeInputClass } from '../../utils/formFieldClasses';
import { Modal } from '../../components/common/Modal';
import { BentoCard } from '../../components/common/BentoCard';
import type { UserApiKey, UserIntegrationPackageOption } from '../../types/dto/user-settings';
import { LantuSelect } from '../../components/common/LantuSelect';
import type { LantuSelectOption } from '../../components/common/LantuSelect';
import { isServerErrorGloballyNotified } from '../../types/api';
import {
  btnPrimary,
  btnSecondary,
  fieldErrorText,
  inputBaseError,
  textPrimary,
  textSecondary,
  textMuted,
  mainScrollPadBottom,
  canvasBodyBg,
} from '../../utils/uiClasses';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLayoutChrome } from '../../context/LayoutChromeContext';
import { PageTitleTagline } from '../../components/common/PageTitleTagline';
import { PageSkeleton } from '../../components/common/PageSkeleton';
import { buildPath, inferConsoleRole, parseRoute } from '../../constants/consoleRoutes';
import { useUserRole } from '../../context/UserRoleContext';
import { apiKeyScopesAllowGatewayFlow } from '../../utils/apiKeyScopes';
import { MAX_STORED_API_KEY_LENGTH } from '../../lib/safeStorage';
import {
  API_KEY_EXPIRY_OPTIONS,
  computeExpiresAtForPreset,
  DEFAULT_API_KEY_EXPIRY_PRESET,
  type ApiKeyExpiryPreset,
} from '../../utils/apiKeyExpiryPresets';

const GATEWAY_API_KEY_STORAGE_KEY = 'lantu_api_key';

function tryPersistGatewayApiKeyToLocalStorage(plain: string): 'ok' | 'too_long' | 'quota' {
  const t = plain.trim();
  if (!t) return 'ok';
  if (t.length > MAX_STORED_API_KEY_LENGTH) return 'too_long';
  try {
    localStorage.setItem(GATEWAY_API_KEY_STORAGE_KEY, t);
    return 'ok';
  } catch {
    return 'quota';
  }
}

export interface UserPersonalApiKeysPageProps {
  theme: Theme;
  themeColor: ThemeColor;
  showMessage: (msg: string, type?: 'success' | 'error' | 'info') => void;
  /** 嵌入「密钥与集成套餐」总页时隐藏顶部大标题，由外层 Tab 承担层级 */
  embeddedInHub?: boolean;
}

function pageErrorUnlessServerToast(
  e: unknown,
  fallback: string,
  show: UserPersonalApiKeysPageProps['showMessage'],
) {
  if (isServerErrorGloballyNotified(e)) return;
  show(e instanceof Error ? e.message : fallback, 'error');
}

export const UserPersonalApiKeysPage: React.FC<UserPersonalApiKeysPageProps> = ({
  theme,
  themeColor,
  showMessage,
  embeddedInHub = false,
}) => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { platformRole } = useUserRole();
  const routePage = parseRoute(pathname)?.page ?? '';
  const consoleRole = inferConsoleRole(routePage, platformRole);
  const { chromePageTitle } = useLayoutChrome();
  const isDark = theme === 'dark';
  const tc = THEME_COLOR_CLASSES[themeColor];

  const [apiKeys, setApiKeys] = useState<UserApiKey[]>([]);
  const [apiKeysLoading, setApiKeysLoading] = useState(true);
  const [apiKeysError, setApiKeysError] = useState<string | null>(null);
  const [newKeyName, setNewKeyName] = useState('');
  const [creatingApiKey, setCreatingApiKey] = useState(false);
  const [revokeKeyTarget, setRevokeKeyTarget] = useState<UserApiKey | null>(null);
  const [revokePassword, setRevokePassword] = useState('');
  const [revokeShowPassword, setRevokeShowPassword] = useState(false);
  const [revokeSubmitting, setRevokeSubmitting] = useState(false);
  const [revokeFieldErrors, setRevokeFieldErrors] = useState<{ password?: string; form?: string }>({});
  const [detailKeyTarget, setDetailKeyTarget] = useState<UserApiKey | null>(null);
  const [rotateKeyTarget, setRotateKeyTarget] = useState<UserApiKey | null>(null);
  const [rotatePassword, setRotatePassword] = useState('');
  const [rotateShowPassword, setRotateShowPassword] = useState(false);
  const [rotateSubmitting, setRotateSubmitting] = useState(false);
  const [rotateFieldErrors, setRotateFieldErrors] = useState<{ password?: string; form?: string }>({});
  const [newPlainKey, setNewPlainKey] = useState<string | null>(null);
  const createApiKeyInFlightRef = useRef(false);

  const [integrationPackages, setIntegrationPackages] = useState<UserIntegrationPackageOption[]>([]);
  const [integrationPackagesError, setIntegrationPackagesError] = useState<string | null>(null);
  const [createIntegrationPackageId, setCreateIntegrationPackageId] = useState('');
  const [detailPackageDraft, setDetailPackageDraft] = useState('');
  const [detailPackageSaving, setDetailPackageSaving] = useState(false);

  const packageSelectOptions = useMemo<LantuSelectOption[]>(() => {
    const base: LantuSelectOption[] = [{ value: '', label: '不绑定套餐（按 scope）' }];
    const active = integrationPackages.filter((p) => (p.status ?? 'active').toLowerCase() === 'active');
    return base.concat(
      active.map((p) => ({
        value: p.id,
        label: `${p.name}（${p.itemCount} 项）`,
      })),
    );
  }, [integrationPackages]);

  const packageLabelById = useMemo(() => {
    const m = new Map(integrationPackages.map((p) => [p.id, p.name]));
    return (id?: string | null) => {
      if (!id?.trim()) return '未绑定（按 scope）';
      return m.get(id.trim()) ?? id.trim();
    };
  }, [integrationPackages]);

  const loadIntegrationPackages = useCallback(async () => {
    try {
      const list = await userSettingsService.listIntegrationPackages();
      setIntegrationPackages(Array.isArray(list) ? list : []);
      setIntegrationPackagesError(null);
    } catch {
      setIntegrationPackagesError('集成套餐列表加载失败');
      setIntegrationPackages([]);
    }
  }, []);

  useEffect(() => {
    void loadIntegrationPackages();
  }, [loadIntegrationPackages]);

  const loadApiKeys = useCallback(async () => {
    setApiKeysLoading(true);
    setApiKeysError(null);
    try {
      const list = await userSettingsService.listApiKeys();
      setApiKeys(Array.isArray(list) ? list : []);
    } catch (e) {
      setApiKeysError(e instanceof Error ? e.message : 'API Key 列表加载失败');
    } finally {
      setApiKeysLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadApiKeys();
  }, [loadApiKeys]);

  useEffect(() => {
    if (detailKeyTarget) {
      setDetailPackageDraft(detailKeyTarget.integrationPackageId?.trim() ?? '');
    }
  }, [detailKeyTarget]);

  const [apiKeyNameError, setApiKeyNameError] = useState('');
  const [apiKeyExpiryPreset, setApiKeyExpiryPreset] = useState<ApiKeyExpiryPreset>(DEFAULT_API_KEY_EXPIRY_PRESET);

  const handleCreateApiKey = useCallback(async () => {
    if (!newKeyName.trim()) {
      setApiKeyNameError('请输入 API Key 名称');
      return;
    }
    setApiKeyNameError('');
    if (createApiKeyInFlightRef.current) return;
    createApiKeyInFlightRef.current = true;
    setCreatingApiKey(true);
    try {
      const expiresAt = computeExpiresAtForPreset(apiKeyExpiryPreset);
      const pkg = createIntegrationPackageId.trim();
      const created = await userSettingsService.createApiKey({
        name: newKeyName.trim(),
        ...(expiresAt ? { expiresAt } : {}),
        ...(pkg ? { integrationPackageId: pkg } : {}),
      });
      setNewPlainKey(created.plainKey ?? null);
      showMessage('已创建，请立即复制保存密钥。', 'success');
      setNewKeyName('');
      setApiKeyExpiryPreset(DEFAULT_API_KEY_EXPIRY_PRESET);
      setCreateIntegrationPackageId('');
      await loadApiKeys();
    } catch (e) {
      pageErrorUnlessServerToast(e, 'API Key 创建失败', showMessage);
    } finally {
      createApiKeyInFlightRef.current = false;
      setCreatingApiKey(false);
    }
  }, [loadApiKeys, newKeyName, apiKeyExpiryPreset, createIntegrationPackageId, showMessage]);

  const handleSaveDetailIntegrationPackage = useCallback(async () => {
    if (!detailKeyTarget?.id?.trim()) return;
    const cur = detailKeyTarget.integrationPackageId?.trim() ?? '';
    const next = detailPackageDraft.trim();
    if (cur === next) return;
    setDetailPackageSaving(true);
    try {
      await userSettingsService.patchApiKeyIntegrationPackage(detailKeyTarget.id, {
        integrationPackageId: next || null,
      });
      showMessage('已更新集成套餐', 'success');
      await loadApiKeys();
      setDetailKeyTarget((prev) =>
        prev && prev.id === detailKeyTarget.id ? { ...prev, integrationPackageId: next || null } : prev,
      );
    } catch (e) {
      pageErrorUnlessServerToast(e, '更新集成套餐失败', showMessage);
    } finally {
      setDetailPackageSaving(false);
    }
  }, [detailKeyTarget, detailPackageDraft, loadApiKeys, showMessage]);

  const openRevokeApiKeyModal = useCallback((key: UserApiKey) => {
    setRevokeKeyTarget(key);
    setRevokePassword('');
    setRevokeShowPassword(false);
    setRevokeFieldErrors({});
  }, []);

  const closeRevokeApiKeyModal = useCallback(() => {
    setRevokeKeyTarget(null);
    setRevokePassword('');
    setRevokeFieldErrors({});
  }, []);

  const openRotateApiKeyModal = useCallback((key: UserApiKey) => {
    setRotateKeyTarget(key);
    setRotatePassword('');
    setRotateShowPassword(false);
    setRotateFieldErrors({});
  }, []);

  const closeRotateApiKeyModal = useCallback(() => {
    setRotateKeyTarget(null);
    setRotatePassword('');
    setRotateFieldErrors({});
  }, []);

  const handleConfirmRotateApiKey = useCallback(async () => {
    if (!rotateKeyTarget?.id?.trim()) {
      showMessage('无法轮换：缺少密钥', 'error');
      return;
    }
    if (rotateSubmitting) return;
    setRotateFieldErrors({});
    setRotateSubmitting(true);
    try {
      const rotated = await userSettingsService.rotateApiKey(rotateKeyTarget.id, {
        password: rotatePassword.trim() || undefined,
      });
      const plain = rotated.plainKey?.trim() || '';
      setNewPlainKey(plain || null);
      showMessage('已生成新密钥；旧密钥已失效，请立即更新所有引用。', 'success');
      closeRotateApiKeyModal();
      await loadApiKeys();
    } catch (e) {
      if (isServerErrorGloballyNotified(e)) return;
      const msg = e instanceof Error ? e.message : '轮换失败';
      if (/密码|password/i.test(msg)) {
        setRotateFieldErrors({ password: msg });
      } else {
        setRotateFieldErrors({ form: msg });
      }
      pageErrorUnlessServerToast(e, 'API Key 轮换失败，请重试', showMessage);
    } finally {
      setRotateSubmitting(false);
    }
  }, [
    rotateKeyTarget,
    rotateSubmitting,
    rotatePassword,
    showMessage,
    loadApiKeys,
    closeRotateApiKeyModal,
  ]);

  const handleConfirmRevokeApiKey = useCallback(async () => {
    if (!revokeKeyTarget?.id?.trim()) {
      showMessage('无法撤销：缺少密钥', 'error');
      return;
    }
    if (revokeSubmitting) return;
    setRevokeFieldErrors({});
    setRevokeSubmitting(true);
    try {
      await userSettingsService.revokeApiKey(revokeKeyTarget.id, {
        password: revokePassword.trim() || undefined,
      });
      showMessage('API Key 已撤销', 'success');
      closeRevokeApiKeyModal();
      await loadApiKeys();
    } catch (e) {
      if (isServerErrorGloballyNotified(e)) return;
      const msg = e instanceof Error ? e.message : '撤销失败';
      if (/密码|password/i.test(msg)) {
        setRevokeFieldErrors({ password: msg });
      } else {
        setRevokeFieldErrors({ form: msg });
      }
      pageErrorUnlessServerToast(e, 'API Key 撤销失败，请重试', showMessage);
    } finally {
      setRevokeSubmitting(false);
    }
  }, [
    revokeKeyTarget,
    revokeSubmitting,
    revokePassword,
    showMessage,
    loadApiKeys,
    closeRevokeApiKeyModal,
  ]);

  return (
    <div className={`flex-1 overflow-y-auto ${canvasBodyBg(theme)}`}>
      <div className={`w-full min-h-0 ${mainScrollPadBottom}`}>
        {!embeddedInHub ? (
          <div className="flex min-w-0 items-center gap-3 mb-4">
            <div className={`shrink-0 rounded-xl p-2 ${isDark ? 'bg-white/10' : 'bg-slate-100'}`}>
              <KeyRound size={22} className={textSecondary(theme)} />
            </div>
            <PageTitleTagline
              subtitleOnly
              theme={theme}
              title={chromePageTitle || '密钥管理'}
              tagline="个人 Key，用于请求头 X-Api-Key；说明见接入指南。"
            />
          </div>
        ) : null}

        <BentoCard theme={theme}>
          <h2 className={`text-base font-bold mb-2 flex items-center gap-2 ${textPrimary(theme)}`}>
            <KeyRound size={18} className={tc.text} /> API Key（个人调用）
          </h2>
          <p className={`text-xs mb-3 ${textMuted(theme)}`}>
            创建后<strong className={textSecondary(theme)}>只显示一次</strong>完整密钥；丢失可轮换。列表里只有掩码。
            <button type="button" onClick={() => navigate(`${buildPath(consoleRole, 'developer-docs')}#doc-api-keys-console`)} className={`ml-1 underline font-medium ${tc.text}`}>
              接入指南
            </button>
          </p>
          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                value={newKeyName}
                onChange={(e) => {
                  setNewKeyName(e.target.value);
                  setApiKeyNameError('');
                }}
                placeholder="输入 API Key 名称"
                className={`${nativeInputClass(theme)} flex-1${apiKeyNameError ? ` ${inputBaseError()}` : ''}`}
                aria-invalid={!!apiKeyNameError}
              />
              <button
                type="button"
                onClick={() => void handleCreateApiKey()}
                disabled={creatingApiKey}
                className={`${btnPrimary} !px-3 disabled:opacity-60`}
              >
                {creatingApiKey ? <><Loader2 size={14} className="animate-spin" /> 创建中…</> : <><Plus size={14} /> 新建</>}
              </button>
            </div>
            <div className="space-y-1.5">
              <span className={`text-xs font-semibold ${textMuted(theme)}`}>有效期</span>
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="个人 API Key 有效期">
                {API_KEY_EXPIRY_OPTIONS.map(({ preset, label }) => {
                  const on = apiKeyExpiryPreset === preset;
                  return (
                    <button
                      key={preset}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      disabled={creatingApiKey}
                      className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors disabled:opacity-50 ${
                        on
                          ? isDark
                            ? 'bg-violet-500/20 text-violet-200 ring-1 ring-violet-400/45'
                            : 'bg-violet-100 text-violet-900 ring-1 ring-violet-300/80'
                          : `${btnSecondary(theme)} !shadow-none`
                      }`}
                      onClick={() => setApiKeyExpiryPreset(preset)}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
              <p className={`text-[11px] leading-relaxed ${textMuted(theme)}`}>按日历日计算；选「永不过期」不写过期时间。</p>
            </div>
            <div className="space-y-1.5">
              <span className={`text-xs font-semibold ${textMuted(theme)}`}>集成套餐（可选）</span>
              <LantuSelect
                value={createIntegrationPackageId}
                onChange={setCreateIntegrationPackageId}
                options={packageSelectOptions}
                theme={theme}
                placeholder="不绑定或选择套餐…"
                disabled={creatingApiKey}
                ariaLabel="新建 API Key 时绑定集成套餐"
              />
              {integrationPackagesError ? (
                <p className="text-[11px] text-amber-600 dark:text-amber-400">{integrationPackagesError}</p>
              ) : (
                <p className={`text-[11px] leading-relaxed ${textMuted(theme)}`}>
                  需先在<strong className={textSecondary(theme)}>集成套餐</strong>标签建白名单；绑定后网关按套餐裁剪资源。
                </p>
              )}
            </div>
            {apiKeyNameError ? (
              <p className={`${fieldErrorText()} text-xs`} role="alert">
                {apiKeyNameError}
              </p>
            ) : null}
            {newPlainKey && (
              <div className={`rounded-xl p-3 border space-y-2 ${isDark ? 'bg-emerald-500/10 border-emerald-500/25' : 'bg-emerald-50 border-emerald-200'}`}>
                <p className={`text-xs font-semibold ${isDark ? 'text-emerald-100' : 'text-emerald-950'}`}>密钥仅出现这一次</p>
                <p className={`text-xs leading-relaxed ${textSecondary(theme)}`}>
                  请立即复制保存；未备份可「轮换密钥」拿新串。下方可写入本机，供本站调试与 Playground 共用。
                </p>
                <div className="flex flex-wrap gap-2">
                  <code className={`text-xs break-all flex-1 min-w-[12rem] rounded-lg px-2 py-1.5 ${isDark ? 'bg-black/30 text-emerald-300' : 'bg-white text-emerald-700'}`}>{newPlainKey}</code>
                  <button
                    type="button"
                    className={btnSecondary(theme)}
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(newPlainKey);
                        showMessage('已复制到剪贴板', 'success');
                      } catch {
                        showMessage('复制失败，请手动全选复制', 'error');
                      }
                    }}
                  >
                    <Copy size={14} /> 复制
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 pt-0.5">
                  <button
                    type="button"
                    className={`${btnSecondary(theme)} !text-sm`}
                    onClick={() => {
                      const r = tryPersistGatewayApiKeyToLocalStorage(newPlainKey);
                      if (r === 'too_long') showMessage('密钥过长，无法写入本地', 'error');
                      else if (r === 'quota') showMessage('浏览器存储已满，请手动保存密钥', 'error');
                      else showMessage('已写入本机网关 Key（与市场、Playground、axios 共用）', 'success');
                    }}
                  >
                    <DownloadCloud size={14} /> 保存到本机网关 Key
                  </button>
                  <button
                    type="button"
                    className={`${btnSecondary(theme)} !text-sm`}
                    onClick={() => {
                      setNewPlainKey(null);
                      showMessage('明文已从本页隐藏。若尚未备份到安全位置，将无法再查看同一串密钥。', 'info');
                    }}
                  >
                    <Check size={14} /> 我已保存，隐藏明文
                  </button>
                </div>
              </div>
            )}
            {apiKeysError ? (
              <div className={`rounded-xl p-3 border ${isDark ? 'bg-rose-500/10 border-rose-500/20' : 'bg-rose-50 border-rose-200'}`}>
                <p className="text-xs text-rose-500">{apiKeysError}</p>
                <button type="button" onClick={() => void loadApiKeys()} className="mt-2 text-xs text-neutral-800 hover:text-neutral-900">重试加载</button>
              </div>
            ) : apiKeysLoading ? (
              <PageSkeleton type="table" rows={3} />
            ) : apiKeys.length === 0 ? (
              <p className={`text-xs ${textMuted(theme)}`}>暂无 API Key，可先新建一个用于调用测试。</p>
            ) : (
              <div className="space-y-2">
                {apiKeys.map((key) => (
                  <div key={key.id} className={`flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 py-2.5 border-b last:border-0 ${isDark ? 'border-white/[0.05]' : 'border-slate-100'}`}>
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-semibold truncate ${textPrimary(theme)}`}>{key.name}</p>
                      <p className={`text-xs font-mono ${textMuted(theme)}`}>id: {key.id}</p>
                      <p className={`text-xs font-mono ${textMuted(theme)}`} title="网关按 scope 校验 catalog/resolve/invoke">
                        scope: {key.scopes?.length ? key.scopes.join(', ') : '—'}
                      </p>
                      <p className={`text-xs ${textMuted(theme)}`} title="绑定集成套餐时网关裁剪可访问资源">
                        集成套餐：{packageLabelById(key.integrationPackageId)}
                      </p>
                      {!apiKeyScopesAllowGatewayFlow(key.scopes) ? (
                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                          Scope 不完整，调用可能失败；请撤销后重建或查看 API 文档。
                        </p>
                      ) : null}
                      <p className={`text-xs ${textMuted(theme)}`} title="掩码或前缀，不可作为 X-Api-Key">
                        {key.maskedKey || key.prefix}
                        <span className={`block text-xs mt-0.5 ${textMuted(theme)}`}>（非完整密钥）</span>
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1.5 shrink-0 justify-end">
                      <button
                        type="button"
                        onClick={() => setDetailKeyTarget(key)}
                        className={`text-xs px-2.5 py-1.5 rounded-lg inline-flex items-center gap-1 ${isDark ? 'bg-white/10 text-slate-200 hover:bg-white/15' : 'bg-slate-100 text-slate-800 hover:bg-slate-200'}`}
                      >
                        <Info size={14} aria-hidden /> 详情
                      </button>
                      <button
                        type="button"
                        onClick={() => openRotateApiKeyModal(key)}
                        disabled={rotateSubmitting || revokeSubmitting}
                        className={`text-xs px-2.5 py-1.5 rounded-lg inline-flex items-center gap-1 ${isDark ? 'bg-sky-500/15 text-sky-200 hover:bg-sky-500/25' : 'bg-sky-50 text-sky-900 hover:bg-sky-100'} disabled:opacity-50`}
                      >
                        <RefreshCw size={14} aria-hidden /> 轮换密钥
                      </button>
                      <button
                        type="button"
                        onClick={() => openRevokeApiKeyModal(key)}
                        disabled={revokeSubmitting}
                        className="text-xs px-2.5 py-1.5 rounded-lg bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 disabled:opacity-60"
                      >
                        撤销
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </BentoCard>
      </div>

      <Modal
        open={!!revokeKeyTarget}
        onClose={closeRevokeApiKeyModal}
        title="撤销 API Key"
        theme={theme}
        size="sm"
        footer={
          <>
            <button type="button" className={btnSecondary(theme)} onClick={closeRevokeApiKeyModal}>
              取消
            </button>
            <button
              type="button"
              className={`${btnPrimary} disabled:opacity-50 border border-rose-600/40 bg-rose-600 hover:bg-rose-700 text-white`}
              disabled={revokeSubmitting}
              onClick={() => void handleConfirmRevokeApiKey()}
              aria-label="确认撤销 API Key"
            >
              {revokeSubmitting ? (
                <>
                  <Loader2 size={14} className="animate-spin inline mr-1" aria-hidden />
                  处理中…
                </>
              ) : (
                '确认撤销'
              )}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <p className={`text-xs ${textSecondary(theme)}`}>
            密钥：<span className="font-mono">{revokeKeyTarget?.name}</span>。须输入登录密码以确认撤销。若账户尚未设置密码，请先在个人设置中修改密码后再操作。
          </p>
          <div>
            <label htmlFor="revoke-pwd" className={`text-xs font-semibold block mb-1 ${textSecondary(theme)}`}>
              登录密码
            </label>
            <div className="relative">
              <input
                id="revoke-pwd"
                type={revokeShowPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={revokePassword}
                onChange={(e) => {
                  setRevokePassword(e.target.value);
                  setRevokeFieldErrors((x) => ({ ...x, password: undefined }));
                }}
                className={`${nativeInputClass(theme)} pr-10${revokeFieldErrors.password ? ` ${inputBaseError()}` : ''}`}
                aria-invalid={!!revokeFieldErrors.password}
                aria-describedby={revokeFieldErrors.password ? 'revoke-pwd-err' : undefined}
              />
              <button
                type="button"
                className={`absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md ${isDark ? 'text-slate-400 hover:bg-white/10' : 'text-slate-500 hover:bg-slate-100'}`}
                onClick={() => setRevokeShowPassword((v) => !v)}
                aria-label={revokeShowPassword ? '隐藏密码' : '显示密码'}
              >
                {revokeShowPassword ? <EyeOff size={16} aria-hidden /> : <Eye size={16} aria-hidden />}
              </button>
            </div>
            {revokeFieldErrors.password ? (
              <p id="revoke-pwd-err" className={`mt-1 ${fieldErrorText()} text-xs`} role="alert">
                {revokeFieldErrors.password}
              </p>
            ) : null}
          </div>
          {revokeFieldErrors.form ? (
            <p className={`${fieldErrorText()} text-xs`} role="alert">
              {revokeFieldErrors.form}
            </p>
          ) : null}
        </div>
      </Modal>

      <Modal
        open={!!detailKeyTarget}
        onClose={() => setDetailKeyTarget(null)}
        title="API Key 详情"
        theme={theme}
        size="sm"
        footer={
          <div className="flex flex-wrap gap-2 justify-end w-full">
            <button
              type="button"
              className={btnSecondary(theme)}
              onClick={() => setDetailKeyTarget(null)}
              disabled={detailPackageSaving}
            >
              关闭
            </button>
            <button
              type="button"
              className={btnPrimary}
              disabled={detailPackageSaving}
              onClick={() => void handleSaveDetailIntegrationPackage()}
            >
              {detailPackageSaving ? (
                <>
                  <Loader2 size={14} className="animate-spin inline mr-1" aria-hidden />
                  保存中…
                </>
              ) : (
                '保存套餐'
              )}
            </button>
          </div>
        }
      >
        {detailKeyTarget ? (
          <div className={`space-y-2 text-xs ${textSecondary(theme)}`}>
            <p>
              <span className={`font-semibold ${textSecondary(theme)}`}>名称：</span>
              {detailKeyTarget.name}
            </p>
            <p className="font-mono break-all">
              <span className={`font-semibold ${textSecondary(theme)}`}>id：</span>
              {detailKeyTarget.id}
            </p>
            <p className="font-mono">
              <span className={`font-semibold ${textSecondary(theme)}`}>scope：</span>
              {detailKeyTarget.scopes?.length ? detailKeyTarget.scopes.join(', ') : '—'}
            </p>
            <div className="space-y-1.5 pt-1">
              <span className={`font-semibold ${textSecondary(theme)}`}>集成套餐</span>
              <LantuSelect
                value={detailPackageDraft}
                onChange={setDetailPackageDraft}
                options={packageSelectOptions}
                theme={theme}
                placeholder="选择套餐…"
                disabled={detailPackageSaving}
                ariaLabel="修改 API Key 绑定的集成套餐"
              />
              {integrationPackagesError ? (
                <p className="text-[11px] text-amber-600 dark:text-amber-400">{integrationPackagesError}</p>
              ) : null}
            </div>
            <p>
              <span className={`font-semibold ${textSecondary(theme)}`}>掩码 / 前缀：</span>
              {detailKeyTarget.maskedKey || detailKeyTarget.prefix || '—'}
            </p>
            <p>
              <span className={`font-semibold ${textSecondary(theme)}`}>状态：</span>
              {detailKeyTarget.status}
            </p>
            {detailKeyTarget.createdAt ? (
              <p>
                <span className={`font-semibold ${textSecondary(theme)}`}>创建时间：</span>
                {detailKeyTarget.createdAt}
              </p>
            ) : null}
            {detailKeyTarget.expiresAt ? (
              <p>
                <span className={`font-semibold ${textSecondary(theme)}`}>过期时间：</span>
                {detailKeyTarget.expiresAt}
              </p>
            ) : null}
            {detailKeyTarget.lastUsedAt || detailKeyTarget.lastUsed ? (
              <p>
                <span className={`font-semibold ${textSecondary(theme)}`}>最近使用：</span>
                {detailKeyTarget.lastUsedAt || detailKeyTarget.lastUsed}
              </p>
            ) : null}
            <p>
              <span className={`font-semibold ${textSecondary(theme)}`}>调用次数：</span>
              {detailKeyTarget.callCount ?? '—'}
            </p>
            <p className={`pt-2 border-t ${isDark ? 'border-white/10' : 'border-slate-200'} ${textMuted(theme)} leading-relaxed`}>
              完整 <span className="font-mono">secretPlain</span> 不由列表接口返回。若遗失，请使用「轮换密钥」在验证身份后获取<strong className={textPrimary(theme)}>新的</strong>可调用串（旧串立即失效）。
            </p>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={!!rotateKeyTarget}
        onClose={closeRotateApiKeyModal}
        title="轮换 API Key（生成新明文）"
        theme={theme}
        size="sm"
        footer={
          <>
            <button type="button" className={btnSecondary(theme)} onClick={closeRotateApiKeyModal}>
              取消
            </button>
            <button
              type="button"
              className={`${btnPrimary} disabled:opacity-50 border border-sky-600/40 bg-sky-600 hover:bg-sky-700 text-white`}
              disabled={rotateSubmitting}
              onClick={() => void handleConfirmRotateApiKey()}
              aria-label="确认轮换 API Key"
            >
              {rotateSubmitting ? (
                <>
                  <Loader2 size={14} className="animate-spin inline mr-1" aria-hidden />
                  处理中…
                </>
              ) : (
                '确认轮换'
              )}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <p className={`text-xs ${textSecondary(theme)}`}>
            密钥：<span className="font-mono">{rotateKeyTarget?.name}</span>。验证规则与撤销相同。轮换成功后<strong className={textPrimary(theme)}>仅当次响应</strong>展示新完整密钥；<strong className={textPrimary(theme)}>旧密钥立刻无法调用</strong>，请同步更新环境变量与集成配置。
          </p>
          <div>
            <label htmlFor="rotate-pwd" className={`text-xs font-semibold block mb-1 ${textSecondary(theme)}`}>
              登录密码
            </label>
            <div className="relative">
              <input
                id="rotate-pwd"
                type={rotateShowPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={rotatePassword}
                onChange={(e) => {
                  setRotatePassword(e.target.value);
                  setRotateFieldErrors((x) => ({ ...x, password: undefined }));
                }}
                className={`${nativeInputClass(theme)} pr-10${rotateFieldErrors.password ? ` ${inputBaseError()}` : ''}`}
                aria-invalid={!!rotateFieldErrors.password}
                aria-describedby={rotateFieldErrors.password ? 'rotate-pwd-err' : undefined}
              />
              <button
                type="button"
                className={`absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md ${isDark ? 'text-slate-400 hover:bg-white/10' : 'text-slate-500 hover:bg-slate-100'}`}
                onClick={() => setRotateShowPassword((v) => !v)}
                aria-label={rotateShowPassword ? '隐藏密码' : '显示密码'}
              >
                {rotateShowPassword ? <EyeOff size={16} aria-hidden /> : <Eye size={16} aria-hidden />}
              </button>
            </div>
            {rotateFieldErrors.password ? (
              <p id="rotate-pwd-err" className={`mt-1 ${fieldErrorText()} text-xs`} role="alert">
                {rotateFieldErrors.password}
              </p>
            ) : null}
          </div>
          {rotateFieldErrors.form ? (
            <p className={`${fieldErrorText()} text-xs`} role="alert">
              {rotateFieldErrors.form}
            </p>
          ) : null}
        </div>
      </Modal>
    </div>
  );
};
