import type { ResourceType } from '../types/dto/catalog';
import type { TagItem } from '../types/dto/tag';

/** Align with TagManagementPage normalisation */
export function normalizeTagCategoryLabel(raw: string | undefined | null): string {
  const s = String(raw ?? '').trim();
  if (/^mcp$/i.test(s)) return 'MCP';
  if (/^agent$/i.test(s)) return 'Agent';
  if (/^skill$/i.test(s)) return 'Skill';
  return s;
}

const RESOURCE_TAG_CATEGORY: Record<ResourceType, string> = {
  agent: 'Agent',
  skill: 'Skill',
  mcp: 'MCP',
  app: '应用',
  dataset: '数据集',
};

/** Tags from GET /tags that belong to this resource type (by tag.category). */
export function filterTagsForResourceType(all: TagItem[], resourceType: ResourceType): TagItem[] {
  const want = RESOURCE_TAG_CATEGORY[resourceType];
  return all
    .filter((t) => normalizeTagCategoryLabel(t.category) === want)
    .sort((a, b) => (b.usageCount ?? 0) - (a.usageCount ?? 0));
}
