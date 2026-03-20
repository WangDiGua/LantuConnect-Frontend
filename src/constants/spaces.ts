import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  Activity,
  Server,
  Shield,
  Bot,
  Layers,
  Database,
  BarChart3,
} from 'lucide-react';

import {
  ADMIN_OVERVIEW_GROUPS,
  ADMIN_SYSTEM_CONFIG_GROUPS,
  ADMIN_USER_MANAGEMENT_GROUPS,
  ADMIN_MODEL_SERVICE_GROUPS,
  ADMIN_TOOL_MANAGEMENT_GROUPS,
  ADMIN_OPS_SECURITY_GROUPS,
  ADMIN_INTEGRATION_GROUPS,
  ADMIN_MONITORING_GROUPS,
  ADMIN_DATA_MANAGEMENT_GROUPS,
  ADMIN_SYSTEM_LOG_GROUPS,
  USER_WORKSPACE_GROUPS,
  USER_AGENT_MANAGEMENT_GROUPS,
  USER_WORKFLOW_GROUPS,
  USER_ASSETS_GROUPS,
  USER_MODEL_SERVICE_GROUPS,
  USER_TOOL_SQUARE_GROUPS,
  USER_PUBLISH_GROUPS,
  USER_DATA_GROUPS,
  USER_USAGE_GROUPS,
  USER_SETTINGS_GROUPS,
} from './navigation';

import { ROUTE_ROOT_SUB } from './routeRoot';
import { encryptStorage, decryptStorage } from '../lib/security';

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

export interface SpaceNavItem {
  label: string;
  icon: LucideIcon;
  sidebarId: string;
  subItemId: string;
  isAgentSub?: boolean;
}

export interface SpaceSection {
  title: string;
  sidebarId: string;
  items: SpaceNavItem[];
}

export interface Space {
  id: string;
  label: string;
  icon: LucideIcon;
  accentFrom: string;
  accentTo: string;
  sections: SpaceSection[];
}

// ---------------------------------------------------------------------------
// Helpers – convert existing navigation groups into SpaceSections
// ---------------------------------------------------------------------------

type NavGroup = {
  title: string;
  items: { id: string; icon: LucideIcon; label: string }[];
};

function fromGroups(
  sidebarId: string,
  groups: NavGroup[],
  isAgentSub = false,
): SpaceSection[] {
  return groups.map((g) => ({
    title: g.title,
    sidebarId,
    items: g.items.map((item) => ({
      label: item.label,
      icon: item.icon,
      sidebarId,
      subItemId: item.id,
      ...(isAgentSub ? { isAgentSub: true } : {}),
    })),
  }));
}

function standalone(
  sidebarId: string,
  label: string,
  icon: LucideIcon,
): SpaceSection[] {
  return [
    {
      title: label,
      sidebarId,
      items: [
        {
          label,
          icon,
          sidebarId,
          subItemId: ROUTE_ROOT_SUB,
        },
      ],
    },
  ];
}

// ---------------------------------------------------------------------------
// Admin Spaces
// ---------------------------------------------------------------------------

export const ADMIN_SPACES: Space[] = [
  {
    id: 'admin-overview',
    label: '工作台',
    icon: LayoutDashboard,
    accentFrom: '#3B82F6',
    accentTo: '#6366F1',
    sections: [...fromGroups('系统概览', ADMIN_OVERVIEW_GROUPS as NavGroup[])],
  },
  {
    id: 'admin-monitoring',
    label: '观测中心',
    icon: Activity,
    accentFrom: '#10B981',
    accentTo: '#14B8A6',
    sections: [...fromGroups('监控中心', ADMIN_MONITORING_GROUPS as NavGroup[])],
  },
  {
    id: 'admin-infra',
    label: '底层设施',
    icon: Server,
    accentFrom: '#F59E0B',
    accentTo: '#EF4444',
    sections: [
      ...fromGroups('系统配置', ADMIN_SYSTEM_CONFIG_GROUPS as NavGroup[]),
      ...fromGroups('模型服务管理', ADMIN_MODEL_SERVICE_GROUPS as NavGroup[]),
      ...fromGroups('数据管理', ADMIN_DATA_MANAGEMENT_GROUPS as NavGroup[]),
    ],
  },
  {
    id: 'admin-system',
    label: '系统管理',
    icon: Shield,
    accentFrom: '#8B5CF6',
    accentTo: '#EC4899',
    sections: [
      ...fromGroups('用户管理', ADMIN_USER_MANAGEMENT_GROUPS as NavGroup[]),
      ...fromGroups('工具管理', ADMIN_TOOL_MANAGEMENT_GROUPS as NavGroup[]),
      ...fromGroups('运营与安全', ADMIN_OPS_SECURITY_GROUPS as NavGroup[]),
      ...fromGroups('集成与中台', ADMIN_INTEGRATION_GROUPS as NavGroup[]),
      ...fromGroups('系统日志', ADMIN_SYSTEM_LOG_GROUPS as NavGroup[]),
    ],
  },
];

// ---------------------------------------------------------------------------
// User Spaces
// ---------------------------------------------------------------------------

export const USER_SPACES: Space[] = [
  {
    id: 'user-workspace',
    label: '工作台',
    icon: LayoutDashboard,
    accentFrom: '#3B82F6',
    accentTo: '#6366F1',
    sections: [
      ...fromGroups('工作台', USER_WORKSPACE_GROUPS as NavGroup[]),
      ...standalone('AI 助手', 'AI 助手', Bot),
      ...standalone('文档教程', '文档与教程', Database),
    ],
  },
  {
    id: 'user-build',
    label: '智能构建',
    icon: Bot,
    accentFrom: '#8B5CF6',
    accentTo: '#A855F7',
    sections: [
      ...fromGroups('我的 Agent', USER_AGENT_MANAGEMENT_GROUPS as NavGroup[], true),
      ...fromGroups('工作流', USER_WORKFLOW_GROUPS as NavGroup[]),
    ],
  },
  {
    id: 'user-resources',
    label: '资源与模型',
    icon: Layers,
    accentFrom: '#14B8A6',
    accentTo: '#06B6D4',
    sections: [
      ...fromGroups('我的资产', USER_ASSETS_GROUPS as NavGroup[]),
      ...fromGroups('模型服务', USER_MODEL_SERVICE_GROUPS as NavGroup[]),
      ...fromGroups('工具广场', USER_TOOL_SQUARE_GROUPS as NavGroup[]),
    ],
  },
  {
    id: 'user-data',
    label: '数据与账户',
    icon: BarChart3,
    accentFrom: '#F59E0B',
    accentTo: '#F97316',
    sections: [
      ...fromGroups('我的数据', USER_DATA_GROUPS as NavGroup[]),
      ...fromGroups('发布与连接', USER_PUBLISH_GROUPS as NavGroup[]),
      ...fromGroups('用量账单', USER_USAGE_GROUPS as NavGroup[]),
      ...fromGroups('个人设置', USER_SETTINGS_GROUPS as NavGroup[]),
    ],
  },
];

// ---------------------------------------------------------------------------
// Lookup helpers
// ---------------------------------------------------------------------------

export function findSpaceForItem(
  spaces: Space[],
  sidebarId: string,
  subItemId?: string,
): Space | undefined {
  return spaces.find((space) =>
    space.sections.some(
      (sec) =>
        sec.sidebarId === sidebarId &&
        (!subItemId || sec.items.some((it) => it.subItemId === subItemId)),
    ),
  );
}

export function getSpaceDefault(space: Space): SpaceNavItem | undefined {
  return space.sections[0]?.items[0];
}

// ---------------------------------------------------------------------------
// localStorage persistence for last-active space per role
// ---------------------------------------------------------------------------

const SPACE_MEMORY_KEY = 'lantu-space-memory';

interface SpaceMemory {
  admin?: string;
  user?: string;
}

export function readSpaceMemory(): SpaceMemory {
  try {
    return decryptStorage<SpaceMemory>(SPACE_MEMORY_KEY) || {};
  } catch {
    return {};
  }
}

export function writeSpaceMemory(role: 'admin' | 'user', spaceId: string): void {
  try {
    const prev = readSpaceMemory();
    encryptStorage(SPACE_MEMORY_KEY, { ...prev, [role]: spaceId });
  } catch {
    // silent
  }
}
