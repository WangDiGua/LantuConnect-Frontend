import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { Theme, FontSize } from '../../types';
import type { Skill, SkillListQuery, McpServer } from '../../types/dto/skill';
import type { AgentStatus, SourceType } from '../../types/dto/agent';
import { skillService } from '../../api/services/skill.service';
import { nativeSelectClass, nativeInputClass } from '../../utils/formFieldClasses';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { SkillCreate } from './SkillCreate';
import { SkillDetail } from './SkillDetail';

interface Props {
  theme: Theme;
  fontSize: FontSize;
}

type ViewMode = 'list' | 'detail' | 'create';

const STATUS_OPTIONS: { value: AgentStatus | ''; label: string }[] = [
  { value: '', label: '全部状态' },
  { value: 'published', label: '已发布' },
  { value: 'draft', label: '草稿' },
  { value: 'testing', label: '测试中' },
  { value: 'pending_review', label: '待审核' },
  { value: 'rejected', label: '已拒绝' },
  { value: 'deprecated', label: '已废弃' },
];

const SOURCE_OPTIONS: { value: SourceType | ''; label: string }[] = [
  { value: '', label: '全部来源' },
  { value: 'internal', label: '内部' },
  { value: 'partner', label: '合作方' },
  { value: 'cloud', label: '云服务' },
];

function statusBadge(status: AgentStatus, theme: Theme): string {
  const base = 'badge badge-sm whitespace-nowrap';
  const map: Record<AgentStatus, string> = {
    published: theme === 'light' ? `${base} bg-emerald-100 text-emerald-700 border-emerald-200` : `${base} bg-emerald-900/40 text-emerald-300 border-emerald-700/40`,
    draft: theme === 'light' ? `${base} bg-slate-100 text-slate-600 border-slate-200` : `${base} bg-slate-700/40 text-slate-300 border-slate-600/40`,
    testing: theme === 'light' ? `${base} bg-amber-100 text-amber-700 border-amber-200` : `${base} bg-amber-900/40 text-amber-300 border-amber-700/40`,
    pending_review: theme === 'light' ? `${base} bg-blue-100 text-blue-700 border-blue-200` : `${base} bg-blue-900/40 text-blue-300 border-blue-700/40`,
    rejected: theme === 'light' ? `${base} bg-red-100 text-red-600 border-red-200` : `${base} bg-red-900/40 text-red-300 border-red-700/40`,
    deprecated: theme === 'light' ? `${base} bg-gray-100 text-gray-500 border-gray-200` : `${base} bg-gray-700/40 text-gray-400 border-gray-600/40`,
  };
  return map[status] ?? base;
}

const STATUS_LABEL: Record<AgentStatus, string> = {
  published: '已发布',
  draft: '草稿',
  testing: '测试中',
  pending_review: '待审核',
  rejected: '已拒绝',
  deprecated: '已废弃',
};

const SOURCE_LABEL: Record<SourceType, string> = {
  internal: '内部',
  partner: '合作方',
  cloud: '云服务',
};

function sourceBadge(src: SourceType, theme: Theme): string {
  const base = 'badge badge-sm whitespace-nowrap';
  const map: Record<SourceType, string> = {
    internal: theme === 'light' ? `${base} bg-sky-50 text-sky-700 border-sky-200` : `${base} bg-sky-900/30 text-sky-300 border-sky-700/40`,
    partner: theme === 'light' ? `${base} bg-violet-50 text-violet-700 border-violet-200` : `${base} bg-violet-900/30 text-violet-300 border-violet-700/40`,
    cloud: theme === 'light' ? `${base} bg-cyan-50 text-cyan-700 border-cyan-200` : `${base} bg-cyan-900/30 text-cyan-300 border-cyan-700/40`,
  };
  return map[src] ?? base;
}

export const SkillList: React.FC<Props> = ({ theme, fontSize }) => {
  const dark = theme === 'dark';

  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null);

  const [skills, setSkills] = useState<Skill[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [mcpServers, setMcpServers] = useState<McpServer[]>([]);
  const [groupByServer, setGroupByServer] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [query, setQuery] = useState<SkillListQuery>({
    page: 1,
    pageSize: 20,
    keyword: '',
    status: undefined,
    sourceType: undefined,
    parentId: undefined,
  });

  const fetchMcpServers = useCallback(async () => {
    try {
      const data = await skillService.listMcpServers();
      setMcpServers(data);
    } catch { /* ignore */ }
  }, []);

  const fetchSkills = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { page: query.page, pageSize: query.pageSize };
      if (query.keyword) params.keyword = query.keyword;
      if (query.status) params.status = query.status;
      if (query.sourceType) params.sourceType = query.sourceType;
      if (query.parentId !== undefined) params.parentId = query.parentId;
      const res = await skillService.list(params as SkillListQuery);
      setSkills(res.list);
      setTotal(res.total);
    } catch {
      setSkills([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => { fetchMcpServers(); }, [fetchMcpServers]);
  useEffect(() => { fetchSkills(); }, [fetchSkills]);

  const handleViewDetail = useCallback((id: number) => {
    setSelectedSkillId(String(id));
    setViewMode('detail');
  }, []);

  const handleCreateSkill = useCallback(() => {
    setViewMode('create');
  }, []);

  const handleBackToList = useCallback(() => {
    setViewMode('list');
    setSelectedSkillId(null);
    fetchSkills();
  }, [fetchSkills]);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await skillService.remove(deleteTarget.id);
      setDeleteTarget(null);
      fetchSkills();
    } catch { /* ignore */ }
    finally { setDeleting(false); }
  }, [deleteTarget, fetchSkills]);

  const mcpServerOptions = useMemo(() => [
    { value: '', label: '全部 MCP Server' },
    { value: 'standalone', label: '独立 Skill（无 Server）' },
    ...mcpServers.map((s) => ({ value: String(s.id), label: s.displayName })),
  ], [mcpServers]);

  const grouped = useMemo(() => {
    if (!groupByServer) return null;
    const map = new Map<string, Skill[]>();
    for (const s of skills) {
      const key = s.parentName ?? '独立 Skill';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }
    return map;
  }, [groupByServer, skills]);

  const totalPages = Math.max(1, Math.ceil(total / (query.pageSize || 20)));

  // Delegate to sub-views
  if (viewMode === 'create') {
    return <SkillCreate theme={theme} fontSize={fontSize} onBack={handleBackToList} onSuccess={() => handleBackToList()} />;
  }

  if (viewMode === 'detail' && selectedSkillId) {
    return <SkillDetail skillId={selectedSkillId} theme={theme} fontSize={fontSize} onBack={handleBackToList} />;
  }

  const titleSize = fontSize === 'small' ? 'text-lg' : fontSize === 'medium' ? 'text-xl' : 'text-2xl';
  const textMuted = dark ? 'text-slate-400' : 'text-slate-500';
  const cardBg = dark ? 'bg-[#1C1C1E] border-white/10' : 'bg-white border-slate-200/80';
  const pageBg = dark ? 'bg-[#000000]' : 'bg-[#F2F2F7]';
  const rowEven = dark ? 'bg-white/5' : 'bg-slate-50/80';
  const hoverRow = dark ? 'hover:bg-white/10' : 'hover:bg-slate-100';

  const renderTable = (items: Skill[]) => (
    <div className="overflow-x-auto">
      <table className="table w-full min-w-[1100px]">
        <thead>
          <tr className={`text-xs uppercase ${textMuted}`}>
            <th className="min-w-[180px]">名称</th>
            <th className="min-w-[80px]">类型</th>
            <th className="min-w-[140px]">MCP Server</th>
            <th className="min-w-[80px]">来源</th>
            <th className="min-w-[80px]">状态</th>
            <th className="min-w-[80px] text-right">调用次数</th>
            <th className="min-w-[100px] text-right">平均延迟</th>
            <th className="min-w-[120px]">操作</th>
          </tr>
        </thead>
        <tbody>
          {items.map((skill, idx) => (
            <tr
              key={skill.id}
              className={`${idx % 2 === 0 ? 'bg-transparent' : rowEven} ${hoverRow} transition-colors`}
            >
              <td>
                <div className="flex flex-col gap-0.5">
                  <span className="font-medium truncate max-w-[220px]" title={skill.displayName}>{skill.displayName}</span>
                  <span className={`text-xs ${textMuted} truncate max-w-[220px]`} title={skill.agentName}>{skill.agentName}</span>
                </div>
              </td>
              <td>
                <span className={`badge badge-sm badge-outline whitespace-nowrap ${dark ? 'border-white/20 text-slate-300' : ''}`}>
                  {skill.agentType}
                </span>
              </td>
              <td>
                <span className={`truncate max-w-[140px] inline-block ${skill.parentName ? '' : textMuted}`} title={skill.parentName ?? '—'}>
                  {skill.parentName ?? '—'}
                </span>
              </td>
              <td><span className={sourceBadge(skill.sourceType, theme)}>{SOURCE_LABEL[skill.sourceType]}</span></td>
              <td><span className={statusBadge(skill.status, theme)}>{STATUS_LABEL[skill.status]}</span></td>
              <td className="text-right tabular-nums">{skill.callCount.toLocaleString()}</td>
              <td className="text-right tabular-nums">{skill.avgLatencyMs}ms</td>
              <td>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    className={`btn btn-ghost btn-xs rounded-xl ${dark ? 'text-slate-300 hover:bg-white/10' : 'text-slate-600 hover:bg-slate-100'}`}
                    onClick={() => handleViewDetail(skill.id)}
                  >
                    查看
                  </button>
                  <button
                    type="button"
                    className={`btn btn-ghost btn-xs rounded-xl text-red-500 hover:bg-red-50 ${dark ? 'hover:bg-red-900/30' : ''}`}
                    onClick={() => setDeleteTarget({ id: skill.id, name: skill.displayName })}
                  >
                    删除
                  </button>
                </div>
              </td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr>
              <td colSpan={8} className={`text-center py-12 ${textMuted}`}>
                {loading ? '加载中…' : '暂无数据'}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className={`flex-1 overflow-y-auto px-2 sm:px-3 lg:px-4 py-2 sm:py-3 ${pageBg}`}>
      <div className={`rounded-2xl border shadow-none ${cardBg}`}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <div>
            <h1 className={`font-bold ${titleSize}`}>Skill 管理</h1>
            <p className={`text-sm mt-1 ${textMuted}`}>
              管理平台注册的所有 Skill / Tool，支持按 MCP Server 筛选与分组
            </p>
          </div>
          <button
            type="button"
            className="btn btn-primary btn-sm rounded-xl shadow-lg shadow-blue-500/20"
            onClick={handleCreateSkill}
          >
            + 注册 Skill
          </button>
        </div>

        {/* Filters */}
        <div className="px-6 pb-4 flex flex-wrap items-center gap-2">
          <input
            type="text"
            placeholder="搜索名称 / agentName…"
            className={`${nativeInputClass(theme)} !w-56`}
            value={query.keyword ?? ''}
            onChange={(e) => setQuery((q) => ({ ...q, keyword: e.target.value, page: 1 }))}
          />
          <select
            className={`${nativeSelectClass(theme)} !w-36`}
            value={query.status ?? ''}
            onChange={(e) => setQuery((q) => ({ ...q, status: (e.target.value || undefined) as AgentStatus | undefined, page: 1 }))}
          >
            {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select
            className={`${nativeSelectClass(theme)} !w-32`}
            value={query.sourceType ?? ''}
            onChange={(e) => setQuery((q) => ({ ...q, sourceType: (e.target.value || undefined) as SourceType | undefined, page: 1 }))}
          >
            {SOURCE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select
            className={`${nativeSelectClass(theme)} !w-44`}
            value={query.parentId !== undefined ? String(query.parentId) : ''}
            onChange={(e) => {
              const v = e.target.value;
              setQuery((q) => ({
                ...q,
                parentId: v === '' ? undefined : v === 'standalone' ? undefined : Number(v),
                page: 1,
              }));
            }}
          >
            {mcpServerOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>

          <div className="flex-1" />

          <label className={`flex items-center gap-2 text-sm cursor-pointer select-none ${textMuted}`}>
            <input
              type="checkbox"
              className="toggle toggle-xs toggle-primary"
              checked={groupByServer}
              onChange={(e) => setGroupByServer(e.target.checked)}
            />
            按 Server 分组
          </label>

          <span className={`text-xs ${textMuted}`}>共 {total} 项</span>
        </div>

        {/* Table */}
        <div className="px-6 pb-4">
          {groupByServer && grouped ? (
            [...grouped.entries()].map(([serverName, items]) => (
              <div key={serverName} className="mb-4">
                <div className={`text-xs font-semibold uppercase px-3 py-1.5 rounded-lg mb-2 ${dark ? 'bg-white/5 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                  {serverName}
                  <span className="ml-2 font-normal">({items.length})</span>
                </div>
                {renderTable(items)}
              </div>
            ))
          ) : (
            renderTable(skills)
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-1 px-6 pb-5">
            <button
              type="button"
              className={`btn btn-ghost btn-xs rounded-xl ${query.page === 1 ? 'btn-disabled' : ''}`}
              onClick={() => setQuery((q) => ({ ...q, page: Math.max(1, (q.page ?? 1) - 1) }))}
            >
              上一页
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                type="button"
                className={`btn btn-xs rounded-xl ${p === query.page ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setQuery((q) => ({ ...q, page: p }))}
              >
                {p}
              </button>
            ))}
            <button
              type="button"
              className={`btn btn-ghost btn-xs rounded-xl ${query.page === totalPages ? 'btn-disabled' : ''}`}
              onClick={() => setQuery((q) => ({ ...q, page: Math.min(totalPages, (q.page ?? 1) + 1) }))}
            >
              下一页
            </button>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        title="删除 Skill"
        message={`确定要删除「${deleteTarget?.name ?? ''}」吗？此操作不可撤销。`}
        confirmText="删除"
        variant="danger"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};
