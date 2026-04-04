import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Clock3, RefreshCw } from 'lucide-react';
import type { Theme, FontSize } from '../../types';
import type { RecentUseItem } from '../../types/dto/user-activity';
import { userActivityService } from '../../api/services/user-activity.service';
import { PageError } from '../../components/common/PageError';
import { PageSkeleton } from '../../components/common/PageSkeleton';
import { MgmtPageShell } from '../userMgmt/MgmtPageShell';
import {
  btnGhost,
  tableHeadCell,
  tableBodyRow,
  tableCell,
  tableCellScrollInnerMono,
  textMuted,
  textPrimary,
  textSecondary,
} from '../../utils/uiClasses';
import { formatDateTime } from '../../utils/formatDateTime';
import { LantuSelect } from '../../components/common/LantuSelect';

interface Props {
  theme: Theme;
  fontSize: FontSize;
  showMessage?: (msg: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

const RECENT_USE_DESC = '按最近调用时间排序';

export const RecentUsePage: React.FC<Props> = ({ theme, fontSize }) => {
  const isDark = theme === 'dark';
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<RecentUseItem[]>([]);
  const [typeFilter, setTypeFilter] = useState<RecentUseItem['targetType'] | 'all'>('all');
  const [loadError, setLoadError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    setLoadError(null);
    setLoading(true);
    try {
      const list = await userActivityService.getRecentUse({ limit: 50 });
      setItems(list);
    } catch (err) {
      setLoadError(err instanceof Error ? err : new Error('加载最近使用失败'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const filtered = useMemo(
    () => (typeFilter === 'all' ? items : items.filter((item) => item.targetType === typeFilter)),
    [items, typeFilter],
  );

  const TYPE_LABEL: Record<RecentUseItem['targetType'], string> = {
    agent: 'Agent',
    skill: 'Skill',
    mcp: 'MCP',
    app: '应用',
    dataset: '数据集',
  };

  const statusLabel = (status?: string) => (status === 'success' ? '成功' : status === 'failed' ? '失败' : '—');
  const statusClass = (status?: string) =>
    status === 'success'
      ? 'text-emerald-600'
      : status === 'failed'
        ? 'text-rose-600'
        : textSecondary(theme);

  return (
    <MgmtPageShell
      theme={theme}
      fontSize={fontSize}
      titleIcon={Clock3}
      breadcrumbSegments={['使用记录', '最近使用']}
      description={RECENT_USE_DESC}
      toolbar={
        <div className="flex flex-wrap items-center gap-2 justify-end min-w-0">
          <LantuSelect
            theme={theme}
            value={typeFilter}
            onChange={(next) => setTypeFilter(next as RecentUseItem['targetType'] | 'all')}
            options={[
              { value: 'all', label: '全部类型' },
              { value: 'agent', label: 'Agent' },
              { value: 'skill', label: 'Skill' },
              { value: 'mcp', label: 'MCP' },
              { value: 'app', label: 'App' },
              { value: 'dataset', label: 'Dataset' },
            ]}
            className="w-32"
            triggerClassName="!min-h-[2rem] !px-2.5 !py-1.5 !text-xs"
          />
          <button type="button" onClick={() => void fetchData()} className={btnGhost(theme)} aria-label="刷新最近使用记录">
            <RefreshCw size={15} aria-hidden />
            刷新
          </button>
        </div>
      }
    >
      <div className="px-4 sm:px-6 pb-6 flex flex-col min-h-0 flex-1 overflow-x-auto">
            {loading ? (
              <PageSkeleton type="table" rows={8} />
            ) : loadError ? (
              <PageError error={loadError} onRetry={() => void fetchData()} retryLabel="重试加载最近使用" />
            ) : filtered.length === 0 ? (
              <div className={`py-10 text-center text-sm ${textMuted(theme)}`}>暂无最近使用记录</div>
            ) : (
                <table className="w-full min-w-[860px] text-sm">
                  <thead className={`border-b ${isDark ? 'border-white/[0.06]' : 'border-slate-100'}`}>
                    <tr>
                      <th className={tableHeadCell(theme)}>时间</th>
                      <th className={tableHeadCell(theme)}>资源名称</th>
                      <th className={tableHeadCell(theme)}>资源编码</th>
                      <th className={tableHeadCell(theme)}>类型</th>
                      <th className={tableHeadCell(theme)}>动作</th>
                      <th className={tableHeadCell(theme)}>状态</th>
                      <th className={tableHeadCell(theme)}>Token</th>
                      <th className={tableHeadCell(theme)}>耗时</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((item, idx) => (
                      <tr key={`${item.targetType}-${item.targetId}-${item.id}`} className={tableBodyRow(theme, idx)}>
                        <td className={`${tableCell()} whitespace-nowrap ${textSecondary(theme)}`}>{formatDateTime(item.createTime || item.lastUsedTime, '未知时间')}</td>
                        <td className={`${tableCell()} max-w-[14rem] ${textPrimary(theme)}`}>
                          <span className="block truncate" title={item.displayName ?? undefined}>{item.displayName || '—'}</span>
                        </td>
                        <td className={`${tableCell()} max-w-[200px] align-middle ${textSecondary(theme)}`}>
                          {item.targetCode ? <div className={tableCellScrollInnerMono}>{item.targetCode}</div> : '—'}
                        </td>
                        <td className={`${tableCell()} ${textSecondary(theme)}`}>{TYPE_LABEL[item.targetType] ?? item.targetType}</td>
                        <td className={`${tableCell()} ${textSecondary(theme)}`}>{item.action || '—'}</td>
                        <td className={`${tableCell()} whitespace-nowrap text-xs font-semibold ${statusClass(item.status)}`}>{statusLabel(item.status)}</td>
                        <td className={`${tableCell()} ${textSecondary(theme)}`}>{typeof item.tokenCost === 'number' ? item.tokenCost : '—'}</td>
                        <td className={`${tableCell()} ${textSecondary(theme)}`}>{typeof item.latencyMs === 'number' && item.latencyMs > 0 ? `${item.latencyMs} ms` : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
            )}
      </div>
    </MgmtPageShell>
  );
};
