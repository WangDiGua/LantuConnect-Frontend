import React, { useState, useEffect, useCallback } from 'react';
import type { Theme, FontSize } from '../../types';
import { pageBg, cardClass } from '../../utils/uiClasses';
import { Activity, CheckCircle, AlertTriangle, WifiOff, RefreshCw, Loader2 } from 'lucide-react';
import { healthService } from '../../api/services/health.service';
import type { HealthConfigItem } from '../../types/dto/health';

interface Props {
  theme: Theme;
  fontSize: FontSize;
}

type HealthStatus = 'healthy' | 'warning' | 'offline';

const STATUS_CFG: Record<HealthStatus, { label: string; dot: string; lightBg: string; darkBg: string }> = {
  healthy: { label: '正常', dot: 'bg-emerald-400', lightBg: 'bg-emerald-50 text-emerald-700', darkBg: 'bg-emerald-500/15 text-emerald-400' },
  warning: { label: '告警', dot: 'bg-amber-400', lightBg: 'bg-amber-50 text-amber-700', darkBg: 'bg-amber-500/15 text-amber-400' },
  offline: { label: '离线', dot: 'bg-red-400', lightBg: 'bg-red-50 text-red-700', darkBg: 'bg-red-500/15 text-red-400' },
};

function mapHealthStatus(s: HealthConfigItem['healthStatus']): HealthStatus {
  switch (s) {
    case 'healthy': return 'healthy';
    case 'degraded': return 'warning';
    case 'down': return 'offline';
    default: return 'offline';
  }
}

interface DisplayItem {
  id: number;
  name: string;
  type: string;
  status: HealthStatus;
  lastCheck: string;
  checkType: string;
  intervalSec: number;
}

function toDisplayItem(item: HealthConfigItem): DisplayItem {
  return {
    id: item.id,
    name: item.displayName,
    type: item.agentType,
    status: mapHealthStatus(item.healthStatus),
    lastCheck: item.lastCheckTime,
    checkType: item.checkType.toUpperCase(),
    intervalSec: item.intervalSec,
  };
}

export const HealthCheckOverview: React.FC<Props> = ({ theme }) => {
  const isDark = theme === 'dark';
  const [items, setItems] = useState<DisplayItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const configs = await healthService.listHealthConfigs();
      setItems(configs.map(toDisplayItem));
    } catch (err) {
      console.error('Failed to load health configs:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

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
        <button
          onClick={fetchData}
          disabled={loading}
          className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${isDark ? 'bg-white/5 text-slate-300 hover:bg-white/10' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'}`}
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          刷新
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-4 sm:px-6 py-4 space-y-5">
        {loading && items.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="animate-spin text-slate-400" />
          </div>
        ) : (
          <>
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
                      <th className={`px-4 py-3 font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>检查方式</th>
                      <th className={`px-4 py-3 font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>间隔(s)</th>
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
                          <td className={`px-4 py-3 font-mono text-xs ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{item.checkType}</td>
                          <td className={`px-4 py-3 font-mono text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{item.intervalSec}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
