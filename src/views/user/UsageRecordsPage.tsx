import React, { useState, useEffect, useCallback } from 'react';
import { Clock, Filter, Loader2 } from 'lucide-react';
import { Theme, FontSize } from '../../types';
import { pageBg, cardClass, tableHeadCell, tableBodyRow, tableCell } from '../../utils/uiClasses';
import { userActivityService } from '../../api/services/user-activity.service';
import type { UsageRecord } from '../../types/dto/user-activity';

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
    userActivityService.getUsageRecords({
      range: timeFilter,
      type: typeFilter === 'all' ? undefined : typeFilter,
    })
      .then(res => setRecords(res.list))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [timeFilter, typeFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const timeButtons: { label: string; value: TimeFilter }[] = [
    { label: '今天', value: 'today' },
    { label: '近7天', value: '7d' },
    { label: '近30天', value: '30d' },
  ];

  const typeButtons: { label: string; value: TypeFilter }[] = [
    { label: '全部', value: 'all' },
    { label: 'Agent', value: 'agent' },
    { label: 'Skill', value: 'skill' },
    { label: '应用', value: 'app' },
  ];

  const typeBadge = (type: string) => {
    const styles: Record<string, string> = {
      agent: isDark ? 'bg-blue-500/15 text-blue-400' : 'bg-blue-100 text-blue-700',
      skill: isDark ? 'bg-purple-500/15 text-purple-400' : 'bg-purple-100 text-purple-700',
      app: isDark ? 'bg-amber-500/15 text-amber-400' : 'bg-amber-100 text-amber-700',
    };
    return `inline-flex items-center rounded-lg px-2 py-0.5 text-xs font-semibold ${styles[type] || ''}`;
  };

  const statusClass = (status: string) => {
    if (status === 'success') return isDark ? 'text-emerald-400' : 'text-emerald-600';
    return isDark ? 'text-red-400' : 'text-red-600';
  };

  const statusLabel = (status: string) => status === 'success' ? '成功' : '失败';

  return (
    <div className={`flex-1 flex flex-col min-h-0 overflow-hidden ${pageBg(theme)}`}>
      <div className="w-full flex-1 min-h-0 flex flex-col px-2 sm:px-3 lg:px-4 py-2 sm:py-3 overflow-y-auto custom-scrollbar">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4 shrink-0">
          <div className={`p-2 rounded-xl ${isDark ? 'bg-white/10' : 'bg-white border border-slate-200/80'}`}>
            <Clock size={22} className="text-blue-500" />
          </div>
          <div>
            <h1 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>使用记录</h1>
            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>查看您的最近使用活动</p>
          </div>
        </div>

        {/* Filters */}
        <div className={`${cardClass(theme)} p-4 mb-4 shrink-0`}>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter size={14} className={isDark ? 'text-slate-400' : 'text-slate-500'} />
              <span className={`text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>时间</span>
              <div className="flex gap-1.5">
                {timeButtons.map((tb) => (
                  <button
                    key={tb.value}
                    type="button"
                    onClick={() => setTimeFilter(tb.value)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                      timeFilter === tb.value
                        ? 'bg-blue-600 text-white'
                        : isDark
                          ? 'bg-white/5 text-slate-400 hover:bg-white/10'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {tb.label}
                  </button>
                ))}
              </div>
            </div>
            <div className={`h-5 w-px ${isDark ? 'bg-white/10' : 'bg-slate-200'}`} />
            <div className="flex items-center gap-2">
              <span className={`text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>类型</span>
              <div className="flex gap-1.5">
                {typeButtons.map((tb) => (
                  <button
                    key={tb.value}
                    type="button"
                    onClick={() => setTypeFilter(tb.value)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                      typeFilter === tb.value
                        ? 'bg-blue-600 text-white'
                        : isDark
                          ? 'bg-white/5 text-slate-400 hover:bg-white/10'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {tb.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className={`${cardClass(theme)} overflow-hidden`}>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 size={32} className={`animate-spin ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
              <p className={`mt-3 text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>加载中…</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className={tableHeadCell(theme)}>时间</th>
                      <th className={tableHeadCell(theme)}>名称</th>
                      <th className={tableHeadCell(theme)}>类型</th>
                      <th className={tableHeadCell(theme)}>操作</th>
                      <th className={tableHeadCell(theme)}>状态</th>
                      <th className={tableHeadCell(theme)}>耗时</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((record, i) => (
                      <tr key={record.id} className={tableBodyRow(theme, i)}>
                        <td className={tableCell()}>
                          <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>{record.createTime}</span>
                        </td>
                        <td className={tableCell()}>
                          <span className={`font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>{record.displayName}</span>
                        </td>
                        <td className={tableCell()}>
                          <span className={typeBadge(record.type)}>{TYPE_LABEL[record.type] ?? record.type}</span>
                        </td>
                        <td className={tableCell()}>
                          <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>{record.action}</span>
                        </td>
                        <td className={tableCell()}>
                          <span className={`font-semibold ${statusClass(record.status)}`}>{statusLabel(record.status)}</span>
                        </td>
                        <td className={tableCell()}>
                          <span className={`tabular-nums ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            {record.latencyMs > 0 ? `${(record.latencyMs / 1000).toFixed(1)}s` : '—'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {records.length === 0 && (
                <div className={`py-12 text-center text-sm ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                  暂无记录
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
