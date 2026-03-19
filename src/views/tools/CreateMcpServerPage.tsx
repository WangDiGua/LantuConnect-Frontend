import React, { useState } from 'react';
import { Plus, Copy, Check } from 'lucide-react';
import { Theme, FontSize } from '../../types';
import { MgmtPageShell } from '../userMgmt/MgmtPageShell';
import { nativeInputClass, nativeSelectClass } from '../../utils/formFieldClasses';

interface CreateMcpServerPageProps {
  theme: Theme;
  fontSize: FontSize;
  showMessage: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const CreateMcpServerPage: React.FC<CreateMcpServerPageProps> = ({
  theme,
  fontSize,
  showMessage,
}) => {
  const isDark = theme === 'dark';
  const [displayName, setDisplayName] = useState('');
  const [transport, setTransport] = useState('stdio');
  const [command, setCommand] = useState('npx');
  const [args, setArgs] = useState('-y @modelcontextprotocol/server-filesystem /data');
  const [envJson, setEnvJson] = useState('{\n  "API_KEY": ""\n}');
  const [generated, setGenerated] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const generate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      showMessage('请填写显示名称', 'error');
      return;
    }
    const slug = displayName.trim().toLowerCase().replace(/\s+/g, '-');
    const cfg = {
      name: displayName.trim(),
      slug,
      transport,
      command: transport === 'stdio' ? command : undefined,
      args: transport === 'stdio' ? args.split(/\s+/).filter(Boolean) : undefined,
      env: (() => {
        try {
          return JSON.parse(envJson || '{}');
        } catch {
          return {};
        }
      })(),
    };
    setGenerated(JSON.stringify(cfg, null, 2));
    showMessage('已生成配置草稿（演示）', 'success');
  };

  const copyCfg = async () => {
    if (!generated) return;
    try {
      await navigator.clipboard.writeText(generated);
      setCopied(true);
      showMessage('已复制', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showMessage('复制失败', 'error');
    }
  };

  return (
    <MgmtPageShell
      theme={theme}
      fontSize={fontSize}
      breadcrumbSegments={['工具广场', '创建 MCP Server']}
      titleIcon={Plus}
      description="填写运行参数，生成可导入到运行时的 MCP 配置（演示，不落库）"
    >
      <div className="min-w-0 px-4 sm:px-6 pb-6 pt-1">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl">
          <form onSubmit={generate} className="space-y-4">
            <div>
              <label className={`block text-xs font-semibold mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                显示名称
              </label>
              <input
                className={nativeInputClass(theme)}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="校园地图 MCP"
              />
            </div>
            <div>
              <label className={`block text-xs font-semibold mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                传输
              </label>
              <select className={nativeSelectClass(theme)} value={transport} onChange={(e) => setTransport(e.target.value)}>
                <option value="stdio">stdio（本地子进程）</option>
                <option value="sse">SSE（远程）</option>
                <option value="streamable-http">Streamable HTTP</option>
              </select>
            </div>
            {transport === 'stdio' && (
              <>
                <div>
                  <label className={`block text-xs font-semibold mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    启动命令
                  </label>
                  <input className={nativeInputClass(theme)} value={command} onChange={(e) => setCommand(e.target.value)} />
                </div>
                <div>
                  <label className={`block text-xs font-semibold mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    参数（空格分隔）
                  </label>
                  <input className={nativeInputClass(theme)} value={args} onChange={(e) => setArgs(e.target.value)} />
                </div>
              </>
            )}
            <div>
              <label className={`block text-xs font-semibold mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                环境变量 JSON
              </label>
              <textarea
                className={`${nativeInputClass(theme)} min-h-[120px] font-mono text-xs`}
                value={envJson}
                onChange={(e) => setEnvJson(e.target.value)}
              />
            </div>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
            >
              生成配置
            </button>
          </form>

          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className={`text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>JSON 预览</span>
              {generated && (
                <button
                  type="button"
                  onClick={copyCfg}
                  className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg ${
                    isDark ? 'hover:bg-white/10 text-slate-300' : 'hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? '已复制' : '复制'}
                </button>
              )}
            </div>
            <pre
              className={`rounded-2xl border p-4 text-xs font-mono overflow-auto max-h-[420px] ${
                isDark ? 'border-white/10 bg-black/30 text-slate-300' : 'border-slate-200 bg-slate-50 text-slate-800'
              }`}
            >
              {generated ?? '// 填写左侧表单后点击「生成配置」'}
            </pre>
          </div>
        </div>
      </div>
    </MgmtPageShell>
  );
};
