import React, { useState, useCallback, useRef } from 'react';
import {
  Settings, Lock, Monitor, Bell, Mail, Eye, EyeOff, Database, Palette,
  ChevronRight, Trash2, Download, Loader2, KeyRound, Plus, Copy, Check, DownloadCloud,
  Info, RefreshCw,
} from 'lucide-react';
import type { Theme, ThemeMode, FontSize, ThemeColor } from '../../types';
import { THEME_COLOR_CLASSES } from '../../constants/theme';
import { authService } from '../../api/services/auth.service';
import { userSettingsService } from '../../api/services/user-settings.service';
import { nativeInputClass } from '../../utils/formFieldClasses';
import { LantuSelect } from '../../components/common/LantuSelect';
import { Modal } from '../../components/common/Modal';
import { BentoCard } from '../../components/common/BentoCard';
import { env } from '../../config/env';
import type { UserApiKey } from '../../types/dto/user-settings';
import { isServerErrorGloballyNotified } from '../../types/api';
import {
  canvasBodyBg, btnPrimary, btnSecondary, fieldErrorText, inputBaseError,
  textPrimary, textSecondary, textMuted,
  consoleContentTopPad, mainScrollPadBottom, mainScrollPadX,
} from '../../utils/uiClasses';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLayoutChrome } from '../../context/LayoutChromeContext';
import { PageTitleTagline } from '../../components/common/PageTitleTagline';
import { PageSkeleton } from '../../components/common/PageSkeleton';
import { buildPath } from '../../constants/consoleRoutes';
import { apiKeyScopesAllowGatewayFlow } from '../../utils/apiKeyScopes';
import { MAX_STORED_API_KEY_LENGTH } from '../../lib/safeStorage';

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

export interface UserSettingsPageProps {
  theme: Theme;
  themePreference: ThemeMode;
  fontSize: FontSize;
  themeColor: ThemeColor;
  showMessage: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onOpenAppearance: () => void;
}

type ToggleProps = { on: boolean; onToggle: () => void; theme: Theme };

function pageErrorUnlessServerToast(
  e: unknown,
  fallback: string,
  show: UserSettingsPageProps['showMessage'],
) {
  if (isServerErrorGloballyNotified(e)) return;
  show(e instanceof Error ? e.message : fallback, 'error');
}

function Toggle({ on, onToggle, theme }: ToggleProps) {
  const isDark = theme === 'dark';
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onToggle}
      className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${on ? 'bg-neutral-900' : isDark ? 'bg-white/15' : 'bg-slate-200'}`}
    >
      <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${on ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
  );
}

export const UserSettingsPage: React.FC<UserSettingsPageProps> = ({
  theme, themePreference, themeColor, showMessage, onOpenAppearance,
}) => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const consoleRole = pathname.startsWith('/admin') ? 'admin' : 'user';
  const { chromePageTitle } = useLayoutChrome();
  const isDark = theme === 'dark';
  const tc = THEME_COLOR_CLASSES[themeColor];

  const [emailNotif, setEmailNotif] = useState(true);
  const [browserNotif, setBrowserNotif] = useState(false);
  const [alertNotif, setAlertNotif] = useState(true);
  const [usageAnalytics, setUsageAnalytics] = useState(false);
  const [sessionPersist, setSessionPersist] = useState(true);
  const [dataRegion, setDataRegion] = useState('cn-east');
  const [prefsLoaded, setPrefsLoaded] = useState(false);
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

  React.useEffect(() => {
    userSettingsService.getWorkspace().then((ws: any) => {
      if (ws?.notifications) {
        setEmailNotif(ws.notifications.email ?? true);
        setBrowserNotif(ws.notifications.browser ?? false);
        setAlertNotif(ws.notifications.agentErrors ?? true);
      }
      setPrefsLoaded(true);
    }).catch((e) => {
      pageErrorUnlessServerToast(e, '偏好设置加载失败', showMessage);
      setPrefsLoaded(true);
    });
    void loadApiKeys();
  }, [loadApiKeys, showMessage]);

  const saveNotificationPrefs = React.useCallback(async (prefs: { email?: boolean; browser?: boolean; agentErrors?: boolean }) => {
    try {
      await userSettingsService.updateWorkspace({ notifications: prefs } as any);
    } catch (e) {
      pageErrorUnlessServerToast(e, '通知偏好保存失败', showMessage);
    }
  }, [showMessage]);

  const [apiKeyNameError, setApiKeyNameError] = useState('');

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
      const created = await userSettingsService.createApiKey({ name: newKeyName.trim() });
      setNewPlainKey(created.plainKey ?? null);
      showMessage('已创建，请立即复制保存密钥。', 'success');
      setNewKeyName('');
      await loadApiKeys();
    } catch (e) {
      pageErrorUnlessServerToast(e, 'API Key 创建失败', showMessage);
    } finally {
      createApiKeyInFlightRef.current = false;
      setCreatingApiKey(false);
    }
  }, [loadApiKeys, newKeyName, showMessage]);

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

  const [showPwdModal, setShowPwdModal] = useState(false);
  const [pwdCurrent, setPwdCurrent] = useState('');
  const [pwdNew, setPwdNew] = useState('');
  const [pwdConfirm, setPwdConfirm] = useState('');
  const [pwdError, setPwdError] = useState('');
  const [pwdLoading, setPwdLoading] = useState(false);

  const handlePwdSubmit = useCallback(async () => {
    if (pwdNew.length < 6) { setPwdError('新密码至少 6 个字符'); return; }
    if (pwdNew !== pwdConfirm) { setPwdError('两次输入的新密码不一致'); return; }
    if (!pwdCurrent) { setPwdError('请输入当前密码'); return; }
    setPwdError('');
    setPwdLoading(true);
    try {
      await authService.changePassword(pwdCurrent, pwdNew);
      showMessage('密码修改成功', 'success');
      setShowPwdModal(false);
      setPwdCurrent(''); setPwdNew(''); setPwdConfirm('');
    } catch (e) {
      if (isServerErrorGloballyNotified(e)) return;
      setPwdError(e instanceof Error ? e.message : '密码修改失败');
    } finally {
      setPwdLoading(false);
    }
  }, [pwdCurrent, pwdNew, pwdConfirm, showMessage]);

  const rowBtn = `w-full flex items-center justify-between gap-3 p-3 rounded-xl text-left transition-colors ${isDark ? 'hover:bg-white/[0.04]' : 'hover:bg-slate-50'}`;

  return (
    <div className={`flex-1 overflow-y-auto ${canvasBodyBg(theme)}`}>
      <div className={`w-full min-h-0 ${mainScrollPadX} ${consoleContentTopPad} ${mainScrollPadBottom}`}>
        <div className="flex min-w-0 items-center gap-3 mb-4">
          <div className={`shrink-0 rounded-xl p-2 ${isDark ? 'bg-white/10' : 'bg-slate-100'}`}>
            <Settings size={22} className={textSecondary(theme)} />
          </div>
          <PageTitleTagline subtitleOnly theme={theme} title={chromePageTitle || '偏好设置'} tagline="账号安全、通知偏好与隐私选项" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
          <BentoCard theme={theme}>
            <h2 className={`text-base font-bold mb-4 flex items-center gap-2 ${textPrimary(theme)}`}>
              <Lock size={18} className={tc.text} /> 账号与安全
            </h2>
            <div className="space-y-1">
              <button type="button" className={rowBtn} onClick={() => { setPwdError(''); setPwdCurrent(''); setPwdNew(''); setPwdConfirm(''); setShowPwdModal(true); }}>
                <span className="flex items-center gap-3 min-w-0"><Lock size={16} className="text-slate-400 shrink-0" /><span className={`text-sm font-medium ${textSecondary(theme)}`}>登录密码</span></span>
                <ChevronRight size={16} className="text-slate-400 shrink-0" />
              </button>
              <button type="button" className={rowBtn} onClick={() => navigate(buildPath(consoleRole, 'profile'))}>
                <span className="flex items-center gap-3 min-w-0"><Monitor size={16} className="text-slate-400 shrink-0" /><span className={`text-sm font-medium ${textSecondary(theme)}`}>登录设备与会话</span></span>
                <ChevronRight size={16} className="text-slate-400 shrink-0" />
              </button>
            </div>
          </BentoCard>
          {/* Notifications */}
          <BentoCard theme={theme}>
            <h2 className={`text-base font-bold mb-4 flex items-center gap-2 ${textPrimary(theme)}`}>
              <Bell size={18} className={tc.text} /> 通知
            </h2>
            <div className="space-y-4">
              {[
                { icon: Mail, label: '邮件通知', desc: '配额、账单与安全类邮件', on: emailNotif, toggle: () => { setEmailNotif((v) => { void saveNotificationPrefs({ email: !v }); return !v; }); } },
                { icon: Bell, label: '浏览器通知', desc: '需授权后生效', on: browserNotif, toggle: () => { setBrowserNotif((v) => { void saveNotificationPrefs({ browser: !v }); return !v; }); } },
                { icon: Bell, label: '运维告警推送', desc: '与监控中心告警策略联动', on: alertNotif, toggle: () => { setAlertNotif((v) => { void saveNotificationPrefs({ agentErrors: !v }); return !v; }); } },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <item.icon size={16} className="text-slate-400 shrink-0" />
                    <div>
                      <div className={`text-sm font-medium ${textSecondary(theme)}`}>{item.label}</div>
                      <div className={`text-xs ${textMuted(theme)}`}>{item.desc}</div>
                    </div>
                  </div>
                  <Toggle on={item.on} onToggle={item.toggle} theme={theme} />
                </div>
              ))}
              {!prefsLoaded && <div className="mt-2"><PageSkeleton type="table" rows={2} /></div>}
            </div>
          </BentoCard>

          {/* Privacy */}
          <BentoCard theme={theme}>
            <h2 className={`text-base font-bold mb-4 flex items-center gap-2 ${textPrimary(theme)}`}>
              <Eye size={18} className={tc.text} /> 隐私与数据
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div><div className={`text-sm font-medium ${textSecondary(theme)}`}>使用与诊断数据</div><div className={`text-xs ${textMuted(theme)}`}>匿名统计以改进产品体验</div></div>
                <Toggle on={usageAnalytics} onToggle={() => setUsageAnalytics((v) => !v)} theme={theme} />
              </div>
              <div className="flex items-center justify-between gap-3">
                <div><div className={`text-sm font-medium ${textSecondary(theme)}`}>保持登录状态</div><div className={`text-xs ${textMuted(theme)}`}>关闭后关闭浏览器需重新登录</div></div>
                <Toggle on={sessionPersist} onToggle={() => setSessionPersist((v) => !v)} theme={theme} />
              </div>
              <div>
                <label className={`text-xs font-semibold block mb-1.5 ${textMuted(theme)}`}>默认数据地域（演示）</label>
                <LantuSelect
                  theme={theme}
                  value={dataRegion}
                  onChange={setDataRegion}
                  options={[
                    { value: 'cn-east', label: '中国东部' },
                    { value: 'cn-north', label: '中国北部' },
                    { value: 'global', label: '全球路由' },
                  ]}
                />
              </div>
            </div>
          </BentoCard>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <BentoCard theme={theme}>
          <h2 className={`text-base font-bold mb-3 flex items-center gap-2 ${textPrimary(theme)}`}>
            <Database size={18} className={tc.text} /> 本地与缓存
          </h2>
          <p className={`text-xs mb-4 ${textMuted(theme)}`}>清除本机缓存的静态资源与未同步草稿，不会影响服务端数据。</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => { const tb = localStorage.getItem(env.VITE_TOKEN_KEY); const rb = localStorage.getItem(env.VITE_REFRESH_TOKEN_KEY); localStorage.clear(); if (tb) localStorage.setItem(env.VITE_TOKEN_KEY, tb); if (rb) localStorage.setItem(env.VITE_REFRESH_TOKEN_KEY, rb); showMessage('已清除本地缓存', 'success'); }} className={btnSecondary(theme)}>
              <Trash2 size={15} /> 清除缓存
            </button>
            <button type="button" onClick={() => { const prefs = { theme, themePreference, themeColor, emailNotif, browserNotif, alertNotif, usageAnalytics, sessionPersist, exportTime: new Date().toISOString() }; const json = JSON.stringify(prefs, null, 2); const blob = new Blob([json], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `preferences-${new Date().toISOString().slice(0, 10)}.json`; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url); showMessage('偏好设置已导出', 'success'); }} className={btnSecondary(theme)}>
              <Download size={15} /> 导出偏好设置
            </button>
          </div>
        </BentoCard>

        <BentoCard theme={theme}>
          <h2 className={`text-base font-bold mb-2 flex items-center gap-2 ${textPrimary(theme)}`}>
            <KeyRound size={18} className={tc.text} /> API Key（个人调用）
          </h2>
          <p className={`text-xs mb-2 ${textMuted(theme)}`}>
            用于接口请求头 <span className="font-mono">X-Api-Key</span>。创建后<strong className={textSecondary(theme)}>仅当次响应</strong>会展示完整密钥；若未保存，可在<strong className={textSecondary(theme)}>验证身份后轮换密钥</strong>以获取新明文（<strong className={textPrimary(theme)}>旧串立即作废</strong>）。
            新建将自动带上默认可调用权限。
          </p>
          <p className={`text-xs mb-3 ${textMuted(theme)}`}>
            服务端只存密钥摘要，无法「找回」原明文。列表中的掩码、前缀、id 不能作为请求头；撤销后本条将不再显示。
            <button type="button" onClick={() => navigate(buildPath(consoleRole, 'api-docs'))} className={`ml-1 underline font-medium ${tc.text}`}>
              完整说明见 API 文档
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
            {apiKeyNameError ? (
              <p className={`${fieldErrorText()} text-xs`} role="alert">
                {apiKeyNameError}
              </p>
            ) : null}
            {newPlainKey && (
              <div className={`rounded-xl p-3 border space-y-2 ${isDark ? 'bg-emerald-500/10 border-emerald-500/25' : 'bg-emerald-50 border-emerald-200'}`}>
                <p className={`text-xs font-semibold ${isDark ? 'text-emerald-100' : 'text-emerald-950'}`}>密钥仅出现这一次</p>
                <p className={`text-xs leading-relaxed ${textSecondary(theme)}`}>
                  服务端只保存摘要，无法用原 id 解密出旧明文。请复制到密码管理器或环境变量；若已丢失，可从列表使用「轮换密钥」在验证登录密码后获得新串（旧串作废）。需要在本站「市场 / 网关调试」里用时，可一键写入下面共用的本机存储。
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
                      {!apiKeyScopesAllowGatewayFlow(key.scopes) ? (
                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                          Scope 不完整，调用可能失败；请撤销后重建或查看 API 文档。
                        </p>
                      ) : null}
                      <p className={`text-xs ${textMuted(theme)}`} title="掩码或前缀，不可作为 X-Api-Key">
                        {key.maskedKey || key.prefix}
                        <span className={`block text-xs mt-0.5 ${textMuted(theme)}`}>（掩码，非请求头密钥）</span>
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

        {/* Appearance */}
        <BentoCard theme={theme}>
          <h2 className={`text-base font-bold mb-3 flex items-center gap-2 ${textPrimary(theme)}`}>
            <Palette size={18} className={tc.text} /> 外观
          </h2>
          <p className={`text-xs mb-4 ${textMuted(theme)}`}>主题模式、字号、字体与页面动画等在顶栏设置（齿轮）内的「外观与主题」中配置。</p>
          <button type="button" onClick={() => { onOpenAppearance(); showMessage('已展开侧栏外观菜单', 'info'); }} className={btnPrimary}>
            <Palette size={15} /> 打开外观与主题
          </button>
        </BentoCard>
        </div>
      </div>

      {/* Password Modal */}
      <Modal open={showPwdModal} onClose={() => setShowPwdModal(false)} title="修改密码" theme={theme} size="sm" footer={<><button type="button" className={btnSecondary(theme)} onClick={() => setShowPwdModal(false)}>取消</button><button type="button" className={`${btnPrimary} disabled:opacity-50`} disabled={pwdLoading} onClick={handlePwdSubmit}>{pwdLoading ? <><Loader2 size={14} className="animate-spin" /> 提交中…</> : '确认修改'}</button></>}>
        <div className="space-y-3">
          <div><label className={`text-xs font-semibold block mb-1 ${textSecondary(theme)}`}>当前密码</label><input type="password" value={pwdCurrent} onChange={(e) => setPwdCurrent(e.target.value)} className={nativeInputClass(theme)} /></div>
          <div><label className={`text-xs font-semibold block mb-1 ${textSecondary(theme)}`}>新密码</label><input type="password" value={pwdNew} onChange={(e) => setPwdNew(e.target.value)} placeholder="至少 6 个字符" className={nativeInputClass(theme)} /></div>
          <div><label className={`text-xs font-semibold block mb-1 ${textSecondary(theme)}`}>确认新密码</label><input type="password" value={pwdConfirm} onChange={(e) => setPwdConfirm(e.target.value)} className={nativeInputClass(theme)} /></div>
          {pwdError && <p className="text-xs text-rose-500 font-medium">{pwdError}</p>}
        </div>
      </Modal>

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
            密钥：<span className="font-mono">{revokeKeyTarget?.name}</span>。须输入登录密码以确认撤销。若账户尚未设置密码，请先在上方修改密码后再操作。
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
          <button type="button" className={btnPrimary} onClick={() => setDetailKeyTarget(null)}>
            关闭
          </button>
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
