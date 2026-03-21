import React, { useMemo } from 'react';
import { Cpu, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Theme, FontSize } from '../../types';
import { usePerformanceMetrics } from '../../hooks/queries/useMonitoring';
import { PageSkeleton } from '../../components/common/PageSkeleton';
import { PageError } from '../../components/common/PageError';
import { EmptyState } from '../../components/common/EmptyState';
import { BentoCard } from '../../components/common/BentoCard';
import { AnimatedList } from '../../components/common/AnimatedList';
import {
  pageBg, btnGhost, textPrimary, textSecondary, textMuted,
} from '../../utils/uiClasses';

interface Props {
  theme: Theme;
  fontSize: FontSize;
  showMessage: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const InfraResourceMonitorPage: React.FC<Props> = ({ theme, showMessage }) => {
  const isDark = theme === 'dark';
  const perfQ = usePerformanceMetrics();

  const nodes = useMemo(() => {
    const list = perfQ.data ?? [];
    const tail = list.slice(-8);
    return tail.map((m, idx) => ({
      id: `${m.timestamp}-${idx}`,
      name: `采样点 ${idx + 1}`,
      cpu: Math.min(100, Math.round(m.cpu)),
      mem: Math.min(100, Math.round(m.memory)),
      pod: Math.max(1, Math.round(m.throughput / 10)),
    }));
  }, [perfQ.data]);

  if (perfQ.isLoading) {
    return (
      <div className={`flex-1 flex flex-col min-h-0 ${pageBg(theme)}`}>
        <div className="p-4"><PageSkeleton type="cards" /></div>
      </div>
    );
  }

  if (perfQ.isError) {
    return (
      <div className={`flex-1 flex flex-col min-h-0 ${pageBg(theme)}`}>
        <PageError error={perfQ.error as Error} onRetry={() => perfQ.refetch()} />
      </div>
    );
  }

  const barColor = (pct: number) =>
    pct > 80 ? 'bg-gradient-to-r from-rose-500 to-rose-400'
      : pct > 60 ? 'bg-gradient-to-r from-amber-500 to-amber-400'
      : 'bg-gradient-to-r from-indigo-500 to-indigo-400';

  return (
    <div className={`flex-1 flex flex-col min-h-0 overflow-hidden transition-colors duration-300 ${pageBg(theme)}`}>
      <div className="w-full flex-1 min-h-0 overflow-y-auto px-2 sm:px-3 lg:px-4 py-2 sm:py-3 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${isDark ? 'bg-cyan-500/15' : 'bg-cyan-50'}`}>
              <Cpu size={20} className={isDark ? 'text-cyan-400' : 'text-cyan-600'} />
            </div>
            <div>
              <h1 className={`text-lg font-bold ${textPrimary(theme)}`}>资源监控</h1>
              <p className={`text-xs ${textMuted(theme)}`}>CPU、内存与负载单元实时概况</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => { void perfQ.refetch(); showMessage('指标已刷新', 'info'); }}
            className={btnGhost(theme)}
          >
            <RefreshCw size={15} />
            <span className="hidden sm:inline">刷新</span>
          </button>
        </div>

        {nodes.length === 0 ? (
          <BentoCard theme={theme}>
            <EmptyState title="暂无资源数据" description="性能采集返回为空，请检查采集端或稍后重试。" />
          </BentoCard>
        ) : (
          <AnimatedList className="grid sm:grid-cols-2 gap-3">
            {nodes.map((n) => (
              <BentoCard key={n.id} theme={theme} hover glow="indigo">
                <div className="flex items-center justify-between mb-3">
                  <span className={`font-semibold ${textPrimary(theme)}`}>{n.name}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${isDark ? 'bg-white/5 text-slate-500' : 'bg-slate-50 text-slate-400'}`}>
                    Pod {n.pod}
                  </span>
                </div>
                <div className="space-y-3">
                  {[
                    { k: 'CPU', v: n.cpu },
                    { k: '内存', v: n.mem },
                  ].map((x) => (
                    <div key={x.k}>
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className={textSecondary(theme)}>{x.k}</span>
                        <span className={`font-mono tabular-nums font-semibold ${x.v > 80 ? 'text-rose-500' : textSecondary(theme)}`}>{x.v}%</span>
                      </div>
                      <div className={`h-2 rounded-full overflow-hidden ${isDark ? 'bg-white/10' : 'bg-slate-200'}`}>
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${x.v}%` }}
                          transition={{ duration: 0.6, ease: 'easeOut' }}
                          className={`h-full rounded-full ${barColor(x.v)}`}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </BentoCard>
            ))}
          </AnimatedList>
        )}
      </div>
    </div>
  );
};
