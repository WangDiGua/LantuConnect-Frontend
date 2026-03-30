import type { ResourceType } from '../types/dto/catalog';

export const RESOURCE_TYPES: ResourceType[] = ['agent', 'skill', 'mcp', 'app', 'dataset'];

export const RESOURCE_TYPE_LABEL_ZH: Record<ResourceType, string> = {
  agent: '智能体',
  skill: '技能',
  mcp: 'MCP',
  app: '应用',
  dataset: '数据集',
};

export const RESOURCE_TYPE_LIST_PAGE: Record<ResourceType, string> = {
  agent: 'agent-list',
  skill: 'skill-list',
  mcp: 'mcp-server-list',
  app: 'app-list',
  dataset: 'dataset-list',
};

export const RESOURCE_TYPE_REGISTER_PAGE: Record<ResourceType, string> = {
  agent: 'agent-register',
  skill: 'skill-register',
  mcp: 'mcp-register',
  app: 'app-register',
  dataset: 'dataset-register',
};

export const LEGACY_USER_RESOURCE_PAGES = new Set<string>([
  'agent-list',
  'skill-list',
  'mcp-server-list',
  'app-list',
  'dataset-list',
]);

export function parseResourceType(raw?: string | null): ResourceType | undefined {
  if (!raw) return undefined;
  return RESOURCE_TYPES.includes(raw as ResourceType) ? (raw as ResourceType) : undefined;
}

