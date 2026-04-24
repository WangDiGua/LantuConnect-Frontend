import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AppWindow,
  ArrowRight,
  Bot,
  CheckCircle2,
  Clock3,
  Database,
  FilePlus2,
  ListChecks,
  PackageCheck,
  Puzzle,
  RefreshCw,
  Rocket,
  ShieldAlert,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import type { Theme, FontSize } from '../../types';
import type { ResourceType } from '../../types/dto/catalog';
import type { ResourceCenterItemVO, ResourceStatus } from '../../types/dto/resource-center';
import { PageError } from '../../components/common/PageError';
import { PageSkeleton } from '../../components/common/PageSkeleton';
import { resourceCenterService } from '../../api/services/resource-center.service';
import { buildPath } from '../../constants/consoleRoutes';
import { RESOURCE_TYPES, RESOURCE_TYPE_LABEL_ZH, RESOURCE_TYPE_REGISTER_PAGE } from '../../constants/resourceTypes';
import { unifiedResourceCenterPath } from '../../utils/unifiedResourceCenterPath';
import { useUserRole } from '../../context/UserRoleContext';
import { MgmtPageShell } from '../userMgmt/MgmtPageShell';
import { MY_PUBLISH_LIST_PAGE_BY_TYPE } from './myPublishListConfigs';
import {
  btnPrimary,
  btnSecondary,
  statusBadgeClass,
  statusDot,
  statusLabel,
  textMuted,
  textPrimary,
  textSecondary,
} from '../../utils/uiClasses';

interface Props {
  theme: Theme;
  fontSize: FontSize;
}

const TYPE_ICON: Record<ResourceType, LucideIcon> = {
  agent: Bot,
  skill: Wrench,
  mcp: Puzzle,
  app: AppWindow,
  dataset: Database,
};

const TYPE_ACCENT: Record<ResourceType, { bar: string; soft: string; darkSoft: string; text: string; darkText: string }> = {
  agent: { bar: 'bg-sky-500', soft: 'bg-sky-50', darkSoft: 'bg-sky-500/10', text: 'text-sky-700', darkText: 'text-sky-300' },
  skill: { bar: 'bg-violet-500', soft: 'bg-violet-50', darkSoft: 'bg-violet-500/10', text: 'text-violet-700', darkText: 'text-violet-300' },
  mcp: { bar: 'bg-emerald-500', soft: 'bg-emerald-50', darkSoft: 'bg-emerald-500/10', text: 'text-emerald-700', darkText: 'text-emerald-300' },
  app: { bar: 'bg-amber-500', soft: 'bg-amber-50', darkSoft: 'bg-amber-500/10', text: 'text-amber-700', darkText: 'text-amber-300' },
  dataset: { bar: 'bg-rose-500', soft: 'bg-rose-50', darkSoft: 'bg-rose-500/10', text: 'text-rose-700', darkText: 'text-rose-300' },
};

const STATUS_KEYS: ResourceStatus[] = ['published', 'pending_review', 'draft', 'rejected', 'deprecated'];

function emptyTypeCounts(): Record<ResourceType, number> {
  return { agent: 0, skill: 0, mcp: 0, app: 0, dataset: 0 };
}

function emptyStatusCounts(): Record<ResourceStatus, number> {
  return { draft: 0, pending_review: 0, published: 0, rejected: 0, deprecated: 0, merged_live: 0 };
}

function safeDateValue(value?: string): number {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

function shortDate(value?: string): string {
  if (!value) return '--';
  const normalized = value.replace('T', ' ');
  return normalized.length >= 16 ? normalized.slice(5, 16) : normalized.slice(0, 10);
}

const PAGE_DESC = '统一查看本人登记的资源、审核状态和最近更新';

export const MyPublishHubPage: React.FC<Props> = ({ theme, fontSize }) => {
  const isDark = theme === 'dark';
  const navigate = useNavigate();
  const { platformRole } = useUserRole();
  const [items, setItems] = useState<ResourceCenterItemVO[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    setLoadError(null);
    setLoading(true);
    try {
      const page = await resourceCenterService.listMine({ page: 1, pageSize: 200 });
      setItems(page.list);
    } catch (err) {
      setLoadError(err instanceof Error ? err : new Error('加载发布总览失败'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchData(); }, [fetchData]);

  const viewModel = useMemo(() => {
    const typeCounts = emptyTypeCounts();
    const statusCounts = emptyStatusCounts();
    for (const item of items) {
      typeCounts[item.resourceType] += 1;
      statusCounts[item.status] = (statusCounts[item.status] ?? 0) + 1;
    }
    const total = items.length;
    const recent = [...items]
      .sort((a, b) => safeDateValue(b.updateTime ?? b.createTime) - safeDateValue(a.updateTime ?? a.createTime))
      .slice(0, 6);
    return { typeCounts, statusCounts, total, recent };
  }, [items]);

  const cardClass = `rounded-[1.5rem] border ${
    isDark ? 'border-white/[0.08] bg-lantu-card' : 'border-slate-200/70 bg-white'
  }`;
  const innerPanel = isDark ? 'bg-white/[0.045]' : 'bg-slate-50';

  const toolbar = (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <span className={`text-sm ${textMuted(theme)}`}>
        共 <span className={`font-bold ${textPrimary(theme)}`}>{viewModel.total}</span> 项资源
      </span>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={btnSecondary(theme)}
          onClick={() => navigate(unifiedResourceCenterPath(platformRole))}
        >
          资源中心
          <ArrowRight size={15} aria-hidden />
        </button>
        <button
          type="button"
          className={btnPrimary}
          onClick={() => navigate(buildPath('user', RESOURCE_TYPE_REGISTER_PAGE.agent))}
        >
          <FilePlus2 size={15} aria-hidden />
          新建资源
        </button>
      </div>
    </div>
  );

  const body = useMemo(() => {
    if (loading) return <PageSkeleton type="cards" />;
    if (loadError) return <PageError error={loadError} onRetry={fetchData} retryLabel="重新加载发布总览" />;

    const metrics = [
      { label: '全部资源', value: viewModel.total, icon: PackageCheck },
      { label: '已发布', value: viewModel.statusCounts.published, icon: CheckCircle2 },
      { label: '待审核', value: viewModel.statusCounts.pending_review, icon: Clock3 },
      { label: '需要处理', value: viewModel.statusCounts.rejected + viewModel.statusCounts.deprecated, icon: ShieldAlert },
    ];
    const maxTypeCount = Math.max(...RESOURCE_TYPES.map((type) => viewModel.typeCounts[type]), 1);

    return (
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => {
            const Icon = metric.icon;
            return (
              <div key={metric.label} className={`rounded-[1.35rem] border px-4 py-4 ${
                isDark ? 'border-white/[0.08] bg-lantu-card' : 'border-slate-200/70 bg-white'
              }`}>
                <div className="flex items-center justify-between gap-3">
                  <p className={`text-sm font-semibold ${textSecondary(theme)}`}>{metric.label}</p>
                  <Icon size={17} className={textMuted(theme)} aria-hidden />
                </div>
                <p className={`mt-3 text-3xl font-black leading-none tabular-nums ${textPrimary(theme)}`}>
                  {metric.value.toLocaleString('zh-CN')}
                </p>
              </div>
            );
          })}
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(22rem,0.55fr)]">
          <section className={`${cardClass} p-5`}>
            <div className="mb-5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <ListChecks size={18} className={textMuted(theme)} aria-hidden />
                <h3 className={`text-base font-black ${textPrimary(theme)}`}>资源类型</h3>
              </div>
              <span className={`text-xs font-semibold ${textMuted(theme)}`}>共 {viewModel.total} 项</span>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {RESOURCE_TYPES.map((type) => {
                const Icon = TYPE_ICON[type];
                const accent = TYPE_ACCENT[type];
                const count = viewModel.typeCounts[type];
                const width = `${Math.max((count / maxTypeCount) * 100, count > 0 ? 6 : 0)}%`;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => navigate(buildPath('user', MY_PUBLISH_LIST_PAGE_BY_TYPE[type]))}
                    className={`group rounded-xl border p-4 text-left transition-colors ${
                      isDark ? 'border-white/[0.08] bg-white/[0.035] hover:bg-white/[0.07]' : 'border-slate-200/80 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${isDark ? accent.darkSoft : accent.soft}`}>
                          <Icon size={18} className={isDark ? accent.darkText : accent.text} aria-hidden />
                        </span>
                        <div className="min-w-0">
                          <p className={`truncate font-black ${textPrimary(theme)}`}>{RESOURCE_TYPE_LABEL_ZH[type]}</p>
                          <p className={`mt-1 text-xs ${textMuted(theme)}`}>{count} 个资源</p>
                        </div>
                      </div>
                      <ArrowRight size={16} className={`${textMuted(theme)} transition-transform group-hover:translate-x-0.5`} aria-hidden />
                    </div>
                    <div className={`mt-4 h-2 overflow-hidden rounded-full ${isDark ? 'bg-white/[0.08]' : 'bg-slate-100'}`}>
                      <div className={`h-full rounded-full ${accent.bar}`} style={{ width }} />
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          <section className={`${cardClass} p-5`}>
            <h3 className={`text-base font-black ${textPrimary(theme)}`}>状态分布</h3>
            <div className="mt-5 space-y-4">
              {STATUS_KEYS.map((status) => {
                const value = viewModel.statusCounts[status] ?? 0;
                const pct = viewModel.total > 0 ? (value / viewModel.total) * 100 : 0;
                return (
                  <div key={status}>
                    <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                      <span className={`inline-flex items-center gap-2 font-semibold ${textSecondary(theme)}`}>
                        <span className={statusDot(status)} />
                        {statusLabel(status)}
                      </span>
                      <span className={`font-black tabular-nums ${textPrimary(theme)}`}>{value}</span>
                    </div>
                    <div className={`h-2 overflow-hidden rounded-full ${isDark ? 'bg-white/[0.08]' : 'bg-slate-100'}`}>
                      <div
                        className={`h-full rounded-full ${
                          status === 'published' ? 'bg-emerald-500' : status === 'pending_review' ? 'bg-amber-400' : 'bg-slate-400'
                        }`}
                        style={{ width: `${Math.max(pct, value > 0 ? 5 : 0)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        <section className={`${cardClass} p-5`}>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <RefreshCw size={18} className={textMuted(theme)} aria-hidden />
              <h3 className={`text-base font-black ${textPrimary(theme)}`}>最近更新</h3>
            </div>
            <button
              type="button"
              className={`text-sm font-semibold ${textSecondary(theme)} ${isDark ? 'hover:text-white' : 'hover:text-slate-950'}`}
              onClick={() => navigate(unifiedResourceCenterPath(platformRole))}
            >
              查看全部
            </button>
          </div>
          {viewModel.recent.length > 0 ? (
            <div className="grid gap-2 xl:grid-cols-2">
              {viewModel.recent.map((item) => {
                const Icon = TYPE_ICON[item.resourceType];
                const accent = TYPE_ACCENT[item.resourceType];
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => navigate(buildPath('user', MY_PUBLISH_LIST_PAGE_BY_TYPE[item.resourceType]))}
                    className={`rounded-xl px-4 py-3 text-left transition-colors ${innerPanel} ${
                      isDark ? 'hover:bg-white/[0.08]' : 'hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${isDark ? accent.darkSoft : accent.soft}`}>
                        <Icon size={16} className={isDark ? accent.darkText : accent.text} aria-hidden />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`min-w-0 truncate text-sm font-black ${textPrimary(theme)}`}>
                            {item.displayName || item.resourceCode || `${RESOURCE_TYPE_LABEL_ZH[item.resourceType]}-${item.id}`}
                          </p>
                          <span className={statusBadgeClass(item.status, theme)}>{statusLabel(item.status)}</span>
                        </div>
                        <div className={`mt-1 flex flex-wrap items-center gap-2 text-xs ${textMuted(theme)}`}>
                          <span>{RESOURCE_TYPE_LABEL_ZH[item.resourceType]}</span>
                          <span aria-hidden>·</span>
                          <span>{shortDate(item.updateTime ?? item.createTime)}</span>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className={`flex min-h-44 flex-col items-center justify-center rounded-xl border border-dashed text-center ${
              isDark ? 'border-white/[0.1] text-lantu-text-muted' : 'border-slate-200 text-slate-500'
            }`}>
              <PackageCheck size={24} aria-hidden />
              <p className="mt-2 text-sm font-semibold">暂无发布资源</p>
            </div>
          )}
        </section>
      </div>
    );
  }, [cardClass, fetchData, innerPanel, isDark, loadError, loading, navigate, platformRole, theme, viewModel]);

  return (
    <MgmtPageShell
      theme={theme}
      fontSize={fontSize}
      titleIcon={Rocket}
      breadcrumbSegments={['工作台', '发布总览'] as const}
      description={PAGE_DESC}
      toolbar={toolbar}
      contentScroll="document"
    >
      <div className="px-4 pb-8 sm:px-6">{body}</div>
    </MgmtPageShell>
  );
};
