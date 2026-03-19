import React, { useMemo, useState } from 'react';
import { Theme, FontSize } from '../../types';
import { MgmtPageShell } from '../userMgmt/MgmtPageShell';
import { MOCK_CALL_LOGS } from '../../constants/monitoring';
import { nativeSelectClass } from '../../utils/formFieldClasses';
import { TOOLBAR_ROW, toolbarSearchInputClass } from '../../utils/toolbarFieldClasses';
import { Search } from 'lucide-react';

interface CallLogPageProps {
  theme: Theme;
  fontSize: FontSize;
}

export const CallLogPage: React.FC<CallLogPageProps> = ({ theme, fontSize }) => {
  const isDark = theme === 'dark';
  const [q, setQ] = useState('');
  const [method, setMethod] = useState<string>('all');
  const [statusBand, setStatusBand] = useState<string>('all');
  const sel = nativeSelectClass(theme);
  const searchCls = toolbarSearchInputClass(theme);

  const rows = useMemo(() => {
    const t = q.trim().toLowerCase();
    return MOCK_CALL_LOGS.filter((r) => {
      if (method !== 'all' && r.method !== method) return false;
      if (statusBand === '2xx' && (r.status < 200 || r.status >= 300)) return false;
      if (statusBand === '4xx' && (r.status < 400 || r.status >= 500)) return false;
      if (statusBand === '5xx' && r.status < 500) return false;
      if (!t) return true;
      return (
        r.path.toLowerCase().includes(t) ||
        r.method.toLowerCase().includes(t) ||
        String(r.status).includes(t) ||
        (r.agent?.toLowerCase().includes(t) ?? false)
      );
    });
  }, [q, method, statusBand]);

  return (
    <MgmtPageShell
      theme={theme}
      fontSize={fontSize}
      breadcrumbSegments={['监控中心', '调用日志']}
      titleIcon={Search}
      description="检索网关与 Agent 推理请求记录（演示）"
      toolbar={
        <div className={TOOLBAR_ROW}>
          <div className="relative flex-1 min-w-0 sm:max-w-md">
            <Search
              className={`absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${isDark ? 'text-slate-500' : 'text-slate-400'}`}
              size={16}
            />
            <input
              type="search"
              placeholder="路径、方法、状态码、Agent…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className={searchCls}
            />
          </div>
          <select className={`${sel} w-full sm:w-[8.5rem] shrink-0`} value={method} onChange={(e) => setMethod(e.target.value)}>
            <option value="all">全部方法</option>
            <option value="GET">GET</option>
            <option value="POST">POST</option>
          </select>
          <select
            className={`${sel} w-full sm:w-[8.5rem] shrink-0`}
            value={statusBand}
            onChange={(e) => setStatusBand(e.target.value)}
          >
            <option value="all">全部状态</option>
            <option value="2xx">2xx</option>
            <option value="4xx">4xx</option>
            <option value="5xx">5xx</option>
          </select>
        </div>
      }
    >
      <div className="min-w-0 px-4 sm:px-6 pb-6 pt-1">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm min-w-[900px]">
            <thead>
              <tr
                className={`border-b ${
                  isDark ? 'border-white/10 bg-[#2C2C2E]/80' : 'border-slate-200 bg-slate-50'
                }`}
              >
                <th className={`px-4 py-3 font-semibold whitespace-nowrap ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                  时间
                </th>
                <th className={`px-4 py-3 font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>方法</th>
                <th className={`px-4 py-3 font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>路径</th>
                <th className={`px-4 py-3 font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>状态</th>
                <th className={`px-4 py-3 font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>延迟</th>
                <th className={`px-4 py-3 font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>Agent</th>
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
                  <td className={`px-4 py-3 font-mono text-xs whitespace-nowrap ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    {r.time}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-lg text-xs font-mono font-medium ${
                        r.method === 'GET'
                          ? isDark
                            ? 'bg-sky-500/20 text-sky-300'
                            : 'bg-sky-100 text-sky-800'
                          : isDark
                            ? 'bg-violet-500/20 text-violet-300'
                            : 'bg-violet-100 text-violet-800'
                      }`}
                    >
                      {r.method}
                    </span>
                  </td>
                  <td
                    className={`px-4 py-3 font-mono text-xs max-w-[280px] truncate ${isDark ? 'text-slate-300' : 'text-slate-700'}`}
                    title={r.path}
                  >
                    {r.path}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-lg text-xs font-mono font-semibold ${
                        r.status >= 500
                          ? isDark
                            ? 'bg-red-500/20 text-red-300'
                            : 'bg-red-100 text-red-800'
                          : r.status >= 400
                            ? isDark
                              ? 'bg-amber-500/20 text-amber-300'
                              : 'bg-amber-100 text-amber-900'
                            : isDark
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className={`px-4 py-3 font-mono text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    {r.latencyMs >= 1000 ? `${(r.latencyMs / 1000).toFixed(1)}s` : `${r.latencyMs}ms`}
                  </td>
                  <td
                    className={`px-4 py-3 text-xs max-w-[120px] truncate ${isDark ? 'text-slate-400' : 'text-slate-600'}`}
                    title={r.agent}
                  >
                    {r.agent ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rows.length === 0 ? (
          <p className={`text-center py-10 text-sm ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>无匹配记录</p>
        ) : null}
      </div>
    </MgmtPageShell>
  );
};
