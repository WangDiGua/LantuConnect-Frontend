import { http } from '../../lib/http';
import type {
  ResourceCenterItemVO,
  ResourceCenterListQuery,
  ResourceCenterPage,
  ResourceUpsertRequest,
  ResourceVersionCreateRequest,
  ResourceVersionVO,
} from '../../types/dto/resource-center';

function normalizeStatus(raw: unknown): ResourceCenterItemVO['status'] {
  const value = String(raw ?? '').toLowerCase();
  if (value === 'draft') return 'draft';
  if (value === 'pending_review') return 'pending_review';
  if (value === 'testing') return 'testing';
  if (value === 'published') return 'published';
  if (value === 'rejected') return 'rejected';
  if (value === 'deprecated') return 'deprecated';
  return 'draft';
}

function toResourceItem(raw: any): ResourceCenterItemVO {
  const id = Number(raw?.id ?? raw?.resourceId ?? 0) || 0;
  const type = String(raw?.resourceType ?? 'agent') as ResourceCenterItemVO['resourceType'];
  return {
    id,
    resourceType: type,
    resourceId: String(raw?.resourceId ?? id),
    resourceCode: String(raw?.resourceCode ?? `res-${id}`),
    displayName: String(raw?.displayName ?? raw?.name ?? `资源-${id}`),
    description: raw?.description ? String(raw.description) : '',
    sourceType: raw?.sourceType ? String(raw.sourceType) : undefined,
    providerId: raw?.providerId != null && raw?.providerId !== '' ? String(raw.providerId) : undefined,
    categoryId: raw?.categoryId != null && raw?.categoryId !== '' ? String(raw.categoryId) : undefined,
    authType: raw?.authType ? String(raw.authType) : undefined,
    authConfig:
      raw?.authConfig && typeof raw.authConfig === 'object' && !Array.isArray(raw.authConfig)
        ? (raw.authConfig as Record<string, unknown>)
        : undefined,
    status: normalizeStatus(raw?.status),
    currentVersion: raw?.currentVersion ? String(raw.currentVersion) : undefined,
    createTime: raw?.createTime ? String(raw.createTime) : undefined,
    updateTime: raw?.updateTime ? String(raw.updateTime) : undefined,
    submitTime: raw?.submitTime ? String(raw.submitTime) : undefined,
    ownerId: raw?.ownerId ? String(raw.ownerId) : undefined,
    ownerName: raw?.ownerName ? String(raw.ownerName) : undefined,
    endpoint: raw?.endpoint ? String(raw.endpoint) : undefined,
    protocol: raw?.protocol ? String(raw.protocol) : undefined,
    appUrl: raw?.appUrl ? String(raw.appUrl) : undefined,
    embedType: raw?.embedType ? String(raw.embedType) : undefined,
    dataType: raw?.dataType ? String(raw.dataType) : undefined,
    format: raw?.format ? String(raw.format) : undefined,
    recordCount: Number(raw?.recordCount ?? 0) || 0,
    fileSize: Number(raw?.fileSize ?? 0) || 0,
    tags: Array.isArray(raw?.tags) ? raw.tags.map((tag: unknown) => String(tag)) : [],
  };
}

function normalizePage(raw: unknown): ResourceCenterPage {
  if (raw && typeof raw === 'object' && Array.isArray((raw as any).list)) {
    const page = raw as any;
    return {
      list: page.list.map(toResourceItem),
      total: Number(page.total ?? page.list.length ?? 0) || 0,
      page: Number(page.page ?? 1) || 1,
      pageSize: Number(page.pageSize ?? page.list.length ?? 20) || 20,
    };
  }
  if (Array.isArray(raw)) {
    return {
      list: raw.map(toResourceItem),
      total: raw.length,
      page: 1,
      pageSize: raw.length || 20,
    };
  }
  return { list: [], total: 0, page: 1, pageSize: 20 };
}

function toVersionItem(raw: any): ResourceVersionVO {
  return {
    id: Number(raw?.id ?? 0) || 0,
    resourceId: Number(raw?.resourceId ?? 0) || 0,
    version: String(raw?.version ?? ''),
    isCurrent: Boolean(raw?.isCurrent),
    status: raw?.status ? String(raw.status) : undefined,
    createTime: raw?.createTime ? String(raw.createTime) : undefined,
    updateTime: raw?.updateTime ? String(raw.updateTime) : undefined,
  };
}

export const resourceCenterService = {
  listMine: async (query?: ResourceCenterListQuery): Promise<ResourceCenterPage> => {
    const raw = await http.get<unknown>('/resource-center/resources/mine', { params: query });
    return normalizePage(raw);
  },

  getById: async (id: number): Promise<ResourceCenterItemVO> => {
    const raw = await http.get<unknown>(`/resource-center/resources/${id}`);
    return toResourceItem(raw);
  },

  create: async (payload: ResourceUpsertRequest): Promise<ResourceCenterItemVO> => {
    const raw = await http.post<unknown>('/resource-center/resources', payload);
    return toResourceItem(raw);
  },

  update: async (id: number, payload: ResourceUpsertRequest): Promise<ResourceCenterItemVO> => {
    const raw = await http.put<unknown>(`/resource-center/resources/${id}`, payload);
    return toResourceItem(raw);
  },

  remove: (id: number): Promise<void> => http.delete<void>(`/resource-center/resources/${id}`),

  submit: (id: number): Promise<void> => http.post<void>(`/resource-center/resources/${id}/submit`),

  deprecate: (id: number): Promise<void> => http.post<void>(`/resource-center/resources/${id}/deprecate`),

  withdraw: (id: number): Promise<void> => http.post<void>(`/resource-center/resources/${id}/withdraw`),

  createVersion: async (id: number, payload: ResourceVersionCreateRequest): Promise<ResourceVersionVO> => {
    const raw = await http.post<unknown>(`/resource-center/resources/${id}/versions`, payload);
    return toVersionItem(raw);
  },

  switchVersion: (id: number, version: string): Promise<void> =>
    http.post<void>(`/resource-center/resources/${id}/versions/${version}/switch`),

  listVersions: async (id: number): Promise<ResourceVersionVO[]> => {
    const raw = await http.get<unknown>(`/resource-center/resources/${id}/versions`);
    if (Array.isArray(raw)) return raw.map(toVersionItem);
    if (raw && typeof raw === 'object' && Array.isArray((raw as any).list)) {
      return (raw as any).list.map(toVersionItem);
    }
    return [];
  },
};
