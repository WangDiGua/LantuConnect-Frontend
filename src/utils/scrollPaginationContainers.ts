/**
 * 分页切换后滚回相关滚动容器顶部，避免仍停留在上一页的滚动位置。
 * - 自 origin 向上遍历可纵向滚动的祖先并复位；
 * - 再回落到布局标记节点（管理台内层、主内容区）与 window。
 */
export function scrollPaginationContainersToTop(origin: Element | null | undefined): void {
  let el: Element | null = origin ?? null;
  while (el) {
    if (el instanceof HTMLElement) {
      const st = window.getComputedStyle(el);
      const oy = st.overflowY;
      if (
        (oy === 'auto' || oy === 'scroll') &&
        el.scrollHeight > el.clientHeight + 1 &&
        el.scrollTop > 0
      ) {
        el.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      }
    }
    el = el.parentElement;
  }

  const inner = document.querySelector('[data-lantu-inner-scroll]');
  if (inner instanceof HTMLElement && inner.scrollTop > 0) {
    inner.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }

  const main = document.querySelector('[data-lantu-main-scroll]');
  if (main instanceof HTMLElement && main.scrollTop > 0) {
    main.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }

  if (window.scrollY > 0) {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }
}
