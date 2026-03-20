import React, { useState } from 'react';
import { Plus, Copy, Check, Loader2 } from 'lucide-react';
import { Theme, FontSize } from '../../types';
import { MgmtPageShell } from '../userMgmt/MgmtPageShell';
import { nativeInputClass, nativeSelectClass } from '../../utils/formFieldClasses';
import { useCreateMcpServer } from '../../hooks/queries/useTool';
import { createMcpServerSchema } from '../../schemas/tool.schema';

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
  const [description, setDescription] = useState('');
  const [transport, setTransport] = useState<'stdio' | 'sse' | 'streamable-http'>('stdio');
  const [command, setCommand] = useState('npx');
  const [args, setArgs] = useState('-y @modelcontextprotocol/server-filesystem /data');
  const [envJson, setEnvJson] = useState('{\n  "API_KEY": ""\n}');
  const [generated, setGenerated] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const createMut = useCreateMcpServer();

  const generate = (e: React.FormEvent) => {
    e.preventDefault();

    const result = createMcpServerSchema.safeParse({
      name: displayName.trim(),
      description: description.trim() || displayName.trim(),
      transportType: transport,
      command: transport === 'stdio' ? command : undefined,
      args: transport === 'stdio' ? args.split(/\s+/).filter(Boolean) : undefined,
      url: transport !== 'stdio' ? '' : undefined,
    });

    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((err) => { fieldErrors[String(err.path[0])] = err.message; });
      setErrors(fieldErrors);
      return;
    }
    setErrors({});

    createMut.mutate(result.data, {
      onSuccess: (server) => {
        const cfg = {
          id: server.id,
          name: server.name,
          transport: server.transportType,
          command: server.command,
          args: server.args,
          env: (() => { try { return JSON.parse(envJson || '{}'); } catch { return {}; } })(),
        };
        setGenerated(JSON.stringify(cfg, null, 2));
        showMessage('MCP Server 已创建', 'success');
      },
      onError: (err) => {
        setErrors({ submit: err instanceof Error ? err.message : '创建失败' });
        showMessage(err instanceof Error ? err.message : '创建失败', 'error');
      },
    });
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
      description="填写运行参数，创建 MCP Server 配置"
    >
      <div className="min-w-0 px-4 sm:px-6 pb-6 pt-1">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl">
          <form onSubmit={generate} className="space-y-4">
            <div>
              <label className={`block text-xs font-semibold mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                显示名称
              </label>
              <input
                className={`${nativeInputClass(theme)} ${errors.name ? 'border-error' : ''}`}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="校园地图 MCP"
              />
              {errors.name && <p className="text-xs text-error mt-1">{errors.name}</p>}
            </div>
            <div>
              <label className={`block text-xs font-semibold mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                描述
              </label>
              <input
                className={`${nativeInputClass(theme)} ${errors.description ? 'border-error' : ''}`}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="提供校园地图查询能力"
              />
              {errors.description && <p className="text-xs text-error mt-1">{errors.description}</p>}
            </div>
            <div>
              <label className={`block text-xs font-semibold mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                传输
              </label>
              <select className={nativeSelectClass(theme)} value={transport} onChange={(e) => setTransport(e.target.value as typeof transport)}>
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
            {errors.submit && <p className="text-sm text-error">{errors.submit}</p>}
            <button
              type="submit"
              disabled={createMut.isPending}
              className="px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 inline-flex items-center gap-2"
            >
              {createMut.isPending && <Loader2 size={16} className="animate-spin" />}
              创建并生成配置
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
              {generated ?? '// 填写左侧表单后点击「创建并生成配置」'}
            </pre>
          </div>
        </div>
      </div>
    </MgmtPageShell>
  );
};
