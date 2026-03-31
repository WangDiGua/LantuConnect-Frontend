import type { PaginatedData } from '../../types/api';
import { http } from '../../lib/http';
import { normalizePaginated } from '../../utils/normalizeApiPayload';
import type {
  Provider,
  ProviderCreatePayload,
  ProviderUpdatePayload,
  ProviderListQuery,
  ProviderStatus,
  ProviderType,
  AuthType,
} from '../../types/dto/provider';

function coerceProviderType(raw: unknown): ProviderType {
  const v = String(raw ?? 'internal').toLowerCase();
  if (v === 'internal' || v === 'partner' || v === 'cloud') return v;
  return 'internal';
}

function coerceAuthType(raw: unknown): AuthType {
  const v = String(raw ?? 'none').toLowerCase();
  if (v === 'api_key' || v === 'oauth2' || v === 'basic' || v === 'none') return v;
  return 'none';
}

function coerceStatus(raw: unknown): ProviderStatus {
  const v = String(raw ?? 'active').toLowerCase();
  return v === 'inactive' ? 'inactive' : 'active';
}

function mapDatasetProvider(raw: unknown): Provider {
  const r = raw as Record<string, unknown>;
  const authRaw = r?.authConfig;
  const authConfig =
    authRaw && typeof authRaw === 'object' && !Array.isArray(authRaw) ? (authRaw as Record<string, unknown>) : null;
  return {
    id: Number(r?.id) || 0,
    providerCode: String(r?.providerCode ?? ''),
    providerName: String(r?.providerName ?? ''),
    providerType: coerceProviderType(r?.providerType),
    description: r?.description != null && String(r.description) !== '' ? String(r.description) : null,
    authType: coerceAuthType(r?.authType),
    authConfig,
    baseUrl: r?.baseUrl != null && String(r.baseUrl) !== '' ? String(r.baseUrl) : null,
    status: coerceStatus(r?.status),
    agentCount: Number(r?.agentCount ?? 0) || 0,
    skillCount: Number(r?.skillCount ?? 0) || 0,
    createTime: r?.createTime != null ? String(r.createTime) : '',
    updateTime: r?.updateTime != null ? String(r.updateTime) : '',
  };
}

/**
 * 数据集服务商（`t_provider`）：与后端 `/providers` CRUD 对齐（同路径亦映射 `/dataset/providers`）。
 */
export const providerService = {
  list: async (params?: ProviderListQuery): Promise<PaginatedData<Provider>> => {
    const textKw =
      (params?.keyword != null && String(params.keyword).trim()) ||
      (params?.name != null && String(params.name).trim()) ||
      '';
    const typeKw = params?.providerType || params?.type ? String(params.providerType ?? params.type) : '';
    const keywordParam = textKw || typeKw || undefined;
    const raw = await http.get<unknown>('/providers', {
      params: {
        page: params?.page ?? 1,
        pageSize: params?.pageSize ?? 20,
        keyword: keywordParam,
        status: params?.status,
      },
    });
    let pg = normalizePaginated(raw, mapDatasetProvider);
    if (textKw && typeKw) {
      pg = { ...pg, list: pg.list.filter((p) => p.providerType === typeKw) };
    }
    return pg;
  },

  getById: async (id: number): Promise<Provider> => {
    const raw = await http.get<unknown>(`/providers/${id}`);
    return mapDatasetProvider(raw);
  },

  create: async (data: ProviderCreatePayload): Promise<Provider> => {
    const raw = await http.post<unknown>('/providers', data);
    return mapDatasetProvider(raw);
  },

  update: async (id: number, data: ProviderUpdatePayload): Promise<Provider> => {
    const raw = await http.put<unknown>(`/providers/${id}`, data);
    return mapDatasetProvider(raw);
  },

  remove: async (id: number): Promise<void> => {
    await http.delete<void>(`/providers/${id}`);
  },
};
