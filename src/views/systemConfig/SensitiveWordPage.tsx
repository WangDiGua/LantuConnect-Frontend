import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, Plus, Trash2, ShieldAlert, Braces, Upload } from 'lucide-react';
import { Theme, FontSize } from '../../types';
import { MgmtPageShell } from '../userMgmt/MgmtPageShell';
import { sensitiveWordService } from '../../api/services/sensitive-word.service';
import type { SensitiveWord, SensitiveWordImportResult } from '../../types/dto/sensitive-word';
import type { PaginatedData } from '../../types/api';
import { BentoCard } from '../../components/common/BentoCard';
import { PageSkeleton } from '../../components/common/PageSkeleton';
import { EmptyState } from '../../components/common/EmptyState';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { Modal } from '../../components/common/Modal';
import { nativeInputClass } from '../../utils/formFieldClasses';
import { btnPrimary, btnSecondary, textPrimary, textSecondary, textMuted } from '../../utils/uiClasses';
import { resolvePersonDisplay } from '../../utils/personDisplay';

interface Props {
  theme: Theme;
  fontSize: FontSize;
  showMessage: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

const INPUT_FOCUS = 'focus:ring-2 focus:ring-neutral-900/20 focus:border-neutral-900/35';

function parseBatchJson(input: string): string[] | null {
  try {
    const raw = JSON.parse(input);
    if (Array.isArray(raw)) {
      return raw.map((w) => String(w ?? '').trim()).filter(Boolean);
    }
    if (raw && Array.isArray(raw.words)) {
      return raw.words.map((w: unknown) => String(w ?? '').trim()).filter(Boolean);
    }
    return null;
  } catch {
    return null;
  }
}

export const SensitiveWordPage: React.FC<Props> = ({ theme, fontSize, showMessage }) => {
  const isDark = theme === 'dark';
  const inputCls = `${nativeInputClass(theme)} ${INPUT_FOCUS}`;

  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<PaginatedData<SensitiveWord> | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SensitiveWord | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [showAdd, setShowAdd] = useState(false);
  const [addWord, setAddWord] = useState('');
  const [addCategory, setAddCategory] = useState('');
  const [addSeverity, setAddSeverity] = useState(1);
  const [addSource, setAddSource] = useState('manual');
  const [adding, setAdding] = useState(false);
  const [showBatch, setShowBatch] = useState(false);
  const [batchJson, setBatchJson] = useState('{\n  "words": ["示例词1", "示例词2"]\n}');
  const [batchCategory, setBatchCategory] = useState('');
  const [batchSeverity, setBatchSeverity] = useState(1);
  const [batchSource, setBatchSource] = useState('manual');
  const [batching, setBatching] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importCategory, setImportCategory] = useState('');
  const [importSeverity, setImportSeverity] = useState(1);
  const [importSource, setImportSource] = useState('manual');
  const [importing, setImporting] = useState(false);
  const [latestImportResult, setLatestImportResult] = useState<SensitiveWordImportResult | null>(null);

  const fetchList = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await sensitiveWordService.list({ page: p, pageSize: 20 });
      setData(res);
    } catch (e) {
      showMessage(e instanceof Error ? e.message : '加载失败', 'error');
    } finally {
      setLoading(false);
    }
  }, [showMessage]);

  useEffect(() => { fetchList(page); }, [page, fetchList]);

  const handleAdd = async () => {
    if (!addWord.trim()) { showMessage('请填写敏感词', 'error'); return; }
    setAdding(true);
    try {
      await sensitiveWordService.create({
        word: addWord.trim(),
        category: addCategory.trim() || undefined,
        severity: addSeverity,
        source: addSource.trim() || undefined,
      });
      showMessage('已添加', 'success');
      setShowAdd(false);
      setAddWord('');
      setAddCategory('');
      setAddSeverity(1);
      setAddSource('manual');
      fetchList(page);
    } catch (e) {
      showMessage(e instanceof Error ? e.message : '添加失败', 'error');
    } finally {
      setAdding(false);
    }
  };

  const handleBatchCreate = async () => {
    const words = parseBatchJson(batchJson);
    if (!words || words.length === 0) {
      showMessage('请填写合法 JSON（数组或 { words: [] }）且至少包含一个词', 'error');
      return;
    }
    setBatching(true);
    try {
      const result = await sensitiveWordService.batchCreate({
        words,
        category: batchCategory.trim() || undefined,
        severity: batchSeverity,
        source: batchSource.trim() || undefined,
      });
      setLatestImportResult(result);
      showMessage(`批量新增完成，新增 ${result.added} 条`, 'success');
      setShowBatch(false);
      await fetchList(page);
    } catch (e) {
      showMessage(e instanceof Error ? e.message : '批量新增失败', 'error');
    } finally {
      setBatching(false);
    }
  };

  const handleImport = async () => {
    if (!importFile) {
      showMessage('请先选择导入文件', 'error');
      return;
    }
    setImporting(true);
    try {
      const result = await sensitiveWordService.import(importFile, {
        category: importCategory.trim() || undefined,
        severity: importSeverity,
        source: importSource.trim() || undefined,
      });
      setLatestImportResult(result);
      showMessage(`导入完成，新增 ${result.added} 条`, 'success');
      setShowImport(false);
      setImportFile(null);
      await fetchList(page);
    } catch (e) {
      showMessage(e instanceof Error ? e.message : '文件导入失败', 'error');
    } finally {
      setImporting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await sensitiveWordService.remove(deleteTarget.id);
      showMessage('已删除', 'success');
      setDeleteTarget(null);
      fetchList(page);
    } catch (e) {
      showMessage(e instanceof Error ? e.message : '删除失败', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const handleToggle = async (item: SensitiveWord) => {
    try {
      await sensitiveWordService.update(item.id, { enabled: !item.enabled });
      showMessage(item.enabled ? '已禁用' : '已启用', 'success');
      fetchList(page);
    } catch (e) {
      showMessage(e instanceof Error ? e.message : '操作失败', 'error');
    }
  };

  if (loading && !data) {
    return (
      <MgmtPageShell theme={theme} fontSize={fontSize} titleIcon={ShieldAlert} breadcrumbSegments={['系统配置', '敏感词管理']}>
        <PageSkeleton type="table" />
      </MgmtPageShell>
    );
  }

  const list = data?.list ?? [];

  return (
    <MgmtPageShell
      theme={theme}
      fontSize={fontSize}
      titleIcon={ShieldAlert}
      breadcrumbSegments={['系统配置', '敏感词管理']}
      toolbar={<div className="flex items-center gap-2">
        <button type="button" className={btnSecondary(theme)} onClick={() => setShowBatch(true)}>
          <Braces size={14} /> JSON 批量新增
        </button>
        <button type="button" className={btnSecondary(theme)} onClick={() => setShowImport(true)}>
          <Upload size={14} /> 文件导入
        </button>
        <button type="button" className={btnPrimary} onClick={() => setShowAdd(true)}>
          <Plus size={14} /> 单条新增
        </button>
      </div>}
    >
      <div className="px-4 sm:px-6 pb-6">
        {latestImportResult && (
          <BentoCard theme={theme} padding="sm" className="mb-4">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
              <div className={`rounded-lg px-3 py-2 ${isDark ? 'bg-white/[0.04]' : 'bg-slate-50'}`}>新增入库：<span className={textPrimary(theme)}>{latestImportResult.added}</span></div>
              <div className={`rounded-lg px-3 py-2 ${isDark ? 'bg-white/[0.04]' : 'bg-slate-50'}`}>有效候选：<span className={textPrimary(theme)}>{latestImportResult.candidates}</span></div>
              <div className={`rounded-lg px-3 py-2 ${isDark ? 'bg-white/[0.04]' : 'bg-slate-50'}`}>跳过空行/注释：<span className={textPrimary(theme)}>{latestImportResult.skippedBlankOrComment}</span></div>
              <div className={`rounded-lg px-3 py-2 ${isDark ? 'bg-white/[0.04]' : 'bg-slate-50'}`}>跳过超长：<span className={textPrimary(theme)}>{latestImportResult.skippedTooLong}</span></div>
              <div className={`rounded-lg px-3 py-2 ${isDark ? 'bg-white/[0.04]' : 'bg-slate-50'}`}>跳过重复：<span className={textPrimary(theme)}>{latestImportResult.skippedDuplicate}</span></div>
            </div>
          </BentoCard>
        )}
        {list.length === 0 && !showAdd ? (
          <EmptyState title="暂无敏感词" description={'点击「新增」添加敏感词规则'} />
        ) : (
          <BentoCard theme={theme} padding="sm">
            <table className="w-full text-sm">
              <thead>
                <tr className={`border-b ${isDark ? 'border-white/[0.06]' : 'border-slate-100'}`}>
                  <th className={`px-4 py-3 text-left font-medium ${textSecondary(theme)}`}>敏感词</th>
                  <th className={`px-4 py-3 text-left font-medium ${textSecondary(theme)}`}>分类</th>
                  <th className={`px-4 py-3 text-left font-medium ${textSecondary(theme)}`}>状态</th>
                  <th className={`px-4 py-3 text-left font-medium ${textSecondary(theme)}`}>创建人</th>
                  <th className={`px-4 py-3 text-right font-medium ${textSecondary(theme)}`}>操作</th>
                </tr>
              </thead>
              <tbody>
                {list.map((item) => (
                  <tr key={item.id} className={`border-b last:border-0 ${isDark ? 'border-white/[0.04]' : 'border-slate-50'}`}>
                    <td className={`px-4 py-3 font-mono ${textPrimary(theme)}`}>{item.word}</td>
                    <td className={`px-4 py-3 ${textMuted(theme)}`}>{item.category}</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => handleToggle(item)}
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium cursor-pointer ${
                          item.enabled
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : 'bg-slate-500/10 text-slate-500'
                        }`}
                      >
                        {item.enabled ? '启用' : '禁用'}
                      </button>
                    </td>
                    <td className={`px-4 py-3 ${textMuted(theme)}`}>
                      {resolvePersonDisplay({ names: [item.createdByName], usernames: [item.createdBy] })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 rounded-lg bg-rose-500/10 px-2 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-500/20 dark:text-rose-400"
                        onClick={() => setDeleteTarget(item)}
                      >
                        <Trash2 size={13} /> 删除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </BentoCard>
        )}

        {(data?.total ?? 0) > 20 && (
          <div className="flex justify-center gap-2 mt-4">
            <button type="button" className={btnSecondary(theme)} disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>上一页</button>
            <span className={`flex items-center text-sm ${textMuted(theme)}`}>第 {page} 页</span>
            <button type="button" className={btnSecondary(theme)} disabled={list.length < 20} onClick={() => setPage((p) => p + 1)}>下一页</button>
          </div>
        )}
      </div>

      <Modal
        open={showAdd}
        onClose={() => { setShowAdd(false); setAddWord(''); setAddCategory(''); setAddSeverity(1); setAddSource('manual'); }}
        title="新增敏感词"
        theme={theme}
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" className={btnSecondary(theme)} onClick={() => { setShowAdd(false); setAddWord(''); setAddCategory(''); setAddSeverity(1); setAddSource('manual'); }}>取消</button>
            <button type="button" className={`${btnPrimary} disabled:opacity-50`} disabled={adding} onClick={handleAdd}>
              {adding ? <><Loader2 size={14} className="animate-spin" /> 添加中…</> : '添加'}
            </button>
          </div>
        }
      >
        <div className="space-y-3">
          <div>
            <label className={`text-sm font-medium ${textSecondary(theme)} mb-1 block`}>敏感词</label>
            <input className={inputCls} value={addWord} onChange={(e) => setAddWord(e.target.value)} placeholder="请输入敏感词" />
          </div>
          <div>
            <label className={`text-sm font-medium ${textSecondary(theme)} mb-1 block`}>分类</label>
            <input className={inputCls} value={addCategory} onChange={(e) => setAddCategory(e.target.value)} placeholder="默认" />
          </div>
          <div>
            <label className={`text-sm font-medium ${textSecondary(theme)} mb-1 block`}>严重级别（severity）</label>
            <input type="number" min={1} max={10} className={inputCls} value={addSeverity} onChange={(e) => setAddSeverity(Math.max(1, Number(e.target.value) || 1))} />
          </div>
          <div>
            <label className={`text-sm font-medium ${textSecondary(theme)} mb-1 block`}>来源（source）</label>
            <input className={inputCls} value={addSource} onChange={(e) => setAddSource(e.target.value)} placeholder="manual" />
          </div>
        </div>
      </Modal>

      <Modal
        open={showBatch}
        onClose={() => setShowBatch(false)}
        title="JSON 批量新增"
        theme={theme}
        size="md"
        footer={<div className="flex justify-end gap-2">
          <button type="button" className={btnSecondary(theme)} onClick={() => setShowBatch(false)}>取消</button>
          <button type="button" className={`${btnPrimary} disabled:opacity-50`} disabled={batching} onClick={handleBatchCreate}>
            {batching ? <><Loader2 size={14} className="animate-spin" /> 提交中…</> : '批量提交'}
          </button>
        </div>}
      >
        <div className="space-y-3">
          <div>
            <label className={`text-sm font-medium ${textSecondary(theme)} mb-1 block`}>JSON 内容</label>
            <textarea
              rows={8}
              className={`${inputCls} font-mono text-xs resize-none`}
              value={batchJson}
              onChange={(e) => setBatchJson(e.target.value)}
              placeholder='{"words":["词1","词2"]} 或 ["词1","词2"]'
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <input className={inputCls} value={batchCategory} onChange={(e) => setBatchCategory(e.target.value)} placeholder="category（可选）" />
            <input type="number" min={1} max={10} className={inputCls} value={batchSeverity} onChange={(e) => setBatchSeverity(Math.max(1, Number(e.target.value) || 1))} placeholder="severity" />
            <input className={inputCls} value={batchSource} onChange={(e) => setBatchSource(e.target.value)} placeholder="source（可选）" />
          </div>
        </div>
      </Modal>

      <Modal
        open={showImport}
        onClose={() => { setShowImport(false); setImportFile(null); }}
        title="文件导入（txt/csv/xlsx）"
        theme={theme}
        size="sm"
        footer={<div className="flex justify-end gap-2">
          <button type="button" className={btnSecondary(theme)} onClick={() => { setShowImport(false); setImportFile(null); }}>取消</button>
          <button type="button" className={`${btnPrimary} disabled:opacity-50`} disabled={importing} onClick={handleImport}>
            {importing ? <><Loader2 size={14} className="animate-spin" /> 导入中…</> : '开始导入'}
          </button>
        </div>}
      >
        <div className="space-y-3">
          <div>
            <label className={`text-sm font-medium ${textSecondary(theme)} mb-1 block`}>导入文件</label>
            <input
              type="file"
              accept=".txt,.csv,.xlsx"
              className={inputCls}
              onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
            />
            <p className={`mt-1 text-[11px] ${textMuted(theme)}`}>支持 txt/csv/xlsx；txt 每行一个词，# 开头为注释。</p>
          </div>
          <input className={inputCls} value={importCategory} onChange={(e) => setImportCategory(e.target.value)} placeholder="category（可选）" />
          <input type="number" min={1} max={10} className={inputCls} value={importSeverity} onChange={(e) => setImportSeverity(Math.max(1, Number(e.target.value) || 1))} placeholder="severity（可选）" />
          <input className={inputCls} value={importSource} onChange={(e) => setImportSource(e.target.value)} placeholder="source（可选）" />
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="删除敏感词"
        message={`确认删除「${deleteTarget?.word ?? ''}」？`}
        variant="warning"
        confirmText="删除"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </MgmtPageShell>
  );
};
