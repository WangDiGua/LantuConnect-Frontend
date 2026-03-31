// @deprecated - This file is no longer used in the current routing. Replaced by unified resource management.
import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Plus, Trash2, Eye, MoreHorizontal, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Theme, FontSize } from '../../types';
import type { Skill, SkillListQuery, McpServer } from '../../types/dto/skill';
import type { AgentStatus, SourceType } from '../../types/dto/agent';
import { skillService } from '../../api/services/skill.service';
import { nativeInputClass } from '../../utils/formFieldClasses';
import { LantuSelect } from '../../components/common/LantuSelect';
import {
  canvasBodyBg,
  mainScrollCompositorClass,
  bentoCard,
  bentoCardHover,
  btnPrimary,
  btnGhost,
  statusBadgeClass,
  statusDot,
  statusLabel,
  textPrimary,
  textSecondary,
  textMuted,
  techBadge,
} from '../../utils/uiClasses';
import type { DomainStatus } from '../../utils/uiClasses';
import { useMessage } from '../../components/common/Message';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { Modal } from '../../components/common/Modal';
import { AnimatedList } from '../../components/common/AnimatedList';
import { PortalDropdown } from '../../components/common/PortalDropdown';
import { SkillCreate } from './SkillCreate';
import { SkillDetail } from './SkillDetail';
import { useLayoutChrome } from '../../context/LayoutChromeContext';
import { PageTitleTagline } from '../../components/common/PageTitleTagline';
import { PageSkeleton } from '../../components/common/PageSkeleton';

interface Props {
  theme: Theme;
  fontSize: FontSize;
}

type ViewMode = 'list' | 'create';

const STATUS_OPTIONS: { value: AgentStatus | ''; label: string }[] = [
  { value: '', label: '全部状�? },
  { value: 'published', label: '已发�? },
  { value: 'draft', label: '草稿' },
  { value: 'testing', label: '测试�? },
  { value: 'pending_review', label: '待审�? },
  { value: 'rejected', label: '已拒�? },
  { value: 'deprecated', label: '已废�? },
];

const SOURCE_OPTIONS: { value: SourceType | ''; label: string }[] = [
  { value: '', label: '全部来源' },
  { value: 'internal', label: '内部' },
  { value: 'partner', label: '合作�? },
  { value: 'cloud', label: '云服�? },
];

const SOURCE_LABEL: Record<SourceType, string> = {
  internal: '内部',
  partner: '合作�?,
  cloud: '云服�?,
};

export const SkillList: React.FC<Props> = ({ theme, fontSize }) => {
  const isDark = theme === 'dark';
  const { chromePageTitle } = useLayoutChrome();
  const { showMessage } = useMessage();

  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [detailSkillId, setDetailSkillId] = useState<string | null>(null);

  const [skills, setSkills] = useState<Skill[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [mcpServers, setMcpServers] = useState<McpServer[]>([]);
  const [groupByServer, setGroupByServer] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const menuTriggerRefs = useRef<Map<number, HTMLButtonElement>>(new Map());

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
    setDetailSkillId(String(id));
  }, []);

  const handleCreateSkill = useCallback(() => {
    setViewMode('create');
  }, []);

  const handleBackToList = useCallback(() => {
    setViewMode('list');
    fetchSkills();
  }, [fetchSkills]);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await skillService.remove(deleteTarget.id);
      setDeleteTarget(null);
      fetchSkills();
      showMessage('Skill 已删�?, 'success');
    } catch (err) {
      showMessage('删除失败: ' + (err instanceof Error ? err.message : '未知错误'), 'error');
    } finally { setDeleting(false); }
  }, [deleteTarget, fetchSkills, showMessage]);

  const mcpServerOptions = useMemo(() => [
    { value: '', label: '全部 MCP Server' },
    { value: 'standalone', label: '独立 Skill（无 Server�? },
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

  if (viewMode === 'create') {
    return <SkillCreate theme={theme} fontSize={fontSize} onBack={handleBackToList} onSuccess={() => { handleBackToList(); showMessage('Skill 注册成功', 'success'); }} />;
  }

  const renderSkillRow = (skill: Skill) => (
    <motion.div
      key={skill.id}
      className={`${bentoCardHover(theme)} p-4 flex items-center gap-4 ${
        isDark ? 'hover:bg-neutral-900/[0.03]' : 'hover:bg-neutral-100/40'
      }`}
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 ${
        isDark ? 'bg-white/[0.04]' : 'bg-slate-50'
      }`}>
        {skill.icon || '🔧'}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`font-semibold truncate ${textPrimary(theme)}`}>{skill.displayName}</span>
          <span className={techBadge(theme)}>{skill.agentType}</span>
          <span className={statusBadgeClass(skill.status as DomainStatus, theme)}>
            <span className={statusDot(skill.status as DomainStatus)} />
            {statusLabel(skill.status as DomainStatus)}
          </span>
        </div>
        <div className={`text-xs mt-0.5 truncate ${textMuted(theme)}`}>
          {skill.agentName} · {SOURCE_LABEL[skill.sourceType]} {skill.parentName ? `· ${skill.parentName}` : ''}
        </div>
      </div>

      <div className="hidden lg:flex items-center gap-6 shrink-0">
        <div className="text-right">
          <div className={`text-xs uppercase tracking-wider ${textMuted(theme)}`}>调用</div>
          <div className={`text-sm font-mono tabular-nums font-medium ${textSecondary(theme)}`}>
            {skill.callCount.toLocaleString()}
          </div>
        </div>
        <div className="text-right">
          <div className={`text-xs uppercase tracking-wider ${textMuted(theme)}`}>延迟</div>
          <div className={`text-sm font-mono tabular-nums ${textMuted(theme)}`}>{skill.avgLatencyMs}ms</div>
        </div>
      </div>

      {/* Desktop actions */}
      <div className="hidden sm:flex items-center gap-1 shrink-0">
        <button type="button" className={btnGhost(theme)} onClick={() => handleViewDetail(skill.id)}>
          <Eye size={15} />
        </button>
        <button
          type="button"
          onClick={() => setDeleteTarget({ id: skill.id, name: skill.displayName })}
          className={`p-2 rounded-xl transition-colors ${isDark ? 'text-rose-400 hover:bg-rose-500/10' : 'text-rose-500 hover:bg-rose-50'}`}
        >
          <Trash2 size={15} />
        </button>
      </div>

      {/* Mobile menu */}
      <div className="sm:hidden shrink-0">
        <button type="button" ref={(el) => { if (el) menuTriggerRefs.current.set(skill.id, el); }} onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === skill.id ? null : skill.id); }} className={btnGhost(theme)}>
          <MoreHorizontal size={16} />
        </button>
        <PortalDropdown open={openMenuId === skill.id} onClose={() => setOpenMenuId(null)} anchorEl={menuTriggerRefs.current.get(skill.id) ?? null} className={`w-32 rounded-xl border shadow-xl py-1 ${isDark ? 'bg-[#1a1f2e] border-white/10' : 'bg-white border-slate-200'}`}>
          <button type="button" onClick={() => { handleViewDetail(skill.id); setOpenMenuId(null); }} className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 ${isDark ? 'text-slate-300 hover:bg-white/5' : 'text-slate-700 hover:bg-slate-50'}`}>
            <Eye size={14} /> 查看
          </button>
          <button type="button" onClick={() => { setDeleteTarget({ id: skill.id, name: skill.displayName }); setOpenMenuId(null); }} className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 ${isDark ? 'text-rose-400 hover:bg-rose-500/10' : 'text-rose-500 hover:bg-rose-50'}`}>
            <Trash2 size={14} /> 删除
          </button>
        </PortalDropdown>
      </div>
    </motion.div>
  );

  const renderSkillRows = (items: Skill[]) => (
    <AnimatedList className="space-y-2">
      {items.length === 0
        ? [
            loading ? (
              <PageSkeleton key="loading" type="table" rows={6} />
            ) : (
              <div key="empty" className={`text-center py-12 ${textMuted(theme)}`}>暂无数据</div>
            ),
          ]
        : items.map((skill) => renderSkillRow(skill))}
    </AnimatedList>
  );

  return (
    <div className={`flex-1 flex flex-col min-h-0 overflow-y-auto custom-scrollbar ${mainScrollCompositorClass} transition-colors duration-300 ${canvasBodyBg(theme)}`}>
      <div className="w-full flex flex-col px-3 sm:px-4 lg:px-5 py-4 gap-4">
        <div className={`${bentoCard(theme)} overflow-hidden shrink-0 flex flex-col`}>
          {/* Header */}
          <div className={`flex items-center justify-between gap-3 px-6 py-4 border-b shrink-0 ${isDark ? 'border-white/[0.06]' : 'border-slate-100'}`}>
            <PageTitleTagline
              className="min-w-0 flex-1"
              subtitleOnly
              theme={theme}
              title={chromePageTitle || 'Skill 列表'}
              tagline="管理平台注册的所有 Skill / Tool，支持按 MCP Server 筛选与分组"
            />
            <button type="button" className={btnPrimary} onClick={handleCreateSkill}>
              <Plus size={15} /> 注册 Skill
            </button>
          </div>

          {/* Filters */}
          <div className={`px-4 py-3 border-b shrink-0 flex flex-wrap items-center gap-2 ${isDark ? 'border-white/[0.06]' : 'border-slate-100'}`}>
            <input
              type="text"
              placeholder="搜索名称 / agentName…"
              className={`${nativeInputClass(theme)} !w-56`}
              value={query.keyword ?? ''}
              onChange={(e) => setQuery((q) => ({ ...q, keyword: e.target.value, page: 1 }))}
            />
            <LantuSelect
              theme={theme}
              className="!w-36"
              value={query.status ?? ''}
              onChange={(v) => setQuery((q) => ({ ...q, status: (v || undefined) as AgentStatus | undefined, page: 1 }))}
              options={STATUS_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
            />
            <LantuSelect
              theme={theme}
              className="!w-32"
              value={query.sourceType ?? ''}
              onChange={(v) => setQuery((q) => ({ ...q, sourceType: (v || undefined) as SourceType | undefined, page: 1 }))}
              options={SOURCE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
            />
            <LantuSelect
              theme={theme}
              className="!w-44"
              value={query.parentId !== undefined ? String(query.parentId) : ''}
              onChange={(v) => {
                setQuery((q) => ({
                  ...q,
                  parentId: v === '' ? undefined : v === 'standalone' ? undefined : Number(v),
                  page: 1,
                }));
              }}
              options={mcpServerOptions}
            />
            <div className="flex-1" />
            <label className={`flex items-center gap-2 text-xs cursor-pointer select-none ${textMuted(theme)}`}>
              <input
                type="checkbox"
                className="toggle toggle-xs toggle-primary"
                checked={groupByServer}
                onChange={(e) => setGroupByServer(e.target.checked)}
              />
              按 Server 分组
            </label>
            <span className={`text-xs ${textMuted(theme)}`}>共 {total} 条</span>
          </div>
        </div>

        <div className={`${bentoCard(theme)} overflow-hidden flex flex-col`}>
          {/* Rows */}
          <div className="p-3">
            {groupByServer && grouped ? (
              [...grouped.entries()].map(([serverName, items]) => (
                <div key={serverName} className="mb-4">
                  <div className={`text-xs font-semibold uppercase px-3 py-1.5 rounded-lg mb-2 ${isDark ? 'bg-white/[0.03] text-slate-400' : 'bg-slate-50 text-slate-500'}`}>
                    {serverName}
                    <span className="ml-2 font-normal">({items.length})</span>
                  </div>
                  {renderSkillRows(items)}
                </div>
              ))
            ) : (
              renderSkillRows(skills)
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className={`px-4 py-3 border-t shrink-0 flex items-center justify-between ${isDark ? 'border-white/[0.06]' : 'border-slate-100'}`}>
              <span className={`text-sm ${textMuted(theme)}`}>共 {total} 条，第 {query.page}/{totalPages} 页</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={query.page === 1}
                  onClick={() => setQuery((q) => ({ ...q, page: Math.max(1, (q.page ?? 1) - 1) }))}
                  className={`p-2 rounded-xl transition-colors ${query.page === 1 ? (isDark ? 'text-slate-600 cursor-not-allowed' : 'text-slate-300 cursor-not-allowed') : (isDark ? 'text-slate-300 hover:bg-white/5' : 'text-slate-600 hover:bg-slate-100')}`}
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  type="button"
                  disabled={query.page === totalPages}
                  onClick={() => setQuery((q) => ({ ...q, page: Math.min(totalPages, (q.page ?? 1) + 1) }))}
                  className={`p-2 rounded-xl transition-colors ${query.page === totalPages ? (isDark ? 'text-slate-600 cursor-not-allowed' : 'text-slate-300 cursor-not-allowed') : (isDark ? 'text-slate-300 hover:bg-white/5' : 'text-slate-600 hover:bg-slate-100')}`}
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
        title="删除 Skill"
        message={`确定要删除「${deleteTarget?.name ?? ''}」吗？此操作不可撤销。`}
        confirmText="删除"
        variant="danger"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <Modal
        open={!!detailSkillId}
        onClose={() => { setDetailSkillId(null); fetchSkills(); }}
        theme={theme}
        size="xl"
        contentClassName="flex-1 min-h-0 overflow-hidden flex flex-col p-0"
      >
        {detailSkillId && (
          <SkillDetail
            skillId={detailSkillId}
            theme={theme}
            fontSize={fontSize}
            onBack={() => { setDetailSkillId(null); fetchSkills(); }}
          />
        )}
      </Modal>
    </div>
  );
};
