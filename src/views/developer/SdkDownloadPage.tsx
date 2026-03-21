import React, { useState } from 'react';
import { Download, FileText, Copy, Check, ExternalLink } from 'lucide-react';
import { Theme, FontSize } from '../../types';

interface SdkInfo {
  id: string;
  language: string;
  letter: string;
  color: string;
  darkColor: string;
  name: string;
  version: string;
  badge?: string;
  description: string;
  installCmd: string;
}

const SDK_LIST: SdkInfo[] = [
  {
    id: 'java',
    language: 'Java',
    letter: 'J',
    color: 'bg-orange-500',
    darkColor: 'bg-orange-600',
    name: 'Java SDK',
    version: '1.0.0',
    badge: '推荐',
    description: '适用于 Spring Boot / Maven 项目，支持同步和异步调用，内置连接池和重试机制。',
    installCmd: `<!-- Maven -->
<dependency>
  <groupId>com.lantuconnect</groupId>
  <artifactId>lantu-sdk-java</artifactId>
  <version>1.0.0</version>
</dependency>`,
  },
  {
    id: 'python',
    language: 'Python',
    letter: 'P',
    color: 'bg-blue-500',
    darkColor: 'bg-blue-600',
    name: 'Python SDK',
    version: '1.0.0',
    description: '支持 Python 3.8+，提供同步和 asyncio 两种调用方式，兼容 FastAPI、Django。',
    installCmd: 'pip install lantuconnect',
  },
  {
    id: 'javascript',
    language: 'JavaScript',
    letter: 'JS',
    color: 'bg-yellow-500',
    darkColor: 'bg-yellow-600',
    name: 'JavaScript/Node.js SDK',
    version: '1.0.0',
    description: '支持 Node.js 16+ 和浏览器环境，TypeScript 类型完备，支持 ESM 和 CJS。',
    installCmd: 'npm install @lantuconnect/sdk',
  },
  {
    id: 'go',
    language: 'Go',
    letter: 'Go',
    color: 'bg-cyan-500',
    darkColor: 'bg-cyan-600',
    name: 'Go SDK',
    version: '0.9.0',
    badge: 'Beta',
    description: '支持 Go 1.20+，提供 context 原生支持，并发安全，适合微服务场景。',
    installCmd: 'go get github.com/lantuconnect/sdk-go@v0.9.0',
  },
];

const QUICK_START_CODE = `import { LantuClient } from '@lantuconnect/sdk';

const client = new LantuClient({
  baseUrl: 'https://api.lantuconnect.edu.cn/api/v1',
  apiKey: 'your_api_key_here',
});

// 调用 Agent
const result = await client.agents.invoke(1, {
  input: '帮我查询本学期课表',
  stream: false,
});

console.log(result.data.output);
// => "您本学期共选修 6 门课程..."`;

function CopyBtn({ text, isDark }: { text: string; isDark: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-colors ${
        isDark ? 'hover:bg-white/10 text-slate-400' : 'hover:bg-slate-200 text-slate-500'
      }`}
      title="复制"
    >
      {copied ? <><Check size={12} className="text-emerald-500" /> 已复制</> : <><Copy size={12} /> 复制</>}
    </button>
  );
}

export interface SdkDownloadPageProps {
  theme: Theme;
  fontSize: FontSize;
}

export const SdkDownloadPage: React.FC<SdkDownloadPageProps> = ({ theme, fontSize }) => {
  const isDark = theme === 'dark';

  return (
    <div className={`flex-1 flex flex-col min-h-0 overflow-hidden ${isDark ? 'bg-[#000000]' : 'bg-[#F2F2F7]'}`}>
      <div className="w-full flex-1 min-h-0 flex flex-col px-2 sm:px-3 lg:px-4 py-2 sm:py-3 overflow-y-auto custom-scrollbar">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4 shrink-0">
          <div className={`p-2 rounded-xl ${isDark ? 'bg-white/10' : 'bg-white border border-slate-200/80'}`}>
            <Download size={22} className="text-violet-500" />
          </div>
          <div>
            <h1 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>SDK 下载</h1>
            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              选择适合你的语言 SDK，快速集成 LantuConnect 开放接口
            </p>
          </div>
        </div>

        {/* SDK Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {SDK_LIST.map((sdk) => (
            <div
              key={sdk.id}
              className={`rounded-2xl border p-5 flex flex-col transition-colors ${
                isDark ? 'bg-[#1C1C1E] border-white/10 hover:border-white/20' : 'bg-white border-slate-200/80 hover:border-slate-300'
              }`}
            >
              {/* Icon + Name */}
              <div className="flex items-start gap-4 mb-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-sm shrink-0 ${sdk.color}`}>
                  {sdk.letter}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className={`font-bold ${fontSize === 'small' ? 'text-sm' : 'text-base'} ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {sdk.name}
                    </h3>
                    <span className={`text-[11px] px-2 py-0.5 rounded-md font-medium ${isDark ? 'bg-white/10 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                      v{sdk.version}
                    </span>
                    {sdk.badge && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${
                        sdk.badge === '推荐'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'
                      } ${isDark ? (sdk.badge === '推荐' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400') : ''}`}>
                        {sdk.badge}
                      </span>
                    )}
                  </div>
                  <p className={`text-xs mt-1 leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    {sdk.description}
                  </p>
                </div>
              </div>

              {/* Install command */}
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1.5">
                  <span className={`text-[10px] font-semibold uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                    安装命令
                  </span>
                  <CopyBtn text={sdk.installCmd} isDark={isDark} />
                </div>
                <pre className={`text-xs font-mono p-3 rounded-xl overflow-x-auto ${isDark ? 'bg-black/40 text-slate-300' : 'bg-slate-900 text-slate-300'}`}>
                  {sdk.installCmd}
                </pre>
              </div>

              {/* Buttons */}
              <div className="flex items-center gap-2 mt-4 pt-3 border-t border-dashed ${isDark ? 'border-white/10' : 'border-slate-200'}">
                <button
                  type="button"
                  onClick={() => alert(`下载 ${sdk.name} v${sdk.version}（演示）`)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                >
                  <Download size={14} />
                  下载
                </button>
                <button
                  type="button"
                  onClick={() => alert(`打开 ${sdk.name} 文档（演示）`)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
                    isDark ? 'bg-white/10 text-slate-300 hover:bg-white/15' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <FileText size={14} />
                  文档
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Start */}
        <div className={`rounded-2xl border p-6 ${isDark ? 'bg-[#1C1C1E] border-white/10' : 'bg-white border-slate-200/80'}`}>
          <div className="flex items-center gap-2 mb-4">
            <ExternalLink size={18} className="text-blue-500" />
            <h2 className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>快速开始</h2>
            <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>— 以 JavaScript SDK 为例</span>
          </div>
          <div className="relative">
            <div className="absolute top-3 right-3 z-10">
              <CopyBtn text={QUICK_START_CODE} isDark={isDark} />
            </div>
            <pre className={`text-xs font-mono p-4 rounded-xl overflow-x-auto leading-relaxed ${isDark ? 'bg-black/40 text-slate-300' : 'bg-slate-900 text-slate-300'}`}>
              {QUICK_START_CODE}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
