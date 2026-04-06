import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Heart, Star, Bot, Wrench, AppWindow, HeartOff, Database, Blocks } from 'lucide-react';
import type { Theme, FontSize } from '../../types';
import { useMessage } from '../../components/common/Message';
import { userActivityService } from '../../api/services/user-activity.service';
import type { FavoriteItem } from '../../types/dto/user-activity';
import { BentoCard } from '../../components/common/BentoCard';
import { PageError } from '../../components/common/PageError';
import { PageSkeleton } from '../../components/common/PageSkeleton';
import { AnimatedList } from '../../components/common/AnimatedList';
import {
  btnPrimary, btnSecondary, textPrimary, textSecondary, textMuted,
} from '../../utils/uiClasses';
import { formatDateTime } from '../../utils/formatDateTime';
import { MgmtPageShell } from '../userMgmt/MgmtPageShell';

type TabFilter = 'all' | 'agent' | 'skill' | 'app' | 'mcp' | 'dataset';
const TYPE_LABEL: Record<string, string> = { agent: 'Agent', skill: 'Skill', app: '应用', mcp: 'MCP', dataset: '数据集' };
const PAGE_DESC = '管理您收藏的 Agent、Skill、MCP、数据集和应用';

interface MyFavoritesPageProps {
  theme: Theme;
  fontSize: FontSize;
}

export const MyFavoritesPage: React.FC<MyFavoritesPageProps> = ({ theme, fontSize }) => {
  const isDark = theme === 'dark';
  const [tab, setTab] = useState<TabFilter>('all');
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<Error | null>(null);
  const { showMessage } = useMessage();

  const fetchData = useCallback(() => {
    setLoadError(null);
    setLoading(true);
    userActivityService.getFavorites()
      .then(data => setFavorites(data))
      .catch(err => setLoadError(err instanceof Error ? err : new Error('加载收藏列表失败')))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = useMemo(() => tab === 'all' ? favorites : favorites.filter((item) => item.targetType === tab), [tab, favorites]);

  const typeBadge = (type: string) => {
    const styles: Record<string, string> = {
      agent: isDark ? 'bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/20' : 'bg-blue-50 text-blue-700 ring-1 ring-blue-200/60',
      skill: isDark ? 'bg-neutral-900/10 text-neutral-300 ring-1 ring-neutral-900/20' : 'bg-neutral-100 text-neutral-800 ring-1 ring-neutral-200/60',
      app:   isDark ? 'bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20' : 'bg-amber-50 text-amber-700 ring-1 ring-amber-200/60',
      mcp: isDark ? 'bg-violet-500/10 text-violet-300 ring-1 ring-violet-500/20' : 'bg-violet-50 text-violet-700 ring-1 ring-violet-200/70',
      dataset: isDark ? 'bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/20' : 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/70',
    };
    return `inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${styles[type] || ''}`;
  };

  const TypeIcon = ({ type }: { type: string }) => {
    switch (type) {
      case 'agent': return <Bot size={12} aria-hidden />;
      case 'skill': return <Wrench size={12} aria-hidden />;
      case 'mcp': return <Blocks size={12} aria-hidden />;
      case 'dataset': return <Database size={12} aria-hidden />;
      default: return <AppWindow size={12} aria-hidden />;
    }
  };

  const handleRemoveFavorite = (id: number, name: string) => {
    userActivityService.removeFavorite(id)
      .then(() => { showMessage(`已取消收藏「${name}」`, 'info'); fetchData(); })
      .catch(() => showMessage('取消收藏失败', 'error'));
  };

  const handleUse = (name: string) => showMessage(`正在打开「${name}」...`, 'success');

  const tabCls = (active: boolean) => `px-4 py-2 rounded-xl text-sm font-semibold transition-colors motion-reduce:transition-none active:scale-[0.97] ${
    active
      ? 'bg-neutral-900 text-white shadow-sm'
      : isDark ? 'bg-white/5 text-slate-400 hover:bg-white/10' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
  }`;

  const toolbar = (
    <BentoCard theme={theme} padding="sm">
      <div className="flex flex-wrap gap-2">
        {([
          { label: '全部', value: 'all' as TabFilter },
          { label: 'Agent', value: 'agent' as TabFilter },
          { label: 'Skill', value: 'skill' as TabFilter },
          { label: '应用', value: 'app' as TabFilter },
          { label: 'MCP', value: 'mcp' as TabFilter },
          { label: '数据集', value: 'dataset' as TabFilter },
        ]).map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setTab(t.value)}
            className={tabCls(tab === t.value)}
            aria-pressed={tab === t.value}
            aria-label={`按类型筛选：${t.label}`}
          >
            {t.label}
          </button>
        ))}
      </div>
    </BentoCard>
  );

  return (
    <MgmtPageShell
      theme={theme}
      fontSize={fontSize}
      titleIcon={Star}
      breadcrumbSegments={['工作台', '我的收藏'] as const}
      description={PAGE_DESC}
      toolbar={toolbar}
      contentScroll="document"
    >
      <div className="px-4 sm:px-6 pb-8">
        {loading ? (
          <PageSkeleton type="cards" />
        ) : loadError ? (
          <PageError error={loadError} onRetry={fetchData} retryLabel="重试加载收藏" />
        ) : filtered.length === 0 ? (
          <BentoCard theme={theme} className="flex items-center justify-center p-12">
            <div className="text-center">
              <HeartOff size={40} className={`mx-auto mb-3 ${textMuted(theme)}`} aria-hidden />
              <p className={`text-sm ${textMuted(theme)}`}>暂无收藏项</p>
            </div>
          </BentoCard>
        ) : (
          <AnimatedList className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {filtered.map((item) => (
              <BentoCard key={item.id} theme={theme} hover glow="indigo" padding="sm" className="flex flex-col gap-3 p-4">
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 ${isDark ? 'bg-white/[0.04]' : 'bg-slate-50'}`} aria-hidden>
                    {item.icon || '📦'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`text-sm font-semibold truncate ${textPrimary(theme)}`} title={item.displayName}>{item.displayName}</span>
                      <span className={typeBadge(item.targetType)}>
                        <TypeIcon type={item.targetType} />
                        {TYPE_LABEL[item.targetType] ?? item.targetType}
                      </span>
                    </div>
                    <p className={`text-xs leading-relaxed line-clamp-2 ${textMuted(theme)}`}>{item.description}</p>
                    {item.createTime && <p className={`text-xs mt-0.5 ${textMuted(theme)}`}>收藏于 {formatDateTime(item.createTime)}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-auto pt-1">
                  <button type="button" onClick={() => handleUse(item.displayName)} className={`flex-1 ${btnPrimary} !py-1.5 text-center`} aria-label={`使用 ${item.displayName}`}>使用</button>
                  <button
                    type="button"
                    onClick={() => handleRemoveFavorite(item.id, item.displayName)}
                    className={`${btnSecondary(theme)} !py-1.5`}
                    aria-label={`取消收藏 ${item.displayName}`}
                  >
                    <Heart size={14} className="fill-current" aria-hidden />
                  </button>
                </div>
              </BentoCard>
            ))}
          </AnimatedList>
        )}
      </div>
    </MgmtPageShell>
  );
};
