import React, { useState, useEffect, useMemo } from 'react';
import { Search, LayoutGrid, ExternalLink, Star, ThumbsUp, MessageSquare, Loader2 } from 'lucide-react';
import type { Theme, FontSize, ThemeColor } from '../../types';
import type { SmartApp, EmbedType } from '../../types/dto/smart-app';
import type { Review } from '../../types/dto/review';
import { smartAppService } from '../../api/services/smart-app.service';
import { reviewService } from '../../api/services/review.service';
import { nativeInputClass } from '../../utils/formFieldClasses';
import {
  pageBg, bentoCard, btnPrimary,
  textPrimary, textSecondary, textMuted, techBadge,
} from '../../utils/uiClasses';
import { BentoCard } from '../../components/common/BentoCard';
import { GlassPanel } from '../../components/common/GlassPanel';
import { Modal } from '../../components/common/Modal';

interface Props { theme: Theme; fontSize: FontSize; themeColor?: ThemeColor; showMessage?: (msg: string, type: 'success' | 'error' | 'info' | 'warning') => void; }

const EMBED_BADGE: Record<EmbedType, { label: string; cls: string }> = { iframe: { label: '嵌入式', cls: 'text-blue-600 bg-blue-500/10' }, redirect: { label: '外链', cls: 'text-amber-600 bg-amber-500/10' }, micro_frontend: { label: '微前端', cls: 'text-violet-600 bg-violet-500/10' } };
const SOURCE_BADGE: Record<string, { label: string; cls: string }> = { internal: { label: '自研', cls: 'text-sky-600 bg-sky-500/10' }, partner: { label: '合作方', cls: 'text-purple-600 bg-purple-500/10' }, cloud: { label: '云服务', cls: 'text-cyan-600 bg-cyan-500/10' } };
const ICON_COLORS = ['bg-blue-500', 'bg-violet-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-cyan-500', 'bg-indigo-500', 'bg-pink-500'];
function pickColor(str: string): string { let h = 0; for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h); return ICON_COLORS[Math.abs(h) % ICON_COLORS.length]; }

interface AppReview { id: string; userName: string; avatarColor: string; rating: number; comment: string; date: string; helpfulCount: number; helpedByMe: boolean; }
const AVATAR_COLORS = ['from-blue-500 to-indigo-500', 'from-emerald-500 to-teal-500', 'from-violet-500 to-purple-500', 'from-orange-500 to-amber-500', 'from-rose-500 to-pink-500', 'from-cyan-500 to-sky-500'];

function reviewToAppReview(r: Review): AppReview {
  return { id: String(r.id), userName: r.userName, avatarColor: AVATAR_COLORS[r.id % AVATAR_COLORS.length], rating: r.rating, comment: r.comment, date: r.createTime.slice(0, 10), helpfulCount: r.helpfulCount, helpedByMe: false };
}

export const AppMarket: React.FC<Props> = ({ theme, fontSize: _fontSize, themeColor: _themeColor, showMessage }) => {
  const isDark = theme === 'dark';
  const [apps, setApps] = useState<SmartApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [detailApp, setDetailApp] = useState<SmartApp | null>(null);
  const [appReviews, setAppReviews] = useState<AppReview[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [myRating, setMyRating] = useState(0);
  const [myComment, setMyComment] = useState('');

  useEffect(() => {
    if (!detailApp) return;
    let cancelled = false;
    setReviewsLoading(true);
    reviewService.list('app', detailApp.id)
      .then((data) => { if (!cancelled) setAppReviews(data.map(reviewToAppReview)); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setReviewsLoading(false); });
    return () => { cancelled = true; };
  }, [detailApp]);

  useEffect(() => {
    let cancelled = false; setLoading(true);
    smartAppService.list({ status: 'published', pageSize: 100 })
      .then((res) => { if (!cancelled) setApps(res.list); })
      .catch(() => { if (!cancelled) showMessage?.('加载应用列表失败', 'error'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [showMessage]);

  const filtered = useMemo(() => {
    if (!keyword.trim()) return apps;
    const kw = keyword.toLowerCase();
    return apps.filter((a) => a.displayName.toLowerCase().includes(kw) || a.appName.toLowerCase().includes(kw) || a.description.toLowerCase().includes(kw));
  }, [apps, keyword]);

  const handleOpen = (app: SmartApp) => {
    if (app.embedType === 'redirect') window.open(app.appUrl, '_blank');
    else showMessage?.(`应用「${app.displayName}」将以${EMBED_BADGE[app.embedType].label}方式加载`, 'info');
  };

  return (
    <div className={`flex-1 flex flex-col min-h-0 overflow-hidden ${pageBg(theme)}`}>
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-2 sm:px-3 lg:px-4 py-2 sm:py-3">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${isDark ? 'bg-blue-500/15' : 'bg-blue-50'}`}><LayoutGrid size={22} className="text-blue-500" /></div>
            <div className="flex items-center gap-2">
              <h1 className={`text-xl font-bold ${textPrimary(theme)}`}>应用广场</h1>
              {apps.length > 0 && <span className={`text-xs px-2 py-0.5 rounded-full ${isDark ? 'bg-white/5 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>{apps.length}</span>}
            </div>
          </div>
          <GlassPanel theme={theme} padding="sm" className="!p-0 w-full sm:w-72">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input type="text" placeholder="搜索应用…" value={keyword} onChange={(e) => setKeyword(e.target.value)} className={`w-full bg-transparent pl-9 pr-3 py-2.5 text-sm outline-none ${textPrimary(theme)}`} />
            </div>
          </GlassPanel>
        </div>

        {/* Grid */}
        {loading ? <div className="flex items-center justify-center py-20"><span className={`text-sm ${textMuted(theme)}`}>加载中…</span></div>
        : filtered.length === 0 ? <div className="text-center py-20"><p className={`text-lg font-medium ${textMuted(theme)}`}>暂无匹配的应用</p><p className={`text-sm mt-1 ${textMuted(theme)}`}>尝试调整搜索关键词</p></div>
        : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((app) => (
              <BentoCard key={app.id} theme={theme} hover glow="indigo" padding="md" onClick={() => setDetailApp(app)} className="flex flex-col h-full">
                <div className="flex items-start gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0 ${pickColor(app.appName)}`}>{(app.displayName || app.appName).charAt(0)}</div>
                  <div className="min-w-0 flex-1"><h3 className={`font-semibold truncate ${textPrimary(theme)}`}>{app.displayName}</h3></div>
                </div>
                <p className={`text-sm leading-relaxed mb-3 line-clamp-2 ${textSecondary(theme)}`}>{app.description || '暂无描述'}</p>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${EMBED_BADGE[app.embedType].cls}`}>{EMBED_BADGE[app.embedType].label}</span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${(SOURCE_BADGE[app.sourceType as string] ?? SOURCE_BADGE.internal).cls}`}>{(SOURCE_BADGE[app.sourceType as string] ?? SOURCE_BADGE.internal).label}</span>
                </div>
                <div className={`flex items-center justify-end pt-3 border-t mt-auto ${isDark ? 'border-white/[0.06]' : 'border-slate-100'}`}>
                  <button type="button" onClick={(e) => { e.stopPropagation(); handleOpen(app); }} className={`${btnPrimary} !py-1.5 !px-3 !text-xs`}>打开应用 <ExternalLink size={12} /></button>
                </div>
              </BentoCard>
            ))}
          </div>
        )}
      </div>

      {/* Detail + Reviews Modal */}
      <Modal open={!!detailApp} onClose={() => setDetailApp(null)} theme={theme} size="lg">
        {detailApp && (
          <>
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0 ${pickColor(detailApp.appName)}`}>{(detailApp.displayName || detailApp.appName).charAt(0)}</div>
              <div className="min-w-0 flex-1">
                <h3 className={`text-lg font-bold truncate ${textPrimary(theme)}`}>{detailApp.displayName}</h3>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${EMBED_BADGE[detailApp.embedType].cls}`}>{EMBED_BADGE[detailApp.embedType].label}</span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${(SOURCE_BADGE[detailApp.sourceType as string] ?? SOURCE_BADGE.internal).cls}`}>{(SOURCE_BADGE[detailApp.sourceType as string] ?? SOURCE_BADGE.internal).label}</span>
                </div>
              </div>
              <button type="button" onClick={(e) => { e.stopPropagation(); handleOpen(detailApp); }} className={`${btnPrimary} shrink-0`}>打开应用 <ExternalLink size={12} /></button>
            </div>
            <div className="space-y-5">
              <p className={`text-sm leading-relaxed ${textSecondary(theme)}`}>{detailApp.description || '暂无描述'}</p>
              <div>
                <h4 className={`font-bold text-base mb-4 flex items-center gap-2 ${textPrimary(theme)}`}><MessageSquare size={18} className="text-blue-500" /> 评分与评论</h4>
                <div className={`${bentoCard(theme)} p-4 mb-4`}>
                  <div className="text-center">
                    <div className={`text-3xl font-bold ${textPrimary(theme)}`}>{(appReviews.reduce((s, r) => s + r.rating, 0) / appReviews.length).toFixed(1)}</div>
                    <div className="flex gap-0.5 mt-1 justify-center">{Array.from({ length: 5 }).map((_, i) => <Star key={i} size={12} className={i < 4 ? 'text-amber-500 fill-amber-500' : 'text-slate-300'} />)}</div>
                    <p className={`text-[11px] mt-1 ${textMuted(theme)}`}>{appReviews.length} 条评价</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {appReviews.map((review) => (
                    <div key={review.id} className={`${bentoCard(theme)} p-3`}>
                      <div className="flex items-start gap-2.5">
                        <div className={`w-8 h-8 rounded-full bg-gradient-to-tr ${review.avatarColor} flex items-center justify-center text-white text-xs font-bold shrink-0`}>{review.userName.charAt(0)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`font-medium text-sm ${textPrimary(theme)}`}>{review.userName}</span>
                            <div className="flex gap-0.5">{Array.from({ length: 5 }).map((_, i) => <Star key={i} size={10} className={i < review.rating ? 'text-amber-500 fill-amber-500' : 'text-slate-300'} />)}</div>
                            <span className={`text-[11px] ${textMuted(theme)}`}>{review.date}</span>
                          </div>
                          <p className={`text-sm ${textSecondary(theme)}`}>{review.comment}</p>
                          <button type="button" onClick={() => setAppReviews(prev => prev.map(r => r.id === review.id ? { ...r, helpfulCount: r.helpedByMe ? r.helpfulCount - 1 : r.helpfulCount + 1, helpedByMe: !r.helpedByMe } : r))} className={`mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] ${review.helpedByMe ? 'bg-blue-500/10 text-blue-600' : isDark ? 'bg-white/5 text-slate-500 hover:bg-white/10' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}>
                            <ThumbsUp size={10} className={review.helpedByMe ? 'fill-current' : ''} /> 有帮助 {review.helpfulCount > 0 && `(${review.helpfulCount})`}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className={`${bentoCard(theme)} p-4 mt-4`}>
                  <h5 className={`font-bold text-sm mb-2 ${textPrimary(theme)}`}>写评价</h5>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-xs ${textSecondary(theme)}`}>评分：</span>
                    <div className="flex gap-0.5">{Array.from({ length: 5 }).map((_, i) => <Star key={i} size={18} className={`cursor-pointer transition-colors ${i < myRating ? 'text-amber-500 fill-amber-500' : 'text-slate-300'}`} onClick={() => setMyRating(i + 1)} />)}</div>
                  </div>
                  <textarea value={myComment} onChange={(e) => setMyComment(e.target.value)} placeholder="分享你的使用体验…" rows={2} className={`${nativeInputClass(theme)} resize-none mb-2`} />
                  <div className="flex justify-end">
                    <button type="button" disabled={myRating === 0 || !myComment.trim()} onClick={() => { if (myRating === 0 || !myComment.trim()) return; setAppReviews(prev => [{ id: `ar-new-${Date.now()}`, userName: '我', avatarColor: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)], rating: myRating, comment: myComment, date: new Date().toISOString().slice(0, 10), helpfulCount: 0, helpedByMe: false }, ...prev]); setMyRating(0); setMyComment(''); }} className={`${btnPrimary} disabled:opacity-50`}>提交评价</button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
};
