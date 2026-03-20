import React, { useEffect, useState } from 'react';
import { Key, Copy, Trash2 } from 'lucide-react';
import { Theme, FontSize } from '../../types';
import { UserAppShell, cardClass, inputClass, btnPrimaryClass, btnGhostClass } from './UserAppShell';
import {
  useUserWorkspace,
  useUpdateWorkspace,
  useUserApiKeys,
  useCreateUserApiKey,
  useDeleteUserApiKey,
  useUserStats,
} from '../../hooks/queries/useUserSettings';
import { PageSkeleton } from '../../components/common/PageSkeleton';
import { PageError } from '../../components/common/PageError';
import { EmptyState } from '../../components/common/EmptyState';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { ApiException } from '../../types/api';

interface UserSettingsExtrasModuleProps {
  activeSubItem: string;
  theme: Theme;
  fontSize: FontSize;
  showMessage: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const UserSettingsExtrasModule: React.FC<UserSettingsExtrasModuleProps> = ({
  activeSubItem,
  theme,
  fontSize,
  showMessage,
}) => {
  const [newKeyName, setNewKeyName] = useState('');
  const [deleteKeyId, setDeleteKeyId] = useState<string | null>(null);
  const workspaceQ = useUserWorkspace();
  const updateWsM = useUpdateWorkspace();
  const keysQ = useUserApiKeys();
  const createKeyM = useCreateUserApiKey();
  const deleteKeyM = useDeleteUserApiKey();
  const statsQ = useUserStats();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [defaultModel, setDefaultModel] = useState('');
  const [maxConcurrent, setMaxConcurrent] = useState<number | ''>('');

  useEffect(() => {
    const w = workspaceQ.data;
    if (!w) return;
    setName(w.name ?? '');
    setDescription(w.description ?? '');
    setDefaultModel(w.defaultModel ?? '');
    setMaxConcurrent(w.maxConcurrentRuns ?? '');
  }, [workspaceQ.data]);

  if (activeSubItem === '工作空间') {
    if (workspaceQ.isLoading) {
      return (
        <UserAppShell theme={theme} fontSize={fontSize} title="工作空间设置" subtitle="名称、模型与并发">
          <PageSkeleton type="form" />
        </UserAppShell>
      );
    }
    if (workspaceQ.isError) {
      return (
        <UserAppShell theme={theme} fontSize={fontSize} title="工作空间设置" subtitle="名称、模型与并发">
          <PageError error={workspaceQ.error as Error} onRetry={() => workspaceQ.refetch()} />
        </UserAppShell>
      );
    }

    return (
      <UserAppShell theme={theme} fontSize={fontSize} title="工作空间设置" subtitle="名称、模型与并发">
        <div className={`${cardClass(theme)} p-6 max-w-xl space-y-4`}>
          <div>
            <label className="text-xs text-slate-500 block mb-1">显示名称</label>
            <input className={inputClass(theme)} value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">描述</label>
            <textarea
              rows={3}
              className={`${inputClass(theme)} resize-none`}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">默认模型</label>
            <input
              className={inputClass(theme)}
              value={defaultModel}
              onChange={(e) => setDefaultModel(e.target.value)}
              placeholder="如 gpt-4o"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">最大并发运行数</label>
            <input
              type="number"
              min={1}
              className={inputClass(theme)}
              value={maxConcurrent === '' ? '' : String(maxConcurrent)}
              onChange={(e) => {
                const v = e.target.value;
                setMaxConcurrent(v === '' ? '' : Number(v));
              }}
            />
          </div>
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              className={btnPrimaryClass}
              disabled={updateWsM.isPending}
              onClick={() => {
                updateWsM.mutate(
                  {
                    name: name.trim() || undefined,
                    description: description.trim() || undefined,
                    defaultModel: defaultModel.trim() || undefined,
                    maxConcurrentRuns: maxConcurrent === '' ? undefined : Number(maxConcurrent),
                  },
                  {
                    onSuccess: () => showMessage('工作空间已保存', 'success'),
                    onError: (e) => showMessage(e instanceof ApiException ? e.message : '保存失败', 'error'),
                  }
                );
              }}
            >
              {updateWsM.isPending ? '保存中…' : '保存'}
            </button>
            <button type="button" className={btnGhostClass(theme)} onClick={() => showMessage('成员导出请使用组织管理模块', 'info')}>
              导出成员
            </button>
          </div>
        </div>
      </UserAppShell>
    );
  }

  if (activeSubItem === 'API Key') {
    if (keysQ.isLoading) {
      return (
        <UserAppShell theme={theme} fontSize={fontSize} title="API Key" subtitle="创建、复制与吊销">
          <PageSkeleton type="table" rows={4} />
        </UserAppShell>
      );
    }
    if (keysQ.isError) {
      return (
        <UserAppShell theme={theme} fontSize={fontSize} title="API Key" subtitle="创建、复制与吊销">
          <PageError error={keysQ.error as Error} onRetry={() => keysQ.refetch()} />
        </UserAppShell>
      );
    }

    const keys = keysQ.data ?? [];

    return (
      <UserAppShell theme={theme} fontSize={fontSize} title="API Key" subtitle="创建、复制与吊销">
        <div className={`${cardClass(theme)} p-4 mb-4 flex flex-wrap gap-2`}>
          <input className={inputClass(theme)} placeholder="密钥备注" value={newKeyName} onChange={(e) => setNewKeyName(e.target.value)} />
          <button
            type="button"
            className={btnPrimaryClass}
            disabled={createKeyM.isPending}
            onClick={() => {
              if (!newKeyName.trim()) {
                showMessage('请填写备注', 'error');
                return;
              }
              createKeyM.mutate(
                { name: newKeyName.trim() },
                {
                  onSuccess: () => {
                    setNewKeyName('');
                    showMessage('新密钥已生成', 'success');
                  },
                  onError: (e) => showMessage(e instanceof ApiException ? e.message : '创建失败', 'error'),
                }
              );
            }}
          >
            {createKeyM.isPending ? '创建中…' : '创建密钥'}
          </button>
        </div>
        <div className={cardClass(theme)}>
          {keys.length === 0 ? (
            <EmptyState title="暂无 API Key" description="创建后可在此管理访问凭证。" />
          ) : (
            keys.map((k) => (
              <div
                key={k.id}
                className={`p-4 flex flex-wrap justify-between gap-3 border-b last:border-0 ${
                  theme === 'light' ? 'border-slate-100' : 'border-white/10'
                }`}
              >
                <div>
                  <div className={`font-medium flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    <Key size={16} />
                    {k.name}
                  </div>
                  <div className="font-mono text-sm text-slate-500 mt-1">{k.prefix}</div>
                  <div className="text-xs text-slate-400 mt-1">
                    创建于 {k.createdAt}
                    {k.lastUsed ? ` · 最近使用 ${k.lastUsed}` : ''}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className={btnGhostClass(theme)}
                    onClick={() => {
                      void navigator.clipboard?.writeText(k.prefix);
                      showMessage('已复制前缀到剪贴板', 'success');
                    }}
                  >
                    <Copy size={16} className="inline mr-1" />
                    复制
                  </button>
                  <button type="button" className="text-red-500 text-sm flex items-center gap-1" onClick={() => setDeleteKeyId(k.id)}>
                    <Trash2 size={16} />
                    吊销
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <ConfirmDialog
          open={!!deleteKeyId}
          title="吊销 API Key"
          message="吊销后该密钥将立即失效，是否继续？"
          variant="danger"
          confirmText="吊销"
          loading={deleteKeyM.isPending}
          onCancel={() => setDeleteKeyId(null)}
          onConfirm={() => {
            if (!deleteKeyId) return;
            deleteKeyM.mutate(deleteKeyId, {
              onSuccess: () => {
                showMessage('密钥已吊销', 'success');
                setDeleteKeyId(null);
              },
              onError: (e) => showMessage(e instanceof ApiException ? e.message : '吊销失败', 'error'),
            });
          }}
        />
      </UserAppShell>
    );
  }

  if (activeSubItem === '使用统计') {
    if (statsQ.isLoading) {
      return (
        <UserAppShell theme={theme} fontSize={fontSize} title="使用统计" subtitle="调用量与资源概览">
          <PageSkeleton type="cards" />
        </UserAppShell>
      );
    }
    if (statsQ.isError) {
      return (
        <UserAppShell theme={theme} fontSize={fontSize} title="使用统计" subtitle="调用量与资源概览">
          <PageError error={statsQ.error as Error} onRetry={() => statsQ.refetch()} />
        </UserAppShell>
      );
    }

    const s = statsQ.data;
    const periodLabel = s?.period === '30d' ? '近 30 天' : s?.period === '7d' ? '近 7 天' : s?.period ?? '当前周期';

    return (
      <UserAppShell theme={theme} fontSize={fontSize} title="使用统计" subtitle="调用量与资源概览">
        <p className={`text-xs mb-4 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>统计周期：{periodLabel}</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'API 调用', value: (s?.apiCalls ?? 0).toLocaleString() },
            { label: 'Token 用量', value: (s?.tokensUsed ?? 0).toLocaleString() },
            { label: 'Agent 数', value: String(s?.agentsCreated ?? 0) },
            { label: '数据集', value: String(s?.datasetsCreated ?? 0) },
          ].map((x) => (
            <div key={x.label} className={`${cardClass(theme)} p-4`}>
              <div className="text-xs text-slate-500">{x.label}</div>
              <div className={`text-2xl font-semibold mt-1 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{x.value}</div>
            </div>
          ))}
        </div>
        <div className={cardClass(theme)}>
          <div className={`p-3 text-sm font-medium border-b ${theme === 'light' ? 'border-slate-100' : 'border-white/10'}`}>更多维度</div>
          <EmptyState
            title="暂无拆分数据"
            description="产品维度占比可由后端扩展统计接口后展示。"
            icon={<Key size={28} className="text-slate-400" />}
          />
        </div>
        <button type="button" className={`${btnGhostClass(theme)} mt-4`} onClick={() => showMessage('导出任务已提交', 'success')}>
          导出明细
        </button>
      </UserAppShell>
    );
  }

  return (
    <UserAppShell theme={theme} fontSize={fontSize} title={activeSubItem} subtitle="请选择左侧子菜单">
      <div className={cardClass(theme)} />
    </UserAppShell>
  );
};
