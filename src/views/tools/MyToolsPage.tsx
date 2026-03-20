import React, { useMemo, useState } from 'react';
import { Search, Power, RefreshCw, Package } from 'lucide-react';
import { Theme, FontSize } from '../../types';
import { MgmtPageShell } from '../userMgmt/MgmtPageShell';
import { TOOLBAR_ROW, toolbarSearchInputClass } from '../../utils/toolbarFieldClasses';
import { nativeSelectClass } from '../../utils/formFieldClasses';
import { useMyTools, useDeleteMcpServer } from '../../hooks/queries/useTool';
import { ContentLoader } from '../../components/common/ContentLoader';
import { PageError } from '../../components/common/PageError';
import { EmptyState } from '../../components/common/EmptyState';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import type { McpServer } from '../../types/dto/tool';

interface MyToolsPageProps {
  theme: Theme;
  fontSize: FontSize;
  showMessage: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const MyToolsPage: React.FC<MyToolsPageProps> = ({ theme, fontSize, showMessage }) => {
  const isDark = theme === 'dark';
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<string>('all');
  const [deleteTarget, setDeleteTarget] = useState<McpServer | null>(null);

  const { data: servers, isLoading, isError, error, refetch } = useMyTools();
  const deleteMut = useDeleteMcpServer();

  const filtered = useMemo(() => {
    const list = servers ?? [];
    const t = q.trim().toLowerCase();
    return list.filter((r) => {
      if (status !== 'all') {
        const statusLabel = r.status === 'running' ? '运行中' : r.status === 'error' ? '异常' : '已停用';
        if (statusLabel !== status) return false;
      }
      if (!t) return true;
      return r.name.toLowerCase().includes(t) || r.transportType.toLowerCase().includes(t);
    });
  }, [servers, q, status]);

  const statusLabel = (s: McpServer['status']) =>
    s === 'running' ? '运行中' : s === 'error' ? '异常' : '已停用';

  const statusCls = (s: McpServer['status']) =>
    s === 'running'
      ? isDark ? 'bg-emerald-500/15 text-emerald-300' : 'bg-emerald-100 text-emerald-700'
      : s === 'error'
        ? isDark ? 'bg-red-500/15 text-red-300' : 'bg-red-100 text-red-700'
        : isDark ? 'bg-white/10 text-slate-400' : 'bg-slate-100 text-slate-600';

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteMut.mutate(deleteTarget.id, {
      onSuccess: () => { setDeleteTarget(null); showMessage('已删除', 'success'); },
    });
  };

  if (isError) {
    return (
      <MgmtPageShell theme={theme} fontSize={fontSize} breadcrumbSegments={['工具广场', '我的工具']} titleIcon={Package}>
        <PageError error={error instanceof Error ? error : null} onRetry={() => refetch()} />
      </MgmtPageShell>
    );
  }

  return (
    <MgmtPageShell
      theme={theme}
      fontSize={fontSize}
      breadcrumbSegments={['工具广场', '我的工具']}
      titleIcon={Package}
      description="已接入或订阅的工具与 MCP 服务；支持启停与检索"
      toolbar={
        <div className={TOOLBAR_ROW}>
          <div className="relative flex-1 min-w-0 sm:max-w-md">
            <Search
              className={`absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${isDark ? 'text-slate-500' : 'text-slate-400'}`}
              size={16}
            />
            <input
              type="search"
              placeholder="搜索名称或类型…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className={toolbarSearchInputClass(theme)}
            />
          </div>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className={`${nativeSelectClass(theme)} w-full sm:w-[8.5rem] shrink-0`}
          >
            <option value="all">全部状态</option>
            <option value="运行中">运行中</option>
            <option value="已停用">已停用</option>
            <option value="异常">异常</option>
          </select>
          <button
            type="button"
            onClick={() => refetch()}
            className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium min-h-[2.5rem] border shrink-0 ${
              isDark ? 'border-white/15 text-slate-200 hover:bg-white/5' : 'border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <RefreshCw size={16} />
            刷新
          </button>
        </div>
      }
    >
      <ContentLoader loading={isLoading}>
        <div className="min-w-0 px-4 sm:px-6 pb-6 pt-1 overflow-x-auto">
          {filtered.length === 0 ? (
            <EmptyState title="无匹配工具" description="调整筛选条件或添加新工具" />
          ) : (
            <table className="w-full text-left text-sm min-w-[720px]">
              <thead className={isDark ? 'text-slate-400' : 'text-slate-500'}>
                <tr className={`border-b ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
                  <th className="py-3 pr-4 font-semibold">名称</th>
                  <th className="py-3 pr-4 font-semibold">传输</th>
                  <th className="py-3 pr-4 font-semibold">状态</th>
                  <th className="py-3 pr-4 font-semibold">版本</th>
                  <th className="py-3 pr-4 font-semibold">工具数</th>
                  <th className="py-3 pr-4 font-semibold">更新时间</th>
                  <th className="py-3 text-right font-semibold">操作</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, idx) => (
                  <tr
                    key={r.id}
                    className={`border-b ${isDark ? 'border-white/5' : 'border-slate-100'} ${
                      isDark ? (idx % 2 === 1 ? 'bg-white/5' : '') : idx % 2 === 1 ? 'bg-slate-50/80' : ''
                    }`}
                  >
                    <td className="py-3 pr-4 font-medium">{r.name}</td>
                    <td className="py-3 pr-4 font-mono text-xs">{r.transportType}</td>
                    <td className="py-3 pr-4">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-lg ${statusCls(r.status)}`}>
                        {statusLabel(r.status)}
                      </span>
                    </td>
                    <td className="py-3 pr-4 font-mono text-xs">{r.version}</td>
                    <td className="py-3 pr-4 tabular-nums">{r.tools.length}</td>
                    <td className="py-3 pr-4 text-slate-500">{r.updatedAt}</td>
                    <td className="py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(r)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium text-red-500 ${
                          isDark ? 'hover:bg-white/10' : 'hover:bg-red-50'
                        }`}
                      >
                        <Power size={14} />
                        删除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </ContentLoader>

      <ConfirmDialog
        open={!!deleteTarget}
        title="删除 MCP Server"
        message={`确定要删除「${deleteTarget?.name ?? ''}」吗？`}
        confirmText="删除"
        variant="danger"
        loading={deleteMut.isPending}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </MgmtPageShell>
  );
};
