import React, { useState, useEffect, useMemo } from 'react';
import { Search, LayoutGrid, ExternalLink, X, Star, ThumbsUp, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Theme, FontSize, ThemeColor } from '../../types';
import type { SmartApp, EmbedType } from '../../types/dto/smart-app';
import type { SourceType } from '../../types/dto/agent';
import { smartAppService } from '../../api/services/smart-app.service';
import { nativeInputClass } from '../../utils/formFieldClasses';

interface Props {
  theme: Theme;
  fontSize: FontSize;
  themeColor?: ThemeColor;
  showMessage?: (msg: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

const EMBED_BADGE: Record<EmbedType, { label: string; cls: string }> = {
  iframe: { label: '嵌入式', cls: 'text-blue-600 bg-blue-500/10' },
  redirect: { label: '外链', cls: 'text-amber-600 bg-amber-500/10' },
  micro_frontend: { label: '微前端', cls: 'text-violet-600 bg-violet-500/10' },
};

const SOURCE_BADGE: Record<string, { label: string; cls: string }> = {
  internal: { label: '自研', cls: 'text-sky-600 bg-sky-500/10' },
  partner: { label: '合作方', cls: 'text-purple-600 bg-purple-500/10' },
  cloud: { label: '云服务', cls: 'text-cyan-600 bg-cyan-500/10' },
};

const ICON_COLORS = [
  'bg-blue-500', 'bg-violet-500', 'bg-emerald-500', 'bg-amber-500',
  'bg-rose-500', 'bg-cyan-500', 'bg-indigo-500', 'bg-pink-500',
];

function pickColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return ICON_COLORS[Math.abs(hash) % ICON_COLORS.length];
}

interface AppReview {
  id: string;
  userName: string;
  avatarColor: string;
  rating: number;
  comment: string;
  date: string;
  helpfulCount: number;
  helpedByMe: boolean;
}

const AVATAR_COLORS = [
  'from-blue-500 to-indigo-500', 'from-emerald-500 to-teal-500',
  'from-violet-500 to-purple-500', 'from-orange-500 to-amber-500',
  'from-rose-500 to-pink-500', 'from-cyan-500 to-sky-500',
];

const MOCK_APP_REVIEWS: AppReview[] = [
  { id: 'ar1', userName: '张三', avatarColor: AVATAR_COLORS[0], rating: 5, comment: '应用体验流畅，功能完善，推荐使用！', date: '2026-03-18', helpfulCount: 10, helpedByMe: false },
  { id: 'ar2', userName: '李老师', avatarColor: AVATAR_COLORS[1], rating: 4, comment: '界面设计美观，操作直观。希望能增加更多自定义选项。', date: '2026-03-16', helpfulCount: 7, helpedByMe: false },
  { id: 'ar3', userName: '王五', avatarColor: AVATAR_COLORS[2], rating: 5, comment: '非常好用的工具，帮我节省了大量时间。', date: '2026-03-14', helpfulCount: 13, helpedByMe: true },
  { id: 'ar4', userName: '赵六', avatarColor: AVATAR_COLORS[3], rating: 3, comment: '功能基本够用，但加载速度有待提升。', date: '2026-03-11', helpfulCount: 4, helpedByMe: false },
];

export const AppMarket: React.FC<Props> = ({ theme, fontSize: _fontSize, themeColor: _themeColor, showMessage }) => {
  const dark = theme === 'dark';
  const [apps, setApps] = useState<SmartApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [detailApp, setDetailApp] = useState<SmartApp | null>(null);
  const [appReviews, setAppReviews] = useState<AppReview[]>(MOCK_APP_REVIEWS);
  const [myRating, setMyRating] = useState(0);
  const [myComment, setMyComment] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    smartAppService
      .list({ status: 'published', pageSize: 100 })
      .then((res) => { if (!cancelled) setApps(res.list); })
      .catch(() => { if (!cancelled) showMessage?.('加载应用列表失败', 'error'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [showMessage]);

  const filtered = useMemo(() => {
    if (!keyword.trim()) return apps;
    const kw = keyword.toLowerCase();
    return apps.filter(
      (a) =>
        a.displayName.toLowerCase().includes(kw) ||
        a.appName.toLowerCase().includes(kw) ||
        a.description.toLowerCase().includes(kw)
    );
  }, [apps, keyword]);

  const handleOpen = (app: SmartApp) => {
    if (app.embedType === 'redirect') {
      window.open(app.appUrl, '_blank');
    } else {
      showMessage?.(`应用「${app.displayName}」将以${EMBED_BADGE[app.embedType].label}方式加载`, 'info');
    }
  };

  const inputCls = nativeInputClass(theme);

  return (
    <div className={`flex-1 flex flex-col min-h-0 overflow-hidden ${dark ? 'bg-[#000000]' : 'bg-[#F2F2F7]'}`}>
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-2 sm:px-3 lg:px-4 py-2 sm:py-3">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-2">
            <LayoutGrid className="text-blue-500" size={22} />
            <h1 className={`text-xl font-bold ${dark ? 'text-white' : 'text-slate-900'}`}>应用广场</h1>
            {apps.length > 0 && (
              <span className={`text-xs px-2 py-0.5 rounded-full ${dark ? 'bg-white/5 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                {apps.length}
              </span>
            )}
          </div>
          <div className="relative w-full sm:w-72">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="搜索应用…"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className={`${inputCls} !pl-9`}
            />
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <span className="loading loading-spinner loading-lg text-slate-400" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className={`text-lg font-medium ${dark ? 'text-slate-400' : 'text-slate-500'}`}>暂无匹配的应用</p>
            <p className={`text-sm mt-1 ${dark ? 'text-slate-500' : 'text-slate-400'}`}>尝试调整搜索关键词</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((app) => {
              const embedInfo = EMBED_BADGE[app.embedType];
              const srcInfo = SOURCE_BADGE[app.sourceType as string] ?? SOURCE_BADGE.internal;
              return (
                <div
                  key={app.id}
                  onClick={() => setDetailApp(app)}
                  className={`rounded-2xl border p-5 transition-colors cursor-pointer ${
                    dark
                      ? 'bg-[#1C1C1E] border-white/10 hover:bg-[#2C2C2E]'
                      : 'bg-white border-slate-200/80 hover:bg-slate-50/80'
                  }`}
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0 ${pickColor(app.appName)}`}>
                      {(app.displayName || app.appName).charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className={`font-semibold truncate ${dark ? 'text-white' : 'text-slate-900'}`}>
                        {app.displayName}
                      </h3>
                    </div>
                  </div>

                  <p className={`text-sm leading-relaxed mb-3 line-clamp-2 ${dark ? 'text-slate-400' : 'text-slate-600'}`}>
                    {app.description || '暂无描述'}
                  </p>

                  <div className="flex flex-wrap gap-1.5 mb-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${embedInfo.cls}`}>
                      {embedInfo.label}
                    </span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${srcInfo.cls}`}>
                      {srcInfo.label}
                    </span>
                  </div>

                  <div className={`flex items-center justify-end pt-3 border-t ${dark ? 'border-white/5' : 'border-slate-100'}`}>
                    <button
                      type="button"
                      onClick={() => handleOpen(app)}
                      className="btn btn-primary btn-xs rounded-xl shadow-none gap-1"
                    >
                      打开应用
                      <ExternalLink size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* App Detail + Reviews Modal */}
      <AnimatePresence>
        {detailApp && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50"
            onClick={() => setDetailApp(null)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className={`w-full max-w-2xl max-h-[85vh] rounded-2xl border flex flex-col ${
                dark ? 'bg-[#1C1C1E] border-white/10' : 'bg-white border-slate-200'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className={`shrink-0 px-6 py-4 border-b flex items-center justify-between ${
                dark ? 'border-white/10' : 'border-slate-200'
              }`}>
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0 ${pickColor(detailApp.appName)}`}>
                    {(detailApp.displayName || detailApp.appName).charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <h3 className={`text-lg font-bold truncate ${dark ? 'text-white' : 'text-slate-900'}`}>
                      {detailApp.displayName}
                    </h3>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${EMBED_BADGE[detailApp.embedType].cls}`}>
                        {EMBED_BADGE[detailApp.embedType].label}
                      </span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${(SOURCE_BADGE[detailApp.sourceType as string] ?? SOURCE_BADGE.internal).cls}`}>
                        {(SOURCE_BADGE[detailApp.sourceType as string] ?? SOURCE_BADGE.internal).label}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleOpen(detailApp); }}
                    className="btn btn-primary btn-sm rounded-xl gap-1"
                  >
                    打开应用
                    <ExternalLink size={12} />
                  </button>
                  <button type="button" onClick={() => setDetailApp(null)} className="btn btn-ghost btn-sm btn-circle">
                    <X size={18} />
                  </button>
                </div>
              </div>
              {/* Body */}
              <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-5 space-y-5">
                <p className={`text-sm leading-relaxed ${dark ? 'text-slate-300' : 'text-slate-700'}`}>
                  {detailApp.description || '暂无描述'}
                </p>

                {/* Review section */}
                <div>
                  <h4 className={`font-bold text-base mb-4 flex items-center gap-2 ${dark ? 'text-white' : 'text-slate-900'}`}>
                    <MessageSquare size={18} className="text-blue-500" />
                    评分与评论
                  </h4>
                  {/* Rating summary */}
                  <div className={`rounded-xl border p-4 mb-4 ${dark ? 'border-white/5 bg-white/[0.02]' : 'border-slate-100 bg-slate-50/50'}`}>
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <div className={`text-3xl font-bold ${dark ? 'text-white' : 'text-slate-900'}`}>
                          {(appReviews.reduce((s, r) => s + r.rating, 0) / appReviews.length).toFixed(1)}
                        </div>
                        <div className="flex gap-0.5 mt-1">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} size={12} className={i < 4 ? 'text-amber-500 fill-amber-500' : 'text-slate-300'} />
                          ))}
                        </div>
                        <p className={`text-[11px] mt-1 ${dark ? 'text-slate-500' : 'text-slate-400'}`}>{appReviews.length} 条评价</p>
                      </div>
                    </div>
                  </div>
                  {/* Reviews list */}
                  <div className="space-y-3">
                    {appReviews.map((review) => (
                      <div key={review.id} className={`rounded-xl border p-3 ${
                        dark ? 'border-white/5 bg-white/[0.02]' : 'border-slate-100 bg-white'
                      }`}>
                        <div className="flex items-start gap-2.5">
                          <div className={`w-8 h-8 rounded-full bg-gradient-to-tr ${review.avatarColor} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                            {review.userName.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`font-medium text-sm ${dark ? 'text-white' : 'text-slate-900'}`}>{review.userName}</span>
                              <div className="flex gap-0.5">
                                {Array.from({ length: 5 }).map((_, i) => (
                                  <Star key={i} size={10} className={i < review.rating ? 'text-amber-500 fill-amber-500' : 'text-slate-300'} />
                                ))}
                              </div>
                              <span className={`text-[11px] ${dark ? 'text-slate-500' : 'text-slate-400'}`}>{review.date}</span>
                            </div>
                            <p className={`text-sm ${dark ? 'text-slate-400' : 'text-slate-600'}`}>{review.comment}</p>
                            <button
                              type="button"
                              onClick={() => setAppReviews(prev => prev.map(r =>
                                r.id === review.id ? { ...r, helpfulCount: r.helpedByMe ? r.helpfulCount - 1 : r.helpfulCount + 1, helpedByMe: !r.helpedByMe } : r
                              ))}
                              className={`mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] ${
                                review.helpedByMe ? 'bg-blue-500/10 text-blue-600' : dark ? 'bg-white/5 text-slate-500 hover:bg-white/10' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                              }`}
                            >
                              <ThumbsUp size={10} className={review.helpedByMe ? 'fill-current' : ''} />
                              有帮助 {review.helpfulCount > 0 && `(${review.helpfulCount})`}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* Write review */}
                  <div className={`rounded-xl border p-4 mt-4 ${dark ? 'border-white/5 bg-white/[0.02]' : 'border-slate-100 bg-slate-50/50'}`}>
                    <h5 className={`font-bold text-sm mb-2 ${dark ? 'text-white' : 'text-slate-900'}`}>写评价</h5>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-xs ${dark ? 'text-slate-400' : 'text-slate-600'}`}>评分：</span>
                      <div className="flex gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            size={18}
                            className={`cursor-pointer transition-colors ${i < myRating ? 'text-amber-500 fill-amber-500' : 'text-slate-300'}`}
                            onClick={() => setMyRating(i + 1)}
                          />
                        ))}
                      </div>
                    </div>
                    <textarea
                      value={myComment}
                      onChange={(e) => setMyComment(e.target.value)}
                      placeholder="分享你的使用体验…"
                      rows={2}
                      className={`w-full px-3 py-2 rounded-xl border text-sm resize-none mb-2 ${
                        dark ? 'bg-white/5 border-white/10 text-white placeholder:text-slate-600' : 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400'
                      }`}
                    />
                    <div className="flex justify-end">
                      <button
                        type="button"
                        disabled={myRating === 0 || !myComment.trim()}
                        onClick={() => {
                          if (myRating === 0 || !myComment.trim()) return;
                          setAppReviews(prev => [{
                            id: `ar-new-${Date.now()}`,
                            userName: '我',
                            avatarColor: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
                            rating: myRating,
                            comment: myComment,
                            date: new Date().toISOString().slice(0, 10),
                            helpfulCount: 0,
                            helpedByMe: false,
                          }, ...prev]);
                          setMyRating(0);
                          setMyComment('');
                        }}
                        className="btn btn-primary btn-sm rounded-xl"
                      >
                        提交评价
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
