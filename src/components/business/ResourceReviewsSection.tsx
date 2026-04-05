import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, MessageCircle, ThumbsUp, Trash2, X } from 'lucide-react';
import type { Theme } from '../../types';
import type { UserInfo } from '../../types/dto/auth';
import { canAccessAdminView } from '../../context/UserRoleContext';
import { useAuthStore } from '../../stores/authStore';
import { reviewService } from '../../api/services/review.service';
import type { Review, ReviewSummary } from '../../types/dto/review';
import { BentoCard } from '../common/BentoCard';
import { PageSkeleton } from '../common/PageSkeleton';
import { MultiAvatar } from '../common/MultiAvatar';
import { MarkdownView } from '../common/MarkdownView';
import { ReviewMarkdownEditor } from '../common/ReviewMarkdownEditor';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { btnGhost, btnPrimary, textMuted, textPrimary, textSecondary } from '../../utils/uiClasses';
import { formatDateTime } from '../../utils/formatDateTime';

type ReviewTargetType = 'agent' | 'skill' | 'app' | 'mcp' | 'dataset';

/** 1–5 分对应表情（由差到好）；未选中时为灰度，选中 / 悬停预览时恢复原色 */
const RATING_EMOJIS = ['😢', '😕', '😐', '😊', '🤩'] as const;

function ratingEmojiSizeClass(size: number, interactive: boolean): string {
  if (size >= 18) return interactive ? 'text-4xl sm:text-[2.75rem] leading-none' : 'text-2xl leading-none';
  if (size >= 14) return 'text-2xl leading-none';
  return 'text-lg leading-none';
}

export type ReviewNode = Review & { children: ReviewNode[] };

interface Props {
  targetType: ReviewTargetType;
  targetId: number | string;
  theme: Theme;
  appearance?: 'default' | 'airy';
  showMessage?: (msg: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

function buildReviewTree(flat: Review[]): ReviewNode[] {
  const map = new Map<number, ReviewNode>();
  for (const r of flat) {
    map.set(r.id, { ...r, children: [] });
  }
  const roots: ReviewNode[] = [];
  for (const r of flat) {
    const node = map.get(r.id)!;
    const pid = r.parentId;
    if (pid != null && pid > 0 && map.has(pid)) {
      map.get(pid)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  const byTime = (a: ReviewNode, b: ReviewNode) =>
    a.createTime < b.createTime ? 1 : a.createTime > b.createTime ? -1 : 0;
  const sortDeep = (nodes: ReviewNode[]) => {
    nodes.sort(byTime);
    nodes.forEach((n) => sortDeep(n.children));
  };
  sortDeep(roots);
  return roots;
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
  const effective = interactive ? (hover > 0 ? hover : rating) : rating;
  const sizeCls = ratingEmojiSizeClass(size, interactive);
  const gapCls = size >= 18 && interactive ? 'gap-1.5 sm:gap-2' : 'gap-0.5 sm:gap-1';

  const itemClass = (colored: boolean) =>
    [
      sizeCls,
      'select-none transition-[filter,opacity,transform] duration-200 motion-reduce:transition-none motion-reduce:transform-none',
      colored ? 'grayscale-0 opacity-100' : 'grayscale opacity-[0.42]',
    ].join(' ');

  return (
    <div
      className={`flex items-center ${gapCls}`}
      role={interactive ? 'radiogroup' : 'img'}
      aria-label={
        interactive
          ? '评分，1 分最差 5 分最好'
          : rating > 0
            ? `评分 ${rating} 分，满分 5 分`
            : '暂无评分'
      }
    >
      {RATING_EMOJIS.map((emoji, i) => {
        const val = i + 1;
        const colored = val <= effective && effective > 0;
        if (interactive) {
          return (
            <button
              key={val}
              type="button"
              role="radio"
              aria-checked={rating === val}
              aria-label={`${val} 分`}
              className={`${itemClass(colored)} min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl motion-reduce:hover:scale-100 hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50`}
              onMouseEnter={() => setHover(val)}
              onMouseLeave={() => setHover(0)}
              onClick={() => onRate?.(val)}
            >
              <span aria-hidden className="block translate-y-px">
                {emoji}
              </span>
            </button>
          );
        }
        return (
          <span key={val} className={itemClass(colored)} title={`${val} 分`} aria-hidden>
            {emoji}
          </span>
        );
      })}
    </div>
  );
}

interface ReviewThreadNodeProps {
  node: ReviewNode;
  depth: number;
  theme: Theme;
  isDark: boolean;
  isAiry: boolean;
  user: UserInfo | null;
  replyParentId: number | null;
  setReplyParentId: React.Dispatch<React.SetStateAction<number | null>>;
  replyMarkdown: string;
  setReplyMarkdown: React.Dispatch<React.SetStateAction<string>>;
  replySubmitting: boolean;
  submitReply: (parentId: number) => void;
  helpedByMe: Record<number, boolean>;
  helpfulLoadingId: number | null;
  onHelpful: (id: number) => void;
  canDeleteReview: (r: Review) => boolean;
  onDeleteReview: (r: Review) => void;
  deletingId: number | null;
  cardClassFor: (isNested: boolean) => string;
}

const ReviewThreadNode = React.memo(function ReviewThreadNode({
  node,
  depth,
  theme,
  isDark,
  isAiry,
  user,
  replyParentId,
  setReplyParentId,
  replyMarkdown,
  setReplyMarkdown,
  replySubmitting,
  submitReply,
  helpedByMe,
  helpfulLoadingId,
  onHelpful,
  canDeleteReview,
  onDeleteReview,
  deletingId,
  cardClassFor,
}: ReviewThreadNodeProps) {
  const isReply = depth > 0;
  const showStars = !isReply && node.rating > 0;

  return (
    <div className={depth > 0 ? `mt-3 border-l-2 pl-3 sm:ml-6 sm:pl-4 ${isDark ? 'border-white/10' : 'border-slate-200'}` : ''}>
      <div className={cardClassFor(isReply)}>
        <div className="flex items-start gap-3">
          <MultiAvatar
            seed={`${node.userId}-${node.userName}`}
            alt={node.userName}
            className="h-8 w-8 shrink-0 rounded-full border border-white/10 object-cover"
          />
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <span className={`text-sm font-medium ${textPrimary(theme)}`}>{node.userName}</span>
              {showStars ? <StarRating rating={node.rating} size={11} /> : null}
              {isReply ? (
                <span className={`inline-flex items-center gap-0.5 text-[10px] font-medium uppercase ${textMuted(theme)}`}>
                  <MessageCircle size={10} aria-hidden />
                  回复
                </span>
              ) : null}
              <span className={`text-xs ${textMuted(theme)}`}>{formatDateTime(node.createTime)}</span>
            </div>
            <div className={`text-sm ${textSecondary(theme)}`}>
              <MarkdownView value={node.content} className="compact" />
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={helpfulLoadingId === node.id}
                onClick={() => onHelpful(node.id)}
                className={`${btnGhost(theme)} !text-xs ${helpedByMe[node.id] ? 'bg-blue-500/10 text-blue-600' : ''}`}
              >
                <ThumbsUp size={12} />
                有帮助 {node.helpfulCount > 0 && `(${node.helpfulCount})`}
              </button>
              {user ? (
                <button
                  type="button"
                  onClick={() => setReplyParentId((id) => (id === node.id ? null : node.id))}
                  className={`${btnGhost(theme)} !text-xs`}
                >
                  <MessageCircle size={12} />
                  {replyParentId === node.id ? '关闭回复' : '回复'}
                </button>
              ) : null}
              {canDeleteReview(node) && (
                <button
                  type="button"
                  disabled={deletingId === node.id || helpfulLoadingId === node.id}
                  onClick={() => void onDeleteReview(node)}
                  className={`${btnGhost(theme)} !text-xs text-rose-600 hover:bg-rose-500/10 dark:text-rose-400`}
                >
                  {deletingId === node.id ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <Trash2 size={12} />
                  )}
                  删除
                </button>
              )}
            </div>

            {replyParentId === node.id && user ? (
              <div
                className={`mt-3 rounded-xl border p-3 ${isDark ? 'border-white/10 bg-black/20' : 'border-slate-200 bg-slate-50/80'}`}
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className={`text-xs font-medium ${textSecondary(theme)}`}>回复 {node.userName}</span>
                  <button
                    type="button"
                    className={`rounded-md p-1 ${isDark ? 'hover:bg-white/10' : 'hover:bg-slate-200'}`}
                    aria-label="关闭回复框"
                    onClick={() => {
                      setReplyParentId(null);
                      setReplyMarkdown('');
                    }}
                  >
                    <X size={14} className={textMuted(theme)} />
                  </button>
                </div>
                <ReviewMarkdownEditor
                  theme={theme}
                  variant="compact"
                  value={replyMarkdown}
                  onChange={setReplyMarkdown}
                  placeholder="支持 Markdown；请用下方按钮发送回复。"
                />
                <div className="mt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    className={btnGhost(theme)}
                    disabled={replySubmitting}
                    onClick={() => {
                      setReplyParentId(null);
                      setReplyMarkdown('');
                    }}
                  >
                    取消
                  </button>
                  <button
                    type="button"
                    disabled={replySubmitting || !replyMarkdown.trim()}
                    onClick={() => submitReply(node.id)}
                    className={btnPrimary}
                  >
                    {replySubmitting ? '发送中…' : '发送回复'}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
      {node.children.map((ch) => (
        <ReviewThreadNode
          key={ch.id}
          node={ch}
          depth={depth + 1}
          theme={theme}
          isDark={isDark}
          isAiry={isAiry}
          user={user}
          replyParentId={replyParentId}
          setReplyParentId={setReplyParentId}
          replyMarkdown={replyMarkdown}
          setReplyMarkdown={setReplyMarkdown}
          replySubmitting={replySubmitting}
          submitReply={submitReply}
          helpedByMe={helpedByMe}
          helpfulLoadingId={helpfulLoadingId}
          onHelpful={onHelpful}
          canDeleteReview={canDeleteReview}
          onDeleteReview={onDeleteReview}
          deletingId={deletingId}
          cardClassFor={cardClassFor}
        />
      ))}
    </div>
  );
});

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
  const [reviewPendingDelete, setReviewPendingDelete] = useState<Review | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [replyParentId, setReplyParentId] = useState<number | null>(null);
  const [replyMarkdown, setReplyMarkdown] = useState('');
  const [replySubmitting, setReplySubmitting] = useState(false);

  const reviewForest = useMemo(() => buildReviewTree(reviews), [reviews]);

  const canDeleteReview = useCallback(
    (r: Review) => {
      if (!user) return false;
      if (canAccessAdminView(user.role)) return true;
      return String(user.id) === String(r.userId);
    },
    [user],
  );

  const cardClassFor = useCallback(
    (isNested: boolean) =>
      `rounded-2xl border p-4 transition-colors ${
        isNested
          ? isDark
            ? 'border-white/[0.08] bg-white/[0.02]'
            : 'border-slate-200/80 bg-slate-50/50'
          : isAiry
            ? isDark
              ? 'border-white/10 bg-gradient-to-br from-white/[0.07] to-transparent hover:border-cyan-300/30'
              : 'border-slate-200 bg-gradient-to-br from-white to-slate-50 hover:border-cyan-300'
            : isDark
              ? 'border-white/10 bg-white/[0.03]'
              : 'border-slate-200 bg-white'
      }`,
    [isAiry, isDark],
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

  useEffect(() => {
    if (replyParentId == null) setReplyMarkdown('');
  }, [replyParentId]);

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

  const handleHelpful = useCallback(
    async (reviewId: number) => {
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
    },
    [helpfulLoadingId, helpedByMe, showMessage],
  );

  const requestDeleteReview = useCallback(
    (review: Review) => {
      if (!canDeleteReview(review)) return;
      setReviewPendingDelete(review);
    },
    [canDeleteReview],
  );

  const confirmDeleteReview = useCallback(async () => {
    const review = reviewPendingDelete;
    if (!review) return;
    setDeletingId(review.id);
    try {
      await reviewService.remove(review.id);
      showMessage?.('已删除', 'success');
      setReplyParentId(null);
      setReviewPendingDelete(null);
      fetchData();
    } catch (e) {
      showMessage?.(e instanceof Error ? e.message : '删除失败', 'error');
    } finally {
      setDeletingId(null);
    }
  }, [reviewPendingDelete, fetchData, showMessage]);

  const handleSubmitReview = async () => {
    if (myRating === 0 || !myComment.trim()) return;
    setSubmitting(true);
    try {
      await reviewService.create({
        resourceType: targetType,
        resourceId: targetId,
        rating: myRating,
        content: myComment.trim(),
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

  const handleSubmitReply = useCallback(
    async (parentId: number) => {
      const body = replyMarkdown.trim();
      if (!body) {
        showMessage?.('请输入回复内容', 'warning');
        return;
      }
      setReplySubmitting(true);
      try {
        await reviewService.create({
          resourceType: targetType,
          resourceId: targetId,
          content: body,
          parentId,
        });
        setReplyMarkdown('');
        setReplyParentId(null);
        showMessage?.('回复已发布', 'success');
        fetchData();
      } catch (e) {
        showMessage?.(
          e instanceof Error ? e.message : '回复失败（若持续失败，可能后端尚未开启 parentId）',
          'error',
        );
      } finally {
        setReplySubmitting(false);
      }
    },
    [fetchData, replyMarkdown, showMessage, targetId, targetType],
  );

  if (loading) {
    return <PageSkeleton type="table" rows={4} />;
  }

  return (
    <div className="space-y-4">
      {isAiry ? (
        <div
          className={`rounded-2xl border p-4 backdrop-blur-[1px] ${
            isDark
              ? 'border-cyan-400/20 bg-gradient-to-br from-cyan-500/[0.10] via-indigo-500/[0.06] to-transparent'
              : 'border-cyan-200 bg-gradient-to-br from-cyan-50 via-indigo-50/70 to-white'
          }`}
        >
          {loadError && (
            <div
              className={`mb-3 flex items-center justify-between rounded-xl border px-3 py-2 text-xs ${
                isDark ? 'border-white/15 bg-black/20 text-slate-200' : 'border-slate-200 bg-white/80 text-slate-600'
              }`}
            >
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
            <div
              className={`mb-3 flex items-center justify-between rounded-xl border px-3 py-2 text-xs ${
                isDark ? 'border-white/10 bg-white/[0.03] text-slate-300' : 'border-slate-200 bg-slate-50 text-slate-600'
              }`}
            >
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
          <div
            className={`rounded-xl border px-4 py-5 text-sm ${
              isAiry
                ? isDark
                  ? 'border-white/10 bg-black/20 text-slate-300'
                  : 'border-slate-200 bg-white/80 text-slate-600'
                : isDark
                  ? 'border-white/10 bg-white/[0.03] text-slate-300'
                  : 'border-slate-200 bg-slate-50 text-slate-600'
            }`}
          >
            暂无评价，来写下第一条体验吧。
          </div>
        )}
        {reviewForest.map((node) => (
          <ReviewThreadNode
            key={node.id}
            node={node}
            depth={0}
            theme={theme}
            isDark={isDark}
            isAiry={isAiry}
            user={user}
            replyParentId={replyParentId}
            setReplyParentId={setReplyParentId}
            replyMarkdown={replyMarkdown}
            setReplyMarkdown={setReplyMarkdown}
            replySubmitting={replySubmitting}
            submitReply={(id) => void handleSubmitReply(id)}
            helpedByMe={helpedByMe}
            helpfulLoadingId={helpfulLoadingId}
            onHelpful={(id) => void handleHelpful(id)}
            canDeleteReview={canDeleteReview}
            onDeleteReview={requestDeleteReview}
            deletingId={deletingId}
            cardClassFor={cardClassFor}
          />
        ))}
        {reviews.length > 0 && reviews.length < reviewTotal && (
          <div className="flex justify-center pt-2">
            <button type="button" disabled={loadingMore} onClick={() => void loadMore()} className={btnGhost(theme)}>
              {loadingMore ? (
                <>
                  <Loader2 size={14} className="mr-1 inline animate-spin" />
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
        <div
          className={`rounded-2xl border p-4 ${
            isDark
              ? 'border-fuchsia-400/20 bg-gradient-to-br from-fuchsia-500/[0.10] via-indigo-500/[0.06] to-transparent'
              : 'border-fuchsia-200 bg-gradient-to-br from-fuchsia-50 via-indigo-50/70 to-white'
          }`}
        >
          <h4 className={`mb-3 text-sm font-bold ${textPrimary(theme)}`}>写评价</h4>
          <div className="mb-3 flex items-center gap-2">
            <span className={`text-sm ${textSecondary(theme)}`}>评分：</span>
            <StarRating rating={myRating} size={18} interactive onRate={setMyRating} />
          </div>
          <ReviewMarkdownEditor
            theme={theme}
            value={myComment}
            onChange={setMyComment}
            placeholder="分享你的使用体验… 支持 **粗体**、列表、代码块、链接等 Markdown。"
          />
          <div className="mt-3 flex justify-end">
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
          <h4 className={`mb-3 text-sm font-bold ${textPrimary(theme)}`}>写评价</h4>
          <div className="mb-3 flex items-center gap-2">
            <span className={`text-sm ${textSecondary(theme)}`}>评分：</span>
            <StarRating rating={myRating} size={18} interactive onRate={setMyRating} />
          </div>
          <ReviewMarkdownEditor
            theme={theme}
            value={myComment}
            onChange={setMyComment}
            placeholder="分享你的使用体验… 支持 **粗体**、列表、代码块、链接等 Markdown。"
          />
          <div className="mt-3 flex justify-end">
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

      <ConfirmDialog
        open={reviewPendingDelete != null}
        title="删除评价"
        message="确定删除这条评价？删除后不可恢复。"
        variant="danger"
        confirmText="删除"
        loading={deletingId !== null}
        onCancel={() => {
          if (deletingId !== null) return;
          setReviewPendingDelete(null);
        }}
        onConfirm={() => void confirmDeleteReview()}
      />
    </div>
  );
};
