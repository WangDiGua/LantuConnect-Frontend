import { useLayoutEffect, useRef } from 'react';
import { scrollPaginationContainersToTop } from '../utils/scrollPaginationContainers';

/**
 * 页码变化时（含筛选把页码打回 1）将主布局/管理台内层滚回收顶；跳过首次挂载以免干扰路由进入时的滚动。
 */
export function useScrollPaginatedContentToTop(page: number): void {
  const isFirst = useRef(true);
  useLayoutEffect(() => {
    if (isFirst.current) {
      isFirst.current = false;
      return;
    }
    scrollPaginationContainersToTop(undefined);
  }, [page]);
}
