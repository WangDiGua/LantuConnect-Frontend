import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Heart, Star, Bot, Wrench, AppWindow, HeartOff, Loader2 } from 'lucide-react';
import { Theme, FontSize } from '../../types';
import { pageBg, cardClass, btnPrimary } from '../../utils/uiClasses';
import { useMessage } from '../../components/common/Message';
import { userActivityService } from '../../api/services/user-activity.service';
import type { FavoriteItem } from '../../types/dto/user-activity';

type TabFilter = 'all' | 'agent' | 'skill' | 'app';

const TYPE_LABEL: Record<string, string> = { agent: 'Agent', skill: 'Skill', app: '应用' };

interface MyFavoritesPageProps {
  theme: Theme;
  fontSize: FontSize;
}

export const MyFavoritesPage: React.FC<MyFavoritesPageProps> = ({ theme }) => {
  const isDark = theme === 'dark';
  const [tab, setTab] = useState<TabFilter>('all');
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { showMessage } = useMessage();

  const fetchData = useCallback(() => {
    setLoading(true);
    userActivityService.getFavorites()
      .then(data => setFavorites(data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = useMemo(() => {
    if (tab === 'all') return favorites;
    return favorites.filter((item) => item.targetType === tab);
  }, [tab, favorites]);

  const tabs: { label: string; value: TabFilter }[] = [
    { label: '全部', value: 'all' },
    { label: 'Agent', value: 'agent' },
    { label: 'Skill', value: 'skill' },
    { label: '应用', value: 'app' },
  ];

  const typeBadge = (type: string) => {
    const styles: Record<string, string> = {
      agent: isDark ? 'bg-blue-500/15 text-blue-400' : 'bg-blue-100 text-blue-700',
      skill: isDark ? 'bg-purple-500/15 text-purple-400' : 'bg-purple-100 text-purple-700',
      app: isDark ? 'bg-amber-500/15 text-amber-400' : 'bg-amber-100 text-amber-700',
    };
    return `inline-flex items-center rounded-lg px-2 py-0.5 text-xs font-semibold ${styles[type] || ''}`;
  };

  const TypeIcon = ({ type }: { type: string }) => {
    switch (type) {
      case 'agent': return <Bot size={14} />;
      case 'skill': return <Wrench size={14} />;
      default: return <AppWindow size={14} />;
    }
  };

  const handleRemoveFavorite = (id: number, name: string) => {
    userActivityService.removeFavorite(id)
      .then(() => {
        showMessage(`已取消收藏「${name}」`, 'info');
        fetchData();
      })
      .catch(err => {
        console.error(err);
        showMessage('取消收藏失败', 'error');
      });
  };

  const handleUse = (name: string) => {
    showMessage(`正在打开「${name}」...`, 'success');
  };

  return (
    <div className={`flex-1 flex flex-col min-h-0 overflow-hidden ${pageBg(theme)}`}>
      <div className="w-full flex-1 min-h-0 flex flex-col px-2 sm:px-3 lg:px-4 py-2 sm:py-3 overflow-y-auto custom-scrollbar">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4 shrink-0">
          <div className={`p-2 rounded-xl ${isDark ? 'bg-white/10' : 'bg-white border border-slate-200/80'}`}>
            <Star size={22} className="text-amber-500" />
          </div>
          <div>
            <h1 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>我的收藏</h1>
            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>管理您收藏的 Agent、Skill 和应用</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4 shrink-0">
          {tabs.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setTab(t.value)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                tab === t.value
                  ? 'bg-blue-600 text-white'
                  : isDark
                    ? 'bg-white/5 text-slate-400 hover:bg-white/10'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Cards Grid */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 size={32} className={`animate-spin ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
            <p className={`mt-3 text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>加载中…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className={`flex-1 flex items-center justify-center ${cardClass(theme)} p-12`}>
            <div className="text-center">
              <HeartOff size={40} className={`mx-auto mb-3 ${isDark ? 'text-slate-600' : 'text-slate-300'}`} />
              <p className={`text-sm ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>暂无收藏项</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {filtered.map((item) => (
              <div key={item.id} className={`${cardClass(theme)} p-4 flex flex-col gap-3 group`}>
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 ${
                    isDark ? 'bg-white/10' : 'bg-slate-100'
                  }`}>
                    {item.icon || '📦'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-sm font-semibold truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        {item.displayName}
                      </span>
                      <span className={typeBadge(item.targetType)}>
                        <TypeIcon type={item.targetType} />
                        <span className="ml-1">{TYPE_LABEL[item.targetType] ?? item.targetType}</span>
                      </span>
                    </div>
                    <p className={`text-xs leading-relaxed line-clamp-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      {item.description}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-auto pt-1">
                  <button
                    type="button"
                    onClick={() => handleUse(item.displayName)}
                    className={`flex-1 ${btnPrimary} !py-1.5 text-center`}
                  >
                    使用
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveFavorite(item.id, item.displayName)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
                      isDark
                        ? 'border-white/10 text-slate-400 hover:text-red-400 hover:border-red-500/30'
                        : 'border-slate-200 text-slate-500 hover:text-red-500 hover:border-red-300'
                    }`}
                  >
                    <Heart size={14} className="inline mr-1 fill-current" />
                    取消收藏
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
