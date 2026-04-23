import React, { useCallback, useEffect, useState } from 'react';
import { FileSearch, FileText, Heart, Image, Layers, Loader2, MessageSquare, Mic, Table2, Video } from 'lucide-react';
import type { Theme, FontSize, ThemeColor } from '../../types';
import type { Dataset, DatasetDataType, DatasetSourceType } from '../../types/dto/dataset';
import { datasetService } from '../../api/services/dataset.service';
import { userActivityService } from '../../api/services/user-activity.service';
import { resourceCatalogService } from '../../api/services/resource-catalog.service';
import { mapInvokeFlowError } from '../../utils/invokeError';
import { safeOpenHttpUrl } from '../../lib/windowNavigate';
import { btnPrimary, btnSecondary, textPrimary, textSecondary, textMuted, techBadge } from '../../utils/uiClasses';
import { ResourceMarketDetailShell } from '../../components/market';
import { ResourceReviewsSection } from '../../components/business/ResourceReviewsSection';
import { GatewayApiKeyInput } from '../../components/common/GatewayApiKeyInput';
import { PageError } from '../../components/common/PageError';
import { PageSkeleton } from '../../components/common/PageSkeleton';
import { usePersistedGatewayApiKey } from '../../hooks/usePersistedGatewayApiKey';
import { ApiException } from '../../types/api';
import { MarkdownView } from '../../components/common/MarkdownView';
import type { ResourceBindingSummaryVO } from '../../types/dto/catalog';
import { BindingClosureSection } from '../../components/business/BindingClosureSection';

export interface DatasetMarketDetailPageProps {
  resourceId: string;
  theme: Theme;
  fontSize: FontSize;
  themeColor: ThemeColor;
  showMessage?: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  onNavigateToList: () => void;
}

const SOURCE_BADGE: Record<DatasetSourceType, { label: string; cls: string }> = {
  department: { label: '部门数据', cls: 'text-blue-600 bg-blue-500/10 dark:text-blue-200 dark:bg-blue-500/15' },
  knowledge: { label: '知识库', cls: 'text-emerald-600 bg-emerald-500/10 dark:text-emerald-200 dark:bg-emerald-500/15' },
  third_party: { label: '第三方', cls: 'text-amber-600 bg-amber-500/10 dark:text-amber-200 dark:bg-amber-500/15' },
};

const DATA_TYPE_BADGE: Record<DatasetDataType, { label: string; cls: string }> = {
  document: { label: '文档', cls: 'text-slate-600 bg-slate-500/10 dark:text-slate-300 dark:bg-white/10' },
  structured: { label: '结构化', cls: 'text-neutral-900 bg-neutral-900/10 dark:text-neutral-100 dark:bg-white/10' },
  image: { label: '图像', cls: 'text-pink-600 bg-pink-500/10 dark:text-pink-200 dark:bg-pink-500/15' },
  audio: { label: '音频', cls: 'text-orange-600 bg-orange-500/10 dark:text-orange-200 dark:bg-orange-500/15' },
  video: { label: '视频', cls: 'text-red-600 bg-red-500/10 dark:text-red-200 dark:bg-red-500/15' },
  mixed: { label: '混合', cls: 'text-neutral-900 bg-neutral-900/10 dark:text-neutral-100 dark:bg-white/10' },
};

const DATA_TYPE_ICON: Record<DatasetDataType, React.ElementType> = {
  document: FileText,
  structured: Table2,
  image: Image,
  audio: Mic,
  video: Video,
  mixed: Layers,
};

const ICON_COLORS: Record<DatasetDataType, string> = {
  document: 'bg-neutral-700',
  structured: 'bg-neutral-900',
  image: 'bg-neutral-600',
  audio: 'bg-neutral-800',
  video: 'bg-neutral-500',
  mixed: 'bg-neutral-900',
};

function formatFileSize(bytes?: number): string {
  if (typeof bytes !== 'number' || bytes <= 0) return '—';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

function formatCount(n?: number): string {
  if (typeof n !== 'number' || n < 0) return '—';
  if (n >= 10000) return `${(n / 10000).toFixed(1)}万`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return n.toLocaleString();
}

export const DatasetMarketDetailPage: React.FC<DatasetMarketDetailPageProps> = ({
  resourceId,
  theme,
  fontSize: _fontSize,
  themeColor: _themeColor,
  showMessage,
  onNavigateToList,
}) => {
  const isDark = theme === 'dark';
  const [ds, setDs] = useState<Dataset | null>(null);
  const [bindingClosure, setBindingClosure] = useState<ResourceBindingSummaryVO[] | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [tab, setTab] = useState<'intro' | 'files' | 'reviews'>('intro');
  const [invoking, setInvoking] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [invokeResult, setInvokeResult] = useState<string | null>(null);
  const [gatewayApiKeyDraft, setGatewayApiKeyDraft] = usePersistedGatewayApiKey();

  const load = useCallback(async () => {
    const id = Number(resourceId);
    if (!Number.isFinite(id)) {
      setError(new Error('无效的数据集 ID'));
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [data, detail] = await Promise.all([
        datasetService.getById(id),
        resourceCatalogService.getByTypeAndId('dataset', String(id), 'closure').catch(() => null),
      ]);
      setDs(data);
      setBindingClosure(detail?.bindingClosure);
    } catch (e) {
      setDs(null);
      setBindingClosure(undefined);
      setError(e instanceof Error ? e : new Error('加载失败'));
    } finally {
      setLoading(false);
    }
  }, [resourceId]);

  useEffect(() => {
    void load();
  }, [load]);

  const runResolve = useCallback(async () => {
    if (!ds) return;
    setInvoking(true);
    setInvokeResult(null);
    try {
      const apiKey = gatewayApiKeyDraft.trim();
      if (!apiKey) {
        setInvokeResult('请先填写并绑定有效的 X-Api-Key（创建 Key 时的完整 secretPlain）');
        return;
      }
      let resolved;
      try {
        resolved = await resourceCatalogService.resolve(
          { resourceType: 'dataset', resourceId: String(ds.id) },
          { headers: { 'X-Api-Key': apiKey } },
        );
      } catch (err) {
        if (err instanceof ApiException && err.code === 1009) {
          setInvokeResult(err.message || '请绑定有效的 X-Api-Key（创建 Key 时的完整 secretPlain）');
        } else if (err instanceof ApiException && (err.status === 401 || err.code === 1002)) {
          setInvokeResult('请先选择有效 API Key');
        } else if (err instanceof ApiException && (err.status === 403 || err.code === 1003)) {
          setInvokeResult('调用被拒绝：请确认资源已发布，且当前 API Key 具备 resolve 等所需 scope。');
        } else if (err instanceof Error && (err.message.includes('X-Api-Key') || err.message.includes('API Key'))) {
          setInvokeResult('请先填写并绑定 API Key');
        } else {
          setInvokeResult(`${mapInvokeFlowError(err, 'resolve')}\n请确认 Key 有效且 scope 覆盖 resolve 后重试`);
        }
        return;
      }
      if (resolved.invokeType === 'redirect' && resolved.endpoint) {
        if (!safeOpenHttpUrl(resolved.endpoint)) {
          setInvokeResult('无法打开该地址（仅支持 http/https）');
          return;
        }
        setInvokeResult(`该数据集为跳转类型，已打开地址：${resolved.endpoint}`);
        return;
      }
      if (resolved.invokeType === 'metadata') {
        setInvokeResult(`resolve 元数据：${JSON.stringify(resolved.spec ?? {}, null, 2)}`);
        return;
      }
      setInvokeResult(
        `resolve 返回 invokeType=${resolved.invokeType ?? '未知'}。\n` +
          '数据集在本平台以目录与元数据为主，不提供与 Agent/MCP/App 相同的统一 invoke；若需消费数据请按业务约定对接或由专用应用承载。',
      );
    } finally {
      setInvoking(false);
    }
  }, [ds, gatewayApiKeyDraft]);

  const handleFavorite = useCallback(async () => {
    if (!ds || favoriteLoading) return;
    setFavoriteLoading(true);
    try {
      await userActivityService.addFavorite('dataset', Number(ds.id));
      showMessage?.('已加入我的收藏', 'success');
    } catch (e) {
      const message = e instanceof Error ? e.message : '收藏失败';
      if (message.includes('FAVORITE_EXISTS') || message.includes('已收藏')) {
        showMessage?.('该资源已在收藏夹中', 'info');
      } else {
        showMessage?.(message, 'error');
      }
    } finally {
      setFavoriteLoading(false);
    }
  }, [ds, favoriteLoading, showMessage]);

  if (loading) return <PageSkeleton type="detail" />;
  if (error || !ds) {
    return (
      <div className="px-4 py-8">
        <PageError error={error ?? new Error('未找到数据集')} onRetry={() => void load()} retryLabel="重试" />
        <button type="button" className={`mt-4 ${btnSecondary(theme)}`} onClick={onNavigateToList}>
          返回市场
        </button>
      </div>
    );
  }

  const title = ds.displayName ?? ds.name;
  const sourceType = ds.sourceType ?? 'knowledge';
  const dataType = ds.dataType ?? 'mixed';
  const srcBadge = SOURCE_BADGE[sourceType] ?? { label: '—', cls: 'text-slate-600 bg-slate-500/10' };
  const dtBadge = DATA_TYPE_BADGE[dataType] ?? { label: '—', cls: 'text-slate-600 bg-slate-500/10' };
  const fmt = ds.format?.trim() ? ds.format.toUpperCase() : '—';
  const IconComp = DATA_TYPE_ICON[dataType] ?? FileText;
  const iconColor = ICON_COLORS[dataType] ?? 'bg-slate-500';

  return (
    <>
      <ResourceMarketDetailShell
        theme={theme}
        onBack={onNavigateToList}
        backLabel="返回数据集"
        titleBlock={(
          <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start">
            <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-white ${iconColor}`}>
              <IconComp size={22} aria-hidden />
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <h1 className={`text-2xl font-bold tracking-tight sm:text-3xl ${textPrimary(theme)}`}>{title}</h1>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className={`inline-flex items-center rounded-md px-2 py-0.5 font-semibold ${srcBadge.cls}`}>{srcBadge.label}</span>
                <span className={`inline-flex items-center rounded-md px-2 py-0.5 font-semibold ${dtBadge.cls}`}>{dtBadge.label}</span>
                <span className={techBadge(theme)}>{fmt}</span>
                <span className={`truncate font-mono ${textMuted(theme)}`}>@{ds.name}</span>
              </div>
            </div>
          </div>
        )}
        headerActions={(
          <>
            <button
              type="button"
              className={`${btnSecondary(theme)} min-h-11 disabled:opacity-50`}
              disabled={favoriteLoading}
              onClick={() => void handleFavorite()}
            >
              {favoriteLoading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  收藏中…
                </>
              ) : (
                <>
                  <Heart size={14} />
                  收藏
                </>
              )}
            </button>
          </>
        )}
        tabs={[
          { id: 'intro', label: '数据集介绍' },
          { id: 'files', label: '数据集文件' },
          { id: 'reviews', label: '评分评论', badge: Math.max(0, Math.floor(Number(ds.reviewCount ?? 0)) || 0) },
        ]}
        activeTabId={tab}
        onTabChange={(id) => setTab(id as 'intro' | 'files' | 'reviews')}
        mainColumn={(
          <div
            className={`rounded-[28px] border p-6 shadow-[0_8px_24px_-4px_rgba(0,0,0,0.02)] ${
              isDark ? 'border-white/10 bg-lantu-elevated' : 'border-transparent bg-white'
            }`}
          >
            {tab === 'intro' ? (
              <div className="space-y-4">
                {ds.serviceDetailMd?.trim() ? (
                  <MarkdownView value={ds.serviceDetailMd} className="text-sm" />
                ) : (
                  <p className={`text-sm ${textMuted(theme)}`}>
                    暂无详细介绍；资源所有方可在「资源注册」中填写「数据集介绍」，正文支持 Markdown。
                  </p>
                )}
                <p className={`text-sm leading-relaxed ${textSecondary(theme)}`}>{ds.description || '暂无描述'}</p>
                <div className={`grid grid-cols-2 gap-3 rounded-2xl border p-4 ${
                  isDark ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200/80 bg-slate-50/80'
                }`}
                >
                  <div>
                    <div className={`text-xs font-medium ${textMuted(theme)}`}>记录数</div>
                    <div className={`text-base font-bold ${textPrimary(theme)}`}>{formatCount(ds.recordCount)}</div>
                  </div>
                  <div>
                    <div className={`text-xs font-medium ${textMuted(theme)}`}>文件大小</div>
                    <div className={`text-base font-bold ${textPrimary(theme)}`}>{formatFileSize(ds.fileSize)}</div>
                  </div>
                </div>
                {(ds.tags ?? []).length > 0 && (
                  <div>
                    <div className={`mb-2 text-xs font-semibold ${textSecondary(theme)}`}>标签</div>
                    <div className="flex flex-wrap gap-1.5">
                      {(ds.tags ?? []).map((tag) => (
                        <span
                          key={tag}
                          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                            isDark ? 'bg-white/5 text-slate-300' : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : tab === 'files' ? (
              <div className="space-y-4">
                <GatewayApiKeyInput theme={theme} id="dataset-detail-gateway-key" value={gatewayApiKeyDraft} onChange={setGatewayApiKeyDraft} />
                <p className={`text-xs leading-relaxed ${textMuted(theme)}`}>
                  使用您的 API Key 调用 <span className="font-mono text-xs">POST /catalog/resolve</span>
                  （resourceType=dataset）查看目录返回；本平台不对数据集暴露统一{' '}
                  <span className="font-mono text-xs">/invoke</span>。
                </p>
                <button
                  type="button"
                  className={`${btnSecondary(theme)} inline-flex min-h-11 items-center justify-center gap-2 disabled:opacity-50`}
                  disabled={invoking}
                  onClick={() => void runResolve()}
                >
                  {invoking ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      解析中…
                    </>
                  ) : (
                    <>
                      <FileSearch size={16} aria-hidden />
                      解析目录
                    </>
                  )}
                </button>
                <div>
                  <div className={`mb-2 text-xs font-semibold ${textSecondary(theme)}`}>resolve 结果</div>
                  <pre
                    className={`max-h-72 min-h-[4.5rem] overflow-auto rounded-xl border p-3 text-xs ${
                      isDark ? 'border-white/10 bg-white/[0.03] text-slate-200' : 'border-slate-200 bg-slate-50 text-slate-700'
                    }`}
                  >
                    {invokeResult ?? '点击「解析目录」后在此展示 resolve 返回。'}
                  </pre>
                </div>
              </div>
            ) : (
              <div>
                <h4 className={`mb-4 flex items-center gap-2 text-base font-bold ${textPrimary(theme)}`}>
                  <MessageSquare size={18} className="text-emerald-500" aria-hidden />
                  评分与评论
                </h4>
                <ResourceReviewsSection targetType="dataset" targetId={ds.id} theme={theme} showMessage={showMessage} />
              </div>
            )}
          </div>
        )}
        sidebarColumn={(
          <div className="space-y-3">
            <div
              className={`rounded-2xl border p-4 text-sm ${isDark ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200/80 bg-slate-50/80'}`}
            >
              <p className={`text-xs font-semibold ${textSecondary(theme)}`}>目录说明</p>
              <p className={`mt-2 text-xs leading-relaxed ${textMuted(theme)}`}>
                数据集详情独立加载，无需依赖列表分页；直链刷新亦可浏览元数据、解析与评论。
              </p>
            </div>
            <BindingClosureSection theme={theme} currentResourceId={String(ds.id)} items={bindingClosure} />
          </div>
        )}
      />
    </>
  );
};
