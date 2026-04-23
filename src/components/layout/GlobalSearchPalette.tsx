import React, { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowUpRight,
  Clock3,
  Command,
  FileSearch,
  Loader2,
  Navigation,
  Search,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
import type { Theme } from '../../types';
import type { ConsoleRole } from '../../constants/consoleRoutes';
import { buildPath, getDefaultPage, subItemToPage } from '../../constants/consoleRoutes';
import type { ConsoleSidebarRow } from '../../constants/consoleNavModel';
import { globalSearchService } from '../../api/services/global-search.service';
import type { GlobalSearchGroup, GlobalSearchGroupKey, GlobalSearchItem } from '../../types/dto/global-search';

type IconComponent = React.ComponentType<{
  size?: number;
  strokeWidth?: number;
  className?: string;
}>;

interface SubGroup {
  title: string;
  items: Array<{ id: string; label: string; icon: IconComponent; tag?: string }>;
}

interface PaletteItem extends GlobalSearchItem {
  onSelect?: () => void;
}

interface PaletteGroup {
  key: GlobalSearchGroupKey;
  title: string;
  items: PaletteItem[];
}

export interface GlobalSearchPaletteProps {
  open: boolean;
  theme: Theme;
  sidebarSearchRows: ConsoleSidebarRow[];
  filteredSubGroupsForSidebarId: (id: string, domain: ConsoleRole) => SubGroup[];
  onSidebarClick: (id: string, domain: ConsoleRole) => void;
  onSubItemClick: (subItemId: string, parentSidebarId: string, domain: ConsoleRole) => void;
  onClose: () => void;
}

const RECENT_KEY = 'lantu.globalSearch.recent.v1';
const MAX_RECENT = 8;

const GROUP_ORDER: GlobalSearchGroupKey[] = [
  'recent',
  'resources',
  'trending',
  'navigation',
  'my_resources',
  'admin_tasks',
];

function normalizeText(value: string | undefined): string {
  return (value ?? '').trim().toLowerCase();
}

function readRecent(): GlobalSearchItem[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((row): GlobalSearchItem | null => {
        if (!row || typeof row !== 'object') return null;
        const x = row as Partial<GlobalSearchItem>;
        if (!x.id || !x.title || !x.path) return null;
        return {
          id: String(x.id),
          kind: x.kind ?? 'navigation',
          title: String(x.title),
          subtitle: x.subtitle ? String(x.subtitle) : undefined,
          description: x.description ? String(x.description) : undefined,
          badge: x.badge ? String(x.badge) : undefined,
          resourceType: x.resourceType,
          resourceId: x.resourceId ? String(x.resourceId) : undefined,
          path: String(x.path),
          score: typeof x.score === 'number' ? x.score : undefined,
        };
      })
      .filter((item): item is GlobalSearchItem => !!item)
      .slice(0, MAX_RECENT);
  } catch {
    return [];
  }
}

function saveRecent(item: GlobalSearchItem): void {
  const clean: GlobalSearchItem = {
    id: item.id,
    kind: item.kind,
    title: item.title,
    subtitle: item.subtitle,
    description: item.description,
    badge: item.badge,
    resourceType: item.resourceType,
    resourceId: item.resourceId,
    path: item.path,
    score: item.score,
  };
  const next = [clean, ...readRecent().filter((old) => old.id !== clean.id && old.path !== clean.path)].slice(0, MAX_RECENT);
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    // 搜索历史只是体验增强，存储失败不能阻断跳转。
  }
}

function scoreItem(item: PaletteItem, query: string): number {
  if (!query) return 30;
  const title = normalizeText(item.title);
  const haystack = normalizeText(`${item.title} ${item.subtitle ?? ''} ${item.description ?? ''} ${item.badge ?? ''}`);
  if (title === query) return 100;
  if (title.startsWith(query)) return 80;
  if (haystack.includes(query)) return 55;
  return 0;
}

function groupIcon(key: GlobalSearchGroupKey) {
  switch (key) {
    case 'recent':
      return Clock3;
    case 'resources':
    case 'trending':
      return Sparkles;
    case 'admin_tasks':
      return ShieldCheck;
    case 'my_resources':
      return FileSearch;
    case 'navigation':
    default:
      return Navigation;
  }
}

function itemKindLabel(kind: GlobalSearchItem['kind']): string {
  switch (kind) {
    case 'resource':
      return '资源';
    case 'my_resource':
      return '我的';
    case 'audit':
      return '审核';
    case 'developer_application':
      return '申请';
    case 'navigation':
    default:
      return '入口';
  }
}

function buildNavigationCandidates(
  rows: ConsoleSidebarRow[],
  filteredSubGroupsForSidebarId: GlobalSearchPaletteProps['filteredSubGroupsForSidebarId'],
  onSidebarClick: GlobalSearchPaletteProps['onSidebarClick'],
  onSubItemClick: GlobalSearchPaletteProps['onSubItemClick'],
): PaletteItem[] {
  const out: PaletteItem[] = [];
  for (const row of rows) {
    if (row.kind !== 'item') continue;
    const subGroups = filteredSubGroupsForSidebarId(row.id, row.domain);
    const children = subGroups.flatMap((group) => group.items.map((child) => ({ ...child, groupTitle: group.title })));
    if (!children.length) {
      const page = getDefaultPage(row.domain, row.id);
      out.push({
        id: `navigation:${row.domain}:${row.id}`,
        kind: 'navigation',
        title: row.label,
        subtitle: row.domain === 'admin' ? '管理入口' : '功能入口',
        description: page,
        path: buildPath(row.domain, page),
        onSelect: () => onSidebarClick(row.id, row.domain),
      });
      continue;
    }
    for (const child of children) {
      const page = subItemToPage(row.id, child.id, row.domain === 'admin');
      out.push({
        id: `navigation:${row.domain}:${row.id}:${child.id}`,
        kind: 'navigation',
        title: child.label,
        subtitle: `${row.label}${child.groupTitle ? ` · ${child.groupTitle}` : ''}`,
        description: child.tag,
        badge: row.domain === 'admin' ? '管理' : undefined,
        path: buildPath(row.domain, page),
        onSelect: () => onSubItemClick(child.id, row.id, row.domain),
      });
    }
  }
  return out;
}

function mergeServerGroups(serverGroups: GlobalSearchGroup[], navigationGroup: PaletteGroup | null, recentGroup: PaletteGroup | null): PaletteGroup[] {
  const byKey = new Map<GlobalSearchGroupKey, PaletteGroup>();
  for (const group of serverGroups) {
    byKey.set(group.key, {
      key: group.key,
      title: group.title,
      items: group.items,
    });
  }
  if (navigationGroup) byKey.set('navigation', navigationGroup);
  if (recentGroup) byKey.set('recent', recentGroup);
  const ordered: PaletteGroup[] = [];
  for (const key of GROUP_ORDER) {
    const group = byKey.get(key);
    if (group?.items.length) ordered.push(group);
    byKey.delete(key);
  }
  for (const group of byKey.values()) {
    if (group.items.length) ordered.push(group);
  }
  return ordered;
}

export const GlobalSearchPalette: React.FC<GlobalSearchPaletteProps> = ({
  open,
  theme,
  sidebarSearchRows,
  filteredSubGroupsForSidebarId,
  onSidebarClick,
  onSubItemClick,
  onClose,
}) => {
  const isDark = theme === 'dark';
  const navigate = useNavigate();
  const scrollAreaRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [serverGroups, setServerGroups] = useState<GlobalSearchGroup[]>([]);
  const [recentItems, setRecentItems] = useState<GlobalSearchItem[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const deferredQuery = useDeferredValue(query.trim());

  useEffect(() => {
    if (!open) return;
    const scrollY = window.scrollY;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    const previous = {
      htmlOverflow: document.documentElement.style.overflow,
      htmlOverscrollBehavior: document.documentElement.style.overscrollBehavior,
      overflow: document.body.style.overflow,
      overscrollBehavior: document.body.style.overscrollBehavior,
      position: document.body.style.position,
      top: document.body.style.top,
      width: document.body.style.width,
      paddingRight: document.body.style.paddingRight,
    };

    document.documentElement.style.overflow = 'hidden';
    document.documentElement.style.overscrollBehavior = 'none';
    document.body.style.overflow = 'hidden';
    document.body.style.overscrollBehavior = 'none';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    const canScrollInside = (event: WheelEvent) => {
      const area = scrollAreaRef.current;
      if (!area || !(event.target instanceof Node) || !area.contains(event.target)) {
        return false;
      }
      const { scrollTop, scrollHeight, clientHeight } = area;
      if (scrollHeight <= clientHeight) return false;
      if (event.deltaY < 0) return scrollTop > 0;
      if (event.deltaY > 0) return scrollTop + clientHeight < scrollHeight - 1;
      return true;
    };

    const blockWheel = (event: WheelEvent) => {
      if (!canScrollInside(event)) {
        event.preventDefault();
      }
      event.stopPropagation();
    };

    const blockTouchMove = (event: TouchEvent) => {
      const area = scrollAreaRef.current;
      if (!area || !(event.target instanceof Node) || !area.contains(event.target)) {
        event.preventDefault();
      }
      event.stopPropagation();
    };

    document.addEventListener('wheel', blockWheel, { capture: true, passive: false });
    document.addEventListener('touchmove', blockTouchMove, { capture: true, passive: false });

    return () => {
      document.removeEventListener('wheel', blockWheel, { capture: true });
      document.removeEventListener('touchmove', blockTouchMove, { capture: true });
      document.documentElement.style.overflow = previous.htmlOverflow;
      document.documentElement.style.overscrollBehavior = previous.htmlOverscrollBehavior;
      document.body.style.overflow = previous.overflow;
      document.body.style.overscrollBehavior = previous.overscrollBehavior;
      document.body.style.position = previous.position;
      document.body.style.top = previous.top;
      document.body.style.width = previous.width;
      document.body.style.paddingRight = previous.paddingRight;
      window.scrollTo(0, scrollY);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setRecentItems(readRecent());
    const timer = window.setTimeout(() => inputRef.current?.focus(), 40);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [open, query]);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    setLoading(true);
    setError(false);
    globalSearchService
      .search({ q: debouncedQuery, scope: 'all', limitPerGroup: 6 })
      .then((res) => {
        if (!alive) return;
        setServerGroups(res.groups);
      })
      .catch(() => {
        if (!alive) return;
        setServerGroups([]);
        setError(true);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [debouncedQuery, open]);

  const navigationCandidates = useMemo(
    () => buildNavigationCandidates(sidebarSearchRows, filteredSubGroupsForSidebarId, onSidebarClick, onSubItemClick),
    [filteredSubGroupsForSidebarId, onSidebarClick, onSubItemClick, sidebarSearchRows],
  );

  const navigationItems = useMemo(() => {
    const q = normalizeText(deferredQuery);
    return navigationCandidates
      .map((item) => ({ item, score: scoreItem(item, q) }))
      .filter((row) => (q ? row.score > 0 : true))
      .sort((a, b) => b.score - a.score)
      .slice(0, q ? 7 : 5)
      .map((row) => row.item);
  }, [deferredQuery, navigationCandidates]);

  const displayGroups = useMemo(() => {
    const q = normalizeText(deferredQuery);
    const navigationGroup: PaletteGroup | null = navigationItems.length
      ? { key: 'navigation', title: q ? '功能入口' : '常用入口', items: navigationItems }
      : null;
    const recentGroup: PaletteGroup | null =
      !q && recentItems.length ? { key: 'recent', title: '最近访问', items: recentItems } : null;
    return mergeServerGroups(serverGroups, navigationGroup, recentGroup);
  }, [deferredQuery, navigationItems, recentItems, serverGroups]);

  const flatItems = useMemo(() => displayGroups.flatMap((group) => group.items), [displayGroups]);

  useEffect(() => {
    setActiveIndex(0);
  }, [deferredQuery, displayGroups.length]);

  useEffect(() => {
    if (!flatItems.length) {
      setActiveIndex(0);
      return;
    }
    setActiveIndex((idx) => Math.min(Math.max(idx, 0), flatItems.length - 1));
  }, [flatItems.length]);

  const handleClose = () => {
    setQuery('');
    setDebouncedQuery('');
    setServerGroups([]);
    setError(false);
    setLoading(false);
    onClose();
  };

  const selectItem = (item: PaletteItem) => {
    saveRecent(item);
    setRecentItems(readRecent());
    handleClose();
    if (item.onSelect) {
      item.onSelect();
      return;
    }
    navigate(item.path);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if ((event.nativeEvent as KeyboardEvent).isComposing) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      handleClose();
      return;
    }
    if (!flatItems.length) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((idx) => (idx + 1) % flatItems.length);
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((idx) => (idx - 1 + flatItems.length) % flatItems.length);
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      const item = flatItems[activeIndex] ?? flatItems[0];
      if (item) selectItem(item);
    }
  };

  const panelClasses = isDark
    ? 'border-white/[0.12] bg-[#08111f] text-slate-100 shadow-[0_34px_100px_rgba(0,0,0,0.78)] ring-1 ring-white/[0.04]'
    : 'border-slate-200 bg-white text-slate-950 shadow-[0_34px_100px_rgba(2,6,23,0.34)] ring-1 ring-white';
  const inputClasses = isDark
    ? 'bg-white/[0.07] text-slate-50 placeholder:text-slate-500'
    : 'bg-white text-slate-950 placeholder:text-slate-400 shadow-[inset_0_0_0_1px_rgba(15,23,42,0.08)]';
  const muted = isDark ? 'text-slate-400' : 'text-slate-500';

  const palette = (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[2147483000] h-[100dvh] w-screen overscroll-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onKeyDown={handleKeyDown}
        >
          <button
            type="button"
            aria-label="关闭全局搜索"
            className="absolute inset-0 cursor-default bg-slate-950/34"
            onClick={handleClose}
          />
          <motion.section
            role="dialog"
            aria-modal="true"
            aria-label="全局搜索"
            className={`absolute left-1/2 top-20 isolate flex max-h-[min(720px,calc(100vh-7rem))] w-[min(760px,calc(100vw-2rem))] -translate-x-1/2 flex-col overflow-hidden rounded-[28px] border max-sm:bottom-0 max-sm:top-auto max-sm:max-h-[88vh] max-sm:w-full max-sm:translate-x-[-50%] max-sm:rounded-b-none ${panelClasses}`}
            initial={{ opacity: 0, y: -14, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
          >
            <div className="border-b border-black/5 p-4 dark:border-white/10">
              <div className={`flex h-14 items-center gap-3 rounded-2xl px-4 ${inputClasses}`}>
                <Search size={19} className={muted} aria-hidden />
                <input
                  ref={inputRef}
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="搜索资源、菜单、审核、API Key、监控入口..."
                  className="h-full min-w-0 flex-1 border-0 bg-transparent text-base font-semibold outline-none"
                  aria-label="全局搜索输入框"
                />
                {loading ? <Loader2 size={17} className="animate-spin text-blue-500" aria-hidden /> : null}
                <kbd className={`hidden rounded-lg px-2 py-1 text-xs font-bold sm:inline-flex ${isDark ? 'bg-white/10 text-slate-300' : 'bg-white text-slate-500 shadow-sm'}`}>
                  Esc
                </kbd>
                <button
                  type="button"
                  className={`rounded-xl p-2 transition-colors ${isDark ? 'hover:bg-white/10' : 'hover:bg-slate-200/80'}`}
                  onClick={handleClose}
                  aria-label="关闭"
                >
                  <X size={17} aria-hidden />
                </button>
              </div>
              <div className={`mt-3 flex flex-wrap items-center gap-2 text-xs ${muted}`}>
                <span className="inline-flex items-center gap-1.5">
                  <Command size={13} aria-hidden /> Ctrl / ⌘ K 打开
                </span>
                <span>↑↓ 选择</span>
                <span>Enter 跳转</span>
                {error ? <span className="text-amber-500">后端搜索暂不可用，已保留本地入口</span> : null}
              </div>
            </div>

            <div ref={scrollAreaRef} className="min-h-[260px] flex-1 overflow-y-auto overscroll-contain px-3 py-3">
              {displayGroups.length ? (
                displayGroups.map((group) => {
                  const Icon = groupIcon(group.key);
                  return (
                    <section key={group.key} className="mb-4 last:mb-1">
                      <div className={`mb-2 flex items-center gap-2 px-2 text-xs font-black uppercase tracking-[0.16em] ${muted}`}>
                        <Icon size={14} aria-hidden />
                        <span>{group.title}</span>
                      </div>
                      <div className="space-y-1.5">
                        {group.items.map((item) => {
                          const index = flatItems.findIndex((flat) => flat.id === item.id);
                          const active = index === activeIndex;
                          return (
                            <button
                              key={`${group.key}:${item.id}`}
                              type="button"
                              className={[
                                'group flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition-all duration-150',
                                active
                                  ? isDark
                                    ? 'bg-blue-500/18 shadow-[inset_0_0_0_1px_rgba(96,165,250,0.3)]'
                                    : 'bg-blue-50 shadow-[inset_0_0_0_1px_rgba(37,99,235,0.13)]'
                                  : isDark
                                    ? 'hover:bg-white/[0.06]'
                                    : 'hover:bg-slate-50',
                              ].join(' ')}
                              onMouseEnter={() => setActiveIndex(Math.max(index, 0))}
                              onClick={() => selectItem(item)}
                            >
                              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${active ? 'bg-blue-600 text-white' : isDark ? 'bg-white/[0.08] text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                                {item.kind === 'navigation' ? <Navigation size={18} aria-hidden /> : <FileSearch size={18} aria-hidden />}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="flex min-w-0 items-center gap-2">
                                  <span className="truncate text-sm font-black">{item.title}</span>
                                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${isDark ? 'bg-white/10 text-slate-300' : 'bg-slate-100 text-slate-500'}`}>
                                    {item.badge || itemKindLabel(item.kind)}
                                  </span>
                                </span>
                                <span className={`mt-1 block truncate text-xs font-medium ${muted}`}>
                                  {item.subtitle || item.description || item.path}
                                </span>
                              </span>
                              <ArrowUpRight
                                size={17}
                                className={`shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 ${muted}`}
                                aria-hidden
                              />
                            </button>
                          );
                        })}
                      </div>
                    </section>
                  );
                })
              ) : (
                <div className={`flex h-[260px] flex-col items-center justify-center rounded-3xl border border-dashed px-8 text-center ${isDark ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-slate-50/80'}`}>
                  <Search size={28} className={muted} aria-hidden />
                  <p className="mt-4 text-base font-black">没有找到可用结果</p>
                  <p className={`mt-1 text-sm ${muted}`}>换一个关键词，或直接输入资源 code、菜单名、审核、监控等入口。</p>
                </div>
              )}
            </div>
          </motion.section>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );

  return createPortal(palette, document.body);
};
