import React from 'react';
import type { Theme } from '../../types';
import {
  accessPolicyBadgeClass,
  accessPolicyShortLabel,
  normalizeAccessPolicy,
  type ResourceAccessPolicyWire,
} from '../../utils/accessPolicy';
import { textMuted } from '../../utils/uiClasses';

interface Props {
  theme: Theme;
  /** 原始接口值（snake/camel 均可，内部归一化） */
  value?: string | null;
  className?: string;
  /** 缺字段时：hide=不渲染；grant_required=按默认值展示（资源中心等接口应返回 accessPolicy） */
  whenMissing?: 'hide' | 'grant_required';
  /** 为 true 时在徽章下展示一行说明（详情侧栏） */
  showHint?: boolean;
}

export const AccessPolicyBadge: React.FC<Props> = ({
  theme,
  value,
  className = '',
  whenMissing = 'grant_required',
  showHint,
}) => {
  const trimmed = value != null ? String(value).trim() : '';
  const parsed = trimmed ? normalizeAccessPolicy(trimmed) : undefined;
  if (!parsed) {
    if (whenMissing === 'hide') return null;
  }
  const p: ResourceAccessPolicyWire = parsed ?? 'grant_required';
  const label = accessPolicyShortLabel(p);
  return (
    <div className={className}>
      <span
        className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold ${accessPolicyBadgeClass(p, theme)}`}
        title="资源消费策略：控制网关侧是否要求 per-resource Grant（见接入文档 accessPolicy）"
      >
        消费策略 · {label}
      </span>
      {showHint ? (
        <p className={`mt-1 text-[11px] leading-snug ${textMuted(theme)}`}>
          {p === 'grant_required' && '须显式授权（Grant）后方可按 Key 消费。'}
          {p === 'open_org' && '同部门用户 Key 在策略允许下可免 Grant。'}
          {p === 'open_platform' && '租户内有效 Key 在 scope 满足下可免 Grant；不等于对公网匿名开放。'}
        </p>
      ) : null}
    </div>
  );
};
