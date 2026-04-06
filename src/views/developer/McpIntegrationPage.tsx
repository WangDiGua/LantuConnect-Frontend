import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Check,
  Copy,
  ExternalLink,
  Loader2,
  Puzzle,
  RefreshCw,
  Settings,
  Terminal,
} from 'lucide-react';
import type { Theme, FontSize } from '../../types';
import { env } from '../../config/env';
import { userSettingsService } from '../../api/services/user-settings.service';
import { resourceCatalogService } from '../../api/services/resource-catalog.service';
import type { ResourceCatalogItemVO } from '../../types/dto/catalog';
import type { UserApiKey, UserApiKeyResourceGrant } from '../../types/dto/user-settings';
import { MgmtPageShell } from '../userMgmt/MgmtPageShell';
import { LantuSelect } from '../../components/common/LantuSelect';
import {
  btnPrimary,
  btnSecondary,
  textMuted,
  textPrimary,
  textSecondary,
} from '../../utils/uiClasses';
import { buildPath, buildUserResourceMarketUrl } from '../../constants/consoleRoutes';
import { PageSkeleton } from '../../components/common/PageSkeleton';

export interface McpIntegrationPageProps {
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

function accessPolicyLabel(policy?: string): string {
  const p = (policy ?? '').toLowerCase().replace(/-/g, '_');
  if (p === 'open_platform') return '开放平台（通常可免 Grant）';
  if (p === 'open_org') return '组织内（同组织可短路）';
  if (p === 'grant_required' || !p) return '须显式授权（Grant）';
  return policy || '须显式授权（Grant）';
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

type McpRow = ResourceCatalogItemVO & {
  /** 仅当 Grant 列表已成功拉取后可信；加载中或失败时勿用于断言授权 */
  hasGrantForKey: boolean;
  policyLabel: string;
};

export const McpIntegrationPage: React.FC<McpIntegrationPageProps> = ({ theme, fontSize }) => {
  const navigate = useNavigate();
  const isDark = theme === 'dark';
  const apiBaseUrl = useMemo(() => buildPublicApiBaseUrl(), []);
  const mcpMessagePathTemplate = useMemo(
    () => `${apiBaseUrl}/mcp/v1/resources/mcp/{resourceId}/message`,
    [apiBaseUrl],
  );

  const [keys, setKeys] = useState<UserApiKey[]>([]);
  const [keysLoading, setKeysLoading] = useState(true);
  const [mcpList, setMcpList] = useState<ResourceCatalogItemVO[]>([]);
  const [mcpLoading, setMcpLoading] = useState(true);
  const [selectedKeyId, setSelectedKeyId] = useState<string>('');
  const [grants, setGrants] = useState<UserApiKeyResourceGrant[]>([]);
  const [grantsLoading, setGrantsLoading] = useState(false);
  const [grantsError, setGrantsError] = useState<string | null>(null);
  const [selectedExportIds, setSelectedExportIds] = useState<Set<string>>(new Set());
  /** 递增以在选中 Key 不变时手动重试 Grant 请求 */
  const [grantFetchNonce, setGrantFetchNonce] = useState(0);

  const loadKeys = useCallback(async () => {
    setKeysLoading(true);
    try {
      const list = await userSettingsService.listApiKeys();
      setKeys(Array.isArray(list) ? list : []);
    } finally {
      setKeysLoading(false);
    }
  }, []);

  const loadMcpCatalog = useCallback(async () => {
    setMcpLoading(true);
    try {
      const page = await resourceCatalogService.list({
        resourceType: 'mcp',
        status: 'published',
        pageSize: 100,
        page: 1,
      });
      const rows = page.list.filter((r) => r.status === 'published');
      setMcpList(rows);
    } finally {
      setMcpLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadKeys();
  }, [loadKeys]);

  useEffect(() => {
    void loadMcpCatalog();
  }, [loadMcpCatalog]);

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

  useEffect(() => {
    if (!selectedKeyId.trim()) {
      setGrants([]);
      setGrantsError(null);
      setGrantsLoading(false);
      return;
    }
    let cancelled = false;
    setGrantsLoading(true);
    setGrantsError(null);
    userSettingsService
      .listResourceGrantsForApiKey(selectedKeyId)
      .then((g) => {
        if (!cancelled) setGrants(g);
      })
      .catch((e) => {
        if (!cancelled) {
          const msg =
            e instanceof Error ? e.message : typeof e === 'string' ? e : '授权列表加载失败';
          setGrantsError(msg);
          setGrants([]);
        }
      })
      .finally(() => {
        if (!cancelled) setGrantsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedKeyId, grantFetchNonce]);

  const grantsReliable = !grantsLoading && !grantsError;

  const grantResourceIdSet = useMemo(() => {
    const s = new Set<string>();
    for (const g of grants) {
      s.add(String(g.resourceId));
    }
    return s;
  }, [grants]);

  const tableRows: McpRow[] = useMemo(
    () =>
      mcpList.map((m) => ({
        ...m,
        hasGrantForKey: grantsReliable ? grantResourceIdSet.has(m.resourceId) : false,
        policyLabel: accessPolicyLabel(m.accessPolicy),
      })),
    [mcpList, grantResourceIdSet, grantsReliable],
  );

  useEffect(() => {
    setSelectedExportIds(new Set(mcpList.map((m) => m.resourceId)));
  }, [mcpList]);

  const toggleExportId = useCallback((id: string) => {
    setSelectedExportIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAllExport = useCallback(() => {
    setSelectedExportIds(new Set(tableRows.map((r) => r.resourceId)));
  }, [tableRows]);

  const clearExportSelection = useCallback(() => {
    setSelectedExportIds(new Set());
  }, []);

  const buildExportObject = useCallback(() => {
    const keyMeta = keys.find((k) => k.id === selectedKeyId);
    const mcps = tableRows
      .filter((r) => selectedExportIds.has(r.resourceId))
      .map((r) => ({
        resourceId: r.resourceId,
        displayName: r.displayName,
        accessPolicy: r.accessPolicy ?? null,
        hasGrantForKey: r.hasGrantForKey,
      }));
    return {
      schemaVersion: 1,
      apiBaseUrl,
      granteeApiKeyId: selectedKeyId || null,
      granteeApiKeyName: keyMeta?.name ?? null,
      exportedAt: new Date().toISOString(),
      mcps,
    };
  }, [apiBaseUrl, keys, selectedKeyId, tableRows, selectedExportIds]);

  const exportJson = useMemo(() => JSON.stringify(buildExportObject(), null, 2), [buildExportObject]);

  const downloadExport = useCallback(() => {
    const blob = new Blob([JSON.stringify(buildExportObject(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const slug = (selectedKeyId || 'no-key').slice(0, 12).replace(/[^a-zA-Z0-9_-]/g, '');
    a.download = `lantu-mcp-integration-${slug}.json`;
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
        onClick={() => navigate(buildPath('user', 'api-docs'))}
        aria-label="打开接入指南"
      >
        <BookOpen size={14} aria-hidden />
        接入指南
      </button>
      <button
        type="button"
        className={`inline-flex items-center gap-1 rounded-xl border px-3 py-1.5 text-xs font-medium ${
          isDark ? 'border-white/15 text-slate-200 hover:bg-white/5' : 'border-slate-200 text-slate-700 hover:bg-slate-50'
        }`}
        onClick={() => navigate(buildPath('user', 'api-playground'))}
        aria-label="打开 API Playground"
      >
        <Terminal size={14} aria-hidden />
        API Playground
      </button>
    </div>
  );

  return (
    <MgmtPageShell
      theme={theme}
      fontSize={fontSize}
      titleIcon={Puzzle}
      breadcrumbSegments={['开发者中心', 'MCP 对外集成']}
      description="以「选择 API Key」为主线：对照已发布 MCP 目录、合并 accessPolicy 与针对当前 Key 的 Grant 状态，并导出 Lantu 网关专用 JSON（不含密钥明文）。调用须完整 X-Api-Key；MCP JSON-RPC 建议使用 POST /mcp/v1/.../message，与 /invoke 的 payload 语义一致。"
      toolbar={toolbar}
      contentScroll="document"
    >
      <div className="px-4 sm:px-6 pb-10 w-full max-w-5xl flex flex-col gap-6">
        <section
          className={`rounded-2xl border p-4 space-y-3 ${isDark ? 'border-white/10 bg-white/[0.02]' : 'border-slate-200 bg-white'}`}
          aria-labelledby="mcp-integration-intro"
        >
          <h2 id="mcp-integration-intro" className={`text-sm font-bold ${textPrimary(theme)}`}>
            集成说明
          </h2>
          <p className={`text-sm leading-relaxed ${textSecondary(theme)}`}>
            ① <span className="font-mono text-xs">POST /catalog/resolve</span> → ②{' '}
            <span className="font-mono text-xs">POST /invoke</span> 或{' '}
            <span className="font-mono text-xs">POST /invoke-stream</span>；MCP 亦可走{' '}
            <span className="font-mono text-xs break-all">{mcpMessagePathTemplate}</span>，请求体为 JSON-RPC 单对象（置于网关约定的 body / payload）。须在请求头携带完整{' '}
            <span className="font-mono text-xs">X-Api-Key</span>（浏览器场景建议经 BFF 代理，勿把 secret 暴露到前端）。若上游为 WebSocket MCP 或应用为 redirect 型，请以 resolve 返回为准并做好超时与重试。
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={btnSecondary(theme)}
              onClick={() => navigate(buildPath('user', 'preferences'))}
            >
              <Settings size={14} aria-hidden />
              偏好设置（创建 API Key）
            </button>
            <button type="button" className={btnSecondary(theme)} onClick={() => void loadKeys()}>
              <RefreshCw size={14} aria-hidden /> 刷新 Key
            </button>
            <button type="button" className={btnSecondary(theme)} onClick={() => void loadMcpCatalog()}>
              <RefreshCw size={14} aria-hidden /> 刷新 MCP 目录
            </button>
          </div>
        </section>

        {keysLoading || mcpLoading ? (
          <PageSkeleton type="form" rows={6} />
        ) : (
          <>
            <div
              className={`rounded-2xl border p-4 space-y-4 ${isDark ? 'border-white/10 bg-white/[0.02]' : 'border-slate-200 bg-white'}`}
            >
              <div>
                <div className={`text-xs font-semibold block mb-1 ${textSecondary(theme)}`}>API Key（grantee）</div>
                {keyOptions.length === 0 ? (
                  <p className={`text-sm ${textMuted(theme)}`}>
                    暂无可用 Key。请前往
                    <button
                      type="button"
                      className={`mx-1 underline font-medium ${textPrimary(theme)}`}
                      onClick={() => navigate(buildPath('user', 'preferences'))}
                    >
                      偏好设置
                    </button>
                    创建；撤销仍在偏好设置中完成。
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
              <div className={`flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
                <div>
                  <h3 className={`text-sm font-bold ${textPrimary(theme)}`}>已发布 MCP 与授权标签</h3>
                  <p className={`text-xs mt-0.5 ${textMuted(theme)}`}>
                    「策略」来自目录 accessPolicy；「Grant」表示当前 Key 上存在生效的 invoke 授权。开放策略仍可能受 scope / 发布状态约束。
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" className={btnSecondary(theme)} onClick={selectAllExport}>
                    全选导出
                  </button>
                  <button type="button" className={btnSecondary(theme)} onClick={clearExportSelection}>
                    清空选择
                  </button>
                </div>
              </div>

              {grantsLoading ? (
                <p className={`text-xs flex items-center gap-2 px-4 py-2 border-b ${isDark ? 'border-white/10 bg-white/[0.03]' : 'border-slate-100 bg-slate-50/80'}`}>
                  <Loader2 size={14} className="animate-spin shrink-0" aria-hidden /> 正在加载当前 Key 的 Grant…
                </p>
              ) : null}
              {grantsError ? (
                <div
                  className={`text-xs flex flex-wrap items-center gap-2 px-4 py-2 border-b ${isDark ? 'border-rose-500/30 bg-rose-500/10' : 'border-rose-200 bg-rose-50'}`}
                  role="alert"
                >
                  <span className="text-rose-600 dark:text-rose-300">{grantsError}</span>
                  <button
                    type="button"
                    className={`shrink-0 rounded-lg px-2 py-1 font-medium underline-offset-2 hover:underline ${textPrimary(theme)}`}
                    onClick={() => setGrantFetchNonce((n) => n + 1)}
                  >
                    重试
                  </button>
                </div>
              ) : null}

              {tableRows.length === 0 ? (
                <div className="px-4 py-8 space-y-2">
                  <p className={`text-sm ${textMuted(theme)}`}>目录中暂无已发布 MCP。</p>
                  <button
                    type="button"
                    className={btnSecondary(theme)}
                    onClick={() => navigate(buildUserResourceMarketUrl('mcp'))}
                  >
                    <ExternalLink size={14} className="inline mr-1" aria-hidden />
                    去 MCP 中心逛逛
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className={isDark ? 'bg-white/[0.04]' : 'bg-slate-50'}>
                        <th scope="col" className={`${thClass} w-10`}>
                          <span className="sr-only">选择导出</span>
                        </th>
                        <th scope="col" className={thClass}>
                          名称 / 编码
                        </th>
                        <th scope="col" className={thClass}>
                          resourceId
                        </th>
                        <th scope="col" className={thClass}>
                          策略（目录）
                        </th>
                        <th scope="col" className={thClass}>
                          Grant（当前 Key）
                        </th>
                        <th scope="col" className={thClass}>
                          链接
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {tableRows.map((row) => {
                        const msgUrl = `${apiBaseUrl}/mcp/v1/resources/mcp/${row.resourceId}/message`;
                        const detailUrl = buildPath('user', 'mcp-center', row.resourceId);
                        return (
                          <tr
                            key={row.resourceId}
                            className={`border-t ${isDark ? 'border-white/10 hover:bg-white/[0.03]' : 'border-slate-100 hover:bg-slate-50/80'}`}
                          >
                            <td className="px-3 py-2 align-middle">
                              <label className="inline-flex cursor-pointer items-center justify-center p-3 -m-2 min-h-[44px] min-w-[44px]">
                                <input
                                  type="checkbox"
                                  className="rounded border-slate-300 h-4 w-4 shrink-0 cursor-pointer accent-neutral-900"
                                  checked={selectedExportIds.has(row.resourceId)}
                                  onChange={() => toggleExportId(row.resourceId)}
                                  aria-label={`将 ${row.displayName} 加入导出`}
                                />
                              </label>
                            </td>
                            <td className={`px-3 py-2 align-middle ${textPrimary(theme)}`}>
                              <div className="font-medium">{row.displayName}</div>
                              <div className={`text-xs font-mono ${textMuted(theme)}`}>{row.resourceCode}</div>
                            </td>
                            <td className={`px-3 py-2 align-middle font-mono text-xs ${textPrimary(theme)}`}>{row.resourceId}</td>
                            <td className={`px-3 py-2 align-middle text-xs ${textSecondary(theme)} max-w-[200px]`}>{row.policyLabel}</td>
                            <td className="px-3 py-2 align-middle">
                              {grantsLoading ? (
                                <span className={`text-xs ${textMuted(theme)}`} aria-busy>
                                  …
                                </span>
                              ) : grantsError ? (
                                <span className="text-xs text-rose-500 dark:text-rose-400">无法判定</span>
                              ) : (
                                <span
                                  className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                                    row.hasGrantForKey
                                      ? isDark
                                        ? 'bg-emerald-500/20 text-emerald-300'
                                        : 'bg-emerald-50 text-emerald-800'
                                      : isDark
                                        ? 'bg-slate-500/20 text-slate-300'
                                        : 'bg-slate-100 text-slate-700'
                                  }`}
                                >
                                  {row.hasGrantForKey ? '已授权' : '未授权'}
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2 align-middle">
                              <div className="flex flex-wrap gap-1">
                                <CopyTextBtn text={msgUrl} isDark={isDark} label="复制消息 URL" />
                                <button
                                  type="button"
                                  className={`text-xs underline ${textPrimary(theme)}`}
                                  onClick={() => navigate(detailUrl)}
                                >
                                  详情
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {grantsReliable && tableRows.length > 0 && grants.length === 0 && selectedKeyId ? (
              <p className={`text-xs ${textMuted(theme)}`}>
                当前 Key 在 MCP 上尚无生效 Grant；若资源策略为 grant_required，请通过工单或资源拥有者授权。
                <button
                  type="button"
                  className={`ml-1 underline font-medium ${textPrimary(theme)}`}
                  onClick={() => navigate(buildPath('user', 'my-grant-applications'))}
                >
                  我的授权申请
                </button>
              </p>
            ) : null}

            <div
              className={`rounded-2xl border p-4 ${isDark ? 'border-white/10 bg-white/[0.02]' : 'border-slate-200 bg-white'}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div>
                  <h3 className={`text-sm font-bold ${textPrimary(theme)}`}>导出 JSON</h3>
                  <p className={`text-xs mt-0.5 ${textMuted(theme)}`}>
                    含 schemaVersion、apiBaseUrl、granteeApiKeyId、granteeApiKeyName、exportedAt 与所选 mcps；不包含 secretPlain。
                    {grantsLoading ? ' Grant 加载完成后再导出，以确保 hasGrantForKey 准确。' : ''}
                    {grantsError ? ' Grant 加载失败时已禁用导出，请先在上文点击「重试」。' : ''}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <CopyTextBtn
                    text={exportJson}
                    isDark={isDark}
                    label="复制 JSON"
                    disabled={grantsLoading || !!grantsError}
                  />
                  <button
                    type="button"
                    className={btnPrimary}
                    onClick={downloadExport}
                    disabled={grantsLoading || !!grantsError || !selectedKeyId || selectedExportIds.size === 0}
                  >
                    下载 .json
                  </button>
                </div>
              </div>
              {grantsLoading ? (
                <p className={`text-xs ${textMuted(theme)}`}>Grant 加载中，请稍候再复制或下载。</p>
              ) : grantsError ? (
                <p className={`text-xs text-rose-600 dark:text-rose-400`}>
                  无法生成含准确 hasGrantForKey 的导出，请先修复 Grant 列表加载（上文「重试」）。
                </p>
              ) : selectedExportIds.size === 0 ? (
                <p className={`text-xs ${textMuted(theme)}`}>请至少选择一行 MCP 后再导出。</p>
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
