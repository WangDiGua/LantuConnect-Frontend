import React, { useCallback, useEffect, useState } from 'react';
import { KeyRound, RefreshCw } from 'lucide-react';
import type { Theme, FontSize } from '../../types';
import { userActivityService } from '../../api/services/user-activity.service';
import type { AuthorizedSkillItem } from '../../types/dto/user-activity';
import { PageError } from '../../components/common/PageError';
import { PageSkeleton } from '../../components/common/PageSkeleton';
import { formatDateTime } from '../../utils/formatDateTime';
import {
  bentoCardHover,
  btnGhost,
  textPrimary,
  textSecondary,
  textMuted,
} from '../../utils/uiClasses';
import { MgmtPageShell } from '../userMgmt/MgmtPageShell';

const PAGE_DESC = '查看当前账号已获授权的技能列表';

interface Props {
  theme: Theme;
  fontSize: FontSize;
  showMessage?: (msg: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

export const AuthorizedSkillsPage: React.FC<Props> = ({ theme, fontSize }) => {
  const isDark = theme === 'dark';
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<AuthorizedSkillItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loadError, setLoadError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    setLoadError(null);
    setLoading(true);
    try {
      const page = await userActivityService.getAuthorizedSkills({ page: 1, pageSize: 50 });
      setItems(page.list);
      setTotal(page.total);
    } catch (err) {
      setLoadError(err instanceof Error ? err : new Error('加载已授权技能失败'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const toolbar = (
    <div className="flex flex-wrap items-center justify-between gap-3 w-full">
      <p className={`text-xs sm:text-sm ${textMuted(theme)}`}>共 <span className={`font-semibold ${textPrimary(theme)}`}>{total}</span> 项</p>
      <button type="button" onClick={() => void fetchData()} className={btnGhost(theme)} aria-label="刷新已授权技能列表">
        <RefreshCw size={15} aria-hidden />
        刷新
      </button>
    </div>
  );

  return (
    <MgmtPageShell
      theme={theme}
      fontSize={fontSize}
      titleIcon={KeyRound}
      breadcrumbSegments={['工作台', '已授权技能'] as const}
      description={PAGE_DESC}
      toolbar={toolbar}
      contentScroll="document"
    >
      <div className="px-4 sm:px-6 pb-8">
        {loading ? (
          <PageSkeleton type="table" rows={6} />
        ) : loadError ? (
          <PageError error={loadError} onRetry={() => void fetchData()} retryLabel="重试加载已授权技能" />
        ) : items.length === 0 ? (
          <div className={`py-10 text-center text-sm ${textMuted(theme)}`}>暂无已授权技能</div>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <div key={item.id} className={`${bentoCardHover(theme)} p-4`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className={`truncate font-semibold ${textPrimary(theme)}`} title={item.displayName}>{item.displayName}</p>
                    <p className={`mt-0.5 truncate text-xs ${textMuted(theme)}`} title={item.description || undefined}>{item.description || '暂无描述'}</p>
                  </div>
                  <span className={`shrink-0 rounded-lg px-2 py-0.5 text-xs font-medium ${isDark ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-700'}`}>
                    {item.status === 'authorized' || !item.status ? '已授权' : item.status}
                  </span>
                </div>
                <div className={`mt-2 flex flex-wrap items-center gap-3 text-xs ${textSecondary(theme)}`}>
                  <span>授权范围：{item.grantScope || '默认'}</span>
                  {item.grantedAt && <span>授权时间：{formatDateTime(item.grantedAt)}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </MgmtPageShell>
  );
};
