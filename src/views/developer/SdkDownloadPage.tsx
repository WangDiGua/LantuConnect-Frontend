import React, { useState } from 'react';
import { Download, FileText, Copy, Check, ExternalLink, BookOpen, Terminal } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Theme, FontSize } from '../../types';
import { DEFAULT_API_BASE_PATH, env } from '../../config/env';
import { buildPath } from '../../constants/consoleRoutes';
import { BentoCard } from '../../components/common/BentoCard';
import { Modal } from '../../components/common/Modal';
import {
  canvasBodyBg, btnPrimary, btnSecondary, textPrimary, textSecondary, textMuted,
} from '../../utils/uiClasses';
import { useLayoutChrome } from '../../context/LayoutChromeContext';
import { PageTitleTagline } from '../../components/common/PageTitleTagline';

/** 与后端 SdkGatewayController `/sdk/v1` 一致；实际请求为 `基地址 + /sdk/v1/...`（基地址含 context-path，默认 `/regis`） */
const SDK_V1_ENDPOINTS: { method: string; path: string; note: string }[] = [
  { method: 'GET', path: '/sdk/v1/resources', note: '资源目录分页（query 与目录接口一致）' },
  { method: 'GET', path: '/sdk/v1/resources/{type}/{id}', note: '按类型与 ID 查询详情/解析信息' },
  { method: 'POST', path: '/sdk/v1/resolve', note: '统一解析' },
  { method: 'POST', path: '/sdk/v1/invoke', note: '统一调用（JSON）' },
  { method: 'POST', path: '/sdk/v1/invoke-stream', note: 'MCP 等流式调用（SSE）' },
];

interface SdkRoadmapInfo {
  id: string;
  language: string;
  letter: string;
  color: string;
  name: string;
  description: string;
  plannedCoordinate: string;
}

const SDK_ROADMAP: SdkRoadmapInfo[] = [
  {
    id: 'java',
    language: 'Java',
    letter: 'J',
    color: 'bg-orange-500',
    name: 'Java SDK',
    description: '规划面向 Spring / Maven 的客户端，封装鉴权、超时与重试；发布前请直接调用 HTTPSDK v1。',
    plannedCoordinate: 'com.lantu.connect:lantu-sdk-java（未发布）',
  },
  {
    id: 'python',
    language: 'Python',
    letter: 'P',
    color: 'bg-blue-500',
    name: 'Python SDK',
    description: '规划同步与 asyncio 客户端；当前可用 requests/httpx 对接 /sdk/v1。',
    plannedCoordinate: 'PyPI 包名待定（未发布）',
  },
  {
    id: 'javascript',
    language: 'JavaScript',
    letter: 'JS',
    color: 'bg-yellow-500',
    name: 'JavaScript / Node.js SDK',
    description: '规划浏览器与 Node 共用模块；下方「快速开始」已给出与生产一致的 fetch 示例。',
    plannedCoordinate: 'npm @lantu/sdk 或 scoped 包（未发布）',
  },
  {
    id: 'go',
    language: 'Go',
    letter: 'Go',
    color: 'bg-cyan-500',
    name: 'Go SDK',
    description: '规划 Go module 封装；当前可用 net/http 调用 REST。',
    plannedCoordinate: 'github.com/lantuconnect/sdk-go（未发布）',
  },
];

const QUICK_START_FETCH = `// 与控制台使用相同 API 基地址（默认 ${DEFAULT_API_BASE_PATH}，见 VITE_API_BASE_URL）
const baseUrl = import.meta.env.VITE_API_BASE_URL || '${DEFAULT_API_BASE_PATH}';

async function sdkInvoke(apiKey, body) {
  const res = await fetch(\`\${baseUrl}/sdk/v1/invoke\`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': apiKey, // 须为创建 API Key 接口返回的完整 secretPlain
      // 'X-User-Id': '123',   // 可选
      // 'X-Trace-Id': '...', // 可选，不传则由服务端生成
    },
    body: JSON.stringify({
      resourceType: 'agent',
      resourceId: '1',
      version: undefined,
      timeoutSec: 30,
      payload: { input: '你好' },
    }),
  });
  const json = await res.json();
  if (json.code !== 0) throw new Error(json.message || 'invoke failed');
  return json.data;
}

const data = await sdkInvoke('sk_your_full_secret_here', {});
console.log(data);`;

const QUICK_START_CURL = `# 请将 BASE 替换为 API 根路径（如 https://host${DEFAULT_API_BASE_PATH}），KEY 为完整 X-Api-Key
curl -sS -X POST "$BASE/sdk/v1/invoke" \\
  -H "Content-Type: application/json" \\
  -H "X-Api-Key: $KEY" \\
  -d '{"resourceType":"agent","resourceId":"1","payload":{"input":"你好"}}'`;

function CopyBtn({ text, isDark }: { text: string; isDark: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <button type="button" onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }} className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-colors ${isDark ? 'hover:bg-white/10 text-slate-400' : 'hover:bg-slate-200 text-slate-500'}`} title="复制">
      {copied ? <><Check size={12} className="text-emerald-500" /> 已复制</> : <><Copy size={12} /> 复制</>}
    </button>
  );
}

export interface SdkDownloadPageProps { theme: Theme; fontSize: FontSize; }

export const SdkDownloadPage: React.FC<SdkDownloadPageProps> = ({ theme }) => {
  const { chromePageTitle } = useLayoutChrome();
  const isDark = theme === 'dark';
  const navigate = useNavigate();
  const [roadmapModal, setRoadmapModal] = useState<SdkRoadmapInfo | null>(null);
  const [quickTab, setQuickTab] = useState<'fetch' | 'curl'>('fetch');

  const apiBaseHint = env.VITE_API_BASE_URL;

  return (
    <div className={`flex-1 flex flex-col min-h-0 overflow-hidden transition-colors duration-300 ${canvasBodyBg(theme)}`}>
      <div className="w-full flex-1 min-h-0 overflow-y-auto px-2 sm:px-3 lg:px-4 py-2 sm:py-3 space-y-4">
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex min-w-0 items-center gap-3">
            <div className={`shrink-0 rounded-xl p-2 ${isDark ? 'bg-emerald-500/15' : 'bg-emerald-50'}`}>
              <Download size={20} className={isDark ? 'text-emerald-400' : 'text-emerald-700'} />
            </div>
            <PageTitleTagline
              subtitleOnly
              theme={theme}
              title={chromePageTitle || 'SDK 与集成'}
              tagline="后端 SDK v1 HTTP 网关已就绪；多语言封装包规划中"
            />
          </div>
        </div>

        <div
          className={`rounded-2xl border px-4 py-3 text-sm leading-relaxed ${
            isDark ? 'border-white/[0.08] bg-white/[0.03]' : 'border-slate-200 bg-white'
          }`}
        >
          <div className="flex items-start gap-2">
            <BookOpen size={18} className={`mt-0.5 shrink-0 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
            <div>
              <p className={`font-semibold ${textPrimary(theme)}`}>SDK v1 网关（与业务网关同源能力）</p>
              <p className={`mt-1 text-xs ${textSecondary(theme)}`}>
                所有路径挂在本应用的 API 前缀下，例如完整路径形如
                <code className={`mx-1 rounded px-1 font-mono text-[11px] ${isDark ? 'bg-white/10' : 'bg-slate-100'}`}>{`${apiBaseHint}/sdk/v1/invoke`}</code>
                。每个请求须携带请求头
                <code className={`mx-1 rounded px-1 font-mono text-[11px] ${isDark ? 'bg-white/10' : 'bg-slate-100'}`}>X-Api-Key</code>
                （创建个人/管理 Key 时返回的完整密钥，见接入指南）。返回体统一为
                <code className={`mx-1 rounded px-1 font-mono text-[11px] ${isDark ? 'bg-white/10' : 'bg-slate-100'}`}>code / data / message</code>
                ，成功时一般为 <code className="font-mono text-[11px]">code === 0</code>。
              </p>
            </div>
          </div>
        </div>

        <BentoCard theme={theme}>
          <h2 className={`font-bold text-sm mb-3 flex items-center gap-2 ${textPrimary(theme)}`}>
            <Terminal size={16} /> SDK v1 路由一览
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className={`border-b ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
                  <th className={`py-2 pr-3 font-semibold ${textMuted(theme)}`}>方法</th>
                  <th className={`py-2 pr-3 font-semibold ${textMuted(theme)}`}>路径</th>
                  <th className={`py-2 font-semibold ${textMuted(theme)}`}>说明</th>
                </tr>
              </thead>
              <tbody className={textSecondary(theme)}>
                {SDK_V1_ENDPOINTS.map((row) => (
                  <tr key={`${row.method}-${row.path}`} className={`border-t ${isDark ? 'border-white/[0.06]' : 'border-slate-100'}`}>
                    <td className="py-2 pr-3 font-mono whitespace-nowrap">{row.method}</td>
                    <td className="py-2 pr-3 font-mono whitespace-nowrap">{row.path}</td>
                    <td className="py-2">{row.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </BentoCard>

        <BentoCard theme={theme}>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <ExternalLink size={18} className={isDark ? 'text-slate-300' : 'text-slate-800'} />
            <h2 className={`font-bold ${textPrimary(theme)}`}>快速开始</h2>
            <div className={`ml-auto flex rounded-lg p-0.5 text-xs ${isDark ? 'bg-white/10' : 'bg-slate-200/80'}`}>
              <button type="button" onClick={() => setQuickTab('fetch')} className={`rounded-md px-3 py-1.5 font-medium ${quickTab === 'fetch' ? (isDark ? 'bg-white/15 text-white' : 'bg-white shadow-sm') : (isDark ? 'text-slate-400' : 'text-slate-600')}`}>fetch (浏览器/Node)</button>
              <button type="button" onClick={() => setQuickTab('curl')} className={`rounded-md px-3 py-1.5 font-medium ${quickTab === 'curl' ? (isDark ? 'bg-white/15 text-white' : 'bg-white shadow-sm') : (isDark ? 'text-slate-400' : 'text-slate-600')}`}>curl</button>
            </div>
          </div>
          <div className="relative">
            <div className="absolute top-3 right-3 z-10">
              <CopyBtn text={quickTab === 'fetch' ? QUICK_START_FETCH : QUICK_START_CURL} isDark={isDark} />
            </div>
            <pre className={`text-xs font-mono p-4 pt-10 rounded-xl overflow-x-auto leading-relaxed ${isDark ? 'bg-black/40 text-slate-300' : 'bg-slate-900 text-slate-300'}`}>
              {quickTab === 'fetch' ? QUICK_START_FETCH : QUICK_START_CURL}
            </pre>
          </div>
          <p className={`mt-3 text-xs ${textMuted(theme)}`}>流式接口 <span className="font-mono">POST /sdk/v1/invoke-stream</span> 请使用支持 SSE 的客户端；字段与 invoke 请求体一致。</p>
        </BentoCard>

        <div>
          <h2 className={`text-sm font-bold mb-2 px-1 ${textPrimary(theme)}`}>多语言客户端（规划）</h2>
          <p className={`text-xs mb-3 px-1 ${textSecondary(theme)}`}>以下为与 LantuConnect 品牌对齐的发布计划说明；包未上传至中央仓库前，请使用上方 HTTP 方式集成。</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {SDK_ROADMAP.map((sdk) => (
              <BentoCard key={sdk.id} theme={theme} hover glow="indigo" className="flex flex-col">
                <div className="flex items-start gap-4 mb-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-sm shrink-0 ${sdk.color}`}>{sdk.letter}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className={`font-bold ${textPrimary(theme)}`}>{sdk.name}</h3>
                      <span className={`text-[10px] px-2 py-0.5 rounded-md font-semibold uppercase ${isDark ? 'bg-amber-500/20 text-amber-300' : 'bg-amber-100 text-amber-800'}`}>规划中</span>
                    </div>
                    <p className={`text-xs mt-1 leading-relaxed ${textMuted(theme)}`}>{sdk.description}</p>
                  </div>
                </div>
                <div className="flex-1">
                  <span className={`text-xs font-semibold uppercase tracking-wider ${textMuted(theme)}`}>计划坐标 / 备注</span>
                  <pre className={`text-xs font-mono mt-1.5 p-3 rounded-xl overflow-x-auto ${isDark ? 'bg-black/30 text-slate-400' : 'bg-slate-100 text-slate-700'}`}>{sdk.plannedCoordinate}</pre>
                </div>
                <div className={`flex items-center gap-2 mt-4 pt-3 border-t border-dashed ${isDark ? 'border-white/[0.06]' : 'border-slate-200'}`}>
                  <button type="button" onClick={() => setRoadmapModal(sdk)} className={btnSecondary(theme)}><FileText size={14} /> 说明</button>
                  <button type="button" onClick={() => navigate(buildPath('user', 'api-docs'))} className={btnSecondary(theme)}><BookOpen size={14} /> 接入指南</button>
                  <button type="button" onClick={() => navigate(buildPath('user', 'api-playground'))} className={btnPrimary}><Terminal size={14} /> API 调试</button>
                </div>
              </BentoCard>
            ))}
          </div>
        </div>
      </div>

      <Modal open={!!roadmapModal} onClose={() => setRoadmapModal(null)} title={roadmapModal ? `${roadmapModal.name}` : ''} theme={theme} size="sm" footer={<button type="button" className={btnSecondary(theme)} onClick={() => setRoadmapModal(null)}>关闭</button>}>
        {roadmapModal && (
          <div className={`space-y-3 text-sm ${textSecondary(theme)}`}>
            <p>官方 {roadmapModal.language} 客户端发布后，将在此页更新安装命令与版本号。当前生产集成请以 <strong className={textPrimary(theme)}>SDK v1 HTTP 接口</strong> 为准，行为与统一网关一致，路径前缀固定为 <span className="font-mono text-xs">/sdk/v1</span>。</p>
            <p className="text-xs">计划坐标：<span className="font-mono">{roadmapModal.plannedCoordinate}</span></p>
          </div>
        )}
      </Modal>
    </div>
  );
};
