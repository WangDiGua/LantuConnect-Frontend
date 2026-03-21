import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Clock, Loader2 } from 'lucide-react';
import type { Theme, FontSize } from '../../types';
import { userActivityService } from '../../api/services/user-activity.service';
import type { UsageRecord } from '../../types/dto/user-activity';
import { AnimatedList } from '../../components/common/AnimatedList';
import { BentoCard } from '../../components/common/BentoCard';
import {
  pageBg, bentoCardHover, textPrimary, textSecondary, textMuted,
} from '../../utils/uiClasses';

type TimeFilter = 'today' | '7d' | '30d';
type TypeFilter = 'all' | 'agent' | 'skill' | 'app';

interface UsageRecordsPageProps {
  theme: Theme;
  fontSize: FontSize;
}

const TYPE_LABEL: Record<string, string> = { agent: 'Agent', skill: 'Skill', app: '应用' };

export const UsageRecordsPage: React.FC<UsageRecordsPageProps> = ({ theme }) => {
  const isDark = theme === 'dark';
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('7d');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [records, setRecords] = useState<UsageRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(() => {
    setLoading(true);
    userActivityService.getUsageRecords({ range: timeFilter, type: typeFilter === 'all' ? undefined : typeFilter })
      .then(res => setRecords(res.list))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [timeFilter, typeFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const typeBadge = (type: string) => {
    const styles: Record<string, string> = {
      agent: isDark ? 'bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/20' : 'bg-blue-50 text-blue-700 ring-1 ring-blue-200/60',
      skill: isDark ? 'bg-violet-500/10 text-violet-400 ring-1 ring-violet-500/20' : 'bg-violet-50 text-violet-700 ring-1 ring-violet-200/60',
      app:   isDark ? 'bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20' : 'bg-amber-50 text-amber-700 ring-1 ring-amber-200/60',
    };
    return `inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${styles[type] || ''}`;
  };

  const statusCls = (status: string) => status === 'success' ? 'text-emerald-500' : 'text-rose-500';

  const tabCls = (active: boolean) => `px-3 py-1.5 rounded-xl text-xs font-semibold transition-all active:scale-[0.97] ${
    active
      ? 'bg-indigo-600 text-white shadow-sm'
      : isDark ? 'bg-white/5 text-slate-400 hover:bg-white/10' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
  }`;

  return (
    <div className={`flex-1 flex flex-col min-h-0 overflow-hidden transition-colors duration-300 ${pageBg(theme)}`}>
      <div className="w-full flex-1 min-h-0 overflow-y-auto px-2 sm:px-3 lg:px-4 py-2 sm:py-3 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl ${isDark ? 'bg-blue-500/15' : 'bg-blue-50'}`}>
            <Clock size={20} className={isDark ? 'text-blue-400' : 'text-blue-600'} />
          </div>
          <div>
            <h1 className={`text-lg font-bold ${textPrimary(theme)}`}>使用记录</h1>
            <p className={`text-xs ${textMuted(theme)}`}>查看您的最近使用活动</p>
          </div>
        </div>

        {/* Filters */}
        <BentoCard theme={theme} padding="sm">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className={`text-xs font-semibold ${textMuted(theme)}`}>时间</span>
              <div className="flex gap-1.5">
                {([{ label: '今天', value: 'today' as TimeFilter }, { label: '近7天', value: '7d' as TimeFilter }, { label: '近30天', value: '30d' as TimeFilter }]).map((tb) => (
                  <button key={tb.value} type="button" onClick={() => setTimeFilter(tb.value)} className={tabCls(timeFilter === tb.value)}>{tb.label}</button>
                ))}
              </div>
            </div>
            <div className={`h-5 w-px ${isDark ? 'bg-white/10' : 'bg-slate-200'}`} />
            <div className="flex items-center gap-2">
              <span className={`text-xs font-semibold ${textMuted(theme)}`}>类型</span>
              <div className="flex gap-1.5">
                {([{ label: '全部', value: 'all' as TypeFilter }, { label: 'Agent', value: 'agent' as TypeFilter }, { label: 'Skill', value: 'skill' as TypeFilter }, { label: '应用', value: 'app' as TypeFilter }]).map((tb) => (
                  <button key={tb.value} type="button" onClick={() => setTypeFilter(tb.value)} className={tabCls(typeFilter === tb.value)}>{tb.label}</button>
                ))}
              </div>
            </div>
          </div>
        </BentoCard>

        {/* Card rows */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 size={32} className="animate-spin text-slate-400" />
            <p className={`mt-3 text-sm ${textMuted(theme)}`}>加载中…</p>
          </div>
        ) : records.length === 0 ? (
          <BentoCard theme={theme}><div className={`py-12 text-center text-sm ${textMuted(theme)}`}>暂无记录</div></BentoCard>
        ) : (
          <AnimatedList className="space-y-2">
            {records.map((record) => (
              <motion.div
                key={record.id}
                whileHover={{ y: -2 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                className={`${bentoCardHover(theme)} p-4 flex items-center gap-4`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`font-semibold text-sm ${textPrimary(theme)}`}>{record.displayName}</span>
                    <span className={typeBadge(record.type)}>{TYPE_LABEL[record.type] ?? record.type}</span>
                    <span className={`text-xs font-semibold ${statusCls(record.status)}`}>{record.status === 'success' ? '成功' : '失败'}</span>
                  </div>
                  <div className={`text-xs mt-0.5 ${textMuted(theme)}`}>{record.action} · {record.createTime}</div>
                </div>
                <div className="hidden sm:block text-right shrink-0">
                  <div className={`text-[10px] uppercase tracking-wider ${textMuted(theme)}`}>耗时</div>
                  <div className={`text-sm font-mono tabular-nums ${textSecondary(theme)}`}>
                    {record.latencyMs > 0 ? `${(record.latencyMs / 1000).toFixed(1)}s` : '—'}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatedList>
        )}
      </div>
    </div>
  );
};
