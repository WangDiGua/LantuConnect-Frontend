import React, { useState } from 'react';
import {
  Settings,
  Lock,
  Smartphone,
  Monitor,
  Bell,
  Mail,
  Eye,
  Database,
  Palette,
  ChevronRight,
  Trash2,
  Download,
} from 'lucide-react';
import { Theme, FontSize, ThemeColor } from '../../types';
import { THEME_COLOR_CLASSES } from '../../constants/theme';
import { useLayoutChrome } from '../../context/LayoutChromeContext';
import { nativeSelectClass } from '../../utils/formFieldClasses';

export interface UserSettingsPageProps {
  theme: Theme;
  fontSize: FontSize;
  themeColor: ThemeColor;
  showMessage: (msg: string, type?: 'success' | 'error' | 'info') => void;
  /** 打开侧栏用户菜单中的外观面板 */
  onOpenAppearance: () => void;
}

type ToggleProps = {
  on: boolean;
  onToggle: () => void;
  theme: Theme;
};

function Toggle({ on, onToggle, theme }: ToggleProps) {
  const isDark = theme === 'dark';
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onToggle}
      className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${
        on ? 'bg-blue-600' : isDark ? 'bg-white/15' : 'bg-slate-200'
      }`}
    >
      <span
        className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
          on ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

export const UserSettingsPage: React.FC<UserSettingsPageProps> = ({
  theme,
  fontSize: _fontSize,
  themeColor,
  showMessage,
  onOpenAppearance,
}) => {
  const isDark = theme === 'dark';
  const tc = THEME_COLOR_CLASSES[themeColor];
  const { hasSecondarySidebar } = useLayoutChrome();
  const outerPad = hasSecondarySidebar ? 'px-2 sm:px-3 lg:px-4' : 'px-1.5 sm:px-2 lg:px-3';
  const maxW = hasSecondarySidebar ? 'max-w-4xl mx-auto' : 'w-full max-w-none';

  const [emailNotif, setEmailNotif] = useState(true);
  const [browserNotif, setBrowserNotif] = useState(false);
  const [alertNotif, setAlertNotif] = useState(true);
  const [usageAnalytics, setUsageAnalytics] = useState(false);
  const [sessionPersist, setSessionPersist] = useState(true);

  const card = `rounded-2xl border p-5 sm:p-6 shadow-none ${
    isDark ? 'bg-[#1C1C1E] border-white/10' : 'bg-white border-slate-200/80'
  }`;

  const rowBtn = `w-full flex items-center justify-between gap-3 p-3 rounded-xl text-left transition-colors ${
    isDark ? 'hover:bg-white/[0.06]' : 'hover:bg-slate-50'
  }`;

  return (
    <div className={`flex-1 overflow-y-auto custom-scrollbar ${isDark ? 'bg-[#000000]' : 'bg-[#F2F2F7]'}`}>
      <div className={`${maxW} w-full ${outerPad} py-2 sm:py-4 space-y-6`}>
        <header className="flex flex-col sm:flex-row sm:items-center gap-4">
          <span
            className={`inline-flex items-center justify-center w-12 h-12 rounded-xl shrink-0 ${
              isDark ? 'bg-white/10 text-slate-200' : 'bg-slate-100 text-slate-700'
            }`}
          >
            <Settings size={24} strokeWidth={2} />
          </span>
          <div>
            <h1 className={`text-xl sm:text-2xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              个人设置
            </h1>
            <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              账号安全、通知偏好与隐私选项；外观主题请在侧栏「外观与主题」中调整。
            </p>
          </div>
        </header>

        <section className={card}>
          <h2 className={`text-base font-bold mb-4 flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            <Lock size={18} className={tc.text} />
            账号与安全
          </h2>
          <div className="space-y-1">
            <button type="button" className={rowBtn} onClick={() => showMessage('演示环境：修改密码流程未对接', 'info')}>
              <span className="flex items-center gap-3 min-w-0">
                <Lock size={18} className="text-slate-400 shrink-0" />
                <span className={`text-[14px] font-medium ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>登录密码</span>
              </span>
              <ChevronRight size={18} className="text-slate-400 shrink-0" />
            </button>
            <button type="button" className={rowBtn} onClick={() => showMessage('演示环境：手机绑定未对接', 'info')}>
              <span className="flex items-center gap-3 min-w-0">
                <Smartphone size={18} className="text-slate-400 shrink-0" />
                <span className={`text-[14px] font-medium ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>手机号</span>
              </span>
              <span className="text-[13px] text-slate-500">未绑定</span>
            </button>
            <button type="button" className={rowBtn} onClick={() => showMessage('请在「个人主页」查看最近登录记录', 'info')}>
              <span className="flex items-center gap-3 min-w-0">
                <Monitor size={18} className="text-slate-400 shrink-0" />
                <span className={`text-[14px] font-medium ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>登录设备与会话</span>
              </span>
              <ChevronRight size={18} className="text-slate-400 shrink-0" />
            </button>
          </div>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <section className={card}>
            <h2 className={`text-base font-bold mb-4 flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              <Bell size={18} className={tc.text} />
              通知
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <Mail size={18} className="text-slate-400 shrink-0" />
                  <div>
                    <div className={`text-[14px] font-medium ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>邮件通知</div>
                    <div className="text-[12px] text-slate-500">配额、账单与安全类邮件</div>
                  </div>
                </div>
                <Toggle on={emailNotif} onToggle={() => setEmailNotif((v) => !v)} theme={theme} />
              </div>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <Bell size={18} className="text-slate-400 shrink-0" />
                  <div>
                    <div className={`text-[14px] font-medium ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>浏览器通知</div>
                    <div className="text-[12px] text-slate-500">需授权后生效</div>
                  </div>
                </div>
                <Toggle on={browserNotif} onToggle={() => setBrowserNotif((v) => !v)} theme={theme} />
              </div>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <Bell size={18} className="text-slate-400 shrink-0" />
                  <div>
                    <div className={`text-[14px] font-medium ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>运维告警推送</div>
                    <div className="text-[12px] text-slate-500">与监控中心告警策略联动</div>
                  </div>
                </div>
                <Toggle on={alertNotif} onToggle={() => setAlertNotif((v) => !v)} theme={theme} />
              </div>
            </div>
          </section>

          <section className={card}>
            <h2 className={`text-base font-bold mb-4 flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              <Eye size={18} className={tc.text} />
              隐私与数据
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className={`text-[14px] font-medium ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>使用与诊断数据</div>
                  <div className="text-[12px] text-slate-500">匿名统计以改进产品体验</div>
                </div>
                <Toggle on={usageAnalytics} onToggle={() => setUsageAnalytics((v) => !v)} theme={theme} />
              </div>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className={`text-[14px] font-medium ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>保持登录状态</div>
                  <div className="text-[12px] text-slate-500">关闭后关闭浏览器需重新登录</div>
                </div>
                <Toggle on={sessionPersist} onToggle={() => setSessionPersist((v) => !v)} theme={theme} />
              </div>
              <div>
                <label className={`text-[12px] font-medium block mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  默认数据地域（演示）
                </label>
                <select className={nativeSelectClass(theme)} defaultValue="cn-east">
                  <option value="cn-east">中国东部</option>
                  <option value="cn-north">中国北部</option>
                  <option value="global">全球路由</option>
                </select>
              </div>
            </div>
          </section>
        </div>

        <section className={card}>
          <h2 className={`text-base font-bold mb-4 flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            <Database size={18} className={tc.text} />
            本地与缓存
          </h2>
          <p className={`text-[13px] mb-4 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            清除本机缓存的静态资源与未同步草稿，不会影响服务端数据。
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => showMessage('已清除本地缓存（演示）', 'success')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border border-slate-200 dark:border-white/15 hover:bg-slate-50 dark:hover:bg-white/5"
            >
              <Trash2 size={16} />
              清除缓存
            </button>
            <button
              type="button"
              onClick={() => showMessage('导出设置 JSON（演示）', 'info')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border border-slate-200 dark:border-white/15 hover:bg-slate-50 dark:hover:bg-white/5"
            >
              <Download size={16} />
              导出偏好设置
            </button>
          </div>
        </section>

        <section className={card}>
          <h2 className={`text-base font-bold mb-4 flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            <Palette size={18} className={tc.text} />
            外观
          </h2>
          <p className={`text-[13px] mb-4 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            主题、主题色、字号与字体等在侧栏用户菜单的「外观与主题」中配置，与全站持久化存储同步。
          </p>
          <button
            type="button"
            onClick={() => {
              onOpenAppearance();
              showMessage('已展开侧栏外观菜单，请在左下角用户区域查看', 'info');
            }}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white ${tc.bg} hover:opacity-90`}
          >
            <Palette size={16} />
            打开外观与主题
          </button>
        </section>
      </div>
    </div>
  );
};
