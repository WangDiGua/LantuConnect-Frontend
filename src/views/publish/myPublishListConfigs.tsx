import { AppWindow, Bot, Database, Puzzle, Wrench, type LucideIcon } from 'lucide-react';
import type { ResourceType } from '../../types/dto/catalog';
import { buildPath } from '../../constants/consoleRoutes';
import { RESOURCE_TYPE_LABEL_ZH, RESOURCE_TYPE_REGISTER_PAGE } from '../../constants/resourceTypes';
import type { MyResourcePublishListConfig } from './MyResourcePublishListPage';

export const MY_PUBLISH_LIST_PAGE_BY_TYPE: Record<ResourceType, string> = {
  agent: 'my-publish-agent',
  skill: 'my-publish-skill',
  mcp: 'my-publish-mcp',
  app: 'my-publish-app',
  dataset: 'my-publish-dataset',
};

const BREADCRUMB_SECOND: Record<ResourceType, string> = {
  agent: '我的智能体',
  skill: '我的技能',
  mcp: '我的 MCP',
  app: '我的应用',
  dataset: '我的数据集',
};

const DETAIL_SUFFIX: Record<ResourceType, string> = {
  agent: '智能体',
  skill: '技能',
  mcp: 'MCP',
  app: '应用',
  dataset: '数据集',
};

const ICON: Record<ResourceType, LucideIcon> = {
  agent: Bot,
  skill: Wrench,
  mcp: Puzzle,
  app: AppWindow,
  dataset: Database,
};

const CALL_COUNT_LABEL: Record<ResourceType, string> = {
  agent: '热度（网关 invoke）',
  skill: '热度（网关 invoke）',
  mcp: '调用热度（估算）',
  app: '调用热度（估算）',
  dataset: '调用热度（估算）',
};

export function getMyPublishListConfig(
  type: ResourceType,
  navigate: (path: string) => void,
): MyResourcePublishListConfig {
  const label = RESOURCE_TYPE_LABEL_ZH[type];
  const regPage = RESOURCE_TYPE_REGISTER_PAGE[type];
  return {
    titleIcon: ICON[type],
    breadcrumbSegments: ['工作台', BREADCRUMB_SECOND[type]] as const,
    pageDesc: `管理您提交的${label}，跟踪审核进度；审核员可在此对待审核项执行通过或驳回（与统一资源中心一致）。`,
    emptyTitle: `暂无已提交的${label}`,
    emptyDescription: '创建并提交后，可在此查看审核进度与发布状态。新建资源请使用页面右上角按钮。',
    emptyActionNavigate: () => navigate(buildPath('user', regPage)),
    emptyActionLabel: `去注册新${label}`,
    detailModalTitle: `${DETAIL_SUFFIX[type]}详情`,
    callCountLabel: CALL_COUNT_LABEL[type],
  };
}
