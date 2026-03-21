import React, { useState, useEffect } from 'react';
import {
  Plus,
  RefreshCw,
  Bot,
  ExternalLink,
  Trash2,
  Edit2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import type { Theme, FontSize } from '../../types';
import { TOOLBAR_ROW } from '../../utils/toolbarFieldClasses';
import { useAgents, useDeleteAgent } from '../../hooks/queries/useAgent';
import { ContentLoader } from '../../components/common/ContentLoader';
import { PageError } from '../../components/common/PageError';
import { EmptyState } from '../../components/common/EmptyState';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { SearchInput, FilterSelect } from '../../components/common';
import type {
  Agent,
  AgentStatus,
  SourceType,
  AgentType as DtoAgentType,
  AgentListQuery,
} from '../../types/dto/agent';
import { agentService } from '../../api/services/agent.service';
import { AgentCreate } from './AgentCreate';
import { btnPrimary, btnGhost, btnSecondary, tableHeadCell, tableBodyRow, tableCell, statusBadgeClass, statusLabel, pageBg, cardClass } from '../../utils/uiClasses';
import type { DomainStatus } from '../../utils/uiClasses';

interface AgentListProps {
  theme: Theme;
  fontSize: FontSize;
  onViewDetail: (id: string) => void;
  onCreateAgent: () => void;
}

const SOURCE_LABEL: Record<SourceType, string> = {
  internal: '自研',
  partner: '合作方',
  cloud: '云服务',
};

const TYPE_LABEL: Record<DtoAgentType, string> = {
  mcp: 'MCP',
  http_api: 'HTTP API',
  builtin: '内置',
};

const PAGE_SIZE = 20;

function formatCount(n: number): string {
  if (n >= 10000) return (n / 10000).toFixed(1) + '万';
  return n.toLocaleString();
}

export const AgentList: React.FC<AgentListProps> = ({
  theme,
  fontSize: _fontSize,
  onViewDetail,
  onCreateAgent,
}) => {
  const isDark = theme === 'dark';

  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [debouncedKw, setDebouncedKw] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'edit'>('list');
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedKw(keyword);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [keyword]);

  const query: AgentListQuery = {
    page,
    pageSize: PAGE_SIZE,
    keyword: debouncedKw || undefined,
    status: (statusFilter || undefined) as AgentStatus | undefined,
    sourceType: (sourceFilter || undefined) as SourceType | undefined,
    agentType: (typeFilter || undefined) as DtoAgentType | undefined,
  };

  const { data, isLoading, isError, error, refetch } = useAgents(query);
  const deleteMut = useDeleteAgent();

  const agents: Agent[] = data?.list ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteMut.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) });
  };

  const handleEdit = async (agent: Agent) => {
    try {
      const full = await agentService.getById(agent.id);
      setEditingAgent(full);
    } catch {
      setEditingAgent(agent);
    }
    setViewMode('edit');
  };

  const resetFilters = () => {
    setKeyword('');
    setDebouncedKw('');
    setStatusFilter('');
    setSourceFilter('');
    setTypeFilter('');
    setPage(1);
  };

  if (viewMode === 'edit' && editingAgent) {
    return (
      <AgentCreate
        theme={theme}
        fontSize={_fontSize}
        onBack={() => { setViewMode('list'); setEditingAgent(null); refetch(); }}
        onSuccess={() => { setViewMode('list'); setEditingAgent(null); refetch(); }}
        editAgent={editingAgent}
      />
    );
  }

  if (isError) {
    return (
      <div className={`flex-1 flex flex-col min-h-0 ${pageBg(theme)}`}>
        <PageError error={error instanceof Error ? error : null} onRetry={() => refetch()} />
      </div>
    );
  }

  return (
    <div
      className={`flex-1 flex flex-col min-h-0 overflow-hidden transition-colors duration-300 ${
        pageBg(theme)
      }`}
    >
      <div className="w-full flex-1 min-h-0 flex flex-col px-2 sm:px-3 lg:px-4 py-2 sm:py-3">
        <div
          className={`${cardClass(theme)} overflow-hidden flex-1 min-h-0 flex flex-col`}
        >
          {/* Header */}
          <div
            className={`flex items-center justify-between px-6 py-4 border-b shrink-0 ${
              isDark ? 'border-white/10' : 'border-slate-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <Bot className="text-blue-600" size={20} />
              <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Agent 管理
              </h2>
              {total > 0 && (
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    isDark ? 'bg-white/5 text-slate-400' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {total}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => refetch()}
                className={`${btnGhost(theme)} gap-1.5`}
              >
                <RefreshCw size={16} />
                刷新
              </button>
              <button
                type="button"
                onClick={onCreateAgent}
                className={`${btnPrimary} gap-1.5 shadow-lg shadow-blue-500/20`}
              >
                <Plus size={16} />
                注册 Agent
              </button>
            </div>
          </div>

          {/* Filters */}
          <div
            className={`p-4 border-b shrink-0 ${
              isDark ? 'border-white/10' : 'border-slate-200 bg-slate-50/50'
            }`}
          >
            <div className={TOOLBAR_ROW}>
              <FilterSelect
                value={statusFilter}
                onChange={(v) => {
                  setStatusFilter(v);
                  setPage(1);
                }}
                options={[
                  { value: '', label: '全部状态' },
                  { value: 'draft', label: '草稿' },
                  { value: 'published', label: '已发布' },
                  { value: 'testing', label: '测试中' },
                  { value: 'pending_review', label: '待审核' },
                  { value: 'deprecated', label: '已废弃' },
                ]}
                placeholder=""
                theme={theme}
                className="w-full sm:w-36"
              />
              <FilterSelect
                value={sourceFilter}
                onChange={(v) => {
                  setSourceFilter(v);
                  setPage(1);
                }}
                options={[
                  { value: '', label: '全部来源' },
                  { value: 'internal', label: '自研' },
                  { value: 'partner', label: '合作方' },
                  { value: 'cloud', label: '云服务' },
                ]}
                placeholder=""
                theme={theme}
                className="w-full sm:w-36"
              />
              <FilterSelect
                value={typeFilter}
                onChange={(v) => {
                  setTypeFilter(v);
                  setPage(1);
                }}
                options={[
                  { value: '', label: '全部类型' },
                  { value: 'mcp', label: 'MCP' },
                  { value: 'http_api', label: 'HTTP API' },
                  { value: 'builtin', label: '内置' },
                ]}
                placeholder=""
                theme={theme}
                className="w-full sm:w-36"
              />
              <div className="flex-1 min-w-[min(100%,200px)]">
                <SearchInput
                  value={keyword}
                  onChange={setKeyword}
                  placeholder="搜索名称或描述…"
                  theme={theme}
                />
              </div>
              <button
                type="button"
                onClick={resetFilters}
                className={btnSecondary(theme)}
              >
                重置
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="flex-1 min-h-0 overflow-auto">
            <ContentLoader loading={isLoading} theme={theme}>
              {agents.length === 0 ? (
                <EmptyState
                  title="暂无 Agent"
                  description="注册第一个 Agent 开始使用"
                  action={
                    <button
                      type="button"
                      onClick={onCreateAgent}
                      className={`${btnPrimary} gap-1.5`}
                    >
                      <Plus size={16} />
                      注册 Agent
                    </button>
                  }
                />
              ) : (
                <table className="table w-full text-sm min-w-[900px]">
                  <thead className="sticky top-0 z-10">
                    <tr>
                      <th className={tableHeadCell(theme)} style={{ minWidth: 200 }}>
                        名称
                      </th>
                      <th className={tableHeadCell(theme)}>接入类型</th>
                      <th className={tableHeadCell(theme)}>来源</th>
                      <th className={tableHeadCell(theme)}>状态</th>
                      <th className={`${tableHeadCell(theme)} text-right`}>调用次数</th>
                      <th className={`${tableHeadCell(theme)} text-right`}>成功率</th>
                      <th className={`${tableHeadCell(theme)} text-right`}>平均延迟</th>
                      <th className={`${tableHeadCell(theme)} text-right`} style={{ minWidth: 100 }}>
                        操作
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {agents.map((agent, idx) => (
                        <tr
                          key={agent.id}
                          className={tableBodyRow(theme, idx)}
                        >
                          <td
                            className={`px-4 py-3 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0 ${
                                  isDark ? 'bg-white/5' : 'bg-slate-100'
                                }`}
                              >
                                {agent.icon || '🤖'}
                              </div>
                              <div className="min-w-0">
                                <div
                                  className={`font-semibold truncate ${
                                    isDark ? 'text-white' : 'text-slate-900'
                                  }`}
                                >
                                  {agent.displayName}
                                </div>
                                <div className="text-xs text-slate-500 truncate">
                                  {agent.agentName}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex px-2 py-0.5 rounded-md text-xs font-medium ${
                                isDark
                                  ? 'bg-white/5 text-slate-300'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {TYPE_LABEL[agent.agentType]}
                            </span>
                          </td>
                          <td
                            className={`px-4 py-3 text-xs ${
                              isDark ? 'text-slate-400' : 'text-slate-500'
                            }`}
                          >
                            {SOURCE_LABEL[agent.sourceType]}
                          </td>
                          <td className={tableCell()}>
                            <span className={statusBadgeClass(agent.status as DomainStatus, theme)}>
                              {statusLabel(agent.status as DomainStatus)}
                            </span>
                          </td>
                          <td
                            className={`px-4 py-3 text-right font-mono text-xs tabular-nums ${
                              isDark ? 'text-slate-300' : 'text-slate-700'
                            }`}
                          >
                            {formatCount(agent.callCount)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span
                              className={`font-mono text-xs tabular-nums ${
                                agent.successRate >= 95
                                  ? 'text-emerald-500'
                                  : agent.successRate >= 90
                                    ? 'text-blue-500'
                                    : 'text-orange-500'
                              }`}
                            >
                              {agent.successRate.toFixed(1)}%
                            </span>
                          </td>
                          <td
                            className={`px-4 py-3 text-right font-mono text-xs tabular-nums ${
                              isDark ? 'text-slate-400' : 'text-slate-500'
                            }`}
                          >
                            {agent.avgLatencyMs >= 1000
                              ? (agent.avgLatencyMs / 1000).toFixed(1) + 's'
                              : agent.avgLatencyMs + 'ms'}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => onViewDetail(String(agent.id))}
                                className={`p-1.5 rounded-lg transition-colors ${
                                  isDark
                                    ? 'text-blue-400 hover:bg-blue-500/10'
                                    : 'text-blue-600 hover:bg-blue-50'
                                }`}
                                title="详情"
                              >
                                <ExternalLink size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleEdit(agent)}
                                className={`p-1.5 rounded-lg transition-colors ${
                                  isDark
                                    ? 'text-slate-400 hover:bg-white/5'
                                    : 'text-slate-500 hover:bg-slate-100'
                                }`}
                                title="编辑"
                              >
                                <Edit2 size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setDeleteTarget({ id: agent.id, name: agent.displayName })
                                }
                                className={`p-1.5 rounded-lg transition-colors ${
                                  isDark
                                    ? 'text-red-400 hover:bg-red-500/10'
                                    : 'text-red-500 hover:bg-red-50'
                                }`}
                                title="删除"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </ContentLoader>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div
              className={`px-4 py-3 border-t shrink-0 flex items-center justify-between ${
                isDark ? 'border-white/10' : 'border-slate-200'
              }`}
            >
              <span className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                共 {total} 条，第 {page}/{totalPages} 页
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className={`p-2 rounded-xl transition-colors ${
                    page === 1
                      ? isDark
                        ? 'text-slate-600 cursor-not-allowed'
                        : 'text-slate-300 cursor-not-allowed'
                      : isDark
                        ? 'text-slate-300 hover:bg-white/5'
                        : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className={`p-2 rounded-xl transition-colors ${
                    page === totalPages
                      ? isDark
                        ? 'text-slate-600 cursor-not-allowed'
                        : 'text-slate-300 cursor-not-allowed'
                      : isDark
                        ? 'text-slate-300 hover:bg-white/5'
                        : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        title="删除 Agent"
        message={`确定要删除「${deleteTarget?.name ?? ''}」吗？此操作不可撤销。`}
        confirmText="删除"
        variant="danger"
        loading={deleteMut.isPending}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};
