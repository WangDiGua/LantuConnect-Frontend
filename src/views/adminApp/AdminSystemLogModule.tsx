import React, { useMemo, useState } from 'react';
import { Theme, FontSize } from '../../types';
import { UserAppShell, cardClass, inputClass, btnPrimaryClass, btnGhostClass } from '../userApp/UserAppShell';
import { useAdminOpLogs, useAdminErrLogs, useAdminAuditLogs } from '../../hooks/queries/useAdmin';
import type { ErrorLog, OperationLog } from '../../types/dto/admin';
import { PageSkeleton } from '../../components/common/PageSkeleton';
import { PageError } from '../../components/common/PageError';
import { EmptyState } from '../../components/common/EmptyState';
import { DataTable, SearchInput, Pagination, type Column } from '../../components/common';

interface Props {
  activeSubItem: string;
  theme: Theme;
  fontSize: FontSize;
  showMessage: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

const PAGE_SIZE = 10;

interface TabProps {
  theme: Theme;
  fontSize: FontSize;
  showMessage: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

const OpLogsTab: React.FC<TabProps> = ({ theme, fontSize, showMessage }) => {
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const { data, isLoading, isError, error, refetch } = useAdminOpLogs({ page, pageSize: PAGE_SIZE });

  const rows = useMemo(() => {
    const list = data?.list ?? [];
    const s = q.trim().toLowerCase();
    if (!s) return list;
    return list.filter((r) => `${r.operator}${r.action}${r.target}`.toLowerCase().includes(s));
  }, [data?.list, q]);

  if (isLoading) return <PageSkeleton type="table" rows={6} />;
  if (isError) return <PageError error={error instanceof Error ? error : null} onRetry={() => refetch()} />;

  return (
    <UserAppShell theme={theme} fontSize={fontSize} title="操作日志" subtitle="平台管理行为留痕">
      <div className="flex flex-wrap gap-2 mb-4">
        <SearchInput
          value={q}
          onChange={setQ}
          placeholder="筛选…"
          theme={theme}
          className="max-w-xs"
        />
        <button type="button" className={btnGhostClass(theme)} onClick={() => showMessage('已导出 JSONL（Mock）', 'success')}>
          导出
        </button>
      </div>
      {!rows.length ? (
        <EmptyState title="暂无操作日志" description="当前页无匹配记录" />
      ) : (
        <DataTable<OperationLog>
          columns={[
            {
              key: 'time',
              label: '时间',
              render: (value) => <span className="whitespace-nowrap text-slate-500">{value}</span>,
            },
            {
              key: 'operator',
              label: '操作者',
              render: (value) => <span className="min-w-[120px]">{value}</span>,
            },
            {
              key: 'action',
              label: '动作',
            },
            {
              key: 'target',
              label: '对象',
              render: (value) => <span className="font-mono text-xs">{value}</span>,
            },
          ]}
          data={rows}
          theme={theme}
          pagination={
            data && data.total > 0
              ? {
                  currentPage: data.page,
                  totalPages: Math.ceil(data.total / data.pageSize),
                  onPageChange: setPage,
                  pageSize: data.pageSize,
                }
              : undefined
          }
        />
      )}
    </UserAppShell>
  );
};

const errLevel = (r: ErrorLog) => r.level.toUpperCase();

const ErrLogsTab: React.FC<TabProps> = ({ theme, fontSize, showMessage }) => {
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const { data, isLoading, isError, error, refetch } = useAdminErrLogs({ page, pageSize: PAGE_SIZE });

  const rows = useMemo(() => {
    const list = data?.list ?? [];
    const s = q.trim().toLowerCase();
    if (!s) return list;
    return list.filter((r) => `${r.operator}${r.detail}${r.target}${r.level}`.toLowerCase().includes(s));
  }, [data?.list, q]);

  if (isLoading) return <PageSkeleton type="table" rows={6} />;
  if (isError) return <PageError error={error instanceof Error ? error : null} onRetry={() => refetch()} />;

  return (
    <UserAppShell theme={theme} fontSize={fontSize} title="错误日志" subtitle="服务异常与告警关联">
      <div className="flex flex-wrap gap-2 mb-4">
        <SearchInput
          value={q}
          onChange={setQ}
          placeholder="筛选服务/级别/详情…"
          theme={theme}
          className="max-w-xs"
        />
        <button type="button" className={btnGhostClass(theme)} onClick={() => showMessage('已导出错误日志（Mock）', 'success')}>
          导出
        </button>
      </div>
      {!rows.length ? (
        <EmptyState title="暂无错误日志" description="当前页无匹配记录" />
      ) : (
        <DataTable<ErrorLog>
          columns={[
            {
              key: 'time',
              label: '时间',
              render: (value) => <span className="whitespace-nowrap text-slate-500">{value}</span>,
            },
            {
              key: 'operator',
              label: '服务',
              render: (value) => <span>{value || '—'}</span>,
            },
            {
              key: 'level',
              label: '级别',
              render: (value, row) => <span className="whitespace-nowrap">{errLevel(row)}</span>,
            },
            {
              key: 'detail',
              label: '信息',
              render: (value, row) => (
                <span className="min-w-[200px]" title={String(row.detail ?? row.target)}>
                  {row.detail ?? row.target}
                </span>
              ),
            },
          ]}
          data={rows}
          theme={theme}
          pagination={
            data && data.total > 0
              ? {
                  currentPage: data.page,
                  totalPages: Math.ceil(data.total / data.pageSize),
                  onPageChange: setPage,
                  pageSize: data.pageSize,
                }
              : undefined
          }
        />
      )}
      <button type="button" className={`${btnPrimaryClass} mt-4`} onClick={() => showMessage('已创建 Jira 工单（Mock）', 'info')}>
        批量建工单
      </button>
    </UserAppShell>
  );
};

const AuditLogsTab: React.FC<TabProps> = ({ theme, fontSize }) => {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, error, refetch } = useAdminAuditLogs({ page, pageSize: PAGE_SIZE });
  const list = data?.list ?? [];

  if (isLoading) return <PageSkeleton type="table" rows={5} />;
  if (isError) return <PageError error={error instanceof Error ? error : null} onRetry={() => refetch()} />;

  return (
    <UserAppShell theme={theme} fontSize={fontSize} title="审计日志" subtitle="合规视角的敏感操作（与系统配置-审计互补）">
      {!list.length ? (
        <EmptyState title="暂无审计日志" description="当前页没有记录" />
      ) : (
        <div className={cardClass(theme)}>
          {list.map((r) => (
            <div key={r.id} className={`p-4 border-b last:border-0 ${theme === 'light' ? 'border-slate-100' : 'border-white/10'}`}>
              <div className="text-xs text-slate-500">{r.time}</div>
              <div className={`mt-1 font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{r.action}</div>
              <div className="text-sm text-slate-500">
                {r.operator} · 范围 {r.target}
              </div>
            </div>
          ))}
        </div>
      )}
      {data && data.total > 0 ? (
        <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onChange={setPage} />
      ) : null}
    </UserAppShell>
  );
};

export const AdminSystemLogModule: React.FC<Props> = ({ activeSubItem, theme, fontSize, showMessage }) => {
  if (activeSubItem === '操作日志') {
    return <OpLogsTab theme={theme} fontSize={fontSize} showMessage={showMessage} />;
  }
  if (activeSubItem === '错误日志') {
    return <ErrLogsTab theme={theme} fontSize={fontSize} showMessage={showMessage} />;
  }
  if (activeSubItem === '审计日志') {
    return <AuditLogsTab theme={theme} fontSize={fontSize} showMessage={showMessage} />;
  }

  return (
    <UserAppShell theme={theme} fontSize={fontSize} title={activeSubItem} subtitle="请选择子菜单">
      <div className={cardClass(theme)} />
    </UserAppShell>
  );
};
