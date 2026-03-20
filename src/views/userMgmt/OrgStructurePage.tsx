import React from 'react';
import { Building2 } from 'lucide-react';
import { Theme, FontSize } from '../../types';
import { MgmtPageShell } from './MgmtPageShell';
import type { OrgNode } from '../../types/dto/user-mgmt';
import { useOrgTree } from '../../hooks/queries/useUserMgmt';
import { PageSkeleton } from '../../components/common/PageSkeleton';
import { PageError } from '../../components/common/PageError';
import { EmptyState } from '../../components/common/EmptyState';

interface OrgStructurePageProps {
  theme: Theme;
  fontSize: FontSize;
  showMessage?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

function flattenOrg(node: OrgNode, depth = 0): { id: string; name: string; depth: number; memberCount: number; parentId?: string }[] {
  const row = { id: node.id, name: node.name, depth, memberCount: node.memberCount, parentId: node.parentId };
  const childRows = (node.children ?? []).flatMap((c) => flattenOrg(c, depth + 1));
  return [row, ...childRows];
}

export const OrgStructurePage: React.FC<OrgStructurePageProps> = ({ theme, fontSize }) => {
  const { data, isLoading, isError, error, refetch } = useOrgTree();

  const card = `rounded-2xl border shadow-none p-4 ${theme === 'light' ? 'bg-white border-slate-200/80' : 'bg-[#1C1C1E] border-white/10'}`;

  if (isLoading) {
    return (
      <MgmtPageShell theme={theme} fontSize={fontSize} titleIcon={Building2} breadcrumbSegments={['用户管理', '组织架构']}>
        <div className="p-4 sm:p-6">
          <PageSkeleton type="detail" />
        </div>
      </MgmtPageShell>
    );
  }

  if (isError) {
    return (
      <MgmtPageShell theme={theme} fontSize={fontSize} titleIcon={Building2} breadcrumbSegments={['用户管理', '组织架构']}>
        <div className="p-4 sm:p-6">
          <PageError error={error instanceof Error ? error : null} onRetry={() => refetch()} />
        </div>
      </MgmtPageShell>
    );
  }

  if (!data) {
    return (
      <MgmtPageShell theme={theme} fontSize={fontSize} titleIcon={Building2} breadcrumbSegments={['用户管理', '组织架构']}>
        <div className="p-4 sm:p-6">
          <EmptyState title="暂无组织数据" description="后端未返回组织树" />
        </div>
      </MgmtPageShell>
    );
  }

  const root: OrgNode = Array.isArray(data) ? (data[0] ?? { id: '', name: '', parentId: null, type: 'company', headCount: 0, children: data }) : data;
  const rows = flattenOrg(root);

  return (
    <MgmtPageShell theme={theme} fontSize={fontSize} titleIcon={Building2} breadcrumbSegments={['用户管理', '组织架构']}>
      <div className="p-4 sm:p-6 space-y-6">
        <div className={card}>
          <div className="text-sm font-semibold mb-3">组织树（扁平展示）</div>
          {!rows.length ? (
            <EmptyState title="组织为空" description="根节点下无子部门" />
          ) : (
            <ul className="space-y-2">
              {rows.map((d) => (
                <li
                  key={d.id}
                  className={`flex justify-between items-center py-2 border-b last:border-0 ${
                    theme === 'light' ? 'border-slate-100' : 'border-white/10'
                  }`}
                  style={{ paddingLeft: `${d.depth * 12}px` }}
                >
                  <span>
                    <span className="font-medium">{d.name}</span>
                    <span className="text-xs text-slate-500 ml-2">
                      {d.memberCount} 人 · {d.parentId ? `parent: ${d.parentId}` : '根'}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </MgmtPageShell>
  );
};
