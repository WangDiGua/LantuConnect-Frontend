import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, Plus, Trash2, Edit2, Megaphone, Eye } from 'lucide-react';
import { Editor } from '@bytemd/react';
import gfm from '@bytemd/plugin-gfm';
import 'bytemd/dist/index.css';
import './announcement-editor.css';
import { Theme, FontSize } from '../../types';
import { MgmtPageShell } from '../userMgmt/MgmtPageShell';
import { systemConfigService } from '../../api/services/system-config.service';
import type { AnnouncementItem, AnnouncementCreateRequest } from '../../types/dto/explore';
import { BentoCard } from '../../components/common/BentoCard';
import { PageSkeleton } from '../../components/common/PageSkeleton';
import { EmptyState } from '../../components/common/EmptyState';
import { Modal } from '../../components/common/Modal';
import { LantuSelect } from '../../components/common/LantuSelect';
import { MarkdownView } from '../../components/common/MarkdownView';
import { nativeInputClass } from '../../utils/formFieldClasses';
import { btnPrimary, btnSecondary, textPrimary, textSecondary, textMuted } from '../../utils/uiClasses';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { PageError } from '../../components/common/PageError';
import { formatDateTime } from '../../utils/formatDateTime';
import { resolvePersonDisplay } from '../../utils/personDisplay';

interface Props { theme: Theme; fontSize: FontSize; showMessage: (msg: string, type?: 'success' | 'error' | 'info') => void; }

const TYPE_OPTIONS = [
  { value: 'feature', label: '新功能' },
  { value: 'maintenance', label: '维护' },
  { value: 'update', label: '更新' },
  { value: 'notice', label: '公告' },
];

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

export const AnnouncementPage: React.FC<Props> = ({ theme, fontSize, showMessage }) => {
  const isDark = theme === 'dark';
  const inputCls = `${nativeInputClass(theme)} ${INPUT_FOCUS}`;
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<Error | null>(null);
  const [list, setList] = useState<AnnouncementItem[]>([]);
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
      const res = await systemConfigService.listAnnouncements({ page: 1, pageSize: 50 });
      setList(res?.list ?? (Array.isArray(res) ? res as any : []));
    } catch (err) {
      setList([]);
      setLoadError(err instanceof Error ? err : new Error('加载公告列表失败'));
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchList(); }, [fetchList]);

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

  if (loading) return <MgmtPageShell theme={theme} fontSize={fontSize} titleIcon={Megaphone} breadcrumbSegments={['系统配置', '平台公告']}><PageSkeleton type="table" /></MgmtPageShell>;

  if (loadError) return (
    <MgmtPageShell theme={theme} fontSize={fontSize} titleIcon={Megaphone} breadcrumbSegments={['系统配置', '平台公告']}>
      <PageError error={loadError} onRetry={fetchList} retryLabel="重试加载公告" />
    </MgmtPageShell>
  );

  return (
    <MgmtPageShell theme={theme} fontSize={fontSize} titleIcon={Megaphone} breadcrumbSegments={['系统配置', '平台公告']}
      toolbar={<button type="button" className={btnPrimary} onClick={openCreateModal}><Plus size={14} /> 发布公告</button>}>
      <div className="px-4 sm:px-6 pb-6">
        {list.length === 0 ? (
          <EmptyState title="暂无公告" description={'点击「发布公告」创建第一条平台公告'} />
        ) : (
          <BentoCard theme={theme} padding="sm">
            {list.map((a) => (
              <div key={a.id} className={`px-4 py-3.5 flex items-start justify-between gap-3 border-b last:border-0 ${isDark ? 'border-white/[0.06]' : 'border-slate-100'}`}>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${TYPE_BADGE[a.type] ?? TYPE_BADGE.notice}`}>
                      {TYPE_OPTIONS.find(o => o.value === a.type)?.label ?? a.type}
                    </span>
                    <span className={`font-bold text-sm ${textPrimary(theme)}`}>{a.title}</span>
                  </div>
                  <p className={`text-xs mb-2 line-clamp-2 ${textMuted(theme)}`}>{a.summary || '—'}</p>
                  <div className={`flex flex-wrap gap-x-4 gap-y-1 text-[11px] ${textMuted(theme)}`}>
                    <span>ID：{String(a.id ?? '—')}</span>
                    <span>置顶：{a.pinned ? '是' : '否'}</span>
                    <span>启用：{a.enabled == null ? '—' : (a.enabled ? '是' : '否')}</span>
                    <span>删除标记：{a.deleted == null ? '—' : String(a.deleted)}</span>
                    <span>创建人：{resolvePersonDisplay({ names: [a.createdByName], ids: [a.createdBy] })}</span>
                    <span>创建时间：{formatDateTime(a.createdAt)}</span>
                    <span>更新时间：{formatDateTime(a.updatedAt)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
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
              </div>
            ))}
          </BentoCard>
        )}
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
