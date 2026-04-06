import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Check, Copy, Loader2, Plug, RefreshCw } from 'lucide-react';
import type { Theme, FontSize } from '../../types';
import { env } from '../../config/env';
import { userSettingsService } from '../../api/services/user-settings.service';
import { resourceCatalogService } from '../../api/services/resource-catalog.service';
import type { ResourceCatalogItemVO } from '../../types/dto/catalog';
import type { UserApiKey, UserApiKeyResourceGrant } from '../../types/dto/user-settings';
import { MgmtPageShell } from '../userMgmt/MgmtPageShell';
import { LantuSelect } from '../../components/common/LantuSelect';
import { nativeInputClass } from '../../utils/formFieldClasses';
import {
  btnPrimary,
  btnSecondary,
  textMuted,
  textPrimary,
  textSecondary,
} from '../../utils/uiClasses';
import { buildPath } from '../../constants/consoleRoutes';
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

function CopyTextBtn({ text, isDark, label }: { text: string; isDark: boolean; label?: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard.writeText(text);
        setOk(true);
        setTimeout(() => setOk(false), 1500);
      }}
      className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium transition-colors ${
        isDark ? 'hover:bg-white/10 text-slate-300' : 'hover:bg-slate-100 text-slate-600'
      }`}
      aria-label={label ?? '复制'}
    >
      {ok ? <Check size={14} className="text-emerald-500" aria-hidden /> : <Copy size={14} aria-hidden />}
      {label ?? '复制'}
    </button>
  );
}

export const McpIntegrationPage: React.FC<McpIntegrationPageProps> = ({ theme, fontSize }) => {
  const navigate = useNavigate();
  const isDark = theme === 'dark';
  const apiBaseUrl = useMemo(() => buildPublicApiBaseUrl(), []);

  const [keys, setKeys] = useState<UserApiKey[]>([]);
  const [keysLoading, setKeysLoading] = useState(true);
  const [mcpList, setMcpList] = useState<ResourceCatalogItemVO[]>([]);
  const [mcpLoading, setMcpLoading] = useState(true);
  const [selectedKeyId, setSelectedKeyId] = useState<string>('');
  const [selectedMcpId, setSelectedMcpId] = useState<string>('');
  const [grants, setGrants] = useState<UserApiKeyResourceGrant[]>([]);
  const [grantsLoading, setGrantsLoading] = useState(false);
  const [grantsError, setGrantsError] = useState<string | null>(null);

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
    if (keys.length && !selectedKeyId) {
      setSelectedKeyId(keys[0].id);
    }
  }, [keys, selectedKeyId]);

  useEffect(() => {
    if (mcpList.length && !selectedMcpId) {
      setSelectedMcpId(mcpList[0].resourceId);
    }
  }, [mcpList, selectedMcpId]);

  useEffect(() => {
    if (!selectedKeyId.trim()) {
      setGrants([]);
      return;
    }
    let cancelled = false;
    setGrantsLoading(true);
    setGrantsError(null);
    userSettingsService
      .listResourceGrantsForApiKey(selectedKeyId, 'mcp')
      .then((g) => {
        if (!cancelled) setGrants(g);
      })
      .catch((e) => {
        if (!cancelled) {
          setGrantsError(e instanceof Error ? e.message : '授权列表加载失败');
          setGrants([]);
        }
      })
      .finally(() => {
        if (!cancelled) setGrantsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedKeyId]);

  const selectedMcp = useMemo(
    () => mcpList.find((m) => m.resourceId === selectedMcpId) ?? null,
    [mcpList, selectedMcpId],
  );

  const mcpMessagePathTemplate = useMemo(
    () => `${apiBaseUrl}/mcp/v1/resources/mcp/{resourceId}/message`,
    [apiBaseUrl],
  );

  const resolvedMcpMessageUrl = selectedMcpId
    ? `${apiBaseUrl}/mcp/v1/resources/mcp/${selectedMcpId}/message`
    : '';

  const exportPayload = useMemo(
    () =>
      JSON.stringify(
        {
          apiBaseUrl,
          granteeApiKeyId: selectedKeyId || undefined,
          mcpMessageUrlTemplate: mcpMessagePathTemplate,
          mcpMessageUrlExample: resolvedMcpMessageUrl || undefined,
          note: '请求头须带完整 X-Api-Key（secretPlain）；导出不含密钥明文。',
          selectedMcp: selectedMcp
            ? {
                resourceId: selectedMcp.resourceId,
                resourceCode: selectedMcp.resourceCode,
                displayName: selectedMcp.displayName,
                accessPolicy: selectedMcp.accessPolicy,
              }
            : undefined,
          mcpResourceGrants: grants,
        },
        null,
        2,
      ),
    [apiBaseUrl, selectedKeyId, mcpMessagePathTemplate, resolvedMcpMessageUrl, selectedMcp, grants],
  );

  const keyOptions = keys.map((k) => ({ value: k.id, label: `${k.name} (${k.id.slice(0, 8)}…)` }));
  const mcpOptions = mcpList.map((m) => ({
    value: m.resourceId,
    label: `${m.displayName} · ${m.resourceCode}`,
  }));

  const toolbar = (
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
  );

  return (
    <MgmtPageShell
      theme={theme}
      fontSize={fontSize}
      titleIcon={Plug}
      breadcrumbSegments={['开发者中心', 'MCP 对外集成']}
      description="选择个人 API Key 与已发布 MCP 资源，查看针对该 Key 的 Resource Grant，并导出接入 JSON（含 mcpMessageUrl 模板）。调用仍须完整 X-Api-Key；路径使用 JSON-RPC 单对象，与 POST /invoke 的 payload 语义一致。"
      toolbar={toolbar}
      contentScroll="document"
    >
      <div className="px-4 sm:px-6 pb-10 w-full max-w-4xl flex flex-col gap-6">
        <div className="flex flex-wrap gap-2">
          <button type="button" className={btnSecondary(theme)} onClick={() => void loadKeys()}>
            <RefreshCw size={14} aria-hidden /> 刷新 Key
          </button>
          <button type="button" className={btnSecondary(theme)} onClick={() => void loadMcpCatalog()}>
            <RefreshCw size={14} aria-hidden /> 刷新 MCP 目录
          </button>
        </div>

        {keysLoading || mcpLoading ? (
          <PageSkeleton type="form" rows={4} />
        ) : (
          <div className={`rounded-2xl border p-4 space-y-4 ${isDark ? 'border-white/10 bg-white/[0.02]' : 'border-slate-200 bg-white'}`}>
            <div>
              <label className={`text-xs font-semibold block mb-1 ${textSecondary(theme)}`}>API Key（grantee）</label>
              {keyOptions.length === 0 ? (
                <p className={`text-sm ${textMuted(theme)}`}>暂无可用 Key，请先在个人设置中创建。</p>
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
            <div>
              <label className={`text-xs font-semibold block mb-1 ${textSecondary(theme)}`}>已发布 MCP 资源</label>
              {mcpOptions.length === 0 ? (
                <p className={`text-sm ${textMuted(theme)}`}>目录中暂无已发布 MCP，请先在资源中心上架。</p>
              ) : (
                <LantuSelect
                  theme={theme}
                  className="w-full max-w-md"
                  value={selectedMcpId}
                  onChange={setSelectedMcpId}
                  options={mcpOptions}
                />
              )}
            </div>
          </div>
        )}

        <div className={`rounded-2xl border p-4 ${isDark ? 'border-white/10 bg-white/[0.02]' : 'border-slate-200 bg-white'}`}>
          <h3 className={`text-sm font-bold mb-2 ${textPrimary(theme)}`}>MCP 消息 URL（不含密钥）</h3>
          <p className={`text-xs mb-2 ${textMuted(theme)}`}>
            模板路径：<span className="font-mono break-all">{mcpMessagePathTemplate}</span>
          </p>
          {resolvedMcpMessageUrl ? (
            <div className="flex flex-wrap items-center gap-2">
              <input readOnly className={`${nativeInputClass(theme)} flex-1 min-w-0 font-mono text-xs`} value={resolvedMcpMessageUrl} aria-label="示例 MCP 消息 URL" />
              <CopyTextBtn text={resolvedMcpMessageUrl} isDark={isDark} label="复制示例 URL" />
            </div>
          ) : (
            <p className={`text-xs ${textMuted(theme)}`}>请选择 MCP 资源以生成示例 URL。</p>
          )}
        </div>

        <div className={`rounded-2xl border p-4 ${isDark ? 'border-white/10 bg-white/[0.02]' : 'border-slate-200 bg-white'}`}>
          <h3 className={`text-sm font-bold mb-2 ${textPrimary(theme)}`}>当前 Key 的 MCP Grant（只读）</h3>
          {grantsLoading ? (
            <p className={`text-xs flex items-center gap-2 ${textMuted(theme)}`}>
              <Loader2 size={14} className="animate-spin" aria-hidden /> 加载中…
            </p>
          ) : grantsError ? (
            <p className="text-xs text-rose-500" role="alert">
              {grantsError}
            </p>
          ) : grants.length === 0 ? (
            <p className={`text-xs ${textMuted(theme)}`}>暂无生效的 MCP 授权，可通过工单或资源拥有者授予 invoke。</p>
          ) : (
            <ul className="space-y-2 text-xs">
              {grants.map((g) => (
                <li key={g.id} className={`rounded-lg border px-3 py-2 ${isDark ? 'border-white/10' : 'border-slate-100'}`}>
                  <span className={`font-mono ${textPrimary(theme)}`}>
                    #{g.resourceId} {g.actions?.length ? `· ${g.actions.join(', ')}` : ''}
                  </span>
                  <span className={`block ${textMuted(theme)}`}>status: {g.status}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className={`rounded-2xl border p-4 ${isDark ? 'border-white/10 bg-white/[0.02]' : 'border-slate-200 bg-white'}`}>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <h3 className={`text-sm font-bold ${textPrimary(theme)}`}>导出 JSON</h3>
            <CopyTextBtn text={exportPayload} isDark={isDark} label="复制 JSON" />
          </div>
          <pre
            className={`text-[11px] leading-relaxed overflow-x-auto rounded-xl p-3 max-h-80 overflow-y-auto font-mono ${
              isDark ? 'bg-black/30 text-slate-200' : 'bg-slate-50 text-slate-800'
            }`}
          >
            {exportPayload}
          </pre>
        </div>
      </div>
    </MgmtPageShell>
  );
};
