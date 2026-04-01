import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Ban, Shield, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Theme, FontSize } from '../../types';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { AnimatedList } from '../../components/common/AnimatedList';
import { SearchInput, FilterSelect } from '../../components/common';
import { userMgmtService } from '../../api/services/user-mgmt.service';
import type { TokenRecord } from '../../types/dto/user-mgmt';
import {
  canvasBodyBg, bentoCard, bentoCardHover, btnGhost,
  textPrimary, textSecondary, textMuted,
  tableCellScrollInner,
} from '../../utils/uiClasses';
import { useLayoutChrome } from '../../context/LayoutChromeContext';
import { formatDateTime } from '../../utils/formatDateTime';
import { PageTitleTagline } from '../../components/common/PageTitleTagline';
import { PageSkeleton } from '../../components/common/PageSkeleton';

interface TokenListPageProps { theme: Theme; fontSize: FontSize; showMessage: (msg: string, type?: 'success' | 'error' | 'info') => void; breadcrumbSegments: string[]; }

const PAGE_SIZE = 20;

const STATUS_STYLE: Record<string, { light: string; dark: string; label: string }> = {
  active:  { light: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60', dark: 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20', label: '有效' },
  revoked: { light: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200/60',          dark: 'bg-rose-500/10 text-rose-400 ring-1 ring-rose-500/20',          label: '已撤销' },
  expired: { light: 'bg-slate-50 text-slate-600 ring-1 ring-slate-200/60',       dark: 'bg-slate-500/10 text-slate-400 ring-1 ring-slate-500/20',       label: '已过期' },
};

export const TokenListPage: React.FC<TokenListPageProps> = ({ theme, showMessage }) => {
  const { chromePageTitle } = useLayoutChrome();
  const isDark = theme === 'dark';
  const [tokens, setTokens] = useState<TokenRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | TokenRecord['status']>('all');
  const [page, setPage] = useState(1);
  const [revokeTarget, setRevokeTarget] = useState<string | null>(null);

  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(id);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter]);

  const fetchTokens = useCallback(async () => {
    setLoading(true);
    try {
      const res = await userMgmtService.listTokens({
        page,
        pageSize: PAGE_SIZE,
        ...(debouncedSearch ? { keyword: debouncedSearch } : {}),
        ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
      });
      setTokens(res.list);
      setTotal(Number.isFinite(res.total) ? res.total : 0);
    } catch (err) {
      showMessage(err instanceof Error ? err.message : '加载 Token 列表失败', 'error');
      setTokens([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, statusFilter, showMessage]);

  useEffect(() => {
    void fetchTokens();
  }, [fetchTokens]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const handleRevoke = async () => {
    if (!revokeTarget) return;
    const t = tokens.find((x) => x.id === revokeTarget);
    if (t?.status !== 'active') { showMessage('该 Token 已失效或撤销', 'info'); setRevokeTarget(null); return; }
    try { await userMgmtService.revokeToken(revokeTarget); showMessage('Token 已撤销', 'success'); setRevokeTarget(null); setPage(1); await fetchTokens(); }
    catch { showMessage('撤销失败', 'error'); }
  };

  return (
    <div className={`flex-1 flex flex-col min-h-0 overflow-hidden transition-colors duration-300 ${canvasBodyBg(theme)}`}>
      <div className="w-full flex-1 min-h-0 flex flex-col px-2 sm:px-3 lg:px-4 py-2 sm:py-3">
        <div className={`${bentoCard(theme)} overflow-hidden flex-1 min-h-0 flex flex-col`}>
          <div className={`flex items-center justify-between px-6 py-4 border-b shrink-0 ${isDark ? 'border-white/[0.06]' : 'border-slate-100'}`}>
            <div className="flex min-w-0 items-center gap-3">
              <div className={`shrink-0 rounded-xl p-2 ${isDark ? 'bg-cyan-500/15' : 'bg-cyan-50'}`}><Shield size={20} className={isDark ? 'text-cyan-400' : 'text-cyan-600'} /></div>
              <PageTitleTagline subtitleOnly theme={theme} title={chromePageTitle || 'Token 管理'} tagline="查看访问令牌与有效期" />
            </div>
          </div>
          <div className={`px-4 py-3 border-b shrink-0 ${isDark ? 'border-white/[0.06]' : 'border-slate-100'}`}>
            <div className="flex flex-wrap items-center gap-2">
              <FilterSelect value={statusFilter} onChange={(v) => { setStatusFilter(v as typeof statusFilter); setPage(1); }} options={[{ value: 'all', label: '全部状态' }, { value: 'active', label: '有效' }, { value: 'revoked', label: '已撤销' }, { value: 'expired', label: '已过期' }]} theme={theme} className="w-full sm:w-32" />
              <div className="flex-1 min-w-[min(100%,200px)]"><SearchInput value={search} onChange={setSearch} placeholder="搜索名称或 scope…" theme={theme} /></div>
            </div>
          </div>
          <div className="flex-1 min-h-0 overflow-auto">
            {loading && tokens.length === 0 ? (
              <PageSkeleton type="table" />
            ) : tokens.length === 0 ? (
              <div className={`text-center py-12 text-sm ${textMuted(theme)}`}>
                {debouncedSearch || statusFilter !== 'all' ? '无匹配 Token' : '暂无 Token'}
              </div>
            ) : (
              <AnimatedList className="p-3 space-y-2">
                {tokens.map((t) => {
                  const ss = STATUS_STYLE[t.status] ?? STATUS_STYLE.expired;
                  return (
                    <motion.div key={t.id} className={`${bentoCardHover(theme)} p-4 flex items-center gap-4`}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`font-semibold ${textPrimary(theme)}`}>{t.name}</span>
                          <span className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${isDark ? ss.dark : ss.light}`}>{ss.label}</span>
                        </div>
                        <div className={`mt-0.5 flex min-w-0 flex-wrap items-baseline gap-x-1 text-xs ${textMuted(theme)}`}>
                          <div className={`max-w-full min-w-0 font-mono ${tableCellScrollInner}`}>{t.scopes.join(', ')}</div>
                          <span className="shrink-0 whitespace-nowrap">· 过期 {formatDateTime(t.expiresAt)}</span>
                        </div>
                      </div>
                      <div className="hidden lg:block text-right shrink-0">
                        <div className={`text-xs uppercase tracking-wider ${textMuted(theme)}`}>创建</div>
                        <div className={`whitespace-nowrap text-xs ${textSecondary(theme)}`}>{formatDateTime(t.createdAt)}</div>
                      </div>
                      {t.status === 'active' && (
                        <button type="button" onClick={() => setRevokeTarget(t.id)} className={`${btnGhost(theme)} !text-amber-500`}><Ban size={14} /> 撤销</button>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatedList>
            )}
          </div>
          {totalPages > 1 && (
            <div className={`px-4 py-3 border-t shrink-0 flex items-center justify-between ${isDark ? 'border-white/[0.06]' : 'border-slate-100'}`}>
              <span className={`text-sm ${textMuted(theme)}`}>共 {total} 条</span>
              <div className="flex items-center gap-2">
                <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className={`p-2 rounded-xl transition-colors ${page <= 1 ? (isDark ? 'text-slate-600' : 'text-slate-300') : (isDark ? 'text-slate-300 hover:bg-white/5' : 'text-slate-600 hover:bg-slate-100')}`}><ChevronLeft size={16} /></button>
                <span className={`text-xs font-medium ${textSecondary(theme)}`}>{page} / {totalPages}</span>
                <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className={`p-2 rounded-xl transition-colors ${page >= totalPages ? (isDark ? 'text-slate-600' : 'text-slate-300') : (isDark ? 'text-slate-300 hover:bg-white/5' : 'text-slate-600 hover:bg-slate-100')}`}><ChevronRight size={16} /></button>
              </div>
            </div>
          )}
        </div>
      </div>
      <ConfirmDialog open={!!revokeTarget} title="撤销 Token" message="确定撤销该 Token？客户端需重新登录。" confirmText="撤销" variant="warning" onConfirm={handleRevoke} onCancel={() => setRevokeTarget(null)} />
    </div>
  );
};
