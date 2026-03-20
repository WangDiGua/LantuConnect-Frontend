import React, { useState } from 'react';
import { Server, Puzzle, Plus, Download, Star } from 'lucide-react';
import { Theme, FontSize } from '../../types';

const shell = (theme: Theme, children: React.ReactNode) => (
  <div
    className={`flex-1 overflow-y-auto transition-colors duration-300 ${
      theme === 'light' ? 'bg-[#F2F2F7]' : 'bg-[#000000]'
    }`}
  >
    <div className="max-w-5xl mx-auto px-3 py-6">{children}</div>
  </div>
);

const card = (theme: Theme) =>
  `rounded-2xl border p-4 ${theme === 'light' ? 'bg-white border-slate-200/80' : 'bg-[#1C1C1E] border-white/10'}`;

const input = (theme: Theme) =>
  `w-full rounded-xl border px-3 py-2 text-sm outline-none ${
    theme === 'light' ? 'border-slate-200 bg-white text-slate-900' : 'border-white/15 bg-black/30 text-white'
  }`;

const btnPrimary =
  'rounded-xl bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 text-sm font-semibold transition-colors';

const btnGhost = (theme: Theme) =>
  `rounded-xl border px-4 py-2 text-sm font-medium transition-colors ${
    theme === 'light' ? 'border-slate-200 hover:bg-slate-50' : 'border-white/15 hover:bg-white/5 text-slate-200'
  }`;

interface Props {
  theme: Theme;
  fontSize: FontSize;
  showMessage: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

const INITIAL_MCP = [
  { id: 'm1', name: 'filesystem', author: '官方', stars: 1204, installed: false },
  { id: 'm2', name: 'postgres-readonly', author: '社区', stars: 532, installed: true },
];

const INITIAL_PLUGINS = [
  { id: 'p1', name: '天气查询', vendor: 'Lantu', price: '免费', added: false },
  { id: 'p2', name: 'OCR 增强', vendor: '第三方', price: '¥9/月', added: true },
];

/** MCP 广场：浏览、安装/卸载（Mock） */
export const McpPlazaPage: React.FC<Props> = (props) => {
  const { theme, showMessage } = props;
  const [list, setList] = useState(INITIAL_MCP);
  const [q, setQ] = useState('');
  const filtered = list.filter((x) => x.name.toLowerCase().includes(q.toLowerCase()));
  return shell(
    theme,
    <>
      <h1 className={`text-2xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>MCP 广场</h1>
      <p className="text-sm text-slate-500 mb-6">浏览 Model Context Protocol 服务并一键接入 Agent（Mock）</p>
      <input className={`${input(theme)} mb-6`} placeholder="搜索 MCP 名称…" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="space-y-3">
        {filtered.map((m) => (
          <div key={m.id} className={`${card(theme)} flex flex-wrap items-center justify-between gap-3`}>
            <div className="flex items-start gap-3">
              <Server className="text-blue-500 shrink-0 mt-0.5" size={22} />
              <div>
                <div className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{m.name}</div>
                <div className="text-xs text-slate-500 flex items-center gap-2 mt-1">
                  <span>{m.author}</span>
                  <Star size={12} className="inline" />
                  {m.stars}
                </div>
              </div>
            </div>
            <button
              type="button"
              className={m.installed ? btnGhost(theme) : btnPrimary}
              onClick={() => {
                setList((prev) => prev.map((x) => (x.id === m.id ? { ...x, installed: !x.installed } : x)));
                showMessage(m.installed ? '已卸载' : '已安装到工作空间', 'success');
              }}
            >
              {m.installed ? '卸载' : '安装'}
            </button>
          </div>
        ))}
      </div>
    </>
  );
};

/** 插件市场（Mock） */
export const PluginMarketPage: React.FC<Props> = (props) => {
  const { theme, showMessage } = props;
  const [list, setList] = useState(INITIAL_PLUGINS);
  return shell(
    theme,
    <>
      <h1 className={`text-2xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>插件市场</h1>
      <p className="text-sm text-slate-500 mb-6">为工作流与 Agent 添加即插即用能力</p>
      <div className="space-y-3">
        {list.map((p) => (
          <div key={p.id} className={`${card(theme)} flex flex-wrap items-center justify-between gap-3`}>
            <div className="flex items-start gap-3">
              <Puzzle className="text-violet-500 shrink-0 mt-0.5" size={22} />
              <div>
                <div className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{p.name}</div>
                <div className="text-xs text-slate-500 mt-1">
                  {p.vendor} · {p.price}
                </div>
              </div>
            </div>
            <button
              type="button"
              className={p.added ? btnGhost(theme) : btnPrimary}
              onClick={() => {
                setList((prev) => prev.map((x) => (x.id === p.id ? { ...x, added: !x.added } : x)));
                showMessage(p.added ? '已从空间移除' : '已添加到空间', 'success');
              }}
            >
              {p.added ? '移除' : '添加'}
            </button>
          </div>
        ))}
      </div>
    </>
  );
};

/** 创建工具 / 函数（Mock 向导） */
export const CreateToolFunctionPage: React.FC<Props> = (props) => {
  const { theme, showMessage } = props;
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [schema, setSchema] = useState('{\n  "type": "object",\n  "properties": {\n    "q": { "type": "string" }\n  }\n}');
  const [impl, setImpl] = useState('// return { result: input.q };');
  return shell(
    theme,
    <>
      <h1 className={`text-2xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>创建工具 / 函数</h1>
      <div className="flex gap-2 mb-6">
        {['基本信息', '参数 Schema', '实现'].map((t, i) => (
          <span
            key={t}
            className={`text-xs px-2 py-1 rounded-lg ${step === i ? 'bg-blue-600 text-white' : theme === 'light' ? 'bg-slate-200' : 'bg-white/10'}`}
          >
            {i + 1}. {t}
          </span>
        ))}
      </div>
      <div className={`${card(theme)} space-y-4`}>
        {step === 0 && (
          <>
            <label className="text-xs text-slate-500">工具名称</label>
            <input className={input(theme)} value={name} onChange={(e) => setName(e.target.value)} placeholder="例如：search_campus_map" />
          </>
        )}
        {step === 1 && (
          <>
            <label className="text-xs text-slate-500">JSON Schema</label>
            <textarea className={`${input(theme)} min-h-[200px] font-mono`} value={schema} onChange={(e) => setSchema(e.target.value)} />
          </>
        )}
        {step === 2 && (
          <>
            <label className="text-xs text-slate-500">函数体（JavaScript 沙箱 Mock）</label>
            <textarea className={`${input(theme)} min-h-[200px] font-mono`} value={impl} onChange={(e) => setImpl(e.target.value)} />
          </>
        )}
        <div className="flex justify-between pt-2">
          <button
            type="button"
            className={btnGhost(theme)}
            disabled={step === 0}
            onClick={() => setStep((s) => Math.max(0, s - 1))}
          >
            上一步
          </button>
          {step < 2 ? (
            <button
              type="button"
              className={btnPrimary}
              onClick={() => {
                if (step === 0 && !name.trim()) {
                  showMessage('请填写名称', 'error');
                  return;
                }
                setStep((s) => s + 1);
              }}
            >
              下一步
            </button>
          ) : (
            <button type="button" className={btnPrimary} onClick={() => showMessage(`工具「${name || '未命名'}」已保存（Mock）`, 'success')}>
              <Plus size={16} className="inline mr-1" />
              保存工具
            </button>
          )}
        </div>
      </div>
      <button type="button" className={`${btnGhost(theme)} mt-4`} onClick={() => showMessage('已导出 OpenAPI 片段（Mock）', 'info')}>
        <Download size={16} className="inline mr-1" />
        导出 OpenAPI
      </button>
    </>
  );
};
