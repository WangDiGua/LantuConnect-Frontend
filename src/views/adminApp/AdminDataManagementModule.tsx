import React, { useState } from 'react';
import { Theme, FontSize } from '../../types';
import { UserAppShell, cardClass, inputClass, btnPrimaryClass, btnGhostClass } from '../userApp/UserAppShell';
import { useAdminBackups, useCreateBackup, useRunBackup } from '../../hooks/queries/useAdmin';
import { PageSkeleton } from '../../components/common/PageSkeleton';
import { PageError } from '../../components/common/PageError';
import { EmptyState } from '../../components/common/EmptyState';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';

interface Props {
  activeSubItem: string;
  theme: Theme;
  fontSize: FontSize;
  showMessage: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const AdminDataManagementModule: React.FC<Props> = ({ activeSubItem, theme, fontSize, showMessage }) => {
  const backupsQuery = useAdminBackups();
  const createBackup = useCreateBackup();
  const runBackup = useRunBackup();
  const [restoreId, setRestoreId] = useState('');
  const [cleanPrefix, setCleanPrefix] = useState('tmp/');
  const [confirmClean, setConfirmClean] = useState(false);
  const [confirmRestore, setConfirmRestore] = useState(false);
  const [archives, setArchives] = useState<{ id: string; name: string; size: string }[]>([
    { id: 'ar1', name: '2025-Q4 归档卷', size: '1.2TB' },
  ]);
  const [buckets, setBuckets] = useState<{ id: string; name: string; region: string }[]>([
    { id: 'bk1', name: 'lantu-prod-oss', region: 'cn-east' },
  ]);

  const jobs = backupsQuery.data ?? [];

  const backupPanel = () => {
    if (backupsQuery.isLoading) return <PageSkeleton type="table" rows={4} />;
    if (backupsQuery.isError)
      return (
        <PageError
          error={backupsQuery.error instanceof Error ? backupsQuery.error : null}
          onRetry={() => backupsQuery.refetch()}
        />
      );
    if (!jobs.length)
      return (
        <EmptyState
          title="暂无备份任务"
          description="创建或运行首次备份后，将在此展示"
          action={
            <button
              type="button"
              className={btnPrimaryClass}
              disabled={createBackup.isPending}
              onClick={() => {
                createBackup.mutate(
                  { name: `手动快照 ${new Date().toLocaleString('zh-CN', { hour12: false })}`, schedule: 'manual', target: 'default' },
                  {
                    onSuccess: (row) => {
                      showMessage('快照任务已创建', 'success');
                      runBackup.mutate(row.id, {
                        onError: (e) => showMessage(e instanceof Error ? e.message : '执行失败', 'error'),
                      });
                    },
                    onError: (e) => showMessage(e instanceof Error ? e.message : '创建失败', 'error'),
                  },
                );
              }}
            >
              {createBackup.isPending ? '创建中…' : '创建并执行快照'}
            </button>
          }
        />
      );
    return (
      <div className={cardClass(theme)}>
        {jobs.map((j) => (
          <div key={j.id} className={`p-4 border-b last:border-0 ${theme === 'light' ? 'border-slate-100' : 'border-white/10'}`}>
            <div className="font-medium">{j.name}</div>
            <div className="text-xs text-slate-500 mt-1">
              {j.schedule} · 上次 {j.last} · {j.ok ? '成功' : '失败'}
            </div>
            <button
              type="button"
              className={`${btnGhostClass(theme)} mt-2 text-xs`}
              disabled={runBackup.isPending}
              onClick={() =>
                runBackup.mutate(j.id, {
                  onSuccess: () => showMessage('备份已触发', 'success'),
                  onError: (e) => showMessage(e instanceof Error ? e.message : '执行失败', 'error'),
                })
              }
            >
              立即执行
            </button>
          </div>
        ))}
      </div>
    );
  };

  if (activeSubItem === '数据备份') {
    return (
      <UserAppShell theme={theme} fontSize={fontSize} title="数据备份" subtitle="定时任务与手动快照">
        <button
          type="button"
          className={`${btnPrimaryClass} mb-4`}
          disabled={createBackup.isPending}
          onClick={() => {
            createBackup.mutate(
              { name: `手动快照 ${jobs.length + 1}`, schedule: 'manual', target: 'default' },
              {
                onSuccess: (row) => {
                  showMessage('快照任务已排队', 'success');
                  runBackup.mutate(row.id, {
                    onError: (e) => showMessage(e instanceof Error ? e.message : '执行失败', 'error'),
                  });
                },
                onError: (e) => showMessage(e instanceof Error ? e.message : '创建失败', 'error'),
              },
            );
          }}
        >
          {createBackup.isPending ? '提交中…' : '立即快照'}
        </button>
        {backupPanel()}
      </UserAppShell>
    );
  }

  if (activeSubItem === '数据恢复') {
    const restoreBody =
      backupsQuery.isLoading ? (
        <PageSkeleton type="form" />
      ) : backupsQuery.isError ? (
        <PageError
          error={backupsQuery.error instanceof Error ? backupsQuery.error : null}
          onRetry={() => backupsQuery.refetch()}
        />
      ) : (
        <div className={`${cardClass(theme)} p-4 max-w-lg space-y-3`}>
          <select className={inputClass(theme)} value={restoreId} onChange={(e) => setRestoreId(e.target.value)}>
            <option value="">选择备份点</option>
            {jobs.map((j) => (
              <option key={j.id} value={j.id}>
                {j.name} — {j.last}
              </option>
            ))}
          </select>
          <ConfirmDialog
            open={confirmRestore}
            title="确认数据恢复"
            message="恢复操作将覆盖当前数据，此操作不可撤销。确定继续？"
            confirmText="确认恢复"
            variant="warning"
            onCancel={() => setConfirmRestore(false)}
            onConfirm={() => {
              setConfirmRestore(false);
              showMessage('恢复任务已提交', 'success');
            }}
          />
          <button
            type="button"
            className={btnPrimaryClass}
            onClick={() => {
              if (!restoreId) {
                showMessage('请选择备份点', 'error');
                return;
              }
              setConfirmRestore(true);
            }}
          >
            提交恢复
          </button>
        </div>
      );

    return (
      <UserAppShell theme={theme} fontSize={fontSize} title="数据恢复" subtitle="从快照恢复到指定集群">
        {restoreBody}
      </UserAppShell>
    );
  }

  if (activeSubItem === '数据清理') {
    return (
      <UserAppShell theme={theme} fontSize={fontSize} title="数据清理" subtitle="按前缀批量删除临时对象（Mock）">
        <ConfirmDialog
          open={confirmClean}
          title="确认数据清理"
          message={`即将删除前缀「${cleanPrefix}」下的所有对象，此操作不可撤销。`}
          confirmText="执行清理"
          variant="danger"
          onCancel={() => setConfirmClean(false)}
          onConfirm={() => {
            setConfirmClean(false);
            showMessage(`已清理前缀 ${cleanPrefix}（Mock）`, 'success');
          }}
        />
        <div className={`${cardClass(theme)} p-4 max-w-lg space-y-3`}>
          <input className={inputClass(theme)} value={cleanPrefix} onChange={(e) => setCleanPrefix(e.target.value)} placeholder="前缀" />
          <button
            type="button"
            className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-xl text-sm font-semibold"
            onClick={() => {
              if (!cleanPrefix.trim()) {
                showMessage('请填写清理前缀', 'error');
                return;
              }
              setConfirmClean(true);
            }}
          >
            执行清理
          </button>
        </div>
      </UserAppShell>
    );
  }

  if (activeSubItem === '数据归档') {
    return (
      <UserAppShell theme={theme} fontSize={fontSize} title="数据归档" subtitle="冷存储卷管理">
        <button
          type="button"
          className={`${btnPrimaryClass} mb-4`}
          onClick={() => {
            setArchives((prev) => [...prev, { id: `ar${Date.now()}`, name: `归档_${prev.length + 1}`, size: '200GB' }]);
            showMessage('归档任务已创建', 'success');
          }}
        >
          新建归档任务
        </button>
        <div className={cardClass(theme)}>
          {archives.map((a) => (
            <div key={a.id} className={`p-4 flex justify-between border-b last:border-0 ${theme === 'light' ? 'border-slate-100' : 'border-white/10'}`}>
              <div>
                <div className="font-medium">{a.name}</div>
                <div className="text-xs text-slate-500">{a.size}</div>
              </div>
              <button type="button" className={btnGhostClass(theme)} onClick={() => showMessage('已发起解冻（Mock）', 'info')}>
                解冻
              </button>
            </div>
          ))}
        </div>
      </UserAppShell>
    );
  }

  if (activeSubItem === '存储桶') {
    return (
      <UserAppShell theme={theme} fontSize={fontSize} title="对象存储" subtitle="Bucket 与生命周期（Mock）">
        <button
          type="button"
          className={`${btnPrimaryClass} mb-4`}
          onClick={() => {
            setBuckets((prev) => [...prev, { id: `bk${Date.now()}`, name: `bucket-${prev.length}`, region: 'cn-north' }]);
            showMessage('Bucket 已创建', 'success');
          }}
        >
          新建 Bucket
        </button>
        <div className={cardClass(theme)}>
          {buckets.map((b) => (
            <div key={b.id} className={`p-4 border-b last:border-0 ${theme === 'light' ? 'border-slate-100' : 'border-white/10'}`}>
              <div className="font-mono">{b.name}</div>
              <div className="text-xs text-slate-500">{b.region}</div>
            </div>
          ))}
        </div>
      </UserAppShell>
    );
  }

  return (
    <UserAppShell theme={theme} fontSize={fontSize} title={activeSubItem} subtitle="请选择子菜单">
      <div className={cardClass(theme)} />
    </UserAppShell>
  );
};
