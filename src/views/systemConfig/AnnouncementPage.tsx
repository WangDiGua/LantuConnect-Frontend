import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Plus, Trash2, Edit2, Megaphone, Eye } from 'lucide-react';
import { Editor } from '@bytemd/react';
import gfm from '@bytemd/plugin-gfm';
import 'bytemd/dist/index.css';
import './announcement-editor.css';
import { Theme, FontSize } from '../../types';
import { MgmtPageShell } from '../userMgmt/MgmtPageShell';
import { systemConfigService } from '../../api/services/system-config.service';
import type { AnnouncementItem, AnnouncementCreateRequest } from '../../types/dto/explore';
import { PageSkeleton } from '../../components/common/PageSkeleton';
import { MgmtDataTable } from '../../components/management/MgmtDataTable';
import { EmptyState } from '../../components/common/EmptyState';
import { Modal } from '../../components/common/Modal';
import { LantuSelect } from '../../components/common/LantuSelect';
import { MarkdownView } from '../../components/common/MarkdownView';
import { nativeInputClass } from '../../utils/formFieldClasses';
import { btnPrimary, btnSecondary, textPrimary, textSecondary, textMuted } from '../../utils/uiClasses';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { PageError } from '../../components/common/PageError';
import { Pagination } from '../../components/common/Pagination';
import { formatDateTime } from '../../utils/formatDateTime';
import { resolvePersonDisplay } from '../../utils/personDisplay';

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
const MD_PLUGINS = [gfm()];
const MD_LOCALE = {
  write: '编辑',
  preview: '预览',
  source: '源码',
  fullscreen: '全屏',
  exitFullscreen: '退出全屏',
  help: '帮助',
  top: '回到顶部',
  words: '字数',
  lines: '行数',
};

const PAGE_DESCRIPTION = '发布与维护面向师生的平台公告与通知';

export const AnnouncementPage: React.FC<Props> = ({ theme, fontSize, showMessage }) => {
  const isDark = theme === 'dark';
  const inputCls = `${nativeInputClass(theme)} ${INPUT_FOCUS}`;
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<Error | null>(null);
  const [list, setList] = useState<AnnouncementItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filterKeyword, setFilterKeyword] = useState('');
  const [filterType, setFilterType] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<AnnouncementItem | null>(null);
  const [detailAnnouncement, setDetailAnnouncement] = useState<AnnouncementItem | null>(null);
  const [draft, setDraft] = useState<AnnouncementCreateRequest>({ title: '', summary: '', content: '', type: 'notice' });
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AnnouncementItem | null>(null);

  const fetchList = useCallback(async () => {
    setLoadError(null);
    setLoading(true);
    try {
      const res = await systemConfigService.listAnnouncements({
        page,
        pageSize: ANNOUNCEMENT_PAGE_SIZE,
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
  }, [page]);

  useEffect(() => {
    void fetchList();
  }, [fetchList]);

  /** 关键词与类型仅过滤当前页 `list`；底部分页 total 来自服务端全库分页，二者可能不一致（见 UI 说明）。 */
  const filteredRows = useMemo(() => {
    const kw = filterKeyword.trim().toLowerCase();
    return list.filter((a) => {
      if (filterType && a.type !== filterType) return false;
      if (!kw) return true;
      const title = (a.title ?? '').toLowerCase();
      const summary = (a.summary ?? '').toLowerCase();
      return title.includes(kw) || summary.includes(kw);
    });
  }, [list, filterKeyword, filterType]);

  const openCreateModal = () => {
    setEditing(null);
    setDraft({ title: '', summary: '', content: '', type: 'notice' });
    setShowCreate(true);
  };

  const openEditModal = (item: AnnouncementItem) => {
    setEditing(item);
    setDraft({
      title: item.title ?? '',
      summary: item.summary ?? '',
      content: item.content?.trim() ? item.content : (item.summary ?? ''),
      type: item.type ?? 'notice',
      pinned: item.pinned,
    });
    setShowCreate(true);
  };

  const handleSaveAnnouncement = async () => {
    if (!draft.title.trim()) { showMessage('请填写标题', 'error'); return; }
    if (!draft.summary?.trim()) { showMessage('请填写公告摘要', 'error'); return; }
    if (!draft.content?.trim()) { showMessage('请填写公告内容', 'error'); return; }
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
      setDraft({ title: '', summary: '', content: '', type: 'notice' });
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
          <span className="font-semibold text-[13px] line-clamp-2">{a.title}</span>
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
        cell: (a: AnnouncementItem) => (
          <div className="inline-flex flex-wrap items-center justify-end gap-1 h-8">
            <button
              type="button"
              onClick={() => setDetailAnnouncement(a)}
              className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md ${isDark ? 'text-slate-300 hover:bg-white/10' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              <Eye size={13} />
              查看
            </button>
            <button
              type="button"
              onClick={() => openEditModal(a)}
              className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md ${isDark ? 'text-slate-300 hover:bg-white/10' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              <Edit2 size={13} />
              编辑
            </button>
            <button
              type="button"
              onClick={() => setDeleteTarget(a)}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md text-rose-500 hover:bg-rose-50/60 dark:hover:bg-rose-500/10"
            >
              <Trash2 size={13} />
              删除
            </button>
          </div>
        ),
      },
    ],
    [isDark, theme],
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
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <input
              type="search"
              className={`${inputCls} w-full min-w-0 sm:max-w-[14rem]`}
              placeholder="关键词（标题/摘要）"
              value={filterKeyword}
              onChange={(e) => setFilterKeyword(e.target.value)}
              aria-label="按标题或摘要筛选"
            />
            <LantuSelect
              theme={theme}
              value={filterType}
              onChange={setFilterType}
              options={TYPE_FILTER_OPTIONS}
              placeholder="类型"
              triggerClassName="!min-w-[7rem]"
            />
            <p className={`m-0 text-xs max-w-xl ${textMuted(theme)}`}>
              当前为前端筛选，仅在本页数据中过滤；全量检索待接口支持 keyword、type。底部分页条数为服务端总数。
            </p>
          </div>
          <button type="button" className={`${btnPrimary} shrink-0 self-start lg:self-center`} onClick={openCreateModal}>
            <Plus size={14} /> 发布公告
          </button>
        </div>
      }
    >
      <div className="px-4 sm:px-6 pb-6 flex flex-col min-h-0">
        {list.length === 0 ? (
          <EmptyState title="暂无公告" description="点击「发布公告」创建第一条平台公告" />
        ) : filteredRows.length === 0 ? (
          <EmptyState title="本页无匹配结果" description="请调整关键词或类型，或切换页码查看其它数据。" />
        ) : (
          <MgmtDataTable
            theme={theme}
            columns={announcementColumns}
            rows={filteredRows}
            getRowKey={(a) => String(a.id)}
            minWidth="96rem"
            surface="plain"
          />
        )}
        <Pagination
          page={page}
          pageSize={ANNOUNCEMENT_PAGE_SIZE}
          total={total}
          onChange={setPage}
        />
      </div>

      <Modal open={showCreate} onClose={() => { setShowCreate(false); setEditing(null); }} title={editing ? '编辑平台公告' : '发布平台公告'} theme={theme} size="md"
        footer={<div className="flex justify-end gap-2">
          <button type="button" className={btnSecondary(theme)} onClick={() => { setShowCreate(false); setEditing(null); }}>取消</button>
          <button type="button" className={`${btnPrimary} disabled:opacity-50`} disabled={saving} onClick={handleSaveAnnouncement}>
            {saving ? <><Loader2 size={14} className="animate-spin" /> {editing ? '保存中…' : '发布中…'}</> : (editing ? '保存' : '发布')}
          </button>
        </div>}>
        <div className="space-y-4">
          <div>
            <label className={`text-sm font-medium ${textSecondary(theme)} mb-1 block`}>标题</label>
            <input className={inputCls} value={draft.title} onChange={(e) => setDraft(d => ({ ...d, title: e.target.value }))} placeholder="公告标题" />
          </div>
          <div>
            <label className={`text-sm font-medium ${textSecondary(theme)} mb-1 block`}>公告内容（Markdown）</label>
            <div className={`announcement-md-wrapper rounded-xl overflow-hidden border ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
              <Editor
                value={draft.content ?? ''}
                plugins={MD_PLUGINS}
                mode="split"
                locale={MD_LOCALE}
                placeholder="支持 Markdown 语法录入公告正文"
                onChange={(value) => setDraft((d) => ({ ...d, content: value }))}
              />
            </div>
          </div>
          <div>
            <label className={`text-sm font-medium ${textSecondary(theme)} mb-1 block`}>摘要（手填）</label>
            <textarea
              className={`${inputCls} min-h-[84px] resize-none`}
              value={draft.summary ?? ''}
              onChange={(e) => setDraft((d) => ({ ...d, summary: e.target.value }))}
              placeholder="请填写公告摘要（列表卡片展示用）"
            />
          </div>
          <div>
            <label className={`text-sm font-medium ${textSecondary(theme)} mb-1 block`}>类型</label>
            <LantuSelect theme={theme} value={draft.type} onChange={(v) => setDraft(d => ({ ...d, type: v as any }))} options={TYPE_OPTIONS} />
          </div>
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
    </MgmtPageShell>
  );
};
