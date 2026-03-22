import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  User, Mail, Shield, Key, Bell, Globe, Moon, Sun,
  ChevronRight, History, Camera, Check, Eye, EyeOff, Building2, Clock,
} from 'lucide-react';
import type { Theme, FontSize } from '../../types';
import { useAuthStore } from '../../stores/authStore';
import { useMessage } from '../../components/common/Message';
import { authService } from '../../api/services/auth.service';
import { BentoCard } from '../../components/common/BentoCard';
import { GlassPanel } from '../../components/common/GlassPanel';
import { nativeInputClass } from '../../utils/formFieldClasses';
import {
  pageBg, btnPrimary, textPrimary, textSecondary, textMuted,
} from '../../utils/uiClasses';

interface UserProfileProps {
  theme: Theme;
  fontSize: FontSize;
}

export const UserProfile: React.FC<UserProfileProps> = ({ theme }) => {
  const isDark = theme === 'dark';
  const user = useAuthStore((s) => s.user);
  const displayName = user?.nickname || user?.username || 'User Name';
  const displayEmail = user?.email || 'user@lantuconnect.com';
  const roleLabels: Record<string, string> = {
    platform_admin: '平台管理员',
    dept_admin: '部门管理员',
    developer: '开发者',
    user: '普通用户',
  };
  const displayRole = roleLabels[user?.role ?? 'user'] ?? '普通用户';
  const displayDept = user?.department || '未设置';
  const avatarInitial = displayName.charAt(0).toUpperCase();

  const [showPwdForm, setShowPwdForm] = useState(false);
  const [pwdOld, setPwdOld] = useState('');
  const [pwdNew, setPwdNew] = useState('');
  const [pwdConfirm, setPwdConfirm] = useState('');
  const [showOldPwd, setShowOldPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdSuccess, setPwdSuccess] = useState(false);
  const [twoStepEnabled, setTwoStepEnabled] = useState(false);
  const [notificationEnabled, setNotificationEnabled] = useState(true);
  const [language, setLanguage] = useState('zh-CN');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showMessage } = useMessage();

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pwdOld || !pwdNew || pwdNew !== pwdConfirm) return;
    setPwdSaving(true);
    try {
      await authService.changePassword(pwdOld, pwdNew);
      setPwdSuccess(true);
      setTimeout(() => {
        setPwdSuccess(false);
        setShowPwdForm(false);
        setPwdOld(''); setPwdNew(''); setPwdConfirm('');
      }, 1500);
    } catch (err) {
      showMessage(err instanceof Error ? err.message : '密码修改失败', 'error');
    } finally {
      setPwdSaving(false);
    }
  };

  const rowCls = `flex items-center justify-between p-3 rounded-xl transition-colors ${isDark ? 'hover:bg-white/[0.04]' : 'hover:bg-slate-50'} group`;

  return (
    <div className={`flex-1 overflow-y-auto transition-colors duration-300 ${pageBg(theme)}`}>
      <div className="max-w-4xl mx-auto w-full px-2 sm:px-3 lg:px-4 py-2 sm:py-4">
        {/* Profile Header */}
        <GlassPanel theme={theme} padding="lg" className="mb-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
            <div className="relative group">
              <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white text-3xl font-bold border border-white/20 shrink-0">
                {user?.avatar ? (
                  <img src={user.avatar} alt={displayName} className="w-full h-full rounded-full object-cover" />
                ) : avatarInitial}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40"
                title="更换头像"
              >
                <Camera size={20} className="text-white" />
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={async (e) => {
                if (e.target.files?.length) {
                  const fakeUrl = URL.createObjectURL(e.target.files[0]);
                  try {
                    await authService.updateProfile({ avatar: fakeUrl });
                    showMessage('头像已更新', 'success');
                  } catch (err) {
                    showMessage(err instanceof Error ? err.message : '头像更新失败', 'error');
                  }
                  e.target.value = '';
                }
              }} />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className={`text-2xl sm:text-3xl font-bold tracking-tight mb-1 ${textPrimary(theme)}`}>{displayName}</h1>
              <p className={textMuted(theme)}>{displayEmail}</p>
              <div className="mt-3 flex justify-center sm:justify-start flex-wrap gap-2">
                <span className={`px-3 py-1 text-[11px] font-semibold rounded-full ${isDark ? 'bg-indigo-500/15 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>
                  {displayRole}
                </span>
                <span className={`px-3 py-1 text-[11px] font-semibold rounded-full ${isDark ? 'bg-emerald-500/15 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}>
                  {user?.status === 'active' || !user ? '已认证' : '未激活'}
                </span>
              </div>
            </div>
          </div>
        </GlassPanel>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Account Info */}
          <BentoCard theme={theme}>
            <h2 className={`text-base font-bold mb-4 flex items-center gap-2 ${textPrimary(theme)}`}>
              <User size={18} className="text-indigo-500" /> 账号信息
            </h2>
            <div className="space-y-1">
              <div className={rowCls}>
                <div className="flex items-center gap-3 min-w-0">
                  <Mail size={16} className={`text-slate-400 group-hover:text-indigo-500 transition-colors shrink-0`} />
                  <span className={`text-sm ${textSecondary(theme)}`}>邮箱地址</span>
                </div>
                <span className={`text-xs truncate ml-2 ${textMuted(theme)}`}>{displayEmail}</span>
              </div>
              <div className={rowCls}>
                <div className="flex items-center gap-3 min-w-0">
                  <Building2 size={16} className="text-slate-400 group-hover:text-indigo-500 transition-colors shrink-0" />
                  <span className={`text-sm ${textSecondary(theme)}`}>所属部门</span>
                </div>
                <span className={`text-xs truncate ml-2 ${textMuted(theme)}`}>{displayDept}</span>
              </div>
              <button type="button" onClick={() => setShowPwdForm(!showPwdForm)} className={`w-full ${rowCls}`}>
                <div className="flex items-center gap-3">
                  <Key size={16} className="text-slate-400 group-hover:text-indigo-500 transition-colors" />
                  <span className={`text-sm ${textSecondary(theme)}`}>修改密码</span>
                </div>
                <ChevronRight size={16} className={`text-slate-300 transition-transform ${showPwdForm ? 'rotate-90' : ''}`} />
              </button>
              {showPwdForm && (
                <motion.form
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  transition={{ duration: 0.2 }}
                  onSubmit={handlePasswordSubmit}
                  className="space-y-3 px-3 pt-2 overflow-hidden"
                >
                  <div className="relative">
                    <input type={showOldPwd ? 'text' : 'password'} placeholder="当前密码" value={pwdOld} onChange={(e) => setPwdOld(e.target.value)} className={nativeInputClass(theme)} />
                    <button type="button" onClick={() => setShowOldPwd(!showOldPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      {showOldPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <div className="relative">
                    <input type={showNewPwd ? 'text' : 'password'} placeholder="新密码（8 位以上）" value={pwdNew} onChange={(e) => setPwdNew(e.target.value)} className={nativeInputClass(theme)} />
                    <button type="button" onClick={() => setShowNewPwd(!showNewPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      {showNewPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <input type="password" placeholder="确认新密码" value={pwdConfirm} onChange={(e) => setPwdConfirm(e.target.value)} className={nativeInputClass(theme)} />
                  {pwdNew && pwdConfirm && pwdNew !== pwdConfirm && <p className="text-[12px] text-rose-500">两次输入的密码不一致</p>}
                  <button
                    type="submit"
                    disabled={!pwdOld || !pwdNew || pwdNew !== pwdConfirm || pwdNew.length < 8 || pwdSaving}
                    className={`w-full ${pwdSuccess ? 'bg-emerald-600' : btnPrimary} !justify-center`}
                  >
                    {pwdSaving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : pwdSuccess ? <><Check size={16} /> 已更新</> : '更新密码'}
                  </button>
                </motion.form>
              )}
              <button
                type="button"
                onClick={async () => {
                  const next = !twoStepEnabled;
                  try {
                    await authService.updateProfile({ twoStep: next });
                    setTwoStepEnabled(next);
                    showMessage(next ? '两步验证已开启' : '两步验证已关闭', 'success');
                  } catch (err) {
                    showMessage(err instanceof Error ? err.message : '操作失败', 'error');
                  }
                }}
                className={`w-full ${rowCls}`}
              >
                <div className="flex items-center gap-3">
                  <Shield size={16} className="text-slate-400 group-hover:text-indigo-500 transition-colors" />
                  <span className={`text-sm ${textSecondary(theme)}`}>两步验证</span>
                </div>
                <div className={`w-10 h-5 rounded-full relative transition-colors ${twoStepEnabled ? 'bg-indigo-600' : isDark ? 'bg-white/10' : 'bg-slate-200'}`}>
                  <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${twoStepEnabled ? 'right-1' : 'left-1'}`} />
                </div>
              </button>
            </div>
          </BentoCard>

          {/* Preferences */}
          <BentoCard theme={theme}>
            <h2 className={`text-base font-bold mb-4 flex items-center gap-2 ${textPrimary(theme)}`}>
              <Globe size={18} className="text-emerald-500" /> 偏好设置
            </h2>
            <div className="space-y-1">
              <div className={rowCls}>
                <div className="flex items-center gap-3">
                  <Globe size={16} className="text-slate-400 group-hover:text-emerald-500 transition-colors" />
                  <span className={`text-sm ${textSecondary(theme)}`}>语言</span>
                </div>
                <select
                  value={language}
                  onChange={async (e) => {
                    const val = e.target.value;
                    try {
                      await authService.updateProfile({ language: val });
                      setLanguage(val);
                      showMessage(val === 'zh-CN' ? '已切换至简体中文' : 'Switched to English', 'success');
                    } catch (err) {
                      showMessage(err instanceof Error ? err.message : '切换失败', 'error');
                    }
                  }}
                  className={`text-xs px-2 py-1 rounded-lg border outline-none cursor-pointer ${isDark ? 'bg-white/5 border-white/10 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-600'}`}
                >
                  <option value="zh-CN">简体中文</option>
                  <option value="en">English</option>
                </select>
              </div>
              <button
                type="button"
                onClick={() => { setNotificationEnabled((v) => !v); showMessage(notificationEnabled ? '通知提醒已关闭' : '通知提醒已开启', 'success'); }}
                className={`w-full ${rowCls}`}
              >
                <div className="flex items-center gap-3">
                  <Bell size={16} className="text-slate-400 group-hover:text-emerald-500 transition-colors" />
                  <span className={`text-sm ${textSecondary(theme)}`}>通知提醒</span>
                </div>
                <div className={`w-10 h-5 rounded-full relative transition-colors ${notificationEnabled ? 'bg-indigo-600' : isDark ? 'bg-white/10' : 'bg-slate-200'}`}>
                  <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${notificationEnabled ? 'right-1' : 'left-1'}`} />
                </div>
              </button>
              <div className={rowCls}>
                <div className="flex items-center gap-3">
                  {theme === 'light' ? <Sun size={16} className="text-slate-400 group-hover:text-emerald-500 transition-colors" /> : <Moon size={16} className="text-slate-400 group-hover:text-emerald-500 transition-colors" />}
                  <span className={`text-sm ${textSecondary(theme)}`}>深色模式</span>
                </div>
                <span className={`text-xs ${textMuted(theme)}`}>{theme === 'light' ? '已关闭' : '已开启'}</span>
              </div>
              <div className={rowCls}>
                <div className="flex items-center gap-3">
                  <Clock size={16} className="text-slate-400 group-hover:text-emerald-500 transition-colors" />
                  <span className={`text-sm ${textSecondary(theme)}`}>注册时间</span>
                </div>
                <span className={`text-xs ${textMuted(theme)}`}>{user?.createdAt ? new Date(user.createdAt).toLocaleDateString('zh-CN') : '2026-01-01'}</span>
              </div>
            </div>
          </BentoCard>
        </div>

        {/* Login History */}
        <BentoCard theme={theme} className="mt-4">
          <h2 className={`text-base font-bold mb-4 flex items-center gap-2 ${textPrimary(theme)}`}>
            <History size={18} className="text-indigo-500 shrink-0" /> 最近登录记录
          </h2>
          <div className="space-y-1">
            {[
              { device: 'macOS - Chrome', location: '上海, 中国', time: '10 分钟前', ip: '192.168.1.1' },
              { device: 'iPhone 15 Pro', location: '上海, 中国', time: '2 小时前', ip: '192.168.1.5' },
              { device: 'Windows - Edge', location: '北京, 中国', time: '昨天 14:20', ip: '110.242.68.3' },
            ].map((log, i) => (
              <div key={i} className={`flex items-center justify-between py-3 border-b last:border-0 ${isDark ? 'border-white/[0.04]' : 'border-slate-100'}`}>
                <div className="min-w-0">
                  <div className={`text-sm font-semibold truncate ${textPrimary(theme)}`}>{log.device}</div>
                  <div className={`text-xs ${textMuted(theme)}`}>{log.location} · {log.ip}</div>
                </div>
                <div className={`text-xs whitespace-nowrap ml-4 ${textMuted(theme)}`}>{log.time}</div>
              </div>
            ))}
          </div>
        </BentoCard>
      </div>
    </div>
  );
};
