import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Database, FileText, Table2, Image, Mic, Video, Layers, HardDrive, Play, Loader2, MessageSquare, Heart } from 'lucide-react';
import type { Theme, FontSize, ThemeColor } from '../../types';
import type { Dataset, DatasetSourceType, DatasetDataType } from '../../types/dto/dataset';
import { datasetService } from '../../api/services/dataset.service';
import { userActivityService } from '../../api/services/user-activity.service';
import { tagService } from '../../api/services/tag.service';
import { filterTagsForResourceType } from '../../utils/marketTags';
import type { TagItem } from '../../types/dto/tag';
import { resourceCatalogService } from '../../api/services/resource-catalog.service';
import { invokeService } from '../../api/services/invoke.service';
import { nativeInputClass } from '../../utils/formFieldClasses';
import { mapInvokeFlowError } from '../../utils/invokeError';
import { safeOpenHttpUrl } from '../../lib/windowNavigate';
import {
  canvasBodyBg, mainScrollCompositorClass, bentoCard, btnPrimary, btnSecondary,
  textPrimary, textSecondary, textMuted, techBadge,
} from '../../utils/uiClasses';
import { BentoCard } from '../../components/common/BentoCard';
import { GlassPanel } from '../../components/common/GlassPanel';
import { Modal } from '../../components/common/Modal';
import { ResourceReviewsSection } from '../../components/business/ResourceReviewsSection';
import { GrantApplicationModal } from '../../components/business/GrantApplicationModal';
import { useLayoutChrome } from '../../context/LayoutChromeContext';
import { PageError } from '../../components/common/PageError';
import { PageSkeleton } from '../../components/common/PageSkeleton';
import { PageTitleTagline } from '../../components/common/PageTitleTagline';
import { resolvePersonDisplay } from '../../utils/personDisplay';
import { formatDateTime } from '../../utils/formatDateTime';

interface Props { theme: Theme; fontSize: FontSize; themeColor?: ThemeColor; showMessage?: (msg: string, type: 'success' | 'error' | 'info' | 'warning') => void; }

const SOURCE_TABS: { value: DatasetSourceType | ''; label: string }[] = [{ value: '', label: '全部来源' }, { value: 'department', label: '部门数据' }, { value: 'knowledge', label: '知识库' }, { value: 'third_party', label: '第三方' }];
const SOURCE_BADGE: Record<DatasetSourceType, { label: string; cls: string }> = { department: { label: '部门数据', cls: 'text-blue-600 bg-blue-500/10' }, knowledge: { label: '知识库', cls: 'text-emerald-600 bg-emerald-500/10' }, third_party: { label: '第三方', cls: 'text-amber-600 bg-amber-500/10' } };
const DATA_TYPE_BADGE: Record<DatasetDataType, { label: string; cls: string }> = { document: { label: '文档', cls: 'text-slate-600 bg-slate-500/10' }, structured: { label: '结构化', cls: 'text-neutral-900 bg-neutral-900/10' }, image: { label: '图像', cls: 'text-pink-600 bg-pink-500/10' }, audio: { label: '音频', cls: 'text-orange-600 bg-orange-500/10' }, video: { label: '视频', cls: 'text-red-600 bg-red-500/10' }, mixed: { label: '混合', cls: 'text-neutral-900 bg-neutral-900/10' } };
const DATA_TYPE_ICON: Record<DatasetDataType, React.ElementType> = { document: FileText, structured: Table2, image: Image, audio: Mic, video: Video, mixed: Layers };
const ICON_COLORS: Record<DatasetDataType, string> = { document: 'bg-neutral-700', structured: 'bg-neutral-900', image: 'bg-neutral-600', audio: 'bg-neutral-800', video: 'bg-neutral-500', mixed: 'bg-neutral-900' };

function formatFileSize(bytes?: number): string {
  if (typeof bytes !== 'number' || bytes <= 0) return '—';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0) + ' ' + units[i];
}
function formatCount(n?: number): string {
  if (typeof n !== 'number' || n < 0) return '—';
  if (n >= 10000) return (n / 10000).toFixed(1) + '万';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
  return n.toLocaleString();
}

export const DatasetMarket: React.FC<Props> = ({ theme, fontSize: _fontSize, themeColor: _themeColor, showMessage }) => {
  const { chromePageTitle } = useLayoutChrome();
  const isDark = theme === 'dark';
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<Error | null>(null);
  const [keyword, setKeyword] = useState('');
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [catalogTags, setCatalogTags] = useState<TagItem[]>([]);
  const [sourceFilter, setSourceFilter] = useState<DatasetSourceType | ''>('');
  const [detailDataset, setDetailDataset] = useState<Dataset | null>(null);
  const [grantModalOpen, setGrantModalOpen] = useState(false);
  const [invoking, setInvoking] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [invokePayload, setInvokePayload] = useState('{\n  "query": "sample"\n}');
  const [invokeResult, setInvokeResult] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const processedResourceId = useRef<string | null>(null);

  useEffect(() => {
    tagService.list()
      .then((list) => setCatalogTags(filterTagsForResourceType(list, 'dataset')))
      .catch(() => setCatalogTags([]));
  }, []);

  useEffect(() => {
    if (catalogTags.length === 0 && tagFilter !== null) setTagFilter(null);
  }, [catalogTags.length, tagFilter]);

  const loadDatasets = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    void datasetService.list({
      status: 'published',
      pageSize: 50,
      keyword: keyword.trim() || undefined,
      tags: tagFilter ? [tagFilter] : undefined,
    } as any)
      .then((res) => { if (!cancelled) setDatasets(res.list); })
      .catch((err) => {
        if (!cancelled) {
          const error = err instanceof Error ? err : new Error('加载数据集失败');
          setLoadError(error);
          showMessage?.(error.message, 'error');
        }
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [showMessage, keyword, tagFilter]);

  useEffect(() => {
    const cleanup = loadDatasets();
    return cleanup;
  }, [loadDatasets]);

  useEffect(() => {
    const rid = searchParams.get('resourceId');
    if (!rid) {
      processedResourceId.current = null;
      return;
    }
    if (loading || datasets.length === 0) return;
    if (processedResourceId.current === rid) return;
    processedResourceId.current = rid;
    const next = new URLSearchParams(searchParams);
    next.delete('resourceId');
    setSearchParams(next, { replace: true });
    const hit = datasets.find((d) => String(d.id) === String(rid));
    if (hit) {
      setDetailDataset(hit);
    } else {
      showMessage?.('未在已上架列表中找到该数据集，请确认资源已发布且 ID 正确', 'warning');
    }
  }, [loading, datasets, searchParams, setSearchParams, showMessage]);

  const filtered = useMemo(() => {
    let list = datasets;
    if (keyword.trim()) {
      const kw = keyword.toLowerCase();
      list = list.filter((d) =>
        d.displayName.toLowerCase().includes(kw) ||
        d.datasetName.toLowerCase().includes(kw) ||
        d.description.toLowerCase().includes(kw) ||
        (d.tags ?? []).some((t) => t.toLowerCase().includes(kw)),
      );
    }
    if (sourceFilter) list = list.filter((d) => d.sourceType === sourceFilter);
    return list;
  }, [datasets, keyword, sourceFilter]);

  const runInvoke = async (ds: Dataset) => {
    setInvoking(true);
    setInvokeResult(null);
    const trimmed = invokePayload.trim();
    if (trimmed) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed === null || Array.isArray(parsed) || typeof parsed !== 'object') {
          setInvokeResult('调用参数必须是 JSON 对象');
          setInvoking(false);
          return;
        }
      } catch {
        setInvokeResult('调用参数 JSON 解析失败');
        setInvoking(false);
        return;
      }
    }
    try {
      let resolved;
      try {
        resolved = await resourceCatalogService.resolve({ resourceType: 'dataset', resourceId: String(ds.id) });
      } catch (e) {
        setInvokeResult(`${mapInvokeFlowError(e, 'resolve')}\n可保留当前参数后重试解析`);
        return;
      }
      if (resolved.invokeType === 'redirect' && resolved.endpoint) {
        if (!safeOpenHttpUrl(resolved.endpoint)) {
          setInvokeResult('无法打开该地址（仅支持 http/https）');
          return;
        }
        setInvokeResult(`该数据集资源为跳转类型，已打开地址：${resolved.endpoint}`);
        return;
      }
      if (resolved.invokeType === 'metadata') {
        setInvokeResult(`该数据集资源返回元数据：${JSON.stringify(resolved.spec ?? {}, null, 2)}`);
        return;
      }
      try {
        const res = await invokeService.invoke({ resourceType: 'dataset', resourceId: String(ds.id), payload: trimmed ? JSON.parse(trimmed) : undefined });
        setInvokeResult(`状态: ${res.status} (${res.statusCode})\n耗时: ${res.latencyMs}ms\nTraceId: ${res.traceId}\n\n${res.body}`);
      } catch (e) {
        setInvokeResult(`${mapInvokeFlowError(e, 'invoke')}\n数据集市场通常支持 resolve -> metadata/redirect；如需推理调用请通过 Agent/Skill/App 链路发起。`);
      }
    } finally {
      setInvoking(false);
    }
  };

  const handleFavorite = useCallback(async (ds: Dataset) => {
    if (favoriteLoading) return;
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
  }, [favoriteLoading, showMessage]);

  return (
    <div className={`flex-1 flex flex-col min-h-0 overflow-hidden ${canvasBodyBg(theme)}`}>
      <div className={`flex-1 min-h-0 overflow-y-auto custom-scrollbar px-2 sm:px-3 lg:px-4 py-2 sm:py-3 ${mainScrollCompositorClass}`}>
        <div className={`${bentoCard(theme)} overflow-hidden p-4 sm:p-6 lg:p-8`}>
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className={`shrink-0 rounded-xl p-2 ${isDark ? 'bg-emerald-500/15' : 'bg-emerald-50'}`}><Database size={22} className="text-emerald-500" /></div>
            <PageTitleTagline
              subtitleOnly
              theme={theme}
              title={chromePageTitle || '数据集'}
              tagline="浏览与检索可用数据集"
              suffix={
                datasets.length > 0 ? (
                  <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full ${isDark ? 'bg-white/5 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>{datasets.length}</span>
                ) : null
              }
            />
          </div>
          <GlassPanel theme={theme} padding="sm" className="!p-0 w-full sm:w-72">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input type="text" placeholder="搜索数据集…" value={keyword} onChange={(e) => setKeyword(e.target.value)} className={`w-full bg-transparent pl-9 pr-3 py-2.5 text-sm outline-none ${textPrimary(theme)}`} />
            </div>
          </GlassPanel>
        </div>

        {/* Source type (independent from /tags) */}
        <div className="flex flex-wrap gap-2 mb-3 items-center">
          <span className={`text-xs font-medium shrink-0 ${textMuted(theme)}`}>来源：</span>
          {SOURCE_TABS.map((tab) => (
            <button key={tab.value || 'all'} type="button" onClick={() => setSourceFilter(tab.value)} className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${sourceFilter === tab.value ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-500/20' : isDark ? 'text-slate-400 hover:bg-white/5' : 'text-slate-600 hover:bg-slate-100'}`}>{tab.label}</button>
          ))}
        </div>

        {catalogTags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-5 items-center">
            <span className={`text-xs font-medium shrink-0 ${textMuted(theme)}`}>标签：</span>
            <button type="button" onClick={() => setTagFilter(null)} className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${tagFilter === null ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-500/20' : isDark ? 'text-slate-400 hover:bg-white/5' : 'text-slate-600 hover:bg-slate-100'}`}>全部标签</button>
            {catalogTags.map((t) => (
              <button key={t.id} type="button" onClick={() => setTagFilter((p) => (p === t.name ? null : t.name))} className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${tagFilter === t.name ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-500/20' : isDark ? 'text-slate-400 hover:bg-white/5' : 'text-slate-600 hover:bg-slate-100'}`}>{t.name}</button>
            ))}
          </div>
        )}

        {/* Grid */}
        {loading ? <PageSkeleton type="cards" />
        : loadError ? <PageError error={loadError} onRetry={() => { loadDatasets(); }} retryLabel="重试加载数据集市场" />
        : filtered.length === 0 ? <div className="text-center py-20"><p className={`text-lg font-medium ${textMuted(theme)}`}>暂无匹配的数据集</p><p className={`text-sm mt-1 ${textMuted(theme)}`}>尝试调整搜索关键词、来源或标签筛选</p></div>
        : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((ds) => {
              const sourceType = ds.sourceType ?? 'knowledge';
              const dataType = ds.dataType ?? 'mixed';
              const srcBadge = SOURCE_BADGE[sourceType] ?? { label: '—', cls: 'text-slate-600 bg-slate-500/10' };
              const dtBadge = DATA_TYPE_BADGE[dataType] ?? { label: '—', cls: 'text-slate-600 bg-slate-500/10' };
              const IconComp = DATA_TYPE_ICON[dataType] ?? FileText;
              const iconColor = ICON_COLORS[dataType] ?? 'bg-slate-500';
              return (
                <BentoCard key={ds.id} theme={theme} hover glow="emerald" padding="md" className="flex flex-col h-full !rounded-[20px]">
                  <div className="flex items-start gap-3 mb-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 ${iconColor}`}><IconComp size={18} /></div>
                    <div className="min-w-0 flex-1"><h3 className={`font-semibold truncate ${textPrimary(theme)}`}>{ds.displayName}</h3></div>
                  </div>
                  <p className={`text-sm leading-relaxed mb-3 line-clamp-2 ${textSecondary(theme)}`}>{ds.description || '暂无描述'}</p>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${srcBadge.cls}`}>{srcBadge.label}</span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${dtBadge.cls}`}>{dtBadge.label}</span>
                    <span className={techBadge(theme)}>{ds.format.toUpperCase()}</span>
                  </div>
                  <div className={`flex items-center gap-4 text-xs mb-3 ${textMuted(theme)}`}>
                    <span className="flex items-center gap-1"><HardDrive size={12} />{formatFileSize(ds.fileSize)}</span>
                    <span>{formatCount(ds.recordCount)} 条记录</span>
                    {(ds as any).createdByName || (ds as any).createdBy ? (
                      <span>{resolvePersonDisplay({ names: [(ds as any).createdByName], ids: [(ds as any).createdBy] })}</span>
                    ) : null}
                    {ds.createTime && <span>{formatDateTime(ds.createTime)}</span>}
                  </div>
                  {(ds.tags ?? []).length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {(ds.tags ?? []).slice(0, 4).map((tag) => <span key={tag} className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${isDark ? 'bg-white/5 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>{tag}</span>)}
                      {(ds.tags ?? []).length > 4 && <span className={`text-xs ${textMuted(theme)}`}>+{(ds.tags ?? []).length - 4}</span>}
                    </div>
                  )}
                  <div className={`flex items-center justify-end pt-3 border-t mt-auto ${isDark ? 'border-white/[0.08]' : 'border-slate-200/40'}`}>
                    <button type="button" onClick={() => setDetailDataset(ds)} className={`${btnPrimary} !py-1.5 !px-3 !text-xs`}>查看详情</button>
                  </div>
                </BentoCard>
              );
            })}
          </div>
        )}
        </div>
      </div>

      {/* Detail modal */}
      <Modal open={!!detailDataset} onClose={() => { setDetailDataset(null); setGrantModalOpen(false); }} title={detailDataset?.displayName ?? ''} theme={theme} size="md" footer={
        <><button type="button" className={btnSecondary(theme)} onClick={() => setDetailDataset(null)}>关闭</button>
        <button type="button" className={`${btnSecondary(theme)} disabled:opacity-50`} disabled={favoriteLoading || !detailDataset} onClick={() => detailDataset && void handleFavorite(detailDataset)}>
          {favoriteLoading ? <><Loader2 size={14} className="animate-spin" /> 收藏中…</> : <><Heart size={14} /> 收藏</>}
        </button>
        <button type="button" className={`${btnSecondary(theme)} disabled:opacity-50`} disabled={invoking} onClick={() => detailDataset && void runInvoke(detailDataset)}>
          {invoking ? <><Loader2 size={14} className="animate-spin" /> 调用中…</> : <><Play size={14} /> 调用</>}
        </button>
        <button type="button" className={btnPrimary} onClick={() => { if (detailDataset) setGrantModalOpen(true); }}>申请使用</button></>
      }>
        {detailDataset && (() => {
          const ds = detailDataset;
          const sourceType = ds.sourceType ?? 'knowledge';
          const dataType = ds.dataType ?? 'mixed';
          const srcBadge = SOURCE_BADGE[sourceType] ?? { label: '—', cls: 'text-slate-600 bg-slate-500/10' };
          const dtBadge = DATA_TYPE_BADGE[dataType] ?? { label: '—', cls: 'text-slate-600 bg-slate-500/10' };
          return (
            <div className="space-y-4">
              <p className={`text-sm leading-relaxed ${textSecondary(theme)}`}>{ds.description || '暂无描述'}</p>
              <div className="flex flex-wrap gap-1.5">
                <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium ${srcBadge.cls}`}>{srcBadge.label}</span>
                <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium ${dtBadge.cls}`}>{dtBadge.label}</span>
                <span className={techBadge(theme)}>{ds.format.toUpperCase()}</span>
              </div>
              <div className={`grid grid-cols-2 gap-3 ${bentoCard(theme)} p-4`}>
                <div><div className={`text-[11px] font-medium ${textMuted(theme)}`}>记录数</div><div className={`text-base font-bold ${textPrimary(theme)}`}>{formatCount(ds.recordCount)}</div></div>
                <div><div className={`text-[11px] font-medium ${textMuted(theme)}`}>文件大小</div><div className={`text-base font-bold ${textPrimary(theme)}`}>{formatFileSize(ds.fileSize)}</div></div>
              </div>
              <div>
                <div className={`text-xs font-semibold mb-2 ${textSecondary(theme)}`}>调用参数（JSON 对象）</div>
                <textarea
                  rows={5}
                  value={invokePayload}
                  onChange={(e) => setInvokePayload(e.target.value)}
                  className={`${nativeInputClass(theme)} resize-none font-mono text-xs`}
                />
                {invokeResult && (
                  <pre className={`mt-3 max-h-72 overflow-auto rounded-xl border p-3 text-xs ${
                    isDark ? 'border-white/10 bg-white/[0.03] text-slate-200' : 'border-slate-200 bg-slate-50 text-slate-700'
                  }`}>{invokeResult}</pre>
                )}
              </div>
              {(ds.tags ?? []).length > 0 && (
                <div>
                  <div className={`text-xs font-semibold mb-2 ${textSecondary(theme)}`}>标签</div>
                  <div className="flex flex-wrap gap-1.5">
                    {(ds.tags ?? []).map((tag) => <span key={tag} className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${isDark ? 'bg-white/5 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>{tag}</span>)}
                  </div>
                </div>
              )}
              <div>
                <h4 className={`font-bold text-base mb-4 flex items-center gap-2 ${textPrimary(theme)}`}>
                  <MessageSquare size={18} className="text-emerald-500" />
                  评分与评论
                </h4>
                <ResourceReviewsSection
                  targetType="dataset"
                  targetId={ds.id}
                  theme={theme}
                  showMessage={showMessage}
                />
              </div>
            </div>
          );
        })()}
      </Modal>
      <GrantApplicationModal
        open={grantModalOpen}
        onClose={() => setGrantModalOpen(false)}
        theme={theme}
        resourceType="dataset"
        resourceId={detailDataset?.id ?? ''}
        resourceName={detailDataset?.displayName}
        showMessage={showMessage}
      />
    </div>
  );
};
