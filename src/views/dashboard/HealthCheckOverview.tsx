import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import type { Theme, FontSize } from '../../types';
import {
  canvasBodyBg, consoleContentTopPad, mainScrollCompositorClass,
  textPrimary, textSecondary, textMuted, tableHeadCell, tableBodyRow, tableCell, btnSecondary,
} from '../../utils/uiClasses';
import { Activity, CheckCircle, AlertTriangle, WifiOff, RefreshCw } from 'lucide-react';
import { healthService } from '../../api/services/health.service';
import type { HealthConfigItem } from '../../types/dto/health';
import { BentoCard } from '../../components/common/BentoCard';
import { KpiCard } from '../../components/common/KpiCard';
import { PageError } from '../../components/common/PageError';
import { PageSkeleton } from '../../components/common/PageSkeleton';
import { resourceTypeLabel } from '../../constants/resourceTypes';

interface Props {
  theme: Theme;
  fontSize: FontSize;
}

type HealthStatus = 'healthy' | 'degraded' | 'down';

const STATUS_CFG: Record<HealthStatus, { label: string; dot: string; lightBg: string; darkBg: string }> = {
  healthy: { label: '正常', dot: 'bg-emerald-400', lightBg: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60', darkBg: 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20' },
  degraded: { label: '降级', dot: 'bg-amber-400', lightBg: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200/60', darkBg: 'bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20' },
  down: { label: '离线', dot: 'bg-red-400', lightBg: 'bg-red-50 text-red-700 ring-1 ring-red-200/60', darkBg: 'bg-red-500/10 text-red-400 ring-1 ring-red-500/20' },
};

function mapHealthStatus(s: HealthConfigItem['healthStatus']): HealthStatus {
  switch (s) {
    case 'healthy': return 'healthy';
    case 'degraded': return 'degraded';
    case 'down': return 'down';
    default: return 'down';
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
  const [loadError, setLoadError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const configs = await healthService.listHealthConfigs();
      setItems(configs.map(toDisplayItem));
    } catch (err) {
      setLoadError(err instanceof Error ? err : new Error('加载健康检查数据失败'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const healthyCount = items.filter(i => i.status === 'healthy').length;
  const warningCount = items.filter(i => i.status === 'degraded').length;
  const offlineCount = items.filter(i => i.status === 'down').length;

  return (
    <div className={`flex-1 flex flex-col min-h-0 overflow-hidden ${canvasBodyBg(theme)}`}>
      {/* Header */}
      <div className={`shrink-0 z-20 border-b px-4 sm:px-6 py-4 flex items-center justify-between ${isDark ? 'border-white/[0.06]' : 'border-slate-200/40'} ${canvasBodyBg(theme)}`}>
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${isDark ? 'bg-emerald-500/15' : 'bg-emerald-50'}`}>
            <Activity size={20} className={isDark ? 'text-emerald-400' : 'text-emerald-600'} />
          </div>
          <div>
            <h2 className={`text-lg font-bold ${textPrimary(theme)}`}>健康检查</h2>
            <p className={`text-xs ${textSecondary(theme)}`}>监控已配置的健康检查项（智能体 / 技能 / MCP / 应用 / 数据集 等统一资源）</p>
          </div>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className={`${btnSecondary(theme)} gap-1.5`}
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          刷新
        </button>
      </div>

      <div className={`flex-1 min-h-0 overflow-y-auto custom-scrollbar px-4 sm:px-6 ${consoleContentTopPad} pb-5 space-y-5 ${mainScrollCompositorClass}`}>
        {loading && items.length === 0 ? (
          <PageSkeleton type="chart" />
        ) : loadError ? (
          <PageError error={loadError} onRetry={fetchData} retryLabel="重试加载健康检查" />
        ) : (
          <>
            {/* KPI Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <KpiCard
                theme={theme}
                label="正常"
                value={healthyCount}
                icon={<CheckCircle size={16} />}
                glow="emerald"
                delay={0}
              />
              <KpiCard
                theme={theme}
                label="告警"
                value={warningCount}
                icon={<AlertTriangle size={16} />}
                glow="amber"
                delay={0.05}
              />
              <KpiCard
                theme={theme}
                label="离线"
                value={offlineCount}
                icon={<WifiOff size={16} />}
                glow="rose"
                delay={0.1}
              />
            </div>

            {/* Items Table */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30, delay: 0.15 }}
            >
              <BentoCard theme={theme} padding="sm" className="!p-0 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm min-w-[800px]">
                    <thead>
                      <tr>
                        <th className={tableHeadCell(theme)}>名称</th>
                        <th className={tableHeadCell(theme)}>资源类型</th>
                        <th className={tableHeadCell(theme)}>状态</th>
                        <th className={tableHeadCell(theme)}>最近检查</th>
                        <th className={tableHeadCell(theme)}>检查方式</th>
                        <th className={tableHeadCell(theme)}>间隔(s)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, i) => {
                        const cfg = STATUS_CFG[item.status];
                        return (
                          <tr key={item.id} className={tableBodyRow(theme, i)}>
                            <td className={tableCell()}>
                              <span className={`font-medium ${textPrimary(theme)}`}>{item.name}</span>
                            </td>
                            <td className={tableCell()}>
                              <span className={`inline-flex shrink-0 items-center whitespace-nowrap text-xs font-medium px-1.5 py-0.5 rounded ${
                                isDark ? 'bg-white/[0.04] text-slate-500' : 'bg-slate-50 text-slate-400'
                              }`}>
                                {resourceTypeLabel(item.type)}
                              </span>
                            </td>
                            <td className={tableCell()}>
                              <span className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${isDark ? cfg.darkBg : cfg.lightBg}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} ${item.status === 'healthy' ? 'animate-pulse' : ''}`} />
                                {cfg.label}
                              </span>
                            </td>
                            <td className={`${tableCell()} whitespace-nowrap ${textMuted(theme)}`}>{item.lastCheck}</td>
                            <td className={`${tableCell()} whitespace-nowrap font-mono ${textSecondary(theme)}`}>{item.checkType}</td>
                            <td className={`${tableCell()} whitespace-nowrap font-mono ${textMuted(theme)}`}>{item.intervalSec}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </BentoCard>
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
};
