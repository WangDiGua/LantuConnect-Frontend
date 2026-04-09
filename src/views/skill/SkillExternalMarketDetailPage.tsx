import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Copy, Download, ExternalLink, Eye, Heart, Loader2, MessageSquare, Star } from 'lucide-react';
import type { Theme, FontSize, ThemeColor } from '../../types';
import type { SkillExternalCatalogItemVO, SkillExternalReviewVO } from '../../types/dto/resource-center';
import { resourceCenterService } from '../../api/services/resource-center.service';
import { safeOpenHttpUrl } from '../../lib/windowNavigate';
import { ResourceMarketDetailShell } from '../../components/market';
import { btnPrimary, btnSecondary, textMuted, textPrimary, textSecondary } from '../../utils/uiClasses';
import { PageError } from '../../components/common/PageError';
import { PageSkeleton } from '../../components/common/PageSkeleton';
import { formatDateTime } from '../../utils/formatDateTime';
import { MarkdownView } from '../../components/common/MarkdownView';
import { useAuthStore } from '../../stores/authStore';
import { decodeSkillExternalItemKeyFromRoute } from '../../utils/skillExternalMarketPath';

export interface SkillExternalMarketDetailPageProps {
  /** 路由段：`encodeSkillExternalItemKeyForRoute`（v1 Base64URL 前缀）或旧版 `encodeURIComponent` */
  itemKeyEncoded: string;
  theme: Theme;
  fontSize: FontSize;
  themeColor?: ThemeColor;
  showMessage?: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  onBackToList: () => void;
}

function licenseMarkdown(item: SkillExternalCatalogItemVO): string {
  if (!item.licenseNote?.trim()) return '_暂无许可说明_';
  return `### 许可与说明\n\n${item.licenseNote.trim()}`;
}

function sourceLabel(url: string): string {
  try {
    const h = new URL(url).hostname.replace('www.', '');
    if (h.includes('github.com')) return 'GitHub';
    if (h.includes('skillsmp')) return 'SkillsMP';
    return h || '来源';
  } catch {
    return '来源';
  }
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function CopyCodeBlock({
  theme,
  label,
  value,
  showMessage,
}: {
  theme: Theme;
  label: string;
  value: string;
  showMessage?: SkillExternalMarketDetailPageProps['showMessage'];
}) {
  const isDark = theme === 'dark';
  const [busy, setBusy] = useState(false);
  const copy = async () => {
    if (!value.trim()) return;
    setBusy(true);
    const ok = await copyToClipboard(value.trim());
    setBusy(false);
    showMessage?.(ok ? '已复制到剪贴板' : '复制失败，请手动选择文本', ok ? 'success' : 'warning');
  };
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className={`text-xs font-semibold ${textPrimary(theme)}`}>{label}</p>
        <button
          type="button"
          onClick={() => void copy()}
          disabled={busy || !value.trim()}
          className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/45 ${
            isDark ? 'border-white/10 bg-white/[0.04] text-slate-200 hover:bg-white/[0.08]' : 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50'
          }`}
          aria-label={`复制${label}`}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
        </button>
      </div>
      <pre
        className={`max-h-40 overflow-auto rounded-xl border p-3 font-mono text-xs leading-relaxed ${
          isDark ? 'border-white/10 bg-slate-950/80 text-slate-200' : 'border-slate-200 bg-slate-50 text-slate-800'
        }`}
        tabIndex={0}
      >
        {value.trim() || '—'}
      </pre>
    </div>
  );
}

export const SkillExternalMarketDetailPage: React.FC<SkillExternalMarketDetailPageProps> = ({
  itemKeyEncoded,
  theme,
  fontSize: _fontSize,
  showMessage,
  onBackToList,
}) => {
  const isDark = theme === 'dark';
  const authUser = useAuthStore((s) => s.user);
  const itemKey = useMemo(() => decodeSkillExternalItemKeyFromRoute(itemKeyEncoded), [itemKeyEncoded]);

  const [item, setItem] = useState<SkillExternalCatalogItemVO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [tab, setTab] = useState<'intro' | 'files' | 'reviews'>('intro');
  const [favBusy, setFavBusy] = useState(false);

  const [reviews, setReviews] = useState<SkillExternalReviewVO[]>([]);
  const [reviewsTotal, setReviewsTotal] = useState(0);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewPage, setReviewPage] = useState(1);
  const [ratingDraft, setRatingDraft] = useState(5);
  const [commentDraft, setCommentDraft] = useState('');
  const [submitBusy, setSubmitBusy] = useState(false);

  const [skillMdBody, setSkillMdBody] = useState<string | null>(null);
  const [skillMdResolvedUrl, setSkillMdResolvedUrl] = useState<string | null>(null);
  const [skillMdHint, setSkillMdHint] = useState<string | null>(null);
  const [skillMdTruncated, setSkillMdTruncated] = useState(false);
  const [skillMdLoading, setSkillMdLoading] = useState(false);
  const [skillMdError, setSkillMdError] = useState<Error | null>(null);

  const loadItem = useCallback(async () => {
    if (!itemKey.trim()) {
      setError(new Error('无效的条目 key'));
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await resourceCenterService.getSkillExternalCatalogItem(itemKey.trim());
      setItem(data);
    } catch (e) {
      setItem(null);
      setError(e instanceof Error ? e : new Error('加载失败'));
    } finally {
      setLoading(false);
    }
  }, [itemKey]);

  useEffect(() => {
    void loadItem();
  }, [loadItem]);

  const loadSkillMd = useCallback(async () => {
    if (!itemKey.trim()) return;
    setSkillMdLoading(true);
    setSkillMdError(null);
    try {
      const res = await resourceCenterService.getSkillExternalCatalogItemSkillMd(itemKey.trim());
      setSkillMdBody(res.markdown ?? null);
      setSkillMdResolvedUrl(res.resolvedRawUrl ?? null);
      setSkillMdHint(res.hint ?? null);
      setSkillMdTruncated(Boolean(res.truncated));
    } catch (e) {
      setSkillMdBody(null);
      setSkillMdResolvedUrl(null);
      setSkillMdHint(null);
      setSkillMdTruncated(false);
      setSkillMdError(e instanceof Error ? e : new Error('加载 SKILL.md 失败'));
    } finally {
      setSkillMdLoading(false);
    }
  }, [itemKey]);

  useEffect(() => {
    if (!itemKey.trim()) return;
    void resourceCenterService.recordSkillExternalView(itemKey.trim()).catch(() => {});
  }, [itemKey]);

  useEffect(() => {
    if (!item?.itemKey && !item?.id) return;
    void loadSkillMd();
  }, [item?.itemKey, item?.id, loadSkillMd]);

  const loadReviews = useCallback(async () => {
    if (!itemKey.trim()) return;
    setReviewsLoading(true);
    try {
      const res = await resourceCenterService.pageSkillExternalReviews(itemKey.trim(), reviewPage, 20);
      setReviews(res.list);
      setReviewsTotal(res.total);
    } catch {
      showMessage?.('评论加载失败', 'error');
    } finally {
      setReviewsLoading(false);
    }
  }, [itemKey, reviewPage, showMessage]);

  useEffect(() => {
    if (tab === 'reviews') void loadReviews();
  }, [tab, loadReviews]);

  const toggleFavorite = async () => {
    if (!authUser?.id) {
      showMessage?.('请先登录', 'info');
      return;
    }
    if (!item) return;
    const key = item.itemKey?.trim() || item.id?.trim();
    if (!key) return;
    setFavBusy(true);
    try {
      if (item.favoritedByMe) {
        await resourceCenterService.removeSkillExternalFavorite(key);
        showMessage?.('已取消收藏', 'success');
      } else {
        await resourceCenterService.addSkillExternalFavorite(key);
        showMessage?.(
          '已收藏。提示：外部市场收藏不会出现在「我的收藏」列表；若要取消收藏，请在本页点击「已收藏」或返回在线市场打开同一技能详情。',
          'success',
        );
      }
      await loadItem();
    } catch (e) {
      showMessage?.(e instanceof Error ? e.message : '操作失败', 'error');
    } finally {
      setFavBusy(false);
    }
  };

  const submitReview = async () => {
    if (!authUser?.id) {
      showMessage?.('请先登录', 'info');
      return;
    }
    const key = item?.itemKey?.trim() || item?.id?.trim();
    if (!key) return;
    setSubmitBusy(true);
    try {
      await resourceCenterService.createSkillExternalReview({
        itemKey: key,
        rating: ratingDraft,
        ...(commentDraft.trim() ? { comment: commentDraft.trim() } : {}),
      });
      setCommentDraft('');
      showMessage?.('评论已提交', 'success');
      setReviewPage(1);
      await loadReviews();
      await loadItem();
    } catch (e) {
      showMessage?.(e instanceof Error ? e.message : '提交失败', 'error');
    } finally {
      setSubmitBusy(false);
    }
  };

  const triggerDownload = () => {
    const url = item?.packUrl?.trim();
    if (!url) {
      showMessage?.('暂无下载链接', 'warning');
      return;
    }
    if (!safeOpenHttpUrl(url)) {
      showMessage?.('链接无效', 'error');
      return;
    }
    const key = item.itemKey?.trim() || item.id?.trim();
    if (key) void resourceCenterService.recordSkillExternalDownload(key).catch(() => {});
  };

  const zipFileName = useMemo(() => {
    const u = item?.packUrl?.trim();
    if (!u) return 'skill.zip';
    try {
      const path = new URL(u).pathname;
      const seg = path.split('/').filter(Boolean);
      const last = seg[seg.length - 1];
      if (last?.endsWith('.zip')) return last;
    } catch {
      /* ignore */
    }
    return 'skill.zip';
  }, [item?.packUrl]);

  const curlExample = useMemo(() => {
    const u = item?.packUrl?.trim();
    if (!u) return '';
    const safe = u.replace(/"/g, '\\"');
    return `curl -fL "${safe}" -o ${zipFileName}`;
  }, [item?.packUrl, zipFileName]);

  if (loading && !item) {
    return <PageSkeleton type="detail" />;
  }
  if (error || !item) {
    return <PageError error={error ?? new Error('未找到条目')} onRetry={() => void loadItem()} />;
  }

  const reviewBadge = typeof item.reviewCount === 'number' ? item.reviewCount : reviewsTotal;
  const source = item.sourceUrl?.trim() ?? '';

  const tagItems: { key: string; label: string }[] = [
    { key: 'ext', label: '外部资源' },
    ...(source ? [{ key: 'src', label: sourceLabel(source) }] : []),
    { key: 'zip', label: 'ZIP 直链' },
  ];

  return (
    <ResourceMarketDetailShell
      theme={theme}
      onBack={onBackToList}
      backLabel="返回在线市场"
      compactHeaderRow
      mainLgColSpan={9}
      titleBlock={
        <div className="space-y-4">
          <div>
            <p className={`text-xs font-semibold uppercase tracking-wide ${textMuted(theme)}`}>基本信息</p>
            <h1 className={`mt-1 text-2xl font-bold tracking-tight sm:text-3xl ${textPrimary(theme)}`}>{item.name}</h1>
          </div>

          <div
            className={`flex flex-wrap items-center gap-x-5 gap-y-2 text-sm tabular-nums ${textSecondary(theme)}`}
            aria-label="互动与热度"
          >
            <span className="inline-flex items-center gap-1.5" title="收藏">
              <Heart size={16} className="text-rose-500 opacity-90" aria-hidden />
              {item.favoriteCount ?? 0}
            </span>
            <span className="inline-flex items-center gap-1.5" title="下载">
              <Download size={16} className="opacity-80" aria-hidden />
              {item.downloadCount ?? 0}
            </span>
            <span className="inline-flex items-center gap-1.5" title="浏览">
              <Eye size={16} className="opacity-80" aria-hidden />
              {item.viewCount ?? 0}
            </span>
            {typeof item.stars === 'number' && item.stars > 0 ? (
              <span className="inline-flex items-center gap-1.5 font-semibold text-amber-600 dark:text-amber-400" title="源站星标">
                <Star size={16} className="fill-current" aria-hidden />
                {item.stars}
              </span>
            ) : null}
            {typeof item.ratingAvg === 'number' ? (
              <span className="inline-flex items-center gap-1" title="本站均分">
                均分 {item.ratingAvg.toFixed(1)}
              </span>
            ) : null}
          </div>

          {item.summary?.trim() ? (
            <p className={`text-base leading-relaxed sm:text-[15px] ${textSecondary(theme)} max-w-3xl`}>{item.summary.trim()}</p>
          ) : (
            <p className={`text-sm ${textMuted(theme)}`}>暂无摘要</p>
          )}

          <div className="flex flex-wrap gap-2" aria-label="标签">
            {tagItems.map((t) => (
              <span
                key={t.key}
                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                  t.key === 'ext'
                    ? 'border border-amber-500/35 bg-amber-500/10 text-amber-900 dark:text-amber-100'
                    : isDark
                      ? 'border border-white/10 bg-white/[0.06] text-slate-200'
                      : 'border border-slate-200/90 bg-white text-slate-700'
                }`}
              >
                {t.label}
              </span>
            ))}
          </div>
        </div>
      }
      headerActions={
        <div className="flex flex-wrap gap-2 lg:pt-8">
          <button type="button" onClick={() => void toggleFavorite()} disabled={favBusy} className={`${btnSecondary(theme)} min-h-11`}>
            {favBusy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Heart className={`h-4 w-4 ${item.favoritedByMe ? 'fill-rose-500 text-rose-500' : ''}`} aria-hidden />}
            {item.favoritedByMe ? '已收藏' : '收藏'}
          </button>
          <button type="button" onClick={triggerDownload} className={`${btnPrimary} min-h-11`}>
            <Download className="h-4 w-4" aria-hidden />
            下载外链 ZIP
          </button>
        </div>
      }
      tabs={[
        { id: 'intro', label: '技能介绍' },
        { id: 'files', label: '仓库信息' },
        { id: 'reviews', label: '交流反馈', badge: reviewBadge },
      ]}
      activeTabId={tab}
      onTabChange={(id) => setTab(id as typeof tab)}
      mainColumn={
        <>
          {tab === 'intro' ? (
            <div className="space-y-10">
              <section aria-labelledby="skill-md-heading">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h2 id="skill-md-heading" className={`text-lg font-semibold ${textPrimary(theme)}`}>
                    说明文档 (SKILL.md)
                  </h2>
                </div>
                <p className={`text-sm leading-relaxed ${textMuted(theme)}`}>
                  优先展示仓库 SKILL.md 全文；由服务端从 GitHub Raw 代拉，若加载失败请使用右侧「获取方式」中的链接。
                </p>
                <div className="mt-4" aria-live="polite">
                  {skillMdLoading ? (
                    <div className={`flex min-h-11 items-center gap-2 text-sm ${textMuted(theme)}`}>
                      <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
                      正在加载 SKILL.md…
                    </div>
                  ) : null}
                  {!skillMdLoading && skillMdError ? (
                    <div className="space-y-3 rounded-xl border border-rose-500/25 bg-rose-500/5 px-4 py-3 text-sm text-rose-800 dark:text-rose-200">
                      <p>{skillMdError.message}</p>
                      <button type="button" className={`${btnSecondary(theme)} min-h-11`} onClick={() => void loadSkillMd()}>
                        重试加载
                      </button>
                    </div>
                  ) : null}
                  {!skillMdLoading && !skillMdError && skillMdBody?.trim() ? (
                    <div className="space-y-3">
                      {skillMdTruncated ? (
                        <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
                          正文较长，已截断展示前 512KB；完整内容请在仓库中查看。
                        </p>
                      ) : null}
                      <div
                        className={`rounded-2xl border p-4 sm:p-6 ${isDark ? 'border-white/[0.08] bg-white/[0.02]' : 'border-slate-200/80 bg-white'} prose prose-sm max-w-none dark:prose-invert ${isDark ? 'text-slate-200' : ''}`}
                      >
                        <MarkdownView value={skillMdBody} />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {skillMdResolvedUrl?.trim() ? (
                          <a
                            href={skillMdResolvedUrl.trim()}
                            target="_blank"
                            rel="noreferrer"
                            className={`${btnSecondary(theme)} inline-flex min-h-11 items-center gap-1`}
                          >
                            Raw 页面
                            <ExternalLink className="h-4 w-4" aria-hidden />
                          </a>
                        ) : null}
                        {item.sourceUrl?.trim() ? (
                          <a
                            href={item.sourceUrl.trim()}
                            target="_blank"
                            rel="noreferrer"
                            className={`${btnSecondary(theme)} inline-flex min-h-11 items-center gap-1`}
                          >
                            来源页
                            <ExternalLink className="h-4 w-4" aria-hidden />
                          </a>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                  {!skillMdLoading && !skillMdError && !skillMdBody?.trim() ? (
                    <div className={`rounded-2xl border px-4 py-6 text-sm ${isDark ? 'border-white/[0.08] bg-white/[0.03]' : 'border-slate-200 bg-slate-50/80'}`}>
                      <p className={textSecondary(theme)}>{skillMdHint?.trim() || '当前无可展示的 SKILL.md 原文。'}</p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <button type="button" className={`${btnSecondary(theme)} min-h-11`} onClick={() => void loadSkillMd()}>
                          重试
                        </button>
                        {item.sourceUrl?.trim() ? (
                          <a
                            href={item.sourceUrl.trim()}
                            target="_blank"
                            rel="noreferrer"
                            className={`${btnPrimary} inline-flex min-h-11 items-center justify-center gap-1`}
                          >
                            前往来源页
                            <ExternalLink className="h-4 w-4" aria-hidden />
                          </a>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                </div>
              </section>

              <section aria-labelledby="license-heading" className="border-t border-dashed border-slate-200 pt-10 dark:border-white/10">
                <h2 id="license-heading" className={`text-base font-semibold ${textPrimary(theme)}`}>
                  许可与数据说明
                </h2>
                <div className={`prose prose-sm mt-3 max-w-none dark:prose-invert ${isDark ? 'text-slate-200' : ''}`}>
                  <MarkdownView value={licenseMarkdown(item)} />
                </div>
              </section>
            </div>
          ) : null}

          {tab === 'files' ? (
            <div className="space-y-6">
              <p className={`text-sm leading-relaxed ${textSecondary(theme)}`}>
                平台不托管仓库文件树。目录结构、脚本与资源请以来源仓库为准；亦可下载 ZIP 后在本地查看。
              </p>
              <dl className={`space-y-4 text-sm ${textSecondary(theme)}`}>
                <div>
                  <dt className={`font-semibold ${textPrimary(theme)}`}>ZIP 直链</dt>
                  <dd className="mt-1 break-all font-mono text-xs">{item.packUrl || '—'}</dd>
                </div>
                <div>
                  <dt className={`font-semibold ${textPrimary(theme)}`}>来源页</dt>
                  <dd className="mt-1 break-all">
                    {item.sourceUrl?.trim() ? (
                      <a
                        href={item.sourceUrl.trim()}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-violet-600 hover:underline dark:text-violet-400"
                      >
                        {item.sourceUrl.trim()}
                        <ExternalLink size={12} aria-hidden />
                      </a>
                    ) : (
                      '—'
                    )}
                  </dd>
                </div>
                <div>
                  <dt className={`font-semibold ${textPrimary(theme)}`}>itemKey</dt>
                  <dd className="mt-1 break-all font-mono text-xs">{item.itemKey?.trim() || item.id || '—'}</dd>
                </div>
              </dl>
            </div>
          ) : null}

          {tab === 'reviews' ? (
            <div className="space-y-6">
              {authUser?.id ? (
                <div className={`rounded-2xl border p-4 ${isDark ? 'border-white/[0.08] bg-white/[0.03]' : 'border-slate-200/80 bg-white'}`}>
                  <p className={`text-sm font-semibold ${textPrimary(theme)}`}>撰写评论</p>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <label className={`text-xs ${textMuted(theme)}`}>
                      星级
                      <select
                        value={ratingDraft}
                        onChange={(e) => setRatingDraft(Number(e.target.value))}
                        className="ml-2 min-h-11 rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm dark:border-white/10 dark:bg-slate-900"
                      >
                        {[5, 4, 3, 2, 1].map((n) => (
                          <option key={n} value={n}>
                            {n} 星
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <textarea
                    value={commentDraft}
                    onChange={(e) => setCommentDraft(e.target.value)}
                    rows={4}
                    placeholder="可选：分享使用体验"
                    className={`mt-3 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-500/35 ${
                      isDark ? 'border-white/10 bg-slate-950 text-slate-100' : 'border-slate-200 bg-white text-slate-900'
                    }`}
                  />
                  <button
                    type="button"
                    disabled={submitBusy}
                    onClick={() => void submitReview()}
                    className={`${btnPrimary} mt-3 min-h-11`}
                  >
                    {submitBusy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <MessageSquare className="h-4 w-4" aria-hidden />}
                    提交
                  </button>
                </div>
              ) : (
                <p className={`text-sm ${textMuted(theme)}`}>登录后可评论与收藏。</p>
              )}
              {reviewsLoading ? (
                <div className={`flex items-center gap-2 text-sm ${textMuted(theme)}`}>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  加载评论…
                </div>
              ) : null}
              <ul className="space-y-4">
                {reviews.map((r) => (
                  <li
                    key={r.id}
                    className={`rounded-xl border p-4 ${isDark ? 'border-white/[0.08] bg-white/[0.02]' : 'border-slate-200/80 bg-slate-50/80'}`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className={`text-sm font-semibold ${textPrimary(theme)}`}>{r.userName?.trim() || `用户 ${r.userId ?? ''}`}</span>
                      <span className={`text-xs tabular-nums ${textMuted(theme)}`}>{formatDateTime(r.createTime ?? '')}</span>
                    </div>
                    {typeof r.rating === 'number' ? (
                      <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</p>
                    ) : null}
                    {r.comment?.trim() ? <p className={`mt-2 text-sm ${textSecondary(theme)}`}>{r.comment.trim()}</p> : null}
                  </li>
                ))}
              </ul>
              {reviews.length === 0 && !reviewsLoading ? <p className={`text-sm ${textMuted(theme)}`}>暂时还没有评论。</p> : null}
              {reviewsTotal > 20 ? (
                <div className="flex gap-2">
                  <button type="button" disabled={reviewPage <= 1} onClick={() => setReviewPage((p) => Math.max(1, p - 1))} className={`${btnSecondary(theme)} min-h-11`}>
                    上一页
                  </button>
                  <button
                    type="button"
                    disabled={reviewPage * 20 >= reviewsTotal}
                    onClick={() => setReviewPage((p) => p + 1)}
                    className={`${btnSecondary(theme)} min-h-11`}
                  >
                    下一页
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
        </>
      }
      sidebarColumn={
        <div className="space-y-5">
          <div className={`rounded-2xl border p-4 sm:p-5 ${isDark ? 'border-white/[0.08] bg-white/[0.03]' : 'border-slate-200/80 bg-white'}`}>
            <h2 className={`text-sm font-bold ${textPrimary(theme)}`}>获取方式</h2>
            <p className={`mt-2 text-xs leading-relaxed ${textMuted(theme)}`}>
              来源、下载与可复制的 ZIP / 命令行示例。外部条目不在本平台资源目录注册。
            </p>

            <div className="mt-4 space-y-3">
              <div>
                <p className={`text-xs font-semibold ${textPrimary(theme)}`}>来源</p>
                {item.sourceUrl?.trim() ? (
                  <a
                    href={item.sourceUrl.trim()}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-flex min-h-11 items-center gap-1 break-all text-sm text-violet-600 hover:underline dark:text-violet-400"
                  >
                    {item.sourceUrl.trim()}
                    <ExternalLink className="h-4 w-4 shrink-0" aria-hidden />
                  </a>
                ) : (
                  <p className={`mt-1 text-sm ${textMuted(theme)}`}>—</p>
                )}
              </div>

              <div>
                <p className={`text-xs font-semibold ${textPrimary(theme)}`}>下载</p>
                <p className={`mt-1 text-xs ${textMuted(theme)}`}>文件名建议：{zipFileName}</p>
                <button type="button" onClick={triggerDownload} className={`${btnPrimary} mt-3 w-full min-h-11 justify-center`}>
                  <Download className="h-4 w-4" aria-hidden />
                  下载 ZIP
                </button>
              </div>
            </div>
          </div>

          {item.packUrl?.trim() ? (
            <div className={`rounded-2xl border p-4 sm:p-5 ${isDark ? 'border-white/[0.08] bg-white/[0.03]' : 'border-slate-200/80 bg-white'}`}>
              <h3 className={`text-xs font-bold uppercase tracking-wide ${textMuted(theme)}`}>复制</h3>
              <div className="mt-4 space-y-5">
                <CopyCodeBlock theme={theme} label="ZIP 地址" value={item.packUrl.trim()} showMessage={showMessage} />
                {curlExample ? <CopyCodeBlock theme={theme} label="命令行 (curl)" value={curlExample} showMessage={showMessage} /> : null}
                <CopyCodeBlock
                  theme={theme}
                  label="itemKey"
                  value={item.itemKey?.trim() || item.id || ''}
                  showMessage={showMessage}
                />
              </div>
            </div>
          ) : null}

          {skillMdResolvedUrl?.trim() ? (
            <div className={`rounded-2xl border p-4 ${isDark ? 'border-white/[0.08] bg-white/[0.03]' : 'border-slate-200/80 bg-slate-50/80'}`}>
              <p className={`text-xs font-semibold ${textPrimary(theme)}`}>SKILL.md Raw</p>
              <a
                href={skillMdResolvedUrl.trim()}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex min-h-11 items-center gap-1 break-all text-sm text-violet-600 hover:underline dark:text-violet-400"
              >
                打开 Raw
                <ExternalLink className="h-4 w-4 shrink-0" aria-hidden />
              </a>
            </div>
          ) : null}
        </div>
      }
    />
  );
};
