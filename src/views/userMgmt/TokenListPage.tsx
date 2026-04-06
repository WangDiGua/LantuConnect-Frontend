import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Ban, Shield } from 'lucide-react';
import type { Theme, FontSize } from '../../types';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { AnimatedList } from '../../components/common/AnimatedList';
import { SearchInput, FilterSelect, Pagination } from '../../components/common';
import { userMgmtService } from '../../api/services/user-mgmt.service';
import type { TokenRecord } from '../../types/dto/user-mgmt';
import {
  bentoCardHover, btnGhost,
  textPrimary, textSecondary, textMuted,
  tableCellScrollInner,
} from '../../utils/uiClasses';
import { formatDateTime } from '../../utils/formatDateTime';
import { PageSkeleton } from '../../components/common/PageSkeleton';
import { MgmtPageShell } from './MgmtPageShell';
import { useScrollPaginatedContentToTop } from '../../hooks/useScrollPaginatedContentToTop';

interface TokenListPageProps { theme: Theme; fontSize: FontSize; showMessage: (msg: string, type?: 'success' | 'error' | 'info') => void; breadcrumbSegments: string[]; }

const PAGE_SIZE = 20;

const STATUS_STYLE: Record<string, { light: string; dark: string; label: string }> = {
  active:  { light: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60', dark: 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20', label: '有效' },
  revoked: { light: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200/60',          dark: 'bg-rose-500/10 text-rose-400 ring-1 ring-rose-500/20',          label: '已撤销' },
  expired: { light: 'bg-slate-50 text-slate-600 ring-1 ring-slate-200/60',       dark: 'bg-slate-500/10 text-slate-400 ring-1 ring-slate-500/20',       label: '已过期' },
};

export const TokenListPage: React.FC<TokenListPageProps> = ({ theme, fontSize, showMessage, breadcrumbSegments }) => {
  const isDark = theme === 'dark';
  const [tokens, setTokens] = useState<TokenRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | TokenRecord['status']>('all');
  const [page, setPage] = useState(1);
  useScrollPaginatedContentToTop(page);
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

  const handleRevoke = async () => {
    if (!revokeTarget) return;
    const t = tokens.find((x) => x.id === revokeTarget);
    if (t?.status !== 'active') { showMessage('该 Token 已失效或撤销', 'info'); setRevokeTarget(null); return; }
    try { await userMgmtService.revokeToken(revokeTarget); showMessage('Token 已撤销', 'success'); setRevokeTarget(null); setPage(1); await fetchTokens(); }
    catch { showMessage('撤销失败', 'error'); }
  };

  return (
    <>
      <MgmtPageShell
        theme={theme}
        fontSize={fontSize}
        titleIcon={Shield}
        breadcrumbSegments={breadcrumbSegments}
        description="查看访问令牌与有效期"
        toolbar={
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <FilterSelect
              value={statusFilter}
              onChange={(v) => { setStatusFilter(v as typeof statusFilter); setPage(1); }}
              options={[
                { value: 'all', label: '全部状态' },
                { value: 'active', label: '有效' },
                { value: 'revoked', label: '已撤销' },
                { value: 'expired', label: '已过期' },
              ]}
              theme={theme}
              className="w-full sm:w-32"
            />
            <div className="flex-1 min-w-[min(100%,200px)]">
              <SearchInput value={search} onChange={setSearch} placeholder="搜索名称或 scope…" theme={theme} />
            </div>
          </div>
        }
      >
        <div className="px-4 sm:px-6 pb-6 flex flex-col min-h-0 flex-1">
          {loading && tokens.length === 0 ? (
            <PageSkeleton type="table" />
          ) : tokens.length === 0 ? (
            <div className={`text-center py-12 text-sm ${textMuted(theme)}`}>
              {debouncedSearch || statusFilter !== 'all' ? '无匹配 Token' : '暂无 Token'}
            </div>
          ) : (
            <AnimatedList className="space-y-2">
              {tokens.map((t) => {
                const ss = STATUS_STYLE[t.status] ?? STATUS_STYLE.expired;
                return (
                  <motion.div key={t.id} className={`${bentoCardHover(theme)} p-4 flex items-center gap-4`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`font-semibold truncate min-w-0 ${textPrimary(theme)}`} title={t.name}>{t.name}</span>
                        <span className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${isDark ? ss.dark : ss.light}`}>{ss.label}</span>
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
                      <button
                        type="button"
                        onClick={() => setRevokeTarget(t.id)}
                        className={`shrink-0 ${btnGhost(theme)} text-amber-600 dark:text-amber-400`}
                        aria-label={`撤销 Token：${t.name}`}
                      >
                        <Ban size={14} className="shrink-0" aria-hidden />
                        撤销
                      </button>
                    )}
                  </motion.div>
                );
              })}
            </AnimatedList>
          )}
          {total > 0 ? (
            <Pagination theme={theme} page={page} pageSize={PAGE_SIZE} total={total} onChange={setPage} />
          ) : null}
        </div>
      </MgmtPageShell>
      <ConfirmDialog open={!!revokeTarget} title="撤销 Token" message="确定撤销该 Token？客户端需重新登录。" confirmText="撤销" variant="warning" onConfirm={handleRevoke} onCancel={() => setRevokeTarget(null)} />
    </>
  );
};
