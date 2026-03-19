import React from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Shield, Key, Bell, Globe, Moon, Sun, ChevronRight, History } from 'lucide-react';
import { Theme, FontSize } from '../../types';
import { useLayoutChrome } from '../../context/LayoutChromeContext';
interface UserProfileProps {
  theme: Theme;
  fontSize: FontSize;
}

export const UserProfile: React.FC<UserProfileProps> = ({ theme, fontSize: _fontSize }) => {
  const { hasSecondarySidebar } = useLayoutChrome();
  const outerPad = hasSecondarySidebar ? 'px-2 sm:px-3 lg:px-4' : 'px-1.5 sm:px-2 lg:px-3';
  const maxW = hasSecondarySidebar ? 'max-w-4xl mx-auto' : 'w-full max-w-none';
  return (
    <div className={`flex-1 overflow-y-auto transition-colors duration-300 ${
      theme === 'light' ? 'bg-[#F2F2F7]' : 'bg-[#000000]'
    }`}>
      <div className={`${maxW} mx-auto w-full ${outerPad} py-2 sm:py-4`}>
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 mb-12 text-center sm:text-left">
          <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white text-3xl font-bold shadow-none border border-white/20 flex-shrink-0">
            W
          </div>
          <div className="flex-1 min-w-0">
            <h1 className={`text-2xl sm:text-3xl font-bold tracking-tight mb-1 ${theme === 'dark' ? 'text-white' : 'text-black'}`}>User Name</h1>
            <p className="text-slate-500 truncate">3214494088wd@gmail.com</p>
            <div className="mt-3 flex justify-center sm:justify-start gap-2">
              <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[11px] font-semibold rounded-full">
                超级管理员
              </span>
              <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 text-[11px] font-semibold rounded-full">
                已认证
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Account Settings */}
          <div className={`p-6 rounded-2xl border transition-colors shadow-none ${
            theme === 'light' ? 'bg-white border-slate-200/80' : 'bg-[#1C1C1E]/80 border-white/10'
          }`}>
            <h2 className={`text-lg font-bold mb-6 flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
              <User size={20} className="text-blue-500" />
              账号设置
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer group">
                <div className="flex items-center gap-3">
                  <Mail size={18} className="text-slate-400 group-hover:text-blue-500 transition-colors" />
                  <span className={`text-[14px] ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>邮箱地址</span>
                </div>
                <span className="text-[13px] text-slate-500 truncate ml-2">3214494088wd@gmail.com</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer group">
                <div className="flex items-center gap-3">
                  <Key size={18} className="text-slate-400 group-hover:text-blue-500 transition-colors" />
                  <span className={`text-[14px] ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>修改密码</span>
                </div>
                <ChevronRight size={16} className="text-slate-300" />
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer group">
                <div className="flex items-center gap-3">
                  <Shield size={18} className="text-slate-400 group-hover:text-blue-500 transition-colors" />
                  <span className={`text-[14px] ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>两步验证</span>
                </div>
                <div className="w-10 h-5 bg-slate-200 dark:bg-white/10 rounded-full relative">
                  <div className="absolute left-1 top-1 w-3 h-3 bg-white rounded-full"></div>
                </div>
              </div>
            </div>
          </div>

          {/* Preferences */}
          <div className={`p-6 rounded-2xl border transition-colors shadow-none ${
            theme === 'light' ? 'bg-white border-slate-200/80' : 'bg-[#1C1C1E]/80 border-white/10'
          }`}>
            <h2 className={`text-lg font-bold mb-6 flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
              <Globe size={20} className="text-emerald-500" />
              偏好设置
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer group">
                <div className="flex items-center gap-3">
                  <Globe size={18} className="text-slate-400 group-hover:text-emerald-500 transition-colors" />
                  <span className={`text-[14px] ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>语言</span>
                </div>
                <span className="text-[13px] text-slate-500">简体中文</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer group">
                <div className="flex items-center gap-3">
                  <Bell size={18} className="text-slate-400 group-hover:text-emerald-500 transition-colors" />
                  <span className={`text-[14px] ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>通知提醒</span>
                </div>
                <div className="w-10 h-5 bg-blue-600 rounded-full relative">
                  <div className="absolute right-1 top-1 w-3 h-3 bg-white rounded-full"></div>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer group">
                <div className="flex items-center gap-3">
                  {theme === 'light' ? <Sun size={18} className="text-slate-400 group-hover:text-emerald-500 transition-colors" /> : <Moon size={18} className="text-slate-400 group-hover:text-emerald-500 transition-colors" />}
                  <span className={`text-[14px] ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>深色模式</span>
                </div>
                <span className="text-[13px] text-slate-500">{theme === 'light' ? '已关闭' : '已开启'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Security Log */}
        <div className={`mt-6 p-6 rounded-2xl border transition-colors shadow-none ${
          theme === 'light' ? 'bg-white border-slate-200/80' : 'bg-[#1C1C1E]/80 border-white/10'
        }`}>
          <h2
            className={`text-lg font-bold mb-6 flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-black'}`}
          >
            <History size={20} className="text-blue-500 shrink-0" />
            最近登录记录
          </h2>
          <div className="space-y-4">
            {[
              { device: 'macOS - Chrome', location: '上海, 中国', time: '10 分钟前', ip: '192.168.1.1' },
              { device: 'iPhone 15 Pro', location: '上海, 中国', time: '2 小时前', ip: '192.168.1.5' },
              { device: 'Windows - Edge', location: '北京, 中国', time: '昨天 14:20', ip: '110.242.68.3' },
            ].map((log, i) => (
              <div key={i} className="flex items-center justify-between py-3 border-b border-slate-100 dark:border-white/5 last:border-0">
                <div className="min-w-0">
                  <div className={`text-[14px] font-semibold truncate ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>{log.device}</div>
                  <div className="text-[12px] text-slate-400 truncate">{log.location} • {log.ip}</div>
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
