import {
  AGENT_MANAGEMENT_GROUPS,
  AGENT_WORKSPACE_SUBITEM_ID,
  MONITORING_GROUPS,
  SYSTEM_CONFIG_GROUPS,
  USER_MANAGEMENT_GROUPS,
  MODEL_SERVICE_GROUPS,
  TOOL_SQUARE_GROUPS,
} from '../constants/navigation';

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
  activeSidebar: '概览',
  activeSubItem: '监控概览',
  activeAgentSubItem: AGENT_WORKSPACE_SUBITEM_ID,
  activeAgentView: 'list',
  selectedAgentId: null,
};

function flatItemIds(groups: { items: { id: string }[] }[]): string[] {
  return groups.flatMap((g) => g.items.map((i) => i.id));
}

export function getFirstSubItemForSidebar(sidebarId: string): { subItem?: string; agentSubItem?: string } {
  switch (sidebarId) {
    case 'Agent 管理':
      return { agentSubItem: AGENT_MANAGEMENT_GROUPS[0].items[0].id };
    case '监控中心':
      return { subItem: MONITORING_GROUPS[0].items[0].id };
    case '系统配置':
      return { subItem: SYSTEM_CONFIG_GROUPS[0].items[0].id };
    case '用户管理':
      return { subItem: USER_MANAGEMENT_GROUPS[0].items[0].id };
    case '模型服务':
      return { subItem: MODEL_SERVICE_GROUPS[0].items[0].id };
    case '工具广场':
      return { subItem: TOOL_SQUARE_GROUPS[0].items[0].id };
    default:
      return {};
  }
}

function isValidAgentSubItem(id: string): boolean {
  return flatItemIds(AGENT_MANAGEMENT_GROUPS).includes(id);
}

function isValidSubItemForSidebar(sidebarId: string, id: string): boolean {
  switch (sidebarId) {
    case '监控中心':
      return flatItemIds(MONITORING_GROUPS).includes(id);
    case '系统配置':
      return flatItemIds(SYSTEM_CONFIG_GROUPS).includes(id);
    case '用户管理':
      return flatItemIds(USER_MANAGEMENT_GROUPS).includes(id);
    case '模型服务':
      return flatItemIds(MODEL_SERVICE_GROUPS).includes(id);
    case '工具广场':
      return flatItemIds(TOOL_SQUARE_GROUPS).includes(id);
    default:
      return false;
  }
}

export function readPersistedNavState(): PersistedNavState {
  try {
    const raw = localStorage.getItem(NAV_STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    const p = JSON.parse(raw) as Partial<PersistedNavState>;
    const activeSidebar = typeof p.activeSidebar === 'string' ? p.activeSidebar : DEFAULTS.activeSidebar;
    let activeSubItem = typeof p.activeSubItem === 'string' ? p.activeSubItem : DEFAULTS.activeSubItem;
    let activeAgentSubItem =
      typeof p.activeAgentSubItem === 'string' ? p.activeAgentSubItem : DEFAULTS.activeAgentSubItem;
    const activeAgentView: AgentView =
      p.activeAgentView === 'detail' || p.activeAgentView === 'create' ? p.activeAgentView : 'list';
    const selectedAgentId = typeof p.selectedAgentId === 'string' ? p.selectedAgentId : null;

    if (activeSidebar === 'Agent 管理') {
      const legacyWorkspace = ['Agent 列表', 'Agent 创建', 'Agent 详情', 'Agent 测试'];
      if (legacyWorkspace.includes(activeAgentSubItem)) {
        activeAgentSubItem = AGENT_WORKSPACE_SUBITEM_ID;
      }
      if (!isValidAgentSubItem(activeAgentSubItem)) {
        activeAgentSubItem = AGENT_MANAGEMENT_GROUPS[0].items[0].id;
      }
    }

    if (['监控中心', '系统配置', '用户管理', '模型服务', '工具广场'].includes(activeSidebar)) {
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
    localStorage.setItem(NAV_STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore quota */
  }
}
