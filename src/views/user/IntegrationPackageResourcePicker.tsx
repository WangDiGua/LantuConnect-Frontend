import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Search, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Theme } from '../../types';
import type { IntegrationPackageItemDTO } from '../../types/dto/integration-package';
import type { ResourceCatalogItemVO, ResourceType } from '../../types/dto/catalog';
import { resourceCatalogService } from '../../api/services/resource-catalog.service';
import { btnPrimary, btnSecondary, textMuted, textPrimary, textSecondary } from '../../utils/uiClasses';
import { nativeInputClass } from '../../utils/formFieldClasses';

const TYPE_OPTIONS: { value: ResourceType | ''; label: string }[] = [
  { value: '', label: '全部类型' },
  { value: 'agent', label: 'Agent' },
  { value: 'skill', label: 'Skill' },
  { value: 'mcp', label: 'MCP' },
  { value: 'app', label: '应用' },
  { value: 'dataset', label: '数据集' },
];

export type SelectedPackageResource = {
  item: IntegrationPackageItemDTO;
  label: string;
};

function itemKey(it: IntegrationPackageItemDTO): string {
  return `${it.resourceType.toLowerCase()}:${it.resourceId}`;
}

interface Props {
  theme: Theme;
  value: SelectedPackageResource[];
  onChange: (next: SelectedPackageResource[]) => void;
  active: boolean;
}

export const IntegrationPackageResourcePicker: React.FC<Props> = ({ theme, value, onChange, active }) => {
  const isDark = theme === 'dark';
  const [filterType, setFilterType] = useState<ResourceType | ''>('');
  const [keyword, setKeyword] = useState('');
  const [draftKeyword, setDraftKeyword] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [rows, setRows] = useState<ResourceCatalogItemVO[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const selectedKeys = useMemo(() => new Set(value.map((v) => itemKey(v.item))), [value]);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    void (async () => {
      try {
        const res = await resourceCatalogService.list({
          status: 'published',
          page,
          pageSize,
          resourceType: filterType || undefined,
          keyword: keyword.trim() || undefined,
          sortBy: 'publishedAt',
          sortOrder: 'desc',
        });
        if (cancelled) return;
        setRows(res.list);
        setTotal(res.total);
      } catch (e) {
        if (cancelled) return;
        setLoadError(e instanceof Error ? e.message : '加载目录失败');
        setRows([]);
        setTotal(0);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [active, page, filterType, keyword]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const addRow = (row: ResourceCatalogItemVO) => {
    const id = Number(row.resourceId);
    if (!Number.isFinite(id)) return;
    const rt = row.resourceType.trim().toLowerCase();
    const item: IntegrationPackageItemDTO = { resourceType: rt, resourceId: id };
    const key = itemKey(item);
    if (selectedKeys.has(key)) return;
    const label = `${row.displayName}（${rt} #${row.resourceId}）`;
    onChange([...value, { item, label }]);
  };

  const removeAt = (idx: number) => {
    onChange(value.filter((_, i) => i !== idx));
  };

  const applySearch = () => {
    setKeyword(draftKeyword);
    setPage(1);
  };

  return (
    <div className="space-y-3">
      <div>
        <div className={`text-xs font-medium ${textSecondary(theme)}`}>已选资源</div>
        {value.length === 0 ? (
          <p className={`mt-1 text-xs ${textMuted(theme)}`}>请从下方目录添加至少一条已上线资源。</p>
        ) : (
          <ul className="mt-2 flex flex-wrap gap-2">
            {value.map((v, idx) => (
              <li
                key={itemKey(v.item)}
                className={`inline-flex max-w-full items-center gap-1 rounded-lg border px-2 py-1 text-xs ${
                  isDark ? 'border-white/15 bg-white/[0.06]' : 'border-slate-200 bg-slate-50'
                }`}
              >
                <span className={`min-w-0 truncate ${textPrimary(theme)}`} title={v.label}>
                  {v.label}
                </span>
                <button
                  type="button"
                  className={`shrink-0 rounded p-0.5 ${isDark ? 'hover:bg-white/10' : 'hover:bg-slate-200'}`}
                  onClick={() => removeAt(idx)}
                  aria-label={`移除 ${v.label}`}
                >
                  <Trash2 size={12} aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className={`rounded-xl border p-3 ${isDark ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-white'}`}>
        <p className={`text-xs font-medium ${textSecondary(theme)}`}>从平台目录选择（仅已上线 published）</p>
        <div className="mt-2 flex flex-wrap items-end gap-2">
          <div className="min-w-[8rem] flex-1">
            <label className={`block text-[11px] ${textMuted(theme)}`}>类型</label>
            <select
              className={`mt-0.5 w-full ${nativeInputClass(theme)} text-sm`}
              value={filterType}
              onChange={(e) => {
                setFilterType(e.target.value as ResourceType | '');
                setPage(1);
              }}
            >
              {TYPE_OPTIONS.map((o) => (
                <option key={o.label} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-[10rem] flex-[2]">
            <label className={`block text-[11px] ${textMuted(theme)}`}>关键字</label>
            <input
              className={`mt-0.5 w-full ${nativeInputClass(theme)} text-sm`}
              value={draftKeyword}
              onChange={(e) => setDraftKeyword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  applySearch();
                }
              }}
              placeholder="名称 / 编码 / 描述"
            />
          </div>
          <button type="button" className={`${btnSecondary(theme)} inline-flex items-center gap-1`} onClick={applySearch}>
            <Search size={14} aria-hidden />
            搜索
          </button>
        </div>

        {loadError ? <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">{loadError}</p> : null}

        <div className="mt-3 max-h-52 overflow-y-auto rounded-lg border border-dashed border-slate-300/80 dark:border-white/15">
          {loading ? (
            <p className={`px-3 py-6 text-center text-xs ${textMuted(theme)}`}>加载中…</p>
          ) : rows.length === 0 ? (
            <p className={`px-3 py-6 text-center text-xs ${textMuted(theme)}`}>无匹配资源，请调整类型或关键字。</p>
          ) : (
            <ul className="divide-y divide-slate-200/80 dark:divide-white/10">
              {rows.map((row) => {
                const idNum = Number(row.resourceId);
                const key = itemKey({ resourceType: row.resourceType, resourceId: idNum });
                const taken = selectedKeys.has(key);
                return (
                  <li key={`${row.resourceType}-${row.resourceId}`} className="flex items-start gap-2 px-2 py-2 text-xs">
                    <div className="min-w-0 flex-1">
                      <div className={`font-medium ${textPrimary(theme)}`}>{row.displayName}</div>
                      <div className={`${textMuted(theme)}`}>
                        {row.resourceType} · #{row.resourceId}
                        {row.resourceCode ? ` · ${row.resourceCode}` : ''}
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={taken}
                      className={`shrink-0 rounded-lg px-2 py-1 text-xs font-medium ${
                        taken
                          ? isDark
                            ? 'cursor-not-allowed text-slate-500'
                            : 'cursor-not-allowed text-slate-400'
                          : `${btnPrimary} !py-1`
                      }`}
                      onClick={() => addRow(row)}
                    >
                      {taken ? (
                        '已添加'
                      ) : (
                        <>
                          <Plus size={12} className="inline mr-0.5" aria-hidden />
                          添加
                        </>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {total > pageSize ? (
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className={textMuted(theme)}>
              共 {total} 条，第 {page} / {totalPages} 页
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                className={`${btnSecondary(theme)} !px-2`}
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft size={14} aria-hidden />
              </button>
              <button
                type="button"
                className={`${btnSecondary(theme)} !px-2`}
                disabled={page >= totalPages || loading}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight size={14} aria-hidden />
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};
