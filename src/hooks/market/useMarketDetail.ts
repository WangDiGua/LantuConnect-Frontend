import { useState, useCallback, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { UseMarketDetailOptions, UseMarketDetailReturn } from './types';

export function useMarketDetail<T>(
  options: UseMarketDetailOptions<T>
): UseMarketDetailReturn<T> {
  const { items, loading, getId, showMessage } = options;

  const [detailItem, setDetailItem] = useState<T | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const processedResourceId = useRef<string | null>(null);

  useEffect(() => {
    const rid = searchParams.get('resourceId');
    if (!rid) {
      processedResourceId.current = null;
      return;
    }

    if (loading || items.length === 0) return;
    if (processedResourceId.current === rid) return;

    processedResourceId.current = rid;
    const next = new URLSearchParams(searchParams);
    next.delete('resourceId');
    setSearchParams(next, { replace: true });

    const hit = items.find((item) => String(getId(item)) === String(rid));
    if (hit) {
      setDetailItem(hit);
    } else {
      showMessage?.('未在已上架列表中找到该资源，请确认资源已发布且 ID 正确', 'warning');
    }
  }, [loading, items, searchParams, setSearchParams, getId, showMessage]);

  const openDetailById = useCallback(
    (id: string | number) => {
      const item = items.find((i) => String(getId(i)) === String(id));
      if (item) {
        setDetailItem(item);
      }
    },
    [items, getId]
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
