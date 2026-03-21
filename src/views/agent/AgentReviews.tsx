import React, { useState, useEffect, useCallback } from 'react';
import { Star, ThumbsUp, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Theme, FontSize } from '../../types';
import { reviewService } from '../../api/services/review.service';
import type { Review, ReviewSummary } from '../../types/dto/review';

export interface AgentReviewsProps {
  agentId: number;
  theme: Theme;
  fontSize: FontSize;
}

const AVATAR_COLORS = [
  'from-blue-500 to-indigo-500',
  'from-emerald-500 to-teal-500',
  'from-violet-500 to-purple-500',
  'from-orange-500 to-amber-500',
  'from-rose-500 to-pink-500',
  'from-cyan-500 to-sky-500',
  'from-fuchsia-500 to-pink-500',
  'from-lime-500 to-emerald-500',
];

function StarRating({ rating, size = 14, interactive = false, onRate }: {
  rating: number;
  size?: number;
  interactive?: boolean;
  onRate?: (n: number) => void;
}) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => {
        const starVal = i + 1;
        const filled = interactive ? starVal <= (hover || rating) : starVal <= rating;
        return (
          <Star
            key={i}
            size={size}
            className={`transition-colors ${
              filled ? 'text-amber-500 fill-amber-500' : 'text-slate-300 dark:text-slate-600'
            } ${interactive ? 'cursor-pointer' : ''}`}
            onMouseEnter={interactive ? () => setHover(starVal) : undefined}
            onMouseLeave={interactive ? () => setHover(0) : undefined}
            onClick={interactive && onRate ? () => onRate(starVal) : undefined}
          />
        );
      })}
    </div>
  );
}

export const AgentReviews: React.FC<AgentReviewsProps> = ({ agentId, theme, fontSize }) => {
  const isDark = theme === 'dark';
  const [reviews, setReviews] = useState<Review[]>([]);
  const [summary, setSummary] = useState<ReviewSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [myRating, setMyRating] = useState(0);
  const [myComment, setMyComment] = useState('');

  const fetchData = useCallback(() => {
    setLoading(true);
    Promise.all([
      reviewService.list('agent', agentId),
      reviewService.summary('agent', agentId),
    ])
      .then(([reviewList, summaryData]) => {
        setReviews(reviewList);
        setSummary(summaryData);
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [agentId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const avgRating = summary ? summary.avgRating.toFixed(1) : '0.0';
  const totalCount = summary?.totalCount ?? reviews.length;

  const distribution = summary
    ? [5, 4, 3, 2, 1].map(stars => {
        const count = summary.distribution[stars] ?? 0;
        const percent = totalCount > 0 ? Math.round((count / totalCount) * 100) : 0;
        return { stars, count, percent };
      })
    : [];

  const handleHelpful = (reviewId: number) => {
    reviewService.toggleHelpful(reviewId)
      .then(() => fetchData())
      .catch(err => console.error(err));
  };

  const handleSubmitReview = () => {
    if (myRating === 0 || !myComment.trim()) return;
    reviewService.create({
      targetType: 'agent',
      targetId: agentId,
      rating: myRating,
      comment: myComment,
    })
      .then(() => {
        setMyRating(0);
        setMyComment('');
        fetchData();
      })
      .catch(err => console.error(err));
  };

  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';
  const textMuted = isDark ? 'text-slate-500' : 'text-slate-400';

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 size={32} className={`animate-spin ${textMuted}`} />
        <p className={`mt-3 text-sm ${textMuted}`}>加载评价…</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Overall Rating Summary */}
      <div className={`rounded-xl border p-5 ${isDark ? 'border-white/5 bg-white/[0.02]' : 'border-slate-100 bg-slate-50/50'}`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          <div className="text-center sm:text-left shrink-0">
            <div className={`text-5xl font-bold ${textPrimary}`}>{avgRating}</div>
            <StarRating rating={Math.round(parseFloat(avgRating))} size={16} />
            <p className={`text-xs mt-1 ${textMuted}`}>{totalCount} 条评价</p>
          </div>
          {distribution.length > 0 && (
            <div className="flex-1 w-full space-y-1.5">
              {distribution.map((d) => (
                <div key={d.stars} className="flex items-center gap-2">
                  <span className={`text-xs w-8 text-right shrink-0 ${textMuted}`}>{d.stars} 星</span>
                  <div className={`flex-1 h-2.5 rounded-full overflow-hidden ${isDark ? 'bg-white/5' : 'bg-slate-200'}`}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${d.percent}%` }}
                      transition={{ duration: 0.6, delay: (5 - d.stars) * 0.08, ease: 'easeOut' }}
                      className={`h-full rounded-full ${
                        d.stars >= 4 ? 'bg-amber-500' : d.stars === 3 ? 'bg-yellow-500' : 'bg-orange-500'
                      }`}
                    />
                  </div>
                  <span className={`text-xs w-8 shrink-0 ${textMuted}`}>{d.percent}%</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Review List */}
      <div className="space-y-3">
        {reviews.map((review) => {
          const avatarColor = AVATAR_COLORS[review.userId % AVATAR_COLORS.length];
          return (
            <div
              key={review.id}
              className={`rounded-xl border p-4 transition-colors ${
                isDark ? 'border-white/5 hover:border-white/10 bg-white/[0.02]' : 'border-slate-100 hover:border-slate-200 bg-white'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-9 h-9 rounded-full bg-gradient-to-tr ${avatarColor} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                  {review.userName.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className={`font-medium text-sm ${textPrimary}`}>{review.userName}</span>
                    <StarRating rating={review.rating} size={12} />
                    <span className={`text-xs ${textMuted}`}>{review.createTime}</span>
                  </div>
                  <p className={`text-sm leading-relaxed ${textSecondary}`}>{review.comment}</p>
                  <button
                    type="button"
                    onClick={() => handleHelpful(review.id)}
                    className={`mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-colors ${
                      isDark ? 'bg-white/5 text-slate-400 hover:bg-white/10' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    }`}
                  >
                    <ThumbsUp size={12} />
                    有帮助 {review.helpfulCount > 0 && `(${review.helpfulCount})`}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Write Review */}
      <div className={`rounded-xl border p-5 ${isDark ? 'border-white/5 bg-white/[0.02]' : 'border-slate-100 bg-slate-50/50'}`}>
        <h4 className={`font-bold text-sm mb-3 ${textPrimary}`}>写评价</h4>
        <div className="flex items-center gap-2 mb-3">
          <span className={`text-sm ${textSecondary}`}>评分：</span>
          <StarRating rating={myRating} size={20} interactive onRate={setMyRating} />
          {myRating > 0 && (
            <span className={`text-xs ${textMuted}`}>{myRating} 星</span>
          )}
        </div>
        <textarea
          value={myComment}
          onChange={(e) => setMyComment(e.target.value)}
          placeholder="分享你的使用体验…"
          rows={3}
          className={`w-full px-4 py-2.5 rounded-xl border text-sm resize-none mb-3 ${
            isDark
              ? 'bg-white/5 border-white/10 text-white placeholder:text-slate-600'
              : 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400'
          }`}
        />
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleSubmitReview}
            disabled={myRating === 0 || !myComment.trim()}
            className="btn btn-primary btn-sm rounded-xl"
          >
            提交评价
          </button>
        </div>
      </div>
    </div>
  );
};
