import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Plus, Megaphone } from 'lucide-react';
import './announcement-editor.css';
import { Theme, FontSize } from '../../types';
import { MgmtPageShell } from '../userMgmt/MgmtPageShell';
import { systemConfigService } from '../../api/services/system-config.service';
import type { AnnouncementItem, AnnouncementCreateRequest } from '../../types/dto/explore';
import { PageSkeleton } from '../../components/common/PageSkeleton';
import { MgmtDataTable } from '../../components/management/MgmtDataTable';
import { MgmtBatchToolbar } from '../../components/management/MgmtBatchToolbar';
import { EmptyState } from '../../components/common/EmptyState';
import { Modal } from '../../components/common/Modal';
import { LantuSelect } from '../../components/common/LantuSelect';
import { MarkdownView } from '../../components/common/MarkdownView';
import { VditorMarkdownEditor } from '../../components/common/VditorMarkdownEditor';
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
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { PageError } from '../../components/common/PageError';
import { Pagination } from '../../components/common/Pagination';
import { useScrollPaginatedContentToTop } from '../../hooks/useScrollPaginatedContentToTop';
import { formatDateTime } from '../../utils/formatDateTime';
import { resolvePersonDisplay } from '../../utils/personDisplay';
import { AutoHeightTextarea } from '../../components/common/AutoHeightTextarea';

interface Props { theme: Theme; fontSize: FontSize; showMessage: (msg: string, type?: 'success' | 'error' | 'info') => void; }

const ANNOUNCEMENT_PAGE_SIZE = 20;

const TYPE_OPTIONS = [
  { value: 'feature', label: '新功能' },
  { value: 'maintenance', label: '维护' },
  { value: 'update', label: '更新' },
  { value: 'notice', label: '公告' },
];

const TYPE_FILTER_OPTIONS = [{ value: '', label: '全部' }, ...TYPE_OPTIONS];

const TYPE_BADGE: Record<string, string> = {
  feature: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  maintenance: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  update: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  notice: 'bg-slate-500/10 text-slate-600 dark:text-slate-400',
};

const INPUT_FOCUS = 'focus:ring-2 focus:ring-neutral-900/20 focus:border-neutral-900/35';
const PAGE_DESCRIPTION = '发布与维护面向师生的平台公告与通知；支持 Markdown。维护类公告可配合「监控中心」排障信息，形成统一运营入口。';

export const AnnouncementPage: React.FC<Props> = ({ theme, fontSize, showMessage }) => {
  const isDark = theme === 'dark';
  const inputCls = `${nativeInputClass(theme)} ${INPUT_FOCUS}`;
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<Error | null>(null);
  const [list, setList] = useState<AnnouncementItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  useScrollPaginatedContentToTop(page);
  const [filterKeyword, setFilterKeyword] = useState('');
  const [debouncedKeyword, setDebouncedKeyword] = useState('');
  const [filterType, setFilterType] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<AnnouncementItem | null>(null);
  const [detailAnnouncement, setDetailAnnouncement] = useState<AnnouncementItem | null>(null);
  const [draft, setDraft] = useState<AnnouncementCreateRequest>({
    title: '',
    summary: '',
    content: '',
    type: 'notice',
    enabled: true,
  });
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AnnouncementItem | null>(null);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [batchBusy, setBatchBusy] = useState(false);
  const [batchDeleteConfirm, setBatchDeleteConfirm] = useState(false);
  const [announcementFieldErrors, setAnnouncementFieldErrors] = useState<{ title?: string; summary?: string; content?: string }>({});

  const clearSelection = useCallback(() => setSelectedKeys(new Set()), []);

  useEffect(() => {
    clearSelection();
  }, [page, debouncedKeyword, filterType, clearSelection]);

  const selectedRows = useMemo(
    () => list.filter((a) => selectedKeys.has(String(a.id))),
    [list, selectedKeys],
  );

  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedKeyword(filterKeyword.trim()), 300);
    return () => window.clearTimeout(id);
  }, [filterKeyword]);

  useEffect(() => {
    setPage(1);
  }, [debouncedKeyword, filterType]);

  const fetchList = useCallback(async () => {
    setLoadError(null);
    setLoading(true);
    try {
      const res = await systemConfigService.listAnnouncements({
        page,
        pageSize: ANNOUNCEMENT_PAGE_SIZE,
        ...(debouncedKeyword ? { keyword: debouncedKeyword } : {}),
        ...(filterType ? { type: filterType } : {}),
      });
      setList(res.list ?? []);
      setTotal(Number.isFinite(res.total) ? res.total : 0);
    } catch (err) {
      setList([]);
      setTotal(0);
      setLoadError(err instanceof Error ? err : new Error('加载公告列表失败'));
    } finally {
      setLoading(false);
    }
  }, [page, debouncedKeyword, filterType]);

  useEffect(() => {
    void fetchList();
  }, [fetchList]);

  const openCreateModal = () => {
    setEditing(null);
    setAnnouncementFieldErrors({});
    setDraft({ title: '', summary: '', content: '', type: 'notice', enabled: true });
    setShowCreate(true);
  };

  const openEditModal = (item: AnnouncementItem) => {
    setAnnouncementFieldErrors({});
    setEditing(item);
    setDraft({
      title: item.title ?? '',
      summary: item.summary ?? '',
      content: item.content?.trim() ? item.content : (item.summary ?? ''),
      type: item.type ?? 'notice',
      pinned: item.pinned,
      enabled: item.enabled !== false,
    });
    setShowCreate(true);
  };

  const handleSaveAnnouncement = async () => {
    const nextErr: { title?: string; summary?: string; content?: string } = {};
    if (!draft.title.trim()) nextErr.title = '请填写标题';
    if (!draft.summary?.trim()) nextErr.summary = '请填写公告摘要';
    if (!draft.content?.trim()) nextErr.content = '请填写公告内容';
    if (Object.keys(nextErr).length > 0) {
      setAnnouncementFieldErrors(nextErr);
      return;
    }
    setAnnouncementFieldErrors({});
    setSaving(true);
    try {
      const payload: AnnouncementCreateRequest = {
        ...draft,
      };
      if (editing?.id) {
        await systemConfigService.updateAnnouncement(String(editing.id), payload);
        showMessage('公告已更新', 'success');
      } else {
        await systemConfigService.createAnnouncement(payload);
        showMessage('公告已发布', 'success');
      }
      setShowCreate(false);
      setEditing(null);
      setDraft({ title: '', summary: '', content: '', type: 'notice', enabled: true });
      fetchList();
    } catch (e) { showMessage(e instanceof Error ? e.message : (editing ? '更新失败' : '发布失败'), 'error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await systemConfigService.deleteAnnouncement(String(deleteTarget.id));
      showMessage('已删除', 'success');
      setDeleteTarget(null);
      fetchList();
    } catch (e) { showMessage(e instanceof Error ? e.message : '删除失败', 'error'); }
  };

  const patchAnnouncementEnabled = useCallback(
    async (row: AnnouncementItem, enabled: boolean) => {
      try {
        await systemConfigService.updateAnnouncement(String(row.id), { enabled });
        showMessage(enabled ? '已启用' : '已禁用', 'success');
        void fetchList();
      } catch (e) {
        showMessage(e instanceof Error ? e.message : '操作失败', 'error');
      }
    },
    [fetchList, showMessage],
  );

  const runBatchPatch = useCallback(
    async (patch: Partial<AnnouncementCreateRequest>, okMsg: string) => {
      const ids = selectedRows.map((a) => String(a.id)).filter(Boolean);
      if (!ids.length) return;
      setBatchBusy(true);
      try {
        await systemConfigService.batchPatchAnnouncements(ids, patch);
        showMessage(okMsg, 'success');
        clearSelection();
        await fetchList();
      } catch (e) {
        showMessage(e instanceof Error ? e.message : '批量操作失败', 'error');
      } finally {
        setBatchBusy(false);
      }
    },
    [selectedRows, fetchList, showMessage, clearSelection],
  );

  const runBatchDelete = useCallback(async () => {
    const ids = selectedRows.map((a) => String(a.id)).filter(Boolean);
    if (!ids.length) return;
    setBatchBusy(true);
    try {
      await systemConfigService.batchDeleteAnnouncements(ids);
      showMessage('已批量删除', 'success');
      setBatchDeleteConfirm(false);
      clearSelection();
      await fetchList();
    } catch (e) {
      showMessage(e instanceof Error ? e.message : '批量删除失败', 'error');
    } finally {
      setBatchBusy(false);
    }
  }, [selectedRows, fetchList, showMessage, clearSelection]);

  const announcementColumns = useMemo(
    () => [
      {
        id: 'type',
        header: '类型',
        cellClassName: 'align-middle whitespace-nowrap',
        cell: (a: AnnouncementItem) => (
          <span className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-full ${TYPE_BADGE[a.type ?? ''] ?? TYPE_BADGE.notice}`}>
            {TYPE_OPTIONS.find((o) => o.value === a.type)?.label ?? a.type}
          </span>
        ),
      },
      {
        id: 'title',
        header: '标题',
        cellClassName: `align-middle max-w-[12rem] ${textPrimary(theme)}`,
        cell: (a: AnnouncementItem) => (
          <span className="font-semibold text-sm line-clamp-2">{a.title}</span>
        ),
      },
      {
        id: 'summary',
        header: '摘要',
        cellClassName: `align-middle max-w-[14rem] ${textMuted(theme)}`,
        cell: (a: AnnouncementItem) => (
          <span className="text-xs line-clamp-2">{a.summary || '—'}</span>
        ),
      },
      {
        id: 'id',
        header: 'ID',
        cellClassName: `align-middle text-xs whitespace-nowrap ${textMuted(theme)}`,
        cell: (a: AnnouncementItem) => String(a.id ?? '—'),
      },
      {
        id: 'pinned',
        header: '置顶',
        cellClassName: `align-middle text-xs whitespace-nowrap ${textMuted(theme)}`,
        cell: (a: AnnouncementItem) => (a.pinned ? '是' : '否'),
      },
      {
        id: 'enabled',
        header: '启用',
        cellClassName: `align-middle text-xs whitespace-nowrap ${textMuted(theme)}`,
        cell: (a: AnnouncementItem) => (a.enabled == null ? '—' : a.enabled ? '是' : '否'),
      },
      {
        id: 'deleted',
        header: '删除标记',
        cellClassName: `align-middle text-xs whitespace-nowrap ${textMuted(theme)}`,
        cell: (a: AnnouncementItem) => {
          const d = a.deleted;
          if (d == null) return '—';
          if (typeof d === 'boolean') return d ? '是' : '否';
          if (typeof d === 'number') return d === 1 ? '是' : d === 0 ? '否' : String(d);
          return String(d);
        },
      },
      {
        id: 'creator',
        header: '创建人',
        cellClassName: `align-middle text-xs ${textMuted(theme)}`,
        cell: (a: AnnouncementItem) => resolvePersonDisplay({ names: [a.createdByName], ids: [a.createdBy] }),
      },
      {
        id: 'createdAt',
        header: '创建时间',
        cellClassName: `align-middle text-xs whitespace-nowrap ${textMuted(theme)}`,
        cell: (a: AnnouncementItem) => formatDateTime(a.createdAt),
      },
      {
        id: 'updatedAt',
        header: '更新时间',
        cellClassName: `align-middle text-xs whitespace-nowrap ${textMuted(theme)}`,
        cell: (a: AnnouncementItem) => (a.updatedAt ? formatDateTime(a.updatedAt) : '—'),
      },
      {
        id: 'actions',
        header: '操作',
        headerClassName: 'text-right',
        cellClassName: 'text-right align-middle',
        cell: (a: AnnouncementItem) => {
          const pubOn = a.enabled !== false;
          return (
            <div className="inline-flex max-w-[20rem] flex-wrap items-center justify-end gap-2">
              <button type="button" onClick={() => setDetailAnnouncement(a)} className={mgmtTableActionGhost(theme)}>
                查看
              </button>
              <button type="button" onClick={() => openEditModal(a)} className={mgmtTableActionGhost(theme)}>
                编辑
              </button>
              {!pubOn ? (
                <button
                  type="button"
                  onClick={() => void patchAnnouncementEnabled(a, true)}
                  className={mgmtTableActionPositive(theme)}
                >
                  启用
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void patchAnnouncementEnabled(a, false)}
                  className={mgmtTableActionGhost(theme)}
                >
                  禁用
                </button>
              )}
              <button type="button" onClick={() => setDeleteTarget(a)} className={mgmtTableActionDanger}>
                删除
              </button>
            </div>
          );
        },
      },
    ],
    [theme, patchAnnouncementEnabled],
  );

  if (loading) {
    return (
      <MgmtPageShell
        theme={theme}
        fontSize={fontSize}
        titleIcon={Megaphone}
        breadcrumbSegments={['系统配置', '平台公告']}
        description={PAGE_DESCRIPTION}
      >
        <PageSkeleton type="table" />
      </MgmtPageShell>
    );
  }

  if (loadError) {
    return (
      <MgmtPageShell
        theme={theme}
        fontSize={fontSize}
        titleIcon={Megaphone}
        breadcrumbSegments={['系统配置', '平台公告']}
        description={PAGE_DESCRIPTION}
      >
        <PageError error={loadError} onRetry={fetchList} retryLabel="重试加载公告" />
      </MgmtPageShell>
    );
  }

  return (
    <MgmtPageShell
      theme={theme}
      fontSize={fontSize}
      titleIcon={Megaphone}
      breadcrumbSegments={['系统配置', '平台公告']}
      description={PAGE_DESCRIPTION}
      toolbar={
        <div className={`${TOOLBAR_ROW_LIST} justify-between`}>
          <div className={`${TOOLBAR_ROW_LIST} min-w-0 flex-1`}>
            <input
              type="search"
              className={`${inputCls} w-[min(14rem,30vw)] min-w-[8rem] max-w-[14rem] shrink`}
              placeholder="关键词（标题/摘要）"
              value={filterKeyword}
              onChange={(e) => setFilterKeyword(e.target.value)}
              aria-label="按标题或摘要筛选"
              title="关键词与类型由服务端筛选；分页总数与列表一致。"
            />
            <LantuSelect
              theme={theme}
              value={filterType}
              onChange={setFilterType}
              options={TYPE_FILTER_OPTIONS}
              placeholder="类型"
              className="!w-36 shrink-0"
              triggerClassName="w-full !min-w-0"
            />
          </div>
          <button type="button" className={`${btnPrimary} shrink-0`} onClick={openCreateModal}>
            <Plus size={14} /> 发布公告
          </button>
        </div>
      }
    >
      <div className="px-4 sm:px-6 pb-6 flex flex-col min-h-0">
        {list.length === 0 ? (
          total === 0 && !debouncedKeyword && !filterType ? (
            <EmptyState title="暂无公告" description="点击「发布公告」创建第一条平台公告" />
          ) : (
            <EmptyState title="无匹配公告" description="请调整关键词或类型筛选条件。" />
          )
        ) : (
          <>
            <MgmtBatchToolbar theme={theme} count={selectedKeys.size} onClear={clearSelection}>
              <button
                type="button"
                disabled={batchBusy || selectedKeys.size === 0}
                className={btnSecondary(theme)}
                onClick={() => void runBatchPatch({ enabled: true }, '已批量启用')}
              >
                批量启用
              </button>
              <button
                type="button"
                disabled={batchBusy || selectedKeys.size === 0}
                className={btnSecondary(theme)}
                onClick={() => void runBatchPatch({ enabled: false }, '已批量禁用')}
              >
                批量禁用
              </button>
              <button
                type="button"
                disabled={batchBusy || selectedKeys.size === 0}
                className={btnSecondary(theme)}
                onClick={() => void runBatchPatch({ pinned: true }, '已批量置顶')}
              >
                批量置顶
              </button>
              <button
                type="button"
                disabled={batchBusy || selectedKeys.size === 0}
                className={btnSecondary(theme)}
                onClick={() => void runBatchPatch({ pinned: false }, '已取消置顶')}
              >
                批量取消置顶
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
              columns={announcementColumns}
              rows={list}
              getRowKey={(a) => String(a.id)}
              minWidth="96rem"
              surface="plain"
              selection={{
                selectedKeys,
                onSelectionChange: setSelectedKeys,
              }}
            />
          </>
        )}
        <Pagination theme={theme} page={page} pageSize={ANNOUNCEMENT_PAGE_SIZE} total={total} onChange={setPage} />
      </div>

      <Modal
        open={showCreate}
        onClose={() => {
          setShowCreate(false);
          setEditing(null);
          setAnnouncementFieldErrors({});
        }}
        title={editing ? '编辑平台公告' : '发布平台公告'}
        theme={theme}
        size="2xl"
        footer={<div className="flex justify-end gap-2">
          <button
            type="button"
            className={btnSecondary(theme)}
            onClick={() => {
              setShowCreate(false);
              setEditing(null);
              setAnnouncementFieldErrors({});
            }}
          >
            取消
          </button>
          <button type="button" className={`${btnPrimary} disabled:opacity-50`} disabled={saving} onClick={handleSaveAnnouncement}>
            {saving ? <><Loader2 size={14} className="animate-spin" /> {editing ? '保存中…' : '发布中…'}</> : (editing ? '保存' : '发布')}
          </button>
        </div>}>
        <div className="space-y-4">
          <div>
            <label className={`text-sm font-medium ${textSecondary(theme)} mb-1 block`}>标题</label>
            <input
              className={`${inputCls}${announcementFieldErrors.title ? ` ${inputBaseError()}` : ''}`}
              value={draft.title}
              onChange={(e) => {
                const v = e.target.value;
                setDraft((d) => ({ ...d, title: v }));
                if (v.trim()) setAnnouncementFieldErrors((prev) => ({ ...prev, title: undefined }));
              }}
              placeholder="公告标题"
              aria-invalid={!!announcementFieldErrors.title}
            />
            {announcementFieldErrors.title ? (
              <p className={`mt-1 ${fieldErrorText()}`} role="alert">
                {announcementFieldErrors.title}
              </p>
            ) : null}
          </div>
          <div>
            <label className={`text-sm font-medium ${textSecondary(theme)} mb-1 block`}>公告内容</label>
            <div
              className={`announcement-md-wrapper rounded-xl overflow-hidden border ${isDark ? 'border-white/10' : 'border-slate-200'}${announcementFieldErrors.content ? ` ${inputBaseError()}` : ''}`}
            >
              <VditorMarkdownEditor
                key={editing?.id ?? (showCreate ? 'create' : 'closed')}
                isDark={isDark}
                value={draft.content ?? ''}
                mode="sv"
                minHeight={360}
                placeholder="支持 Markdown 语法录入公告正文"
                onChange={(value) => {
                  setDraft((d) => ({ ...d, content: value }));
                  if (value.trim()) setAnnouncementFieldErrors((prev) => ({ ...prev, content: undefined }));
                }}
              />
            </div>
            {announcementFieldErrors.content ? (
              <p className={`mt-1 ${fieldErrorText()}`} role="alert">
                {announcementFieldErrors.content}
              </p>
            ) : null}
          </div>
          <div>
            <label className={`text-sm font-medium ${textSecondary(theme)} mb-1 block`}>摘要（手填）</label>
            <AutoHeightTextarea
              minRows={3}
              maxRows={10}
              className={`${inputCls} resize-none${announcementFieldErrors.summary ? ` ${inputBaseError()}` : ''}`}
              value={draft.summary ?? ''}
              onChange={(e) => {
                const v = e.target.value;
                setDraft((d) => ({ ...d, summary: v }));
                if (v.trim()) setAnnouncementFieldErrors((prev) => ({ ...prev, summary: undefined }));
              }}
              placeholder="请填写公告摘要（列表卡片展示用）"
              aria-invalid={!!announcementFieldErrors.summary}
            />
            {announcementFieldErrors.summary ? (
              <p className={`mt-1 ${fieldErrorText()}`} role="alert">
                {announcementFieldErrors.summary}
              </p>
            ) : null}
          </div>
          <div>
            <label className={`text-sm font-medium ${textSecondary(theme)} mb-1 block`}>类型</label>
            <LantuSelect theme={theme} value={draft.type} onChange={(v) => setDraft(d => ({ ...d, type: v as any }))} options={TYPE_OPTIONS} />
          </div>
          <label className={`flex items-center gap-2 text-sm ${textSecondary(theme)} cursor-pointer select-none`}>
            <input
              type="checkbox"
              className="rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900/20"
              checked={draft.enabled !== false}
              onChange={(e) => setDraft((d) => ({ ...d, enabled: e.target.checked }))}
            />
            对用户端展示（探索页等公共列表）
          </label>
        </div>
      </Modal>

      <Modal
        open={!!detailAnnouncement}
        onClose={() => setDetailAnnouncement(null)}
        title={detailAnnouncement?.title ?? '公告详情'}
        theme={theme}
        size="lg"
      >
        {detailAnnouncement && (
          <div className="space-y-3">
            <div className={`text-xs ${textMuted(theme)}`}>
              类型：{TYPE_OPTIONS.find((o) => o.value === detailAnnouncement.type)?.label ?? detailAnnouncement.type}
              <span className="mx-2">·</span>
              发布时间：{formatDateTime(detailAnnouncement.createdAt)}
            </div>
            <MarkdownView value={detailAnnouncement.content?.trim() ? detailAnnouncement.content : (detailAnnouncement.summary ?? '')} />
          </div>
        )}
      </Modal>

      <ConfirmDialog open={!!deleteTarget} title="删除公告" message={`确认删除「${deleteTarget?.title ?? ''}」？`} variant="warning" confirmText="删除" onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
      <ConfirmDialog
        open={batchDeleteConfirm}
        title="批量删除公告"
        message={`确认删除已选的 ${selectedKeys.size} 条公告？此操作不可恢复。`}
        variant="warning"
        confirmText="删除"
        loading={batchBusy}
        onConfirm={() => void runBatchDelete()}
        onCancel={() => setBatchDeleteConfirm(false)}
      />
    </MgmtPageShell>
  );
};
