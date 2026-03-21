import React, { useState } from 'react';
import { FileText, ExternalLink, Copy, Check, ChevronRight } from 'lucide-react';
import type { Theme, FontSize } from '../../types';
import { GlassPanel } from '../../components/common/GlassPanel';
import { BentoCard } from '../../components/common/BentoCard';
import {
  pageBg, glassSidebar, textPrimary, textSecondary, textMuted,
} from '../../utils/uiClasses';

interface ApiEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  description: string;
  params: { name: string; type: string; required: boolean; description: string }[];
  responseExample: string;
}

interface ApiCategory { id: string; label: string; endpoints: ApiEndpoint[]; }

const METHOD_COLORS: Record<string, { light: string; dark: string }> = {
  GET:    { light: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60', dark: 'bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/20' },
  POST:   { light: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200/60',         dark: 'bg-blue-500/15 text-blue-400 ring-1 ring-blue-500/20' },
  PUT:    { light: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200/60',     dark: 'bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/20' },
  DELETE: { light: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200/60',         dark: 'bg-rose-500/15 text-rose-400 ring-1 ring-rose-500/20' },
};

const API_CATEGORIES: ApiCategory[] = [
  { id: 'auth', label: '认证 (Auth)', endpoints: [
    { method: 'POST', path: '/auth/login', description: '用户登录，返回 access_token 和 refresh_token', params: [{ name: 'username', type: 'string', required: true, description: '学工号' }, { name: 'password', type: 'string', required: true, description: '密码' }], responseExample: JSON.stringify({ code: 0, message: 'success', data: { accessToken: 'eyJhbGciOiJIUzI1NiIs...', refreshToken: 'dGhpcyBpcyBhIHJlZnJlc2g...', expiresIn: 7200 } }, null, 2) },
    { method: 'POST', path: '/auth/refresh', description: '使用 refresh_token 刷新 access_token', params: [{ name: 'refreshToken', type: 'string', required: true, description: '刷新令牌' }], responseExample: JSON.stringify({ code: 0, message: 'success', data: { accessToken: 'eyJhbGciOiJIUzI1NiIs...', expiresIn: 7200 } }, null, 2) },
  ]},
  { id: 'agents', label: 'Agent 管理', endpoints: [
    { method: 'GET', path: '/agents', description: '获取 Agent 列表', params: [{ name: 'pageNum', type: 'number', required: false, description: '页码' }, { name: 'pageSize', type: 'number', required: false, description: '每页条数' }, { name: 'status', type: 'string', required: false, description: '筛选状态' }, { name: 'keyword', type: 'string', required: false, description: '关键词搜索' }], responseExample: JSON.stringify({ code: 0, data: { records: [{ id: 1, agentName: 'course-advisor', displayName: '选课助手', status: 'published' }], total: 42 } }, null, 2) },
    { method: 'POST', path: '/agents', description: '注册新 Agent', params: [{ name: 'agentName', type: 'string', required: true, description: '唯一标识名' }, { name: 'displayName', type: 'string', required: true, description: '显示名称' }, { name: 'agentType', type: 'string', required: true, description: 'mcp / http_api / builtin' }], responseExample: JSON.stringify({ code: 0, data: { id: 43, status: 'draft' } }, null, 2) },
    { method: 'POST', path: '/agents/:id/invoke', description: '调用指定 Agent 执行任务', params: [{ name: 'id', type: 'number', required: true, description: 'Agent ID' }, { name: 'input', type: 'string', required: true, description: '用户输入' }, { name: 'stream', type: 'boolean', required: false, description: '是否流式返回' }], responseExample: JSON.stringify({ code: 0, data: { taskId: 'tk_001', output: '推荐选修…', tokensUsed: 356, latencyMs: 1230 } }, null, 2) },
  ]},
  { id: 'skills', label: 'Skill 管理', endpoints: [
    { method: 'GET', path: '/skills', description: '获取 Skill 列表', params: [{ name: 'pageNum', type: 'number', required: false, description: '页码' }], responseExample: JSON.stringify({ code: 0, data: { records: [{ id: 10, agentName: 'weather-tool', displayName: '天气查询', mode: 'TOOL' }], total: 15 } }, null, 2) },
    { method: 'POST', path: '/skills', description: '注册新 Skill', params: [{ name: 'agentName', type: 'string', required: true, description: '唯一标识名' }, { name: 'agentType', type: 'string', required: true, description: 'mcp / http_api / builtin' }], responseExample: JSON.stringify({ code: 0, data: { id: 16, mode: 'TOOL' } }, null, 2) },
  ]},
  { id: 'datasets', label: '数据集', endpoints: [
    { method: 'GET', path: '/datasets', description: '获取数据集列表', params: [{ name: 'dataType', type: 'string', required: false, description: 'document/structured/mixed' }], responseExample: JSON.stringify({ code: 0, data: { records: [{ id: 1, datasetName: 'course-catalog', displayName: '课程目录' }], total: 6 } }, null, 2) },
  ]},
];

function CopyButton({ text, isDark }: { text: string; isDark: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <button type="button" onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }} className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-white/10 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`} title="复制">
      {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
    </button>
  );
}

export interface ApiDocsPageProps { theme: Theme; fontSize: FontSize; }

export const ApiDocsPage: React.FC<ApiDocsPageProps> = ({ theme, fontSize }) => {
  const isDark = theme === 'dark';
  const [activeCat, setActiveCat] = useState(API_CATEGORIES[0].id);
  const category = API_CATEGORIES.find((c) => c.id === activeCat)!;

  return (
    <div className={`flex-1 flex flex-col min-h-0 overflow-hidden transition-colors duration-300 ${pageBg(theme)}`}>
      <div className="w-full flex-1 min-h-0 flex flex-col px-2 sm:px-3 lg:px-4 py-2 sm:py-3">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4 shrink-0">
          <div className={`p-2 rounded-xl ${isDark ? 'bg-blue-500/15' : 'bg-blue-50'}`}>
            <FileText size={20} className={isDark ? 'text-blue-400' : 'text-blue-600'} />
          </div>
          <div>
            <h1 className={`text-lg font-bold ${textPrimary(theme)}`}>API 文档</h1>
            <p className={`text-xs ${textMuted(theme)}`}>LantuConnect 开放接口 · Base URL: /api/v1</p>
          </div>
        </div>

        {/* Two-column layout */}
        <div className="flex-1 min-h-0 flex rounded-2xl overflow-hidden border ${isDark ? 'border-white/[0.06]' : 'border-slate-100'}">
          {/* Sidebar */}
          <div className={`w-52 shrink-0 overflow-y-auto ${glassSidebar(theme)}`}>
            <div className="p-3 space-y-1">
              <p className={`text-[10px] font-semibold uppercase tracking-wider px-3 py-2 ${textMuted(theme)}`}>API 分类</p>
              {API_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCat(cat.id)}
                  className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-left transition-colors text-sm ${
                    activeCat === cat.id
                      ? isDark ? 'bg-white/10 text-white font-semibold' : 'bg-indigo-50 text-indigo-600 font-semibold'
                      : isDark ? 'text-slate-400 hover:bg-white/5' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <ChevronRight size={14} className={activeCat === cat.id ? 'opacity-100' : 'opacity-40'} />
                  <span className="truncate">{cat.label}</span>
                  <span className={`ml-auto text-[10px] px-1.5 py-0.5 rounded-md ${isDark ? 'bg-white/5 text-slate-500' : 'bg-slate-100 text-slate-400'}`}>{cat.endpoints.length}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 overflow-y-auto p-4 sm:p-6 space-y-4">
            <h2 className={`text-base font-bold ${textPrimary(theme)}`}>{category.label}</h2>
            {category.endpoints.map((ep, idx) => {
              const mc = METHOD_COLORS[ep.method];
              return (
                <BentoCard key={idx} theme={theme}>
                  <div className="flex flex-wrap items-center gap-3 mb-3">
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${isDark ? mc.dark : mc.light}`}>{ep.method}</span>
                    <code className={`text-sm font-mono font-semibold ${textPrimary(theme)}`}>/api/v1{ep.path}</code>
                  </div>
                  <p className={`text-sm mb-4 ${textSecondary(theme)}`}>{ep.description}</p>

                  {ep.params.length > 0 && (
                    <div className="mb-4">
                      <h4 className={`text-xs font-semibold mb-2 ${textSecondary(theme)}`}>请求参数</h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead><tr className={`text-left text-xs ${textMuted(theme)}`}><th className="pb-2 pr-4 font-medium">参数名</th><th className="pb-2 pr-4 font-medium">类型</th><th className="pb-2 pr-4 font-medium">必填</th><th className="pb-2 font-medium">描述</th></tr></thead>
                          <tbody className={textSecondary(theme)}>
                            {ep.params.map((p) => (
                              <tr key={p.name} className={`border-t ${isDark ? 'border-white/[0.04]' : 'border-slate-100'}`}>
                                <td className="py-2 pr-4"><code className={`text-xs px-1.5 py-0.5 rounded font-mono ${isDark ? 'bg-white/5' : 'bg-slate-100'}`}>{p.name}</code></td>
                                <td className={`py-2 pr-4 text-xs ${textMuted(theme)}`}>{p.type}</td>
                                <td className="py-2 pr-4">{p.required ? <span className="text-xs text-rose-500 font-medium">是</span> : <span className={`text-xs ${textMuted(theme)}`}>否</span>}</td>
                                <td className={`py-2 text-xs ${textMuted(theme)}`}>{p.description}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className={`text-xs font-semibold ${textSecondary(theme)}`}>响应示例</h4>
                      <CopyButton text={ep.responseExample} isDark={isDark} />
                    </div>
                    <pre className={`text-xs font-mono p-4 rounded-xl overflow-x-auto ${isDark ? 'bg-black/40 text-emerald-400' : 'bg-slate-900 text-emerald-300'}`}>{ep.responseExample}</pre>
                  </div>

                  <div className="flex justify-end mt-3">
                    <button type="button" className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${isDark ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-500'}`} onClick={() => { window.dispatchEvent(new CustomEvent('navigate-to-playground', { detail: { method: ep.method, path: `/api/v1${ep.path}` } })); }}>
                      <ExternalLink size={13} /> 在 Playground 中试用
                    </button>
                  </div>
                </BentoCard>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
