import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Star, ThumbsUp, Trash2 } from 'lucide-react';
import type { Theme } from '../../types';
import { canAccessAdminView } from '../../context/UserRoleContext';
import { useAuthStore } from '../../stores/authStore';
import { reviewService } from '../../api/services/review.service';
import type { Review, ReviewSummary } from '../../types/dto/review';
import { BentoCard } from '../common/BentoCard';
import { PageSkeleton } from '../common/PageSkeleton';
import { MultiAvatar } from '../common/MultiAvatar';
import { nativeInputClass } from '../../utils/formFieldClasses';
import { btnGhost, btnPrimary, textMuted, textPrimary, textSecondary } from '../../utils/uiClasses';
import { formatDateTime } from '../../utils/formatDateTime';
import { AutoHeightTextarea } from '../common/AutoHeightTextarea';

type ReviewTargetType = 'agent' | 'skill' | 'app' | 'mcp' | 'dataset';

interface Props {
  targetType: ReviewTargetType;
  targetId: number | string;
  theme: Theme;
  appearance?: 'default' | 'airy';
  showMessage?: (msg: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

function StarRating({
  rating,
  size = 14,
  interactive = false,
  onRate,
}: {
  rating: number;
  size?: number;
  interactive?: boolean;
  onRate?: (n: number) => void;
}) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => {
        const val = i + 1;
        const filled = interactive ? val <= (hover || rating) : val <= rating;
        return (
          <Star
            key={i}
            size={size}
            className={`transition-colors ${filled ? 'text-amber-500 fill-amber-500' : 'text-slate-300 dark:text-slate-600'} ${interactive ? 'cursor-pointer' : ''}`}
            onMouseEnter={interactive ? () => setHover(val) : undefined}
            onMouseLeave={interactive ? () => setHover(0) : undefined}
            onClick={interactive && onRate ? () => onRate(val) : undefined}
          />
        );
      })}
    </div>
  );
}

export const ResourceReviewsSection: React.FC<Props> = ({ targetType, targetId, theme, appearance = 'default', showMessage }) => {
  const isDark = theme === 'dark';
  const isAiry = appearance === 'airy';
  const user = useAuthStore((s) => s.user);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewTotal, setReviewTotal] = useState(0);
  const [reviewPage, setReviewPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const pageSize = 20;
  const [summary, setSummary] = useState<ReviewSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [myRating, setMyRating] = useState(0);
  const [myComment, setMyComment] = useState('');
  const [helpedByMe, setHelpedByMe] = useState<Record<number, boolean>>({});
  const [helpfulLoadingId, setHelpfulLoadingId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const canDeleteReview = useCallback(
    (r: Review) => {
      if (!user) return false;
      if (canAccessAdminView(user.role)) return true;
      return String(user.id) === String(r.userId);
    },
    [user],
  );

  const fetchData = useCallback(() => {
    setLoading(true);
    setLoadError(null);
    Promise.all([
      reviewService.pageList(targetType, targetId, 1, pageSize),
      reviewService.summary(targetType, targetId),
    ])
      .then(([pageData, summaryData]) => {
        setReviews(pageData.list);
        setReviewTotal(pageData.total);
        setReviewPage(1);
        setSummary(summaryData);
        setHelpedByMe({});
      })
      .catch(() => {
        setLoadError('加载评价失败，请重试');
        showMessage?.('加载评价失败，请重试', 'error');
      })
      .finally(() => setLoading(false));
  }, [showMessage, targetId, targetType]);

  const loadMore = useCallback(async () => {
    if (loadingMore || reviews.length >= reviewTotal) return;
    const nextPage = reviewPage + 1;
    setLoadingMore(true);
    try {
      const pageData = await reviewService.pageList(targetType, targetId, nextPage, pageSize);
      setReviews((prev) => [...prev, ...pageData.list]);
      setReviewPage(nextPage);
      setReviewTotal(pageData.total);
    } catch {
      showMessage?.('加载更多失败', 'warning');
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, reviewPage, reviewTotal, reviews.length, showMessage, targetId, targetType]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const avgRating = useMemo(() => (summary ? summary.avgRating.toFixed(1) : '0.0'), [summary]);
  const totalCount = summary?.totalCount ?? reviewTotal;

  const distribution = useMemo(() => {
    if (!summary) return [];
    return [5, 4, 3, 2, 1].map((stars) => ({
      stars,
      count: summary.distribution[stars] ?? 0,
      percent: totalCount > 0 ? Math.round(((summary.distribution[stars] ?? 0) / totalCount) * 100) : 0,
    }));
  }, [summary, totalCount]);

  const handleHelpful = async (reviewId: number) => {
    if (helpfulLoadingId !== null) return;
    setHelpfulLoadingId(reviewId);
    try {
      await reviewService.toggleHelpful(reviewId);
      const toggled = !helpedByMe[reviewId];
      setHelpedByMe((prev) => ({ ...prev, [reviewId]: toggled }));
      setReviews((prev) =>
        prev.map((r) =>
          r.id === reviewId ? { ...r, helpfulCount: toggled ? r.helpfulCount + 1 : Math.max(0, r.helpfulCount - 1) } : r,
        ),
      );
    } catch {
      showMessage?.('操作失败，请重试', 'warning');
    } finally {
      setHelpfulLoadingId(null);
    }
  };

  const handleDeleteReview = async (review: Review) => {
    if (!canDeleteReview(review)) return;
    if (!window.confirm('确定删除这条评价？删除后不可恢复。')) return;
    setDeletingId(review.id);
    try {
      await reviewService.remove(review.id);
      showMessage?.('已删除', 'success');
      fetchData();
    } catch (e) {
      showMessage?.(e instanceof Error ? e.message : '删除失败', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const handleSubmitReview = async () => {
    if (myRating === 0 || !myComment.trim()) return;
    setSubmitting(true);
    try {
      await reviewService.create({
        resourceType: targetType,
        resourceId: targetId,
        rating: myRating,
        content: myComment,
      });
      setMyRating(0);
      setMyComment('');
      showMessage?.('评价已提交', 'success');
      fetchData();
    } catch (e) {
      showMessage?.(e instanceof Error ? e.message : '评论提交失败，请检查内容后重试', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <PageSkeleton type="table" rows={4} />;
  }

  return (
    <div className="space-y-4">
      {isAiry ? (
        <div className={`rounded-2xl border p-4 backdrop-blur-[1px] ${
          isDark
            ? 'border-cyan-400/20 bg-gradient-to-br from-cyan-500/[0.10] via-indigo-500/[0.06] to-transparent'
            : 'border-cyan-200 bg-gradient-to-br from-cyan-50 via-indigo-50/70 to-white'
        }`}>
          {loadError && (
            <div className={`mb-3 flex items-center justify-between rounded-xl border px-3 py-2 text-xs ${
              isDark ? 'border-white/15 bg-black/20 text-slate-200' : 'border-slate-200 bg-white/80 text-slate-600'
            }`}>
              <span>{loadError}</span>
              <button type="button" className={btnGhost(theme)} onClick={fetchData}>
                重试
              </button>
            </div>
          )}
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="shrink-0">
              <div className={`text-4xl font-bold tracking-tight ${textPrimary(theme)}`}>{avgRating}</div>
              <StarRating rating={Math.round(parseFloat(avgRating))} size={14} />
              <p className={`mt-1 text-xs ${textMuted(theme)}`}>{totalCount} 条评价</p>
            </div>
            {distribution.length > 0 && (
              <div className="w-full flex-1 space-y-1.5">
                {distribution.map((d) => (
                  <div key={d.stars} className="flex items-center gap-2">
                    <span className={`w-8 shrink-0 text-right text-xs ${textMuted(theme)}`}>{d.stars} 星</span>
                    <div className={`h-2 flex-1 overflow-hidden rounded-full ${isDark ? 'bg-white/10' : 'bg-slate-200'}`}>
                      <div style={{ width: `${d.percent}%` }} className="h-full rounded-full bg-amber-500" />
                    </div>
                    <span className={`w-8 shrink-0 text-xs ${textMuted(theme)}`}>{d.percent}%</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <BentoCard theme={theme}>
          {loadError && (
            <div className={`mb-3 flex items-center justify-between rounded-xl border px-3 py-2 text-xs ${
              isDark ? 'border-white/10 bg-white/[0.03] text-slate-300' : 'border-slate-200 bg-slate-50 text-slate-600'
            }`}>
              <span>{loadError}</span>
              <button type="button" className={btnGhost(theme)} onClick={fetchData}>
                重试
              </button>
            </div>
          )}
          <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
            <div className="shrink-0 text-center sm:text-left">
              <div className={`text-4xl font-bold ${textPrimary(theme)}`}>{avgRating}</div>
              <StarRating rating={Math.round(parseFloat(avgRating))} size={14} />
              <p className={`mt-1 text-xs ${textMuted(theme)}`}>{totalCount} 条评价</p>
            </div>
            {distribution.length > 0 && (
              <div className="w-full flex-1 space-y-1.5">
                {distribution.map((d) => (
                  <div key={d.stars} className="flex items-center gap-2">
                    <span className={`w-8 shrink-0 text-right text-xs ${textMuted(theme)}`}>{d.stars} 星</span>
                    <div className={`h-2 flex-1 overflow-hidden rounded-full ${isDark ? 'bg-white/5' : 'bg-slate-200'}`}>
                      <div style={{ width: `${d.percent}%` }} className="h-full rounded-full bg-amber-500" />
                    </div>
                    <span className={`w-8 shrink-0 text-xs ${textMuted(theme)}`}>{d.percent}%</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </BentoCard>
      )}

      <div className="space-y-2">
        {reviews.length === 0 && (
          <div className={`rounded-xl border px-4 py-5 text-sm ${
            isAiry
              ? isDark ? 'border-white/10 bg-black/20 text-slate-300' : 'border-slate-200 bg-white/80 text-slate-600'
              : isDark ? 'border-white/10 bg-white/[0.03] text-slate-300' : 'border-slate-200 bg-slate-50 text-slate-600'
          }`}>
            暂无评价，来写下第一条体验吧。
          </div>
        )}
        {reviews.map((review) => {
          return (
            <div
              key={review.id}
              className={`rounded-2xl border p-4 transition-colors ${
                isAiry
                  ? isDark
                    ? 'border-white/10 bg-gradient-to-br from-white/[0.07] to-transparent hover:border-cyan-300/30'
                    : 'border-slate-200 bg-gradient-to-br from-white to-slate-50 hover:border-cyan-300'
                  : isDark
                    ? 'border-white/10 bg-white/[0.03]'
                    : 'border-slate-200 bg-white'
              }`}
            >
              <div className="flex items-start gap-3">
                <MultiAvatar
                  seed={`${review.userId}-${review.userName}`}
                  alt={review.userName}
                  className="w-8 h-8 rounded-full border border-white/10 shrink-0 object-cover"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className={`font-medium text-sm ${textPrimary(theme)}`}>{review.userName}</span>
                    <StarRating rating={review.rating} size={11} />
                    <span className={`text-xs ${textMuted(theme)}`}>{formatDateTime(review.createTime)}</span>
                  </div>
                  <p className={`text-sm ${textSecondary(theme)}`}>{review.content}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={helpfulLoadingId === review.id}
                      onClick={() => void handleHelpful(review.id)}
                      className={`${btnGhost(theme)} !text-xs ${helpedByMe[review.id] ? 'bg-blue-500/10 text-blue-600' : ''}`}
                    >
                      <ThumbsUp size={12} />
                      有帮助 {review.helpfulCount > 0 && `(${review.helpfulCount})`}
                    </button>
                    {canDeleteReview(review) && (
                      <button
                        type="button"
                        disabled={deletingId === review.id || helpfulLoadingId === review.id}
                        onClick={() => void handleDeleteReview(review)}
                        className={`${btnGhost(theme)} !text-xs text-rose-600 hover:bg-rose-500/10 dark:text-rose-400`}
                      >
                        {deletingId === review.id ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <Trash2 size={12} />
                        )}
                        删除
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        {reviews.length > 0 && reviews.length < reviewTotal && (
          <div className="flex justify-center pt-2">
            <button
              type="button"
              disabled={loadingMore}
              onClick={() => void loadMore()}
              className={btnGhost(theme)}
            >
              {loadingMore ? (
                <>
                  <Loader2 size={14} className="animate-spin inline mr-1" />
                  加载中…
                </>
              ) : (
                '加载更多'
              )}
            </button>
          </div>
        )}
      </div>

      {isAiry ? (
        <div className={`rounded-2xl border p-4 ${
          isDark
            ? 'border-fuchsia-400/20 bg-gradient-to-br from-fuchsia-500/[0.10] via-indigo-500/[0.06] to-transparent'
            : 'border-fuchsia-200 bg-gradient-to-br from-fuchsia-50 via-indigo-50/70 to-white'
        }`}>
          <h4 className={`mb-3 text-sm font-bold ${textPrimary(theme)}`}>写评价</h4>
          <div className="mb-3 flex items-center gap-2">
            <span className={`text-sm ${textSecondary(theme)}`}>评分：</span>
            <StarRating rating={myRating} size={18} interactive onRate={setMyRating} />
          </div>
          <AutoHeightTextarea
            value={myComment}
            onChange={(e) => setMyComment(e.target.value)}
            placeholder="分享你的使用体验..."
            minRows={3}
            maxRows={12}
            className={`${nativeInputClass(theme)} mb-3 resize-none`}
          />
          <div className="flex justify-end">
            <button
              type="button"
              disabled={myRating === 0 || !myComment.trim() || submitting}
              onClick={() => void handleSubmitReview()}
              className={btnPrimary}
            >
              {submitting ? '提交中...' : '提交评价'}
            </button>
          </div>
        </div>
      ) : (
      <BentoCard theme={theme}>
        <h4 className={`font-bold text-sm mb-3 ${textPrimary(theme)}`}>写评价</h4>
        <div className="flex items-center gap-2 mb-3">
          <span className={`text-sm ${textSecondary(theme)}`}>评分：</span>
          <StarRating rating={myRating} size={18} interactive onRate={setMyRating} />
        </div>
        <AutoHeightTextarea
          value={myComment}
          onChange={(e) => setMyComment(e.target.value)}
          placeholder="分享你的使用体验..."
          minRows={3}
          maxRows={12}
          className={`${nativeInputClass(theme)} resize-none mb-3`}
        />
        <div className="flex justify-end">
          <button
            type="button"
            disabled={myRating === 0 || !myComment.trim() || submitting}
            onClick={() => void handleSubmitReview()}
            className={btnPrimary}
          >
            {submitting ? '提交中...' : '提交评价'}
          </button>
        </div>
      </BentoCard>
      )}
    </div>
  );
};
