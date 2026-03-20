import {
  AGENT_MANAGEMENT_GROUPS,
  AGENT_WORKSPACE_SUBITEM_ID,
  MONITORING_GROUPS,
  SYSTEM_CONFIG_GROUPS,
  USER_MANAGEMENT_GROUPS,
  MODEL_SERVICE_GROUPS,
  TOOL_SQUARE_GROUPS,
  ADMIN_OVERVIEW_GROUPS,
  ADMIN_SYSTEM_CONFIG_GROUPS,
  ADMIN_USER_MANAGEMENT_GROUPS,
  ADMIN_MODEL_SERVICE_GROUPS,
  ADMIN_TOOL_MANAGEMENT_GROUPS,
  ADMIN_MONITORING_GROUPS,
  ADMIN_DATA_MANAGEMENT_GROUPS,
  ADMIN_SYSTEM_LOG_GROUPS,
  ADMIN_OPS_SECURITY_GROUPS,
  ADMIN_INTEGRATION_GROUPS,
  USER_WORKSPACE_GROUPS,
  USER_AGENT_MANAGEMENT_GROUPS,
  USER_ASSETS_GROUPS,
  USER_MODEL_SERVICE_GROUPS,
  USER_TOOL_SQUARE_GROUPS,
  USER_DATA_GROUPS,
  USER_SETTINGS_GROUPS,
  USER_WORKFLOW_GROUPS,
  USER_PUBLISH_GROUPS,
  USER_USAGE_GROUPS,
} from '../constants/navigation';
import { ROUTE_ROOT_SUB } from '../constants/routeRoot';
import { encryptStorage, decryptStorage } from '../lib/security';

export const NAV_STORAGE_KEY = 'lantu-main-nav';

export type AgentView = 'list' | 'detail' | 'create';

export interface PersistedNavState {
  activeSidebar: string;
  activeSubItem: string;
  activeAgentSubItem: string;
  activeAgentView: AgentView;
  selectedAgentId: string | null;
}

const DEFAULTS: PersistedNavState = {
  activeSidebar: 'overview',
  activeSubItem: 'overview',
  activeAgentSubItem: AGENT_WORKSPACE_SUBITEM_ID,
  activeAgentView: 'list',
  selectedAgentId: null,
};

function flatItemIds(groups: { items: { id: string }[] }[]): string[] {
  return groups.flatMap((g) => g.items.map((i) => i.id));
}

export function getFirstSubItemForSidebar(sidebarId: string): { subItem?: string; agentSubItem?: string } {
  switch (sidebarId) {
    case 'overview':
      return { subItem: ADMIN_OVERVIEW_GROUPS[0].items[0].id };
    case 'system-config':
      return { subItem: ADMIN_SYSTEM_CONFIG_GROUPS[0].items[0].id };
    case 'user-management':
      return { subItem: ADMIN_USER_MANAGEMENT_GROUPS[0].items[0].id };
    case 'model-service':
      return { subItem: ADMIN_MODEL_SERVICE_GROUPS[0].items[0].id };
    case 'tool-management':
      return { subItem: ADMIN_TOOL_MANAGEMENT_GROUPS[0].items[0].id };
    case 'ops-security':
      return { subItem: ADMIN_OPS_SECURITY_GROUPS[0].items[0].id };
    case 'integration':
      return { subItem: ADMIN_INTEGRATION_GROUPS[0].items[0].id };
    case 'monitoring':
      return { subItem: ADMIN_MONITORING_GROUPS[0].items[0].id };
    case 'data-management':
      return { subItem: ADMIN_DATA_MANAGEMENT_GROUPS[0].items[0].id };
    case 'system-log':
      return { subItem: ADMIN_SYSTEM_LOG_GROUPS[0].items[0].id };
    case 'workspace':
      return { subItem: USER_WORKSPACE_GROUPS[0].items[0].id };
    case 'my-agent':
      return { agentSubItem: USER_AGENT_MANAGEMENT_GROUPS[0].items[0].id };
    case 'workflow':
      return { subItem: USER_WORKFLOW_GROUPS[0].items[0].id };
    case 'my-assets':
      return { subItem: USER_ASSETS_GROUPS[0].items[0].id };
    case 'model-service':
      return { subItem: USER_MODEL_SERVICE_GROUPS[0].items[0].id };
    case 'tool-square':
      return { subItem: USER_TOOL_SQUARE_GROUPS[0].items[0].id };
    case 'publish-connect':
      return { subItem: USER_PUBLISH_GROUPS[0].items[0].id };
    case 'my-data':
      return { subItem: USER_DATA_GROUPS[0].items[0].id };
    case 'usage-billing':
      return { subItem: USER_USAGE_GROUPS[0].items[0].id };
    case 'user-settings':
      return { subItem: USER_SETTINGS_GROUPS[0].items[0].id };
    case 'agent-management':
      return { agentSubItem: AGENT_MANAGEMENT_GROUPS[0].items[0].id };
    case 'AI 助手':
    case 'docs-tutorial':
      return { subItem: ROUTE_ROOT_SUB };
    default:
      return {};
  }
}

function isValidAgentSubItem(id: string, sidebarId: string): boolean {
  if (sidebarId === 'my-agent' || sidebarId === 'agent-management') {
    return (
      flatItemIds(USER_AGENT_MANAGEMENT_GROUPS).includes(id) ||
      flatItemIds(AGENT_MANAGEMENT_GROUPS).includes(id)
    );
  }
  return false;
}

function isValidSubItemForSidebar(sidebarId: string, id: string): boolean {
  switch (sidebarId) {
    case 'overview':
      return flatItemIds(ADMIN_OVERVIEW_GROUPS).includes(id);
    case 'system-config':
      return flatItemIds(ADMIN_SYSTEM_CONFIG_GROUPS).includes(id);
    case 'user-management':
      return flatItemIds(ADMIN_USER_MANAGEMENT_GROUPS).includes(id);
    case 'model-service':
      return flatItemIds(ADMIN_MODEL_SERVICE_GROUPS).includes(id);
    case 'tool-management':
      return flatItemIds(ADMIN_TOOL_MANAGEMENT_GROUPS).includes(id);
    case 'ops-security':
      return flatItemIds(ADMIN_OPS_SECURITY_GROUPS).includes(id);
    case 'integration':
      return flatItemIds(ADMIN_INTEGRATION_GROUPS).includes(id);
    case 'monitoring':
      return flatItemIds(ADMIN_MONITORING_GROUPS).includes(id) || flatItemIds(MONITORING_GROUPS).includes(id);
    case 'data-management':
      return flatItemIds(ADMIN_DATA_MANAGEMENT_GROUPS).includes(id);
    case 'system-log':
      return flatItemIds(ADMIN_SYSTEM_LOG_GROUPS).includes(id);
    case 'workspace':
      return flatItemIds(USER_WORKSPACE_GROUPS).includes(id);
    case 'my-assets':
      return flatItemIds(USER_ASSETS_GROUPS).includes(id);
    case 'workflow':
      return flatItemIds(USER_WORKFLOW_GROUPS).includes(id);
    case 'model-service':
      return flatItemIds(USER_MODEL_SERVICE_GROUPS).includes(id) || flatItemIds(MODEL_SERVICE_GROUPS).includes(id);
    case 'tool-square':
      return flatItemIds(USER_TOOL_SQUARE_GROUPS).includes(id) || flatItemIds(TOOL_SQUARE_GROUPS).includes(id);
    case 'publish-connect':
      return flatItemIds(USER_PUBLISH_GROUPS).includes(id);
    case 'my-data':
      return flatItemIds(USER_DATA_GROUPS).includes(id);
    case 'usage-billing':
      return flatItemIds(USER_USAGE_GROUPS).includes(id);
    case 'user-settings':
      return flatItemIds(USER_SETTINGS_GROUPS).includes(id);
    default:
      return false;
  }
}

export function readPersistedNavState(): PersistedNavState {
  try {
    const p = decryptStorage<Partial<PersistedNavState>>(NAV_STORAGE_KEY);
    if (!p) return { ...DEFAULTS };
    const activeSidebar = typeof p.activeSidebar === 'string' ? p.activeSidebar : DEFAULTS.activeSidebar;
    let activeSubItem = typeof p.activeSubItem === 'string' ? p.activeSubItem : DEFAULTS.activeSubItem;
    let activeAgentSubItem =
      typeof p.activeAgentSubItem === 'string' ? p.activeAgentSubItem : DEFAULTS.activeAgentSubItem;
    const activeAgentView: AgentView =
      p.activeAgentView === 'detail' || p.activeAgentView === 'create' ? p.activeAgentView : 'list';
    const selectedAgentId = typeof p.selectedAgentId === 'string' ? p.selectedAgentId : null;

    if (activeSidebar === 'agent-management' || activeSidebar === 'my-agent') {
      const legacyWorkspace = ['Agent 列表', 'Agent 创建', 'Agent 详情', 'Agent 测试'];
      if (legacyWorkspace.includes(activeAgentSubItem)) {
        activeAgentSubItem = AGENT_WORKSPACE_SUBITEM_ID;
      }
      if (!isValidAgentSubItem(activeAgentSubItem, activeSidebar)) {
        const first = getFirstSubItemForSidebar(activeSidebar).agentSubItem;
        if (first) activeAgentSubItem = first;
      }
    }

    const sidebarWithSubItems = [
      'overview',
      'system-config',
      'user-management',
      'model-service',
      'tool-management',
      'ops-security',
      'integration',
      'monitoring',
      'data-management',
      'system-log',
      'workspace',
      'workflow',
      'my-assets',
      'model-service',
      'tool-square',
      'publish-connect',
      'my-data',
      'usage-billing',
      'user-settings',
      'monitoring',
      'system-config',
      'user-management',
      'model-service',
      'tool-square',
    ];

    if (sidebarWithSubItems.includes(activeSidebar)) {
      if (!isValidSubItemForSidebar(activeSidebar, activeSubItem)) {
        const first = getFirstSubItemForSidebar(activeSidebar).subItem;
        if (first) activeSubItem = first;
      }
    }

    let view: AgentView = activeAgentView;
    let sid = selectedAgentId;
    if (view === 'detail' && !sid) {
      view = 'list';
    }

    return {
      activeSidebar,
      activeSubItem,
      activeAgentSubItem,
      activeAgentView: view,
      selectedAgentId: sid,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export function writePersistedNavState(state: PersistedNavState): void {
  try {
    encryptStorage(NAV_STORAGE_KEY, state);
  } catch {
    /* ignore quota */
  }
}
