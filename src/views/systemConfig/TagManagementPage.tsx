import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
  Tag, Plus, Trash2, X, Search, Bot, Wrench, AppWindow, Database, Globe, FileText, Layers,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Theme, FontSize } from '../../types';
import { nativeInputClass } from '../../utils/formFieldClasses';
import { LantuSelect } from '../../components/common/LantuSelect';
import { btnPrimary, btnSecondary, canvasBodyBg, mainScrollCompositorClass, textPrimary, textSecondary, textMuted } from '../../utils/uiClasses';
import { Modal } from '../../components/common/Modal';
import { BentoCard } from '../../components/common/BentoCard';
import { PortalDropdown } from '../../components/common/PortalDropdown';
import { PageError } from '../../components/common/PageError';
import { PageSkeleton } from '../../components/common/PageSkeleton';
import { tagService } from '../../api/services/tag.service';
import { useLayoutChrome } from '../../context/LayoutChromeContext';
import { PageTitleTagline } from '../../components/common/PageTitleTagline';
import type { TagItem as TagDTO } from '../../types/dto/tag';

interface Props {
  theme: Theme;
  fontSize: FontSize;
  showMessage: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

type TagCategory = 'Agent' | 'Skill' | 'MCP' | '应用' | '数据集' | '通用';

interface LocalTag {
  id: number;
  name: string;
  category: TagCategory;
  usageCount: number;
}

const TAG_CATEGORIES: TagCategory[] = ['Agent', 'Skill', 'MCP', '应用', '数据集', '通用'];

const CATEGORY_COLORS: Record<TagCategory, { bg: string; text: string; darkBg: string; darkText: string }> = {
  Agent: { bg: 'bg-blue-100', text: 'text-blue-700', darkBg: 'bg-blue-900/40', darkText: 'text-blue-300' },
  Skill: { bg: 'bg-neutral-100', text: 'text-neutral-800', darkBg: 'bg-neutral-900/40', darkText: 'text-neutral-300' },
  MCP: { bg: 'bg-neutral-100', text: 'text-neutral-800', darkBg: 'bg-neutral-800/40', darkText: 'text-neutral-300' },
  '应用': { bg: 'bg-emerald-100', text: 'text-emerald-700', darkBg: 'bg-emerald-900/40', darkText: 'text-emerald-300' },
  '数据集': { bg: 'bg-amber-100', text: 'text-amber-700', darkBg: 'bg-amber-900/40', darkText: 'text-amber-300' },
  '通用': { bg: 'bg-slate-100', text: 'text-slate-700', darkBg: 'bg-slate-700/40', darkText: 'text-slate-300' },
};

const CATEGORY_ICON: Record<TagCategory, React.ElementType> = {
  Agent: Bot, Skill: Wrench, MCP: Layers, '应用': AppWindow, '数据集': Database, '通用': Globe,
};

const INPUT_FOCUS = 'focus:ring-2 focus:ring-neutral-900/20 focus:border-neutral-900/35';

function normalizeTagCategory(raw: string | undefined | null): TagCategory {
  const s = String(raw ?? '').trim();
  if (/^mcp$/i.test(s)) return 'MCP';
  if (TAG_CATEGORIES.includes(s as TagCategory)) return s as TagCategory;
  return '通用';
}

function toLocalTag(dto: TagDTO): LocalTag {
  return {
    id: dto.id,
    name: dto.name,
    category: normalizeTagCategory(dto.category),
    usageCount: dto.usageCount,
  };
}

export const TagManagementPage: React.FC<Props> = ({ theme, fontSize, showMessage }) => {
  const { chromePageTitle } = useLayoutChrome();
  const isDark = theme === 'dark';
  const inputCls = `${nativeInputClass(theme)} ${INPUT_FOCUS}`;
  const tagCategoryOptions = TAG_CATEGORIES.map((c) => ({ value: c, label: c }));
  const labelCls = `text-sm font-medium ${textSecondary(theme)}`;

  const [tags, setTags] = useState<LocalTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<Error | null>(null);
  const [filterCategory, setFilterCategory] = useState<TagCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedTagId, setExpandedTagId] = useState<number | null>(null);
  const tagTriggerRefs = useRef<Map<number, HTMLButtonElement>>(new Map());
  const [showAddInput, setShowAddInput] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagCategory, setNewTagCategory] = useState<TagCategory>('通用');
  const [showBatchAdd, setShowBatchAdd] = useState(false);
  const [batchText, setBatchText] = useState('');
  const [batchCategory, setBatchCategory] = useState<TagCategory>('通用');
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const fetchTags = useCallback(async () => {
    setLoadError(null);
    setLoading(true);
    try {
      const result = await tagService.list();
      setTags(result.map(toLocalTag));
    } catch (err) {
      setLoadError(err instanceof Error ? err : new Error('加载标签列表失败'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTags(); }, [fetchTags]);

  const filteredTags = useMemo(() => {
    let list = tags;
    if (filterCategory !== 'all') list = list.filter((t) => t.category === filterCategory);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((t) => t.name.toLowerCase().includes(q));
    }
    return list;
  }, [tags, filterCategory, searchQuery]);

  const handleAddTag = async () => {
    const name = newTagName.trim();
    if (!name) return;
    if (tags.some((t) => t.name === name)) { showMessage('标签名称已存在', 'error'); return; }
    try {
      await tagService.create({ name, category: newTagCategory });
      setNewTagName('');
      showMessage(`标签「${name}」已添加`, 'success');
      await fetchTags();
    } catch (err) {
      console.error(err);
      showMessage('添加失败', 'error');
    }
  };

  const handleBatchAdd = async () => {
    const lines = batchText.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) return;
    const existing = new Set(tags.map((t) => t.name));
    const newItems = lines.filter(l => !existing.has(l)).map(name => ({ name, category: batchCategory as string }));
    if (newItems.length === 0) { showMessage('所有标签均已存在', 'info'); return; }
    try {
      await tagService.batchCreate(newItems);
      showMessage(`已添加 ${newItems.length} 个标签，${lines.length - newItems.length} 个重复已跳过`, 'success');
      setBatchText('');
      setShowBatchAdd(false);
      await fetchTags();
    } catch (err) {
      console.error(err);
      showMessage('批量添加失败', 'error');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await tagService.remove(id);
      setConfirmDeleteId(null);
      if (expandedTagId === id) setExpandedTagId(null);
      showMessage('标签已删除', 'success');
      await fetchTags();
    } catch (err) {
      console.error(err);
      showMessage('删除失败', 'error');
    }
  };

  return (
    <div className={`flex-1 flex flex-col min-h-0 overflow-hidden ${canvasBodyBg(theme)}`}>
      <div className={`flex-1 min-h-0 overflow-y-auto custom-scrollbar px-2 sm:px-3 lg:px-4 py-4 sm:py-6 ${mainScrollCompositorClass}`}>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className={`shrink-0 rounded-xl p-2.5 ${isDark ? 'bg-white/10' : 'bg-white border border-slate-200/40'}`}>
              <Tag size={22} className="text-neutral-800" />
            </div>
            <PageTitleTagline subtitleOnly theme={theme} title={chromePageTitle || '标签管理'} tagline="管理资源标签，方便分类检索与推荐" />
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setShowBatchAdd(true)} className={`${btnSecondary(theme)} gap-1.5`}>
              <FileText size={14} />
              批量管理
            </button>
            <button type="button" onClick={() => setShowAddInput(true)} className={`${btnPrimary} gap-1.5`}>
              <Plus size={14} />
              新增标签
            </button>
          </div>
        </div>

        <BentoCard theme={theme} padding="sm" className="mb-5">
          <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative w-full min-w-[8rem] sm:max-w-[16rem] shrink-0">
              <Search size={16} className={`absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${textMuted(theme)}`} />
              <input type="search" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="搜索标签…" className={`${inputCls} !pl-9`} aria-label="搜索标签" />
            </div>
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <button type="button" onClick={() => setFilterCategory('all')} className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors shrink-0 ${filterCategory === 'all' ? 'bg-neutral-900 text-white' : isDark ? 'bg-white/5 text-slate-300 hover:bg-white/10' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                全部 ({tags.length})
              </button>
              {TAG_CATEGORIES.map((cat) => {
                const count = tags.filter((t) => t.category === cat).length;
                const CatIcon = CATEGORY_ICON[cat];
                return (
                  <button key={cat} type="button" onClick={() => setFilterCategory(cat)} className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1 shrink-0 ${filterCategory === cat ? 'bg-neutral-900 text-white' : isDark ? 'bg-white/5 text-slate-300 hover:bg-white/10' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                    <CatIcon size={12} />
                    {cat} ({count})
                  </button>
                );
              })}
            </div>
          </div>
        </BentoCard>

        <AnimatePresence>
          {showAddInput && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-5">
              <BentoCard theme={theme} padding="sm">
                <div className="flex flex-wrap items-end gap-3">
                  <div className="flex-1 min-w-[200px]">
                    <label className={`${labelCls} mb-1 block`}>标签名称</label>
                    <input type="text" value={newTagName} onChange={(e) => setNewTagName(e.target.value)} placeholder="输入标签名称…" onKeyDown={(e) => { if (e.key === 'Enter') handleAddTag(); }} className={inputCls} autoFocus />
                  </div>
                  <div className="w-36">
                    <label className={`${labelCls} mb-1 block`}>分类</label>
                    <LantuSelect
                      theme={theme}
                      triggerClassName={INPUT_FOCUS}
                      value={newTagCategory}
                      onChange={(v) => setNewTagCategory(v as TagCategory)}
                      options={tagCategoryOptions}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={handleAddTag} disabled={!newTagName.trim()} className={`${btnPrimary} disabled:opacity-50`}>添加</button>
                    <button type="button" onClick={() => { setShowAddInput(false); setNewTagName(''); }} className={btnSecondary(theme)}>取消</button>
                  </div>
                </div>
              </BentoCard>
            </motion.div>
          )}
        </AnimatePresence>

        <BentoCard theme={theme} padding="md">
          <div className="flex items-center justify-between mb-4">
            <h3 className={`font-bold ${textPrimary(theme)}`}>标签列表</h3>
            <span className={`text-xs ${textMuted(theme)}`}>{filteredTags.length} 个标签</span>
          </div>
          {loading && tags.length === 0 ? (
            <PageSkeleton type="table" rows={6} />
          ) : loadError ? (
            <PageError error={loadError} onRetry={fetchTags} retryLabel="重试加载标签" />
          ) : filteredTags.length === 0 ? (
            <p className={`text-center py-10 ${textMuted(theme)}`}>暂无匹配的标签</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {filteredTags.map((tag) => {
                const cc = CATEGORY_COLORS[tag.category];
                const isExpanded = expandedTagId === tag.id;
                const isConfirming = confirmDeleteId === tag.id;
                return (
                  <div key={tag.id}>
                    <button
                      type="button"
                      ref={(el) => { if (el) tagTriggerRefs.current.set(tag.id, el); }}
                      onClick={() => setExpandedTagId(isExpanded ? null : tag.id)}
                      className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all border ${
                        isExpanded
                          ? isDark ? `${cc.darkBg} ${cc.darkText} border-current/20 ring-1 ring-current/10` : `${cc.bg} ${cc.text} border-current/20 ring-1 ring-current/10`
                          : isDark ? `${cc.darkBg} ${cc.darkText} border-transparent hover:border-current/10` : `${cc.bg} ${cc.text} border-transparent hover:border-current/10`
                      }`}
                    >
                      <Tag size={12} />
                      {tag.name}
                      <span className={`text-xs px-1.5 py-0.5 rounded-md ${isDark ? 'bg-white/10' : 'bg-white/70'}`}>{tag.usageCount}</span>
                    </button>

                    <PortalDropdown
                      open={isExpanded}
                      onClose={() => setExpandedTagId(null)}
                      anchorEl={tagTriggerRefs.current.get(tag.id) ?? null}
                      align="left"
                      className={`w-64 rounded-xl border p-3 shadow-xl ${isDark ? 'bg-lantu-card border-white/[0.06]' : 'bg-white border-slate-200'}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className={`font-bold text-sm ${textPrimary(theme)}`}>{tag.name}</span>
                        <div className="flex items-center gap-1">
                          {isConfirming ? (
                            <>
                              <button type="button" onClick={() => handleDelete(tag.id)} className={`${btnPrimary} !bg-red-600 !hover:bg-red-500 !px-2 !py-1 text-xs`}>确认删除</button>
                              <button type="button" onClick={() => setConfirmDeleteId(null)} className={`${btnSecondary(theme)} !px-2 !py-1 text-xs`}>取消</button>
                            </>
                          ) : (
                            <button type="button" onClick={() => { if (tag.usageCount > 0) setConfirmDeleteId(tag.id); else handleDelete(tag.id); }} className="p-1 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors">
                              <Trash2 size={12} />
                            </button>
                          )}
                          <button type="button" onClick={() => setExpandedTagId(null)} className={`p-1 rounded-lg transition-colors ${isDark ? 'hover:bg-white/10' : 'hover:bg-slate-100'}`}>
                            <X size={12} />
                          </button>
                        </div>
                      </div>
                      <div className={`text-xs mb-2 ${textMuted(theme)}`}>分类: {tag.category} · 使用次数: {tag.usageCount}</div>
                      {isConfirming && tag.usageCount > 0 && (
                        <p className="text-[11px] text-red-500 mt-2">此标签正在被 {tag.usageCount} 个资源使用，删除后将从所有资源中移除。</p>
                      )}
                    </PortalDropdown>
                  </div>
                );
              })}
            </div>
          )}
        </BentoCard>
      </div>

      <Modal open={showBatchAdd} onClose={() => setShowBatchAdd(false)} title="批量添加标签" theme={theme} size="md" footer={
        <>
          <button type="button" onClick={() => setShowBatchAdd(false)} className={btnSecondary(theme)}>取消</button>
          <button type="button" onClick={handleBatchAdd} disabled={!batchText.trim()} className={`${btnPrimary} inline-flex items-center gap-1.5 disabled:opacity-50`}>
            <Plus size={14} />
            批量添加
          </button>
        </>
      }>
        <div className="space-y-4">
          <div>
            <label className={`${labelCls} mb-1.5 block`}>标签列表（每行一个）</label>
            <textarea value={batchText} onChange={(e) => setBatchText(e.target.value)} placeholder="文档生成\n图像处理\n数据分析\n…" rows={8} className={`${inputCls} !min-h-[180px] resize-none font-mono`} />
          </div>
          <div>
            <label className={`${labelCls} mb-1.5 block`}>统一分类</label>
            <LantuSelect
              theme={theme}
              triggerClassName={INPUT_FOCUS}
              value={batchCategory}
              onChange={(v) => setBatchCategory(v as TagCategory)}
              options={tagCategoryOptions}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};
