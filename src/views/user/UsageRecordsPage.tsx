import React, { useState, useMemo } from 'react';
import { Clock, Filter } from 'lucide-react';
import { Theme, FontSize } from '../../types';
import { pageBg, cardClass, tableHeadCell, tableBodyRow, tableCell } from '../../utils/uiClasses';

type TimeFilter = 'today' | '7d' | '30d';
type TypeFilter = 'all' | 'Agent' | 'Skill' | '应用';

interface UsageRecord {
  time: string;
  name: string;
  type: 'Agent' | 'Skill' | '应用';
  action: '调用' | '查看' | '收藏';
  status: '成功' | '失败';
  duration: string;
}

const MOCK_RECORDS: UsageRecord[] = [
  { time: '2026-03-21 14:32', name: '选课助手', type: 'Agent', action: '调用', status: '成功', duration: '1.2s' },
  { time: '2026-03-21 13:15', name: '文献翻译', type: 'Skill', action: '调用', status: '成功', duration: '3.5s' },
  { time: '2026-03-21 12:40', name: '校园导览', type: '应用', action: '查看', status: '成功', duration: '-' },
  { time: '2026-03-21 11:08', name: '图书馆检索', type: 'Agent', action: '调用', status: '失败', duration: '5.1s' },
  { time: '2026-03-21 10:22', name: 'PDF摘要提取', type: 'Skill', action: '收藏', status: '成功', duration: '-' },
  { time: '2026-03-20 18:45', name: '成绩查询', type: 'Agent', action: '调用', status: '成功', duration: '0.8s' },
  { time: '2026-03-20 16:30', name: '课表生成器', type: '应用', action: '调用', status: '成功', duration: '2.1s' },
  { time: '2026-03-20 14:12', name: '论文格式检查', type: 'Skill', action: '调用', status: '成功', duration: '4.3s' },
  { time: '2026-03-19 20:05', name: '考试通知', type: 'Agent', action: '查看', status: '成功', duration: '-' },
  { time: '2026-03-19 09:30', name: '智能翻译', type: 'Skill', action: '调用', status: '失败', duration: '8.2s' },
];

interface UsageRecordsPageProps {
  theme: Theme;
  fontSize: FontSize;
}

export const UsageRecordsPage: React.FC<UsageRecordsPageProps> = ({ theme }) => {
  const isDark = theme === 'dark';
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('7d');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');

  const filtered = useMemo(() => {
    if (typeFilter === 'all') return MOCK_RECORDS;
    return MOCK_RECORDS.filter((r) => r.type === typeFilter);
  }, [typeFilter]);

  const timeButtons: { label: string; value: TimeFilter }[] = [
    { label: '今天', value: 'today' },
    { label: '近7天', value: '7d' },
    { label: '近30天', value: '30d' },
  ];

  const typeButtons: { label: string; value: TypeFilter }[] = [
    { label: '全部', value: 'all' },
    { label: 'Agent', value: 'Agent' },
    { label: 'Skill', value: 'Skill' },
    { label: '应用', value: '应用' },
  ];

  const typeBadge = (type: string) => {
    const styles: Record<string, string> = {
      Agent: isDark ? 'bg-blue-500/15 text-blue-400' : 'bg-blue-100 text-blue-700',
      Skill: isDark ? 'bg-purple-500/15 text-purple-400' : 'bg-purple-100 text-purple-700',
      '应用': isDark ? 'bg-amber-500/15 text-amber-400' : 'bg-amber-100 text-amber-700',
    };
    return `inline-flex items-center rounded-lg px-2 py-0.5 text-xs font-semibold ${styles[type] || ''}`;
  };

  const statusClass = (status: string) => {
    if (status === '成功') return isDark ? 'text-emerald-400' : 'text-emerald-600';
    return isDark ? 'text-red-400' : 'text-red-600';
  };

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
                {filtered.map((record, i) => (
                  <tr key={i} className={tableBodyRow(theme, i)}>
                    <td className={tableCell()}>
                      <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>{record.time}</span>
                    </td>
                    <td className={tableCell()}>
                      <span className={`font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>{record.name}</span>
                    </td>
                    <td className={tableCell()}>
                      <span className={typeBadge(record.type)}>{record.type}</span>
                    </td>
                    <td className={tableCell()}>
                      <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>{record.action}</span>
                    </td>
                    <td className={tableCell()}>
                      <span className={`font-semibold ${statusClass(record.status)}`}>{record.status}</span>
                    </td>
                    <td className={tableCell()}>
                      <span className={`tabular-nums ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{record.duration}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && (
            <div className={`py-12 text-center text-sm ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              暂无记录
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
