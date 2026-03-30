import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Clock3, RefreshCw } from 'lucide-react';
import type { Theme, FontSize } from '../../types';
import type { RecentUseItem } from '../../types/dto/user-activity';
import { userActivityService } from '../../api/services/user-activity.service';
import { PageError } from '../../components/common/PageError';
import {
  bentoCard,
  btnGhost,
  canvasBodyBg,
  mainScrollCompositorClass,
  tableHeadCell,
  tableBodyRow,
  tableCell,
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

export const RecentUsePage: React.FC<Props> = ({ theme }) => {
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
    <div className={`flex-1 overflow-y-auto custom-scrollbar ${mainScrollCompositorClass} ${canvasBodyBg(theme)}`}>
      <div className="px-3 py-4 sm:px-4 lg:px-5">
        <div className={`${bentoCard(theme)} overflow-hidden`}>
          <div className={`flex items-center justify-between border-b px-6 py-4 ${isDark ? 'border-white/[0.06]' : 'border-slate-100'}`}>
            <div className="flex items-center gap-3">
              <div className={`rounded-xl p-2 ${isDark ? 'bg-blue-500/15' : 'bg-blue-50'}`}>
                <Clock3 size={20} className={isDark ? 'text-blue-400' : 'text-blue-600'} />
              </div>
              <div>
                <h2 className={`text-lg font-bold ${textPrimary(theme)}`}>最近使用</h2>
                <p className={`text-xs ${textMuted(theme)}`}>按最近调用时间排序</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
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
              <button type="button" onClick={() => void fetchData()} className={btnGhost(theme)}>
                <RefreshCw size={15} />
                刷新
              </button>
            </div>
          </div>
          <div className="p-3">
            {loading ? (
              <div className={`py-10 text-center text-sm ${textMuted(theme)}`}>加载中…</div>
            ) : loadError ? (
              <PageError error={loadError} onRetry={() => void fetchData()} retryLabel="重试加载最近使用" />
            ) : filtered.length === 0 ? (
              <div className={`py-10 text-center text-sm ${textMuted(theme)}`}>暂无最近使用记录</div>
            ) : (
              <div className="overflow-auto">
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
                        <td className={`${tableCell()} ${textSecondary(theme)}`}>{formatDateTime(item.createTime || item.lastUsedTime, '未知时间')}</td>
                        <td className={`${tableCell()} ${textPrimary(theme)}`}>{item.displayName || '—'}</td>
                        <td className={`${tableCell()} ${textSecondary(theme)} font-mono`}>{item.targetCode || '—'}</td>
                        <td className={`${tableCell()} ${textSecondary(theme)}`}>{TYPE_LABEL[item.targetType] ?? item.targetType}</td>
                        <td className={`${tableCell()} ${textSecondary(theme)}`}>{item.action || '—'}</td>
                        <td className={`${tableCell()} text-xs font-semibold ${statusClass(item.status)}`}>{statusLabel(item.status)}</td>
                        <td className={`${tableCell()} ${textSecondary(theme)}`}>{typeof item.tokenCost === 'number' ? item.tokenCost : '—'}</td>
                        <td className={`${tableCell()} ${textSecondary(theme)}`}>{typeof item.latencyMs === 'number' && item.latencyMs > 0 ? `${item.latencyMs} ms` : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
