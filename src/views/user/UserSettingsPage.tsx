import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Settings, Lock, Smartphone, Monitor, Bell, Mail, Eye, Database, Palette,
  ChevronRight, Trash2, Download, Loader2, KeyRound, Plus, Copy, Check, DownloadCloud,
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
  const [deletingApiKeyId, setDeletingApiKeyId] = useState<string | null>(null);
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

  const handleDeleteApiKey = useCallback(async (id: string) => {
    if (!id?.trim()) {
      showMessage('无法撤销：缺少密钥 ID，请刷新页面后重试', 'error');
      return;
    }
    if (deletingApiKeyId) return;
    setDeletingApiKeyId(id);
    try {
      await userSettingsService.deleteApiKey(id);
      showMessage('API Key 已撤销', 'success');
      await loadApiKeys();
    } catch (e) {
      pageErrorUnlessServerToast(e, 'API Key 撤销失败，请重试', showMessage);
    } finally {
      setDeletingApiKeyId(null);
    }
  }, [deletingApiKeyId, loadApiKeys, showMessage]);

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

  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [phone, setPhone] = useState('');
  const [smsCode, setSmsCode] = useState('');
  const [countdown, setCountdown] = useState(0);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [smsLoading, setSmsLoading] = useState(false);
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [phoneFieldErrors, setPhoneFieldErrors] = useState<{ phone?: string; smsCode?: string }>({});

  const handleSendCode = useCallback(async () => {
    if (!/^1\d{10}$/.test(phone)) {
      setPhoneFieldErrors((p) => ({ ...p, phone: '请输入正确的手机号' }));
      return;
    }
    setPhoneFieldErrors((p) => ({ ...p, phone: undefined }));
    setSmsLoading(true);
    try {
      await authService.sendSmsCode(phone);
      setCountdown(60);
      countdownRef.current = setInterval(() => {
        setCountdown((v) => { if (v <= 1) { clearInterval(countdownRef.current!); return 0; } return v - 1; });
      }, 1000);
    } catch (e) {
      pageErrorUnlessServerToast(e, '发送验证码失败', showMessage);
    } finally {
      setSmsLoading(false);
    }
  }, [phone, showMessage]);

  useEffect(() => () => { if (countdownRef.current) clearInterval(countdownRef.current); }, []);

  const handlePhoneSubmit = useCallback(async () => {
    const next: { phone?: string; smsCode?: string } = {};
    if (!/^1\d{10}$/.test(phone)) next.phone = '请输入正确的手机号';
    if (smsCode.length < 4) next.smsCode = '请输入验证码';
    if (Object.keys(next).length > 0) {
      setPhoneFieldErrors((p) => ({ ...p, ...next }));
      return;
    }
    setPhoneFieldErrors({});
    setPhoneLoading(true);
    try {
      await authService.bindPhone(phone, smsCode);
      showMessage('手机号绑定成功', 'success');
      setShowPhoneModal(false);
      setPhone(''); setSmsCode('');
    } catch (e) {
      pageErrorUnlessServerToast(e, '绑定失败', showMessage);
    } finally {
      setPhoneLoading(false);
    }
  }, [phone, smsCode, showMessage]);

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
              <button type="button" className={rowBtn} onClick={() => { setPhone(''); setSmsCode(''); setShowPhoneModal(true); }}>
                <span className="flex items-center gap-3 min-w-0"><Smartphone size={16} className="text-slate-400 shrink-0" /><span className={`text-sm font-medium ${textSecondary(theme)}`}>手机号</span></span>
                <span className={`text-xs ${textMuted(theme)}`}>未绑定</span>
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
            用于接口请求头 <span className="font-mono">X-Api-Key</span>。创建后<strong className={textSecondary(theme)}>仅当次响应</strong>可复制完整密钥，请先保存再关闭提示。
            新建将自动带上默认可调用权限（scope）。
          </p>
          <p className={`text-xs mb-3 ${textMuted(theme)}`}>
            列表中的掩码、前缀、id 不能代替完整密钥；撤销后本条将不再显示。
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
                  服务端只保存密钥的校验摘要，<strong className={textPrimary(theme)}>无法找回</strong>明文。请复制到密码管理器或环境变量；需要在本站「市场 / 网关调试」里用时，可一键写入下面共用的本机存储。
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
                  <div key={key.id} className={`flex items-center justify-between gap-3 py-2.5 border-b last:border-0 ${isDark ? 'border-white/[0.05]' : 'border-slate-100'}`}>
                    <div className="min-w-0">
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
                    <button
                      type="button"
                      onClick={() => void handleDeleteApiKey(key.id)}
                      disabled={deletingApiKeyId !== null}
                      className="text-xs px-2.5 py-1.5 rounded-lg bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 disabled:opacity-60"
                    >
                      {deletingApiKeyId === key.id ? '撤销中…' : '撤销'}
                    </button>
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

      {/* Phone Modal */}
      <Modal
        open={showPhoneModal}
        onClose={() => {
          setShowPhoneModal(false);
          setPhoneFieldErrors({});
        }}
        title="绑定手机号"
        theme={theme}
        size="sm"
        footer={
          <>
            <button
              type="button"
              className={btnSecondary(theme)}
              onClick={() => {
                setShowPhoneModal(false);
                setPhoneFieldErrors({});
              }}
            >
              取消
            </button>
            <button type="button" className={`${btnPrimary} disabled:opacity-50`} disabled={phoneLoading} onClick={handlePhoneSubmit}>
              {phoneLoading ? <><Loader2 size={14} className="animate-spin" /> 绑定中…</> : '确认绑定'}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <label className={`text-xs font-semibold block mb-1 ${textSecondary(theme)}`}>手机号</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                setPhoneFieldErrors((p) => ({ ...p, phone: undefined }));
              }}
              placeholder="输入 11 位手机号"
              className={`${nativeInputClass(theme)}${phoneFieldErrors.phone ? ` ${inputBaseError()}` : ''}`}
              aria-invalid={!!phoneFieldErrors.phone}
            />
            {phoneFieldErrors.phone ? (
              <p className={`mt-1 ${fieldErrorText()} text-xs`} role="alert">
                {phoneFieldErrors.phone}
              </p>
            ) : null}
          </div>
          <div>
            <label className={`text-xs font-semibold block mb-1 ${textSecondary(theme)}`}>验证码</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={smsCode}
                onChange={(e) => {
                  setSmsCode(e.target.value);
                  setPhoneFieldErrors((p) => ({ ...p, smsCode: undefined }));
                }}
                placeholder="输入验证码"
                className={`${nativeInputClass(theme)} flex-1${phoneFieldErrors.smsCode ? ` ${inputBaseError()}` : ''}`}
                aria-invalid={!!phoneFieldErrors.smsCode}
              />
              <button type="button" disabled={countdown > 0} onClick={handleSendCode} className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${countdown > 0 ? (isDark ? 'bg-white/5 text-slate-600 cursor-not-allowed' : 'bg-slate-200 text-slate-400 cursor-not-allowed') : `text-white ${tc.bg}`}`}>
                {countdown > 0 ? `${countdown}s` : '获取验证码'}
              </button>
            </div>
            {phoneFieldErrors.smsCode ? (
              <p className={`mt-1 ${fieldErrorText()} text-xs`} role="alert">
                {phoneFieldErrors.smsCode}
              </p>
            ) : null}
          </div>
        </div>
      </Modal>
    </div>
  );
};
