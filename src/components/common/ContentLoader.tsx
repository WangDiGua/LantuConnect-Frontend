import React from 'react';
import { PageSkeleton } from './PageSkeleton';

interface ContentLoaderProps {
  theme?: 'light' | 'dark';
  loading?: boolean;
  children?: React.ReactNode;
}

/** 列表 / 管理页内容区加载：统一骨架屏，避免环形加载与路由级骨架叠加 */
export const ContentLoader: React.FC<ContentLoaderProps> = ({
  loading = false,
  children,
}) => {
  if (loading) {
    return (
      <div className="flex-1 w-full min-h-[min(400px,65vh)]">
        <PageSkeleton type="table" rows={10} />
      </div>
    );
  }

  return <>{children}</>;
};
