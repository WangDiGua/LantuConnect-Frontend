import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  User,
  Mail,
  Shield,
  Key,
  Bell,
  Globe,
  Moon,
  Sun,
  ChevronRight,
  History,
  Camera,
  Check,
  Eye,
  EyeOff,
  Building2,
  Clock,
} from 'lucide-react';
import { Theme, FontSize } from '../../types';
import { useLayoutChrome } from '../../context/LayoutChromeContext';
import { useAuthStore } from '../../stores/authStore';
import { useMessage } from '../../components/common/Message';

interface UserProfileProps {
  theme: Theme;
  fontSize: FontSize;
}

export const UserProfile: React.FC<UserProfileProps> = ({ theme, fontSize: _fontSize }) => {
  const { hasSecondarySidebar } = useLayoutChrome();
  const outerPad = hasSecondarySidebar ? 'px-2 sm:px-3 lg:px-4' : 'px-1.5 sm:px-2 lg:px-3';
  const maxW = hasSecondarySidebar ? 'max-w-4xl mx-auto' : 'w-full max-w-none';
  const isDark = theme === 'dark';

  const user = useAuthStore((s) => s.user);
  const displayName = user?.nickname || user?.username || 'User Name';
  const displayEmail = user?.email || 'user@lantuconnect.com';
  const displayRole = user?.role === 'admin' ? '超级管理员' : '普通用户';
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
    await new Promise((r) => setTimeout(r, 1200));
    setPwdSaving(false);
    setPwdSuccess(true);
    setTimeout(() => {
      setPwdSuccess(false);
      setShowPwdForm(false);
      setPwdOld('');
      setPwdNew('');
      setPwdConfirm('');
    }, 1500);
  };

  const card = `rounded-2xl border transition-colors shadow-none ${
    isDark ? 'bg-[#1C1C1E]/80 border-white/10' : 'bg-white border-slate-200/80'
  }`;

  const inputClass = `w-full px-3 py-2.5 rounded-xl border text-sm outline-none transition-colors ${
    isDark
      ? 'bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:border-blue-500/50'
      : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-blue-500'
  }`;

  return (
    <div
      className={`flex-1 overflow-y-auto transition-colors duration-300 ${
        isDark ? 'bg-[#000000]' : 'bg-[#F2F2F7]'
      }`}
    >
      <div className={`${maxW} mx-auto w-full ${outerPad} py-2 sm:py-4`}>
        {/* Profile Header */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 mb-10 text-center sm:text-left">
          <div className="relative group">
            <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white text-3xl font-bold shadow-none border border-white/20 flex-shrink-0">
              {user?.avatar ? (
                <img src={user.avatar} alt={displayName} className="w-full h-full rounded-full object-cover" />
              ) : (
                avatarInitial
              )}
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={`absolute inset-0 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity ${
                isDark ? 'bg-black/50' : 'bg-black/30'
              }`}
              title="更换头像"
            >
              <Camera size={20} className="text-white" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.length) {
                  showMessage('头像已更新', 'success');
                  e.target.value = '';
                }
              }}
            />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className={`text-2xl sm:text-3xl font-bold tracking-tight mb-1 ${isDark ? 'text-white' : 'text-black'}`}>
              {displayName}
            </h1>
            <p className="text-slate-500 truncate">{displayEmail}</p>
            <div className="mt-3 flex justify-center sm:justify-start flex-wrap gap-2">
              <span
                className={`px-3 py-1 text-[11px] font-semibold rounded-full ${
                  user?.role === 'admin' || !user
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                    : 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
                }`}
              >
                {displayRole}
              </span>
              <span
                className={`px-3 py-1 text-[11px] font-semibold rounded-full ${
                  user?.status === 'active' || !user
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                    : 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                }`}
              >
                {user?.status === 'active' || !user ? '已认证' : '未激活'}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Account Info */}
          <div className={`p-6 ${card}`}>
            <h2 className={`text-lg font-bold mb-6 flex items-center gap-2 ${isDark ? 'text-white' : 'text-black'}`}>
              <User size={20} className="text-blue-500" />
              账号信息
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group">
                <div className="flex items-center gap-3 min-w-0">
                  <Mail size={18} className="text-slate-400 group-hover:text-blue-500 transition-colors shrink-0" />
                  <span className={`text-[14px] ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>邮箱地址</span>
                </div>
                <span className="text-[13px] text-slate-500 truncate ml-2">{displayEmail}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group">
                <div className="flex items-center gap-3 min-w-0">
                  <Building2 size={18} className="text-slate-400 group-hover:text-blue-500 transition-colors shrink-0" />
                  <span className={`text-[14px] ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>所属部门</span>
                </div>
                <span className="text-[13px] text-slate-500 truncate ml-2">{displayDept}</span>
              </div>
              <button
                type="button"
                onClick={() => setShowPwdForm(!showPwdForm)}
                className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <Key size={18} className="text-slate-400 group-hover:text-blue-500 transition-colors" />
                  <span className={`text-[14px] ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>修改密码</span>
                </div>
                <ChevronRight
                  size={16}
                  className={`text-slate-300 transition-transform ${showPwdForm ? 'rotate-90' : ''}`}
                />
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
                    <input
                      type={showOldPwd ? 'text' : 'password'}
                      placeholder="当前密码"
                      value={pwdOld}
                      onChange={(e) => setPwdOld(e.target.value)}
                      className={inputClass}
                    />
                    <button
                      type="button"
                      onClick={() => setShowOldPwd(!showOldPwd)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showOldPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showNewPwd ? 'text' : 'password'}
                      placeholder="新密码（8 位以上）"
                      value={pwdNew}
                      onChange={(e) => setPwdNew(e.target.value)}
                      className={inputClass}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPwd(!showNewPwd)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showNewPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <input
                    type="password"
                    placeholder="确认新密码"
                    value={pwdConfirm}
                    onChange={(e) => setPwdConfirm(e.target.value)}
                    className={inputClass}
                  />
                  {pwdNew && pwdConfirm && pwdNew !== pwdConfirm && (
                    <p className="text-[12px] text-red-500">两次输入的密码不一致</p>
                  )}
                  <button
                    type="submit"
                    disabled={!pwdOld || !pwdNew || pwdNew !== pwdConfirm || pwdNew.length < 8 || pwdSaving}
                    className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      pwdSuccess
                        ? 'bg-green-600 text-white'
                        : 'bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed'
                    }`}
                  >
                    {pwdSaving ? (
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : pwdSuccess ? (
                      <>
                        <Check size={16} />
                        已更新
                      </>
                    ) : (
                      '更新密码'
                    )}
                  </button>
                </motion.form>
              )}
              <button
                type="button"
                onClick={() => {
                  setTwoStepEnabled((v) => !v);
                  showMessage(twoStepEnabled ? '两步验证已关闭' : '两步验证已开启', 'success');
                }}
                className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <Shield size={18} className="text-slate-400 group-hover:text-blue-500 transition-colors" />
                  <span className={`text-[14px] ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>两步验证</span>
                </div>
                <div className={`w-10 h-5 rounded-full relative transition-colors ${twoStepEnabled ? 'bg-blue-600' : isDark ? 'bg-white/10' : 'bg-slate-200'}`}>
                  <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${twoStepEnabled ? 'right-1' : 'left-1'}`} />
                </div>
              </button>
            </div>
          </div>

          {/* Preferences */}
          <div className={`p-6 ${card}`}>
            <h2 className={`text-lg font-bold mb-6 flex items-center gap-2 ${isDark ? 'text-white' : 'text-black'}`}>
              <Globe size={20} className="text-emerald-500" />
              偏好设置
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group">
                <div className="flex items-center gap-3">
                  <Globe size={18} className="text-slate-400 group-hover:text-emerald-500 transition-colors" />
                  <span className={`text-[14px] ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>语言</span>
                </div>
                <select
                  value={language}
                  onChange={(e) => {
                    setLanguage(e.target.value);
                    showMessage(e.target.value === 'zh-CN' ? '已切换至简体中文' : 'Switched to English', 'success');
                  }}
                  className={`text-[13px] px-2 py-1 rounded-lg border outline-none cursor-pointer ${
                    isDark ? 'bg-white/5 border-white/10 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-600'
                  }`}
                >
                  <option value="zh-CN">简体中文</option>
                  <option value="en">English</option>
                </select>
              </div>
              <button
                type="button"
                onClick={() => {
                  setNotificationEnabled((v) => !v);
                  showMessage(notificationEnabled ? '通知提醒已关闭' : '通知提醒已开启', 'success');
                }}
                className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <Bell size={18} className="text-slate-400 group-hover:text-emerald-500 transition-colors" />
                  <span className={`text-[14px] ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>通知提醒</span>
                </div>
                <div className={`w-10 h-5 rounded-full relative transition-colors ${notificationEnabled ? 'bg-blue-600' : isDark ? 'bg-white/10' : 'bg-slate-200'}`}>
                  <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${notificationEnabled ? 'right-1' : 'left-1'}`} />
                </div>
              </button>
              <div className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer group">
                <div className="flex items-center gap-3">
                  {theme === 'light' ? (
                    <Sun size={18} className="text-slate-400 group-hover:text-emerald-500 transition-colors" />
                  ) : (
                    <Moon size={18} className="text-slate-400 group-hover:text-emerald-500 transition-colors" />
                  )}
                  <span className={`text-[14px] ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>深色模式</span>
                </div>
                <span className="text-[13px] text-slate-500">{theme === 'light' ? '已关闭' : '已开启'}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer group">
                <div className="flex items-center gap-3">
                  <Clock size={18} className="text-slate-400 group-hover:text-emerald-500 transition-colors" />
                  <span className={`text-[14px] ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>注册时间</span>
                </div>
                <span className="text-[13px] text-slate-500">
                  {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('zh-CN') : '2026-01-01'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Login History */}
        <div className={`mt-6 p-6 ${card}`}>
          <h2 className={`text-lg font-bold mb-6 flex items-center gap-2 ${isDark ? 'text-white' : 'text-black'}`}>
            <History size={20} className="text-blue-500 shrink-0" />
            最近登录记录
          </h2>
          <div className="space-y-4">
            {[
              { device: 'macOS - Chrome', location: '上海, 中国', time: '10 分钟前', ip: '192.168.1.1' },
              { device: 'iPhone 15 Pro', location: '上海, 中国', time: '2 小时前', ip: '192.168.1.5' },
              { device: 'Windows - Edge', location: '北京, 中国', time: '昨天 14:20', ip: '110.242.68.3' },
            ].map((log, i) => (
              <div
                key={i}
                className={`flex items-center justify-between py-3 border-b last:border-0 ${
                  isDark ? 'border-white/5' : 'border-slate-100'
                }`}
              >
                <div className="min-w-0">
                  <div className={`text-[14px] font-semibold truncate ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                    {log.device}
                  </div>
                  <div className="text-[12px] text-slate-400 truncate">
                    {log.location} &middot; {log.ip}
                  </div>
                </div>
                <div className="text-[12px] text-slate-500 whitespace-nowrap ml-4">{log.time}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
