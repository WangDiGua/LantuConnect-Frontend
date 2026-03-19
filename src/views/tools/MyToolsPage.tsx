import React, { useMemo, useState } from 'react';
import { Search, Power, RefreshCw, Package } from 'lucide-react';
import { Theme, FontSize } from '../../types';
import { MgmtPageShell } from '../userMgmt/MgmtPageShell';
import { MOCK_MY_TOOLS, MyToolRow } from '../../constants/tools';
import { TOOLBAR_ROW, toolbarSearchInputClass } from '../../utils/toolbarFieldClasses';
import { nativeSelectClass } from '../../utils/formFieldClasses';

interface MyToolsPageProps {
  theme: Theme;
  fontSize: FontSize;
  showMessage: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const MyToolsPage: React.FC<MyToolsPageProps> = ({ theme, fontSize, showMessage }) => {
  const isDark = theme === 'dark';
  const [rows, setRows] = useState<MyToolRow[]>(() => [...MOCK_MY_TOOLS]);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<string>('all');

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (status !== 'all' && r.status !== status) return false;
      if (!t) return true;
      return r.name.toLowerCase().includes(t) || r.type.toLowerCase().includes(t);
    });
  }, [rows, q, status]);

  const toggle = (id: string) => {
    setRows((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, status: r.status === '运行中' ? '已停用' : '运行中' } : r
      )
    );
    showMessage('状态已更新（演示）', 'success');
  };

  return (
    <MgmtPageShell
      theme={theme}
      fontSize={fontSize}
      breadcrumbSegments={['工具广场', '我的工具']}
      titleIcon={Package}
      description="已接入或订阅的工具与 MCP 服务；支持启停与检索（演示数据）"
      toolbar={
        <div className={TOOLBAR_ROW}>
          <div className="relative flex-1 min-w-0 sm:max-w-md">
            <Search
              className={`absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${isDark ? 'text-slate-500' : 'text-slate-400'}`}
              size={16}
            />
            <input
              type="search"
              placeholder="搜索名称或类型…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className={toolbarSearchInputClass(theme)}
            />
          </div>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className={`${nativeSelectClass(theme)} w-full sm:w-[8.5rem] shrink-0`}
          >
            <option value="all">全部状态</option>
            <option value="运行中">运行中</option>
            <option value="已停用">已停用</option>
            <option value="异常">异常</option>
          </select>
          <button
            type="button"
            onClick={() => showMessage('已刷新列表（演示）', 'info')}
            className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium min-h-[2.5rem] border shrink-0 ${
              isDark ? 'border-white/15 text-slate-200 hover:bg-white/5' : 'border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <RefreshCw size={16} />
            刷新
          </button>
        </div>
      }
    >
      <div className="min-w-0 px-4 sm:px-6 pb-6 pt-1 overflow-x-auto">
        <table className="w-full text-left text-sm min-w-[720px]">
          <thead className={isDark ? 'text-slate-400' : 'text-slate-500'}>
            <tr className={`border-b ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
              <th className="py-3 pr-4 font-semibold">名称</th>
              <th className="py-3 pr-4 font-semibold">类型</th>
              <th className="py-3 pr-4 font-semibold">状态</th>
              <th className="py-3 pr-4 font-semibold">版本</th>
              <th className="py-3 pr-4 font-semibold">24h 调用</th>
              <th className="py-3 pr-4 font-semibold">最近使用</th>
              <th className="py-3 text-right font-semibold">操作</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, idx) => (
              <tr
                key={r.id}
                className={`border-b ${isDark ? 'border-white/5' : 'border-slate-100'} ${
                  isDark ? (idx % 2 === 1 ? 'bg-white/5' : '') : idx % 2 === 1 ? 'bg-slate-50/80' : ''
                }`}
              >
                <td className="py-3 pr-4 font-medium">{r.name}</td>
                <td className="py-3 pr-4">{r.type}</td>
                <td className="py-3 pr-4">
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded-lg ${
                      r.status === '运行中'
                        ? isDark
                          ? 'bg-emerald-500/15 text-emerald-300'
                          : 'bg-emerald-100 text-emerald-700'
                        : r.status === '异常'
                          ? isDark
                            ? 'bg-red-500/15 text-red-300'
                            : 'bg-red-100 text-red-700'
                          : isDark
                            ? 'bg-white/10 text-slate-400'
                            : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {r.status}
                  </span>
                </td>
                <td className="py-3 pr-4 font-mono text-xs">{r.version}</td>
                <td className="py-3 pr-4 tabular-nums">{r.calls24h.toLocaleString()}</td>
                <td className="py-3 pr-4 text-slate-500">{r.lastUsed}</td>
                <td className="py-3 text-right">
                  <button
                    type="button"
                    onClick={() => toggle(r.id)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium ${
                      isDark ? 'hover:bg-white/10 text-slate-300' : 'hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <Power size={14} />
                    {r.status === '运行中' ? '停用' : '启用'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className={`text-sm py-8 text-center ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>无匹配工具</p>
        )}
      </div>
    </MgmtPageShell>
  );
};
