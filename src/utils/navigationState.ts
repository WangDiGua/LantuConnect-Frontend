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
  activeSidebar: '系统概览',
  activeSubItem: '系统概览',
  activeAgentSubItem: AGENT_WORKSPACE_SUBITEM_ID,
  activeAgentView: 'list',
  selectedAgentId: null,
};

function flatItemIds(groups: { items: { id: string }[] }[]): string[] {
  return groups.flatMap((g) => g.items.map((i) => i.id));
}

export function getFirstSubItemForSidebar(sidebarId: string): { subItem?: string; agentSubItem?: string } {
  switch (sidebarId) {
    case '系统概览':
      return { subItem: ADMIN_OVERVIEW_GROUPS[0].items[0].id };
    case '系统配置':
      return { subItem: ADMIN_SYSTEM_CONFIG_GROUPS[0].items[0].id };
    case '用户管理':
      return { subItem: ADMIN_USER_MANAGEMENT_GROUPS[0].items[0].id };
    case '模型服务管理':
      return { subItem: ADMIN_MODEL_SERVICE_GROUPS[0].items[0].id };
    case '工具管理':
      return { subItem: ADMIN_TOOL_MANAGEMENT_GROUPS[0].items[0].id };
    case '运营与安全':
      return { subItem: ADMIN_OPS_SECURITY_GROUPS[0].items[0].id };
    case '集成与中台':
      return { subItem: ADMIN_INTEGRATION_GROUPS[0].items[0].id };
    case '监控中心':
      return { subItem: ADMIN_MONITORING_GROUPS[0].items[0].id };
    case '数据管理':
      return { subItem: ADMIN_DATA_MANAGEMENT_GROUPS[0].items[0].id };
    case '系统日志':
      return { subItem: ADMIN_SYSTEM_LOG_GROUPS[0].items[0].id };
    case '工作台':
      return { subItem: USER_WORKSPACE_GROUPS[0].items[0].id };
    case '我的 Agent':
      return { agentSubItem: USER_AGENT_MANAGEMENT_GROUPS[0].items[0].id };
    case '工作流':
      return { subItem: USER_WORKFLOW_GROUPS[0].items[0].id };
    case '我的资产':
      return { subItem: USER_ASSETS_GROUPS[0].items[0].id };
    case '模型服务':
      return { subItem: USER_MODEL_SERVICE_GROUPS[0].items[0].id };
    case '工具广场':
      return { subItem: USER_TOOL_SQUARE_GROUPS[0].items[0].id };
    case '发布与连接':
      return { subItem: USER_PUBLISH_GROUPS[0].items[0].id };
    case '我的数据':
      return { subItem: USER_DATA_GROUPS[0].items[0].id };
    case '用量账单':
      return { subItem: USER_USAGE_GROUPS[0].items[0].id };
    case '个人设置':
      return { subItem: USER_SETTINGS_GROUPS[0].items[0].id };
    case 'Agent 管理':
      return { agentSubItem: AGENT_MANAGEMENT_GROUPS[0].items[0].id };
    case 'AI 助手':
    case '文档教程':
      return { subItem: ROUTE_ROOT_SUB };
    default:
      return {};
  }
}

function isValidAgentSubItem(id: string, sidebarId: string): boolean {
  if (sidebarId === '我的 Agent' || sidebarId === 'Agent 管理') {
    return (
      flatItemIds(USER_AGENT_MANAGEMENT_GROUPS).includes(id) ||
      flatItemIds(AGENT_MANAGEMENT_GROUPS).includes(id)
    );
  }
  return false;
}

function isValidSubItemForSidebar(sidebarId: string, id: string): boolean {
  switch (sidebarId) {
    case '系统概览':
      return flatItemIds(ADMIN_OVERVIEW_GROUPS).includes(id);
    case '系统配置':
      return flatItemIds(ADMIN_SYSTEM_CONFIG_GROUPS).includes(id);
    case '用户管理':
      return flatItemIds(ADMIN_USER_MANAGEMENT_GROUPS).includes(id);
    case '模型服务管理':
      return flatItemIds(ADMIN_MODEL_SERVICE_GROUPS).includes(id);
    case '工具管理':
      return flatItemIds(ADMIN_TOOL_MANAGEMENT_GROUPS).includes(id);
    case '运营与安全':
      return flatItemIds(ADMIN_OPS_SECURITY_GROUPS).includes(id);
    case '集成与中台':
      return flatItemIds(ADMIN_INTEGRATION_GROUPS).includes(id);
    case '监控中心':
      return flatItemIds(ADMIN_MONITORING_GROUPS).includes(id) || flatItemIds(MONITORING_GROUPS).includes(id);
    case '数据管理':
      return flatItemIds(ADMIN_DATA_MANAGEMENT_GROUPS).includes(id);
    case '系统日志':
      return flatItemIds(ADMIN_SYSTEM_LOG_GROUPS).includes(id);
    case '工作台':
      return flatItemIds(USER_WORKSPACE_GROUPS).includes(id);
    case '我的资产':
      return flatItemIds(USER_ASSETS_GROUPS).includes(id);
    case '工作流':
      return flatItemIds(USER_WORKFLOW_GROUPS).includes(id);
    case '模型服务':
      return flatItemIds(USER_MODEL_SERVICE_GROUPS).includes(id) || flatItemIds(MODEL_SERVICE_GROUPS).includes(id);
    case '工具广场':
      return flatItemIds(USER_TOOL_SQUARE_GROUPS).includes(id) || flatItemIds(TOOL_SQUARE_GROUPS).includes(id);
    case '发布与连接':
      return flatItemIds(USER_PUBLISH_GROUPS).includes(id);
    case '我的数据':
      return flatItemIds(USER_DATA_GROUPS).includes(id);
    case '用量账单':
      return flatItemIds(USER_USAGE_GROUPS).includes(id);
    case '个人设置':
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

    if (activeSidebar === 'Agent 管理' || activeSidebar === '我的 Agent') {
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
      '系统概览',
      '系统配置',
      '用户管理',
      '模型服务管理',
      '工具管理',
      '运营与安全',
      '集成与中台',
      '监控中心',
      '数据管理',
      '系统日志',
      '工作台',
      '工作流',
      '我的资产',
      '模型服务',
      '工具广场',
      '发布与连接',
      '我的数据',
      '用量账单',
      '个人设置',
      '监控中心',
      '系统配置',
      '用户管理',
      '模型服务',
      '工具广场',
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
