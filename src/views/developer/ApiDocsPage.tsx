import React, { useState } from 'react';
import { FileText, ExternalLink, Copy, Check, ChevronRight } from 'lucide-react';
import type { Theme, FontSize } from '../../types';
import { GlassPanel } from '../../components/common/GlassPanel';
import { BentoCard } from '../../components/common/BentoCard';
import {
  canvasBodyBg, glassSidebar, textPrimary, textSecondary, textMuted,
} from '../../utils/uiClasses';
import { useLayoutChrome } from '../../context/LayoutChromeContext';
import { PageTitleTagline } from '../../components/common/PageTitleTagline';

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
  { id: 'user-api-keys', label: '用户设置 · API Key', endpoints: [
    { method: 'POST', path: '/user-settings/api-keys', description: '创建个人 API Key。成功时 data.secretPlain（或 plainKey）为完整可调用密钥，仅该次响应返回。须为 Key 配置 scope（catalog/resolve/invoke 或 *），否则网关提示 scope 不足；前端默认传 scopes:["*"]。调用他人资源还需 Resource Grant。列表中的 maskedKey、prefix、id 均不能作为 X-Api-Key。', params: [{ name: 'name', type: 'string', required: true, description: '密钥名称' }, { name: 'scopes', type: 'string[]', required: false, description: '权限范围；不传时前端默认 ["*"]' }], responseExample: JSON.stringify({ code: 0, message: 'ok', data: { id: 'uuid', name: 'dev', prefix: 'sk_', scopes: ['*'], secretPlain: 'sk_' + 'a'.repeat(32) } }, null, 2) },
    { method: 'GET', path: '/user-settings/api-keys', description: '列出当前用户的 Key；仅掩码与前缀，不包含完整密钥。', params: [], responseExample: JSON.stringify({ code: 0, message: 'ok', data: [{ id: 'uuid', name: 'dev', maskedKey: 'sk_3****', prefix: 'sk_' }] }, null, 2) },
  ]},
  { id: 'auth', label: '认证 (Auth)', endpoints: [
    { method: 'POST', path: '/auth/login', description: '用户登录，返回 token / refreshToken / user', params: [{ name: 'username', type: 'string', required: true, description: '用户名/工号' }, { name: 'password', type: 'string', required: true, description: '密码' }], responseExample: JSON.stringify({ code: 0, message: 'ok', data: { token: 'eyJ...', refreshToken: 'rt_...', user: { id: '1001', username: 'alice', role: 'developer' } } }, null, 2) },
    { method: 'POST', path: '/auth/refresh', description: '使用 refreshToken 刷新 token', params: [{ name: 'refreshToken', type: 'string', required: true, description: '刷新令牌' }], responseExample: JSON.stringify({ code: 0, message: 'ok', data: { token: 'eyJ...', refreshToken: 'rt_new' } }, null, 2) },
  ]},
  { id: 'catalog', label: '统一资源目录', endpoints: [
    { method: 'GET', path: '/catalog/resources', description: '按 resourceType / keyword / status 查询资源目录', params: [{ name: 'page', type: 'number', required: false, description: '页码，默认 1' }, { name: 'pageSize', type: 'number', required: false, description: '每页，默认 20' }, { name: 'resourceType', type: 'string', required: false, description: 'agent/skill/mcp/app/dataset' }, { name: 'keyword', type: 'string', required: false, description: '关键字' }], responseExample: JSON.stringify({ code: 0, message: 'ok', data: { list: [{ resourceType: 'agent', resourceId: '1', resourceCode: 'course-advisor', displayName: '选课助手', status: 'published' }], total: 42, page: 1, pageSize: 20 } }, null, 2) },
    { method: 'GET', path: '/catalog/resources/{type}/{id}', description: '查询单个资源详情', params: [{ name: 'type', type: 'string', required: true, description: '资源类型' }, { name: 'id', type: 'string', required: true, description: '资源 ID' }], responseExample: JSON.stringify({ code: 0, message: 'ok', data: { resourceType: 'skill', resourceId: '9', resourceCode: 'weather-tool', displayName: '天气查询', status: 'published' } }, null, 2) },
  ]},
  { id: 'resolve-invoke', label: '解析与调用', endpoints: [
    { method: 'POST', path: '/catalog/resolve', description: '解析资源到可调用 endpoint/spec', params: [{ name: 'resourceType', type: 'string', required: true, description: '资源类型' }, { name: 'resourceId', type: 'string', required: true, description: '资源 ID' }, { name: 'version', type: 'string', required: false, description: '版本号' }], responseExample: JSON.stringify({ code: 0, message: 'ok', data: { resourceType: 'agent', resourceId: '1', endpoint: 'https://gateway/invoke/agent/1', invokeType: 'http', version: 'v1' } }, null, 2) },
    { method: 'POST', path: '/invoke', description: '统一调用入口。X-Api-Key 须为完整 secretPlain。还须 Key scope 含 invoke（或 *）且对跨 owner 资源具备 Grant；否则会 403。', params: [{ name: 'resourceType', type: 'string', required: true, description: '资源类型' }, { name: 'resourceId', type: 'string', required: true, description: '资源 ID' }, { name: 'payload', type: 'object', required: false, description: '业务输入' }], responseExample: JSON.stringify({ code: 0, message: 'ok', data: { requestId: 'req_1', traceId: 'tr_1', resourceType: 'agent', resourceId: '1', statusCode: 200, status: 'success', latencyMs: 124, body: '{\"answer\":\"ok\"}' } }, null, 2) },
  ]},
  { id: 'sandbox-sdk-grants', label: '沙箱/SDK/授权', endpoints: [
    { method: 'POST', path: '/sandbox/sessions', description: '创建沙箱会话（需 X-User-Id + X-Api-Key）', params: [{ name: 'ttlMinutes', type: 'number', required: false, description: '会话时长' }, { name: 'maxCalls', type: 'number', required: false, description: '最大调用次数' }], responseExample: JSON.stringify({ code: 0, message: 'ok', data: { sessionToken: 'sbx_xxx', maxCalls: 100, usedCalls: 0, status: 'active' } }, null, 2) },
    { method: 'POST', path: '/sdk/v1/invoke', description: 'SDK 稳定调用入口（X-Api-Key 必填）', params: [{ name: 'resourceType', type: 'string', required: true, description: '资源类型' }, { name: 'resourceId', type: 'string', required: true, description: '资源 ID' }], responseExample: JSON.stringify({ code: 0, message: 'ok', data: { requestId: 'sdk_req_1', traceId: 'sdk_tr_1', status: 'success' } }, null, 2) },
    { method: 'POST', path: '/resource-grants', description: '按 Grant 模型授权第三方 API Key 调用资源（非授权链接）', params: [{ name: 'resourceType', type: 'string', required: true, description: '资源类型' }, { name: 'resourceId', type: 'string', required: true, description: '资源 ID' }, { name: 'granteeApiKeyId', type: 'string', required: true, description: '被授权 API Key ID' }, { name: 'actions', type: 'string[]', required: true, description: 'catalog/resolve/invoke/*' }, { name: 'expiresAt', type: 'string', required: false, description: '过期时间（ISO）' }], responseExample: JSON.stringify({ code: 0, message: 'ok', data: { id: 'grant_1001', resourceType: 'mcp', resourceId: '56', actions: ['catalog', 'resolve', 'invoke'] } }, null, 2) },
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
  const { chromePageTitle } = useLayoutChrome();
  const isDark = theme === 'dark';
  const [activeCat, setActiveCat] = useState(API_CATEGORIES[0].id);
  const category = API_CATEGORIES.find((c) => c.id === activeCat)!;

  return (
    <div className={`flex-1 flex flex-col min-h-0 overflow-hidden transition-colors duration-300 ${canvasBodyBg(theme)}`}>
      <div className="w-full flex-1 min-h-0 flex flex-col px-2 sm:px-3 lg:px-4 py-2 sm:py-3">
        {/* Header */}
        <div className="mb-4 flex min-w-0 shrink-0 items-center gap-3">
          <div className={`shrink-0 rounded-xl p-2 ${isDark ? 'bg-blue-500/15' : 'bg-blue-50'}`}>
            <FileText size={20} className={isDark ? 'text-blue-400' : 'text-blue-600'} />
          </div>
          <PageTitleTagline subtitleOnly theme={theme} title={chromePageTitle || 'API 文档'} tagline="统一接口文档（仅保留接口） · Base URL: /api" />
        </div>

        <div
          className={`mb-4 shrink-0 rounded-xl border px-4 py-3 text-xs leading-relaxed ${
            isDark ? 'border-amber-500/25 bg-amber-500/10' : 'border-amber-200 bg-amber-50'
          }`}
        >
          <p className={`font-semibold ${isDark ? 'text-amber-100' : 'text-amber-950'}`}>X-Api-Key 填什么（与列表里看到的不同）</p>
          <p className={`mt-1.5 ${isDark ? 'text-amber-100/90' : 'text-amber-950/90'}`}>
            调用 <span className="font-mono">/invoke</span>、<span className="font-mono">/sdk/v1/*</span> 等需{' '}
            <span className="font-mono">X-Api-Key</span> 的接口时，请求头必须是<strong>创建接口</strong>{' '}
            <span className="font-mono">POST /user-settings/api-keys</span> 或 <span className="font-mono">POST /user-mgmt/api-keys</span>{' '}
            成功响应里的 <span className="font-mono">data.secretPlain</span>（完整 <span className="font-mono">sk_</span>…，仅该次响应返回）。
          </p>
          <p className={`mt-1.5 ${isDark ? 'text-amber-100/90' : 'text-amber-950/90'}`}>
            列表里的 <span className="font-mono">maskedKey</span>、<span className="font-mono">prefix</span>、行 <span className="font-mono">id</span> 均<strong>不能</strong>作为{' '}
            <span className="font-mono">X-Api-Key</span>。下文「API Key、Scope 与 Grant」含完整规则与 403 排查。
          </p>
        </div>

        <div
          className={`mb-4 shrink-0 rounded-2xl border px-4 py-4 text-sm leading-relaxed space-y-4 ${
            isDark ? 'border-white/[0.08] bg-white/[0.03]' : 'border-slate-200 bg-white'
          }`}
        >
          <div>
            <h3 className={`text-sm font-bold ${textPrimary(theme)}`}>API Key、Scope 与 Grant（详细）</h3>
            <p className={`mt-2 text-xs ${textSecondary(theme)}`}>
              与 handoff《资源注册-授权-调用》§7 及《权限、错误与路由》一致：是否允许调用由多层条件共同决定，并非「有 Key 即可调」。
            </p>
          </div>
          <div>
            <h4 className={`text-xs font-semibold ${textPrimary(theme)}`}>1. 何种字符串可以作为 X-Api-Key</h4>
            <ul className={`mt-1.5 list-disc pl-4 text-xs space-y-1 ${textSecondary(theme)}`}>
              <li>仅 <span className="font-mono">POST /user-settings/api-keys</span> 或 <span className="font-mono">POST /user-mgmt/api-keys</span> 成功响应中的 <span className="font-mono">data.secretPlain</span>（或等价完整明文字段，一般为 <span className="font-mono">sk_</span> 前缀 + 十六进制）。该值<strong>只在创建当次响应</strong>返回。</li>
              <li>列表/详情中的 <span className="font-mono">maskedKey</span>、<span className="font-mono">prefix</span>、表主键 <span className="font-mono">id</span>、授权申请里绑定的 apiKeyId 等均<strong>不能</strong>填入 <span className="font-mono">X-Api-Key</span>。网关将请求头整串与存库的 <span className="font-mono">key_hash</span> 比对。</li>
              <li>个人设置侧撤销 Key 多为<strong>软删除</strong>（<span className="font-mono">status=revoked</span>），列表接口仍可能返回该记录；控制台列表仅展示未撤销项。明文丢失无法找回时只能删键再建。</li>
            </ul>
          </div>
          <div>
            <h4 className={`text-xs font-semibold ${textPrimary(theme)}`}>2. API Key scope（第二层）</h4>
            <ul className={`mt-1.5 list-disc pl-4 text-xs space-y-1 ${textSecondary(theme)}`}>
              <li>目录、解析、调用要求 Key 具备网关认可的 <strong>scope</strong>，须覆盖 <span className="font-mono">catalog</span>、<span className="font-mono">resolve</span>、<span className="font-mono">invoke</span>（或 <span className="font-mono">catalog:*</span> 等形式及通配 <span className="font-mono">*</span>，以后端实现为准）。</li>
              <li>创建时若未传 <span className="font-mono">scopes</span> 或被存成空数组，可能出现「API Key scope 不允许」等 403。<strong>本控制台偏好设置「新建」</strong>会默认附带 <span className="font-mono">scopes: [&quot;*&quot;]</span>；历史空 scope 的 Key 请撤销后重建。</li>
              <li><strong>常见误区：</strong>仅有资源 Grant，而 Key 的 scope 不含 <span className="font-mono">invoke</span>（或等价），仍会 403。</li>
            </ul>
          </div>
          <div>
            <h4 className={`text-xs font-semibold ${textPrimary(theme)}`}>3. Resource Grant（第三层）</h4>
            <ul className={`mt-1.5 list-disc pl-4 text-xs space-y-1 ${textSecondary(theme)}`}>
              <li>访问<strong>非本人拥有</strong>的已发布资源时，除 scope 外还须具备 Grant（<span className="font-mono">POST /resource-grants</span> 或由 <span className="font-mono">/grant-applications</span> 审批通过后建立）。</li>
              <li>Grant 中 <span className="font-mono">granteeApiKeyId</span> 为 API Key 的<strong>记录 id</strong>，与请求头中的完整 <span className="font-mono">X-Api-Key</span> 明文不同。</li>
              <li><strong>常见误区：</strong>仅有 scope、对非自有资源无 Grant，会 403。</li>
            </ul>
          </div>
          <div>
            <h4 className={`text-xs font-semibold ${textPrimary(theme)}`}>4. 个人入口与管理入口</h4>
            <p className={`mt-1.5 text-xs ${textSecondary(theme)}`}>
              <span className="font-mono">/user-settings/api-keys</span> 面向当前登录用户；<span className="font-mono">/user-mgmt/api-keys</span> 为管理后台。规则相同，请勿混淆页面入口与鉴权串。
            </p>
          </div>
          <div>
            <h4 className={`text-xs font-semibold ${textPrimary(theme)}`}>5. 调用型 403 排查（建议顺序）</h4>
            <ol className={`mt-1.5 list-decimal pl-4 text-xs space-y-1 ${textSecondary(theme)}`}>
              <li>确认 <span className="font-mono">X-Api-Key</span> 是否为创建时的完整 <span className="font-mono">secretPlain</span>。</li>
              <li>在偏好设置中查看该 Key 的 scope；异常则删键重建。</li>
              <li>若调用他人资源，确认 Grant 或授权申请已通过，且绑定的是该 Key 的 id。</li>
              <li>顺带确认资源已 <span className="font-mono">published</span>，以及 RBAC / 管理接口头要求（本项目鉴权以实际网关为准）。</li>
            </ol>
          </div>
        </div>

        {/* Two-column layout */}
        <div
          className={`flex-1 min-h-0 flex rounded-[24px] overflow-hidden border ${
            isDark ? 'border-white/[0.06]' : 'border-slate-100'
          }`}
        >
          {/* Sidebar */}
          <div className={`w-52 shrink-0 overflow-y-auto ${glassSidebar(theme)}`}>
            <div className="p-3 space-y-1">
              <p className={`text-xs font-semibold uppercase tracking-wider px-3 py-2 ${textMuted(theme)}`}>API 分类</p>
              {API_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCat(cat.id)}
                  className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-left transition-colors text-sm ${
                    activeCat === cat.id
                      ? isDark ? 'bg-white/10 text-white font-semibold' : 'bg-neutral-100 text-neutral-900 font-semibold'
                      : isDark ? 'text-slate-400 hover:bg-white/5' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <ChevronRight size={14} className={activeCat === cat.id ? 'opacity-100' : 'opacity-40'} />
                  <span className="truncate">{cat.label}</span>
                  <span className={`ml-auto text-xs px-1.5 py-0.5 rounded-md ${isDark ? 'bg-white/5 text-slate-500' : 'bg-slate-100 text-slate-400'}`}>{cat.endpoints.length}</span>
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
                    <code className={`text-sm font-mono font-semibold ${textPrimary(theme)}`}>/api{ep.path}</code>
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
                    <button type="button" className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${isDark ? 'text-neutral-300 hover:text-neutral-300' : 'text-neutral-900 hover:text-neutral-800'}`} onClick={() => { window.dispatchEvent(new CustomEvent('navigate-to-playground', { detail: { method: ep.method, path: `/api${ep.path}` } })); }}>
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
