import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Copy, Check, Ban, Zap, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import type { Theme, FontSize } from '../../types';
import { nativeInputClass } from '../../utils/formFieldClasses';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { Modal } from '../../components/common/Modal';
import { AnimatedList } from '../../components/common/AnimatedList';
import { SearchInput } from '../../components/common';
import { userMgmtService } from '../../api/services/user-mgmt.service';
import type { ApiKeyRecord } from '../../types/dto/user-mgmt';
import {
  pageBg, bentoCard, bentoCardHover, btnPrimary, btnSecondary, btnGhost,
  textPrimary, textSecondary, textMuted,
} from '../../utils/uiClasses';

interface ApiKeyListPageProps { theme: Theme; fontSize: FontSize; showMessage: (msg: string, type?: 'success' | 'error' | 'info') => void; breadcrumbSegments: string[]; }

const PAGE_SIZE = 20;

export const ApiKeyListPage: React.FC<ApiKeyListPageProps> = ({ theme, showMessage }) => {
  const isDark = theme === 'dark';
  const [keys, setKeys] = useState<ApiKeyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [revealedOnce, setRevealedOnce] = useState<{ full: string; prefix: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [page, setPage] = useState(1);
  const [revokeTarget, setRevokeTarget] = useState<string | null>(null);

  const fetchKeys = useCallback(async () => { setLoading(true); try { setKeys((await userMgmtService.listApiKeys()).list); } catch (err) { console.error(err); } finally { setLoading(false); } }, []);
  useEffect(() => { fetchKeys(); }, [fetchKeys]);

  const filtered = useMemo(() => { const q = search.trim().toLowerCase(); return keys.filter((k) => !q || k.name.toLowerCase().includes(q) || k.prefix.toLowerCase().includes(q)); }, [keys, search]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = useMemo(() => { const s = (page - 1) * PAGE_SIZE; return filtered.slice(s, s + PAGE_SIZE); }, [filtered, page]);

  const closeReveal = useCallback(() => { setRevealedOnce(null); setNewName(''); setCopied(false); setCreateOpen(false); }, []);

  const createKey = useCallback(async () => {
    if (!newName.trim()) { showMessage('请填写密钥名称', 'error'); return; }
    try { const r = await userMgmtService.createApiKey({ name: newName.trim(), scopes: ['*'] }); setRevealedOnce({ full: r.plainKey, prefix: r.prefix }); setCopied(false); showMessage('密钥已生成', 'success'); await fetchKeys(); }
    catch { showMessage('创建失败', 'error'); }
  }, [newName, showMessage, fetchKeys]);

  const copyFull = useCallback(async () => { if (!revealedOnce) return; try { await navigator.clipboard.writeText(revealedOnce.full); setCopied(true); showMessage('已复制到剪贴板', 'success'); } catch { showMessage('复制失败', 'error'); } }, [revealedOnce, showMessage]);

  const handleRevoke = useCallback(async () => { if (!revokeTarget) return; try { await userMgmtService.revokeApiKey(revokeTarget); showMessage('API Key 已撤销', 'info'); setRevokeTarget(null); setPage(1); await fetchKeys(); } catch { showMessage('撤销失败', 'error'); } }, [revokeTarget, showMessage, fetchKeys]);

  return (
    <div className={`flex-1 flex flex-col min-h-0 overflow-hidden transition-colors duration-300 ${pageBg(theme)}`}>
      <div className="w-full flex-1 min-h-0 flex flex-col px-2 sm:px-3 lg:px-4 py-2 sm:py-3">
        <div className={`${bentoCard(theme)} overflow-hidden flex-1 min-h-0 flex flex-col`}>
          <div className={`flex items-center justify-between px-6 py-4 border-b shrink-0 ${isDark ? 'border-white/[0.06]' : 'border-slate-100'}`}>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${isDark ? 'bg-amber-500/15' : 'bg-amber-50'}`}><Zap size={20} className={isDark ? 'text-amber-400' : 'text-amber-600'} /></div>
              <div>
                <h1 className={`text-lg font-bold ${textPrimary(theme)}`}>API Key 管理</h1>
                <span className={`text-xs ${textMuted(theme)}`}>完整密钥仅在创建时显示一次</span>
              </div>
            </div>
            <button type="button" onClick={() => { setCreateOpen(true); setNewName(''); setRevealedOnce(null); setCopied(false); }} className={btnPrimary}><Plus size={15} /> 创建 API Key</button>
          </div>
          <div className={`px-4 py-3 border-b shrink-0 ${isDark ? 'border-white/[0.06]' : 'border-slate-100'}`}>
            <SearchInput value={search} onChange={setSearch} placeholder="搜索名称或前缀…" theme={theme} />
          </div>
          <div className="flex-1 min-h-0 overflow-auto">
            {loading && keys.length === 0 ? (
              <div className="flex items-center justify-center py-12"><Loader2 size={24} className="animate-spin text-slate-400" /></div>
            ) : paginated.length === 0 ? (
              <div className={`text-center py-12 text-sm ${textMuted(theme)}`}>暂无 API Key</div>
            ) : (
              <AnimatedList className="p-3 space-y-2">
                {paginated.map((k) => (
                  <motion.div key={k.id} whileHover={{ y: -2 }} transition={{ type: 'spring', stiffness: 400, damping: 30 }} className={`${bentoCardHover(theme)} p-4 flex items-center gap-4`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`font-semibold ${textPrimary(theme)}`}>{k.name}</span>
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${k.status === 'active' ? (isDark ? 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20' : 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60') : (isDark ? 'bg-rose-500/10 text-rose-400 ring-1 ring-rose-500/20' : 'bg-rose-50 text-rose-700 ring-1 ring-rose-200/60')}`}>
                          {k.status === 'active' ? '有效' : '已撤销'}
                        </span>
                      </div>
                      <div className={`text-xs mt-0.5 font-mono ${textMuted(theme)}`}>{k.prefix}<span className="opacity-50">••••••••</span> · 创建于 {k.createdAt}</div>
                    </div>
                    {k.status === 'active' && (
                      <button type="button" onClick={() => setRevokeTarget(k.id)} className={`${btnGhost(theme)} !text-amber-500`}><Ban size={14} /> 撤销</button>
                    )}
                  </motion.div>
                ))}
              </AnimatedList>
            )}
          </div>
          {totalPages > 1 && (
            <div className={`px-4 py-3 border-t shrink-0 flex items-center justify-between ${isDark ? 'border-white/[0.06]' : 'border-slate-100'}`}>
              <span className={`text-sm ${textMuted(theme)}`}>共 {filtered.length} 条</span>
              <div className="flex items-center gap-2">
                <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className={`p-2 rounded-xl transition-colors ${page <= 1 ? (isDark ? 'text-slate-600' : 'text-slate-300') : (isDark ? 'text-slate-300 hover:bg-white/5' : 'text-slate-600 hover:bg-slate-100')}`}><ChevronLeft size={16} /></button>
                <span className={`text-xs font-medium ${textSecondary(theme)}`}>{page} / {totalPages}</span>
                <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className={`p-2 rounded-xl transition-colors ${page >= totalPages ? (isDark ? 'text-slate-600' : 'text-slate-300') : (isDark ? 'text-slate-300 hover:bg-white/5' : 'text-slate-600 hover:bg-slate-100')}`}><ChevronRight size={16} /></button>
              </div>
            </div>
          )}
        </div>
      </div>

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
            <p className="text-xs text-amber-500 font-medium mb-3">关闭此窗口后将无法再次查看完整密钥。</p>
            <div className={`rounded-xl border p-3 font-mono text-xs break-all ${isDark ? 'bg-white/[0.03] border-white/[0.06] text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'}`}>{revealedOnce.full}</div>
          </>
        ) : (
          <>
            <p className={`text-xs mb-3 ${textMuted(theme)}`}>生成后完整密钥仅展示一次，请妥善保存。</p>
            <label className={`text-xs font-semibold block mb-1 ${textSecondary(theme)}`}>名称</label>
            <input className={nativeInputClass(theme)} value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="如：教务中台-生产" autoFocus />
          </>
        )}
      </Modal>

      <ConfirmDialog open={!!revokeTarget} title="撤销 API Key" message="撤销后该 Key 将不可用，确定继续？" confirmText="撤销" variant="warning" onConfirm={handleRevoke} onCancel={() => setRevokeTarget(null)} />
    </div>
  );
};
