import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  RefreshCw, 
  Search, 
  Library, 
  Zap, 
  FileText, 
  Webhook, 
  Activity, 
  Settings,
  ExternalLink,
  Trash2,
  Edit2,
  Play
} from 'lucide-react';
import { Theme, FontSize } from '../../types';
import { nativeSelectClass } from '../../utils/formFieldClasses';
import { TOOLBAR_ROW, toolbarSearchInputClass } from '../../utils/toolbarFieldClasses';
import { useAgents, useDeleteAgent } from '../../hooks/queries/useAgent';
import { ContentLoader } from '../../components/common/ContentLoader';
import { PageError } from '../../components/common/PageError';
import { EmptyState } from '../../components/common/EmptyState';
import { Pagination } from '../../components/common/Pagination';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import type { Agent } from '../../types/dto/agent';

interface AgentListProps {
  theme: Theme;
  fontSize: FontSize;
  onViewDetail: (id: string) => void;
  onCreateAgent: () => void;
}

type AgentStatus = 'DRAFT' | 'TESTING' | 'PUBLISHED' | 'SUSPENDED' | 'DEPRECATED';
type AgentType = 'REST_API' | 'MCP' | 'OPENAPI' | 'WEBHOOK' | 'STREAMING' | 'CONFIGURED';

const statusConfig: Record<AgentStatus, { label: string; color: string; bg: string }> = {
  DRAFT: { label: '草稿', color: 'text-slate-500', bg: 'bg-slate-500/10' },
  TESTING: { label: '测试中', color: 'text-orange-500', bg: 'bg-orange-500/10' },
  PUBLISHED: { label: '已发布', color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  SUSPENDED: { label: '已暂停', color: 'text-red-500', bg: 'bg-red-500/10' },
  DEPRECATED: { label: '已废弃', color: 'text-slate-400', bg: 'bg-slate-400/10' },
};

const typeConfig: Record<AgentType, { label: string; icon: any }> = {
  REST_API: { label: 'REST API', icon: Zap },
  MCP: { label: 'MCP协议', icon: Activity },
  OPENAPI: { label: 'OpenAPI', icon: FileText },
  WEBHOOK: { label: 'Webhook', icon: Webhook },
  STREAMING: { label: '流式接口', icon: Activity },
  CONFIGURED: { label: '配置化', icon: Settings },
};

const STATUS_MAP: Record<Agent['status'], AgentStatus> = {
  draft: 'DRAFT',
  published: 'PUBLISHED',
  archived: 'DEPRECATED',
  error: 'SUSPENDED',
};

const TYPE_MAP: Record<Agent['type'], AgentType> = {
  chat: 'REST_API',
  task: 'MCP',
  workflow: 'OPENAPI',
  custom: 'CONFIGURED',
};

const PAGE_SIZE = 20;

export const AgentList: React.FC<AgentListProps> = ({ theme, fontSize, onViewDetail, onCreateAgent }) => {
  const isDark = theme === 'dark';
  const [statusFilter, setStatusFilter] = useState('全部');
  const [typeFilter, setTypeFilter] = useState('全部');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const { data, isLoading, isError, error, refetch } = useAgents({ page, pageSize: PAGE_SIZE });
  const deleteMut = useDeleteAgent();

  const agents = useMemo(() => {
    const list = data?.list ?? [];
    return list.filter((a) => {
      const mapped = STATUS_MAP[a.status] ?? 'DRAFT';
      if (statusFilter !== '全部' && statusConfig[mapped]?.label !== statusFilter) return false;
      const mappedType = TYPE_MAP[a.type] ?? 'CONFIGURED';
      if (typeFilter !== '全部' && typeConfig[mappedType]?.label !== typeFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        if (!a.name.toLowerCase().includes(q) && !a.description.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [data, statusFilter, typeFilter, searchQuery]);

  const formatNumber = (num: number) => {
    if (num >= 10000) return (num / 10000).toFixed(1) + '万';
    return num.toLocaleString();
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteMut.mutate(deleteTarget.id, {
      onSuccess: () => setDeleteTarget(null),
    });
  };

  if (isError) {
    return (
      <div className={`flex-1 flex flex-col min-h-0 ${isDark ? 'bg-[#000000]' : 'bg-[#F2F2F7]'}`}>
        <PageError error={error instanceof Error ? error : null} onRetry={() => refetch()} />
      </div>
    );
  }

  return (
    <div className={`flex-1 flex flex-col min-h-0 overflow-hidden transition-colors duration-300 ${
      isDark ? 'bg-[#000000]' : 'bg-[#F2F2F7]'
    }`}>
      <div className="w-full flex-1 min-h-0 flex flex-col px-2 sm:px-3 lg:px-4 py-2 sm:py-3">
        <div className={`rounded-2xl border overflow-hidden flex-1 min-h-0 flex flex-col ${
          isDark ? 'bg-[#1C1C1E] border-white/10' : 'bg-white border-slate-200/80 shadow-none'
        }`}>
          {/* Header */}
          <div className={`flex items-center justify-between px-6 py-4 border-b ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
            <div className="flex items-center gap-2">
              <Library className="text-blue-600" size={20} />
              <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Agent列表</h2>
            </div>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => refetch()} className="btn btn-ghost btn-sm gap-1.5 font-medium">
                <RefreshCw size={16} />
                <span>刷新</span>
              </button>
              <button 
                onClick={onCreateAgent}
                className="btn btn-primary btn-sm gap-1.5 font-bold shadow-lg shadow-blue-500/20"
              >
                <Plus size={16} />
                <span>创建 Agent</span>
              </button>
            </div>
          </div>

          {/* Filters */}
          <div
            className={`p-4 border-b ${isDark ? 'border-white/10 bg-[#1C1C1E]/50' : 'border-slate-200 bg-slate-50/50'}`}
          >
            <div className={TOOLBAR_ROW}>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 shrink-0">
                <span className={`text-xs font-semibold shrink-0 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                  状态
                </span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className={`${nativeSelectClass(theme)} w-full sm:w-[9.5rem] shrink-0`}
                >
                  <option>全部</option>
                  <option>草稿</option>
                  <option>测试中</option>
                  <option>已发布</option>
                  <option>已暂停</option>
                  <option>已废弃</option>
                </select>
              </div>

              <div className="flex flex-wrap items-center gap-2 sm:gap-3 shrink-0">
                <span className={`text-xs font-semibold shrink-0 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                  类型
                </span>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className={`${nativeSelectClass(theme)} w-full sm:w-[9.5rem] shrink-0`}
                >
                  <option>全部</option>
                  <option>REST API</option>
                  <option>MCP</option>
                  <option>OpenAPI</option>
                  <option>Webhook</option>
                  <option>流式</option>
                  <option>配置化</option>
                </select>
              </div>

              <div className="relative flex-1 min-w-[min(100%,220px)] sm:min-w-[200px]">
                <Search
                  size={16}
                  className={`absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}
                />
                <input
                  type="search"
                  placeholder="搜索 Agent 名称或描述"
                  maxLength={50}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={toolbarSearchInputClass(theme)}
                />
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => refetch()}
                  className="inline-flex items-center justify-center px-4 rounded-xl text-sm font-medium min-h-[2.5rem] bg-blue-600 text-white hover:bg-blue-700"
                >
                  搜索
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter('全部');
                    setTypeFilter('全部');
                    setSearchQuery('');
                  }}
                  className={`inline-flex items-center justify-center px-4 rounded-xl text-sm font-medium min-h-[2.5rem] border ${
                    isDark
                      ? 'border-white/15 text-slate-200 hover:bg-white/5'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  重置
                </button>
              </div>
            </div>
          </div>

          {/* Table Area */}
          <ContentLoader loading={isLoading}>
            {agents.length === 0 ? (
              <EmptyState
                title="暂无 Agent"
                description="创建第一个 Agent 开始使用"
                action={
                  <button type="button" onClick={onCreateAgent} className="btn btn-primary btn-sm gap-1.5">
                    <Plus size={16} />
                    创建 Agent
                  </button>
                }
              />
            ) : (
              <div className="flex-1 min-h-0 overflow-x-auto overflow-y-auto custom-scrollbar">
                <table className="table w-full min-w-[1280px] text-[13px] align-middle">
                  <thead className={`sticky top-0 z-10 ${isDark ? 'bg-[#1C1C1E]' : 'bg-slate-50'}`}>
                    <tr className={isDark ? 'border-white/10' : 'border-slate-200'}>
                      <th className="bg-inherit w-14 min-w-[3.5rem] whitespace-nowrap">图标</th>
                      <th className="bg-inherit min-w-[140px] whitespace-nowrap">名称</th>
                      <th className="bg-inherit min-w-[300px] max-w-md">描述</th>
                      <th className="bg-inherit min-w-[92px] whitespace-nowrap">状态</th>
                      <th className="bg-inherit min-w-[140px] whitespace-nowrap">类型</th>
                      <th className="bg-inherit text-right min-w-[88px] whitespace-nowrap">调用量</th>
                      <th className="bg-inherit text-right min-w-[128px] whitespace-nowrap">成功率</th>
                      <th className="bg-inherit min-w-[136px] whitespace-nowrap">创建时间</th>
                      <th className="bg-inherit text-right min-w-[168px] whitespace-nowrap">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {agents.map((agent, index) => {
                      const mappedStatus = STATUS_MAP[agent.status] ?? 'DRAFT';
                      const mappedType = TYPE_MAP[agent.type] ?? 'CONFIGURED';
                      const sc = statusConfig[mappedStatus];
                      const tc = typeConfig[mappedType];
                      return (
                        <tr
                          key={agent.id}
                          className={`hover ${
                            isDark
                              ? index % 2 === 1 ? 'bg-white/5' : 'bg-transparent'
                              : index % 2 === 1 ? 'bg-slate-50/80' : 'bg-transparent'
                          }`}
                        >
                          <td className="align-middle">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${
                              isDark ? 'bg-white/5' : 'bg-white border border-slate-100'
                            }`}>
                              {agent.avatar || '🤖'}
                            </div>
                          </td>
                          <td className="align-middle min-w-[140px] max-w-[220px]">
                            <div className="font-bold truncate" title={agent.name}>
                              {agent.name}
                            </div>
                          </td>
                          <td className="align-middle min-w-[300px] max-w-xl">
                            <div
                              className="text-slate-500 line-clamp-3 leading-snug whitespace-normal"
                              title={agent.description}
                            >
                              {agent.description}
                            </div>
                          </td>
                          <td className="align-middle whitespace-nowrap">
                            <div className={`badge badge-sm font-bold gap-1 whitespace-nowrap h-auto min-h-7 py-1.5 px-2 ${sc.bg} ${sc.color} border-none`}>
                              {sc.label}
                            </div>
                          </td>
                          <td className="align-middle min-w-[140px]">
                            <div className="flex items-center gap-2">
                              <div className={`p-1.5 rounded-xl shrink-0 ${isDark ? 'bg-white/5 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                                {React.createElement(tc.icon, { size: 12 })}
                              </div>
                              <span className="text-xs whitespace-nowrap">{tc.label}</span>
                            </div>
                          </td>
                          <td className="text-right align-middle whitespace-nowrap">
                            <span className="font-mono text-xs tabular-nums">{formatNumber(agent.callCount)}</span>
                          </td>
                          <td className="text-right align-middle whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5 flex-nowrap">
                              <progress 
                                className={`progress w-12 shrink-0 ${agent.successRate > 95 ? 'progress-success' : agent.successRate > 90 ? 'progress-info' : 'progress-warning'}`} 
                                value={agent.successRate} 
                                max="100"
                              />
                              <span className={`font-mono text-[11px] tabular-nums shrink-0 ${
                                agent.successRate > 95 ? 'text-emerald-500' : agent.successRate > 90 ? 'text-blue-500' : 'text-orange-500'
                              }`}>
                                {agent.successRate}%
                              </span>
                            </div>
                          </td>
                          <td className="align-middle whitespace-nowrap">
                            <div className="text-[11px] text-slate-400 font-mono">{agent.createdAt}</div>
                          </td>
                          <td className="text-right align-middle whitespace-nowrap">
                            <div className="flex items-center justify-end gap-0.5 flex-nowrap">
                              <button 
                                onClick={() => onViewDetail(agent.id)}
                                className="btn btn-ghost btn-xs" 
                                title="详情"
                              >
                                <ExternalLink size={14} />
                              </button>
                              <button className="btn btn-ghost btn-xs" title="编辑">
                                <Edit2 size={14} />
                              </button>
                              <button className="btn btn-ghost btn-xs" title="测试">
                                <Play size={14} />
                              </button>
                              <button
                                className="btn btn-ghost btn-xs text-error hover:bg-error/10"
                                title="删除"
                                onClick={() => setDeleteTarget({ id: agent.id, name: agent.name })}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </ContentLoader>

          {/* Pagination */}
          {(data?.total ?? 0) > 0 && (
            <div className={`px-6 border-t ${isDark ? 'border-white/10 bg-[#1C1C1E]' : 'border-slate-200 bg-slate-50'}`}>
              <Pagination page={page} pageSize={PAGE_SIZE} total={data?.total ?? 0} onChange={setPage} />
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
