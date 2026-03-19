import React, { useMemo, useState } from 'react';
import { Theme, FontSize } from '../../types';
import { MgmtPageShell } from './MgmtPageShell';
import { MOCK_TOKENS, MgmtToken } from '../../constants/userMgmt';
import { nativeSelectClass } from '../../utils/formFieldClasses';
import { TOOLBAR_ROW, toolbarSearchInputClass } from '../../utils/toolbarFieldClasses';
import { Search, Ban, Shield } from 'lucide-react';

interface TokenListPageProps {
  theme: Theme;
  fontSize: FontSize;
  showMessage: (msg: string, type?: 'success' | 'error' | 'info') => void;
  breadcrumbSegments: string[];
}

export const TokenListPage: React.FC<TokenListPageProps> = ({
  theme,
  fontSize,
  showMessage,
  breadcrumbSegments,
}) => {
  const isDark = theme === 'dark';
  const [tokens, setTokens] = useState<MgmtToken[]>(() => [...MOCK_TOKENS]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | MgmtToken['status']>('all');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tokens.filter((t) => {
      if (statusFilter !== 'all' && t.status !== statusFilter) return false;
      if (!q) return true;
      return (
        t.subject.toLowerCase().includes(q) ||
        t.scope.toLowerCase().includes(q)
      );
    });
  }, [tokens, search, statusFilter]);

  const revoke = (id: string) => {
    const t = tokens.find((x) => x.id === id);
    if (t?.status !== 'valid') {
      showMessage('该 Token 已失效或撤销', 'info');
      return;
    }
    if (!confirm('确定撤销该 Token？客户端需重新登录或刷新令牌。')) return;
    setTokens((prev) =>
      prev.map((x) => (x.id === id ? { ...x, status: 'revoked' as const } : x))
    );
    showMessage('Token 已撤销', 'success');
  };

  const statusLabel = (s: MgmtToken['status']) => {
    switch (s) {
      case 'valid':
        return '有效';
      case 'revoked':
        return '已撤销';
      case 'expired':
        return '已过期';
      default:
        return s;
    }
  };

  return (
    <MgmtPageShell
      theme={theme}
      fontSize={fontSize}
      breadcrumbSegments={breadcrumbSegments}
      titleIcon={Shield}
      description="查看访问令牌主体、范围与有效期，支持撤销有效 Token（演示）"
      toolbar={
        <div className={TOOLBAR_ROW}>
          <div className="relative flex-1 min-w-0 sm:max-w-md">
            <Search
              className={`absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${isDark ? 'text-slate-500' : 'text-slate-400'}`}
              size={16}
            />
            <input
              type="search"
              placeholder="搜索主体或 scope…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={toolbarSearchInputClass(theme)}
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className={`${nativeSelectClass(theme)} w-full sm:w-[8.5rem] shrink-0`}
          >
            <option value="all">全部状态</option>
            <option value="valid">有效</option>
            <option value="revoked">已撤销</option>
            <option value="expired">已过期</option>
          </select>
        </div>
      }
    >
      <div className="min-w-0 px-4 sm:px-6 pb-6 pt-1">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm min-w-[880px]">
            <thead>
              <tr
                className={`border-b ${
                  isDark ? 'border-white/10 bg-[#2C2C2E]/80' : 'border-slate-200 bg-slate-50'
                }`}
              >
                <th className={`px-4 py-3 font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                  主体
                </th>
                <th className={`px-4 py-3 font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                  Scope
                </th>
                <th className={`px-4 py-3 font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                  签发时间
                </th>
                <th className={`px-4 py-3 font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                  过期时间
                </th>
                <th className={`px-4 py-3 font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                  状态
                </th>
                <th className={`px-4 py-3 font-semibold text-right ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                  操作
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t, i) => (
                <tr
                  key={t.id}
                  className={`border-b transition-colors ${
                    isDark
                      ? `border-white/5 ${i % 2 === 0 ? 'bg-[#1C1C1E]' : 'bg-[#2C2C2E]/40'} hover:bg-white/5`
                      : `border-slate-100 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/80'} hover:bg-slate-100/80`
                  }`}
                >
                  <td className={`px-4 py-3 max-w-[200px] ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    <span className="line-clamp-2">{t.subject}</span>
                  </td>
                  <td className={`px-4 py-3 text-xs max-w-[240px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    <span className="line-clamp-2 font-mono">{t.scope}</span>
                  </td>
                  <td className={`px-4 py-3 whitespace-nowrap ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    {t.issuedAt}
                  </td>
                  <td className={`px-4 py-3 whitespace-nowrap ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    {t.expiresAt}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                        t.status === 'valid'
                          ? isDark
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-emerald-100 text-emerald-800'
                          : t.status === 'expired'
                            ? isDark
                              ? 'bg-slate-600/40 text-slate-300'
                              : 'bg-slate-200 text-slate-700'
                            : isDark
                              ? 'bg-red-500/20 text-red-300'
                              : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {statusLabel(t.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {t.status === 'valid' ? (
                      <button
                        type="button"
                        onClick={() => revoke(t.id)}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-xl text-xs font-medium ${
                          isDark ? 'text-amber-400 hover:bg-white/10' : 'text-amber-700 hover:bg-amber-50'
                        }`}
                      >
                        <Ban size={14} />
                        撤销
                      </button>
                    ) : (
                      <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 ? (
          <p className={`text-center py-12 text-sm ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
            暂无 Token
          </p>
        ) : null}
      </div>
    </MgmtPageShell>
  );
};
