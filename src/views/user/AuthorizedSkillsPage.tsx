import React, { useCallback, useEffect, useState } from 'react';
import { KeyRound, RefreshCw } from 'lucide-react';
import type { Theme, FontSize } from '../../types';
import { userActivityService } from '../../api/services/user-activity.service';
import type { AuthorizedSkillItem } from '../../types/dto/user-activity';
import { PageError } from '../../components/common/PageError';
import { formatDateTime } from '../../utils/formatDateTime';
import {
  canvasBodyBg,
  bentoCard,
  bentoCardHover,
  btnGhost,
  textPrimary,
  textSecondary,
  textMuted,
} from '../../utils/uiClasses';

interface Props {
  theme: Theme;
  fontSize: FontSize;
  showMessage?: (msg: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

export const AuthorizedSkillsPage: React.FC<Props> = ({ theme }) => {
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

  return (
    <div className={`flex-1 overflow-y-auto custom-scrollbar ${canvasBodyBg(theme)}`}>
      <div className="px-3 py-4 sm:px-4 lg:px-5">
        <div className={`${bentoCard(theme)} overflow-hidden`}>
          <div className={`flex items-center justify-between border-b px-6 py-4 ${isDark ? 'border-white/[0.06]' : 'border-slate-100'}`}>
            <div className="flex items-center gap-3">
              <div className={`rounded-xl p-2 ${isDark ? 'bg-emerald-500/15' : 'bg-emerald-50'}`}>
                <KeyRound size={20} className={isDark ? 'text-emerald-400' : 'text-emerald-600'} />
              </div>
              <div>
                <h2 className={`text-lg font-bold ${textPrimary(theme)}`}>已授权技能</h2>
                <p className={`text-xs ${textMuted(theme)}`}>共 {total} 项</p>
              </div>
            </div>
            <button type="button" onClick={() => void fetchData()} className={btnGhost(theme)}>
              <RefreshCw size={15} />
              刷新
            </button>
          </div>

          <div className="p-3">
            {loading ? (
              <div className={`py-10 text-center text-sm ${textMuted(theme)}`}>加载中…</div>
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
                        <p className={`truncate font-semibold ${textPrimary(theme)}`}>{item.displayName}</p>
                        <p className={`mt-0.5 truncate text-xs ${textMuted(theme)}`}>{item.description || '暂无描述'}</p>
                      </div>
                      <span className={`rounded-lg px-2 py-0.5 text-xs font-medium ${isDark ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-700'}`}>
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
        </div>
      </div>
    </div>
  );
};
