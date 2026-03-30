import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  Activity,
  Bot,
  Settings,
  Database,
  Wrench,
  AppWindow,
  Rocket,
  Code2,
} from 'lucide-react';

import {
  ADMIN_OVERVIEW_GROUPS,
  ADMIN_RESOURCE_MANAGEMENT_GROUPS,
  ADMIN_PROVIDER_MANAGEMENT_GROUPS,
  ADMIN_USER_MANAGEMENT_GROUPS,
  ADMIN_MONITORING_GROUPS,
  ADMIN_SYSTEM_CONFIG_GROUPS,
  ADMIN_DEVELOPER_PORTAL_GROUPS,
  USER_WORKSPACE_GROUPS,
  USER_MARKETPLACE_GROUPS,
  USER_MY_PUBLISH_GROUPS,
  USER_MY_SPACE_GROUPS,
} from './navigation';

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
// Helpers
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
          subItemId: sidebarId,
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
    id: 'admin-dashboard',
    label: '总览',
    icon: LayoutDashboard,
    accentFrom: '#3B82F6',
    accentTo: '#6366F1',
    sections: [...fromGroups('overview', ADMIN_OVERVIEW_GROUPS as NavGroup[])],
  },
  {
    id: 'admin-modules',
    label: '资源管理',
    icon: Bot,
    accentFrom: '#8B5CF6',
    accentTo: '#A855F7',
    sections: [
      ...fromGroups('resource-management', ADMIN_RESOURCE_MANAGEMENT_GROUPS as NavGroup[]),
      ...fromGroups('provider-management', ADMIN_PROVIDER_MANAGEMENT_GROUPS as NavGroup[]),
    ],
  },
  {
    id: 'admin-ops',
    label: '运维监控',
    icon: Activity,
    accentFrom: '#10B981',
    accentTo: '#14B8A6',
    sections: [
      ...fromGroups('monitoring', ADMIN_MONITORING_GROUPS as NavGroup[]),
    ],
  },
  {
    id: 'admin-system',
    label: '系统管理',
    icon: Settings,
    accentFrom: '#F59E0B',
    accentTo: '#EF4444',
    sections: [
      ...fromGroups('user-management', ADMIN_USER_MANAGEMENT_GROUPS as NavGroup[]),
      ...fromGroups('system-config', ADMIN_SYSTEM_CONFIG_GROUPS as NavGroup[]),
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
      ...fromGroups('workspace', USER_WORKSPACE_GROUPS as NavGroup[]),
    ],
  },
  {
    id: 'user-discover',
    label: '资源市场',
    icon: Wrench,
    accentFrom: '#8B5CF6',
    accentTo: '#A855F7',
    sections: [
      ...fromGroups('marketplace', USER_MARKETPLACE_GROUPS as NavGroup[]),
    ],
  },
  {
    id: 'user-publish',
    label: '我的发布',
    icon: Rocket,
    accentFrom: '#F97316',
    accentTo: '#EF4444',
    sections: [
      ...fromGroups('my-publish', USER_MY_PUBLISH_GROUPS as NavGroup[]),
    ],
  },
  {
    id: 'user-personal',
    label: '个人',
    icon: Settings,
    accentFrom: '#F59E0B',
    accentTo: '#F97316',
    sections: [
      ...fromGroups('my-space', USER_MY_SPACE_GROUPS as NavGroup[]),
    ],
  },
  {
    id: 'user-developer',
    label: '开发者中心',
    icon: Code2,
    accentFrom: '#06B6D4',
    accentTo: '#3B82F6',
    sections: [
      ...fromGroups('developer-portal', ADMIN_DEVELOPER_PORTAL_GROUPS as NavGroup[]),
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
