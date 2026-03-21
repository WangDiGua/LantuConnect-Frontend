import React from 'react';
import { Building2, Users } from 'lucide-react';
import type { Theme, FontSize } from '../../types';
import type { OrgNode } from '../../types/dto/user-mgmt';
import { useOrgTree } from '../../hooks/queries/useUserMgmt';
import { PageSkeleton } from '../../components/common/PageSkeleton';
import { PageError } from '../../components/common/PageError';
import { EmptyState } from '../../components/common/EmptyState';
import { BentoCard } from '../../components/common/BentoCard';
import {
  pageBg, textPrimary, textSecondary, textMuted,
} from '../../utils/uiClasses';

interface OrgStructurePageProps {
  theme: Theme;
  fontSize: FontSize;
  showMessage?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

function flattenOrg(node: OrgNode, depth = 0): { id: string; name: string; depth: number; memberCount: number; parentId?: string }[] {
  const row = { id: node.id, name: node.name, depth, memberCount: node.memberCount, parentId: node.parentId };
  return [row, ...(node.children ?? []).flatMap((c) => flattenOrg(c, depth + 1))];
}

export const OrgStructurePage: React.FC<OrgStructurePageProps> = ({ theme }) => {
  const isDark = theme === 'dark';
  const { data, isLoading, isError, error, refetch } = useOrgTree();

  if (isLoading) {
    return (
      <div className={`flex-1 flex flex-col min-h-0 ${pageBg(theme)}`}>
        <div className="p-4 sm:p-6"><PageSkeleton type="detail" /></div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className={`flex-1 flex flex-col min-h-0 ${pageBg(theme)}`}>
        <PageError error={error instanceof Error ? error : null} onRetry={() => refetch()} />
      </div>
    );
  }

  if (!data) {
    return (
      <div className={`flex-1 flex flex-col min-h-0 ${pageBg(theme)}`}>
        <EmptyState title="暂无组织数据" description="后端未返回组织树" />
      </div>
    );
  }

  const root: OrgNode = Array.isArray(data)
    ? (data[0] ?? { id: '', name: '', parentId: null, type: 'company', headCount: 0, children: data })
    : data;
  const rows = flattenOrg(root);

  return (
    <div className={`flex-1 flex flex-col min-h-0 overflow-hidden transition-colors duration-300 ${pageBg(theme)}`}>
      <div className="w-full flex-1 min-h-0 overflow-y-auto px-2 sm:px-3 lg:px-4 py-2 sm:py-3 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl ${isDark ? 'bg-emerald-500/15' : 'bg-emerald-50'}`}>
            <Building2 size={20} className={isDark ? 'text-emerald-400' : 'text-emerald-600'} />
          </div>
          <div>
            <h1 className={`text-lg font-bold ${textPrimary(theme)}`}>组织架构</h1>
            <p className={`text-xs ${textMuted(theme)}`}>部门层级与人员分布</p>
          </div>
        </div>

        <BentoCard theme={theme}>
          {rows.length === 0 ? (
            <EmptyState title="组织为空" description="根节点下无子部门" />
          ) : (
            <ul className="space-y-1">
              {rows.map((d) => (
                <li
                  key={d.id}
                  className={`flex justify-between items-center py-2.5 px-3 rounded-xl transition-colors ${isDark ? 'hover:bg-white/[0.04]' : 'hover:bg-slate-50'}`}
                  style={{ paddingLeft: `${d.depth * 20 + 12}px` }}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {d.depth === 0 ? (
                      <Building2 size={14} className={textMuted(theme)} />
                    ) : (
                      <span className={`w-3.5 h-px ${isDark ? 'bg-white/10' : 'bg-slate-200'}`} />
                    )}
                    <span className={`font-medium text-sm ${textPrimary(theme)}`}>{d.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Users size={12} className={textMuted(theme)} />
                    <span className={`text-xs tabular-nums ${textSecondary(theme)}`}>{d.memberCount}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </BentoCard>
      </div>
    </div>
  );
};
