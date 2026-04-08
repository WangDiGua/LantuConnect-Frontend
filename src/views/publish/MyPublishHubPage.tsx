import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, AppWindow, Bot, Database, Puzzle, Wrench } from 'lucide-react';
import type { Theme, FontSize } from '../../types';
import type { ResourceType } from '../../types/dto/catalog';
import { resourceCenterService } from '../../api/services/resource-center.service';
import { buildPath } from '../../constants/consoleRoutes';
import { unifiedResourceCenterPath } from '../../utils/unifiedResourceCenterPath';
import { useUserRole } from '../../context/UserRoleContext';
import { RESOURCE_TYPES, RESOURCE_TYPE_LABEL_ZH } from '../../constants/resourceTypes';
import { MY_PUBLISH_LIST_PAGE_BY_TYPE } from './myPublishListConfigs';
import { PageSkeleton } from '../../components/common/PageSkeleton';
import {
  bentoCard,
  bentoCardHover,
  btnPrimary,
  canvasBodyBg,
  textMuted,
  textPrimary,
  textSecondary,
} from '../../utils/uiClasses';

interface Props {
  theme: Theme;
  fontSize: FontSize;
}

export const MyPublishHubPage: React.FC<Props> = ({ theme }) => {
  const isDark = theme === 'dark';
  const navigate = useNavigate();
  const { platformRole } = useUserRole();
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState<Record<ResourceType, number>>({
    agent: 0,
    skill: 0,
    mcp: 0,
    app: 0,
    dataset: 0,
  });

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const page = await resourceCenterService.listMine({ page: 1, pageSize: 200 });
        if (!active) return;
        const next: Record<ResourceType, number> = { agent: 0, skill: 0, mcp: 0, app: 0, dataset: 0 };
        for (const item of page.list) {
          next[item.resourceType] += 1;
        }
        setCounts(next);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const icons = useMemo(
    () => ({
      agent: Bot,
      skill: Wrench,
      mcp: Puzzle,
      app: AppWindow,
      dataset: Database,
    }),
    [],
  );

  const total = RESOURCE_TYPES.reduce((sum, type) => sum + counts[type], 0);

  return (
    <div className={`flex-1 min-h-0 overflow-y-auto ${canvasBodyBg(theme)}`}>
      <div className="pb-4 sm:pb-5">
        <div className={`${bentoCard(theme)} p-4 sm:p-5`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className={`text-lg font-bold ${textPrimary(theme)}`}>发布总览</h2>
              <p className={`mt-1 text-sm ${textMuted(theme)}`}>
                集中查看五类资源发布状态；点击卡片进入该类「我的发布」卡片列表（与统一资源中心同一套数据，支持审核/撤回/发布）。也可用右上角进入表格型统一资源中心。
              </p>
            </div>
            <button
              type="button"
              className={btnPrimary}
              onClick={() => navigate(unifiedResourceCenterPath(platformRole))}
            >
              进入统一资源中心
              <ArrowRight size={14} />
            </button>
          </div>

          <div className={`mt-4 rounded-xl px-3 py-2 text-sm ${isDark ? 'bg-white/[0.04] text-slate-300' : 'bg-slate-50 text-slate-600'}`}>
            资源总数：<span className={`font-semibold ${textPrimary(theme)}`}>{total}</span>
          </div>

          {loading ? (
            <PageSkeleton type="cards" />
          ) : (
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {RESOURCE_TYPES.map((type) => {
                const Icon = icons[type];
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => navigate(buildPath('user', MY_PUBLISH_LIST_PAGE_BY_TYPE[type]))}
                    className={`${bentoCardHover(theme)} text-left p-4 transition-all`}
                  >
                    <div className="flex items-center justify-between">
                      <div className={`rounded-lg p-2 ${isDark ? 'bg-white/[0.06]' : 'bg-slate-100'}`}>
                        <Icon size={16} className={isDark ? 'text-slate-200' : 'text-slate-600'} />
                      </div>
                      <ArrowRight size={14} className={textMuted(theme)} />
                    </div>
                    <p className={`mt-3 text-sm font-semibold ${textPrimary(theme)}`}>{RESOURCE_TYPE_LABEL_ZH[type]}</p>
                    <p className={`mt-1 text-xs ${textSecondary(theme)}`}>已创建 {counts[type]} 个资源</p>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
