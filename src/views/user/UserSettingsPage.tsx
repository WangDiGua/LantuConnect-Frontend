import React, { useState, useCallback } from 'react';
import {
  Settings, Lock, Monitor, Database, Palette,
  ChevronRight, Trash2, Download, Loader2, KeyRound,
} from 'lucide-react';
import type { Theme, ThemeMode, FontSize, ThemeColor } from '../../types';
import { THEME_COLOR_CLASSES } from '../../constants/theme';
import { authService } from '../../api/services/auth.service';
import { nativeInputClass } from '../../utils/formFieldClasses';
import { Modal } from '../../components/common/Modal';
import { BentoCard } from '../../components/common/BentoCard';
import { env } from '../../config/env';
import { isServerErrorGloballyNotified } from '../../types/api';
import {
  canvasBodyBg, btnPrimary, btnSecondary,
  textPrimary, textSecondary, textMuted,
  mainScrollPadBottom,
} from '../../utils/uiClasses';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLayoutChrome } from '../../context/LayoutChromeContext';
import { PageTitleTagline } from '../../components/common/PageTitleTagline';
import { buildPath, inferConsoleRole, parseRoute } from '../../constants/consoleRoutes';
import { useUserRole } from '../../context/UserRoleContext';
import { tokenStorage } from '../../lib/security';
import { useAuthStore } from '../../stores/authStore';
export interface UserSettingsPageProps {
  theme: Theme;
  themePreference: ThemeMode;
  fontSize: FontSize;
  themeColor: ThemeColor;
  showMessage: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onOpenAppearance: () => void;
  /** 嵌入个人资料页时由外层提供滚动与背景，不重复包裹画布 */
  embedded?: boolean;
  /** 嵌入时「登录设备与会话」跳回个人资料并打开设备 Tab */
  onGoToLoginDevices?: () => void;
}

type ToggleProps = { on: boolean; onToggle: () => void; theme: Theme };

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
  theme,
  themePreference,
  themeColor,
  showMessage,
  onOpenAppearance,
  embedded = false,
  onGoToLoginDevices,
}) => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { platformRole } = useUserRole();
  const routePage = parseRoute(pathname)?.page ?? '';
  const consoleRole = inferConsoleRole(routePage, platformRole);
  const { chromePageTitle } = useLayoutChrome();
  const isDark = theme === 'dark';
  const tc = THEME_COLOR_CLASSES[themeColor];

  const sessionPersist = useAuthStore((s) => s.remember);
  const setRememberPersistence = useAuthStore((s) => s.setRememberPersistence);

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

  const handleSessionPersistToggle = () => {
    const next = !sessionPersist;
    setRememberPersistence(next);
    showMessage(next ? '已切换为浏览器持久会话' : '已切换为仅当前窗口会话', 'success');
  };

  const handleClearLocalCache = () => {
    const accessToken = tokenStorage.get(env.VITE_TOKEN_KEY);
    const refreshToken = tokenStorage.get(env.VITE_REFRESH_TOKEN_KEY);
    const persistTokens = tokenStorage.isPersistent(env.VITE_REFRESH_TOKEN_KEY);
    try {
      localStorage.clear();
    } catch {
      /* ignore */
    }
    try {
      sessionStorage.clear();
    } catch {
      /* ignore */
    }
    if (accessToken) tokenStorage.set(env.VITE_TOKEN_KEY, accessToken, { persist: persistTokens });
    if (refreshToken) tokenStorage.set(env.VITE_REFRESH_TOKEN_KEY, refreshToken, { persist: persistTokens });
    showMessage('已清除本地缓存', 'success');
  };

  const openLoginDevices = () => {
    if (embedded && onGoToLoginDevices) {
      onGoToLoginDevices();
    } else {
      navigate(buildPath(consoleRole, 'profile'));
    }
  };

  const body = (
    <>
        {!embedded ? (
          <div className="flex min-w-0 items-center gap-3 mb-4">
            <div className={`shrink-0 rounded-xl p-2 ${isDark ? 'bg-white/10' : 'bg-slate-100'}`}>
              <Settings size={22} className={textSecondary(theme)} />
            </div>
            <PageTitleTagline subtitleOnly theme={theme} title={chromePageTitle || '偏好设置'} tagline="账号安全、会话偏好与本地缓存" />
          </div>
        ) : (
          <p className={`mb-4 text-sm ${textMuted(theme)}`}>账号安全、会话偏好与本地缓存</p>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          <BentoCard theme={theme}>
            <h2 className={`text-base font-bold mb-4 flex items-center gap-2 ${textPrimary(theme)}`}>
              <Lock size={18} className={tc.text} /> 账号与安全
            </h2>
            <div className="space-y-1">
              <button type="button" className={rowBtn} onClick={() => { setPwdError(''); setPwdCurrent(''); setPwdNew(''); setPwdConfirm(''); setShowPwdModal(true); }}>
                <span className="flex items-center gap-3 min-w-0"><Lock size={16} className="text-slate-400 shrink-0" /><span className={`text-sm font-medium ${textSecondary(theme)}`}>登录密码</span></span>
                <ChevronRight size={16} className="text-slate-400 shrink-0" />
              </button>
              <button type="button" className={rowBtn} onClick={openLoginDevices}>
                <span className="flex items-center gap-3 min-w-0"><Monitor size={16} className="text-slate-400 shrink-0" /><span className={`text-sm font-medium ${textSecondary(theme)}`}>登录设备与会话</span></span>
                <ChevronRight size={16} className="text-slate-400 shrink-0" />
              </button>
              <button type="button" className={rowBtn} onClick={() => navigate(buildPath(consoleRole, 'my-api-keys'))}>
                <span className="flex items-center gap-3 min-w-0"><KeyRound size={16} className="text-slate-400 shrink-0" /><span className={`text-sm font-medium ${textSecondary(theme)}`}>密钥与集成套餐</span></span>
                <ChevronRight size={16} className="text-slate-400 shrink-0" />
              </button>
            </div>
          </BentoCard>

          <BentoCard theme={theme}>
            <h2 className={`text-base font-bold mb-4 flex items-center gap-2 ${textPrimary(theme)}`}>
              <Monitor size={18} className={tc.text} /> 会话偏好
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div><div className={`text-sm font-medium ${textSecondary(theme)}`}>保持登录状态</div><div className={`text-xs ${textMuted(theme)}`}>关闭后关闭浏览器需重新登录</div></div>
                <Toggle on={sessionPersist} onToggle={handleSessionPersistToggle} theme={theme} />
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
            <button type="button" onClick={handleClearLocalCache} className={btnSecondary(theme)}>
              <Trash2 size={15} /> 清除缓存
            </button>
            <button type="button" onClick={() => { const prefs = { theme, themePreference, themeColor, sessionPersist, exportTime: new Date().toISOString() }; const json = JSON.stringify(prefs, null, 2); const blob = new Blob([json], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `preferences-${new Date().toISOString().slice(0, 10)}.json`; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url); showMessage('偏好设置已导出', 'success'); }} className={btnSecondary(theme)}>
              <Download size={15} /> 导出偏好设置
            </button>
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

      {/* Password Modal */}
      <Modal open={showPwdModal} onClose={() => setShowPwdModal(false)} title="修改密码" theme={theme} size="sm" footer={<><button type="button" className={btnSecondary(theme)} onClick={() => setShowPwdModal(false)}>取消</button><button type="button" className={`${btnPrimary} disabled:opacity-50`} disabled={pwdLoading} onClick={handlePwdSubmit}>{pwdLoading ? <><Loader2 size={14} className="animate-spin" /> 提交中…</> : '确认修改'}</button></>}>
        <div className="space-y-3">
          <div><label className={`text-xs font-semibold block mb-1 ${textSecondary(theme)}`}>当前密码</label><input type="password" value={pwdCurrent} onChange={(e) => setPwdCurrent(e.target.value)} className={nativeInputClass(theme)} /></div>
          <div><label className={`text-xs font-semibold block mb-1 ${textSecondary(theme)}`}>新密码</label><input type="password" value={pwdNew} onChange={(e) => setPwdNew(e.target.value)} placeholder="至少 6 个字符" className={nativeInputClass(theme)} /></div>
          <div><label className={`text-xs font-semibold block mb-1 ${textSecondary(theme)}`}>确认新密码</label><input type="password" value={pwdConfirm} onChange={(e) => setPwdConfirm(e.target.value)} className={nativeInputClass(theme)} /></div>
          {pwdError && <p className="text-xs text-rose-500 font-medium">{pwdError}</p>}
        </div>
      </Modal>
    </>
  );

  if (embedded) {
    return body;
  }

  return (
    <div className={`flex-1 overflow-y-auto ${canvasBodyBg(theme)}`}>
      <div className={`w-full min-h-0 ${mainScrollPadBottom}`}>{body}</div>
    </div>
  );
};
