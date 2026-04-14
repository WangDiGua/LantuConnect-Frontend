import type { ResourceCenterItemVO } from '../types/dto/resource-center';
import type { MyPublishItem } from '../types/dto/user-activity';

/** 将统一资源中心列表项转为「我的发布」卡片数据结构（与 /resource-center/resources/mine 对齐，五类资源共用） */
export function resourceCenterItemToMyPublishItem(row: ResourceCenterItemVO): MyPublishItem {
  return {
    id: row.id,
    displayName: row.displayName,
    description: row.description ?? '',
    icon: row.icon ?? null,
    status: row.status,
    pendingPublishedUpdate: Boolean(row.pendingPublishedUpdate),
    callCount: 0,
    qualityScore: Number(row.qualityScore ?? 0) || 0,
    createTime: row.createTime ?? '—',
    updateTime: row.updateTime ?? '—',
  };
}
