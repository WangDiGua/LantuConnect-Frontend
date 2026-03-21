import React, { useState } from 'react';
import { Star, ThumbsUp } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Theme, FontSize } from '../../types';

export interface AgentReviewsProps {
  agentId: number;
  theme: Theme;
  fontSize: FontSize;
}

interface Review {
  id: string;
  userId: number;
  userName: string;
  avatarColor: string;
  rating: number;
  comment: string;
  date: string;
  helpfulCount: number;
  helpedByMe: boolean;
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

const MOCK_REVIEWS: Review[] = [
  { id: 'r1', userId: 101, userName: '张三', avatarColor: AVATAR_COLORS[0], rating: 5, comment: '非常好用的 Agent！响应速度快，回答准确，解决了我很多校园生活中的疑问。强烈推荐给同学们使用。', date: '2026-03-18', helpfulCount: 12, helpedByMe: false },
  { id: 'r2', userId: 102, userName: '李老师', avatarColor: AVATAR_COLORS[1], rating: 4, comment: '功能完善，对于日常教学辅助很有帮助。希望能增加更多学科领域的知识支持。', date: '2026-03-16', helpfulCount: 8, helpedByMe: false },
  { id: 'r3', userId: 103, userName: '王五', avatarColor: AVATAR_COLORS[2], rating: 5, comment: '课程推荐功能太赞了，帮我规划了下学期的选课方案，节省了大量时间。', date: '2026-03-14', helpfulCount: 15, helpedByMe: true },
  { id: 'r4', userId: 104, userName: '赵六', avatarColor: AVATAR_COLORS[3], rating: 3, comment: '基础功能不错，但偶尔会出现响应超时的情况，高峰期体验有待优化。', date: '2026-03-12', helpfulCount: 5, helpedByMe: false },
  { id: 'r5', userId: 105, userName: '陈七', avatarColor: AVATAR_COLORS[4], rating: 4, comment: '用了一个月，整体满意。文档生成质量很高，格式排版也很规范。', date: '2026-03-10', helpfulCount: 3, helpedByMe: false },
  { id: 'r6', userId: 106, userName: '刘八', avatarColor: AVATAR_COLORS[5], rating: 5, comment: '作为开发者，这个 Agent 的 API 文档生成能力令人印象深刻，节省了大量写文档的时间。', date: '2026-03-08', helpfulCount: 20, helpedByMe: false },
  { id: 'r7', userId: 107, userName: '孙九', avatarColor: AVATAR_COLORS[6], rating: 4, comment: '界面友好，交互流畅。数据分析功能很实用，图表生成一键完成。', date: '2026-03-05', helpfulCount: 7, helpedByMe: false },
  { id: 'r8', userId: 108, userName: '周十', avatarColor: AVATAR_COLORS[7], rating: 2, comment: '翻译质量还有提升空间，专业术语的翻译不够准确，希望后续版本能改进。', date: '2026-03-02', helpfulCount: 4, helpedByMe: false },
];

const RATING_DISTRIBUTION = [
  { stars: 5, count: 45, percent: 56 },
  { stars: 4, count: 22, percent: 28 },
  { stars: 3, count: 8, percent: 10 },
  { stars: 2, count: 3, percent: 4 },
  { stars: 1, count: 2, percent: 2 },
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

export const AgentReviews: React.FC<AgentReviewsProps> = ({ agentId: _agentId, theme, fontSize }) => {
  const isDark = theme === 'dark';
  const [reviews, setReviews] = useState<Review[]>(MOCK_REVIEWS);
  const [myRating, setMyRating] = useState(0);
  const [myComment, setMyComment] = useState('');

  const avgRating = (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1);

  const handleHelpful = (reviewId: string) => {
    setReviews((prev) =>
      prev.map((r) =>
        r.id === reviewId
          ? { ...r, helpfulCount: r.helpedByMe ? r.helpfulCount - 1 : r.helpfulCount + 1, helpedByMe: !r.helpedByMe }
          : r
      )
    );
  };

  const handleSubmitReview = () => {
    if (myRating === 0 || !myComment.trim()) return;
    const newReview: Review = {
      id: `r-new-${Date.now()}`,
      userId: 999,
      userName: '我',
      avatarColor: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
      rating: myRating,
      comment: myComment,
      date: new Date().toISOString().slice(0, 10),
      helpfulCount: 0,
      helpedByMe: false,
    };
    setReviews((prev) => [newReview, ...prev]);
    setMyRating(0);
    setMyComment('');
  };

  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';
  const textMuted = isDark ? 'text-slate-500' : 'text-slate-400';

  return (
    <div className="space-y-5">
      {/* Overall Rating Summary */}
      <div className={`rounded-xl border p-5 ${isDark ? 'border-white/5 bg-white/[0.02]' : 'border-slate-100 bg-slate-50/50'}`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          {/* Big rating number */}
          <div className="text-center sm:text-left shrink-0">
            <div className={`text-5xl font-bold ${textPrimary}`}>{avgRating}</div>
            <StarRating rating={Math.round(parseFloat(avgRating))} size={16} />
            <p className={`text-xs mt-1 ${textMuted}`}>{reviews.length} 条评价</p>
          </div>
          {/* Distribution bars */}
          <div className="flex-1 w-full space-y-1.5">
            {RATING_DISTRIBUTION.map((d) => (
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
        </div>
      </div>

      {/* Review List */}
      <div className="space-y-3">
        {reviews.map((review) => (
          <div
            key={review.id}
            className={`rounded-xl border p-4 transition-colors ${
              isDark ? 'border-white/5 hover:border-white/10 bg-white/[0.02]' : 'border-slate-100 hover:border-slate-200 bg-white'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className={`w-9 h-9 rounded-full bg-gradient-to-tr ${review.avatarColor} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                {review.userName.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className={`font-medium text-sm ${textPrimary}`}>{review.userName}</span>
                  <StarRating rating={review.rating} size={12} />
                  <span className={`text-xs ${textMuted}`}>{review.date}</span>
                </div>
                <p className={`text-sm leading-relaxed ${textSecondary}`}>{review.comment}</p>
                <button
                  type="button"
                  onClick={() => handleHelpful(review.id)}
                  className={`mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-colors ${
                    review.helpedByMe
                      ? 'bg-blue-500/10 text-blue-600'
                      : isDark ? 'bg-white/5 text-slate-400 hover:bg-white/10' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                >
                  <ThumbsUp size={12} className={review.helpedByMe ? 'fill-current' : ''} />
                  有帮助 {review.helpfulCount > 0 && `(${review.helpfulCount})`}
                </button>
              </div>
            </div>
          </div>
        ))}
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
