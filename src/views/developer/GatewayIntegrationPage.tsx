import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { BookOpen, ExternalLink, Puzzle, Terminal } from 'lucide-react';
import type { Theme, FontSize } from '../../types';
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

export interface GatewayIntegrationQuickLinksToolbarProps {
  theme: Theme;
}

/** 接入指南锚点 + 回到同页 Playground；供「调试与网关」hub 与独立网关页共用 */
export const GatewayIntegrationQuickLinksToolbar: React.FC<GatewayIntegrationQuickLinksToolbarProps> = ({ theme }) => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { platformRole } = useUserRole();
  const routePage = parseRoute(pathname)?.page ?? '';
  const consoleRole: ConsoleRole = inferConsoleRole(routePage, platformRole);
  const isDark = theme === 'dark';
  const chip = `inline-flex min-h-9 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium ${
    isDark ? 'border-white/12 text-slate-300 hover:bg-white/[0.06]' : 'border-slate-200/90 text-slate-600 hover:bg-slate-50'
  }`;
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <button
        type="button"
        className={chip}
        onClick={() => navigate(`${buildPath(consoleRole, 'developer-docs')}#doc-gateway-bff-sdk`)}
        aria-label="打开接入指南 BFF 与 SDK 路径"
      >
        <BookOpen size={14} className="shrink-0 opacity-85" aria-hidden />
        接入指南
      </button>
      <button type="button" className={chip} onClick={() => navigate(buildPath(consoleRole, 'developer-tools'))} aria-label="打开 API Playground">
        <Terminal size={14} className="shrink-0 opacity-85" aria-hidden />
        Playground
      </button>
    </div>
  );
};

export interface GatewayIntegrationPageProps {
  theme: Theme;
  fontSize: FontSize;
  /** 嵌入「调试与网关」hub：不包 MgmtPageShell */
  embedInHub?: boolean;
}

export const GatewayIntegrationPage: React.FC<GatewayIntegrationPageProps> = ({ theme, fontSize, embedInHub = false }) => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { platformRole } = useUserRole();
  const routePage = parseRoute(pathname)?.page ?? '';
  const consoleRole: ConsoleRole = inferConsoleRole(routePage, platformRole);
  const isDark = theme === 'dark';
  const [gatewayTab, setGatewayTab] = useState<GatewayIntegrationTabId>('portal-invoke');

  const toolbar = <GatewayIntegrationQuickLinksToolbar theme={theme} />;

  const mainContent = (
      <div className="flex w-full min-w-0 flex-col gap-6 px-4 pb-10 sm:px-6 lg:px-8">
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
              仅 <strong className={textPrimary(theme)}>Agent</strong> 与 <strong className={textPrimary(theme)}>MCP</strong> 可走{' '}
              <span className="font-mono text-[11px]">POST …/invoke</span>；一次请求对应一个资源。Key 放在服务端，由 BFF 转发，不要塞进浏览器。
            </p>
            <p className={`text-sm leading-relaxed ${textMuted(theme)}`}>
              发现工具表、invoke、MCP 消息路径、Skill 挂载与示例代码见接入指南「BFF 与 SDK 路径」。
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={btnSecondary(theme)}
                onClick={() => navigate(`${buildPath(consoleRole, 'developer-docs')}#doc-gateway-bff-sdk`)}
              >
                <BookOpen size={14} className="inline mr-1" aria-hidden />
                接入指南 · BFF 与 SDK
              </button>
            </div>
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
              <span className="font-mono text-[11px]">POST …/resolve</span> 拉上下文与闭包（<span className="font-mono text-[11px]">/sdk/v1/resolve</span> 与{' '}
              <span className="font-mono text-[11px]">/catalog/resolve</span> 等价）。细节见下方文档链接。
            </p>
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
  );

  if (embedInHub) {
    return mainContent;
  }

  return (
    <MgmtPageShell
      theme={theme}
      fontSize={fontSize}
      titleIcon={Puzzle}
      breadcrumbSegments={['开发者中心', '网关集成']}
      description="场景说明见接入指南；选 Key、试闭包与导出请在 Playground。"
      toolbar={toolbar}
      contentScroll="document"
    >
      {mainContent}
    </MgmtPageShell>
  );
};
