import type { ResourceType } from '../types/dto/catalog';

/** 统一五类资源（与后端 resource_type / 网关一致） */
export const RESOURCE_TYPES: ResourceType[] = ['agent', 'skill', 'mcp', 'app', 'dataset'];

export const RESOURCE_TYPE_ORDER = RESOURCE_TYPES as readonly ResourceType[];

export type UnifiedResourceType = ResourceType;

export const RESOURCE_TYPE_LABEL_ZH: Record<ResourceType, string> = {
  agent: '智能体',
  skill: '技能',
  mcp: 'MCP',
  app: '应用',
  dataset: '数据集',
};

/** 含 unknown 等扩展键，用于仪表盘/日志原始类型映射 */
export const RESOURCE_TYPE_LABEL: Record<string, string> = {
  ...RESOURCE_TYPE_LABEL_ZH,
  unknown: '未分类',
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

const RESOURCE_TYPE_ALIASES: Record<string, ResourceType> = {
  agents: 'agent',
  skills: 'skill',
  mcps: 'mcp',
  'mcp-server': 'mcp',
  mcp_server: 'mcp',
  apps: 'app',
  datasets: 'dataset',
};

export function parseResourceType(raw?: string | null): ResourceType | undefined {
  if (raw == null || String(raw).trim() === '') return undefined;
  const k = String(raw).toLowerCase().trim();
  const v = (RESOURCE_TYPE_ALIASES[k] ?? k) as ResourceType;
  return RESOURCE_TYPES.includes(v) ? v : undefined;
}

export function resourceTypeLabel(type: string | undefined | null): string {
  const k = String(type ?? '').toLowerCase().trim();
  if (!k) return '—';
  return RESOURCE_TYPE_LABEL[k] ?? k;
}
