import React, { useMemo, useState, useCallback } from 'react';
import { Theme, FontSize } from '../../types';
import { MgmtPageShell } from './MgmtPageShell';
import { MOCK_API_KEYS, MgmtApiKey } from '../../constants/userMgmt';
import { nativeInputClass } from '../../utils/formFieldClasses';
import { TOOLBAR_ROW, toolbarSearchInputClass } from '../../utils/toolbarFieldClasses';
import { Search, Plus, Copy, Check, Ban, Zap } from 'lucide-react';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { Pagination } from '../../components/common/Pagination';

interface ApiKeyListPageProps {
  theme: Theme;
  fontSize: FontSize;
  showMessage: (msg: string, type?: 'success' | 'error' | 'info') => void;
  breadcrumbSegments: string[];
}

const PAGE_SIZE = 20;

function randomSuffix(len: number) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let s = '';
  for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

export const ApiKeyListPage: React.FC<ApiKeyListPageProps> = ({
  theme,
  fontSize,
  showMessage,
  breadcrumbSegments,
}) => {
  const isDark = theme === 'dark';
  const [keys, setKeys] = useState<MgmtApiKey[]>(() => [...MOCK_API_KEYS]);
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [revealedOnce, setRevealedOnce] = useState<{ full: string; prefix: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [page, setPage] = useState(1);
  const [revokeTarget, setRevokeTarget] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return keys.filter((k) => {
      if (!q) return true;
      return k.name.toLowerCase().includes(q) || k.prefix.toLowerCase().includes(q);
    });
  }, [keys, search]);

  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  const closeReveal = useCallback(() => {
    setRevealedOnce(null);
    setNewName('');
    setCopied(false);
    setCreateOpen(false);
  }, []);

  const createKey = useCallback(() => {
    if (!newName.trim()) {
      showMessage('请填写密钥名称', 'error');
      return;
    }
    const tail = randomSuffix(24);
    const full = `sk_demo_${tail}`;
    const prefix = `sk_demo_${tail.slice(0, 4)}`;
    const id = `k-${Date.now()}`;
    const now = new Date().toISOString().slice(0, 16).replace('T', ' ');
    setKeys((prev) => [
      {
        id,
        name: newName.trim(),
        prefix,
        createdAt: now,
        status: 'active',
      },
      ...prev,
    ]);
    setRevealedOnce({ full, prefix });
    setCopied(false);
    showMessage('密钥已生成，请立即复制保存', 'success');
  }, [newName, showMessage]);

  const copyFull = useCallback(async () => {
    if (!revealedOnce) return;
    try {
      await navigator.clipboard.writeText(revealedOnce.full);
      setCopied(true);
      showMessage('已复制到剪贴板', 'success');
    } catch {
      showMessage('复制失败，请手动选择复制', 'error');
    }
  }, [revealedOnce, showMessage]);

  const handleRevoke = useCallback(() => {
    if (!revokeTarget) return;
    setKeys((prev) => prev.map((k) => (k.id === revokeTarget ? { ...k, status: 'revoked' as const } : k)));
    showMessage('API Key 已撤销', 'info');
    setRevokeTarget(null);
    setPage(1);
  }, [revokeTarget, showMessage]);

  const inputCls = nativeInputClass(theme);

  return (
    <MgmtPageShell
      theme={theme}
      fontSize={fontSize}
      breadcrumbSegments={breadcrumbSegments}
      titleIcon={Zap}
      description="创建与撤销调用密钥；列表仅展示前缀，完整密钥仅在创建时显示一次"
      toolbar={
        <div className={TOOLBAR_ROW}>
          <div className="relative flex-1 min-w-0 sm:max-w-md">
            <Search
              className={`absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${isDark ? 'text-slate-500' : 'text-slate-400'}`}
              size={16}
            />
            <input
              type="search"
              placeholder="搜索名称或前缀…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={toolbarSearchInputClass(theme)}
            />
          </div>
          <button
            type="button"
            onClick={() => {
              setCreateOpen(true);
              setNewName('');
              setRevealedOnce(null);
              setCopied(false);
            }}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 min-h-[2.5rem] shrink-0"
          >
            <Plus size={16} />
            创建 API Key
          </button>
        </div>
      }
    >
      <div className="relative min-w-0 px-4 sm:px-6 pb-6 pt-1">
        {(createOpen || revealedOnce) && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.target === e.currentTarget && !revealedOnce && closeReveal()}
          >
            <div
              className={`w-full max-w-md rounded-2xl border shadow-xl p-5 ${
                isDark ? 'bg-[#1C1C1E] border-white/10' : 'bg-white border-slate-200'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              {!revealedOnce ? (
                <>
                  <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    新建 API Key
                  </h3>
                  <p className={`text-xs mt-1 mb-4 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    生成后完整密钥仅展示一次，请妥善保存。
                  </p>
                  <label className={`block text-xs font-medium mb-1 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                    名称
                  </label>
                  <input
                    className={inputCls}
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="如：教务中台-生产"
                    autoFocus
                  />
                  <div className="flex justify-end gap-2 mt-5">
                    <button
                      type="button"
                      onClick={closeReveal}
                      className={`px-3 py-2 rounded-xl text-sm border ${
                        isDark
                          ? 'border-white/10 text-slate-200 hover:bg-white/5'
                          : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      取消
                    </button>
                    <button
                      type="button"
                      onClick={createKey}
                      className="px-3 py-2 rounded-xl text-sm font-medium bg-blue-600 text-white hover:bg-blue-700"
                    >
                      生成密钥
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    请保存您的密钥
                  </h3>
                  <p className={`text-xs mt-1 mb-3 ${isDark ? 'text-amber-200/90' : 'text-amber-800'}`}>
                    关闭此窗口后将无法再次查看完整密钥。
                  </p>
                  <div
                    className={`rounded-xl border p-3 font-mono text-xs break-all ${
                      isDark ? 'bg-[#2C2C2E] border-white/10 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  >
                    {revealedOnce.full}
                  </div>
                  <div className="flex flex-wrap gap-2 mt-4">
                    <button
                      type="button"
                      onClick={copyFull}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium bg-blue-600 text-white hover:bg-blue-700"
                    >
                      {copied ? <Check size={16} /> : <Copy size={16} />}
                      {copied ? '已复制' : '复制完整密钥'}
                    </button>
                    <button
                      type="button"
                      onClick={closeReveal}
                      className={`px-3 py-2 rounded-xl text-sm border ${
                        isDark
                          ? 'border-white/10 text-slate-200 hover:bg-white/5'
                          : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      我已保存
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm min-w-[720px]">
            <thead>
              <tr
                className={`border-b ${
                  isDark ? 'border-white/10 bg-[#2C2C2E]/80' : 'border-slate-200 bg-slate-50'
                }`}
              >
                <th className={`px-4 py-3 font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                  名称
                </th>
                <th className={`px-4 py-3 font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                  密钥前缀（脱敏）
                </th>
                <th className={`px-4 py-3 font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                  创建时间
                </th>
                <th className={`px-4 py-3 font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                  最近使用
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
              {paginated.map((k, i) => (
                <tr
                  key={k.id}
                  className={`border-b transition-colors ${
                    isDark
                      ? `border-white/5 ${i % 2 === 0 ? 'bg-[#1C1C1E]' : 'bg-[#2C2C2E]/40'} hover:bg-white/5`
                      : `border-slate-100 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/80'} hover:bg-slate-100/80`
                  }`}
                >
                  <td className={`px-4 py-3 font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>{k.name}</td>
                  <td className={`px-4 py-3 font-mono text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    {k.prefix}
                    <span className="opacity-60">••••••••</span>
                  </td>
                  <td className={`px-4 py-3 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{k.createdAt}</td>
                  <td className={`px-4 py-3 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    {k.lastUsed ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                        k.status === 'active'
                          ? isDark
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-emerald-100 text-emerald-800'
                          : isDark
                            ? 'bg-red-500/20 text-red-300'
                            : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {k.status === 'active' ? '有效' : '已撤销'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {k.status === 'active' ? (
                      <button
                        type="button"
                        onClick={() => setRevokeTarget(k.id)}
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
            暂无 API Key
          </p>
        ) : null}
        {filtered.length > 0 && (
          <Pagination page={page} pageSize={PAGE_SIZE} total={filtered.length} onChange={setPage} />
        )}
      </div>
      <ConfirmDialog
        open={!!revokeTarget}
        title="撤销 API Key"
        message="撤销后该 Key 将不可用，确定继续？"
        confirmText="撤销"
        variant="warning"
        onConfirm={handleRevoke}
        onCancel={() => setRevokeTarget(null)}
      />
    </MgmtPageShell>
  );
};
