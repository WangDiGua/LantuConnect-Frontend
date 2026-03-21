import React, { useMemo, useState, useEffect } from 'react';
import {
  Search,
  Star,
  Download,
  Heart,
  TrendingUp,
  Package,
  ChevronRight,
  MessageSquare,
  BarChart3,
  Rocket,
  GitBranch,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Theme, FontSize, ThemeColor } from '../../types';
import { THEME_COLOR_CLASSES } from '../../constants/theme';
import {
  AGENT_MARKET_CATEGORIES,
  AGENT_MARKET_FEATURED,
  AGENT_MARKET_LIST,
  AGENT_MARKET_HOT_KEYWORDS,
  type AgentMarketCategoryId,
  type AgentMarketCard,
} from '../../constants/agentMarket';
import { nativeSelectClass } from '../../utils/formFieldClasses';
import { AgentReviews } from './AgentReviews';
import { useNavigate } from 'react-router-dom';
import { buildPath } from '../../constants/consoleRoutes';

export interface AgentMarketProps {
  theme: Theme;
  fontSize: FontSize;
  themeColor: ThemeColor;
  showMessage: (content: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
}

export const AgentMarket: React.FC<AgentMarketProps> = ({
  theme,
  fontSize,
  themeColor,
  showMessage,
}) => {
  const isDark = theme === 'dark';
  const tc = THEME_COLOR_CLASSES[themeColor];
  const [category, setCategory] = useState<AgentMarketCategoryId>('all');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<'hot' | 'rating' | 'new'>('hot');

  const filterFn = (a: AgentMarketCard) => {
    if (category !== 'all' && a.category !== category) return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      a.name.toLowerCase().includes(q) ||
      a.description.toLowerCase().includes(q) ||
      a.author.toLowerCase().includes(q) ||
      a.tags.some((t) => t.toLowerCase().includes(q))
    );
  };

  const featured = useMemo(() => AGENT_MARKET_FEATURED.filter(filterFn), [category, query]);
  const list = useMemo(() => {
    let rows = AGENT_MARKET_LIST.filter(filterFn);
    if (sort === 'rating') {
      rows = [...rows].sort((a, b) => parseFloat(b.rating) - parseFloat(a.rating));
    } else if (sort === 'new') {
      rows = [...rows].reverse();
    }
    return rows;
  }, [category, query, sort]);

  const navigate = useNavigate();

  const WS_KEY = 'lantu_workspace_agents';
  const [workspaceAgents, setWorkspaceAgents] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(WS_KEY) || '[]'); } catch { return []; }
  });
  useEffect(() => { localStorage.setItem(WS_KEY, JSON.stringify(workspaceAgents)); }, [workspaceAgents]);
  const isInWorkspace = (id: string) => workspaceAgents.includes(id);

  const [confirmAgent, setConfirmAgent] = useState<AgentMarketCard | null>(null);
  const addToWorkspace = (agent: AgentMarketCard) => {
    if (isInWorkspace(agent.id)) return;
    setWorkspaceAgents((prev) => [...prev, agent.id]);
    showMessage(`已将「${agent.name}」添加到工作区`, 'success');
  };

  const [detailAgent, setDetailAgent] = useState<(AgentMarketCard & { _source?: 'featured' | 'list' }) | null>(null);

  return (
    <div
      className={`flex-1 flex flex-col min-h-0 overflow-hidden ${
        isDark ? 'bg-[#000000]' : 'bg-[#F2F2F7]'
      }`}
    >
      <div className="w-full flex-1 min-h-0 flex flex-col px-2 sm:px-3 lg:px-4 py-2 sm:py-3 overflow-y-auto custom-scrollbar">
        {/* 顶栏 */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className={`p-2 rounded-xl ${isDark ? 'bg-white/10' : 'bg-white border border-slate-200/80'}`}>
              <Package size={22} className={tc.text} />
            </div>
            <div>
              <h1 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Agent 市场</h1>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                发现、试用与安装校园场景 Agent（布局参考 GPT Store / 扣子 / Dify 发现页）
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              className="btn btn-outline btn-sm h-9 min-h-0 gap-1"
              onClick={() => navigate(buildPath('user', 'my-favorites'))}
            >
              <Heart size={14} />
              我的收藏
            </button>
            <button
              type="button"
              className={`btn btn-sm h-9 min-h-0 text-white border-0 gap-1 ${tc.bg} shadow-lg ${tc.shadow}`}
              onClick={() => navigate(buildPath('user', 'submit-agent'))}
            >
              提交上架
            </button>
          </div>
        </div>

        {/* 主卡片 */}
        <div
          className={`rounded-2xl border overflow-hidden shadow-none flex flex-col min-h-0 ${
            isDark ? 'bg-[#1C1C1E] border-white/10' : 'bg-white border-slate-200/80'
          }`}
        >
          {/* Hero + 搜索 */}
          <div
            className={`px-4 sm:px-8 py-8 sm:py-10 border-b ${
              isDark ? 'border-white/10 bg-gradient-to-b from-white/5 to-transparent' : 'border-slate-200 bg-gradient-to-b from-slate-50/80 to-transparent'
            }`}
          >
            <div className="max-w-3xl">
              <div className="flex items-center gap-3 mb-4">
                <span
                  className={`inline-flex items-center justify-center w-10 h-10 rounded-xl shrink-0 ${
                    isDark ? 'bg-white/10 text-slate-200' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  <Package size={20} strokeWidth={2} />
                </span>
                <div>
                  <p className={`text-[11px] font-bold uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                    Agent 市场
                  </p>
                  <p className={`text-sm font-semibold ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>智能发现与安装</p>
                </div>
              </div>
              <h2 className={`text-2xl sm:text-3xl font-bold tracking-tight mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                为校园场景找到合适的 Agent
              </h2>
              <p className={`text-sm mb-6 leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                支持按场景分类浏览、关键词搜索与排序。安装后可在「Agent列表」中统一管理与调试。
              </p>
              <div className="relative">
                <Search
                  size={18}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
                <input
                  type="text"
                  className="input input-bordered w-full pl-12 h-12 rounded-xl text-sm"
                  placeholder="搜索 Agent 名称、能力、提供方或标签…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              <div className="flex flex-wrap gap-2 mt-4">
                <span className={`text-xs font-medium ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>热门：</span>
                {AGENT_MARKET_HOT_KEYWORDS.map((kw) => (
                  <button
                    key={kw}
                    type="button"
                    onClick={() => setQuery(kw)}
                    className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                      isDark
                        ? 'border-white/10 hover:bg-white/10 text-slate-300'
                        : 'border-slate-200/80 hover:bg-slate-100 text-slate-600'
                    }`}
                  >
                    {kw}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 分类 */}
          <div
            className={`px-4 sm:px-6 py-3 border-b flex flex-wrap gap-2 ${
              isDark ? 'border-white/10 bg-[#1C1C1E]' : 'border-slate-200 bg-slate-50/50'
            }`}
          >
            {AGENT_MARKET_CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategory(c.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                  category === c.id
                    ? isDark
                      ? 'bg-white/15 text-white'
                      : `bg-white text-slate-900 border border-slate-200/80 shadow-sm`
                    : isDark
                      ? 'text-slate-400 hover:bg-white/5'
                      : 'text-slate-600 hover:bg-slate-200/40'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          <div className="p-4 sm:p-6 lg:p-8 space-y-10">
            {/* 精选 */}
            <section>
              <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                <div className="flex items-center gap-2">
                  <TrendingUp size={18} className={tc.text} />
                  <h3 className={`font-bold text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>精选推荐</h3>
                </div>
                <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                  编辑推荐与校园高频场景
                </span>
              </div>
              {featured.length === 0 ? (
                <p className={`text-sm py-8 text-center ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                  当前筛选下暂无精选，试试其它分类或清空搜索
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-5">
                  {featured.map((a) => (
                    <article
                      key={a.id}
                      className={`rounded-2xl border p-5 flex flex-col sm:flex-row gap-4 transition-colors shadow-none ${
                        isDark
                          ? 'border-white/10 bg-white/5 hover:border-white/15'
                          : 'border-slate-200/80 bg-[#F2F2F7]/50 hover:border-slate-300'
                      }`}
                    >
                      <div
                        className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shrink-0 ${
                          isDark ? 'bg-white/10' : 'bg-white border border-slate-200/80'
                        }`}
                      >
                        {a.emoji}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <h4 className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{a.name}</h4>
                          {a.tags.slice(0, 2).map((t) => (
                            <span
                              key={t}
                              className={`text-[10px] px-2 py-0.5 rounded-lg font-medium ${
                                isDark ? 'bg-white/10 text-slate-300' : 'bg-white text-slate-600 border border-slate-200/80'
                              }`}
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                        <p className={`text-sm leading-relaxed line-clamp-3 mb-3 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                          {a.description}
                        </p>
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                            <span>{a.author}</span>
                            <span className="mx-2 opacity-40">|</span>
                            <span className="inline-flex items-center gap-0.5">
                              <Star size={12} className="text-amber-500 fill-amber-500" />
                              {a.rating}
                            </span>
                            <span className="mx-2 opacity-40">|</span>
                            <span>{a.installs} 次安装</span>
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm h-8 min-h-0 text-xs"
                              onClick={() => setDetailAgent({ ...a, _source: 'featured' })}
                            >
                              详情与评论
                              <ChevronRight size={14} />
                            </button>
                            <button
                              type="button"
                              className={`btn btn-sm h-8 min-h-0 text-xs border-0 gap-1 ${
                                isInWorkspace(a.id) ? 'bg-slate-400 text-white cursor-not-allowed' : `text-white ${tc.bg}`
                              }`}
                              disabled={isInWorkspace(a.id)}
                              onClick={() => !isInWorkspace(a.id) && setConfirmAgent(a)}
                            >
                              <Rocket size={14} />
                              {isInWorkspace(a.id) ? '已添加' : '一键部署'}
                            </button>
                          </div>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            {/* 全部列表 */}
            <section>
              <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                <h3 className={`font-bold text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>全部 Agent</h3>
                <div className="flex items-center gap-2">
                  <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>排序</span>
                  <select
                    className={`${nativeSelectClass(theme)} w-full min-w-[7.5rem] sm:w-[8.5rem]`}
                    value={sort}
                    onChange={(e) => setSort(e.target.value as typeof sort)}
                  >
                    <option value="hot">热度</option>
                    <option value="rating">评分</option>
                    <option value="new">最新</option>
                  </select>
                </div>
              </div>
              {list.length === 0 ? (
                <p className={`text-sm py-8 text-center ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                  没有匹配的 Agent，请调整分类或搜索词
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {list.map((a) => {
                    const Icon = a.icon;
                    return (
                      <article
                        key={a.id}
                        onClick={() => setDetailAgent({ ...a, _source: 'list' })}
                        className={`rounded-2xl border p-4 flex flex-col h-full shadow-none transition-colors cursor-pointer ${
                          isDark
                            ? 'border-white/10 bg-[#1C1C1E] hover:border-white/15'
                            : 'border-slate-200/80 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-start gap-3 mb-3">
                          <div
                            className={`w-11 h-11 rounded-xl flex items-center justify-center text-lg shrink-0 ${
                              isDark ? 'bg-white/10' : 'bg-slate-100'
                            }`}
                          >
                            {Icon ? <Icon size={20} className={tc.text} /> : a.emoji}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className={`font-bold text-sm truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                              {a.name}
                            </h4>
                            <p className={`text-[11px] truncate ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                              {a.author}
                            </p>
                          </div>
                        </div>
                        <p className={`text-xs leading-relaxed line-clamp-3 flex-1 mb-3 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                          {a.description}
                        </p>
                        <div className="flex flex-wrap gap-1 mb-3">
                          {a.tags.map((t) => (
                            <span
                              key={t}
                              className={`text-[10px] px-2 py-0.5 rounded-lg ${
                                isDark ? 'bg-white/5 text-slate-400' : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                        <div className="flex items-center justify-between gap-2 mt-auto pt-2 border-t border-dashed border-slate-200/80 dark:border-white/10">
                          <span className={`text-[11px] tabular-nums ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                            <span className="inline-flex items-center gap-0.5 mr-2">
                              <Star size={11} className="text-amber-500 fill-amber-500" />
                              {a.rating}
                            </span>
                            {a.installs} 安装
                          </span>
                          <button
                            type="button"
                            className={`btn btn-sm h-8 min-h-0 text-xs border-0 ${
                              isInWorkspace(a.id) ? 'bg-slate-400 text-white cursor-not-allowed' : `text-white ${tc.bg}`
                            }`}
                            disabled={isInWorkspace(a.id)}
                            onClick={(e) => { e.stopPropagation(); if (!isInWorkspace(a.id)) setConfirmAgent(a); }}
                          >
                            {isInWorkspace(a.id) ? '已添加' : '添加'}
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        </div>

        {/* Agent 详情弹窗 (含评论) */}
        <AnimatePresence>
          {detailAgent && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50"
              onClick={() => setDetailAgent(null)}
            >
              <motion.div
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 20 }}
                className={`w-full max-w-2xl max-h-[85vh] rounded-2xl border flex flex-col ${
                  isDark ? 'bg-[#1C1C1E] border-white/10' : 'bg-white border-slate-200'
                }`}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Modal Header */}
                <div className={`shrink-0 px-6 py-4 border-b flex items-center justify-between ${
                  isDark ? 'border-white/10' : 'border-slate-200'
                }`}>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0 ${
                      isDark ? 'bg-white/10' : 'bg-slate-100'
                    }`}>
                      {detailAgent.emoji}
                    </div>
                    <div className="min-w-0">
                      <h3 className={`text-lg font-bold truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        {detailAgent.name}
                      </h3>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{detailAgent.author}</span>
                        <span className="inline-flex items-center gap-0.5 text-xs">
                          <Star size={12} className="text-amber-500 fill-amber-500" />
                          {detailAgent.rating}
                        </span>
                        <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{detailAgent.installs} 次安装</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      className={`btn btn-sm h-9 min-h-0 text-xs border-0 gap-1 ${
                        isInWorkspace(detailAgent.id) ? 'bg-slate-400 text-white cursor-not-allowed' : `text-white ${tc.bg}`
                      }`}
                      disabled={isInWorkspace(detailAgent.id)}
                      onClick={(e) => { e.stopPropagation(); if (!isInWorkspace(detailAgent.id)) setConfirmAgent(detailAgent); }}
                    >
                      <Rocket size={14} />
                      {isInWorkspace(detailAgent.id) ? '已添加' : '一键部署'}
                    </button>
                    <button type="button" onClick={() => setDetailAgent(null)} className="btn btn-ghost btn-sm btn-circle">
                      <X size={18} />
                    </button>
                  </div>
                </div>
                {/* Modal Body */}
                <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-5 space-y-5">
                  {/* Description */}
                  <div>
                    <p className={`text-sm leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      {detailAgent.description}
                    </p>
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {detailAgent.tags.map((t) => (
                        <span
                          key={t}
                          className={`text-[11px] px-2.5 py-1 rounded-lg font-medium ${
                            isDark ? 'bg-white/10 text-slate-300' : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                  {/* Reviews */}
                  <div>
                    <h4 className={`font-bold text-base mb-4 flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      <MessageSquare size={18} className="text-blue-500" />
                      评分与评论
                    </h4>
                    <AgentReviews agentId={Number(detailAgent.id)} theme={theme} fontSize={fontSize} />
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 确认添加弹窗 */}
        <AnimatePresence>
          {confirmAgent && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/50"
              onClick={() => setConfirmAgent(null)}
            >
              <motion.div
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 20 }}
                className={`w-full max-w-sm rounded-2xl border p-6 ${
                  isDark ? 'bg-[#1C1C1E] border-white/10' : 'bg-white border-slate-200'
                }`}
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className={`text-base font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  确认添加
                </h3>
                <p className={`text-sm mb-6 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  确认将「{confirmAgent.name}」添加到工作区？
                </p>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => setConfirmAgent(null)}
                  >
                    取消
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm text-white border-0 ${tc.bg}`}
                    onClick={() => { addToWorkspace(confirmAgent); setConfirmAgent(null); }}
                  >
                    确认添加
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
