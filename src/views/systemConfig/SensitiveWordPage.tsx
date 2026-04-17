import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Loader2, PencilLine, Plus, Power, ShieldAlert, Trash2, Braces, Upload } from 'lucide-react';
import { Theme, FontSize } from '../../types';
import { MgmtPageShell } from '../userMgmt/MgmtPageShell';
import { sensitiveWordService } from '../../api/services/sensitive-word.service';
import type { SensitiveWord, SensitiveWordCategoryCount, SensitiveWordImportResult } from '../../types/dto/sensitive-word';
import {
  DEFAULT_SENSITIVE_WORD_CATEGORY,
  DEFAULT_SENSITIVE_WORD_SEVERITY,
  DEFAULT_SENSITIVE_WORD_SOURCE_BATCH,
  DEFAULT_SENSITIVE_WORD_SOURCE_IMPORT,
  DEFAULT_SENSITIVE_WORD_SOURCE_MANUAL,
  SENSITIVE_WORD_CATEGORY_OPTIONS,
  SENSITIVE_WORD_SEVERITY_OPTIONS,
  SENSITIVE_WORD_SOURCE_OPTIONS,
  formatSensitiveWordCategoryLabel,
  formatSensitiveWordSeverityLabel,
  formatSensitiveWordSourceLabel,
  isSensitiveWordPresetCategory,
  isSensitiveWordPresetSource,
} from '../../types/dto/sensitive-word';
import type { PaginatedData } from '../../types/api';
import { BentoCard } from '../../components/common/BentoCard';
import { LantuSelect } from '../../components/common/LantuSelect';
import { PageSkeleton } from '../../components/common/PageSkeleton';
import { MgmtDataTable } from '../../components/management/MgmtDataTable';
import type { MgmtDataTableColumn } from '../../components/management/MgmtDataTable';
import { MgmtBatchToolbar } from '../../components/management/MgmtBatchToolbar';
import { EmptyState } from '../../components/common/EmptyState';
import { Pagination } from '../../components/common/Pagination';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { Modal } from '../../components/common/Modal';
import { nativeInputClass } from '../../utils/formFieldClasses';
import {
  btnPrimary,
  btnSecondary,
  fieldErrorText,
  inputBaseError,
  mgmtTableActionDanger,
  mgmtTableActionGhost,
  mgmtTableActionPositive,
  textPrimary,
  textSecondary,
  textMuted,
} from '../../utils/uiClasses';
import { TOOLBAR_ROW_LIST } from '../../utils/toolbarFieldClasses';
import { resolvePersonDisplay } from '../../utils/personDisplay';
import { AutoHeightTextarea } from '../../components/common/AutoHeightTextarea';
import { useScrollPaginatedContentToTop } from '../../hooks/useScrollPaginatedContentToTop';
import { RowActionGroup } from '../../components/management/RowActionGroup';

interface Props {
  theme: Theme;
  fontSize: FontSize;
  showMessage: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

const INPUT_FOCUS = 'focus:ring-2 focus:ring-neutral-900/20 focus:border-neutral-900/35';
const SENSITIVE_PAGE_SIZE = 20;
const PAGE_DESCRIPTION =
  '维护平台敏感词规则，支持批量导入与启用控制。「分类」与公告「类型」相同：固定下拉、中文展示；仅服务于敏感词业务，与资源 Tag、五类资源目录无关。历史库中非预设值可在筛选与编辑中查看并改回预设项。';

const ENABLED_FILTER_OPTIONS = [
  { value: '', label: '全部状态' },
  { value: 'true', label: '启用' },
  { value: 'false', label: '禁用' },
];

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
  useScrollPaginatedContentToTop(page);
  const [data, setData] = useState<PaginatedData<SensitiveWord> | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SensitiveWord | null>(null);
  const [batchDeleteConfirm, setBatchDeleteConfirm] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [batchBusy, setBatchBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [showAdd, setShowAdd] = useState(false);
  const [addWord, setAddWord] = useState('');
  const [addCategory, setAddCategory] = useState<string>(DEFAULT_SENSITIVE_WORD_CATEGORY);
  const [addSeverity, setAddSeverity] = useState(DEFAULT_SENSITIVE_WORD_SEVERITY);
  const [addSource, setAddSource] = useState<string>(DEFAULT_SENSITIVE_WORD_SOURCE_MANUAL);
  const [adding, setAdding] = useState(false);
  const [showBatch, setShowBatch] = useState(false);
  const [batchJson, setBatchJson] = useState('{\n  "words": ["示例词1", "示例词2"]\n}');
  const [batchCategory, setBatchCategory] = useState<string>(DEFAULT_SENSITIVE_WORD_CATEGORY);
  const [batchSeverity, setBatchSeverity] = useState(DEFAULT_SENSITIVE_WORD_SEVERITY);
  const [batchSource, setBatchSource] = useState<string>(DEFAULT_SENSITIVE_WORD_SOURCE_BATCH);
  const [batching, setBatching] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importCategory, setImportCategory] = useState<string>(DEFAULT_SENSITIVE_WORD_CATEGORY);
  const [importSeverity, setImportSeverity] = useState(DEFAULT_SENSITIVE_WORD_SEVERITY);
  const [importSource, setImportSource] = useState<string>(DEFAULT_SENSITIVE_WORD_SOURCE_IMPORT);
  const [importing, setImporting] = useState(false);
  const [latestImportResult, setLatestImportResult] = useState<SensitiveWordImportResult | null>(null);
  const [addWordError, setAddWordError] = useState('');
  const [batchJsonError, setBatchJsonError] = useState('');
  const [importFileError, setImportFileError] = useState('');

  const [filterKeyword, setFilterKeyword] = useState('');
  const [debouncedKeyword, setDebouncedKeyword] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterEnabled, setFilterEnabled] = useState('');
  const [categoryOptions, setCategoryOptions] = useState<SensitiveWordCategoryCount[]>([]);

  const [editingItem, setEditingItem] = useState<SensitiveWord | null>(null);
  const [editCategory, setEditCategory] = useState('');
  const [editSeverity, setEditSeverity] = useState(DEFAULT_SENSITIVE_WORD_SEVERITY);
  const [editSource, setEditSource] = useState<string>(DEFAULT_SENSITIVE_WORD_SOURCE_MANUAL);
  const [editEnabled, setEditEnabled] = useState(true);
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedKeyword(filterKeyword.trim()), 300);
    return () => window.clearTimeout(id);
  }, [filterKeyword]);

  useEffect(() => {
    setPage(1);
  }, [debouncedKeyword, filterCategory, filterEnabled]);

  const clearSelection = useCallback(() => setSelectedKeys(new Set()), []);

  useEffect(() => {
    clearSelection();
  }, [page, debouncedKeyword, filterCategory, filterEnabled, clearSelection]);

  const categoryFilterSelectOptions = useMemo(
    () => [
      { value: '', label: '全部分类' },
      ...categoryOptions.map((c) => {
        const name = formatSensitiveWordCategoryLabel(c.category);
        const label = c.count > 0 ? `${name}（${c.count}）` : name;
        return { value: c.category, label };
      }),
    ],
    [categoryOptions],
  );

  const editCategorySelectOptions = useMemo(() => {
    const cur = (editingItem?.category ?? '').trim();
    const opts = [...SENSITIVE_WORD_CATEGORY_OPTIONS];
    if (cur && !isSensitiveWordPresetCategory(cur)) {
      return [...opts, { value: cur, label: `${cur}（历史值）` }];
    }
    return opts;
  }, [editingItem?.category]);

  const editSeveritySelectOptions = useMemo(() => {
    const base = [...SENSITIVE_WORD_SEVERITY_OPTIONS];
    if (!editingItem) return base;
    const raw = editingItem.severity;
    const n = raw != null ? Math.round(Number(raw)) : Number.NaN;
    if (!Number.isFinite(n) || (n >= 1 && n <= 10)) return base;
    return [...base, { value: String(n), label: `${n}（历史值）` }];
  }, [editingItem?.severity]);

  const editSourceSelectOptions = useMemo(() => {
    const cur = (editingItem?.source ?? '').trim();
    const opts = [...SENSITIVE_WORD_SOURCE_OPTIONS];
    if (cur && !isSensitiveWordPresetSource(cur)) {
      return [...opts, { value: cur, label: `${cur}（历史值）` }];
    }
    return opts;
  }, [editingItem?.source]);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const enabledParam =
        filterEnabled === 'true' ? true : filterEnabled === 'false' ? false : undefined;
      const res = await sensitiveWordService.list({
        page,
        pageSize: SENSITIVE_PAGE_SIZE,
        ...(debouncedKeyword ? { keyword: debouncedKeyword } : {}),
        ...(filterCategory ? { category: filterCategory } : {}),
        ...(enabledParam !== undefined ? { enabled: enabledParam } : {}),
      });
      setData(res);
      void sensitiveWordService
        .categories()
        .then((rows) => setCategoryOptions(rows ?? []))
        .catch(() => {});
    } catch (e) {
      showMessage(e instanceof Error ? e.message : '加载失败', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, debouncedKeyword, filterCategory, filterEnabled, showMessage]);

  useEffect(() => {
    void fetchList();
  }, [fetchList]);

  const handleAdd = async () => {
    if (!addWord.trim()) {
      setAddWordError('请填写敏感词');
      return;
    }
    setAddWordError('');
    setAdding(true);
    try {
      await sensitiveWordService.create({
        word: addWord.trim(),
        category: addCategory.trim() || DEFAULT_SENSITIVE_WORD_CATEGORY,
        severity: addSeverity,
        source: addSource,
      });
      showMessage('已添加', 'success');
      setShowAdd(false);
      setAddWord('');
      setAddCategory(DEFAULT_SENSITIVE_WORD_CATEGORY);
      setAddSeverity(DEFAULT_SENSITIVE_WORD_SEVERITY);
      setAddSource(DEFAULT_SENSITIVE_WORD_SOURCE_MANUAL);
      void fetchList();
    } catch (e) {
      showMessage(e instanceof Error ? e.message : '添加失败', 'error');
    } finally {
      setAdding(false);
    }
  };

  const handleBatchCreate = async () => {
    const words = parseBatchJson(batchJson);
    if (!words || words.length === 0) {
      setBatchJsonError('请填写合法 JSON（数组或 { words: [] }）且至少包含一个词');
      return;
    }
    setBatchJsonError('');
    setBatching(true);
    try {
      const result = await sensitiveWordService.batchCreate({
        words,
        category: batchCategory.trim() || DEFAULT_SENSITIVE_WORD_CATEGORY,
        severity: batchSeverity,
        source: batchSource,
      });
      setLatestImportResult(result);
      showMessage(`批量新增完成，新增 ${result.added} 条`, 'success');
      setShowBatch(false);
      setBatchCategory(DEFAULT_SENSITIVE_WORD_CATEGORY);
      setBatchSeverity(DEFAULT_SENSITIVE_WORD_SEVERITY);
      setBatchSource(DEFAULT_SENSITIVE_WORD_SOURCE_BATCH);
      await fetchList();
    } catch (e) {
      showMessage(e instanceof Error ? e.message : '批量新增失败', 'error');
    } finally {
      setBatching(false);
    }
  };

  const handleImport = async () => {
    if (!importFile) {
      setImportFileError('请先选择导入文件');
      return;
    }
    setImportFileError('');
    setImporting(true);
    try {
      const result = await sensitiveWordService.import(importFile, {
        category: importCategory.trim() || DEFAULT_SENSITIVE_WORD_CATEGORY,
        severity: importSeverity,
        source: importSource,
      });
      setLatestImportResult(result);
      showMessage(`导入完成，新增 ${result.added} 条`, 'success');
      setShowImport(false);
      setImportFile(null);
      setImportCategory(DEFAULT_SENSITIVE_WORD_CATEGORY);
      setImportSeverity(DEFAULT_SENSITIVE_WORD_SEVERITY);
      setImportSource(DEFAULT_SENSITIVE_WORD_SOURCE_IMPORT);
      await fetchList();
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
      void fetchList();
    } catch (e) {
      showMessage(e instanceof Error ? e.message : '删除失败', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const listForBatch = useMemo(() => data?.list ?? [], [data?.list]);

  const selectedWords = useMemo(
    () => listForBatch.filter((w) => selectedKeys.has(String(w.id))),
    [listForBatch, selectedKeys],
  );

  const runBatchSetEnabled = useCallback(
    async (enabled: boolean) => {
      const ids = selectedWords.map((w) => w.id);
      if (!ids.length) return;
      setBatchBusy(true);
      try {
        await sensitiveWordService.batchSetEnabled(ids, enabled);
        showMessage(enabled ? '已批量启用' : '已批量禁用', 'success');
        clearSelection();
        void fetchList();
      } catch (e) {
        showMessage(e instanceof Error ? e.message : '批量操作失败', 'error');
      } finally {
        setBatchBusy(false);
      }
    },
    [selectedWords, fetchList, showMessage, clearSelection],
  );

  const runBatchRemove = useCallback(async () => {
    const ids = selectedWords.map((w) => w.id);
    if (!ids.length) return;
    setBatchBusy(true);
    try {
      await sensitiveWordService.batchRemove(ids);
      showMessage('已批量删除', 'success');
      setBatchDeleteConfirm(false);
      clearSelection();
      void fetchList();
    } catch (e) {
      showMessage(e instanceof Error ? e.message : '批量删除失败', 'error');
    } finally {
      setBatchBusy(false);
    }
  }, [selectedWords, fetchList, showMessage, clearSelection]);

  /** 与后端 Boolean 可空一致：仅明确为 false 时视为停用 */
  const handleToggle = useCallback(async (item: SensitiveWord) => {
    const currentlyOn = item.enabled !== false;
    try {
      await sensitiveWordService.update(item.id, { enabled: !currentlyOn });
      showMessage(currentlyOn ? '已禁用' : '已启用', 'success');
      void fetchList();
    } catch (e) {
      showMessage(e instanceof Error ? e.message : '操作失败', 'error');
    }
  }, [fetchList, showMessage]);

  const openEditModal = useCallback((item: SensitiveWord) => {
    setEditingItem(item);
    const raw = (item.category ?? '').trim();
    setEditCategory(raw || DEFAULT_SENSITIVE_WORD_CATEGORY);
    const sevRaw = item.severity;
    const sevN = sevRaw != null ? Math.round(Number(sevRaw)) : Number.NaN;
    setEditSeverity(Number.isFinite(sevN) ? sevN : DEFAULT_SENSITIVE_WORD_SEVERITY);
    setEditSource((item.source ?? '').trim() || DEFAULT_SENSITIVE_WORD_SOURCE_MANUAL);
    setEditEnabled(item.enabled !== false);
  }, []);

  const closeEditModal = () => {
    setEditingItem(null);
    setSavingEdit(false);
  };

  const handleSaveEdit = async () => {
    if (!editingItem) return;
    setSavingEdit(true);
    try {
      await sensitiveWordService.update(editingItem.id, {
        category: editCategory.trim() || DEFAULT_SENSITIVE_WORD_CATEGORY,
        severity: editSeverity,
        source: editSource,
        enabled: editEnabled,
      });
      showMessage('已保存', 'success');
      closeEditModal();
      void fetchList();
    } catch (e) {
      showMessage(e instanceof Error ? e.message : '保存失败', 'error');
    } finally {
      setSavingEdit(false);
    }
  };

  const sensitiveColumns = useMemo<MgmtDataTableColumn<SensitiveWord>[]>(
    () => [
      {
        id: 'word',
        header: '敏感词',
        cellClassName: 'align-middle',
        cell: (item) => <span className={`font-mono ${textPrimary(theme)}`}>{item.word}</span>,
      },
      {
        id: 'category',
        header: '分类',
        cellClassName: 'align-middle',
        cell: (item) => (
          <span className={textMuted(theme)} title={item.category}>
            {formatSensitiveWordCategoryLabel(item.category)}
          </span>
        ),
      },
      {
        id: 'severity',
        header: '严重级别',
        cellClassName: 'align-middle',
        cell: (item) => (
          <span className={textMuted(theme)} title={item.severity != null ? String(item.severity) : ''}>
            {formatSensitiveWordSeverityLabel(item.severity)}
          </span>
        ),
      },
      {
        id: 'source',
        header: '来源',
        cellClassName: 'align-middle',
        cell: (item) => (
          <span className={textMuted(theme)} title={item.source}>
            {formatSensitiveWordSourceLabel(item.source)}
          </span>
        ),
      },
      {
        id: 'enabled',
        header: '状态',
        cellClassName: 'align-middle',
        cell: (item) => {
          const on = item.enabled !== false;
          return (
            <span
              className={`${on ? mgmtTableActionPositive(theme) : mgmtTableActionGhost(theme)} cursor-default select-none`}
              title="在右侧操作列使用「启用 / 禁用」"
            >
              {on ? '启用' : '禁用'}
            </span>
          );
        },
      },
      {
        id: 'creator',
        header: '创建人',
        cellClassName: 'align-middle',
        cell: (item) => (
          <span className={textMuted(theme)}>
            {resolvePersonDisplay({ names: [item.createdByName], usernames: [item.createdBy] })}
          </span>
        ),
      },
      {
        id: 'actions',
        header: '操作',
        headerClassName: 'text-right',
        cellClassName: 'text-right align-middle',
        cellNowrap: true,
        cell: (item) => {
          const on = item.enabled !== false;
          return (
            <RowActionGroup
              theme={theme}
              actions={[
                {
                  key: 'edit',
                  label: '编辑',
                  icon: PencilLine,
                  onClick: () => openEditModal(item),
                },
                {
                  key: 'toggle',
                  label: on ? '停用' : '启用',
                  icon: on ? Power : CheckCircle2,
                  tone: on ? 'neutral' : 'positive',
                  onClick: () => void handleToggle(item),
                },
                {
                  key: 'delete',
                  label: '删除',
                  icon: Trash2,
                  tone: 'danger',
                  onClick: () => setDeleteTarget(item),
                },
              ]}
            />
          );
        },
      },
    ],
    [theme, handleToggle, openEditModal],
  );

  if (loading && !data) {
    return (
      <MgmtPageShell
        theme={theme}
        fontSize={fontSize}
        titleIcon={ShieldAlert}
        breadcrumbSegments={['系统配置', '敏感词管理']}
        description={PAGE_DESCRIPTION}
      >
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
      description={PAGE_DESCRIPTION}
      toolbar={
        <div className={`${TOOLBAR_ROW_LIST} justify-between min-w-0`}>
          <div className={`${TOOLBAR_ROW_LIST} min-w-0 flex-1`}>
            <input
              type="search"
              className={`${inputCls} w-[min(14rem,30vw)] min-w-[8rem] max-w-[14rem] shrink`}
              placeholder="关键词（敏感词）"
              value={filterKeyword}
              onChange={(e) => setFilterKeyword(e.target.value)}
              aria-label="按敏感词检索"
              title="关键词、分类与状态将随列表请求传给后端；分页 total 应与筛选结果一致。"
            />
            <LantuSelect
              theme={theme}
              value={filterCategory}
              onChange={setFilterCategory}
              options={categoryFilterSelectOptions}
              placeholder="分类"
              className="!w-36 shrink-0"
              triggerClassName="w-full !min-w-0"
            />
            <LantuSelect
              theme={theme}
              value={filterEnabled}
              onChange={setFilterEnabled}
              options={ENABLED_FILTER_OPTIONS}
              placeholder="状态"
              className="!w-36 shrink-0"
              triggerClassName="w-full !min-w-0"
            />
          </div>
          <div className="flex flex-nowrap items-center justify-end gap-2 shrink-0">
            <button
              type="button"
              className={btnSecondary(theme)}
              onClick={() => {
                setBatchCategory(DEFAULT_SENSITIVE_WORD_CATEGORY);
                setBatchSeverity(DEFAULT_SENSITIVE_WORD_SEVERITY);
                setBatchSource(DEFAULT_SENSITIVE_WORD_SOURCE_BATCH);
                setShowBatch(true);
              }}
            >
              <Braces size={14} /> JSON 批量新增
            </button>
            <button
              type="button"
              className={btnSecondary(theme)}
              onClick={() => {
                setImportCategory(DEFAULT_SENSITIVE_WORD_CATEGORY);
                setImportSeverity(DEFAULT_SENSITIVE_WORD_SEVERITY);
                setImportSource(DEFAULT_SENSITIVE_WORD_SOURCE_IMPORT);
                setShowImport(true);
              }}
            >
              <Upload size={14} /> 文件导入
            </button>
            <button
              type="button"
              className={btnPrimary}
              onClick={() => {
                setAddCategory(DEFAULT_SENSITIVE_WORD_CATEGORY);
                setAddSeverity(DEFAULT_SENSITIVE_WORD_SEVERITY);
                setAddSource(DEFAULT_SENSITIVE_WORD_SOURCE_MANUAL);
                setShowAdd(true);
              }}
            >
              <Plus size={14} /> 单条新增
            </button>
          </div>
        </div>
      }
    >
      <div className="px-4 sm:px-6 pb-6">
        {latestImportResult && (
          <BentoCard theme={theme} padding="sm" className="mb-4">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
              <div className={`rounded-lg px-3 py-2 ${isDark ? 'bg-white/[0.04]' : 'bg-slate-50'}`}>本次新增：<span className={textPrimary(theme)}>{latestImportResult.added}</span></div>
              <div className={`rounded-lg px-3 py-2 ${isDark ? 'bg-white/[0.04]' : 'bg-slate-50'}`}>有效候选：<span className={textPrimary(theme)}>{latestImportResult.candidates}</span></div>
              <div className={`rounded-lg px-3 py-2 ${isDark ? 'bg-white/[0.04]' : 'bg-slate-50'}`}>跳过空行/注释：<span className={textPrimary(theme)}>{latestImportResult.skippedBlankOrComment}</span></div>
              <div className={`rounded-lg px-3 py-2 ${isDark ? 'bg-white/[0.04]' : 'bg-slate-50'}`}>跳过超长：<span className={textPrimary(theme)}>{latestImportResult.skippedTooLong}</span></div>
              <div className={`rounded-lg px-3 py-2 ${isDark ? 'bg-white/[0.04]' : 'bg-slate-50'}`}>跳过重复：<span className={textPrimary(theme)}>{latestImportResult.skippedDuplicate}</span></div>
            </div>
          </BentoCard>
        )}
        {list.length === 0 && !showAdd ? (
          debouncedKeyword || filterCategory || filterEnabled ? (
            <EmptyState title="无匹配敏感词" description="请调整关键词、分类或状态筛选。" />
          ) : (
            <EmptyState title="暂无敏感词" description="点击「单条新增」或批量导入添加敏感词规则" />
          )
        ) : (
          <>
            <MgmtBatchToolbar theme={theme} count={selectedKeys.size} onClear={clearSelection}>
              <button
                type="button"
                disabled={batchBusy || selectedKeys.size === 0}
                className={mgmtTableActionPositive(theme)}
                onClick={() => void runBatchSetEnabled(true)}
              >
                批量启用
              </button>
              <button
                type="button"
                disabled={batchBusy || selectedKeys.size === 0}
                className={btnSecondary(theme)}
                onClick={() => void runBatchSetEnabled(false)}
              >
                批量禁用
              </button>
              <button
                type="button"
                disabled={batchBusy || selectedKeys.size === 0}
                className={mgmtTableActionDanger}
                onClick={() => setBatchDeleteConfirm(true)}
              >
                批量删除
              </button>
            </MgmtBatchToolbar>
            <MgmtDataTable
              theme={theme}
              columns={sensitiveColumns}
              rows={list}
              getRowKey={(item) => String(item.id)}
              minWidth="62rem"
              surface="plain"
              selection={{
                selectedKeys,
                onSelectionChange: setSelectedKeys,
              }}
            />
          </>
        )}

        <Pagination theme={theme} page={page} pageSize={SENSITIVE_PAGE_SIZE} total={data?.total ?? 0} onChange={setPage} />
      </div>

      <Modal
        open={showAdd}
        onClose={() => {
          setShowAdd(false);
          setAddWordError('');
          setAddWord('');
          setAddCategory(DEFAULT_SENSITIVE_WORD_CATEGORY);
          setAddSeverity(DEFAULT_SENSITIVE_WORD_SEVERITY);
          setAddSource(DEFAULT_SENSITIVE_WORD_SOURCE_MANUAL);
        }}
        title="新增敏感词"
        theme={theme}
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className={btnSecondary(theme)}
              onClick={() => {
                setShowAdd(false);
                setAddWordError('');
                setAddWord('');
                setAddCategory(DEFAULT_SENSITIVE_WORD_CATEGORY);
                setAddSeverity(DEFAULT_SENSITIVE_WORD_SEVERITY);
                setAddSource(DEFAULT_SENSITIVE_WORD_SOURCE_MANUAL);
              }}
            >
              取消
            </button>
            <button type="button" className={`${btnPrimary} disabled:opacity-50`} disabled={adding} onClick={handleAdd}>
              {adding ? <><Loader2 size={14} className="animate-spin" /> 添加中…</> : '添加'}
            </button>
          </div>
        }
      >
        <div className="space-y-3">
          <div>
            <label className={`text-sm font-medium ${textSecondary(theme)} mb-1 block`}>敏感词</label>
            <input
              className={`${inputCls}${addWordError ? ` ${inputBaseError()}` : ''}`}
              value={addWord}
              onChange={(e) => {
                setAddWord(e.target.value);
                setAddWordError('');
              }}
              placeholder="请输入敏感词"
              aria-invalid={!!addWordError}
            />
            {addWordError ? (
              <p className={`mt-1 ${fieldErrorText()}`} role="alert">
                {addWordError}
              </p>
            ) : null}
          </div>
          <div>
            <label className={`text-sm font-medium ${textSecondary(theme)} mb-1 block`}>分类</label>
            <LantuSelect
              theme={theme}
              value={addCategory}
              onChange={setAddCategory}
              options={SENSITIVE_WORD_CATEGORY_OPTIONS}
              ariaLabel="敏感词分类"
            />
            <p className={`mt-1 text-xs ${textMuted(theme)}`}>
              与公告「类型」相同：仅允许预设项；与资源 Tag、agent/mcp 等无关。
            </p>
          </div>
          <div>
            <label className={`text-sm font-medium ${textSecondary(theme)} mb-1 block`}>严重级别</label>
            <LantuSelect
              theme={theme}
              value={String(addSeverity)}
              onChange={(v) => setAddSeverity(Number(v))}
              options={SENSITIVE_WORD_SEVERITY_OPTIONS}
              ariaLabel="敏感词严重级别"
            />
          </div>
          <div>
            <label className={`text-sm font-medium ${textSecondary(theme)} mb-1 block`}>来源</label>
            <LantuSelect
              theme={theme}
              value={addSource}
              onChange={setAddSource}
              options={SENSITIVE_WORD_SOURCE_OPTIONS}
              ariaLabel="敏感词来源"
            />
            <p className={`mt-1 text-xs ${textMuted(theme)}`}>与导入方式、批量录入渠道对齐的固定字典。</p>
          </div>
        </div>
      </Modal>

      <Modal
        open={!!editingItem}
        onClose={closeEditModal}
        title="编辑敏感词"
        theme={theme}
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" className={btnSecondary(theme)} onClick={closeEditModal}>取消</button>
            <button type="button" className={`${btnPrimary} disabled:opacity-50`} disabled={savingEdit} onClick={() => void handleSaveEdit()}>
              {savingEdit ? <><Loader2 size={14} className="animate-spin" /> 保存中…</> : '保存'}
            </button>
          </div>
        }
      >
        <div className="space-y-3">
          <div>
            <label className={`text-sm font-medium ${textSecondary(theme)} mb-1 block`}>敏感词</label>
            <p className={`font-mono text-sm ${textPrimary(theme)}`}>{editingItem?.word ?? '—'}</p>
            <p className={`mt-1 text-xs ${textMuted(theme)}`}>
              词面修改需后端在 PUT 请求体中支持 `word` 字段后，再扩展前端 DTO 与表单。
            </p>
          </div>
          <div>
            <label className={`text-sm font-medium ${textSecondary(theme)} mb-1 block`}>分类</label>
            <LantuSelect
              theme={theme}
              value={editCategory}
              onChange={setEditCategory}
              options={editCategorySelectOptions}
              ariaLabel="敏感词分类"
            />
            {editingItem?.category?.trim() && !isSensitiveWordPresetCategory(editingItem.category) ? (
              <p className={`mt-1 text-xs ${textMuted(theme)}`}>当前为历史分类代码，请择一映射到上方预设项后保存。</p>
            ) : null}
          </div>
          <div>
            <label className={`text-sm font-medium ${textSecondary(theme)} mb-1 block`}>严重级别</label>
            <LantuSelect
              theme={theme}
              value={String(editSeverity)}
              onChange={(v) => setEditSeverity(Number(v))}
              options={editSeveritySelectOptions}
              ariaLabel="敏感词严重级别"
            />
          </div>
          <div>
            <label className={`text-sm font-medium ${textSecondary(theme)} mb-1 block`}>来源</label>
            <LantuSelect
              theme={theme}
              value={editSource}
              onChange={setEditSource}
              options={editSourceSelectOptions}
              ariaLabel="敏感词来源"
            />
            {editingItem?.source?.trim() && !isSensitiveWordPresetSource(editingItem.source) ? (
              <p className={`mt-1 text-xs ${textMuted(theme)}`}>当前为历史来源代码，请改选预设项或保留历史值。</p>
            ) : null}
          </div>
          <div>
            <label className={`text-sm font-medium ${textSecondary(theme)} mb-1 block`}>状态</label>
            <button
              type="button"
              onClick={() => setEditEnabled((v) => !v)}
              className={`${editEnabled ? mgmtTableActionPositive(theme) : mgmtTableActionGhost(theme)} cursor-pointer`}
            >
              {editEnabled ? '启用' : '禁用'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={showBatch}
        onClose={() => {
          setShowBatch(false);
          setBatchJsonError('');
          setBatchCategory(DEFAULT_SENSITIVE_WORD_CATEGORY);
          setBatchSeverity(DEFAULT_SENSITIVE_WORD_SEVERITY);
          setBatchSource(DEFAULT_SENSITIVE_WORD_SOURCE_BATCH);
        }}
        title="JSON 批量新增"
        theme={theme}
        size="md"
        footer={<div className="flex justify-end gap-2">
          <button
            type="button"
            className={btnSecondary(theme)}
            onClick={() => {
              setShowBatch(false);
              setBatchJsonError('');
              setBatchCategory(DEFAULT_SENSITIVE_WORD_CATEGORY);
              setBatchSeverity(DEFAULT_SENSITIVE_WORD_SEVERITY);
              setBatchSource(DEFAULT_SENSITIVE_WORD_SOURCE_BATCH);
            }}
          >
            取消
          </button>
          <button type="button" className={`${btnPrimary} disabled:opacity-50`} disabled={batching} onClick={handleBatchCreate}>
            {batching ? <><Loader2 size={14} className="animate-spin" /> 提交中…</> : '批量提交'}
          </button>
        </div>}
      >
        <div className="space-y-3">
          <div>
            <label className={`text-sm font-medium ${textSecondary(theme)} mb-1 block`}>JSON 内容</label>
            <AutoHeightTextarea
              minRows={8}
              maxRows={36}
              className={`${inputCls} font-mono text-xs resize-none${batchJsonError ? ` ${inputBaseError()}` : ''}`}
              value={batchJson}
              onChange={(e) => {
                setBatchJson(e.target.value);
                setBatchJsonError('');
              }}
              placeholder='{"words":["词1","词2"]} 或 ["词1","词2"]'
              aria-invalid={!!batchJsonError}
            />
            {batchJsonError ? (
              <p className={`mt-1 ${fieldErrorText()}`} role="alert">
                {batchJsonError}
              </p>
            ) : null}
          </div>
          <div>
            <label className={`text-sm font-medium ${textSecondary(theme)} mb-1 block`}>分类</label>
            <LantuSelect
              theme={theme}
              value={batchCategory}
              onChange={setBatchCategory}
              options={SENSITIVE_WORD_CATEGORY_OPTIONS}
              ariaLabel="批量新增默认分类"
            />
          </div>
          <div>
            <label className={`text-sm font-medium ${textSecondary(theme)} mb-1 block`}>严重级别</label>
            <LantuSelect
              theme={theme}
              value={String(batchSeverity)}
              onChange={(v) => setBatchSeverity(Number(v))}
              options={SENSITIVE_WORD_SEVERITY_OPTIONS}
              ariaLabel="批量默认严重级别"
            />
          </div>
          <div>
            <label className={`text-sm font-medium ${textSecondary(theme)} mb-1 block`}>来源</label>
            <LantuSelect
              theme={theme}
              value={batchSource}
              onChange={setBatchSource}
              options={SENSITIVE_WORD_SOURCE_OPTIONS}
              ariaLabel="批量默认来源"
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={showImport}
        onClose={() => {
          setShowImport(false);
          setImportFile(null);
          setImportFileError('');
          setImportCategory(DEFAULT_SENSITIVE_WORD_CATEGORY);
          setImportSeverity(DEFAULT_SENSITIVE_WORD_SEVERITY);
          setImportSource(DEFAULT_SENSITIVE_WORD_SOURCE_IMPORT);
        }}
        title="文件导入（txt/csv/xlsx）"
        theme={theme}
        size="sm"
        footer={<div className="flex justify-end gap-2">
          <button
            type="button"
            className={btnSecondary(theme)}
            onClick={() => {
              setShowImport(false);
              setImportFile(null);
              setImportFileError('');
              setImportCategory(DEFAULT_SENSITIVE_WORD_CATEGORY);
              setImportSeverity(DEFAULT_SENSITIVE_WORD_SEVERITY);
              setImportSource(DEFAULT_SENSITIVE_WORD_SOURCE_IMPORT);
            }}
          >
            取消
          </button>
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
              className={`${inputCls}${importFileError ? ` ${inputBaseError()}` : ''}`}
              onChange={(e) => {
                setImportFile(e.target.files?.[0] ?? null);
                setImportFileError('');
              }}
              aria-invalid={!!importFileError}
            />
            <p className={`mt-1 text-xs ${textMuted(theme)}`}>支持 txt/csv/xlsx；txt 每行一个词，# 开头为注释。</p>
            {importFileError ? (
              <p className={`mt-1 ${fieldErrorText()}`} role="alert">
                {importFileError}
              </p>
            ) : null}
          </div>
          <div>
            <label className={`text-sm font-medium ${textSecondary(theme)} mb-1 block`}>分类</label>
            <LantuSelect
              theme={theme}
              value={importCategory}
              onChange={setImportCategory}
              options={SENSITIVE_WORD_CATEGORY_OPTIONS}
              ariaLabel="导入默认分类"
            />
          </div>
          <div>
            <label className={`text-sm font-medium ${textSecondary(theme)} mb-1 block`}>严重级别</label>
            <LantuSelect
              theme={theme}
              value={String(importSeverity)}
              onChange={(v) => setImportSeverity(Number(v))}
              options={SENSITIVE_WORD_SEVERITY_OPTIONS}
              ariaLabel="导入默认严重级别"
            />
          </div>
          <div>
            <label className={`text-sm font-medium ${textSecondary(theme)} mb-1 block`}>来源</label>
            <LantuSelect
              theme={theme}
              value={importSource}
              onChange={setImportSource}
              options={SENSITIVE_WORD_SOURCE_OPTIONS}
              ariaLabel="导入来源标记"
            />
            <p className={`mt-1 text-xs ${textMuted(theme)}`}>请与实际上传的文件类型一致（如 CSV 选「CSV 文件导入」）。</p>
          </div>
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
      <ConfirmDialog
        open={batchDeleteConfirm}
        title="批量删除敏感词"
        message={`确认删除已选的 ${selectedKeys.size} 条敏感词？此操作不可恢复。`}
        variant="warning"
        confirmText="删除"
        loading={batchBusy}
        onConfirm={() => void runBatchRemove()}
        onCancel={() => setBatchDeleteConfirm(false)}
      />
    </MgmtPageShell>
  );
};


