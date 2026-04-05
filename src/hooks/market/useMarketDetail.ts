import { useState, useCallback } from 'react';
import type { UseMarketDetailOptions, UseMarketDetailReturn } from './types';

/**
 * 列表内打开详情的轻量状态（openDetailById）。
 * 深链请使用路径 `/user/{center}/:id`；`?resourceId=` 由 MainLayout 统一重定向为路径形式。
 */
export function useMarketDetail<T>(
  options: UseMarketDetailOptions<T>,
): UseMarketDetailReturn<T> {
  const { items, getId } = options;

  const [detailItem, setDetailItem] = useState<T | null>(null);

  const openDetailById = useCallback(
    (id: string | number) => {
      const item = items.find((i) => String(getId(i)) === String(id));
      if (item) {
        setDetailItem(item);
      }
    },
    [items, getId],
  );

  const closeModal = useCallback(() => {
    setDetailItem(null);
  }, []);

  return {
    detailItem,
    setDetailItem,
    openDetailById,
    closeModal,
  };
}
