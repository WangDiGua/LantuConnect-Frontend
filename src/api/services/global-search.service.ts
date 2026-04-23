import { http } from '../../lib/http';
import type {
  GlobalSearchGroup,
  GlobalSearchGroupKey,
  GlobalSearchItem,
  GlobalSearchItemKind,
  GlobalSearchResponse,
  GlobalSearchScope,
} from '../../types/dto/global-search';
import type { ResourceType } from '../../types/dto/catalog';
import { extractArray } from '../../utils/normalizeApiPayload';

const GROUP_KEYS = new Set<GlobalSearchGroupKey>([
  'resources',
  'my_resources',
  'admin_tasks',
  'recent',
  'trending',
  'navigation',
]);

const ITEM_KINDS = new Set<GlobalSearchItemKind>([
  'resource',
  'my_resource',
  'audit',
  'developer_application',
  'navigation',
]);

const RESOURCE_TYPES = new Set<ResourceType>(['agent', 'skill', 'mcp', 'app', 'dataset']);

function record(raw: unknown): Record<string, unknown> {
  return raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
}

function str(v: unknown, fallback = ''): string {
  if (v == null) return fallback;
  const s = String(v);
  return s.length ? s : fallback;
}

function optStr(v: unknown): string | undefined {
  if (v == null) return undefined;
  const s = String(v).trim();
  return s || undefined;
}

function optNum(v: unknown): number | undefined {
  if (v == null || v === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function normalizeKind(v: unknown): GlobalSearchItemKind {
  const raw = String(v ?? '').trim() as GlobalSearchItemKind;
  return ITEM_KINDS.has(raw) ? raw : 'navigation';
}

function normalizeGroupKey(v: unknown): GlobalSearchGroupKey {
  const raw = String(v ?? '').trim() as GlobalSearchGroupKey;
  return GROUP_KEYS.has(raw) ? raw : 'navigation';
}

function normalizeResourceType(v: unknown): ResourceType | undefined {
  const raw = String(v ?? '').trim().toLowerCase() as ResourceType;
  return RESOURCE_TYPES.has(raw) ? raw : undefined;
}

function normalizeItem(raw: unknown): GlobalSearchItem | null {
  const x = record(raw);
  const title = optStr(x.title);
  const path = optStr(x.path);
  if (!title || !path) return null;
  return {
    id: str(x.id, `${normalizeKind(x.kind)}:${path}:${title}`),
    kind: normalizeKind(x.kind),
    title,
    subtitle: optStr(x.subtitle),
    description: optStr(x.description),
    badge: optStr(x.badge),
    resourceType: normalizeResourceType(x.resourceType ?? x.resource_type),
    resourceId: optStr(x.resourceId ?? x.resource_id),
    path,
    score: optNum(x.score),
  };
}

function normalizeGroup(raw: unknown): GlobalSearchGroup | null {
  const x = record(raw);
  const key = normalizeGroupKey(x.key);
  const items = extractArray(x.items).map(normalizeItem).filter((item): item is GlobalSearchItem => !!item);
  if (!items.length) return null;
  return {
    key,
    title: str(x.title, '搜索结果'),
    items,
  };
}

function normalizeResponse(raw: unknown): GlobalSearchResponse {
  const x = record(raw);
  return {
    query: str(x.query),
    groups: extractArray(x.groups).map(normalizeGroup).filter((group): group is GlobalSearchGroup => !!group),
  };
}

export const globalSearchService = {
  search: async (params?: { q?: string; scope?: GlobalSearchScope; limitPerGroup?: number }) => {
    const raw = await http.get<unknown>('/search/global', {
      params: {
        q: params?.q ?? '',
        scope: params?.scope ?? 'all',
        limitPerGroup: params?.limitPerGroup ?? 6,
      },
    });
    return normalizeResponse(raw);
  },
};
