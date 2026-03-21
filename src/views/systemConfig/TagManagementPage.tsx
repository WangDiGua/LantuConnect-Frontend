import React, { useState, useMemo } from 'react';
import {
  Tag,
  Plus,
  Trash2,
  X,
  Search,
  Bot,
  Wrench,
  AppWindow,
  Database,
  Globe,
  FileText,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Theme, FontSize } from '../../types';
import { nativeInputClass, nativeSelectClass } from '../../utils/formFieldClasses';
import { btnPrimary, btnSecondary } from '../../utils/uiClasses';
import { Modal } from '../../components/common/Modal';

interface Props {
  theme: Theme;
  fontSize: FontSize;
  showMessage: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

type TagCategory = 'Agent' | 'Skill' | '应用' | '数据集' | '通用';

interface TagItem {
  id: string;
  name: string;
  category: TagCategory;
  usageCount: number;
  usedBy: { type: string; name: string }[];
}

const TAG_CATEGORIES: TagCategory[] = ['Agent', 'Skill', '应用', '数据集', '通用'];

const CATEGORY_COLORS: Record<TagCategory, { bg: string; text: string; darkBg: string; darkText: string }> = {
  Agent: { bg: 'bg-blue-100', text: 'text-blue-700', darkBg: 'bg-blue-900/40', darkText: 'text-blue-300' },
  Skill: { bg: 'bg-violet-100', text: 'text-violet-700', darkBg: 'bg-violet-900/40', darkText: 'text-violet-300' },
  '应用': { bg: 'bg-emerald-100', text: 'text-emerald-700', darkBg: 'bg-emerald-900/40', darkText: 'text-emerald-300' },
  '数据集': { bg: 'bg-amber-100', text: 'text-amber-700', darkBg: 'bg-amber-900/40', darkText: 'text-amber-300' },
  '通用': { bg: 'bg-slate-100', text: 'text-slate-700', darkBg: 'bg-slate-700/40', darkText: 'text-slate-300' },
};

const CATEGORY_ICON: Record<TagCategory, React.ElementType> = {
  Agent: Bot,
  Skill: Wrench,
  '应用': AppWindow,
  '数据集': Database,
  '通用': Globe,
};

const INITIAL_TAGS: TagItem[] = [
  { id: '1', name: '文档生成', category: 'Agent', usageCount: 8, usedBy: [{ type: 'Agent', name: '文档生成 Agent' }, { type: 'Agent', name: '报告助手' }] },
  { id: '2', name: '图像处理', category: 'Skill', usageCount: 5, usedBy: [{ type: 'Skill', name: '图像识别' }, { type: 'Skill', name: '图像压缩' }] },
  { id: '3', name: '数据分析', category: '通用', usageCount: 12, usedBy: [{ type: 'Agent', name: '数据分析引擎' }, { type: 'Skill', name: '图表生成' }, { type: '应用', name: '数据看板' }] },
  { id: '4', name: '校园服务', category: '通用', usageCount: 15, usedBy: [{ type: 'Agent', name: '校园问答助手' }, { type: 'Agent', name: '选课推荐' }] },
  { id: '5', name: '科研工具', category: 'Agent', usageCount: 6, usedBy: [{ type: 'Agent', name: '论文助手' }] },
  { id: '6', name: '办公自动化', category: '通用', usageCount: 9, usedBy: [{ type: 'Agent', name: 'OA 助手' }, { type: 'Skill', name: '邮件模板' }] },
  { id: '7', name: 'AI对话', category: 'Agent', usageCount: 20, usedBy: [{ type: 'Agent', name: '通用问答' }, { type: 'Agent', name: '校园问答' }] },
  { id: '8', name: '搜索检索', category: 'Skill', usageCount: 7, usedBy: [{ type: 'Skill', name: '全文检索' }] },
  { id: '9', name: '代码工具', category: 'Skill', usageCount: 4, usedBy: [{ type: 'Skill', name: '代码补全' }, { type: 'Skill', name: '代码审查' }] },
  { id: '10', name: '教学辅助', category: '通用', usageCount: 11, usedBy: [{ type: 'Agent', name: '教学助手' }, { type: '应用', name: '在线课堂' }] },
  { id: '11', name: '翻译', category: 'Skill', usageCount: 3, usedBy: [{ type: 'Skill', name: '多语言翻译' }] },
  { id: '12', name: '图表制作', category: 'Skill', usageCount: 6, usedBy: [{ type: 'Skill', name: '图表生成' }] },
  { id: '13', name: '文件转换', category: 'Skill', usageCount: 2, usedBy: [] },
  { id: '14', name: '知识问答', category: 'Agent', usageCount: 14, usedBy: [{ type: 'Agent', name: '知识库问答' }, { type: 'Agent', name: '校园问答' }] },
  { id: '15', name: '智能写作', category: 'Agent', usageCount: 8, usedBy: [{ type: 'Agent', name: '写作助手' }] },
  { id: '16', name: '流程自动化', category: '应用', usageCount: 3, usedBy: [{ type: '应用', name: '审批助手' }] },
  { id: '17', name: '数据可视化', category: '数据集', usageCount: 5, usedBy: [{ type: '数据集', name: '教学数据集' }] },
  { id: '18', name: '日程管理', category: '应用', usageCount: 2, usedBy: [{ type: '应用', name: '日程规划' }] },
  { id: '19', name: '语音处理', category: 'Skill', usageCount: 1, usedBy: [] },
  { id: '20', name: '安全审计', category: '通用', usageCount: 4, usedBy: [{ type: 'Agent', name: '安全检查' }] },
];

export const TagManagementPage: React.FC<Props> = ({ theme, fontSize, showMessage }) => {
  const isDark = theme === 'dark';
  const [tags, setTags] = useState<TagItem[]>(INITIAL_TAGS);
  const [filterCategory, setFilterCategory] = useState<TagCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedTagId, setExpandedTagId] = useState<string | null>(null);
  const [showAddInput, setShowAddInput] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagCategory, setNewTagCategory] = useState<TagCategory>('通用');
  const [showBatchAdd, setShowBatchAdd] = useState(false);
  const [batchText, setBatchText] = useState('');
  const [batchCategory, setBatchCategory] = useState<TagCategory>('通用');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const filteredTags = useMemo(() => {
    let list = tags;
    if (filterCategory !== 'all') {
      list = list.filter((t) => t.category === filterCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((t) => t.name.toLowerCase().includes(q));
    }
    return list;
  }, [tags, filterCategory, searchQuery]);

  const handleAddTag = () => {
    const name = newTagName.trim();
    if (!name) return;
    if (tags.some((t) => t.name === name)) {
      showMessage('标签名称已存在', 'error');
      return;
    }
    setTags((prev) => [...prev, {
      id: `tag-${Date.now()}`,
      name,
      category: newTagCategory,
      usageCount: 0,
      usedBy: [],
    }]);
    setNewTagName('');
    showMessage(`标签「${name}」已添加`, 'success');
  };

  const handleBatchAdd = () => {
    const lines = batchText.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) return;
    const existing = new Set(tags.map((t) => t.name));
    let added = 0;
    const newTags: TagItem[] = [];
    for (const line of lines) {
      if (!existing.has(line)) {
        newTags.push({
          id: `tag-batch-${Date.now()}-${added}`,
          name: line,
          category: batchCategory,
          usageCount: 0,
          usedBy: [],
        });
        existing.add(line);
        added++;
      }
    }
    if (newTags.length > 0) {
      setTags((prev) => [...prev, ...newTags]);
    }
    showMessage(`已添加 ${added} 个标签，${lines.length - added} 个重复已跳过`, 'success');
    setBatchText('');
    setShowBatchAdd(false);
  };

  const handleDelete = (id: string) => {
    const tag = tags.find((t) => t.id === id);
    if (!tag) return;
    setTags((prev) => prev.filter((t) => t.id !== id));
    setConfirmDeleteId(null);
    if (expandedTagId === id) setExpandedTagId(null);
    showMessage(`标签「${tag.name}」已删除`, 'success');
  };

  const cardCls = `rounded-2xl border shadow-none ${isDark ? 'bg-[#1C1C1E] border-white/10' : 'bg-white border-slate-200/80'}`;
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';
  const textMuted = isDark ? 'text-slate-500' : 'text-slate-400';

  return (
    <div className={`flex-1 flex flex-col min-h-0 overflow-hidden ${isDark ? 'bg-[#000000]' : 'bg-[#F2F2F7]'}`}>
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-2 sm:px-3 lg:px-4 py-2 sm:py-3">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${isDark ? 'bg-white/10' : 'bg-white border border-slate-200/80'}`}>
              <Tag size={22} className="text-violet-500" />
            </div>
            <div>
              <h1 className={`text-xl font-bold ${textPrimary}`}>标签管理</h1>
              <p className={`text-xs ${textMuted}`}>管理资源标签，方便分类检索与推荐</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowBatchAdd(true)}
              className="btn btn-ghost btn-sm h-9 min-h-0 gap-1.5 rounded-xl"
            >
              <FileText size={14} />
              批量管理
            </button>
            <button
              type="button"
              onClick={() => setShowAddInput(true)}
              className="btn btn-primary btn-sm h-9 min-h-0 gap-1.5 rounded-xl"
            >
              <Plus size={14} />
              新增标签
            </button>
          </div>
        </div>

        {/* Filter bar */}
        <div className={`${cardCls} px-4 py-3 mb-5 flex flex-wrap items-center gap-3`}>
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className={`absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${textMuted}`} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索标签…"
              className={`${nativeInputClass(theme)} !pl-9`}
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setFilterCategory('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                filterCategory === 'all'
                  ? 'bg-blue-600 text-white'
                  : isDark ? 'bg-white/5 text-slate-300 hover:bg-white/10' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              全部 ({tags.length})
            </button>
            {TAG_CATEGORIES.map((cat) => {
              const count = tags.filter((t) => t.category === cat).length;
              const CatIcon = CATEGORY_ICON[cat];
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setFilterCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1 ${
                    filterCategory === cat
                      ? 'bg-blue-600 text-white'
                      : isDark ? 'bg-white/5 text-slate-300 hover:bg-white/10' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <CatIcon size={12} />
                  {cat} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Inline add tag */}
        <AnimatePresence>
          {showAddInput && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mb-5"
            >
              <div className={`${cardCls} px-4 py-4 flex flex-wrap items-end gap-3`}>
                <div className="flex-1 min-w-[200px]">
                  <label className={`text-xs font-medium block mb-1 ${textSecondary}`}>标签名称</label>
                  <input
                    type="text"
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    placeholder="输入标签名称…"
                    onKeyDown={(e) => { if (e.key === 'Enter') handleAddTag(); }}
                    className={nativeInputClass(theme)}
                    autoFocus
                  />
                </div>
                <div className="w-36">
                  <label className={`text-xs font-medium block mb-1 ${textSecondary}`}>分类</label>
                  <select
                    value={newTagCategory}
                    onChange={(e) => setNewTagCategory(e.target.value as TagCategory)}
                    className={nativeSelectClass(theme)}
                  >
                    {TAG_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={handleAddTag} disabled={!newTagName.trim()} className="btn btn-primary btn-sm rounded-xl">
                    添加
                  </button>
                  <button type="button" onClick={() => { setShowAddInput(false); setNewTagName(''); }} className="btn btn-ghost btn-sm rounded-xl">
                    取消
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tag cloud / grid */}
        <div className={cardCls}>
          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className={`font-bold ${textPrimary}`}>标签列表</h3>
              <span className={`text-xs ${textMuted}`}>{filteredTags.length} 个标签</span>
            </div>
            {filteredTags.length === 0 ? (
              <p className={`text-center py-10 ${textMuted}`}>暂无匹配的标签</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {filteredTags.map((tag) => {
                  const cc = CATEGORY_COLORS[tag.category];
                  const isExpanded = expandedTagId === tag.id;
                  const isConfirming = confirmDeleteId === tag.id;
                  return (
                    <div key={tag.id} className="relative">
                      <button
                        type="button"
                        onClick={() => setExpandedTagId(isExpanded ? null : tag.id)}
                        className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all border ${
                          isExpanded
                            ? isDark
                              ? `${cc.darkBg} ${cc.darkText} border-current/20 ring-1 ring-current/10`
                              : `${cc.bg} ${cc.text} border-current/20 ring-1 ring-current/10`
                            : isDark
                              ? `${cc.darkBg} ${cc.darkText} border-transparent hover:border-current/10`
                              : `${cc.bg} ${cc.text} border-transparent hover:border-current/10`
                        }`}
                      >
                        <Tag size={12} />
                        {tag.name}
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${
                          isDark ? 'bg-white/10' : 'bg-white/70'
                        }`}>
                          {tag.usageCount}
                        </span>
                      </button>

                      {/* Expanded detail popover */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ opacity: 0, y: -4, scale: 0.97 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -4, scale: 0.97 }}
                            className={`absolute left-0 top-full mt-2 z-50 w-64 rounded-xl border p-3 shadow-xl ${
                              isDark ? 'bg-[#2C2C2E] border-white/10' : 'bg-white border-slate-200'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className={`font-bold text-sm ${textPrimary}`}>{tag.name}</span>
                              <div className="flex items-center gap-1">
                                {isConfirming ? (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleDelete(tag.id)}
                                      className="btn btn-error btn-xs min-h-0 h-6 rounded-lg text-[10px]"
                                    >
                                      确认删除
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setConfirmDeleteId(null)}
                                      className="btn btn-ghost btn-xs min-h-0 h-6 rounded-lg text-[10px]"
                                    >
                                      取消
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (tag.usageCount > 0) {
                                        setConfirmDeleteId(tag.id);
                                      } else {
                                        handleDelete(tag.id);
                                      }
                                    }}
                                    className="btn btn-ghost btn-xs min-h-0 h-6 rounded-lg text-red-500"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => setExpandedTagId(null)}
                                  className="btn btn-ghost btn-xs min-h-0 h-6 rounded-lg"
                                >
                                  <X size={12} />
                                </button>
                              </div>
                            </div>
                            <div className={`text-xs mb-2 ${textMuted}`}>
                              分类: {tag.category} · 使用次数: {tag.usageCount}
                            </div>
                            {tag.usedBy.length > 0 ? (
                              <div className="space-y-1">
                                <p className={`text-[11px] font-medium ${textSecondary}`}>使用该标签的资源：</p>
                                {tag.usedBy.map((u, i) => (
                                  <div
                                    key={i}
                                    className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs ${
                                      isDark ? 'bg-white/5' : 'bg-slate-50'
                                    }`}
                                  >
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                                      CATEGORY_COLORS[u.type as TagCategory]
                                        ? `${isDark ? CATEGORY_COLORS[u.type as TagCategory].darkBg : CATEGORY_COLORS[u.type as TagCategory].bg} ${isDark ? CATEGORY_COLORS[u.type as TagCategory].darkText : CATEGORY_COLORS[u.type as TagCategory].text}`
                                        : isDark ? 'bg-white/10 text-slate-400' : 'bg-slate-100 text-slate-600'
                                    }`}>
                                      {u.type}
                                    </span>
                                    <span className={textPrimary}>{u.name}</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className={`text-xs ${textMuted}`}>暂无资源使用此标签</p>
                            )}
                            {isConfirming && tag.usageCount > 0 && (
                              <p className="text-[11px] text-red-500 mt-2">
                                此标签正在被 {tag.usageCount} 个资源使用，删除后将从所有资源中移除。
                              </p>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Batch Add Modal */}
      <Modal
        open={showBatchAdd}
        onClose={() => setShowBatchAdd(false)}
        title="批量添加标签"
        theme={theme}
        size="md"
        footer={
          <>
            <button type="button" onClick={() => setShowBatchAdd(false)} className={btnSecondary(theme)}>
              取消
            </button>
            <button
              type="button"
              onClick={handleBatchAdd}
              disabled={!batchText.trim()}
              className={`${btnPrimary} inline-flex items-center gap-1.5 disabled:opacity-50`}
            >
              <Plus size={14} />
              批量添加
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className={`text-sm font-medium block mb-1.5 ${textSecondary}`}>标签列表（每行一个）</label>
            <textarea
              value={batchText}
              onChange={(e) => setBatchText(e.target.value)}
              placeholder="文档生成\n图像处理\n数据分析\n…"
              rows={8}
              className={`${nativeInputClass(theme)} !min-h-[180px] resize-none font-mono`}
            />
          </div>
          <div>
            <label className={`text-sm font-medium block mb-1.5 ${textSecondary}`}>统一分类</label>
            <select
              value={batchCategory}
              onChange={(e) => setBatchCategory(e.target.value as TagCategory)}
              className={nativeSelectClass(theme)}
            >
              {TAG_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
      </Modal>
    </div>
  );
};
