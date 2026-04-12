import React, { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { BookOpen, ExternalLink, Puzzle, Terminal } from 'lucide-react';
import type { Theme, FontSize } from '../../types';
import { env } from '../../config/env';
import { MgmtPageShell } from '../userMgmt/MgmtPageShell';
import { btnPrimary, btnSecondary, textMuted, textPrimary, textSecondary } from '../../utils/uiClasses';
import { buildPath, inferConsoleRole, parseRoute, type ConsoleRole } from '../../constants/consoleRoutes';
import { useUserRole } from '../../context/UserRoleContext';

type GatewayIntegrationTabId = 'portal-invoke' | 'skill-context' | 'app-dataset-mcp';

const GATEWAY_INTEGRATION_TABS: readonly { id: GatewayIntegrationTabId; label: string; hint: string }[] = [
  { id: 'portal-invoke', label: '外部门户调用（Agent / MCP）', hint: 'invoke 与 MCP 工具路径' },
  { id: 'skill-context', label: 'Skill（门户上下文）', hint: 'resolve，不可 invoke' },
  { id: 'app-dataset-mcp', label: 'App / 数据集（经 MCP）', hint: '经 MCP 封装后调用' },
] as const;

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

export interface GatewayIntegrationPageProps {
  theme: Theme;
  fontSize: FontSize;
}

export const GatewayIntegrationPage: React.FC<GatewayIntegrationPageProps> = ({ theme, fontSize }) => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { platformRole } = useUserRole();
  const routePage = parseRoute(pathname)?.page ?? '';
  const consoleRole: ConsoleRole = inferConsoleRole(routePage, platformRole);

  const isDark = theme === 'dark';
  const apiBaseUrl = useMemo(() => buildPublicApiBaseUrl(), []);
  const [gatewayTab, setGatewayTab] = useState<GatewayIntegrationTabId>('portal-invoke');

  const toolbar = (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        className={`inline-flex items-center gap-1 rounded-xl border px-3 py-1.5 text-xs font-medium ${
          isDark ? 'border-white/15 text-slate-200 hover:bg-white/5' : 'border-slate-200 text-slate-700 hover:bg-slate-50'
        }`}
        onClick={() => navigate(`${buildPath(consoleRole, 'developer-docs')}#doc-external-integration`)}
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
        onClick={() => navigate(buildPath(consoleRole, 'developer-tools'))}
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
      breadcrumbSegments={['开发者中心', '网关集成']}
      description="说明如何调用网关；Key、目录、invoke 预判与闭包试算请在 API Playground 中完成。"
      toolbar={toolbar}
      contentScroll="document"
    >
      <div className="px-4 sm:px-6 pb-10 w-full max-w-5xl flex flex-col gap-6">
        <div
          role="tablist"
          aria-label="网关集成场景"
          className={`flex flex-wrap gap-2 rounded-2xl border p-2 ${isDark ? 'border-white/10 bg-white/[0.02]' : 'border-slate-200 bg-white'}`}
        >
          {GATEWAY_INTEGRATION_TABS.map((t) => {
            const sel = gatewayTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={sel}
                id={`gateway-tab-${t.id}`}
                aria-controls={`gateway-panel-${t.id}`}
                aria-label={`${t.label}。${t.hint}`}
                onClick={() => setGatewayTab(t.id)}
                className={`flex-1 min-w-[140px] rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${
                  sel
                    ? isDark
                      ? 'bg-violet-500/20 text-violet-100 ring-1 ring-violet-500/40'
                      : 'bg-violet-100 text-violet-950 ring-1 ring-violet-300/80'
                    : isDark
                      ? 'text-slate-300 hover:bg-white/5'
                      : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span className={`block font-semibold ${textPrimary(theme)}`}>{t.label}</span>
                <span className={`mt-0.5 block text-[11px] leading-snug ${textMuted(theme)}`}>{t.hint}</span>
              </button>
            );
          })}
        </div>

        {gatewayTab === 'portal-invoke' ? (
          <section
            id="gateway-panel-portal-invoke"
            role="tabpanel"
            aria-labelledby="gateway-tab-portal-invoke"
            className={`rounded-2xl border p-4 space-y-4 ${isDark ? 'border-white/10 bg-white/[0.02]' : 'border-slate-200 bg-white'}`}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <h2 className={`text-sm font-bold ${textPrimary(theme)}`}>外部门户调用（Agent / MCP）</h2>
              <button
                type="button"
                className={btnPrimary}
                onClick={() => navigate(buildPath(consoleRole, 'developer-tools'))}
              >
                <Terminal size={14} className="inline mr-1" aria-hidden />
                去 API Playground 调试
              </button>
            </div>
            <p className={`text-sm leading-relaxed ${textSecondary(theme)}`}>
              五类资源中仅 <strong className={textPrimary(theme)}>Agent</strong> 与 <strong className={textPrimary(theme)}>MCP</strong> 可走{' '}
              <span className="font-mono text-[11px]">POST …/invoke</span>；每次请求只对应一个 <span className="font-mono text-[11px]">resourceType + resourceId</span>。
            </p>
            <p
              className={`text-sm leading-relaxed rounded-xl border px-3 py-2.5 ${
                isDark ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-slate-50/90'
              } ${textSecondary(theme)}`}
            >
              <strong className={textPrimary(theme)}>并不是「把注册中心里所有 Agent/MCP 一次性代过去」</strong>：网关不会按全目录替你批量调用；由<strong className={textPrimary(theme)}>外部门户 / BFF 业务逻辑</strong>决定本次要调哪一个{' '}
              <span className="font-mono text-[11px]">resourceId</span>（例如用户在你们产品里选了某个智能体，对应一个 id）。下方「发现」接口也是针对<strong className={textPrimary(theme)}>一个入口</strong>（<span className="font-mono text-[11px]">entryResourceType + entryResourceId</span>）返回闭包工具表，不是列出全平台目录。若要在控制台里<strong className={textPrimary(theme)}>勾选目录、试算闭包、导出联调 JSON</strong>，请用右上角「API Playground」里的网关调试区。
            </p>
            <div
              className={`rounded-xl border p-3 space-y-2.5 ${
                isDark ? 'border-violet-500/35 bg-violet-500/[0.06]' : 'border-violet-200 bg-violet-50/80'
              }`}
            >
              <p className={`text-xs font-semibold ${isDark ? 'text-violet-200' : 'text-violet-900'}`}>
                BFF 主路径（<span className="font-mono text-[11px]">/sdk/v1/*</span>）
              </p>
              <ol className={`list-decimal list-inside space-y-1.5 text-sm leading-relaxed ${textSecondary(theme)}`}>
                <li>
                  <strong className={textPrimary(theme)}>鉴权</strong>：服务端保存 <span className="font-mono text-[11px]">X-Api-Key</span>，仅服务端转发到网关。
                </li>
                <li>
                  <strong className={textPrimary(theme)}>发现（工具表）</strong>：{' '}
                  <span className="font-mono text-[11px]">GET {apiBaseUrl}/sdk/v1/capabilities/tools</span>
                  ，query 须带<strong className={textPrimary(theme)}>一个</strong>{' '}
                  <span className="font-mono text-[11px]">entryResourceType</span> + <span className="font-mono text-[11px]">entryResourceId</span>：返回从该入口出发的<strong className={textPrimary(theme)}>闭包内</strong>工具聚合，不是全市场列表。
                </li>
                <li>
                  <strong className={textPrimary(theme)}>Agent</strong>：{' '}
                  <span className="font-mono text-[11px]">POST {apiBaseUrl}/sdk/v1/invoke</span>；流式{' '}
                  <span className="font-mono text-[11px]">POST {apiBaseUrl}/sdk/v1/invoke-stream</span>。
                </li>
                <li>
                  <strong className={textPrimary(theme)}>MCP 工具</strong>：JSON-RPC{' '}
                  <span className="font-mono text-[11px]">POST {apiBaseUrl}/mcp/v1/resources/mcp/&lt;mcpResourceId&gt;/message</span>（不经统一 invoke 体）。
                </li>
              </ol>
              <p className={`text-xs leading-relaxed ${textMuted(theme)}`}>
                根路径 <span className="font-mono">POST /invoke</span> 与 <span className="font-mono">POST /sdk/v1/invoke</span> 语义等价；新项目建议统一 <span className="font-mono">/sdk/v1/*</span>。
              </p>
              <p className={`text-xs leading-relaxed ${textMuted(theme)}`}>
                <strong className={textPrimary(theme)}>invoke Agent 时挂载 Skill（可选）</strong>：在 <span className="font-mono text-[11px]">payload</span> /{' '}
                <span className="font-mono text-[11px]">payload._lantu</span> 提供 <span className="font-mono text-[11px]">activeSkillIds</span>；若开启 <span className="font-mono text-[11px]">merge-active-skill-mcps</span>，网关合并 Skill 依赖 MCP 与 Agent 绑定。
              </p>
            </div>
            <p className={`text-xs ${textMuted(theme)}`}>
              参考实现：Nexus 门户 <span className="font-mono">lib/lantu-client.ts</span>（Agent 走 <span className="font-mono">/sdk/v1/invoke</span>，MCP 走 <span className="font-mono">/mcp/v1/…/message</span>）。
            </p>
          </section>
        ) : null}

        {gatewayTab === 'skill-context' ? (
          <section
            id="gateway-panel-skill-context"
            role="tabpanel"
            aria-labelledby="gateway-tab-skill-context"
            className={`rounded-2xl border p-4 space-y-3 ${isDark ? 'border-white/10 bg-white/[0.02]' : 'border-slate-200 bg-white'}`}
          >
            <h2 className={`text-sm font-bold ${textPrimary(theme)}`}>Skill（门户上下文）</h2>
            <p className={`text-sm leading-relaxed ${textSecondary(theme)}`}>
              <strong className={textPrimary(theme)}>Skill</strong> 不可 <span className="font-mono text-[11px]">invoke</span>；用{' '}
              <span className="font-mono text-[11px]">POST …/resolve</span> 拉取上下文与绑定闭包。
            </p>
            <ul className={`list-disc pl-5 space-y-1.5 text-sm ${textSecondary(theme)}`}>
              <li>
                <span className="font-mono text-[11px]">POST {apiBaseUrl}/sdk/v1/resolve</span>（与{' '}
                <span className="font-mono text-[11px]">POST {apiBaseUrl}/catalog/resolve</span> 等价）
              </li>
            </ul>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={btnSecondary(theme)}
                onClick={() => navigate(`${buildPath(consoleRole, 'developer-docs')}#doc-skill-context`)}
              >
                <BookOpen size={14} aria-hidden />
                API 文档 · Context Skill
              </button>
              <button type="button" className={btnSecondary(theme)} onClick={() => navigate(buildPath(consoleRole, 'developer-tools'))}>
                <Terminal size={14} aria-hidden />
                API Playground
              </button>
            </div>
          </section>
        ) : null}

        {gatewayTab === 'app-dataset-mcp' ? (
          <section
            id="gateway-panel-app-dataset-mcp"
            role="tabpanel"
            aria-labelledby="gateway-tab-app-dataset-mcp"
            className={`rounded-2xl border p-4 space-y-3 ${isDark ? 'border-white/10 bg-white/[0.02]' : 'border-slate-200 bg-white'}`}
          >
            <h2 className={`text-sm font-bold ${textPrimary(theme)}`}>App / 数据集（经 MCP）</h2>
            <p className={`text-sm leading-relaxed ${textSecondary(theme)}`}>
              <strong className={textPrimary(theme)}>App</strong> 与 <strong className={textPrimary(theme)}>数据集</strong> 不通过网关 invoke 直连；由 MCP 封装后，按「外部门户调用」中的 MCP 路径消费。
            </p>
            <div className="flex flex-wrap gap-2">
              <button type="button" className={btnSecondary(theme)} onClick={() => navigate(buildPath(consoleRole, 'mcp-market'))}>
                MCP 市场
              </button>
              <button type="button" className={btnSecondary(theme)} onClick={() => navigate(buildPath(consoleRole, 'app-market'))}>
                应用市场
              </button>
              <button type="button" className={btnSecondary(theme)} onClick={() => navigate(buildPath(consoleRole, 'dataset-market'))}>
                数据集市场
              </button>
              <button type="button" className={btnSecondary(theme)} onClick={() => setGatewayTab('portal-invoke')}>
                <ExternalLink size={14} className="inline mr-1" aria-hidden />
                返回 Agent / MCP 调用说明
              </button>
            </div>
          </section>
        ) : null}
      </div>
    </MgmtPageShell>
  );
};
