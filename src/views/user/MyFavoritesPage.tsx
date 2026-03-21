import React, { useState, useMemo } from 'react';
import { Heart, Star, Bot, Wrench, AppWindow, HeartOff } from 'lucide-react';
import { Theme, FontSize } from '../../types';
import { pageBg, cardClass, btnPrimary } from '../../utils/uiClasses';
import { useMessage } from '../../components/common/Message';

type TabFilter = 'all' | 'Agent' | 'Skill' | '应用';

interface FavoriteItem {
  id: number;
  name: string;
  type: 'Agent' | 'Skill' | '应用';
  description: string;
  icon: string;
}

const INITIAL_FAVORITES: FavoriteItem[] = [
  { id: 1, name: '选课助手', type: 'Agent', description: '智能推荐选课方案，分析课程评价和时间冲突', icon: '🎓' },
  { id: 2, name: '文献翻译', type: 'Skill', description: '支持多语种学术文献翻译，保留专业术语', icon: '📝' },
  { id: 3, name: '校园导览', type: '应用', description: '校园3D地图导览与建筑信息查询', icon: '🗺️' },
  { id: 4, name: '图书馆检索', type: 'Agent', description: '智能检索图书馆藏书和电子资源', icon: '📚' },
  { id: 5, name: 'PDF摘要提取', type: 'Skill', description: '自动提取PDF文档关键信息和摘要', icon: '📄' },
  { id: 6, name: '成绩查询', type: 'Agent', description: '查询历史成绩、绩点计算和成绩分析', icon: '📊' },
  { id: 7, name: '课表生成器', type: '应用', description: '自动生成个性化课表并同步日历', icon: '📅' },
  { id: 8, name: '论文格式检查', type: 'Skill', description: '检查论文格式规范，支持多种期刊模板', icon: '✅' },
];

interface MyFavoritesPageProps {
  theme: Theme;
  fontSize: FontSize;
}

export const MyFavoritesPage: React.FC<MyFavoritesPageProps> = ({ theme }) => {
  const isDark = theme === 'dark';
  const [tab, setTab] = useState<TabFilter>('all');
  const [favorites, setFavorites] = useState(INITIAL_FAVORITES);
  const { showMessage } = useMessage();

  const filtered = useMemo(() => {
    if (tab === 'all') return favorites;
    return favorites.filter((item) => item.type === tab);
  }, [tab, favorites]);

  const tabs: { label: string; value: TabFilter }[] = [
    { label: '全部', value: 'all' },
    { label: 'Agent', value: 'Agent' },
    { label: 'Skill', value: 'Skill' },
    { label: '应用', value: '应用' },
  ];

  const typeBadge = (type: string) => {
    const styles: Record<string, string> = {
      Agent: isDark ? 'bg-blue-500/15 text-blue-400' : 'bg-blue-100 text-blue-700',
      Skill: isDark ? 'bg-purple-500/15 text-purple-400' : 'bg-purple-100 text-purple-700',
      '应用': isDark ? 'bg-amber-500/15 text-amber-400' : 'bg-amber-100 text-amber-700',
    };
    return `inline-flex items-center rounded-lg px-2 py-0.5 text-xs font-semibold ${styles[type] || ''}`;
  };

  const TypeIcon = ({ type }: { type: string }) => {
    switch (type) {
      case 'Agent': return <Bot size={14} />;
      case 'Skill': return <Wrench size={14} />;
      default: return <AppWindow size={14} />;
    }
  };

  const handleRemoveFavorite = (id: number, name: string) => {
    setFavorites((prev) => prev.filter((f) => f.id !== id));
    showMessage(`已取消收藏「${name}」`, 'info');
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
        {filtered.length === 0 ? (
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
                    {item.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-sm font-semibold truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        {item.name}
                      </span>
                      <span className={typeBadge(item.type)}>
                        <TypeIcon type={item.type} />
                        <span className="ml-1">{item.type}</span>
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
                    onClick={() => handleUse(item.name)}
                    className={`flex-1 ${btnPrimary} !py-1.5 text-center`}
                  >
                    使用
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveFavorite(item.id, item.name)}
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
