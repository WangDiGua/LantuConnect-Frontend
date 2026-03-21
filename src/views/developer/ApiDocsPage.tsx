import React, { useState } from 'react';
import { FileText, ExternalLink, Copy, Check, ChevronRight } from 'lucide-react';
import { Theme, FontSize } from '../../types';

interface ApiEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  description: string;
  params: { name: string; type: string; required: boolean; description: string }[];
  responseExample: string;
}

interface ApiCategory {
  id: string;
  label: string;
  endpoints: ApiEndpoint[];
}

const METHOD_COLORS: Record<string, { bg: string; text: string; darkBg: string; darkText: string }> = {
  GET: { bg: 'bg-emerald-100', text: 'text-emerald-700', darkBg: 'bg-emerald-500/20', darkText: 'text-emerald-400' },
  POST: { bg: 'bg-blue-100', text: 'text-blue-700', darkBg: 'bg-blue-500/20', darkText: 'text-blue-400' },
  PUT: { bg: 'bg-amber-100', text: 'text-amber-700', darkBg: 'bg-amber-500/20', darkText: 'text-amber-400' },
  DELETE: { bg: 'bg-red-100', text: 'text-red-700', darkBg: 'bg-red-500/20', darkText: 'text-red-400' },
};

const API_CATEGORIES: ApiCategory[] = [
  {
    id: 'auth',
    label: '认证 (Auth)',
    endpoints: [
      {
        method: 'POST',
        path: '/auth/login',
        description: '用户登录，返回 access_token 和 refresh_token',
        params: [
          { name: 'username', type: 'string', required: true, description: '学工号' },
          { name: 'password', type: 'string', required: true, description: '密码' },
        ],
        responseExample: JSON.stringify({ code: 0, message: 'success', data: { accessToken: 'eyJhbGciOiJIUzI1NiIs...', refreshToken: 'dGhpcyBpcyBhIHJlZnJlc2g...', expiresIn: 7200 } }, null, 2),
      },
      {
        method: 'POST',
        path: '/auth/refresh',
        description: '使用 refresh_token 刷新 access_token',
        params: [
          { name: 'refreshToken', type: 'string', required: true, description: '刷新令牌' },
        ],
        responseExample: JSON.stringify({ code: 0, message: 'success', data: { accessToken: 'eyJhbGciOiJIUzI1NiIs...', expiresIn: 7200 } }, null, 2),
      },
    ],
  },
  {
    id: 'agents',
    label: 'Agent 管理',
    endpoints: [
      {
        method: 'GET',
        path: '/agents',
        description: '获取 Agent 列表（支持分页与筛选）',
        params: [
          { name: 'pageNum', type: 'number', required: false, description: '页码，默认 1' },
          { name: 'pageSize', type: 'number', required: false, description: '每页条数，默认 20' },
          { name: 'status', type: 'string', required: false, description: '筛选状态: draft/published/deprecated' },
          { name: 'keyword', type: 'string', required: false, description: '关键词搜索' },
        ],
        responseExample: JSON.stringify({ code: 0, message: 'success', data: { records: [{ id: 1, agentName: 'course-advisor', displayName: '选课助手', status: 'published', callCount: 1520 }], total: 42, pageNum: 1, pageSize: 20 } }, null, 2),
      },
      {
        method: 'POST',
        path: '/agents',
        description: '注册新 Agent',
        params: [
          { name: 'agentName', type: 'string', required: true, description: '唯一标识名（英文）' },
          { name: 'displayName', type: 'string', required: true, description: '显示名称' },
          { name: 'description', type: 'string', required: true, description: '描述信息' },
          { name: 'agentType', type: 'string', required: true, description: 'mcp / http_api / builtin' },
          { name: 'specJson', type: 'object', required: true, description: '连接配置 {url, api_key, headers}' },
        ],
        responseExample: JSON.stringify({ code: 0, message: 'success', data: { id: 43, agentName: 'new-agent', status: 'draft' } }, null, 2),
      },
      {
        method: 'PUT',
        path: '/agents/:id',
        description: '更新 Agent 信息',
        params: [
          { name: 'id', type: 'number', required: true, description: 'Agent ID（路径参数）' },
          { name: 'displayName', type: 'string', required: false, description: '显示名称' },
          { name: 'description', type: 'string', required: false, description: '描述信息' },
          { name: 'status', type: 'string', required: false, description: '状态变更' },
        ],
        responseExample: JSON.stringify({ code: 0, message: 'success', data: { id: 1, agentName: 'course-advisor', status: 'published' } }, null, 2),
      },
      {
        method: 'DELETE',
        path: '/agents/:id',
        description: '删除指定 Agent（软删除）',
        params: [
          { name: 'id', type: 'number', required: true, description: 'Agent ID（路径参数）' },
        ],
        responseExample: JSON.stringify({ code: 0, message: 'success', data: null }, null, 2),
      },
      {
        method: 'POST',
        path: '/agents/:id/invoke',
        description: '调用指定 Agent 执行任务',
        params: [
          { name: 'id', type: 'number', required: true, description: 'Agent ID（路径参数）' },
          { name: 'input', type: 'string', required: true, description: '用户输入内容' },
          { name: 'context', type: 'object', required: false, description: '上下文信息' },
          { name: 'stream', type: 'boolean', required: false, description: '是否流式返回，默认 false' },
        ],
        responseExample: JSON.stringify({ code: 0, message: 'success', data: { taskId: 'tk_20260321001', output: '推荐选修《数据结构》和《算法设计》', tokensUsed: 356, latencyMs: 1230 } }, null, 2),
      },
    ],
  },
  {
    id: 'skills',
    label: 'Skill 管理',
    endpoints: [
      {
        method: 'GET',
        path: '/skills',
        description: '获取 Skill 列表',
        params: [
          { name: 'pageNum', type: 'number', required: false, description: '页码' },
          { name: 'pageSize', type: 'number', required: false, description: '每页条数' },
          { name: 'mode', type: 'string', required: false, description: 'TOOL' },
        ],
        responseExample: JSON.stringify({ code: 0, message: 'success', data: { records: [{ id: 10, agentName: 'weather-tool', displayName: '天气查询', mode: 'TOOL', callCount: 890 }], total: 15, pageNum: 1, pageSize: 20 } }, null, 2),
      },
      {
        method: 'POST',
        path: '/skills',
        description: '注册新 Skill',
        params: [
          { name: 'agentName', type: 'string', required: true, description: '唯一标识名' },
          { name: 'displayName', type: 'string', required: true, description: '显示名称' },
          { name: 'agentType', type: 'string', required: true, description: 'mcp / http_api / builtin' },
          { name: 'parametersSchema', type: 'object', required: false, description: '工具参数 JSON Schema' },
        ],
        responseExample: JSON.stringify({ code: 0, message: 'success', data: { id: 16, agentName: 'new-skill', mode: 'TOOL' } }, null, 2),
      },
      {
        method: 'PUT',
        path: '/skills/:id',
        description: '更新 Skill 信息',
        params: [
          { name: 'id', type: 'number', required: true, description: 'Skill ID（路径参数）' },
          { name: 'displayName', type: 'string', required: false, description: '显示名称' },
          { name: 'parametersSchema', type: 'object', required: false, description: '参数 Schema' },
        ],
        responseExample: JSON.stringify({ code: 0, message: 'success', data: { id: 10, status: 'published' } }, null, 2),
      },
      {
        method: 'DELETE',
        path: '/skills/:id',
        description: '删除指定 Skill',
        params: [
          { name: 'id', type: 'number', required: true, description: 'Skill ID（路径参数）' },
        ],
        responseExample: JSON.stringify({ code: 0, message: 'success', data: null }, null, 2),
      },
    ],
  },
  {
    id: 'apps',
    label: '智能应用',
    endpoints: [
      {
        method: 'GET',
        path: '/apps',
        description: '获取智能应用列表',
        params: [
          { name: 'pageNum', type: 'number', required: false, description: '页码' },
          { name: 'pageSize', type: 'number', required: false, description: '每页条数' },
          { name: 'status', type: 'string', required: false, description: 'draft/published/deprecated' },
        ],
        responseExample: JSON.stringify({ code: 0, message: 'success', data: { records: [{ id: 1, appName: 'smart-schedule', displayName: '智能排课', embedType: 'iframe' }], total: 8, pageNum: 1, pageSize: 20 } }, null, 2),
      },
      {
        method: 'POST',
        path: '/apps',
        description: '注册新智能应用',
        params: [
          { name: 'appName', type: 'string', required: true, description: '应用标识名' },
          { name: 'displayName', type: 'string', required: true, description: '显示名称' },
          { name: 'appUrl', type: 'string', required: true, description: '应用 URL' },
          { name: 'embedType', type: 'string', required: true, description: 'iframe / micro_frontend / redirect' },
        ],
        responseExample: JSON.stringify({ code: 0, message: 'success', data: { id: 9, appName: 'new-app', status: 'draft' } }, null, 2),
      },
      {
        method: 'PUT',
        path: '/apps/:id',
        description: '更新智能应用',
        params: [
          { name: 'id', type: 'number', required: true, description: '应用 ID（路径参数）' },
          { name: 'displayName', type: 'string', required: false, description: '显示名称' },
          { name: 'appUrl', type: 'string', required: false, description: '应用 URL' },
        ],
        responseExample: JSON.stringify({ code: 0, message: 'success', data: { id: 1, status: 'published' } }, null, 2),
      },
      {
        method: 'DELETE',
        path: '/apps/:id',
        description: '删除智能应用',
        params: [
          { name: 'id', type: 'number', required: true, description: '应用 ID（路径参数）' },
        ],
        responseExample: JSON.stringify({ code: 0, message: 'success', data: null }, null, 2),
      },
    ],
  },
  {
    id: 'datasets',
    label: '数据集',
    endpoints: [
      {
        method: 'GET',
        path: '/datasets',
        description: '获取数据集列表',
        params: [
          { name: 'pageNum', type: 'number', required: false, description: '页码' },
          { name: 'pageSize', type: 'number', required: false, description: '每页条数' },
          { name: 'dataType', type: 'string', required: false, description: 'document/structured/mixed' },
        ],
        responseExample: JSON.stringify({ code: 0, message: 'success', data: { records: [{ id: 1, datasetName: 'course-catalog', displayName: '课程目录', recordCount: 12500, fileSize: 2048000 }], total: 6, pageNum: 1, pageSize: 20 } }, null, 2),
      },
      {
        method: 'POST',
        path: '/datasets',
        description: '注册新数据集',
        params: [
          { name: 'datasetName', type: 'string', required: true, description: '数据集标识名' },
          { name: 'displayName', type: 'string', required: true, description: '显示名称' },
          { name: 'sourceType', type: 'string', required: true, description: 'department/knowledge/third_party' },
          { name: 'dataType', type: 'string', required: true, description: 'document/structured/image/mixed' },
        ],
        responseExample: JSON.stringify({ code: 0, message: 'success', data: { id: 7, datasetName: 'new-dataset', status: 'draft' } }, null, 2),
      },
      {
        method: 'PUT',
        path: '/datasets/:id',
        description: '更新数据集信息',
        params: [
          { name: 'id', type: 'number', required: true, description: '数据集 ID（路径参数）' },
          { name: 'displayName', type: 'string', required: false, description: '显示名称' },
          { name: 'tags', type: 'string[]', required: false, description: '标签列表' },
        ],
        responseExample: JSON.stringify({ code: 0, message: 'success', data: { id: 1, status: 'published' } }, null, 2),
      },
      {
        method: 'DELETE',
        path: '/datasets/:id',
        description: '删除数据集',
        params: [
          { name: 'id', type: 'number', required: true, description: '数据集 ID（路径参数）' },
        ],
        responseExample: JSON.stringify({ code: 0, message: 'success', data: null }, null, 2),
      },
    ],
  },
];

function CopyButton({ text, isDark }: { text: string; isDark: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-white/10 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}
      title="复制"
    >
      {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
    </button>
  );
}

export interface ApiDocsPageProps {
  theme: Theme;
  fontSize: FontSize;
}

export const ApiDocsPage: React.FC<ApiDocsPageProps> = ({ theme, fontSize }) => {
  const isDark = theme === 'dark';
  const [activeCat, setActiveCat] = useState(API_CATEGORIES[0].id);
  const category = API_CATEGORIES.find((c) => c.id === activeCat)!;

  return (
    <div className={`flex-1 flex flex-col min-h-0 overflow-hidden ${isDark ? 'bg-[#000000]' : 'bg-[#F2F2F7]'}`}>
      <div className="w-full flex-1 min-h-0 flex flex-col px-2 sm:px-3 lg:px-4 py-2 sm:py-3 overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4 shrink-0">
          <div className={`p-2 rounded-xl ${isDark ? 'bg-white/10' : 'bg-white border border-slate-200/80'}`}>
            <FileText size={22} className="text-blue-500" />
          </div>
          <div>
            <h1 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>API 文档</h1>
            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              LantuConnect 开放接口文档 · Base URL: /api/v1
            </p>
          </div>
        </div>

        {/* Two-column layout */}
        <div className={`flex-1 min-h-0 flex rounded-2xl border overflow-hidden ${isDark ? 'bg-[#1C1C1E] border-white/10' : 'bg-white border-slate-200/80'}`}>
          {/* Left: category tabs */}
          <div className={`w-52 shrink-0 border-r overflow-y-auto ${isDark ? 'border-white/10 bg-black/20' : 'border-slate-200 bg-slate-50/50'}`}>
            <div className="p-3 space-y-1">
              <p className={`text-[10px] font-semibold uppercase tracking-wider px-3 py-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                API 分类
              </p>
              {API_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCat(cat.id)}
                  className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-left transition-colors ${
                    fontSize === 'small' ? 'text-xs' : 'text-sm'
                  } ${
                    activeCat === cat.id
                      ? isDark
                        ? 'bg-white/10 text-white font-semibold'
                        : 'bg-white text-blue-600 font-semibold shadow-sm border border-slate-200/80'
                      : isDark
                        ? 'text-slate-400 hover:bg-white/5'
                        : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <ChevronRight size={14} className={activeCat === cat.id ? 'opacity-100' : 'opacity-40'} />
                  <span className="truncate">{cat.label}</span>
                  <span className={`ml-auto text-[10px] px-1.5 py-0.5 rounded-md ${isDark ? 'bg-white/5 text-slate-500' : 'bg-slate-100 text-slate-400'}`}>
                    {cat.endpoints.length}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Right: endpoint details */}
          <div className="flex-1 min-w-0 overflow-y-auto p-4 sm:p-6 space-y-6 custom-scrollbar">
            <h2 className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{category.label}</h2>

            {category.endpoints.map((ep, idx) => {
              const mc = METHOD_COLORS[ep.method];
              return (
                <div
                  key={idx}
                  className={`rounded-2xl border p-5 space-y-4 ${isDark ? 'border-white/10 bg-white/[0.02]' : 'border-slate-200/80 bg-slate-50/30'}`}
                >
                  {/* Method + Path */}
                  <div className="flex flex-wrap items-center gap-3">
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${isDark ? `${mc.darkBg} ${mc.darkText}` : `${mc.bg} ${mc.text}`}`}>
                      {ep.method}
                    </span>
                    <code className={`text-sm font-mono font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                      /api/v1{ep.path}
                    </code>
                  </div>

                  {/* Description */}
                  <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{ep.description}</p>

                  {/* Request Parameters Table */}
                  {ep.params.length > 0 && (
                    <div>
                      <h4 className={`text-xs font-semibold mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>请求参数</h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className={`text-left text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                              <th className="pb-2 pr-4 font-medium">参数名</th>
                              <th className="pb-2 pr-4 font-medium">类型</th>
                              <th className="pb-2 pr-4 font-medium">必填</th>
                              <th className="pb-2 font-medium">描述</th>
                            </tr>
                          </thead>
                          <tbody className={isDark ? 'text-slate-300' : 'text-slate-700'}>
                            {ep.params.map((p) => (
                              <tr key={p.name} className={`border-t ${isDark ? 'border-white/5' : 'border-slate-100'}`}>
                                <td className="py-2 pr-4">
                                  <code className={`text-xs px-1.5 py-0.5 rounded font-mono ${isDark ? 'bg-white/5' : 'bg-slate-100'}`}>{p.name}</code>
                                </td>
                                <td className={`py-2 pr-4 text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{p.type}</td>
                                <td className="py-2 pr-4">
                                  {p.required ? (
                                    <span className="text-xs text-red-500 font-medium">是</span>
                                  ) : (
                                    <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>否</span>
                                  )}
                                </td>
                                <td className={`py-2 text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{p.description}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Response Example */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className={`text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>响应示例</h4>
                      <CopyButton text={ep.responseExample} isDark={isDark} />
                    </div>
                    <pre className={`text-xs font-mono p-4 rounded-xl overflow-x-auto ${isDark ? 'bg-black/40 text-emerald-400' : 'bg-slate-900 text-emerald-300'}`}>
                      {ep.responseExample}
                    </pre>
                  </div>

                  {/* Try It button */}
                  <div className="flex justify-end">
                    <button
                      type="button"
                      className="flex items-center gap-1.5 text-xs font-medium text-blue-500 hover:text-blue-600 transition-colors"
                      onClick={() => {
                        const event = new CustomEvent('navigate-to-playground', { detail: { method: ep.method, path: `/api/v1${ep.path}` } });
                        window.dispatchEvent(event);
                      }}
                    >
                      <ExternalLink size={13} />
                      在 Playground 中试用
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
