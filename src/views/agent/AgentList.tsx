// @deprecated - This file is no longer used in the current routing. Replaced by unified resource management.
import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Plus,
  RefreshCw,
  Bot,
  ExternalLink,
  Trash2,
  Edit2,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
} from 'lucide-react';
import type { Theme, FontSize } from '../../types';
import { useAgents, useDeleteAgent } from '../../hooks/queries/useAgent';
import { useMessage } from '../../components/common/Message';
import { ContentLoader } from '../../components/common/ContentLoader';
import { PageError } from '../../components/common/PageError';
import { EmptyState } from '../../components/common/EmptyState';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { Modal } from '../../components/common/Modal';
import { SearchInput, FilterSelect } from '../../components/common';
import { AnimatedList } from '../../components/common/AnimatedList';
import { PortalDropdown } from '../../components/common/PortalDropdown';
import { AgentDetail } from './AgentDetail';
import type {
  Agent,
  AgentStatus,
  SourceType,
  AgentType as DtoAgentType,
  AgentListQuery,
} from '../../types/dto/agent';
import { agentService } from '../../api/services/agent.service';
import { AgentCreate } from './AgentCreate';
import {
  canvasBodyBg,
  bentoCard,
  bentoCardHover,
  btnPrimary,
  btnGhost,
  btnSecondary,
  statusBadgeClass,
  statusDot,
  statusLabel,
  textPrimary,
  textSecondary,
  textMuted,
  techBadge,
} from '../../utils/uiClasses';
import type { DomainStatus } from '../../utils/uiClasses';

interface AgentListProps {
  theme: Theme;
  fontSize: FontSize;
  onCreateAgent: () => void;
}

const SOURCE_LABEL: Record<SourceType, string> = {
  internal: '自研',
  partner: '合作�?,
  cloud: '云服�?,
};

const TYPE_LABEL: Record<DtoAgentType, string> = {
  mcp: 'MCP',
  http_api: 'HTTP API',
  builtin: '内置',
};

const PAGE_SIZE = 20;

function formatCount(n: number): string {
  if (n >= 10000) return (n / 10000).toFixed(1) + '�?;
  return n.toLocaleString();
}

export const AgentList: React.FC<AgentListProps> = ({
  theme,
  fontSize: _fontSize,
  onCreateAgent,
}) => {
  const isDark = theme === 'dark';
  const { showMessage } = useMessage();

  const [detailAgentId, setDetailAgentId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [debouncedKw, setDebouncedKw] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'edit'>('list');
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const menuTriggerRefs = useRef<Map<number, HTMLButtonElement>>(new Map());

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
    deleteMut.mutate(deleteTarget.id, {
      onSuccess: () => { setDeleteTarget(null); showMessage('Agent 已删�?, 'success'); },
      onError: (err) => { showMessage('删除失败: ' + (err instanceof Error ? err.message : '未知错误'), 'error'); },
    });
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
        onSuccess={() => { setViewMode('list'); setEditingAgent(null); refetch(); showMessage('Agent 保存成功', 'success'); }}
        editAgent={editingAgent}
      />
    );
  }

  if (isError) {
    return (
      <div className={`flex-1 flex flex-col min-h-0 ${canvasBodyBg(theme)}`}>
        <PageError error={error instanceof Error ? error : null} onRetry={() => refetch()} />
      </div>
    );
  }

  return (
    <div className={`flex-1 flex flex-col min-h-0 overflow-y-auto custom-scrollbar transition-colors duration-300 ${canvasBodyBg(theme)}`}>
      <div className="w-full flex flex-col px-3 sm:px-4 lg:px-5 py-4 gap-4">
        <div className={`${bentoCard(theme)} overflow-hidden shrink-0 flex flex-col`}>
          {/* Header */}
          <div className={`flex items-center justify-between px-6 py-4 border-b shrink-0 ${isDark ? 'border-white/[0.06]' : 'border-slate-100'}`}>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${isDark ? 'bg-neutral-900/10' : 'bg-neutral-100'}`}>
                <Bot size={20} className={isDark ? 'text-neutral-300' : 'text-neutral-900'} />
              </div>
              <div>
                <h2 className={`text-lg font-bold ${textPrimary(theme)}`}>Agent 管理</h2>
                {total > 0 && (
                  <span className={`text-xs ${textMuted(theme)}`}>�?{total} �?/span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => refetch()} className={btnGhost(theme)}>
                <RefreshCw size={15} />
                <span className="hidden sm:inline">刷新</span>
              </button>
              <button type="button" onClick={onCreateAgent} className={btnPrimary}>
                <Plus size={15} />
                统一调用调试
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className={`px-4 py-3 border-b shrink-0 ${isDark ? 'border-white/[0.06]' : 'border-slate-100'}`}>
            <div className="flex flex-wrap items-center gap-2">
              <FilterSelect
                value={statusFilter}
                onChange={(v) => { setStatusFilter(v); setPage(1); }}
                options={[
                  { value: '', label: '全部状�? },
                  { value: 'draft', label: '草稿' },
                  { value: 'published', label: '已发�? },
                  { value: 'testing', label: '测试�? },
                  { value: 'pending_review', label: '待审�? },
                  { value: 'deprecated', label: '已废�? },
                ]}
                placeholder=""
                theme={theme}
                className="w-full sm:w-36"
              />
              <FilterSelect
                value={sourceFilter}
                onChange={(v) => { setSourceFilter(v); setPage(1); }}
                options={[
                  { value: '', label: '全部来源' },
                  { value: 'internal', label: '自研' },
                  { value: 'partner', label: '合作�? },
                  { value: 'cloud', label: '云服�? },
                ]}
                placeholder=""
                theme={theme}
                className="w-full sm:w-36"
              />
              <FilterSelect
                value={typeFilter}
                onChange={(v) => { setTypeFilter(v); setPage(1); }}
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
                <SearchInput value={keyword} onChange={setKeyword} placeholder="搜索名称或描述�? theme={theme} />
              </div>
              <button type="button" onClick={resetFilters} className={btnSecondary(theme)}>
                重置
              </button>
            </div>
          </div>
        </div>

        <div className={`${bentoCard(theme)} overflow-hidden flex flex-col`}>
          {/* Card-style rows */}
          <div>
            <ContentLoader loading={isLoading} theme={theme}>
              {agents.length === 0 ? (
                <EmptyState
                  title="暂无 Agent"
                  description="注册第一�?Agent 开始使�?
                  action={
                    <button type="button" onClick={onCreateAgent} className={btnPrimary}>
                      <Plus size={16} />
                      打开调试�?                    </button>
                  }
                />
              ) : (
                <AnimatedList className="p-3 space-y-2">
                  {agents.map((agent) => (
                    <motion.div
                      key={agent.id}
                      className={`${bentoCardHover(theme)} p-4 flex items-center gap-4 ${
                        isDark ? 'hover:bg-neutral-900/[0.03]' : 'hover:bg-neutral-100/40'
                      }`}
                    >
                      {/* Icon */}
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 ${
                        isDark ? 'bg-white/[0.04]' : 'bg-slate-50'
                      }`}>
                        {agent.icon || '🤖'}
                      </div>

                      {/* Main info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`font-semibold truncate ${textPrimary(theme)}`}>{agent.displayName}</span>
                          <span className={techBadge(theme)}>{TYPE_LABEL[agent.agentType]}</span>
                          <span className={statusBadgeClass(agent.status as DomainStatus, theme)}>
                            <span className={statusDot(agent.status as DomainStatus)} />
                            {statusLabel(agent.status as DomainStatus)}
                          </span>
                        </div>
                        <div className={`text-xs mt-0.5 truncate ${textMuted(theme)}`}>
                          {agent.agentName} · {SOURCE_LABEL[agent.sourceType]}
                        </div>
                      </div>

                      {/* Metadata �?hidden on small screens */}
                      <div className="hidden lg:flex items-center gap-6 shrink-0">
                        <div className="text-right">
                          <div className={`text-xs uppercase tracking-wider ${textMuted(theme)}`}>调用</div>
                          <div className={`text-sm font-mono tabular-nums font-medium ${textSecondary(theme)}`}>
                            {formatCount(agent.callCount)}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-xs uppercase tracking-wider ${textMuted(theme)}`}>成功�?/div>
                          <div className={`text-sm font-mono tabular-nums font-semibold ${
                            agent.successRate >= 95 ? 'text-emerald-500'
                              : agent.successRate >= 90 ? 'text-blue-500'
                              : 'text-orange-500'
                          }`}>
                            {agent.successRate.toFixed(1)}%
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-xs uppercase tracking-wider ${textMuted(theme)}`}>延迟</div>
                          <div className={`text-sm font-mono tabular-nums ${textMuted(theme)}`}>
                            {agent.avgLatencyMs >= 1000
                              ? (agent.avgLatencyMs / 1000).toFixed(1) + 's'
                              : agent.avgLatencyMs + 'ms'}
                          </div>
                        </div>
                      </div>

                      {/* Desktop actions */}
                      <div className="hidden sm:flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => setDetailAgentId(String(agent.id))}
                          className={`p-2 rounded-xl transition-colors ${
                            isDark ? 'text-neutral-300 hover:bg-neutral-900/10' : 'text-neutral-900 hover:bg-neutral-100'
                          }`}
                          title="详情"
                        >
                          <ExternalLink size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEdit(agent)}
                          className={`p-2 rounded-xl transition-colors ${
                            isDark ? 'text-slate-400 hover:bg-white/5' : 'text-slate-500 hover:bg-slate-100'
                          }`}
                          title="编辑"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget({ id: agent.id, name: agent.displayName })}
                          className={`p-2 rounded-xl transition-colors ${
                            isDark ? 'text-rose-400 hover:bg-rose-500/10' : 'text-rose-500 hover:bg-rose-50'
                          }`}
                          title="删除"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>

                      {/* Mobile menu */}
                      <div className="sm:hidden shrink-0">
                        <button
                          type="button"
                          ref={(el) => { if (el) menuTriggerRefs.current.set(agent.id, el); }}
                          onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === agent.id ? null : agent.id); }}
                          className={btnGhost(theme)}
                        >
                          <MoreHorizontal size={16} />
                        </button>
                        <PortalDropdown
                          open={openMenuId === agent.id}
                          onClose={() => setOpenMenuId(null)}
                          anchorEl={menuTriggerRefs.current.get(agent.id) ?? null}
                          className={`w-32 rounded-xl border shadow-xl py-1 ${
                            isDark ? 'bg-[#1a1f2e] border-white/10' : 'bg-white border-slate-200'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => { setDetailAgentId(String(agent.id)); setOpenMenuId(null); }}
                            className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 ${
                              isDark ? 'text-slate-300 hover:bg-white/5' : 'text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <ExternalLink size={14} /> 详情
                          </button>
                          <button
                            type="button"
                            onClick={() => { handleEdit(agent); setOpenMenuId(null); }}
                            className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 ${
                              isDark ? 'text-slate-300 hover:bg-white/5' : 'text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <Edit2 size={14} /> 编辑
                          </button>
                          <button
                            type="button"
                            onClick={() => { setDeleteTarget({ id: agent.id, name: agent.displayName }); setOpenMenuId(null); }}
                            className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 ${
                              isDark ? 'text-rose-400 hover:bg-rose-500/10' : 'text-rose-500 hover:bg-rose-50'
                            }`}
                          >
                            <Trash2 size={14} /> 删除
                          </button>
                        </PortalDropdown>
                      </div>
                    </motion.div>
                  ))}
                </AnimatedList>
              )}
            </ContentLoader>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className={`px-4 py-3 border-t shrink-0 flex items-center justify-between ${
              isDark ? 'border-white/[0.06]' : 'border-slate-100'
            }`}>
              <span className={`text-sm ${textMuted(theme)}`}>
                �?{total} 条，�?{page}/{totalPages} �?              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className={`p-2 rounded-xl transition-colors ${
                    page === 1
                      ? isDark ? 'text-slate-600 cursor-not-allowed' : 'text-slate-300 cursor-not-allowed'
                      : isDark ? 'text-slate-300 hover:bg-white/5' : 'text-slate-600 hover:bg-slate-100'
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
                      ? isDark ? 'text-slate-600 cursor-not-allowed' : 'text-slate-300 cursor-not-allowed'
                      : isDark ? 'text-slate-300 hover:bg-white/5' : 'text-slate-600 hover:bg-slate-100'
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
        message={`确定要删除�?{deleteTarget?.name ?? ''}」吗？此操作不可撤销。`}
        confirmText="删除"
        variant="danger"
        loading={deleteMut.isPending}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <Modal
        open={!!detailAgentId}
        onClose={() => setDetailAgentId(null)}
        theme={theme}
        size="xl"
        contentClassName="flex-1 min-h-0 overflow-hidden flex flex-col p-0"
      >
        {detailAgentId && (
          <AgentDetail
            agentId={detailAgentId}
            theme={theme}
            fontSize={_fontSize}
            onBack={() => { setDetailAgentId(null); void refetch(); }}
          />
        )}
      </Modal>
    </div>
  );
};
