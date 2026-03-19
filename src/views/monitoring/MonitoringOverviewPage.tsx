import React from 'react';
import { Theme, FontSize } from '../../types';
import { MgmtPageShell } from '../userMgmt/MgmtPageShell';
import { MOCK_KPIS } from '../../constants/monitoring';
import { Activity, ArrowUpRight, LineChart, Search, Shield } from 'lucide-react';

interface MonitoringOverviewPageProps {
  theme: Theme;
  fontSize: FontSize;
}

export const MonitoringOverviewPage: React.FC<MonitoringOverviewPageProps> = ({ theme, fontSize }) => {
  const isDark = theme === 'dark';
  const bars = [40, 65, 45, 80, 55, 90, 70, 85, 60, 95, 75, 88];

  return (
    <MgmtPageShell
      theme={theme}
      fontSize={fontSize}
      breadcrumbSegments={['监控中心', '监控概览']}
      titleIcon={Activity}
      description="调用量、成功率与延迟趋势汇总（演示数据）；可下钻至调用日志与告警。"
    >
      <div className="min-w-0 px-4 sm:px-6 pb-6 pt-1 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {MOCK_KPIS.map((k) => (
            <div
              key={k.id}
              className={`rounded-2xl border p-4 shadow-none ${
                isDark ? 'bg-[#2C2C2E]/40 border-white/10' : 'bg-slate-50/80 border-slate-200/80'
              }`}
            >
              <p className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{k.label}</p>
              <p className={`text-xl font-bold mt-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>{k.value}</p>
              <p className={`text-xs mt-1 flex items-center gap-0.5 ${k.up ? 'text-emerald-500' : 'text-red-400'}`}>
                <ArrowUpRight size={12} className={k.up ? '' : 'rotate-90'} />
                {k.delta}
              </p>
            </div>
          ))}
        </div>

        <div
          className={`rounded-2xl border p-4 sm:p-5 shadow-none ${
            isDark ? 'bg-[#2C2C2E]/30 border-white/10' : 'bg-white border-slate-200/80'
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className={`text-sm font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              <LineChart size={18} className="text-slate-400" />
              近 12 小时调用量（相对）
            </h3>
          </div>
          <div className="flex items-end gap-1 sm:gap-1.5 h-32 px-1">
            {bars.map((h, i) => (
              <div
                key={i}
                className="flex-1 min-w-0 rounded-t-lg bg-blue-500/80 dark:bg-blue-400/50"
                style={{ height: `${h}%` }}
                title={`时段 ${i + 1}`}
              />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <a
            href="#"
            onClick={(e) => e.preventDefault()}
            className={`flex items-center gap-3 p-4 rounded-2xl border shadow-none transition-colors ${
              isDark
                ? 'bg-[#2C2C2E]/30 border-white/10 hover:bg-white/5'
                : 'bg-white border-slate-200/80 hover:border-slate-300'
            }`}
          >
            <div className={`p-2.5 rounded-xl ${isDark ? 'bg-white/10' : 'bg-slate-100'}`}>
              <Search size={20} className={isDark ? 'text-slate-200' : 'text-slate-600'} />
            </div>
            <div className="min-w-0">
              <p className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>调用日志</p>
              <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                按路径、状态码与延迟检索历史请求
              </p>
            </div>
          </a>
          <a
            href="#"
            onClick={(e) => e.preventDefault()}
            className={`flex items-center gap-3 p-4 rounded-2xl border shadow-none transition-colors ${
              isDark
                ? 'bg-[#2C2C2E]/30 border-white/10 hover:bg-white/5'
                : 'bg-white border-slate-200/80 hover:border-slate-300'
            }`}
          >
            <div className={`p-2.5 rounded-xl ${isDark ? 'bg-white/10' : 'bg-slate-100'}`}>
              <Shield size={20} className={isDark ? 'text-slate-200' : 'text-slate-600'} />
            </div>
            <div className="min-w-0">
              <p className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>告警管理</p>
              <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                查看、确认与关闭运行告警
              </p>
            </div>
          </a>
        </div>

        <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
          <Activity size={12} className="inline mr-1 opacity-70" />
          数据为前端模拟；生产环境请接入 Prometheus / ELK / 云监控等数据源。
        </p>
      </div>
    </MgmtPageShell>
  );
};
