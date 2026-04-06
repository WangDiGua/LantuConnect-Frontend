import type { ResourceCatalogItemVO, ResourceType } from '../types/dto/catalog';

/** 市场卡片上的紧凑数字展示（中文 locale，万 / k 缩略） */
export function formatMarketMetric(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n) || n < 0) return '0';
  const v = Math.floor(n);
  if (v >= 100000000) return `${(v / 100000000).toFixed(v % 100000000 === 0 ? 0 : 1)}亿`;
  if (v >= 10000) return `${(v / 10000).toFixed(v % 10000 === 0 ? 0 : 1)}万`;
  if (v >= 1000) return `${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}k`;
  return v.toLocaleString('zh-CN');
}

export function catalogPrimaryMetricLabel(rt: ResourceType): '调用量' | '使用量' | '下载量' {
  switch (rt) {
    case 'app':
      return '使用量';
    case 'skill':
    case 'dataset':
      return '下载量';
    default:
      return '调用量';
  }
}

export function catalogPrimaryMetricValue(
  rt: ResourceType,
  item: Pick<ResourceCatalogItemVO, 'callCount' | 'usageCount' | 'downloadCount'>,
): number {
  switch (rt) {
    case 'app':
      return Math.max(0, Number(item.usageCount ?? 0));
    case 'skill':
    case 'dataset':
      return Math.max(0, Number(item.downloadCount ?? 0));
    default:
      return Math.max(0, Number(item.callCount ?? 0));
  }
}

export function catalogViewCountValue(item: Pick<ResourceCatalogItemVO, 'viewCount'>): number {
  return Math.max(0, Number(item.viewCount ?? 0));
}

/** 作者展示：优先 createdByName，其次占位 */
export function catalogAuthorDisplay(item: Pick<ResourceCatalogItemVO, 'createdByName' | 'createdBy' | 'sourceType'>): string {
  const name = item.createdByName?.trim();
  if (name) return name;
  if (item.createdBy != null && Number.isFinite(Number(item.createdBy))) return `用户 #${item.createdBy}`;
  const st = item.sourceType;
  if (st === 'internal') return '校内团队';
  if (st === 'partner') return '合作伙伴';
  if (st === 'cloud') return '云服务';
  return '—';
}
