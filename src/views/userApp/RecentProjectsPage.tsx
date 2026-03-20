import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Pin, PinOff, Plus, Trash2, FolderOpen } from 'lucide-react';
import { Theme, FontSize } from '../../types';
import { UserAppShell, cardClass, inputClass, btnPrimaryClass, btnGhostClass } from './UserAppShell';
import { useProjectList, useCreateProject, useUpdateProject, useDeleteProject } from '../../hooks/queries/useProject';
import { createProjectSchema, type CreateProjectFormValues } from '../../schemas/project.schema';
import type { Project } from '../../types/dto/project';
import { ApiException } from '../../types/api';
import { PageSkeleton } from '../../components/common/PageSkeleton';
import { PageError } from '../../components/common/PageError';
import { EmptyState } from '../../components/common/EmptyState';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';

interface RecentProjectsPageProps {
  theme: Theme;
  fontSize: FontSize;
  showMessage: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

function toPageError(err: unknown): Error | null {
  if (err == null) return null;
  if (err instanceof Error) return err;
  return new Error(String(err));
}

export const RecentProjectsPage: React.FC<RecentProjectsPageProps> = ({ theme, fontSize, showMessage }) => {
  const { data, isLoading, error, refetch } = useProjectList({ pageSize: 100 });
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();

  const [showCreate, setShowCreate] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateProjectFormValues>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: { name: '', type: 'agent', description: '' },
  });

  const projects = data?.list ?? [];
  const sorted = [...projects].sort((a, b) => Number(b.pinned) - Number(a.pinned));
  const queryError = toPageError(error);

  const openCreate = () => {
    reset({ name: '', type: 'agent', description: '' });
    setShowCreate(true);
  };

  const closeCreate = () => {
    setShowCreate(false);
    reset({ name: '', type: 'agent', description: '' });
  };

  const onCreateSubmit = async (values: CreateProjectFormValues) => {
    try {
      await createProject.mutateAsync({
        name: values.name.trim(),
        type: values.type,
        description: values.description?.trim() || undefined,
      });
      closeCreate();
      showMessage('项目已创建', 'success');
    } catch (err) {
      const msg = err instanceof ApiException ? err.message : '创建失败，请稍后重试';
      showMessage(msg, 'error');
    }
  };

  const togglePin = async (p: Project) => {
    try {
      await updateProject.mutateAsync({ id: p.id, data: { pinned: !p.pinned } });
      showMessage('已更新置顶', 'success');
    } catch (err) {
      const msg = err instanceof ApiException ? err.message : '更新失败，请稍后重试';
      showMessage(msg, 'error');
    }
  };

  const openProject = (p: Project) => {
    showMessage(`已打开「${p.name}」（演示：可接入真实路由）`, 'info');
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    try {
      await deleteProject.mutateAsync(id);
      setDeleteTarget(null);
      showMessage('已删除项目', 'success');
    } catch (err) {
      const msg = err instanceof ApiException ? err.message : '删除失败，请稍后重试';
      showMessage(msg, 'error');
    }
  };

  return (
    <UserAppShell
      theme={theme}
      fontSize={fontSize}
      title="最近项目"
      subtitle="快速回到您正在编辑的 Agent、工作流与知识库"
      actions={
        <button type="button" className={btnPrimaryClass} onClick={openCreate}>
          <span className="inline-flex items-center gap-2">
            <Plus size={16} /> 新建项目
          </span>
        </button>
      }
    >
      <div className={`${cardClass(theme)} p-4 sm:p-5`}>
        {isLoading && (
          <PageSkeleton
            type="table"
            rows={6}
          />
        )}

        {!isLoading && queryError && (
          <PageError error={queryError} onRetry={() => void refetch()} />
        )}

        {!isLoading && !queryError && sorted.length > 0 && (
          <div className="space-y-2">
            {sorted.map((p) => (
              <div
                key={p.id}
                className={`flex items-center gap-3 p-3 rounded-xl ${
                  theme === 'light' ? 'bg-slate-50 hover:bg-slate-100/80' : 'bg-white/5 hover:bg-white/10'
                }`}
              >
                <button
                  type="button"
                  onClick={() => void togglePin(p)}
                  disabled={updateProject.isPending}
                  className={`p-2 rounded-lg ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'} disabled:opacity-50`}
                  title={p.pinned ? '取消置顶' : '置顶'}
                >
                  {p.pinned ? <Pin size={18} className="text-amber-500" /> : <PinOff size={18} />}
                </button>
                <button type="button" className="flex-1 text-left min-w-0" onClick={() => openProject(p)}>
                  <div className={`font-semibold truncate ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    {p.name}
                  </div>
                  <div className={`text-xs mt-0.5 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>
                    {p.type} · 更新 {p.updatedAt}
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(p)}
                  className={`p-2 rounded-lg ${theme === 'light' ? 'text-red-600 hover:bg-red-50' : 'text-red-400 hover:bg-red-500/10'}`}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}

        {!isLoading && !queryError && sorted.length === 0 && (
          <EmptyState
            icon={<FolderOpen className="text-slate-400" size={28} />}
            title="暂无项目"
            description="点击「新建项目」开始"
            action={
              <button type="button" className={btnPrimaryClass} onClick={openCreate}>
                <span className="inline-flex items-center gap-2">
                  <Plus size={16} /> 新建项目
                </span>
              </button>
            }
          />
        )}
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50" role="dialog">
          <div className={`w-full max-w-md rounded-2xl p-5 ${cardClass(theme)}`}>
            <h3 className={`text-lg font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>新建项目</h3>
            <form onSubmit={handleSubmit(onCreateSubmit)} className="space-y-3">
              <div>
                <label className={`block text-sm mb-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>名称</label>
                <input
                  className={`${inputClass(theme)} ${errors.name ? 'ring-1 ring-red-400' : ''}`}
                  placeholder="例如：图书馆咨询助手"
                  {...register('name')}
                />
                {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
              </div>
              <div>
                <label className={`block text-sm mb-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>类型</label>
                <select className={inputClass(theme)} {...register('type')}>
                  <option value="Agent">Agent</option>
                  <option value="工作流">工作流</option>
                  <option value="知识库">知识库</option>
                </select>
                {errors.type && <p className="mt-1 text-xs text-red-500">{errors.type.message}</p>}
              </div>
              <div>
                <label className={`block text-sm mb-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>描述（可选）</label>
                <textarea
                  className={`${inputClass(theme)} min-h-[80px] resize-y`}
                  placeholder="项目说明"
                  {...register('description')}
                />
                {errors.description && <p className="mt-1 text-xs text-red-500">{errors.description.message}</p>}
              </div>
              <div className="flex justify-end gap-2 mt-5">
                <button type="button" className={btnGhostClass(theme)} onClick={closeCreate} disabled={createProject.isPending}>
                  取消
                </button>
                <button type="submit" className={btnPrimaryClass} disabled={createProject.isPending}>
                  {createProject.isPending ? '创建中…' : '创建'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={deleteTarget != null}
        title="删除项目"
        message={
          deleteTarget
            ? `确定删除「${deleteTarget.name}」？此操作不可撤销。`
            : ''
        }
        confirmText="删除"
        cancelText="取消"
        variant="danger"
        loading={deleteProject.isPending}
        onConfirm={() => void confirmDelete()}
        onCancel={() => !deleteProject.isPending && setDeleteTarget(null)}
      />
    </UserAppShell>
  );
};
