import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  Activity,
  Bot,
  Settings,
  Code2,
} from 'lucide-react';

import {
  ADMIN_OVERVIEW_GROUPS,
  ADMIN_RESOURCE_OPS_GROUPS,
  ADMIN_USER_MANAGEMENT_GROUPS,
  ADMIN_MONITORING_GROUPS,
  ADMIN_SYSTEM_CONFIG_GROUPS,
  ADMIN_DEVELOPER_PORTAL_GROUPS,
  USER_MY_CONSOLE_GROUPS,
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
    label: '运营总览',
    icon: LayoutDashboard,
    accentFrom: '#3B82F6',
    accentTo: '#6366F1',
    sections: [...fromGroups('overview', ADMIN_OVERVIEW_GROUPS as NavGroup[])],
  },
  {
    id: 'admin-modules',
    label: '资源与运营',
    icon: Bot,
    accentFrom: '#8B5CF6',
    accentTo: '#A855F7',
    sections: [...fromGroups('admin-resource-ops', ADMIN_RESOURCE_OPS_GROUPS as NavGroup[])],
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
    label: '我的',
    icon: LayoutDashboard,
    accentFrom: '#3B82F6',
    accentTo: '#6366F1',
    sections: [...fromGroups('workspace', USER_MY_CONSOLE_GROUPS as NavGroup[])],
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

const SPACE_ID_PATTERN = /^[a-zA-Z0-9_-]{1,64}$/;

interface SpaceMemory {
  admin?: string;
  user?: string;
}

export function readSpaceMemory(): SpaceMemory {
  try {
    const raw = decryptStorage<SpaceMemory>(SPACE_MEMORY_KEY) || {};
    const admin = raw.admin && SPACE_ID_PATTERN.test(raw.admin) ? raw.admin : undefined;
    const user = raw.user && SPACE_ID_PATTERN.test(raw.user) ? raw.user : undefined;
    return { admin, user };
  } catch {
    return {};
  }
}

export function writeSpaceMemory(role: 'admin' | 'user', spaceId: string): void {
  try {
    const id = spaceId.trim();
    if (!SPACE_ID_PATTERN.test(id)) return;
    const prev = readSpaceMemory();
    encryptStorage(SPACE_MEMORY_KEY, { ...prev, [role]: id });
  } catch {
    // silent
  }
}
