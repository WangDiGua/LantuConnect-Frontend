import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Check,
  ChevronDown,
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
import type { UserApiKey } from '../../types/dto/user-settings';
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
import { useAuthStore } from '../../stores/authStore';
import { getStoredGatewayApiKey } from '../../lib/safeStorage';

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

function normAccessPolicy(policy?: string): string {
  return (policy ?? '').toLowerCase().replace(/-/g, '_');
}

function accessPolicyLabel(policy?: string): string {
  const p = normAccessPolicy(policy);
  if (p === 'open_platform') return '开放平台（通常可免 Grant）';
  if (p === 'open_org') return '组织内（同组织可短路）';
  if (p === 'grant_required' || !p) return '须显式授权（Grant）';
  return policy || '须显式授权（Grant）';
}

function isOpenPlatformPolicy(policy?: string): boolean {
  return normAccessPolicy(policy) === 'open_platform';
}

function isResourceOwner(createdBy: number | null | undefined, userId: string | null | undefined): boolean {
  if (userId == null || String(userId).trim() === '' || createdBy == null) return false;
  return String(createdBy) === String(userId);
}

/** curl -H 中单引号包裹；含 `'` 时按 Bash 规则转义 */
function shellSingleQuotedHeader(nameValue: string): string {
  return `'${nameValue.replace(/'/g, `'\\''`)}'`;
}

const GATEWAY_API_KEY_LS = 'lantu_api_key';

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
  /** 后端 POST …/invoke-eligibility，与网关 invoke 一致 */
  invokeEligible: boolean;
  isOwnerResource: boolean;
  isOpenPlatformPolicy: boolean;
  policyLabel: string;
};

export const McpIntegrationPage: React.FC<McpIntegrationPageProps> = ({ theme, fontSize }) => {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
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
  const [invokeEligibility, setInvokeEligibility] = useState<Record<string, boolean>>({});
  const [eligibilityLoading, setEligibilityLoading] = useState(false);
  const [eligibilityError, setEligibilityError] = useState<string | null>(null);
  const [selectedExportIds, setSelectedExportIds] = useState<Set<string>>(new Set());
  /** 与后端 catalog `callableOnly` 一致 */
  const [onlyShowCallable, setOnlyShowCallable] = useState(true);
  const [eligibilityFetchNonce, setEligibilityFetchNonce] = useState(0);
  /** 用于在 focus / 跨标签修改 lantu_api_key 后重新读取本地预填密钥 */
  const [curlSourceTick, setCurlSourceTick] = useState(0);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === GATEWAY_API_KEY_LS || e.key == null) setCurlSourceTick((n) => n + 1);
    };
    const onFocus = () => setCurlSourceTick((n) => n + 1);
    window.addEventListener('storage', onStorage);
    window.addEventListener('focus', onFocus);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  const curlLines = useMemo(() => {
    void curlSourceTick;
    const storedKey = getStoredGatewayApiKey();
    const bearer = token?.trim();
    const uid = user?.id?.trim();
    const keyOptional = storedKey
      ? `  -H ${shellSingleQuotedHeader(`X-Api-Key: ${storedKey}`)} \\`
      : `  -H "X-Api-Key: <可选：与登录态二选一；完整 secretPlain；勿提交仓库>" \\`;
    const keyRequired = storedKey
      ? `  -H ${shellSingleQuotedHeader(`X-Api-Key: ${storedKey}`)} \\`
      : `  -H "X-Api-Key: <完整 secretPlain；偏好设置保存或与 API Playground 共用本地键 ${GATEWAY_API_KEY_LS}；勿提交仓库>" \\`;
    const bearerC = bearer
      ? `  -H ${shellSingleQuotedHeader(`Authorization: Bearer ${bearer}`)} \\`
      : `  -H "Authorization: Bearer <token>" \\`;
    const uidC = uid
      ? `  -H ${shellSingleQuotedHeader(`X-User-Id: ${uid}`)}`
      : `  -H "X-User-Id: <当前用户 ID>"`;
    const uidCCont = uid
      ? `  -H ${shellSingleQuotedHeader(`X-User-Id: ${uid}`)} \\`
      : `  -H "X-User-Id: <当前用户 ID>" \\`;
    return { keyOptional, keyRequired, bearerC, uidC, uidCCont, hasStoredKey: !!storedKey };
  }, [curlSourceTick, token, user?.id]);

  /** 与本文、ApiDocs、本页「刷新目录」一致的可复制请求（AI 门户应运行时调用，勿仅依赖导出 JSON） */
  const catalogListUrl = useMemo(
    () =>
      `${apiBaseUrl}/catalog/resources?resourceType=mcp&status=published&page=1&pageSize=100${
        onlyShowCallable ? '&callableOnly=true' : ''
      }`,
    [apiBaseUrl, onlyShowCallable],
  );
  const sdkListUrl = useMemo(
    () =>
      `${apiBaseUrl}/sdk/v1/resources?resourceType=mcp&status=published&page=1&pageSize=100`,
    [apiBaseUrl],
  );
  const resourceGrantsUrl = useMemo(() => {
    const id = selectedKeyId.trim() ? encodeURIComponent(selectedKeyId.trim()) : '{apiKeyId}';
    return `${apiBaseUrl}/user-settings/api-keys/${id}/resource-grants`;
  }, [apiBaseUrl, selectedKeyId]);

  const catalogCurlExample = useMemo(
    () =>
      [
        `curl -sS "${catalogListUrl}" \\`,
        curlLines.keyOptional.replace(/\s*\\$/, ''),
        `# GET 无 body；须至少带 X-Api-Key 或登录态之一（可同时带），二选一规则见接入指南。`,
        `# 若已在本页预填密钥，仍请勿将命令粘贴到仓库或公开渠道。`,
      ].join('\n'),
    [catalogListUrl, curlLines.keyOptional],
  );

  const sdkCurlExample = useMemo(
    () =>
      [
        `# 仅 Key 集成（须 X-Api-Key，不可仅登录态）`,
        `curl -sS "${sdkListUrl}" \\`,
        curlLines.keyRequired.replace(/\s*\\$/, ''),
      ].join('\n'),
    [sdkListUrl, curlLines.keyRequired],
  );

  const grantsCurlExample = useMemo(() => {
    const id = selectedKeyId.trim() ? encodeURIComponent(selectedKeyId.trim()) : '{apiKeyId}';
    return [
      `# Grant 列表仅允许查询「本人」的 Key；须登录态（Bearer + X-User-Id）。`,
      `curl -sS "${apiBaseUrl}/user-settings/api-keys/${id}/resource-grants" \\`,
      curlLines.bearerC,
      curlLines.uidC,
    ].join('\n');
  }, [apiBaseUrl, selectedKeyId, curlLines.bearerC, curlLines.uidC]);

  const eligibilityCurlExample = useMemo(() => {
    const id = selectedKeyId.trim() ? encodeURIComponent(selectedKeyId.trim()) : '{apiKeyId}';
    return [
      `# 与 POST /invoke Grant 判定一致（open_platform / owner Key / Grant 行等）；须登录态。`,
      `curl -sS -X POST "${apiBaseUrl}/user-settings/api-keys/${id}/invoke-eligibility" \\`,
      curlLines.bearerC,
      `  -H "Content-Type: application/json" \\`,
      curlLines.uidCCont,
      `  -d '{"resourceType":"mcp","resourceIds":["58","57"]}'`,
    ].join('\n');
  }, [apiBaseUrl, selectedKeyId, curlLines.bearerC, curlLines.uidCCont]);

  const catalogResolveUrl = useMemo(() => `${apiBaseUrl}/catalog/resolve`, [apiBaseUrl]);
  const sdkResolveUrl = useMemo(() => `${apiBaseUrl}/sdk/v1/resolve`, [apiBaseUrl]);

  const resolveCatalogCurlExample = useMemo(
    () =>
      [
        `# 解析须完整 X-Api-Key；将 {resourceId} 换成本表 resourceId。`,
        `curl -sS -X POST "${catalogResolveUrl}" \\`,
        curlLines.keyRequired,
        `  -H "Content-Type: application/json" \\`,
        `  -d '{"resourceType":"mcp","resourceId":"{resourceId}"}'`,
      ].join('\n'),
    [catalogResolveUrl, curlLines.keyRequired],
  );

  const resolveSdkCurlExample = useMemo(
    () =>
      [
        `# 与上一请求语义相同，供仅走 /sdk/v1 的集成方。`,
        `curl -sS -X POST "${sdkResolveUrl}" \\`,
        curlLines.keyRequired,
        `  -H "Content-Type: application/json" \\`,
        `  -d '{"resourceType":"mcp","resourceId":"{resourceId}"}'`,
      ].join('\n'),
    [sdkResolveUrl, curlLines.keyRequired],
  );

  const invokeCurlExample = useMemo(
    () =>
      [
        `# 统一 HTTP 调用；实际路径/流式请以 resolve 返回的 invokeType、endpoint 为准。`,
        `curl -sS -X POST "${apiBaseUrl}/invoke" \\`,
        curlLines.keyRequired,
        `  -H "Content-Type: application/json" \\`,
        `  -d '{"resourceType":"mcp","resourceId":"{resourceId}","payload":{}}'`,
      ].join('\n'),
    [apiBaseUrl, curlLines.keyRequired],
  );

  const invokeStreamCurlExample = useMemo(
    () =>
      [
        `# 流式（SSE 等）；权限与 /invoke 一致。`,
        `curl -sS -X POST "${apiBaseUrl}/invoke-stream" \\`,
        curlLines.keyRequired,
        `  -H "Content-Type: application/json" \\`,
        `  -H "Accept: text/event-stream" \\`,
        `  -d '{"resourceType":"mcp","resourceId":"{resourceId}","payload":{}}'`,
      ].join('\n'),
    [apiBaseUrl, curlLines.keyRequired],
  );

  /** 无独立 GET 列举工具接口；在 message URL 上使用 JSON-RPC。 */
  const mcpJsonRpcCurlExamples = useMemo(() => {
    const msgUrl = `${apiBaseUrl}/mcp/v1/resources/mcp/{resourceId}/message`;
    const k = curlLines.keyRequired;
    const ct = `  -H "Content-Type: application/json" \\`;
    return [
      `# 将 {resourceId} 替换为目录中的 MCP resourceId（可与下表「复制消息 URL」对照）。`,
      `# 无独立「GET 全部工具」REST；通过 JSON-RPC tools/list 枚举工具；与 POST /invoke 的取舍以 resolve 返回的 invokeType 为准。`,
      ``,
      `# initialize（按上游要求）`,
      `curl -sS -X POST "${msgUrl}" \\`,
      k,
      ct,
      `  -d '{"jsonrpc":"2.0","id":0,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"curl","version":"1"}}}'`,
      ``,
      `# tools/list（枚举工具）`,
      `curl -sS -X POST "${msgUrl}" \\`,
      k,
      ct,
      `  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'`,
      ``,
      `# tools/call（示例；name 换为列表中的工具名）`,
      `curl -sS -X POST "${msgUrl}" \\`,
      k,
      ct,
      `  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"某工具名","arguments":{}}}'`,
    ].join('\n');
  }, [apiBaseUrl, curlLines.keyRequired]);

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
        callableOnly: onlyShowCallable,
      });
      const rows = page.list.filter((r) => r.status === 'published');
      setMcpList(rows);
    } finally {
      setMcpLoading(false);
    }
  }, [onlyShowCallable]);

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
    if (!selectedKeyId.trim() || mcpList.length === 0) {
      setInvokeEligibility({});
      setEligibilityError(null);
      setEligibilityLoading(false);
      return;
    }
    let cancelled = false;
    setEligibilityLoading(true);
    setEligibilityError(null);
    userSettingsService
      .postInvokeEligibility(selectedKeyId, {
        resourceType: 'mcp',
        resourceIds: mcpList.map((m) => m.resourceId),
      })
      .then((res) => {
        if (!cancelled) setInvokeEligibility(res.byResourceId ?? {});
      })
      .catch((e) => {
        if (!cancelled) {
          const msg =
            e instanceof Error ? e.message : typeof e === 'string' ? e : 'invoke 授权预判加载失败';
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
  }, [selectedKeyId, mcpList, eligibilityFetchNonce]);

  const eligibilityReliable = !eligibilityLoading && !eligibilityError;

  const tableRows: McpRow[] = useMemo(
    () =>
      mcpList.map((m) => {
        const isOpen = isOpenPlatformPolicy(m.accessPolicy);
        const isOwner = isResourceOwner(m.createdBy, user?.id);
        const invokeEligible = eligibilityReliable ? Boolean(invokeEligibility[m.resourceId]) : false;
        return {
          ...m,
          invokeEligible,
          isOwnerResource: isOwner,
          isOpenPlatformPolicy: isOpen,
          policyLabel: accessPolicyLabel(m.accessPolicy),
        };
      }),
    [mcpList, invokeEligibility, eligibilityReliable, user?.id],
  );

  /** 存在须显式 Grant 策略且当前 Key 网关判定仍不可 invoke 时提示 */
  const showNoGrantFooter = useMemo(() => {
    if (!eligibilityReliable || !selectedKeyId.trim() || tableRows.length === 0) return false;
    return tableRows.some((r) => {
      const p = normAccessPolicy(r.accessPolicy);
      const grantReq = p === 'grant_required' || !p;
      return grantReq && !r.invokeEligible;
    });
  }, [eligibilityReliable, selectedKeyId, tableRows]);

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
        hasGrantForKey: r.invokeEligible,
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
      description="以「选择 API Key」为主线：Grant 列与导出 hasGrantForKey 来自后端 invoke-eligibility，与 POST /invoke 一致。目录支持 callableOnly 与网关健康/熔断一致。导出 JSON 仅为快照；调用须完整 X-Api-Key。"
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
            实际执行多是<strong className={textPrimary(theme)}>「解析 → 三选一调用」</strong>：先 <span className="font-mono text-xs">POST /catalog/resolve</span>，再按返回的 <span className="font-mono text-xs">invokeType</span> 选用{' '}
            <span className="font-mono text-xs">/invoke</span>、<span className="font-mono text-xs">/invoke-stream</span> 或 <span className="font-mono text-xs break-all">…/message</span>（JSON-RPC）。下文<strong className={textPrimary(theme)}> 常用三种方式 </strong>
            已展开；拉目录、Grant、预判及 SDK 等价路径请用<strong className={textPrimary(theme)}> 展开更多 </strong>。须带完整 <span className="font-mono text-xs">X-Api-Key</span>；浏览器场景建议经 BFF。
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

        <section
          className={`rounded-2xl border p-4 space-y-4 ${isDark ? 'border-white/10 bg-white/[0.02]' : 'border-slate-200 bg-white'}`}
          aria-labelledby="mcp-runtime-api"
        >
          <h2 id="mcp-runtime-api" className={`text-sm font-bold ${textPrimary(theme)}`}>
            对外 HTTP 接口（可复制 URL / curl）
          </h2>
          <p className={`text-xs leading-relaxed ${textMuted(theme)}`}>
            大多数集成只需<strong className={textPrimary(theme)}> 下方解析 + 三选一调用 </strong>。拉目录、Grant、预判及 <span className="font-mono">/sdk/v1/*</span> 等价路径在底部{' '}
            <strong className={textPrimary(theme)}>展开更多</strong>。执行向须完整 <span className="font-mono">X-Api-Key</span>；目录 URL 会随「仅显示健康可调用」带上{' '}
            <span className="font-mono">callableOnly</span>。
          </p>
          {!curlLines.hasStoredKey ? (
            <p className={`text-xs leading-relaxed ${isDark ? 'text-amber-200/90' : 'text-amber-900'}`}>
              在<strong className={textPrimary(theme)}> 偏好设置 </strong>
              保存网关 API Key 后，与本页及 API Playground 共用的本地存储（<span className="font-mono">lantu_api_key</span>）将用于预填下方 curl 的{' '}
              <span className="font-mono">X-Api-Key</span>；未保存时仍显示占位说明。
            </p>
          ) : (
            <p className={`text-xs leading-relaxed ${isDark ? 'text-emerald-200/90' : 'text-emerald-800'}`}>
              已从本机读取保存的网关密钥并预填执行向 curl；请勿将复制出的命令提交到仓库或发送到聊天/工单。
            </p>
          )}

          <div className="space-y-1">
            <h3 className={`text-sm font-bold ${textPrimary(theme)}`}>常用：解析 → 三种调用（三选一）</h3>
            <p className={`text-[11px] leading-relaxed ${textMuted(theme)}`}>
              ① 可选：展开更多用目录拿到 <span className="font-mono">resourceId</span>。② <span className="font-mono">POST /catalog/resolve</span>。③ 按 resolve 的 <span className="font-mono">invokeType</span> 只选下列<strong>一种</strong>，勿与另外两种混在同一次业务里。
            </p>
          </div>

          <div
            className={`rounded-xl border p-3 space-y-2 ${isDark ? 'border-emerald-500/20 bg-emerald-500/[0.06]' : 'border-emerald-200 bg-emerald-50/60'}`}
          >
            <div className={`text-xs font-bold ${textSecondary(theme)}`}>② 解析：POST /catalog/resolve</div>
            <p className={`text-[11px] ${textMuted(theme)}`}>
              body 中 <span className="font-mono">{'{resourceId}'}</span> 换为目录中的值。仅走 Key 的集成可用 <span className="font-mono">POST /sdk/v1/resolve</span>（展开更多）。
            </p>
            <div className="flex flex-wrap items-start gap-2">
              <code
                className={`flex-1 min-w-0 break-all text-[11px] leading-snug rounded-lg px-2 py-1.5 font-mono ${
                  isDark ? 'bg-black/30 text-slate-200' : 'bg-white text-slate-800'
                }`}
              >
                {catalogResolveUrl}
              </code>
              <CopyTextBtn text={catalogResolveUrl} isDark={isDark} label="复制 URL" />
            </div>
            <div className="flex flex-wrap gap-2">
              <CopyTextBtn text={resolveCatalogCurlExample} isDark={isDark} label="复制 curl（resolve）" />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <div
              className={`rounded-xl border p-3 space-y-2 flex flex-col ${isDark ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-white'}`}
            >
              <div className={`text-xs font-bold ${textSecondary(theme)}`}>③ 同步：POST /invoke</div>
              <p className={`text-[11px] flex-1 ${textMuted(theme)}`}>统一 JSON 响应，最常用。</p>
              <div className="flex flex-wrap items-start gap-2">
                <code
                  className={`flex-1 min-w-0 break-all text-[11px] leading-snug rounded-lg px-2 py-1.5 font-mono ${
                    isDark ? 'bg-black/30 text-slate-200' : 'bg-slate-100 text-slate-800'
                  }`}
                >
                  {`${apiBaseUrl}/invoke`}
                </code>
                <CopyTextBtn text={`${apiBaseUrl}/invoke`} isDark={isDark} label="复制 URL" />
              </div>
              <CopyTextBtn text={invokeCurlExample} isDark={isDark} label="复制 curl" />
            </div>
            <div
              className={`rounded-xl border p-3 space-y-2 flex flex-col ${isDark ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-white'}`}
            >
              <div className={`text-xs font-bold ${textSecondary(theme)}`}>③ 流式：POST /invoke-stream</div>
              <p className={`text-[11px] flex-1 ${textMuted(theme)}`}>SSE 等流式上游。</p>
              <div className="flex flex-wrap items-start gap-2">
                <code
                  className={`flex-1 min-w-0 break-all text-[11px] leading-snug rounded-lg px-2 py-1.5 font-mono ${
                    isDark ? 'bg-black/30 text-slate-200' : 'bg-slate-100 text-slate-800'
                  }`}
                >
                  {`${apiBaseUrl}/invoke-stream`}
                </code>
                <CopyTextBtn text={`${apiBaseUrl}/invoke-stream`} isDark={isDark} label="复制 URL" />
              </div>
              <CopyTextBtn text={invokeStreamCurlExample} isDark={isDark} label="复制 curl" />
            </div>
            <div
              className={`rounded-xl border p-3 space-y-2 flex flex-col ${isDark ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-white'}`}
            >
              <div className={`text-xs font-bold ${textSecondary(theme)}`}>③ MCP：…/message + JSON-RPC</div>
              <p className={`text-[11px] flex-1 ${textMuted(theme)}`}>
                单 URL 上 <span className="font-mono">tools/list</span> / <span className="font-mono">tools/call</span> 等。
              </p>
              <div className="flex flex-wrap items-start gap-2">
                <code
                  className={`flex-1 min-w-0 break-all text-[11px] leading-snug rounded-lg px-2 py-1.5 font-mono ${
                    isDark ? 'bg-black/30 text-slate-200' : 'bg-slate-100 text-slate-800'
                  }`}
                >
                  {mcpMessagePathTemplate}
                </code>
                <CopyTextBtn text={mcpMessagePathTemplate} isDark={isDark} label="复制 URL" />
              </div>
              <CopyTextBtn text={mcpJsonRpcCurlExamples} isDark={isDark} label="复制 curl（合集）" />
            </div>
          </div>

          <details
            className={`group rounded-xl border overflow-hidden ${isDark ? 'border-white/10 bg-white/[0.02]' : 'border-slate-200 bg-white'}`}
          >
            <summary
              className={`flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-semibold [&::-webkit-details-marker]:hidden ${
                isDark ? 'bg-white/[0.04] hover:bg-white/[0.07]' : 'bg-slate-50 hover:bg-slate-100'
              }`}
            >
              <ChevronDown
                size={16}
                className={`shrink-0 transition-transform group-open:rotate-180 ${textMuted(theme)}`}
                aria-hidden
              />
              <span className={textPrimary(theme)}>展开更多</span>
              <span className={`text-xs font-normal ${textMuted(theme)}`}>
                目录与 Grant、invoke 预判、仅 Key 目录、POST /sdk/v1/resolve …
              </span>
            </summary>
            <div
              className={`space-y-4 border-t px-4 pb-4 pt-3 ${isDark ? 'border-white/10' : 'border-slate-200'}`}
            >
              <h4 className={`text-xs font-bold uppercase tracking-wide ${textMuted(theme)}`}>发现与授权（运行时）</h4>

              <div className="space-y-3">
                <div>
                  <div className={`text-xs font-semibold mb-1 ${textSecondary(theme)}`}>
                    1. 列举已发布 MCP（目录，GET）
                  </div>
              <div className="flex flex-wrap items-start gap-2">
                <code
                  className={`flex-1 min-w-0 break-all text-[11px] leading-snug rounded-lg px-2 py-1.5 font-mono ${
                    isDark ? 'bg-black/30 text-slate-200' : 'bg-slate-100 text-slate-800'
                  }`}
                >
                  {catalogListUrl}
                </code>
                <CopyTextBtn text={catalogListUrl} isDark={isDark} label="复制 URL" />
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <CopyTextBtn text={catalogCurlExample} isDark={isDark} label="复制 curl 示例" />
              </div>
            </div>

            <div>
              <div className={`text-xs font-semibold mb-1 ${textSecondary(theme)}`}>
                2. 仅 API Key 拉目录（SDK 列表，GET，须 X-Api-Key）
              </div>
              <div className="flex flex-wrap items-start gap-2">
                <code
                  className={`flex-1 min-w-0 break-all text-[11px] leading-snug rounded-lg px-2 py-1.5 font-mono ${
                    isDark ? 'bg-black/30 text-slate-200' : 'bg-slate-100 text-slate-800'
                  }`}
                >
                  {sdkListUrl}
                </code>
                <CopyTextBtn text={sdkListUrl} isDark={isDark} label="复制 URL" />
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                <CopyTextBtn text={sdkCurlExample} isDark={isDark} label="复制 curl 示例" />
              </div>
            </div>

            <div>
              <div className={`text-xs font-semibold mb-1 ${textSecondary(theme)}`}>
                3. 当前 Key 的 Grant 列表（GET，须本人 Key + 登录态）
              </div>
              <p className={`text-[11px] mb-1 ${textMuted(theme)}`}>
                路径中 <span className="font-mono">apiKeyId</span> 为 Key 的数据库 id（非 secret）。未选择 Key 时占位为{' '}
                <span className="font-mono">{'{apiKeyId}'}</span>；省略 query 时后端默认 <span className="font-mono">resourceType=mcp</span>。
              </p>
              <div className="flex flex-wrap items-start gap-2">
                <code
                  className={`flex-1 min-w-0 break-all text-[11px] leading-snug rounded-lg px-2 py-1.5 font-mono ${
                    isDark ? 'bg-black/30 text-slate-200' : 'bg-slate-100 text-slate-800'
                  }`}
                >
                  {resourceGrantsUrl}
                </code>
                <CopyTextBtn text={resourceGrantsUrl} isDark={isDark} label="复制 URL" />
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                <CopyTextBtn text={grantsCurlExample} isDark={isDark} label="复制 curl 示例" />
              </div>
            </div>

            <div>
              <div className={`text-xs font-semibold mb-1 ${textSecondary(theme)}`}>
                4. 当前 Key 的 invoke 授权预判（POST，须本人 Key + 登录态）
              </div>
              <p className={`text-[11px] mb-1 ${textMuted(theme)}`}>
                与网关 <span className="font-mono">ResourceInvokeGrantService</span> 一致（open_platform、owner Key、Grant 行等）；控制台 Grant 列与导出 JSON 依赖此接口而非仅 Grant 表。
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                <CopyTextBtn text={eligibilityCurlExample} isDark={isDark} label="复制 curl 示例" />
              </div>
            </div>
              </div>

              <h4 className={`text-xs font-bold uppercase tracking-wide pt-1 ${textMuted(theme)}`}>
                解析路径补充（与上方「② 解析」等价）
              </h4>
              <p className={`text-[11px] ${textMuted(theme)}`}>
                主区域已给出 <span className="font-mono">POST /catalog/resolve</span>。若集成固定走 <span className="font-mono">/sdk/v1</span>，可用下列 URL / curl；<span className="font-mono">/invoke</span>、<span className="font-mono">/invoke-stream</span>、<span className="font-mono">…/message</span> 的可复制块与主区域<strong className={textPrimary(theme)}> 三列 </strong>相同。
              </p>
              <div className="space-y-3">
                <div>
                  <div className={`text-xs font-semibold mb-1 ${textSecondary(theme)}`}>
                    POST /catalog/resolve 与 POST /sdk/v1/resolve（双路径）
                  </div>
                  <div className="flex flex-wrap items-start gap-2">
                    <code
                      className={`flex-1 min-w-0 break-all text-[11px] leading-snug rounded-lg px-2 py-1.5 font-mono ${
                        isDark ? 'bg-black/30 text-slate-200' : 'bg-slate-100 text-slate-800'
                      }`}
                    >
                      {catalogResolveUrl}
                    </code>
                    <CopyTextBtn text={catalogResolveUrl} isDark={isDark} label="复制 URL" />
                  </div>
                  <div className="flex flex-wrap items-start gap-2 mt-2">
                    <code
                      className={`flex-1 min-w-0 break-all text-[11px] leading-snug rounded-lg px-2 py-1.5 font-mono ${
                        isDark ? 'bg-black/30 text-slate-200' : 'bg-slate-100 text-slate-800'
                      }`}
                    >
                      {sdkResolveUrl}
                    </code>
                    <CopyTextBtn text={sdkResolveUrl} isDark={isDark} label="复制 SDK resolve URL" />
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <CopyTextBtn text={resolveCatalogCurlExample} isDark={isDark} label="复制 curl（catalog）" />
                    <CopyTextBtn text={resolveSdkCurlExample} isDark={isDark} label="复制 curl（sdk）" />
                  </div>
                </div>
              </div>
            </div>
          </details>
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
                    「策略」来自目录 accessPolicy；「Grant」列与导出 hasGrantForKey 来自{' '}
                    <span className="font-mono text-[11px]">POST …/invoke-eligibility</span>，与网关 invoke 一致（含 open_platform、owner Key、Grant 行等）。
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
                <p className={`text-xs flex items-center gap-2 px-4 py-2 border-b ${isDark ? 'border-white/10 bg-white/[0.03]' : 'border-slate-100 bg-slate-50/80'}`}>
                  <Loader2 size={14} className="animate-spin shrink-0" aria-hidden /> 正在加载当前 Key 的 invoke 授权预判…
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

              {mcpList.length === 0 ? (
                <div className="px-4 py-8 space-y-3">
                  <p className={`text-sm ${textMuted(theme)}`}>
                    {onlyShowCallable
                      ? '当前目录下暂无「健康可调用」的已发布 MCP（与网关 invoke 前校验一致），或确实尚无已发布项。'
                      : '目录中暂无已发布 MCP。'}
                  </p>
                  {onlyShowCallable ? (
                    <button type="button" className={btnSecondary(theme)} onClick={() => setOnlyShowCallable(false)}>
                      显示全部目录项
                    </button>
                  ) : (
                    <button
                      type="button"
                      className={btnSecondary(theme)}
                      onClick={() => navigate(buildUserResourceMarketUrl('mcp'))}
                    >
                      <ExternalLink size={14} className="inline mr-1" aria-hidden />
                      去 MCP 中心逛逛
                    </button>
                  )}
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
                                  开放平台（可免 Grant）
                                </span>
                              ) : row.invokeEligible ? (
                                <span
                                  className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                                    isDark ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-50 text-emerald-800'
                                  }`}
                                >
                                  已授权
                                </span>
                              ) : (
                                <span
                                  className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                                    isDark ? 'bg-slate-500/20 text-slate-300' : 'bg-slate-100 text-slate-700'
                                  }`}
                                >
                                  未授权
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

            {showNoGrantFooter ? (
              <p className={`text-xs ${textMuted(theme)}`}>
                当前 Key 在须授权的 MCP 上尚无生效 Grant；若资源策略为 grant_required，请通过工单或资源拥有者授权。
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
                    {eligibilityLoading ? ' 授权预判加载完成后再导出，以确保 hasGrantForKey 与网关一致。' : ''}
                    {eligibilityError ? ' 预判加载失败时已禁用导出，请先在上文点击「重试」。' : ''}
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
                    disabled={eligibilityLoading || !!eligibilityError || !selectedKeyId || selectedExportIds.size === 0}
                  >
                    下载 .json
                  </button>
                </div>
              </div>
              {eligibilityLoading ? (
                <p className={`text-xs ${textMuted(theme)}`}>授权预判加载中，请稍候再复制或下载。</p>
              ) : eligibilityError ? (
                <p className={`text-xs text-rose-600 dark:text-rose-400`}>
                  无法生成含准确 hasGrantForKey 的导出，请先修复上文「重试」。
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
