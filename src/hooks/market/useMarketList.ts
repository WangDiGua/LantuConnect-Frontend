import { useState, useEffect, useCallback, useMemo } from 'react';
import type { 
  MarketBaseItem, 
  MarketListParams, 
  UseMarketListOptions, 
  UseMarketListReturn 
} from './types';

export function useMarketList<T extends MarketBaseItem>(
  options: UseMarketListOptions<T>
): UseMarketListReturn<T> {
  const {
    service,
    pageSize = 20,
    autoLoad = true,
    showMessage,
  } = options;

  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(autoLoad);
  const [error, setError] = useState<Error | null>(null);
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const loadItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: MarketListParams = {
        status: 'published',
        pageSize,
        page,
        keyword: keyword.trim() || undefined,
      };

      const result = await service.list(params);
      setItems(result.list);
      setTotal(result.total ?? result.list.length);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('加载列表失败');
      setError(error);
      showMessage?.(error.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [service, pageSize, page, keyword, showMessage]);

  useEffect(() => {
    if (autoLoad) {
      void loadItems();
    }
  }, [loadItems, autoLoad]);

  useEffect(() => {
    setPage(1);
  }, [keyword]);

  const refresh = useCallback(() => {
    void loadItems();
  }, [loadItems]);

  const hasMore = useMemo(() => {
    return items.length < total;
  }, [items.length, total]);

  return {
    items,
    loading,
    error,
    keyword,
    setKeyword,
    page,
    setPage,
    total,
    refresh,
    hasMore,
  };
}
