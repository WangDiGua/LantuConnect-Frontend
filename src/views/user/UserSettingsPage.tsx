import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Settings, Lock, Smartphone, Monitor, Bell, Mail, Eye, Database, Palette,
  ChevronRight, Trash2, Download,
} from 'lucide-react';
import type { Theme, FontSize, ThemeColor } from '../../types';
import { THEME_COLOR_CLASSES } from '../../constants/theme';
import { nativeSelectClass, nativeInputClass } from '../../utils/formFieldClasses';
import { Modal } from '../../components/common/Modal';
import { BentoCard } from '../../components/common/BentoCard';
import { env } from '../../config/env';
import {
  pageBg, btnPrimary, btnSecondary, textPrimary, textSecondary, textMuted,
} from '../../utils/uiClasses';

export interface UserSettingsPageProps {
  theme: Theme;
  fontSize: FontSize;
  themeColor: ThemeColor;
  showMessage: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onOpenAppearance: () => void;
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
      className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${on ? 'bg-indigo-600' : isDark ? 'bg-white/15' : 'bg-slate-200'}`}
    >
      <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${on ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
  );
}

export const UserSettingsPage: React.FC<UserSettingsPageProps> = ({
  theme, themeColor, showMessage, onOpenAppearance,
}) => {
  const isDark = theme === 'dark';
  const tc = THEME_COLOR_CLASSES[themeColor];

  const [emailNotif, setEmailNotif] = useState(true);
  const [browserNotif, setBrowserNotif] = useState(false);
  const [alertNotif, setAlertNotif] = useState(true);
  const [usageAnalytics, setUsageAnalytics] = useState(false);
  const [sessionPersist, setSessionPersist] = useState(true);

  const [showPwdModal, setShowPwdModal] = useState(false);
  const [pwdCurrent, setPwdCurrent] = useState('');
  const [pwdNew, setPwdNew] = useState('');
  const [pwdConfirm, setPwdConfirm] = useState('');
  const [pwdError, setPwdError] = useState('');

  const handlePwdSubmit = useCallback(() => {
    if (pwdNew.length < 6) { setPwdError('新密码至少 6 个字符'); return; }
    if (pwdNew !== pwdConfirm) { setPwdError('两次输入的新密码不一致'); return; }
    if (!pwdCurrent) { setPwdError('请输入当前密码'); return; }
    setPwdError('');
    showMessage('密码修改成功', 'success');
    setShowPwdModal(false);
    setPwdCurrent(''); setPwdNew(''); setPwdConfirm('');
  }, [pwdCurrent, pwdNew, pwdConfirm, showMessage]);

  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [phone, setPhone] = useState('');
  const [smsCode, setSmsCode] = useState('');
  const [countdown, setCountdown] = useState(0);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleSendCode = useCallback(() => {
    if (!/^1\d{10}$/.test(phone)) { showMessage('请输入正确的手机号', 'error'); return; }
    setCountdown(60);
    countdownRef.current = setInterval(() => {
      setCountdown((v) => { if (v <= 1) { clearInterval(countdownRef.current!); return 0; } return v - 1; });
    }, 1000);
  }, [phone, showMessage]);

  useEffect(() => () => { if (countdownRef.current) clearInterval(countdownRef.current); }, []);

  const handlePhoneSubmit = useCallback(() => {
    if (!/^1\d{10}$/.test(phone)) { showMessage('请输入正确的手机号', 'error'); return; }
    if (smsCode.length < 4) { showMessage('请输入验证码', 'error'); return; }
    showMessage('手机号绑定成功', 'success');
    setShowPhoneModal(false);
    setPhone(''); setSmsCode('');
  }, [phone, smsCode, showMessage]);

  const rowBtn = `w-full flex items-center justify-between gap-3 p-3 rounded-xl text-left transition-colors ${isDark ? 'hover:bg-white/[0.04]' : 'hover:bg-slate-50'}`;

  return (
    <div className={`flex-1 overflow-y-auto ${pageBg(theme)}`}>
      <div className="max-w-4xl mx-auto w-full px-2 sm:px-3 lg:px-4 py-2 sm:py-4 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl ${isDark ? 'bg-white/10' : 'bg-slate-100'}`}>
            <Settings size={22} className={textSecondary(theme)} />
          </div>
          <div>
            <h1 className={`text-xl font-bold tracking-tight ${textPrimary(theme)}`}>个人设置</h1>
            <p className={`text-xs ${textMuted(theme)}`}>账号安全、通知偏好与隐私选项</p>
          </div>
        </div>

        {/* Security */}
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
            <button type="button" className={rowBtn} onClick={() => showMessage('请在「个人主页」查看最近登录记录', 'info')}>
              <span className="flex items-center gap-3 min-w-0"><Monitor size={16} className="text-slate-400 shrink-0" /><span className={`text-sm font-medium ${textSecondary(theme)}`}>登录设备与会话</span></span>
              <ChevronRight size={16} className="text-slate-400 shrink-0" />
            </button>
          </div>
        </BentoCard>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Notifications */}
          <BentoCard theme={theme}>
            <h2 className={`text-base font-bold mb-4 flex items-center gap-2 ${textPrimary(theme)}`}>
              <Bell size={18} className={tc.text} /> 通知
            </h2>
            <div className="space-y-4">
              {[
                { icon: Mail, label: '邮件通知', desc: '配额、账单与安全类邮件', on: emailNotif, toggle: () => setEmailNotif((v) => !v) },
                { icon: Bell, label: '浏览器通知', desc: '需授权后生效', on: browserNotif, toggle: () => setBrowserNotif((v) => !v) },
                { icon: Bell, label: '运维告警推送', desc: '与监控中心告警策略联动', on: alertNotif, toggle: () => setAlertNotif((v) => !v) },
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
                <select className={nativeSelectClass(theme)} defaultValue="cn-east">
                  <option value="cn-east">中国东部</option><option value="cn-north">中国北部</option><option value="global">全球路由</option>
                </select>
              </div>
            </div>
          </BentoCard>
        </div>

        {/* Cache */}
        <BentoCard theme={theme}>
          <h2 className={`text-base font-bold mb-3 flex items-center gap-2 ${textPrimary(theme)}`}>
            <Database size={18} className={tc.text} /> 本地与缓存
          </h2>
          <p className={`text-xs mb-4 ${textMuted(theme)}`}>清除本机缓存的静态资源与未同步草稿，不会影响服务端数据。</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => { const tb = localStorage.getItem(env.VITE_TOKEN_KEY); const rb = localStorage.getItem(env.VITE_REFRESH_TOKEN_KEY); localStorage.clear(); if (tb) localStorage.setItem(env.VITE_TOKEN_KEY, tb); if (rb) localStorage.setItem(env.VITE_REFRESH_TOKEN_KEY, rb); showMessage('已清除本地缓存', 'success'); }} className={btnSecondary(theme)}>
              <Trash2 size={15} /> 清除缓存
            </button>
            <button type="button" onClick={() => { const prefs = { theme, themeColor, emailNotif, browserNotif, alertNotif, usageAnalytics, sessionPersist, exportTime: new Date().toISOString() }; const json = JSON.stringify(prefs, null, 2); const blob = new Blob([json], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `preferences-${new Date().toISOString().slice(0, 10)}.json`; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url); showMessage('偏好设置已导出', 'success'); }} className={btnSecondary(theme)}>
              <Download size={15} /> 导出偏好设置
            </button>
          </div>
        </BentoCard>

        {/* Appearance */}
        <BentoCard theme={theme}>
          <h2 className={`text-base font-bold mb-3 flex items-center gap-2 ${textPrimary(theme)}`}>
            <Palette size={18} className={tc.text} /> 外观
          </h2>
          <p className={`text-xs mb-4 ${textMuted(theme)}`}>主题、主题色、字号与字体等在侧栏用户菜单的「外观与主题」中配置。</p>
          <button type="button" onClick={() => { onOpenAppearance(); showMessage('已展开侧栏外观菜单', 'info'); }} className={btnPrimary}>
            <Palette size={15} /> 打开外观与主题
          </button>
        </BentoCard>
      </div>

      {/* Password Modal */}
      <Modal open={showPwdModal} onClose={() => setShowPwdModal(false)} title="修改密码" theme={theme} size="sm" footer={<><button type="button" className={btnSecondary(theme)} onClick={() => setShowPwdModal(false)}>取消</button><button type="button" className={btnPrimary} onClick={handlePwdSubmit}>确认修改</button></>}>
        <div className="space-y-3">
          <div><label className={`text-xs font-semibold block mb-1 ${textSecondary(theme)}`}>当前密码</label><input type="password" value={pwdCurrent} onChange={(e) => setPwdCurrent(e.target.value)} className={nativeInputClass(theme)} /></div>
          <div><label className={`text-xs font-semibold block mb-1 ${textSecondary(theme)}`}>新密码</label><input type="password" value={pwdNew} onChange={(e) => setPwdNew(e.target.value)} placeholder="至少 6 个字符" className={nativeInputClass(theme)} /></div>
          <div><label className={`text-xs font-semibold block mb-1 ${textSecondary(theme)}`}>确认新密码</label><input type="password" value={pwdConfirm} onChange={(e) => setPwdConfirm(e.target.value)} className={nativeInputClass(theme)} /></div>
          {pwdError && <p className="text-xs text-rose-500 font-medium">{pwdError}</p>}
        </div>
      </Modal>

      {/* Phone Modal */}
      <Modal open={showPhoneModal} onClose={() => setShowPhoneModal(false)} title="绑定手机号" theme={theme} size="sm" footer={<><button type="button" className={btnSecondary(theme)} onClick={() => setShowPhoneModal(false)}>取消</button><button type="button" className={btnPrimary} onClick={handlePhoneSubmit}>确认绑定</button></>}>
        <div className="space-y-3">
          <div><label className={`text-xs font-semibold block mb-1 ${textSecondary(theme)}`}>手机号</label><input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="输入 11 位手机号" className={nativeInputClass(theme)} /></div>
          <div>
            <label className={`text-xs font-semibold block mb-1 ${textSecondary(theme)}`}>验证码</label>
            <div className="flex gap-2">
              <input type="text" value={smsCode} onChange={(e) => setSmsCode(e.target.value)} placeholder="输入验证码" className={`${nativeInputClass(theme)} flex-1`} />
              <button type="button" disabled={countdown > 0} onClick={handleSendCode} className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${countdown > 0 ? (isDark ? 'bg-white/5 text-slate-600 cursor-not-allowed' : 'bg-slate-200 text-slate-400 cursor-not-allowed') : `text-white ${tc.bg}`}`}>
                {countdown > 0 ? `${countdown}s` : '获取验证码'}
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};
