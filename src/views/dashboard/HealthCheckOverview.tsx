import React, { useState } from 'react';
import type { Theme, FontSize } from '../../types';
import { pageBg, cardClass } from '../../utils/uiClasses';
import { Activity, CheckCircle, AlertTriangle, WifiOff, RefreshCw } from 'lucide-react';

interface Props {
  theme: Theme;
  fontSize: FontSize;
}

type HealthStatus = 'healthy' | 'warning' | 'offline';

interface HealthItem {
  id: number;
  name: string;
  type: 'Agent' | 'Skill';
  status: HealthStatus;
  lastCheck: string;
  latencyMs: number;
  successRate: number;
}

const STATUS_CFG: Record<HealthStatus, { label: string; dot: string; lightBg: string; darkBg: string }> = {
  healthy: { label: '正常', dot: 'bg-emerald-400', lightBg: 'bg-emerald-50 text-emerald-700', darkBg: 'bg-emerald-500/15 text-emerald-400' },
  warning: { label: '告警', dot: 'bg-amber-400', lightBg: 'bg-amber-50 text-amber-700', darkBg: 'bg-amber-500/15 text-amber-400' },
  offline: { label: '离线', dot: 'bg-red-400', lightBg: 'bg-red-50 text-red-700', darkBg: 'bg-red-500/15 text-red-400' },
};

const MOCK_ITEMS: HealthItem[] = [
  { id: 1, name: '课表查询助手', type: 'Agent', status: 'healthy', lastCheck: '2026-03-21 14:30:12', latencyMs: 120, successRate: 99.8 },
  { id: 2, name: '图书检索 Agent', type: 'Agent', status: 'healthy', lastCheck: '2026-03-21 14:30:10', latencyMs: 85, successRate: 99.5 },
  { id: 3, name: '教务通知推送', type: 'Agent', status: 'warning', lastCheck: '2026-03-21 14:28:45', latencyMs: 2300, successRate: 87.2 },
  { id: 4, name: '成绩分析 Agent', type: 'Agent', status: 'offline', lastCheck: '2026-03-21 12:15:00', latencyMs: 0, successRate: 0 },
  { id: 5, name: '校园导航 Bot', type: 'Agent', status: 'healthy', lastCheck: '2026-03-21 14:30:08', latencyMs: 156, successRate: 98.9 },
  { id: 6, name: '智能问答助手', type: 'Agent', status: 'healthy', lastCheck: '2026-03-21 14:30:11', latencyMs: 210, successRate: 99.1 },
  { id: 7, name: '天气查询', type: 'Skill', status: 'healthy', lastCheck: '2026-03-21 14:30:05', latencyMs: 45, successRate: 100 },
  { id: 8, name: '文档摘要生成', type: 'Skill', status: 'warning', lastCheck: '2026-03-21 14:29:30', latencyMs: 1800, successRate: 91.3 },
  { id: 9, name: '邮件发送工具', type: 'Skill', status: 'healthy', lastCheck: '2026-03-21 14:30:09', latencyMs: 68, successRate: 99.7 },
  { id: 10, name: '成绩导出工具', type: 'Skill', status: 'offline', lastCheck: '2026-03-21 10:45:00', latencyMs: 0, successRate: 0 },
  { id: 11, name: '日程提醒服务', type: 'Skill', status: 'healthy', lastCheck: '2026-03-21 14:30:07', latencyMs: 92, successRate: 99.4 },
  { id: 12, name: '知识库检索', type: 'Skill', status: 'healthy', lastCheck: '2026-03-21 14:30:06', latencyMs: 178, successRate: 98.6 },
  { id: 13, name: '一卡通查询', type: 'Skill', status: 'warning', lastCheck: '2026-03-21 14:27:22', latencyMs: 3100, successRate: 82.5 },
  { id: 14, name: '通知推送网关', type: 'Agent', status: 'healthy', lastCheck: '2026-03-21 14:30:03', latencyMs: 55, successRate: 99.9 },
  { id: 15, name: '数据同步服务', type: 'Agent', status: 'warning', lastCheck: '2026-03-21 14:25:10', latencyMs: 4200, successRate: 78.1 },
];

export const HealthCheckOverview: React.FC<Props> = ({ theme }) => {
  const isDark = theme === 'dark';
  const [items] = useState<HealthItem[]>(MOCK_ITEMS);

  const healthyCount = items.filter(i => i.status === 'healthy').length;
  const warningCount = items.filter(i => i.status === 'warning').length;
  const offlineCount = items.filter(i => i.status === 'offline').length;

  const summaryCards: { label: string; count: number; icon: React.ElementType; color: string; darkColor: string }[] = [
    { label: '正常', count: healthyCount, icon: CheckCircle, color: 'text-emerald-600 bg-emerald-50', darkColor: 'text-emerald-400 bg-emerald-500/15' },
    { label: '告警', count: warningCount, icon: AlertTriangle, color: 'text-amber-600 bg-amber-50', darkColor: 'text-amber-400 bg-amber-500/15' },
    { label: '离线', count: offlineCount, icon: WifiOff, color: 'text-red-600 bg-red-50', darkColor: 'text-red-400 bg-red-500/15' },
  ];

  return (
    <div className={`flex-1 flex flex-col min-h-0 overflow-hidden ${pageBg(theme)}`}>
      <div className={`shrink-0 z-20 border-b px-4 sm:px-6 py-4 flex items-center justify-between ${isDark ? 'border-white/10' : 'border-slate-200/80'} ${pageBg(theme)}`}>
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl ${isDark ? 'bg-emerald-500/20' : 'bg-emerald-50'}`}>
            <Activity size={20} className={isDark ? 'text-emerald-400' : 'text-emerald-600'} />
          </div>
          <div>
            <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>健康检查</h2>
            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>实时监控所有已注册 Agent / Skill 的运行状态</p>
          </div>
        </div>
        <button className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${isDark ? 'bg-white/5 text-slate-300 hover:bg-white/10' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'}`}>
          <RefreshCw size={14} />
          刷新
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-4 sm:px-6 py-4 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {summaryCards.map(c => (
            <div key={c.label} className={`${cardClass(theme)} p-4 flex items-center gap-4`}>
              <div className={`p-3 rounded-xl ${isDark ? c.darkColor : c.color}`}>
                <c.icon size={22} />
              </div>
              <div>
                <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{c.count} <span className="text-sm font-medium">个</span></p>
                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{c.label}</p>
              </div>
            </div>
          ))}
        </div>

        <div className={`${cardClass(theme)} overflow-hidden`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm min-w-[800px]">
              <thead>
                <tr className={`border-b ${isDark ? 'border-white/10 bg-[#2C2C2E]/80' : 'border-slate-200 bg-slate-50'}`}>
                  <th className={`px-4 py-3 font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>名称</th>
                  <th className={`px-4 py-3 font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>类型</th>
                  <th className={`px-4 py-3 font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>状态</th>
                  <th className={`px-4 py-3 font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>最近检查时间</th>
                  <th className={`px-4 py-3 font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>延迟</th>
                  <th className={`px-4 py-3 font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>成功率</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => {
                  const cfg = STATUS_CFG[item.status];
                  return (
                    <tr key={item.id} className={`border-b transition-colors ${isDark ? `border-white/5 ${i % 2 === 0 ? 'bg-[#1C1C1E]' : 'bg-[#2C2C2E]/40'} hover:bg-white/5` : `border-slate-100 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/80'} hover:bg-slate-100/80`}`}>
                      <td className={`px-4 py-3 font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>{item.name}</td>
                      <td className={`px-4 py-3 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                        <span className={`text-xs px-2 py-0.5 rounded-md ${isDark ? 'bg-white/5 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>{item.type}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium ${isDark ? cfg.darkBg : cfg.lightBg}`}>
                          <span className={`w-2 h-2 rounded-full ${cfg.dot} ${item.status === 'healthy' ? 'animate-pulse' : ''}`} />
                          {cfg.label}
                        </span>
                      </td>
                      <td className={`px-4 py-3 text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{item.lastCheck}</td>
                      <td className={`px-4 py-3 font-mono text-xs ${item.latencyMs > 2000 ? (isDark ? 'text-red-400' : 'text-red-600') : item.latencyMs > 500 ? (isDark ? 'text-amber-400' : 'text-amber-600') : (isDark ? 'text-slate-300' : 'text-slate-600')}`}>
                        {item.status === 'offline' ? '—' : `${item.latencyMs} ms`}
                      </td>
                      <td className={`px-4 py-3 font-mono text-xs ${item.successRate < 90 ? (isDark ? 'text-red-400' : 'text-red-600') : item.successRate < 95 ? (isDark ? 'text-amber-400' : 'text-amber-600') : (isDark ? 'text-slate-300' : 'text-slate-600')}`}>
                        {item.status === 'offline' ? '—' : `${item.successRate}%`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
