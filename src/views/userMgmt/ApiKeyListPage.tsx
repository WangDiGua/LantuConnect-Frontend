import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { Plus, Copy, Check, Ban, Zap } from 'lucide-react';
import type { Theme, FontSize } from '../../types';
import { nativeInputClass } from '../../utils/formFieldClasses';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { Modal } from '../../components/common/Modal';
import { SearchInput, Pagination, TableCellEllipsis } from '../../components/common';
import { MgmtDataTable } from '../../components/management/MgmtDataTable';
import type { MgmtDataTableColumn } from '../../components/management/MgmtDataTable';
import { MgmtBatchToolbar } from '../../components/management/MgmtBatchToolbar';
import { userMgmtService } from '../../api/services/user-mgmt.service';
import type { ApiKeyRecord } from '../../types/dto/user-mgmt';
import {
  btnPrimary, btnSecondary, btnGhost,
  fieldErrorText, inputBaseError,
  textPrimary, textSecondary, textMuted,
  tableCellActionChipsRow,
} from '../../utils/uiClasses';
import { PageError } from '../../components/common/PageError';
import { PageSkeleton } from '../../components/common/PageSkeleton';
import { formatDateTime } from '../../utils/formatDateTime';
import { MgmtPageShell } from './MgmtPageShell';
import { resolvePersonDisplay } from '../../utils/personDisplay';
import { useScrollPaginatedContentToTop } from '../../hooks/useScrollPaginatedContentToTop';

interface ApiKeyListPageProps { theme: Theme; fontSize: FontSize; showMessage: (msg: string, type?: 'success' | 'error' | 'info') => void; breadcrumbSegments: string[]; }

const PAGE_SIZE = 20;

const API_KEY_DESC = '完整密钥仅在创建时显示一次';

export const ApiKeyListPage: React.FC<ApiKeyListPageProps> = ({ theme, fontSize, showMessage, breadcrumbSegments }) => {
  const isDark = theme === 'dark';
  const [keys, setKeys] = useState<ApiKeyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<Error | null>(null);
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [revealedOnce, setRevealedOnce] = useState<{ full: string; prefix: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [page, setPage] = useState(1);
  useScrollPaginatedContentToTop(page);
  const [revokeTarget, setRevokeTarget] = useState<string | null>(null);
  const [batchRevokeConfirm, setBatchRevokeConfirm] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [batchBusy, setBatchBusy] = useState(false);
  const [newNameError, setNewNameError] = useState('');

  const clearSelection = useCallback(() => setSelectedKeys(new Set()), []);

  useEffect(() => {
    clearSelection();
  }, [page, search, clearSelection]);

  const selectedActiveKeyIds = useMemo(
    () =>
      [...selectedKeys].filter((id) => {
        const row = filtered.find((k) => k.id === id);
        return row?.status === 'active';
      }),
    [filtered, selectedKeys],
  );

  const fetchKeys = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await userMgmtService.listApiKeys();
      setKeys(Array.isArray(res?.list) ? res.list : []);
    } catch (err) {
      setLoadError(err instanceof Error ? err : new Error('加载 API Key 列表失败'));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { fetchKeys(); }, [fetchKeys]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = Array.isArray(keys) ? keys : [];
    return list.filter(
      (k) => !q || (k.name ?? '').toLowerCase().includes(q) || (k.prefix ?? '').toLowerCase().includes(q),
    );
  }, [keys, search]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = useMemo(() => { const s = (page - 1) * PAGE_SIZE; return filtered.slice(s, s + PAGE_SIZE); }, [filtered, page]);
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const closeReveal = useCallback(() => {
    setRevealedOnce(null);
    setNewName('');
    setNewNameError('');
    setCopied(false);
    setCreateOpen(false);
  }, []);

  const createKey = useCallback(async () => {
    if (!newName.trim()) {
      setNewNameError('请填写密钥名称');
      return;
    }
    setNewNameError('');
    try { const r = await userMgmtService.createApiKey({ name: newName.trim(), scopes: ['*'] }); setRevealedOnce({ full: r.plainKey, prefix: r.prefix }); setCopied(false); showMessage('密钥已生成', 'success'); await fetchKeys(); }
    catch { showMessage('创建失败', 'error'); }
  }, [newName, showMessage, fetchKeys]);

  const copyFull = useCallback(async () => { if (!revealedOnce) return; try { await navigator.clipboard.writeText(revealedOnce.full); setCopied(true); showMessage('已复制到剪贴板', 'success'); } catch { showMessage('复制失败', 'error'); } }, [revealedOnce, showMessage]);

  const handleRevoke = useCallback(async () => { if (!revokeTarget) return; try { await userMgmtService.revokeApiKey(revokeTarget); showMessage('API Key 已撤销', 'info'); setRevokeTarget(null); setPage(1); await fetchKeys(); } catch { showMessage('撤销失败', 'error'); } }, [revokeTarget, showMessage, fetchKeys]);

  const runBatchRevoke = useCallback(async () => {
    if (!selectedActiveKeyIds.length) return;
    setBatchBusy(true);
    try {
      await userMgmtService.batchRevokeApiKeys(selectedActiveKeyIds);
      showMessage(`已批量撤销 ${selectedActiveKeyIds.length} 个密钥`, 'info');
      setBatchRevokeConfirm(false);
      clearSelection();
      setPage(1);
      await fetchKeys();
    } catch (e) {
      showMessage(e instanceof Error ? e.message : '批量撤销失败', 'error');
    } finally {
      setBatchBusy(false);
    }
  }, [selectedActiveKeyIds, showMessage, fetchKeys, clearSelection]);

  const apiKeyColumns = useMemo<MgmtDataTableColumn<ApiKeyRecord>[]>(
    () => [
      {
        id: 'name',
        header: '名称',
        cellClassName: 'font-medium max-w-[12rem]',
        cell: (k) => <span className={`block truncate ${textPrimary(theme)}`} title={k.name}>{k.name}</span>,
      },
      {
        id: 'keyId',
        header: 'Key ID',
        cellClassName: 'max-w-[140px] min-w-0 align-middle',
        cell: (k) => <TableCellEllipsis text={String(k.id)} mono className={textSecondary(theme)} />,
      },
      {
        id: 'masked',
        header: '密钥',
        cellClassName: 'max-w-[200px] min-w-0 align-middle',
        cell: (k) => (
          <TableCellEllipsis text={k.maskedKey || `${k.prefix}••••••••`} mono className={textSecondary(theme)} />
        ),
      },
      {
        id: 'status',
        header: '状态',
        cellClassName: 'align-middle',
        cell: (k) => (
          <span
            className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${
              k.status === 'active'
                ? isDark
                  ? 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20'
                  : 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60'
                : isDark
                  ? 'bg-rose-500/10 text-rose-400 ring-1 ring-rose-500/20'
                  : 'bg-rose-50 text-rose-700 ring-1 ring-rose-200/60'
            }`}
          >
            {k.status === 'active' ? '有效' : k.status === 'expired' ? '已过期' : '已撤销'}
          </span>
        ),
      },
      {
        id: 'scopes',
        header: '权限',
        cellClassName: 'max-w-[min(260px,100%)] align-middle',
        cell: (k) =>
          k.scopes?.length ? (
            <div className={tableCellActionChipsRow()}>
              {k.scopes.map((s) => (
                <span
                  key={s}
                  className={`shrink-0 rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap font-mono ${
                    isDark ? 'border-white/[0.08] bg-white/[0.06]' : 'border-slate-200/80 bg-slate-50'
                  }`}
                >
                  {s}
                </span>
              ))}
            </div>
          ) : (
            '—'
          ),
      },
      {
        id: 'creator',
        header: '创建者',
        cell: (k) => <span className={textSecondary(theme)}>{resolvePersonDisplay({ names: [k.createdByName], usernames: [k.createdBy] })}</span>,
      },
      {
        id: 'createdAt',
        header: '创建时间',
        cell: (k) => <span className={`whitespace-nowrap ${textSecondary(theme)}`}>{formatDateTime(k.createdAt)}</span>,
      },
      {
        id: 'expires',
        header: '过期时间',
        cell: (k) => <span className={`whitespace-nowrap ${textSecondary(theme)}`}>{formatDateTime(k.expiresAt)}</span>,
      },
      {
        id: 'lastUsed',
        header: '最后使用',
        cell: (k) => <span className={`whitespace-nowrap ${textSecondary(theme)}`}>{formatDateTime(k.lastUsedAt)}</span>,
      },
      {
        id: 'calls',
        header: '调用次数',
        cell: (k) => <span className={textSecondary(theme)}>{k.callCount ?? 0}</span>,
      },
      {
        id: 'actions',
        header: '操作',
        headerClassName: 'text-right',
        cellClassName: 'text-right',
        cellNowrap: true,
        cell: (k) =>
          k.status === 'active' ? (
            <button type="button" onClick={() => setRevokeTarget(k.id)} className={`${btnGhost(theme)} text-amber-600 dark:text-amber-400`} aria-label={`撤销 API Key：${k.name}`}>
              <Ban size={14} aria-hidden /> 撤销
            </button>
          ) : null,
      },
    ],
    [theme, isDark],
  );

  return (
    <>
      <MgmtPageShell
        theme={theme}
        fontSize={fontSize}
        titleIcon={Zap}
        breadcrumbSegments={breadcrumbSegments}
        description={API_KEY_DESC}
        toolbar={
          <div className="flex flex-wrap items-center gap-2 justify-between min-w-0">
            <div className="min-w-0 flex-1 max-w-xl">
              <SearchInput value={search} onChange={setSearch} placeholder="搜索名称或前缀…" theme={theme} />
            </div>
            <button
              type="button"
              onClick={() => {
              setCreateOpen(true);
              setNewName('');
              setNewNameError('');
              setRevealedOnce(null);
              setCopied(false);
            }}
              className={`shrink-0 ${btnPrimary}`}
              aria-label="创建新的 API Key"
            >
              <Plus size={15} aria-hidden /> 创建 API Key
            </button>
          </div>
        }
      >
        <div className="px-4 sm:px-6 pb-6 flex flex-col min-h-0 flex-1">
          <div
            className={`mb-4 shrink-0 rounded-xl border px-3 py-2 text-xs ${
              isDark ? 'border-amber-500/25 bg-amber-500/[0.07] text-amber-100/90' : 'border-amber-200 bg-amber-50 text-amber-950'
            }`}
          >
            <p className="font-semibold">管理员 · API Key（/user-mgmt/api-keys）</p>
            <p className={`mt-1 ${textMuted(theme)}`}>
              创建响应中的完整明文字段用于 <span className="font-mono">X-Api-Key</span>；列表字段不可充当密钥。个人用户请用偏好设置创建。细则见开发者 <span className="font-mono">API 文档</span> 页。
            </p>
          </div>
          <div className="min-h-0 flex-1 overflow-x-auto">
            {loading && keys.length === 0 ? (
              <PageSkeleton type="table" />
            ) : loadError ? (
              <PageError error={loadError} onRetry={fetchKeys} retryLabel="重试加载 API Key" />
            ) : paginated.length === 0 ? (
              <div className={`text-center py-12 text-sm ${textMuted(theme)}`}>暂无 API Key</div>
            ) : (
              <>
                <MgmtBatchToolbar theme={theme} count={selectedKeys.size} onClear={clearSelection}>
                  <button
                    type="button"
                    disabled={batchBusy || selectedActiveKeyIds.length === 0}
                    className={`${btnGhost(theme)} text-amber-600 dark:text-amber-400`}
                    onClick={() => setBatchRevokeConfirm(true)}
                  >
                    批量撤销（仅有效）
                  </button>
                </MgmtBatchToolbar>
                <MgmtDataTable<ApiKeyRecord>
                  theme={theme}
                  surface="plain"
                  minWidth="1100px"
                  columns={apiKeyColumns}
                  rows={paginated}
                  getRowKey={(k) => k.id}
                  selection={{
                    selectedKeys,
                    onSelectionChange: setSelectedKeys,
                    getSelectable: (k) => k.status === 'active',
                  }}
                />
              </>
            )}
          </div>
          <Pagination theme={theme} page={page} pageSize={PAGE_SIZE} total={filtered.length} onChange={setPage} />
        </div>
      </MgmtPageShell>

      {/* Create / Reveal Modal */}
      <Modal open={createOpen || !!revealedOnce} onClose={revealedOnce ? () => {} : closeReveal} title={revealedOnce ? '请保存您的密钥' : '新建 API Key'} theme={theme} size="sm" closeOnBackdrop={!revealedOnce} footer={
        revealedOnce ? (
          <><button type="button" className={btnPrimary} onClick={copyFull}>{copied ? <><Check size={14} /> 已复制</> : <><Copy size={14} /> 复制密钥</>}</button><button type="button" className={btnSecondary(theme)} onClick={closeReveal}>我已保存</button></>
        ) : (
          <><button type="button" className={btnSecondary(theme)} onClick={closeReveal}>取消</button><button type="button" className={btnPrimary} onClick={createKey}>生成密钥</button></>
        )
      }>
        {revealedOnce ? (
          <>
            <p className="text-xs text-amber-500 font-medium mb-3">关闭后无法再次查看。请立即复制保存；请求头用法见 API 文档。</p>
            <div className={`rounded-xl border p-3 font-mono text-xs break-all ${isDark ? 'bg-white/[0.03] border-white/[0.06] text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'}`}>{revealedOnce.full}</div>
          </>
        ) : (
          <>
            <p className={`text-xs mb-3 ${textMuted(theme)}`}>完整密钥仅在此次响应返回一次，请保存好。</p>
            <label className={`text-xs font-semibold block mb-1 ${textSecondary(theme)}`}>名称</label>
            <input
              className={`${nativeInputClass(theme)}${newNameError ? ` ${inputBaseError()}` : ''}`}
              value={newName}
              onChange={(e) => {
                setNewName(e.target.value);
                setNewNameError('');
              }}
              placeholder="如：教务中台-生产"
              autoFocus
              aria-invalid={!!newNameError}
            />
            {newNameError ? (
              <p className={`mt-1 ${fieldErrorText()} text-xs`} role="alert">
                {newNameError}
              </p>
            ) : null}
          </>
        )}
      </Modal>

      <ConfirmDialog open={!!revokeTarget} title="撤销 API Key" message="撤销后该 Key 将不可用，确定继续？" confirmText="撤销" variant="warning" onConfirm={handleRevoke} onCancel={() => setRevokeTarget(null)} />
      <ConfirmDialog
        open={batchRevokeConfirm}
        title="批量撤销 API Key"
        message={`将撤销当前选中范围内有效的 ${selectedActiveKeyIds.length} 个密钥，确定继续？`}
        variant="warning"
        confirmText="撤销"
        loading={batchBusy}
        onConfirm={() => void runBatchRevoke()}
        onCancel={() => setBatchRevokeConfirm(false)}
      />
    </>
  );
};
