import type { ResourceType } from './catalog';

export type GlobalSearchScope = 'all' | 'resources' | 'mine' | 'admin';

export type GlobalSearchGroupKey =
  | 'resources'
  | 'my_resources'
  | 'admin_tasks'
  | 'recent'
  | 'trending'
  | 'navigation';

export type GlobalSearchItemKind =
  | 'resource'
  | 'my_resource'
  | 'audit'
  | 'developer_application'
  | 'navigation';

export interface GlobalSearchResponse {
  query: string;
  groups: GlobalSearchGroup[];
}

export interface GlobalSearchGroup {
  key: GlobalSearchGroupKey;
  title: string;
  items: GlobalSearchItem[];
}

export interface GlobalSearchItem {
  id: string;
  kind: GlobalSearchItemKind;
  title: string;
  subtitle?: string;
  description?: string;
  badge?: string;
  resourceType?: ResourceType;
  resourceId?: string;
  path: string;
  score?: number;
}
