import React, { useState } from 'react';
import { Download, FileText, Copy, Check, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Theme, FontSize } from '../../types';
import { buildPath } from '../../constants/consoleRoutes';
import { BentoCard } from '../../components/common/BentoCard';
import { Modal } from '../../components/common/Modal';
import {
  canvasBodyBg, btnPrimary, btnSecondary, textPrimary, textSecondary, textMuted,
} from '../../utils/uiClasses';
import { useLayoutChrome } from '../../context/LayoutChromeContext';
import { PageTitleTagline } from '../../components/common/PageTitleTagline';

interface SdkInfo { id: string; language: string; letter: string; color: string; name: string; version: string; badge?: string; description: string; installCmd: string; }

const SDK_LIST: SdkInfo[] = [
  { id: 'java', language: 'Java', letter: 'J', color: 'bg-orange-500', name: 'Java SDK', version: '1.0.0', badge: '推荐', description: '适用于 Spring Boot / Maven 项目，支持同步和异步调用，内置连接池和重试机制。', installCmd: `<!-- Maven -->\n<dependency>\n  <groupId>com.nexusai</groupId>\n  <artifactId>nexus-sdk-java</artifactId>\n  <version>1.0.0</version>\n</dependency>` },
  { id: 'python', language: 'Python', letter: 'P', color: 'bg-blue-500', name: 'Python SDK', version: '1.0.0', description: '支持 Python 3.8+，提供同步和 asyncio 两种调用方式。', installCmd: 'pip install nexusai' },
  { id: 'javascript', language: 'JavaScript', letter: 'JS', color: 'bg-yellow-500', name: 'JavaScript/Node.js SDK', version: '1.0.0', description: '支持 Node.js 16+ 和浏览器环境，TypeScript 类型完备。', installCmd: 'npm install @nexusai/sdk' },
  { id: 'go', language: 'Go', letter: 'Go', color: 'bg-cyan-500', name: 'Go SDK', version: '0.9.0', badge: 'Beta', description: '支持 Go 1.20+，提供 context 原生支持，并发安全。', installCmd: 'go get github.com/nexusai/sdk-go@v0.9.0' },
];

const QUICK_START_CODE = `import { NexusClient } from '@nexusai/sdk';

const client = new NexusClient({
  baseUrl: 'https://api.nexus-ai.edu.cn/api',
  apiKey: 'your_api_key_here',
});

const result = await client.invoke({
  resourceType: 'agent',
  resourceId: '1',
  payload: { input: '帮我查询本学期课表' },
});

console.log(result.data.body);`;

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
  const [downloadSdk, setDownloadSdk] = useState<SdkInfo | null>(null);

  return (
    <div className={`flex-1 flex flex-col min-h-0 overflow-hidden transition-colors duration-300 ${canvasBodyBg(theme)}`}>
      <div className="w-full flex-1 min-h-0 overflow-y-auto px-2 sm:px-3 lg:px-4 py-2 sm:py-3 space-y-4">
        {/* Header */}
        <div className="flex min-w-0 items-center gap-3">
          <div className={`shrink-0 rounded-xl p-2 ${isDark ? 'bg-neutral-900/10' : 'bg-neutral-100'}`}>
            <Download size={20} className={isDark ? 'text-neutral-300' : 'text-neutral-900'} />
          </div>
          <PageTitleTagline subtitleOnly theme={theme} title={chromePageTitle || 'SDK 下载'} tagline="选择适合你的语言 SDK，快速集成" />
        </div>

        {/* SDK Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {SDK_LIST.map((sdk) => (
            <BentoCard key={sdk.id} theme={theme} hover glow="indigo" className="flex flex-col">
              <div className="flex items-start gap-4 mb-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-sm shrink-0 ${sdk.color}`}>{sdk.letter}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className={`font-bold ${textPrimary(theme)}`}>{sdk.name}</h3>
                    <span className={`text-[11px] px-2 py-0.5 rounded-md font-medium ${isDark ? 'bg-white/10 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>v{sdk.version}</span>
                    {sdk.badge && (
                      <span className={`text-xs px-2 py-0.5 rounded-md font-bold ${sdk.badge === '推荐' ? (isDark ? 'bg-emerald-500/15 text-emerald-400' : 'bg-emerald-50 text-emerald-700') : (isDark ? 'bg-amber-500/15 text-amber-400' : 'bg-amber-50 text-amber-700')}`}>{sdk.badge}</span>
                    )}
                  </div>
                  <p className={`text-xs mt-1 leading-relaxed ${textMuted(theme)}`}>{sdk.description}</p>
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1.5">
                  <span className={`text-xs font-semibold uppercase tracking-wider ${textMuted(theme)}`}>安装命令</span>
                  <CopyBtn text={sdk.installCmd} isDark={isDark} />
                </div>
                <pre className={`text-xs font-mono p-3 rounded-xl overflow-x-auto ${isDark ? 'bg-black/40 text-slate-300' : 'bg-slate-900 text-slate-300'}`}>{sdk.installCmd}</pre>
              </div>
              <div className={`flex items-center gap-2 mt-4 pt-3 border-t border-dashed ${isDark ? 'border-white/[0.06]' : 'border-slate-200'}`}>
                <button type="button" onClick={() => setDownloadSdk(sdk)} className={btnPrimary}><Download size={14} /> 下载</button>
                <button type="button" onClick={() => navigate(buildPath('user', 'api-docs'))} className={btnSecondary(theme)}><FileText size={14} /> 文档</button>
                <button type="button" onClick={() => navigate(buildPath('user', 'api-playground'))} className={btnSecondary(theme)}>调试 resolve/invoke</button>
              </div>
            </BentoCard>
          ))}
        </div>

        {/* Quick Start */}
        <BentoCard theme={theme}>
          <div className="flex items-center gap-2 mb-4">
            <ExternalLink size={18} className={isDark ? 'text-neutral-300' : 'text-neutral-900'} />
            <h2 className={`font-bold ${textPrimary(theme)}`}>快速开始</h2>
            <span className={`text-xs ${textMuted(theme)}`}>— 以 JavaScript SDK 为例</span>
          </div>
          <div className="relative">
            <div className="absolute top-3 right-3 z-10"><CopyBtn text={QUICK_START_CODE} isDark={isDark} /></div>
            <pre className={`text-xs font-mono p-4 rounded-xl overflow-x-auto leading-relaxed ${isDark ? 'bg-black/40 text-slate-300' : 'bg-slate-900 text-slate-300'}`}>{QUICK_START_CODE}</pre>
          </div>
        </BentoCard>
      </div>

      {/* Download Modal */}
      <Modal open={!!downloadSdk} onClose={() => setDownloadSdk(null)} title={downloadSdk ? `${downloadSdk.name} v${downloadSdk.version}` : ''} theme={theme} size="sm" footer={<button type="button" className={btnSecondary(theme)} onClick={() => setDownloadSdk(null)}>关闭</button>}>
        {downloadSdk && (
          <>
            <p className={`text-sm mb-4 ${textSecondary(theme)}`}>SDK 包尚未发布，请通过包管理器安装：</p>
            <div className="relative">
              <pre className={`text-xs font-mono p-4 rounded-xl overflow-x-auto ${isDark ? 'bg-black/40 text-slate-300' : 'bg-slate-900 text-slate-300'}`}>{downloadSdk.installCmd}</pre>
              <div className="absolute top-2 right-2"><CopyBtn text={downloadSdk.installCmd} isDark={isDark} /></div>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
};
