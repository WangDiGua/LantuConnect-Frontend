import React, { useMemo, useState } from 'react';
import { Theme, FontSize } from '../../types';
import { MgmtPageShell } from '../userMgmt/MgmtPageShell';
import { MOCK_ALERTS, AlertRow } from '../../constants/monitoring';
import { nativeSelectClass } from '../../utils/formFieldClasses';
import { TOOLBAR_ROW, toolbarSearchInputClass } from '../../utils/toolbarFieldClasses';
import { Search, CheckCircle2, Shield } from 'lucide-react';

interface AlertMgmtPageProps {
  theme: Theme;
  fontSize: FontSize;
  showMessage: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const AlertMgmtPage: React.FC<AlertMgmtPageProps> = ({ theme, fontSize, showMessage }) => {
  const isDark = theme === 'dark';
  const [list, setList] = useState<AlertRow[]>(() => [...MOCK_ALERTS]);
  const [q, setQ] = useState('');
  const [level, setLevel] = useState<string>('all');
  const [statusF, setStatusF] = useState<string>('all');
  const sel = nativeSelectClass(theme);
  const searchCls = toolbarSearchInputClass(theme);

  const rows = useMemo(() => {
    const t = q.trim().toLowerCase();
    return list.filter((r) => {
      if (level !== 'all' && r.level !== level) return false;
      if (statusF !== 'all' && r.status !== statusF) return false;
      if (!t) return true;
      return (
        r.title.toLowerCase().includes(t) ||
        r.source.toLowerCase().includes(t)
      );
    });
  }, [list, q, level, statusF]);

  const ack = (id: string) => {
    setList((prev) =>
      prev.map((x) => (x.id === id && x.status === 'open' ? { ...x, status: 'ack' as const } : x))
    );
    showMessage('已确认告警', 'success');
  };

  const levelStyle = (lv: AlertRow['level']) => {
    switch (lv) {
      case 'critical':
        return isDark ? 'bg-red-500/20 text-red-300' : 'bg-red-100 text-red-800';
      case 'warning':
        return isDark ? 'bg-amber-500/20 text-amber-300' : 'bg-amber-100 text-amber-900';
      default:
        return isDark ? 'bg-slate-600/40 text-slate-300' : 'bg-slate-200 text-slate-700';
    }
  };

  const statusLabel = (s: AlertRow['status']) => {
    switch (s) {
      case 'open':
        return '待处理';
      case 'ack':
        return '已确认';
      default:
        return '已关闭';
    }
  };

  return (
    <MgmtPageShell
      theme={theme}
      fontSize={fontSize}
      breadcrumbSegments={['监控中心', '告警管理']}
      titleIcon={Shield}
      description="运行期告警列表与确认（演示）"
      toolbar={
        <div className={TOOLBAR_ROW}>
          <div className="relative flex-1 min-w-0 sm:max-w-md">
            <Search
              className={`absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${isDark ? 'text-slate-500' : 'text-slate-400'}`}
              size={16}
            />
            <input
              type="search"
              placeholder="标题、来源…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className={searchCls}
            />
          </div>
          <select className={`${sel} w-full sm:w-[7.5rem] shrink-0`} value={level} onChange={(e) => setLevel(e.target.value)}>
            <option value="all">全部级别</option>
            <option value="critical">严重</option>
            <option value="warning">警告</option>
            <option value="info">通知</option>
          </select>
          <select
            className={`${sel} w-full sm:w-[7.5rem] shrink-0`}
            value={statusF}
            onChange={(e) => setStatusF(e.target.value)}
          >
            <option value="all">全部状态</option>
            <option value="open">待处理</option>
            <option value="ack">已确认</option>
            <option value="closed">已关闭</option>
          </select>
        </div>
      }
    >
      <div className="min-w-0 px-4 sm:px-6 pb-6 pt-1">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm min-w-[800px]">
            <thead>
              <tr
                className={`border-b ${
                  isDark ? 'border-white/10 bg-[#2C2C2E]/80' : 'border-slate-200 bg-slate-50'
                }`}
              >
                <th className={`px-4 py-3 font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>时间</th>
                <th className={`px-4 py-3 font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>级别</th>
                <th className={`px-4 py-3 font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>标题</th>
                <th className={`px-4 py-3 font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>来源</th>
                <th className={`px-4 py-3 font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>状态</th>
                <th className={`px-4 py-3 font-semibold text-right ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>操作</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr
                  key={r.id}
                  className={`border-b ${
                    isDark
                      ? `border-white/5 ${i % 2 === 0 ? 'bg-[#1C1C1E]' : 'bg-[#2C2C2E]/40'}`
                      : `border-slate-100 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/80'}`
                  }`}
                >
                  <td className={`px-4 py-3 text-xs whitespace-nowrap ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    {r.time}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-lg text-xs font-medium ${levelStyle(r.level)}`}>
                      {r.level === 'critical' ? '严重' : r.level === 'warning' ? '警告' : '通知'}
                    </span>
                  </td>
                  <td className={`px-4 py-3 max-w-[320px] ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                    <span className="line-clamp-2 text-[13px]" title={r.title}>
                      {r.title}
                    </span>
                  </td>
                  <td className={`px-4 py-3 text-xs font-mono ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    {r.source}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs font-medium ${
                        r.status === 'open'
                          ? isDark
                            ? 'text-amber-400'
                            : 'text-amber-700'
                          : r.status === 'ack'
                            ? isDark
                              ? 'text-blue-400'
                              : 'text-blue-700'
                            : isDark
                              ? 'text-slate-500'
                              : 'text-slate-500'
                      }`}
                    >
                      {statusLabel(r.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {r.status === 'open' ? (
                      <button
                        type="button"
                        onClick={() => ack(r.id)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium ${
                          isDark ? 'bg-white/10 text-slate-200 hover:bg-white/15' : 'bg-slate-100 text-slate-800 hover:bg-slate-200'
                        }`}
                      >
                        <CheckCircle2 size={14} />
                        确认
                      </button>
                    ) : (
                      <span className="text-xs text-slate-500">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rows.length === 0 ? (
          <p className={`text-center py-10 text-sm ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>无匹配告警</p>
        ) : null}
      </div>
    </MgmtPageShell>
  );
};
