import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { BookOpen, Check, Copy, ExternalLink, Loader2, Puzzle, RefreshCw, Settings, Terminal } from 'lucide-react';
import type { Theme, FontSize } from '../../types';
import { env } from '../../config/env';
import { userSettingsService } from '../../api/services/user-settings.service';
import { resourceCatalogService } from '../../api/services/resource-catalog.service';
import type { CatalogResourceDetailVO, ResourceCatalogItemVO, ResourceType } from '../../types/dto/catalog';
import type { UserApiKey } from '../../types/dto/user-settings';
import { MgmtPageShell } from '../userMgmt/MgmtPageShell';
import { LantuSelect } from '../../components/common/LantuSelect';
import { btnPrimary, btnSecondary, textMuted, textPrimary, textSecondary } from '../../utils/uiClasses';
import {
  buildPath,
  buildUserResourceMarketUrl,
  inferConsoleRole,
  parseRoute,
  type ConsoleRole,
} from '../../constants/consoleRoutes';
import { PageSkeleton } from '../../components/common/PageSkeleton';
import { useAuthStore } from '../../stores/authStore';
import { useUserRole } from '../../context/UserRoleContext';
import { buildCurlTriple } from '../../lib/curlCommandFormat';
import { getStoredGatewayApiKey } from '../../lib/safeStorage';

const GATEWAY_RESOURCE_TYPES = ['agent', 'mcp', 'skill'] as const;
type GatewayResourceType = (typeof GATEWAY_RESOURCE_TYPES)[number];

const TYPE_LABELS: Record<GatewayResourceType, string> = {
  agent: '智能体',
  mcp: 'MCP',
  skill: '托管技能',
};

function exportKey(rt: GatewayResourceType, resourceId: string): string {
  return `${rt}:${resourceId}`;
}

export interface GatewayIntegrationPageProps {
  theme: Theme;
  fontSize: FontSize;
}

function buildPublicApiBaseUrl(): string {
  const base = env.VITE_API_BASE_URL.replace(/\/$/, '');
  if (base.startsWith('http://') || base.startsWith('https://')) {
    return base;
  }
  if (typeof window !== 'undefined') {
    return `${window.location.origin}${base}`;
  }
  return base;
}

function isOpenPlatformPolicy(policy?: string): boolean {
  return (policy ?? '').toLowerCase().replace(/-/g, '_') === 'open_platform';
}

function isResourceOwner(createdBy: number | null | undefined, userId: string | null | undefined): boolean {
  if (userId == null || String(userId).trim() === '' || createdBy == null) return false;
  return String(createdBy) === String(userId);
}

function detailPageForType(consoleRole: ConsoleRole, rt: ResourceType, resourceId: string): string {
  if (rt === 'agent') return buildPath(consoleRole, 'agents-center', resourceId);
  if (rt === 'mcp') return buildPath(consoleRole, 'mcp-center', resourceId);
  return buildPath(consoleRole, 'skills-center', resourceId);
}

function CopyTextBtn({
  text,
  isDark,
  label,
  disabled,
}: {
  text: string;
  isDark: boolean;
  label?: string;
  disabled?: boolean;
}) {
  const [ok, setOk] = useState(false);
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        if (disabled) return;
        void navigator.clipboard.writeText(text);
        setOk(true);
        setTimeout(() => setOk(false), 1500);
      }}
      className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium transition-colors disabled:opacity-45 disabled:pointer-events-none ${
        isDark ? 'hover:bg-white/10 text-slate-300' : 'hover:bg-slate-100 text-slate-600'
      }`}
      aria-label={label ?? '复制'}
    >
      {ok ? <Check size={14} className="text-emerald-500" aria-hidden /> : <Copy size={14} aria-hidden />}
      {label ?? '复制'}
    </button>
  );
}

type CatalogRow = ResourceCatalogItemVO & {
  invokeEligible: boolean;
  isOwnerResource: boolean;
  isOpenPlatformPolicy: boolean;
};

export const GatewayIntegrationPage: React.FC<GatewayIntegrationPageProps> = ({ theme, fontSize }) => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { platformRole } = useUserRole();
  const routePage = parseRoute(pathname)?.page ?? '';
  const consoleRole: ConsoleRole = inferConsoleRole(routePage, platformRole);

  const user = useAuthStore((s) => s.user);
  const isDark = theme === 'dark';
  const apiBaseUrl = useMemo(() => buildPublicApiBaseUrl(), []);

  const [keys, setKeys] = useState<UserApiKey[]>([]);
  const [keysLoading, setKeysLoading] = useState(true);
  const [catalogByType, setCatalogByType] = useState<Record<GatewayResourceType, ResourceCatalogItemVO[]>>({
    agent: [],
    mcp: [],
    skill: [],
  });
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [selectedKeyId, setSelectedKeyId] = useState<string>('');
  /** resourceType:resourceId -> published粗判 */
  const [invokeEligibility, setInvokeEligibility] = useState<Record<string, boolean>>({});
  const [eligibilityLoading, setEligibilityLoading] = useState(false);
  const [eligibilityError, setEligibilityError] = useState<string | null>(null);
  /** 导出勾选：agent:12、mcp:34 … */
  const [selectedExportKeys, setSelectedExportKeys] = useState<Set<string>>(new Set());
  const [onlyShowCallable, setOnlyShowCallable] = useState(true);
  const [eligibilityFetchNonce, setEligibilityFetchNonce] = useState(0);
  const [selectedBinding, setSelectedBinding] = useState<{ rt: GatewayResourceType; resourceId: string } | null>(null);
  const [bindingDetail, setBindingDetail] = useState<CatalogResourceDetailVO | null>(null);
  const [bindingLoading, setBindingLoading] = useState(false);
  const [bindingError, setBindingError] = useState<string | null>(null);

  const storedKeyPlaceholder = useMemo(() => {
    const k = getStoredGatewayApiKey();
    return k ?? '<将 X-Api-Key 换为完整 secretPlain；勿提交仓库>';
  }, []);

  const minimalInvokeCurl = useMemo(
    () =>
      buildCurlTriple({
        method: 'POST',
        url: `${apiBaseUrl}/invoke`,
        headers: [
          { name: 'X-Api-Key', value: storedKeyPlaceholder },
          { name: 'Content-Type', value: 'application/json' },
        ],
        body: '{"resourceType":"agent|mcp|skill","resourceId":"<id>","payload":{}}',
        comments: [
          '每次请求只调一个资源：替换 resourceType 与 resourceId。',
          '外部门户应在服务端 BFF 持有 Key；本示例仅供本地联调。',
        ],
      }).bash,
    [apiBaseUrl, storedKeyPlaceholder],
  );

  const loadKeys = useCallback(async () => {
    setKeysLoading(true);
    try {
      const list = await userSettingsService.listApiKeys();
      setKeys(Array.isArray(list) ? list : []);
    } finally {
      setKeysLoading(false);
    }
  }, []);

  const loadAllCatalogs = useCallback(async () => {
    setCatalogLoading(true);
    try {
      const results = await Promise.all(
        GATEWAY_RESOURCE_TYPES.map((rt) =>
          resourceCatalogService.list({
            resourceType: rt,
            status: 'published',
            pageSize: 100,
            page: 1,
            callableOnly: onlyShowCallable,
          }),
        ),
      );
      const next: Record<GatewayResourceType, ResourceCatalogItemVO[]> = {
        agent: [],
        mcp: [],
        skill: [],
      };
      GATEWAY_RESOURCE_TYPES.forEach((rt, idx) => {
        next[rt] = results[idx].list.filter((r) => r.status === 'published');
      });
      setCatalogByType(next);
    } finally {
      setCatalogLoading(false);
    }
  }, [onlyShowCallable]);

  useEffect(() => {
    void loadKeys();
  }, [loadKeys]);

  useEffect(() => {
    void loadAllCatalogs();
  }, [loadAllCatalogs]);

  useEffect(() => {
    if (!keys.length) {
      setSelectedKeyId('');
      return;
    }
    const valid = keys.some((k) => k.id === selectedKeyId);
    if (!selectedKeyId || !valid) {
      setSelectedKeyId(keys[0].id);
    }
  }, [keys, selectedKeyId]);

  const allCatalogRowsFlat = useMemo(() => {
    const out: { rt: GatewayResourceType; row: ResourceCatalogItemVO }[] = [];
    for (const rt of GATEWAY_RESOURCE_TYPES) {
      for (const row of catalogByType[rt]) {
        out.push({ rt, row });
      }
    }
    return out;
  }, [catalogByType]);

  useEffect(() => {
    if (!selectedKeyId.trim()) {
      setInvokeEligibility({});
      setEligibilityError(null);
      setEligibilityLoading(false);
      return;
    }
    const requests = GATEWAY_RESOURCE_TYPES.map((rt) => {
      const ids = catalogByType[rt].map((r) => r.resourceId);
      if (ids.length === 0) return Promise.resolve({ rt, map: {} as Record<string, boolean> });
      return userSettingsService
        .postInvokeEligibility(selectedKeyId, { resourceType: rt, resourceIds: ids })
        .then((res) => ({ rt, map: res.byResourceId ?? {} }));
    });

    let cancelled = false;
    setEligibilityLoading(true);
    setEligibilityError(null);
    Promise.all(requests)
      .then((parts) => {
        if (cancelled) return;
        const merged: Record<string, boolean> = {};
        for (const { rt, map } of parts) {
          for (const [rid, ok] of Object.entries(map)) {
            merged[exportKey(rt, rid)] = Boolean(ok);
          }
        }
        setInvokeEligibility(merged);
      })
      .catch((e) => {
        if (!cancelled) {
          const msg =
            e instanceof Error ? e.message : typeof e === 'string' ? e : 'invoke 可调用预判加载失败';
          setEligibilityError(msg);
          setInvokeEligibility({});
        }
      })
      .finally(() => {
        if (!cancelled) setEligibilityLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedKeyId, catalogByType, eligibilityFetchNonce]);

  useEffect(() => {
    if (!selectedBinding?.resourceId?.trim()) {
      setBindingDetail(null);
      return;
    }
    const { rt, resourceId } = selectedBinding;
    let cancelled = false;
    setBindingLoading(true);
    setBindingError(null);
    resourceCatalogService
      .getByTypeAndId(rt, resourceId, 'bindings,closure')
      .then((d) => {
        if (!cancelled) setBindingDetail(d);
      })
      .catch((e) => {
        if (!cancelled) {
          setBindingError(e instanceof Error ? e.message : '绑定预览加载失败');
          setBindingDetail(null);
        }
      })
      .finally(() => {
        if (!cancelled) setBindingLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedBinding]);

  const eligibilityReliable = !eligibilityLoading && !eligibilityError;

  const buildRowsForType = useCallback(
    (rt: GatewayResourceType): CatalogRow[] =>
      catalogByType[rt].map((m) => {
        const isOpen = isOpenPlatformPolicy(m.accessPolicy);
        const isOwner = isResourceOwner(m.createdBy, user?.id);
        const k = exportKey(rt, m.resourceId);
        const invokeEligible = eligibilityReliable ? Boolean(invokeEligibility[k]) : false;
        return {
          ...m,
          invokeEligible,
          isOwnerResource: isOwner,
          isOpenPlatformPolicy: isOpen,
        };
      }),
    [catalogByType, invokeEligibility, eligibilityReliable, user?.id],
  );

  useEffect(() => {
    setSelectedExportKeys(new Set(allCatalogRowsFlat.map(({ rt, row }) => exportKey(rt, row.resourceId))));
  }, [allCatalogRowsFlat]);

  const toggleExportKey = useCallback((key: string) => {
    setSelectedExportKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const selectAllExport = useCallback(() => {
    setSelectedExportKeys(new Set(allCatalogRowsFlat.map(({ rt, row }) => exportKey(rt, row.resourceId))));
  }, [allCatalogRowsFlat]);

  const clearExportSelection = useCallback(() => {
    setSelectedExportKeys(new Set());
  }, []);

  const allRowsWithMeta = useMemo(() => {
    const list: { rt: GatewayResourceType; row: CatalogRow; exportK: string }[] = [];
    for (const rt of GATEWAY_RESOURCE_TYPES) {
      for (const row of buildRowsForType(rt)) {
        list.push({ rt, row, exportK: exportKey(rt, row.resourceId) });
      }
    }
    return list;
  }, [buildRowsForType]);

  const buildExportObject = useCallback(() => {
    const keyMeta = keys.find((k) => k.id === selectedKeyId);
    const resources = allRowsWithMeta
      .filter(({ exportK }) => selectedExportKeys.has(exportK))
      .map(({ rt, row }) => ({
        resourceType: rt,
        resourceId: row.resourceId,
        displayName: row.displayName,
        invokeEligibleWithSelectedKey: row.invokeEligible,
      }));
    return {
      schemaVersion: 2,
      apiBaseUrl,
      selectedApiKeyId: selectedKeyId || null,
      selectedApiKeyName: keyMeta?.name ?? null,
      exportedAt: new Date().toISOString(),
      note: '每次 POST /invoke 仅针对一个 resourceType + resourceId；本 JSON 为跨类型勾选快照。',
      resources,
    };
  }, [apiBaseUrl, keys, selectedKeyId, allRowsWithMeta, selectedExportKeys]);

  const exportJson = useMemo(() => JSON.stringify(buildExportObject(), null, 2), [buildExportObject]);

  const downloadExport = useCallback(() => {
    const blob = new Blob([JSON.stringify(buildExportObject(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const slug = (selectedKeyId || 'no-key').slice(0, 12).replace(/[^a-zA-Z0-9_-]/g, '');
    a.download = `lantu-gateway-integration-${slug}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [buildExportObject, selectedKeyId]);

  const keyOptions = keys.map((k) => ({
    value: k.id,
    label: `${k.name} (${k.maskedKey || k.prefix || k.id.slice(0, 8)}…)`,
  }));

  const thClass = `${textSecondary(theme)} text-left text-xs font-semibold px-3 py-2 border-b ${
    isDark ? 'border-white/10' : 'border-slate-200'
  }`;

  const toolbar = (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        className={`inline-flex items-center gap-1 rounded-xl border px-3 py-1.5 text-xs font-medium ${
          isDark ? 'border-white/15 text-slate-200 hover:bg-white/5' : 'border-slate-200 text-slate-700 hover:bg-slate-50'
        }`}
        onClick={() => navigate(`${buildPath(consoleRole, 'api-docs')}#doc-external-integration`)}
        aria-label="打开接入指南外部系统集成"
      >
        <BookOpen size={14} aria-hidden />
        接入指南
      </button>
      <button
        type="button"
        className={`inline-flex items-center gap-1 rounded-xl border px-3 py-1.5 text-xs font-medium ${
          isDark ? 'border-white/15 text-slate-200 hover:bg-white/5' : 'border-slate-200 text-slate-700 hover:bg-slate-50'
        }`}
        onClick={() => navigate(buildPath(consoleRole, 'api-playground'))}
        aria-label="打开 API Playground"
      >
        <Terminal size={14} aria-hidden />
        API Playground
      </button>
    </div>
  );

  const bindingClosure = bindingDetail?.bindingClosure;

  const renderTypeTable = (rt: GatewayResourceType) => {
    const tableRows = buildRowsForType(rt);
    if (tableRows.length === 0) {
      return (
        <div className="px-2 py-4 space-y-2">
          <p className={`text-sm ${textMuted(theme)}`}>
            {onlyShowCallable
              ? `「${TYPE_LABELS[rt]}」在当前筛选下无已发布项，或均无健康可调用。`
              : `「${TYPE_LABELS[rt]}」暂无已发布资源。`}
          </p>
          {onlyShowCallable ? (
            <button type="button" className={btnSecondary(theme)} onClick={() => setOnlyShowCallable(false)}>
              显示全部目录项（三类同时生效）
            </button>
          ) : (
            <button
              type="button"
              className={btnSecondary(theme)}
              onClick={() => navigate(buildUserResourceMarketUrl(rt))}
            >
              <ExternalLink size={14} className="inline mr-1" aria-hidden />
              去{TYPE_LABELS[rt]}市场
            </button>
          )}
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className={isDark ? 'bg-white/[0.04]' : 'bg-slate-50'}>
              <th scope="col" className={`${thClass} w-10`}>
                <span className="sr-only">选择导出</span>
              </th>
              <th scope="col" className={thClass}>
                类型
              </th>
              <th scope="col" className={thClass}>
                名称 / 编码
              </th>
              <th scope="col" className={thClass}>
                resourceId
              </th>
              <th scope="col" className={thClass}>
                可调用（当前 Key）
              </th>
              <th scope="col" className={thClass}>
                操作
              </th>
            </tr>
          </thead>
          <tbody>
            {tableRows.map((row) => {
              const ek = exportKey(rt, row.resourceId);
              const isSel = selectedBinding?.rt === rt && selectedBinding.resourceId === row.resourceId;
              return (
                <tr
                  key={ek}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedBinding({ rt, resourceId: row.resourceId })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedBinding({ rt, resourceId: row.resourceId });
                    }
                  }}
                  className={`cursor-pointer border-t ${isDark ? 'border-white/10' : 'border-slate-100'} ${
                    isSel
                      ? isDark
                        ? 'bg-emerald-500/10'
                        : 'bg-emerald-50/80'
                      : isDark
                        ? 'hover:bg-white/[0.03]'
                        : 'hover:bg-slate-50/80'
                  }`}
                >
                  <td className="px-3 py-2 align-middle" onClick={(e) => e.stopPropagation()}>
                    <label className="inline-flex cursor-pointer items-center justify-center p-3 -m-2 min-h-[44px] min-w-[44px]">
                      <input
                        type="checkbox"
                        className="rounded border-slate-300 h-4 w-4 shrink-0 cursor-pointer accent-neutral-900"
                        checked={selectedExportKeys.has(ek)}
                        onChange={() => toggleExportKey(ek)}
                        aria-label={`将 ${TYPE_LABELS[rt]} ${row.displayName} 加入导出`}
                      />
                    </label>
                  </td>
                  <td className={`px-3 py-2 align-middle font-mono text-xs ${textMuted(theme)}`}>{rt}</td>
                  <td className={`px-3 py-2 align-middle ${textPrimary(theme)}`}>
                    <div className="font-medium">{row.displayName}</div>
                    <div className={`text-xs font-mono ${textMuted(theme)}`}>{row.resourceCode}</div>
                  </td>
                  <td className={`px-3 py-2 align-middle font-mono text-xs ${textPrimary(theme)}`}>{row.resourceId}</td>
                  <td className="px-3 py-2 align-middle">
                    {eligibilityLoading ? (
                      <span className={`text-xs ${textMuted(theme)}`} aria-busy>
                        …
                      </span>
                    ) : eligibilityError ? (
                      <span className="text-xs text-rose-500 dark:text-rose-400">无法判定</span>
                    ) : row.invokeEligible && row.isOwnerResource ? (
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          isDark ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-50 text-emerald-800'
                        }`}
                      >
                        自有资源
                      </span>
                    ) : row.invokeEligible && row.isOpenPlatformPolicy ? (
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          isDark ? 'bg-sky-500/20 text-sky-200' : 'bg-sky-50 text-sky-900'
                        }`}
                      >
                        已发布可调用
                      </span>
                    ) : row.invokeEligible ? (
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          isDark ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-50 text-emerald-800'
                        }`}
                      >
                        可调用
                      </span>
                    ) : (
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          isDark ? 'bg-slate-500/20 text-slate-300' : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        不可调用
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 align-middle" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      className={`text-xs underline ${textPrimary(theme)}`}
                      onClick={() => navigate(detailPageForType(consoleRole, rt, row.resourceId))}
                    >
                      详情
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <MgmtPageShell
      theme={theme}
      fontSize={fontSize}
      titleIcon={Puzzle}
      breadcrumbSegments={['开发者中心', '网关集成']}
      description="先选 API Key，再在同一页勾选智能体 / MCP / 托管技能（导出可跨类型）。网关每次 POST /invoke 仍只针对一个 resourceType + resourceId，详见接入指南。"
      toolbar={toolbar}
      contentScroll="document"
    >
      <div className="px-4 sm:px-6 pb-10 w-full max-w-5xl flex flex-col gap-6">
        <section
          className={`rounded-2xl border p-4 space-y-3 ${isDark ? 'border-white/10 bg-white/[0.02]' : 'border-slate-200 bg-white'}`}
        >
          <h2 className={`text-sm font-bold ${textPrimary(theme)}`}>快速摘要</h2>
          <p className={`text-sm leading-relaxed ${textSecondary(theme)}`}>
            外部门户请在<strong className={textPrimary(theme)}>己方 BFF</strong>转发{' '}
            <span className="font-mono text-xs">POST {apiBaseUrl}/invoke</span>。<strong className={textPrimary(theme)}>一次 HTTP 请求只调用一个资源</strong>
            （不同 <span className="font-mono">resourceType</span>/<span className="font-mono">resourceId</span> 需多次请求）；本页导出 JSON 只是把跨类型勾选打成配置快照。
          </p>
          <div className="flex flex-wrap gap-2 items-center">
            <code
              className={`text-[11px] break-all rounded-lg px-2 py-1.5 font-mono flex-1 min-w-[200px] ${
                isDark ? 'bg-black/30 text-slate-200' : 'bg-slate-100 text-slate-800'
              }`}
            >
              {apiBaseUrl}/invoke
            </code>
            <CopyTextBtn text={`${apiBaseUrl}/invoke`} isDark={isDark} label="复制" />
            <code
              className={`text-[11px] break-all rounded-lg px-2 py-1.5 font-mono flex-1 min-w-[200px] ${
                isDark ? 'bg-black/30 text-slate-200' : 'bg-slate-100 text-slate-800'
              }`}
            >
              {apiBaseUrl}/invoke-stream
            </code>
            <CopyTextBtn text={`${apiBaseUrl}/invoke-stream`} isDark={isDark} label="复制" />
          </div>
          <p className={`text-xs ${textMuted(theme)}`}>最小 Bash 示例（联调）：</p>
          <div className="flex flex-wrap items-start gap-2">
            <pre
              className={`flex-1 min-w-0 text-[11px] leading-relaxed overflow-x-auto rounded-lg p-3 font-mono ${
                isDark ? 'bg-black/30 text-slate-200' : 'bg-slate-50 text-slate-800'
              }`}
            >
              {minimalInvokeCurl}
            </pre>
            <CopyTextBtn text={minimalInvokeCurl} isDark={isDark} label="复制 curl" />
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={btnSecondary(theme)} onClick={() => navigate(buildPath(consoleRole, 'my-api-keys'))}>
              <Settings size={14} aria-hidden />
              偏好设置（创建 API Key）
            </button>
            <button type="button" className={btnSecondary(theme)} onClick={() => void loadKeys()}>
              <RefreshCw size={14} aria-hidden /> 刷新 Key
            </button>
            <button type="button" className={btnSecondary(theme)} onClick={() => void loadAllCatalogs()}>
              <RefreshCw size={14} aria-hidden /> 刷新目录
            </button>
          </div>
        </section>

        {keysLoading || catalogLoading ? (
          <PageSkeleton type="form" rows={6} />
        ) : (
          <>
            <div
              className={`rounded-2xl border p-4 space-y-4 ${isDark ? 'border-white/10 bg-white/[0.02]' : 'border-slate-200 bg-white'}`}
            >
              <div>
                <div className={`text-sm font-bold mb-1 ${textPrimary(theme)}`}>1. 选择 API Key</div>
                <div className={`text-xs font-semibold block mb-1 ${textSecondary(theme)}`}>用于 invoke-eligibility 预判（与当前 Key 绑定）</div>
                {keyOptions.length === 0 ? (
                  <p className={`text-sm ${textMuted(theme)}`}>
                    暂无可用 Key。请前往
                    <button
                      type="button"
                      className={`mx-1 underline font-medium ${textPrimary(theme)}`}
                      onClick={() => navigate(buildPath(consoleRole, 'my-api-keys'))}
                    >
                      偏好设置
                    </button>
                    创建。
                  </p>
                ) : (
                  <LantuSelect
                    theme={theme}
                    className="w-full max-w-md"
                    value={selectedKeyId}
                    onChange={setSelectedKeyId}
                    options={keyOptions}
                  />
                )}
              </div>
            </div>

            <div
              className={`rounded-2xl border overflow-hidden ${isDark ? 'border-white/10 bg-white/[0.02]' : 'border-slate-200 bg-white'}`}
            >
              <div
                className={`flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b ${isDark ? 'border-white/10' : 'border-slate-200'}`}
              >
                <div>
                  <h3 className={`text-sm font-bold ${textPrimary(theme)}`}>2. 勾选资源（三类并列）</h3>
                  <p className={`text-xs mt-0.5 ${textMuted(theme)}`}>
                    下方三块可同时勾选；「可调用」来自 <span className="font-mono text-[11px]">POST …/invoke-eligibility</span>（
                    <span className="font-mono">published</span> 粗判）。点击行查看绑定预览。
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <label
                    className={`inline-flex items-center gap-2 text-xs cursor-pointer select-none ${
                      isDark ? 'text-slate-300' : 'text-slate-600'
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="rounded border-slate-300 h-3.5 w-3.5 shrink-0 cursor-pointer accent-neutral-900"
                      checked={onlyShowCallable}
                      onChange={(e) => setOnlyShowCallable(e.target.checked)}
                    />
                    仅显示健康可调用
                  </label>
                  <button type="button" className={btnSecondary(theme)} onClick={selectAllExport}>
                    全选导出
                  </button>
                  <button type="button" className={btnSecondary(theme)} onClick={clearExportSelection}>
                    清空选择
                  </button>
                </div>
              </div>

              {eligibilityLoading ? (
                <p
                  className={`text-xs flex items-center gap-2 px-4 py-2 border-b ${isDark ? 'border-white/10 bg-white/[0.03]' : 'border-slate-100 bg-slate-50/80'}`}
                >
                  <Loader2 size={14} className="animate-spin shrink-0" aria-hidden /> 正在加载三类预判…
                </p>
              ) : null}
              {eligibilityError ? (
                <div
                  className={`text-xs flex flex-wrap items-center gap-2 px-4 py-2 border-b ${isDark ? 'border-rose-500/30 bg-rose-500/10' : 'border-rose-200 bg-rose-50'}`}
                  role="alert"
                >
                  <span className="text-rose-600 dark:text-rose-300">{eligibilityError}</span>
                  <button
                    type="button"
                    className={`shrink-0 rounded-lg px-2 py-1 font-medium underline-offset-2 hover:underline ${textPrimary(theme)}`}
                    onClick={() => setEligibilityFetchNonce((n) => n + 1)}
                  >
                    重试
                  </button>
                </div>
              ) : null}

              <div className="divide-y divide-slate-200 dark:divide-white/10">
                {GATEWAY_RESOURCE_TYPES.map((rt) => (
                  <div key={rt} className="px-2 py-3 sm:px-4">
                    <h4 className={`text-xs font-bold uppercase tracking-wide mb-2 ${textPrimary(theme)}`}>{TYPE_LABELS[rt]}</h4>
                    {renderTypeTable(rt)}
                  </div>
                ))}
              </div>
            </div>

            {selectedBinding ? (
              <div
                className={`rounded-2xl border p-4 space-y-2 ${isDark ? 'border-white/10 bg-white/[0.02]' : 'border-slate-200 bg-white'}`}
              >
                <h3 className={`text-sm font-bold ${textPrimary(theme)}`}>
                  绑定预览（{selectedBinding.rt} · {selectedBinding.resourceId}）
                </h3>
                <p className={`text-xs ${textMuted(theme)}`}>
                  来自目录详情 <span className="font-mono">include=bindings,closure</span>。<span className="font-mono">POST /invoke</span>{' '}
                  时网关可能写入 <span className="font-mono">payload._lantu.bindingExpansion</span>，见接入指南。
                </p>
                {bindingLoading ? (
                  <p className={`text-xs flex items-center gap-2 ${textMuted(theme)}`}>
                    <Loader2 size={14} className="animate-spin" aria-hidden /> 加载中…
                  </p>
                ) : bindingError ? (
                  <p className="text-xs text-rose-600 dark:text-rose-400">{bindingError}</p>
                ) : bindingClosure && bindingClosure.length > 0 ? (
                  <ul className={`list-disc pl-5 text-sm space-y-1 ${textSecondary(theme)}`}>
                    {bindingClosure.map((b, i) => (
                      <li key={`${b.resourceType}-${b.resourceId}-${i}`}>
                        <span className="font-mono text-xs">{b.resourceType}</span> · {b.displayName ?? b.resourceCode ?? b.resourceId}{' '}
                        <span className={`font-mono text-xs ${textMuted(theme)}`}>({b.resourceId})</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className={`text-sm ${textMuted(theme)}`}>暂无绑定闭包数据（或未登记相关依赖）。</p>
                )}
              </div>
            ) : null}

            <div
              className={`rounded-2xl border p-4 ${isDark ? 'border-white/10 bg-white/[0.02]' : 'border-slate-200 bg-white'}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div>
                  <h3 className={`text-sm font-bold ${textPrimary(theme)}`}>3. 导出 JSON</h3>
                  <p className={`text-xs mt-0.5 ${textMuted(theme)}`}>
                    resources[] 可含多种 <span className="font-mono">resourceType</span>；不含 secretPlain。
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <CopyTextBtn
                    text={exportJson}
                    isDark={isDark}
                    label="复制 JSON"
                    disabled={eligibilityLoading || !!eligibilityError}
                  />
                  <button
                    type="button"
                    className={btnPrimary}
                    onClick={downloadExport}
                    disabled={eligibilityLoading || !!eligibilityError || !selectedKeyId || selectedExportKeys.size === 0}
                  >
                    下载 .json
                  </button>
                </div>
              </div>
              {eligibilityLoading ? (
                <p className={`text-xs ${textMuted(theme)}`}>预判加载中…</p>
              ) : eligibilityError ? (
                <p className={`text-xs text-rose-600 dark:text-rose-400`}>请先修复预判错误后再导出。</p>
              ) : selectedExportKeys.size === 0 ? (
                <p className={`text-xs ${textMuted(theme)}`}>请至少勾选一行（可跨类型）。</p>
              ) : (
                <pre
                  className={`text-[11px] leading-relaxed overflow-x-auto rounded-xl p-3 max-h-80 overflow-y-auto font-mono ${
                    isDark ? 'bg-black/30 text-slate-200' : 'bg-slate-50 text-slate-800'
                  }`}
                >
                  {exportJson}
                </pre>
              )}
            </div>
          </>
        )}
      </div>
    </MgmtPageShell>
  );
};
