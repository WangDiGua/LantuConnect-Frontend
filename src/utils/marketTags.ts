import type { ResourceType } from '../types/dto/catalog';
import type { TagItem } from '../types/dto/tag';

/**
 * 与后台 `t_tag.category` 及 TagManagement 一致：库内存小写英文 slug（agent/skill/mcp/app/dataset/general）。
 * 旧实现误用中文「应用」「数据集」比对，导致 app/dataset 广场侧栏目录标签被滤空。
 */
export function filterTagsForResourceType(all: TagItem[], resourceType: ResourceType): TagItem[] {
  const want = resourceType.toLowerCase();
  return all
    .filter((t) => {
      const c = String(t.category ?? '').trim().toLowerCase();
      return c === want || c === 'general';
    })
    .sort((a, b) => (b.usageCount ?? 0) - (a.usageCount ?? 0));
}
