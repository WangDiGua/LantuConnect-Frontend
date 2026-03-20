import React, { useMemo, useState } from 'react';
import { Power, RefreshCw, Package } from 'lucide-react';
import { Theme, FontSize } from '../../types';
import { MgmtPageShell } from '../userMgmt/MgmtPageShell';
import { TOOLBAR_ROW } from '../../utils/toolbarFieldClasses';
import { useMyTools, useDeleteMcpServer } from '../../hooks/queries/useTool';
import { ContentLoader } from '../../components/common/ContentLoader';
import { PageError } from '../../components/common/PageError';
import { EmptyState } from '../../components/common/EmptyState';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { useUpdateMcpServer } from '../../hooks/queries/useTool';
import { DataTable, SearchInput, FilterSelect, type Column, type RowAction } from '../../components/common';
import type { McpServer } from '../../types/dto/tool';

interface MyToolsPageProps {
  theme: Theme;
  fontSize: FontSize;
  showMessage: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

const PAGE_SIZE = 20;

export const MyToolsPage: React.FC<MyToolsPageProps> = ({ theme, fontSize, showMessage }) => {
  const isDark = theme === 'dark';
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<string>('all');
  const [deleteTarget, setDeleteTarget] = useState<McpServer | null>(null);
  const [page, setPage] = useState(1);

  const { data: servers, isLoading, isError, error, refetch } = useMyTools();
  const deleteMut = useDeleteMcpServer();
  const updateMut = useUpdateMcpServer();

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

  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

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
          <div className="flex-1 min-w-0 sm:max-w-md">
            <SearchInput
              value={q}
              onChange={setQ}
              placeholder="搜索名称或类型…"
              theme={theme}
            />
          </div>
          <FilterSelect
            value={status}
            onChange={setStatus}
            options={[
              { value: 'all', label: '全部状态' },
              { value: '运行中', label: '运行中' },
              { value: '已停用', label: '已停用' },
              { value: '异常', label: '异常' },
            ]}
            theme={theme}
            className="w-full sm:w-[8.5rem] shrink-0"
          />
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
        <div className="min-w-0 px-4 sm:px-6 pb-6 pt-1">
          {filtered.length === 0 ? (
            <EmptyState title="无匹配工具" description="调整筛选条件或添加新工具" />
          ) : (
            <DataTable<McpServer>
              columns={[
                {
                  key: 'name',
                  label: '名称',
                  render: (value) => <span className="font-medium">{value}</span>,
                },
                {
                  key: 'transportType',
                  label: '传输',
                  render: (value) => <span className="font-mono text-xs">{value}</span>,
                },
                {
                  key: 'status',
                  label: '状态',
                  render: (value, row) => (
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-lg ${statusCls(row.status)}`}>
                      {statusLabel(row.status)}
                    </span>
                  ),
                },
                {
                  key: 'version',
                  label: '版本',
                  render: (value) => <span className="font-mono text-xs">{value}</span>,
                },
                {
                  key: 'tools',
                  label: '工具数',
                  render: (value) => <span className="tabular-nums">{(value as any[]).length}</span>,
                },
                {
                  key: 'updatedAt',
                  label: '更新时间',
                  render: (value) => <span className="text-slate-500">{value}</span>,
                },
              ]}
              data={paginated}
              theme={theme}
              rowActions={[
                {
                  label: '编辑',
                  onClick: (row) => showMessage(`编辑工具 ${row.name}（功能待完善）`, 'info'),
                },
                {
                  label: '删除',
                  onClick: (row) => setDeleteTarget(row),
                  icon: <Power size={14} />,
                  variant: 'danger',
                },
              ]}
              pagination={
                filtered.length > 0
                  ? {
                      currentPage: page,
                      totalPages: Math.ceil(filtered.length / PAGE_SIZE),
                      onPageChange: setPage,
                      pageSize: PAGE_SIZE,
                    }
                  : undefined
              }
            />
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
