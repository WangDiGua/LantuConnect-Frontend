import {
  AGENT_WORKSPACE_SUBITEM_ID,
  ADMIN_OVERVIEW_GROUPS,
  ADMIN_AGENT_MANAGEMENT_GROUPS,
  ADMIN_SKILL_MANAGEMENT_GROUPS,
  ADMIN_APP_MANAGEMENT_GROUPS,
  ADMIN_DATASET_MANAGEMENT_GROUPS,
  ADMIN_PROVIDER_MANAGEMENT_GROUPS,
  ADMIN_USER_MANAGEMENT_GROUPS,
  ADMIN_MONITORING_GROUPS,
  ADMIN_SYSTEM_CONFIG_GROUPS,
  USER_WORKSPACE_GROUPS,
  USER_MY_PUBLISH_GROUPS,
  USER_MY_SPACE_GROUPS,
  USER_SETTINGS_GROUPS,
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
    case 'agent-management':
      return { subItem: ADMIN_AGENT_MANAGEMENT_GROUPS[0].items[0].id };
    case 'skill-management':
      return { subItem: ADMIN_SKILL_MANAGEMENT_GROUPS[0].items[0].id };
    case 'app-management':
      return { subItem: ADMIN_APP_MANAGEMENT_GROUPS[0].items[0].id };
    case 'dataset-management':
      return { subItem: ADMIN_DATASET_MANAGEMENT_GROUPS[0].items[0].id };
    case 'provider-management':
      return { subItem: ADMIN_PROVIDER_MANAGEMENT_GROUPS[0].items[0].id };
    case 'user-management':
      return { subItem: ADMIN_USER_MANAGEMENT_GROUPS[0].items[0].id };
    case 'monitoring':
      return { subItem: ADMIN_MONITORING_GROUPS[0].items[0].id };
    case 'system-config':
      return { subItem: ADMIN_SYSTEM_CONFIG_GROUPS[0].items[0].id };
    case 'workspace':
      return { subItem: USER_WORKSPACE_GROUPS[0].items[0].id };
    case 'my-publish':
      return { subItem: USER_MY_PUBLISH_GROUPS[0].items[0].id };
    case 'my-space':
      return { subItem: USER_MY_SPACE_GROUPS[0].items[0].id };
    case 'user-settings':
      return { subItem: USER_SETTINGS_GROUPS[0].items[0].id };
    case 'agent-market':
    case 'skill-market':
    case 'app-market':
    case 'dataset-market':
      return { subItem: ROUTE_ROOT_SUB };
    default:
      return {};
  }
}

function isValidSubItemForSidebar(sidebarId: string, id: string): boolean {
  switch (sidebarId) {
    case 'overview':
      return flatItemIds(ADMIN_OVERVIEW_GROUPS).includes(id);
    case 'agent-management':
      return flatItemIds(ADMIN_AGENT_MANAGEMENT_GROUPS).includes(id);
    case 'skill-management':
      return flatItemIds(ADMIN_SKILL_MANAGEMENT_GROUPS).includes(id);
    case 'app-management':
      return flatItemIds(ADMIN_APP_MANAGEMENT_GROUPS).includes(id);
    case 'dataset-management':
      return flatItemIds(ADMIN_DATASET_MANAGEMENT_GROUPS).includes(id);
    case 'provider-management':
      return flatItemIds(ADMIN_PROVIDER_MANAGEMENT_GROUPS).includes(id);
    case 'user-management':
      return flatItemIds(ADMIN_USER_MANAGEMENT_GROUPS).includes(id);
    case 'monitoring':
      return flatItemIds(ADMIN_MONITORING_GROUPS).includes(id);
    case 'system-config':
      return flatItemIds(ADMIN_SYSTEM_CONFIG_GROUPS).includes(id);
    case 'workspace':
      return flatItemIds(USER_WORKSPACE_GROUPS).includes(id);
    case 'my-publish':
      return flatItemIds(USER_MY_PUBLISH_GROUPS).includes(id);
    case 'my-space':
      return flatItemIds(USER_MY_SPACE_GROUPS).includes(id);
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
    const activeAgentSubItem =
      typeof p.activeAgentSubItem === 'string' ? p.activeAgentSubItem : DEFAULTS.activeAgentSubItem;
    const activeAgentView: AgentView =
      p.activeAgentView === 'detail' || p.activeAgentView === 'create' ? p.activeAgentView : 'list';
    const selectedAgentId = typeof p.selectedAgentId === 'string' ? p.selectedAgentId : null;

    const sidebarWithSubItems = [
      'overview',
      'agent-management',
      'skill-management',
      'app-management',
      'dataset-management',
      'provider-management',
      'user-management',
      'monitoring',
      'system-config',
      'workspace',
      'my-publish',
      'my-space',
      'user-settings',
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
