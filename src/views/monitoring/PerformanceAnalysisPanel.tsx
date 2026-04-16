import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { EChartsOption } from 'echarts';
import { Activity, BarChart3, Download, ExternalLink, GitBranch, ListFilter, Timer } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Theme } from '../../types';
import { monitoringService } from '../../api/services/monitoring.service';
import { buildPath } from '../../constants/consoleRoutes';
import { RESOURCE_TYPES, resourceTypeLabel } from '../../constants/resourceTypes';
import { useAlertRuleScopeOptions, usePerformanceAnalysis, useQualityHistory } from '../../hooks/queries/useMonitoring';
import type {
  CallLogEntry,
  PerformanceBucket,
  PerformanceResourceLeaderboardItem,
  PerformanceWindow,
  QualityHistoryPoint,
} from '../../types/dto/monitoring';
import { BentoCard } from '../../components/common/BentoCard';
import { EmptyState } from '../../components/common/EmptyState';
import { FilterSelect, Modal } from '../../components/common';
import { EChartCard } from '../../components/charts/EChartCard';
import {
  baseAxis,
  baseGrid,
  baseLegend,
  baseTooltip,
  chartColors,
  lineSeriesTrendStyle,
} from '../../components/charts/echartsTheme';
import { PageError } from '../../components/common/PageError';
import { PageSkeleton } from '../../components/common/PageSkeleton';
import { formatDateTime } from '../../utils/formatDateTime';
import {
  bentoCard,
  btnGhost,
  btnPrimary,
  btnSecondary,
  pageBlockStack,
  tableBodyRow,
  tableCell,
  tableHeadCell,
  textMuted,
  textPrimary,
  textSecondary,
} from '../../utils/uiClasses';

interface PerformanceAnalysisPanelProps {
  theme: Theme;
  showMessage: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

const WINDOW_OPTIONS: Array<{ value: PerformanceWindow; label: string }> = [
  { value: '6h', label: '近 6 小时' },
  { value: '24h', label: '近 24 小时' },
  { value: '7d', label: '近 7 天' },
];

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function formatLatency(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '0 ms';
  return `${Math.round(value)} ms`;
}

function formatBucketLabel(bucket: string): string {
  const text = String(bucket ?? '').trim();
  if (!text) return '--';
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return text;
  if (text.includes(':00:00')) {
    return `${String(date.getHours()).padStart(2, '0')}:00`;
  }
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function buildTrendOption(theme: Theme, buckets: PerformanceBucket[]): EChartsOption {
  const colors = chartColors(theme);
  const axis = baseAxis(theme);
  const labels = buckets.map((bucket) => formatBucketLabel(bucket.bucket));
  const categoryAxis = axis.category as Record<string, unknown>;
  return {
    title: {
      text: '调用量 / 失败量趋势',
      left: 10,
      top: 6,
      textStyle: { fontSize: 13, fontWeight: 600, color: colors.text },
    },
    color: [colors.series[0], colors.series[2] ?? colors.series[1]],
    grid: baseGrid(),
    tooltip: baseTooltip(theme),
    legend: { ...baseLegend(theme), data: ['请求数', '错误数'] },
    xAxis: { ...categoryAxis, type: 'category', data: labels } as EChartsOption['xAxis'],
    yAxis: { ...axis.value },
    series: [
      {
        name: '请求数',
        type: 'line',
        data: buckets.map((bucket) => bucket.requestCount),
        ...lineSeriesTrendStyle(theme, colors.series[0], true),
      },
      {
        name: '错误数',
        type: 'line',
        data: buckets.map((bucket) => bucket.errorCount),
        ...lineSeriesTrendStyle(theme, colors.series[2] ?? colors.series[1], false),
      },
    ],
  };
}

function buildLatencyOption(theme: Theme, buckets: PerformanceBucket[]): EChartsOption {
  const colors = chartColors(theme);
  const axis = baseAxis(theme);
  const labels = buckets.map((bucket) => formatBucketLabel(bucket.bucket));
  const categoryAxis = axis.category as Record<string, unknown>;
  return {
    title: {
      text: '延迟分位走势',
      left: 10,
      top: 6,
      textStyle: { fontSize: 13, fontWeight: 600, color: colors.text },
    },
    color: colors.series,
    grid: baseGrid(),
    tooltip: baseTooltip(theme),
    legend: { ...baseLegend(theme), data: ['P50', 'P95', 'P99'] },
    xAxis: { ...categoryAxis, type: 'category', data: labels } as EChartsOption['xAxis'],
    yAxis: { ...axis.value, name: 'ms' },
    series: [
      {
        name: 'P50',
        data: buckets.map((bucket) => bucket.p50LatencyMs),
        ...lineSeriesTrendStyle(theme, colors.series[0], true),
      },
      {
        name: 'P95',
        data: buckets.map((bucket) => bucket.p95LatencyMs),
        ...lineSeriesTrendStyle(theme, colors.series[1] ?? colors.series[0], false),
      },
      {
        name: 'P99',
        data: buckets.map((bucket) => bucket.p99LatencyMs),
        ...lineSeriesTrendStyle(theme, colors.series[2] ?? colors.series[1], false),
      },
    ],
  };
}

function buildQualityOption(theme: Theme, points: QualityHistoryPoint[]): EChartsOption {
  const colors = chartColors(theme);
  const axis = baseAxis(theme);
  const labels = points.map((point) => formatBucketLabel(point.bucketTime));
  const categoryAxis = axis.category as Record<string, unknown>;
  return {
    title: {
      text: '质量历史',
      left: 10,
      top: 6,
      textStyle: { fontSize: 13, fontWeight: 600, color: colors.text },
    },
    color: colors.series,
    grid: baseGrid(),
    tooltip: baseTooltip(theme),
    legend: { ...baseLegend(theme), data: ['质量分', '成功率', '平均延迟'] },
    xAxis: { ...categoryAxis, type: 'category', data: labels } as EChartsOption['xAxis'],
    yAxis: [
      { ...axis.value, name: 'score/%' },
      { ...axis.value, name: 'ms' },
    ],
    series: [
      {
        name: '质量分',
        data: points.map((point) => point.qualityScore),
        ...lineSeriesTrendStyle(theme, colors.series[0], true),
      },
      {
        name: '成功率',
        data: points.map((point) => Number((point.successRate * 100).toFixed(1))),
        ...lineSeriesTrendStyle(theme, colors.series[1] ?? colors.series[0], false),
      },
      {
        name: '平均延迟',
        yAxisIndex: 1,
        data: points.map((point) => point.avgLatencyMs),
        ...lineSeriesTrendStyle(theme, colors.series[2] ?? colors.series[1], false),
      },
    ],
  };
}

function exportAnalysisSnapshot(payload: unknown) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `performance-analysis-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

const ResourceDetailModal: React.FC<{
  theme: Theme;
  item: PerformanceResourceLeaderboardItem | null;
  open: boolean;
  onClose: () => void;
  showMessage: (msg: string, type?: 'success' | 'error' | 'info') => void;
}> = ({ theme, item, open, onClose, showMessage }) => {
  const navigate = useNavigate();
  const historyQ = useQualityHistory(item?.resourceType ?? 'agent', item?.resourceId ?? 0);
  const recentLogsQ = useQuery({
    queryKey: ['performance-analysis', 'resource-logs', item?.resourceType, item?.resourceId, item?.resourceName],
    queryFn: async () => {
      const page = await monitoringService.listCallLogs({
        page: 1,
        pageSize: 5,
        resourceType: item?.resourceType,
        resourceId: item?.resourceId,
      });
      return page.list;
    },
    enabled: open && Boolean(item?.resourceName),
  });

  const qualityOption = useMemo(
    () => buildQualityOption(theme, historyQ.data ?? []),
    [theme, historyQ.data],
  );

  const openCallLogs = () => {
    if (!item) return;
    const params = new URLSearchParams();
    if (item.resourceType) params.set('resourceType', item.resourceType);
    if (item.resourceId) params.set('resourceId', String(item.resourceId));
    if (item.resourceName) params.set('q', item.resourceName);
    navigate(`${buildPath('admin', 'call-logs')}?${params.toString()}`);
  };

  const openTrace = (traceId?: string) => {
    const params = new URLSearchParams();
    if (traceId) params.set('q', traceId);
    navigate(`${buildPath('admin', 'agent-trace')}${params.toString() ? `?${params.toString()}` : ''}`);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={item ? `${item.resourceName}` : '资源详情'}
      theme={theme}
      size="xl"
    >
      {item ? (
        <div className={pageBlockStack}>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${item.lowSample ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-200/70' : 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/70'}`}>
              {item.lowSample ? '低样本' : '样本稳定'}
            </span>
            <span className={`text-sm ${textSecondary(theme)}`}>
              {resourceTypeLabel(item.resourceType)} #{item.resourceId ?? '--'}
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { label: '请求数', value: item.requestCount },
              { label: '错误率', value: formatPercent(item.errorRate) },
              { label: '超时率', value: formatPercent(item.timeoutRate) },
              { label: '平均延迟', value: formatLatency(item.avgLatencyMs) },
              { label: 'P99', value: formatLatency(item.p99LatencyMs) },
            ].map((card) => (
              <BentoCard key={card.label} theme={theme} padding="sm">
                <div className={`text-xs font-medium ${textMuted(theme)}`}>{card.label}</div>
                <div className={`mt-2 text-xl font-semibold ${textPrimary(theme)}`}>{card.value}</div>
              </BentoCard>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className={btnPrimary} onClick={openCallLogs}>
              <ExternalLink size={15} aria-hidden />
              查看调用日志
            </button>
            <button type="button" className={btnSecondary(theme)} onClick={() => openTrace()}>
              <GitBranch size={15} aria-hidden />
              打开追踪页
            </button>
          </div>

          {historyQ.isLoading ? (
            <PageSkeleton type="chart" />
          ) : historyQ.isError ? (
            <PageError error={historyQ.error as Error} onRetry={() => historyQ.refetch()} />
          ) : (historyQ.data?.length ?? 0) > 0 ? (
            <EChartCard theme={theme} option={qualityOption} minHeight={280} aria-label="质量历史图表" />
          ) : (
            <EmptyState title="暂无质量历史" description="这个资源在当前窗口内还没有足够的质量样本。" />
          )}

          <BentoCard theme={theme}>
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className={`text-sm font-semibold ${textPrimary(theme)}`}>最近调用记录</div>
                <div className={`mt-1 text-xs ${textMuted(theme)}`}>这里会展示最近 5 条与当前资源名称匹配的网关调用。</div>
              </div>
              <button type="button" className={btnGhost(theme)} onClick={() => void recentLogsQ.refetch()}>
                刷新
              </button>
            </div>

            {recentLogsQ.isLoading ? (
              <div className="mt-4"><PageSkeleton type="table" rows={3} /></div>
            ) : recentLogsQ.isError ? (
              <div className="mt-4"><PageError error={recentLogsQ.error as Error} onRetry={() => recentLogsQ.refetch()} /></div>
            ) : (recentLogsQ.data?.length ?? 0) === 0 ? (
              <div className={`mt-4 text-sm ${textMuted(theme)}`}>当前资源还没有可展示的最近调用。</div>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      {['时间', '方法', '状态', '延迟', 'Trace'].map((header) => (
                        <th key={header} className={tableHeadCell(theme)}>{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(recentLogsQ.data ?? []).map((log, index) => (
                      <tr key={`${log.id}-${log.createdAt}`} className={tableBodyRow(theme, index)}>
                        <td className={tableCell()}>{formatDateTime(log.createdAt)}</td>
                        <td className={`${tableCell()} font-mono`}>{log.method}</td>
                        <td className={tableCell()}>{log.status}</td>
                        <td className={tableCell()}>{formatLatency(log.latencyMs)}</td>
                        <td className={tableCell()}>
                          {log.traceId ? (
                            <button
                              type="button"
                              className="text-sky-600 hover:text-sky-700 underline-offset-2 hover:underline"
                              onClick={() => {
                                openTrace(log.traceId);
                                showMessage('已跳转到调用追踪页', 'info');
                              }}
                            >
                              {log.traceId.slice(0, 12)}
                            </button>
                          ) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </BentoCard>
        </div>
      ) : null}
    </Modal>
  );
};

export const PerformanceAnalysisPanel: React.FC<PerformanceAnalysisPanelProps> = ({ theme, showMessage }) => {
  const [windowSize, setWindowSize] = useState<PerformanceWindow>('24h');
  const [resourceType, setResourceType] = useState<string>('all');
  const [resourceId, setResourceId] = useState<string>('');
  const [selectedResource, setSelectedResource] = useState<PerformanceResourceLeaderboardItem | null>(null);
  const scopeOptionsQ = useAlertRuleScopeOptions();
  const analysisQ = usePerformanceAnalysis({
    window: windowSize,
    resourceType: resourceType === 'all' ? undefined : resourceType,
    resourceId: resourceId ? Number(resourceId) : undefined,
  });

  useEffect(() => {
    if (resourceType === 'all' && resourceId) {
      setResourceId('');
    }
  }, [resourceId, resourceType]);

  const resources = useMemo(() => {
    const items = scopeOptionsQ.data?.resources ?? [];
    if (resourceType === 'all') return [];
    return items.filter((item) => item.resourceType === resourceType);
  }, [resourceType, scopeOptionsQ.data?.resources]);

  const trendOption = useMemo(
    () => buildTrendOption(theme, analysisQ.data?.buckets ?? []),
    [theme, analysisQ.data?.buckets],
  );
  const latencyOption = useMemo(
    () => buildLatencyOption(theme, analysisQ.data?.buckets ?? []),
    [theme, analysisQ.data?.buckets],
  );

  const exportCurrentAnalysis = () => {
    if (!analysisQ.data) return;
    exportAnalysisSnapshot({
      exportedAt: new Date().toISOString(),
      filters: {
        window: windowSize,
        resourceType,
        resourceId: resourceId || undefined,
      },
      ...analysisQ.data,
    });
    showMessage('性能分析快照已导出', 'success');
  };

  if (analysisQ.isLoading) {
    return <PageSkeleton type="detail" rows={6} />;
  }

  if (analysisQ.isError) {
    return <PageError error={analysisQ.error as Error} onRetry={() => analysisQ.refetch()} />;
  }

  const data = analysisQ.data;
  if (!data) {
    return <EmptyState title="暂无性能数据" description="当前筛选条件下还没有可用的性能分析结果。" />;
  }

  const summaryCards = [
    { label: '总请求数', value: data.summary.requestCount, icon: Activity },
    { label: '成功率', value: formatPercent(data.summary.successRate), icon: BarChart3 },
    { label: '错误率', value: formatPercent(data.summary.errorRate), icon: ListFilter },
    { label: '超时率', value: formatPercent(data.summary.timeoutRate), icon: Timer },
    { label: '平均延迟', value: formatLatency(data.summary.avgLatencyMs), icon: Activity },
    { label: 'P50', value: formatLatency(data.summary.p50LatencyMs), icon: Timer },
    { label: 'P95', value: formatLatency(data.summary.p95LatencyMs), icon: Timer },
    { label: 'P99', value: formatLatency(data.summary.p99LatencyMs), icon: Timer },
  ];

  return (
    <>
      <div className={pageBlockStack}>
        <BentoCard theme={theme}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className={`text-sm font-semibold ${textPrimary(theme)}`}>真实调用性能分析</div>
              <div className={`mt-1 text-xs ${textMuted(theme)}`}>
                数据仅来自网关调用日志，P50 / P95 / P99 由原始延迟样本实时聚合计算。
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" className={btnGhost(theme)} onClick={() => analysisQ.refetch()}>
                刷新
              </button>
              <button type="button" className={btnPrimary} onClick={exportCurrentAnalysis}>
                <Download size={15} aria-hidden />
                导出快照
              </button>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <FilterSelect
              value={windowSize}
              onChange={(value) => setWindowSize(value as PerformanceWindow)}
              options={WINDOW_OPTIONS}
              theme={theme}
            />
            <FilterSelect
              value={resourceType}
              onChange={(value) => setResourceType(value)}
              options={[
                { value: 'all', label: '全部资源类型' },
                ...RESOURCE_TYPES.map((type) => ({ value: type, label: resourceTypeLabel(type) })),
              ]}
              theme={theme}
            />
            <FilterSelect
              value={resourceId}
              onChange={(value) => setResourceId(value)}
              options={[
                { value: '', label: resourceType === 'all' ? '先选择资源类型' : '全部资源对象' },
                ...resources.map((item) => ({ value: String(item.id), label: item.displayName })),
              ]}
              theme={theme}
              disabled={resourceType === 'all'}
            />
          </div>
        </BentoCard>

        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
          {summaryCards.map((card) => (
            <BentoCard key={card.label} theme={theme} padding="sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className={`text-xs font-medium ${textMuted(theme)}`}>{card.label}</div>
                  <div className={`mt-2 text-2xl font-semibold ${textPrimary(theme)}`}>{card.value}</div>
                </div>
                <div className="rounded-2xl bg-neutral-100 p-3 text-neutral-700">
                  <card.icon size={16} aria-hidden />
                </div>
              </div>
            </BentoCard>
          ))}
        </div>

        {(data.buckets?.length ?? 0) === 0 ? (
          <EmptyState title="当前窗口内没有样本" description="可以切换更大的时间窗口，或者放宽资源筛选范围。" />
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <EChartCard theme={theme} option={trendOption} minHeight={280} aria-label="调用量与错误量趋势" />
            <EChartCard theme={theme} option={latencyOption} minHeight={280} aria-label="延迟分位趋势" />
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 2xl:grid-cols-[1.2fr_0.8fr]">
          <BentoCard theme={theme}>
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className={`text-sm font-semibold ${textPrimary(theme)}`}>资源性能排行</div>
                <div className={`mt-1 text-xs ${textMuted(theme)}`}>按请求量优先排序，低于 5 条样本的资源会被标记为低样本。</div>
              </div>
            </div>
            {(data.resourceLeaderboard?.length ?? 0) === 0 ? (
              <div className={`mt-4 text-sm ${textMuted(theme)}`}>暂无资源排行数据。</div>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      {['资源', '类型', '请求数', '错误率', 'P99', '平均延迟', '操作'].map((header) => (
                        <th key={header} className={tableHeadCell(theme)}>{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.resourceLeaderboard.map((item, index) => (
                      <tr key={`${item.resourceType}-${item.resourceId ?? item.resourceName}`} className={tableBodyRow(theme, index)}>
                        <td className={`${tableCell()} min-w-[14rem]`}>
                          <div className={`font-medium ${textPrimary(theme)}`}>{item.resourceName}</div>
                          <div className={`mt-1 text-xs ${textMuted(theme)}`}>
                            {item.lowSample ? '低样本' : `超时 ${formatPercent(item.timeoutRate)}`}
                          </div>
                        </td>
                        <td className={tableCell()}>{resourceTypeLabel(item.resourceType)}</td>
                        <td className={tableCell()}>{item.requestCount}</td>
                        <td className={tableCell()}>{formatPercent(item.errorRate)}</td>
                        <td className={tableCell()}>{formatLatency(item.p99LatencyMs)}</td>
                        <td className={tableCell()}>{formatLatency(item.avgLatencyMs)}</td>
                        <td className={tableCell()}>
                          <button
                            type="button"
                            className="text-sky-600 hover:text-sky-700 underline-offset-2 hover:underline"
                            onClick={() => setSelectedResource(item)}
                          >
                            查看详情
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </BentoCard>

          <BentoCard theme={theme}>
            <div>
              <div className={`text-sm font-semibold ${textPrimary(theme)}`}>慢方法排行</div>
              <div className={`mt-1 text-xs ${textMuted(theme)}`}>默认按 P99 和请求量排序，帮助快速定位慢路径。</div>
            </div>
            {(data.slowMethods?.length ?? 0) === 0 ? (
              <div className={`mt-4 text-sm ${textMuted(theme)}`}>暂无慢方法数据。</div>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      {['方法', '请求数', '错误数', '平均延迟', 'P95', 'P99'].map((header) => (
                        <th key={header} className={tableHeadCell(theme)}>{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.slowMethods.slice(0, 10).map((item, index) => (
                      <tr key={`${item.method}-${index}`} className={tableBodyRow(theme, index)}>
                        <td className={`${tableCell()} font-mono min-w-[12rem]`}>{item.method}</td>
                        <td className={tableCell()}>{item.requestCount}</td>
                        <td className={tableCell()}>{item.errorCount}</td>
                        <td className={tableCell()}>{formatLatency(item.avgLatencyMs)}</td>
                        <td className={tableCell()}>{formatLatency(item.p95LatencyMs)}</td>
                        <td className={tableCell()}>{formatLatency(item.p99LatencyMs)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </BentoCard>
        </div>
      </div>

      <ResourceDetailModal
        theme={theme}
        item={selectedResource}
        open={Boolean(selectedResource)}
        onClose={() => setSelectedResource(null)}
        showMessage={showMessage}
      />
    </>
  );
};
