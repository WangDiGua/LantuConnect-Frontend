import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronRight,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  X,
  FolderTree,
  School,
  BookOpen,
  Users,
  Building2,
  GraduationCap,
  BookMarked,
  FlaskConical,
  PenTool,
  Briefcase,
  FileText,
  BarChart3,
  Workflow,
  Heart,
  MapPin,
  Coffee,
  Layers,
  Search,
  Code2,
  Tag,
  type LucideIcon,
} from 'lucide-react';
import { Theme, FontSize } from '../../types';
import { MgmtPageShell } from '../userMgmt/MgmtPageShell';
import { nativeInputClass, nativeSelectClass } from '../../utils/formFieldClasses';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { categoryService, buildCategoryTree } from '../../api/services/category.service';
import type {
  Category,
  CategoryCreatePayload,
  CategoryUpdatePayload,
} from '../../types/dto/category';

const ICON_MAP: Record<string, LucideIcon> = {
  School, BookOpen, Users, Building2, GraduationCap, BookMarked, FlaskConical,
  PenTool, Briefcase, FileText, BarChart3, Workflow, Heart, MapPin, Coffee,
  Layers, Search, Code2, Tag, FolderTree,
};

const ICON_OPTIONS = Object.keys(ICON_MAP);

function getIcon(name: string | null): LucideIcon {
  return (name && ICON_MAP[name]) || Tag;
}

interface CategoryManagementProps {
  theme: Theme;
  fontSize: FontSize;
  showMessage: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

interface FormState {
  mode: 'create' | 'edit';
  categoryName: string;
  categoryCode: string;
  parentId: number | null;
  icon: string;
  sortOrder: number;
  editId?: number;
}

const emptyForm = (parentId: number | null = null): FormState => ({
  mode: 'create',
  categoryName: '',
  categoryCode: '',
  parentId,
  icon: 'Tag',
  sortOrder: 0,
});

export const CategoryManagement: React.FC<CategoryManagementProps> = ({
  theme,
  fontSize,
  showMessage,
}) => {
  const isDark = theme === 'dark';

  const [flatList, setFlatList] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const list = await categoryService.list();
      setFlatList(list);
      setExpanded(new Set(list.filter((c) => c.parentId === null).map((c) => c.id)));
    } catch {
      showMessage('加载分类列表失败', 'error');
    } finally {
      setLoading(false);
    }
  }, [showMessage]);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  const tree = useMemo(() => buildCategoryTree(flatList), [flatList]);

  const toggleExpand = (id: number) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const openCreate = (parentId: number | null = null) => {
    setForm(emptyForm(parentId));
    setFormOpen(true);
  };

  const openEdit = (cat: Category) => {
    setForm({
      mode: 'edit',
      categoryName: cat.categoryName,
      categoryCode: cat.categoryCode,
      parentId: cat.parentId,
      icon: cat.icon || 'Tag',
      sortOrder: cat.sortOrder,
      editId: cat.id,
    });
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!form.categoryName.trim() || !form.categoryCode.trim()) {
      showMessage('分类名称和编码不能为空', 'error');
      return;
    }
    setSaving(true);
    try {
      if (form.mode === 'create') {
        const payload: CategoryCreatePayload = {
          categoryName: form.categoryName.trim(),
          categoryCode: form.categoryCode.trim(),
          parentId: form.parentId ?? undefined,
          icon: form.icon,
          sortOrder: form.sortOrder,
        };
        await categoryService.create(payload);
        showMessage('分类创建成功', 'success');
      } else {
        const payload: CategoryUpdatePayload = {
          categoryName: form.categoryName.trim(),
          categoryCode: form.categoryCode.trim(),
          parentId: form.parentId ?? undefined,
          icon: form.icon,
          sortOrder: form.sortOrder,
        };
        await categoryService.update(form.editId!, payload);
        showMessage('分类更新成功', 'success');
      }
      setFormOpen(false);
      await fetchCategories();
    } catch {
      showMessage(form.mode === 'create' ? '创建失败' : '更新失败', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const hasChildren = flatList.some((c) => c.parentId === deleteTarget.id);
    if (hasChildren) {
      showMessage('请先删除子分类', 'error');
      setDeleteTarget(null);
      return;
    }
    setDeleting(true);
    try {
      await categoryService.remove(deleteTarget.id);
      showMessage('分类已删除', 'success');
      setDeleteTarget(null);
      await fetchCategories();
    } catch {
      showMessage('删除失败', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const topLevelCategories: Array<{ id: number; name: string }> = useMemo(
    () => flatList.filter((c) => c.parentId === null).map((c) => ({ id: c.id, name: c.categoryName })),
    [flatList],
  );

  const renderNode = (node: Category, depth: number) => {
    const hasChildren = !!node.children?.length;
    const isExpanded = expanded.has(node.id);
    const Icon = getIcon(node.icon);

    return (
      <div key={node.id}>
        <div
          className={`group flex items-center gap-2 py-2 px-3 rounded-xl transition-colors cursor-pointer ${
            isDark
              ? 'hover:bg-white/5'
              : 'hover:bg-slate-100/80'
          }`}
          style={{ paddingLeft: `${depth * 24 + 12}px` }}
        >
          {hasChildren ? (
            <button
              onClick={() => toggleExpand(node.id)}
              className={`shrink-0 w-5 h-5 flex items-center justify-center rounded transition-colors ${
                isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <ChevronRight
                size={14}
                className={`transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
              />
            </button>
          ) : (
            <span className="w-5" />
          )}

          <span
            className={`shrink-0 w-7 h-7 flex items-center justify-center rounded-lg ${
              isDark ? 'bg-white/10 text-slate-300' : 'bg-slate-100 text-slate-600'
            }`}
          >
            <Icon size={15} />
          </span>

          <span
            className={`font-medium text-sm truncate ${isDark ? 'text-white' : 'text-slate-800'}`}
            onClick={() => hasChildren && toggleExpand(node.id)}
          >
            {node.categoryName}
          </span>

          <span
            className={`text-xs px-1.5 py-0.5 rounded-lg shrink-0 ${
              isDark ? 'bg-white/5 text-slate-400' : 'bg-slate-100 text-slate-500'
            }`}
          >
            {node.categoryCode}
          </span>

          <div className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {node.parentId === null && (
              <button
                onClick={() => openCreate(node.id)}
                title="添加子分类"
                className={`p-1.5 rounded-lg transition-colors ${
                  isDark ? 'text-slate-400 hover:bg-white/10 hover:text-white' : 'text-slate-400 hover:bg-slate-200 hover:text-slate-700'
                }`}
              >
                <Plus size={14} />
              </button>
            )}
            <button
              onClick={() => openEdit(node)}
              title="编辑"
              className={`p-1.5 rounded-lg transition-colors ${
                isDark ? 'text-slate-400 hover:bg-white/10 hover:text-white' : 'text-slate-400 hover:bg-slate-200 hover:text-slate-700'
              }`}
            >
              <Pencil size={14} />
            </button>
            <button
              onClick={() => setDeleteTarget(node)}
              title="删除"
              className={`p-1.5 rounded-lg transition-colors ${
                isDark ? 'text-slate-400 hover:bg-rose-500/20 hover:text-rose-400' : 'text-slate-400 hover:bg-rose-100 hover:text-rose-600'
              }`}
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div>{node.children!.map((child) => renderNode(child, depth + 1))}</div>
        )}
      </div>
    );
  };

  const toolbar = (
    <div className="flex items-center gap-2">
      <button
        onClick={() => openCreate(null)}
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm"
      >
        <Plus size={15} />
        添加顶级分类
      </button>
    </div>
  );

  return (
    <MgmtPageShell
      theme={theme}
      fontSize={fontSize}
      breadcrumbSegments={['系统配置', '分类管理']}
      titleIcon={FolderTree}
      toolbar={toolbar}
    >
      {loading ? (
        <div className="flex-1 flex items-center justify-center min-h-[300px]">
          <Loader2 className="animate-spin text-slate-400" size={24} />
        </div>
      ) : tree.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 py-16">
          <FolderTree size={40} className="text-slate-400" />
          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>暂无分类</p>
        </div>
      ) : (
        <div className="p-4 sm:p-6 space-y-0.5">
          {tree.map((node) => renderNode(node, 0))}
        </div>
      )}

      {/* ── Form Modal ── */}
      <AnimatePresence>
        {formOpen && (
          <div className="fixed inset-0 z-[9000] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
              onClick={() => !saving && setFormOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className={`relative w-full max-w-md rounded-2xl border shadow-2xl p-6 ${
                isDark ? 'bg-[#1C1C1E] border-white/10' : 'bg-white border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className={`text-base font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>
                  {form.mode === 'create' ? '新建分类' : '编辑分类'}
                </h3>
                <button
                  onClick={() => setFormOpen(false)}
                  className={`p-1 rounded-lg transition-colors ${
                    isDark ? 'hover:bg-white/10 text-slate-400' : 'hover:bg-slate-100 text-slate-500'
                  }`}
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    分类名称 <span className="text-rose-500">*</span>
                  </label>
                  <input
                    className={nativeInputClass(theme)}
                    placeholder="例：校园业务"
                    value={form.categoryName}
                    onChange={(e) => setForm((p) => ({ ...p, categoryName: e.target.value }))}
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    分类编码 <span className="text-rose-500">*</span>
                  </label>
                  <input
                    className={nativeInputClass(theme)}
                    placeholder="例：campus-business"
                    value={form.categoryCode}
                    onChange={(e) => setForm((p) => ({ ...p, categoryCode: e.target.value }))}
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    上级分类
                  </label>
                  <select
                    className={nativeSelectClass(theme)}
                    value={form.parentId ?? ''}
                    onChange={(e) => setForm((p) => ({ ...p, parentId: e.target.value ? Number(e.target.value) : null }))}
                  >
                    <option value="">无（顶级分类）</option>
                    {topLevelCategories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    图标
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {ICON_OPTIONS.map((name) => {
                      const Ic = ICON_MAP[name];
                      const selected = form.icon === name;
                      return (
                        <button
                          key={name}
                          type="button"
                          onClick={() => setForm((p) => ({ ...p, icon: name }))}
                          title={name}
                          className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all ${
                            selected
                              ? 'bg-blue-600 text-white shadow-sm'
                              : isDark
                                ? 'bg-white/5 text-slate-400 hover:bg-white/10'
                                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                          }`}
                        >
                          <Ic size={15} />
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    排序号
                  </label>
                  <input
                    type="number"
                    className={nativeInputClass(theme)}
                    value={form.sortOrder}
                    min={0}
                    onChange={(e) => setForm((p) => ({ ...p, sortOrder: Number(e.target.value) || 0 }))}
                  />
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setFormOpen(false)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                    isDark ? 'text-slate-300 hover:bg-white/5' : 'text-slate-600 hover:bg-slate-100'
                  } disabled:opacity-50`}
                >
                  取消
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleSave}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-60"
                >
                  {saving && <Loader2 size={14} className="animate-spin" />}
                  {form.mode === 'create' ? '创建' : '保存'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Confirm Delete ── */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="删除分类"
        message={`确定要删除分类「${deleteTarget?.categoryName}」吗？此操作不可撤销。`}
        confirmText="删除"
        variant="danger"
        loading={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </MgmtPageShell>
  );
};
