import React, { useState, useCallback } from 'react';
import {
  FileText, ExternalLink, Copy, Check, ChevronRight, BookOpen, Library,
  KeyRound, Terminal, Rocket, Tag, AlertCircle,
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { Theme, FontSize } from '../../types';
import type { ConsoleRole } from '../../constants/consoleRoutes';
import { buildPath, buildUserResourceMarketUrl } from '../../constants/consoleRoutes';
import { BentoCard } from '../../components/common/BentoCard';
import {
  glassSidebar, textPrimary, textSecondary, textMuted,
  btnSecondary,
} from '../../utils/uiClasses';
import { MgmtPageShell } from '../userMgmt/MgmtPageShell';
import { env } from '../../config/env';

/** 后端 servlet context-path，与文档中的完整 URL 展示一致 */
const API_CONTEXT_PREFIX = env.VITE_API_BASE_URL.replace(/\/$/, '');

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
    { method: 'GET', path: '/catalog/resources', description: '按 resourceType、keyword、status、tags 等查询资源目录（逛市场）。须至少有登录态（Authorization → X-User-Id）或 X-Api-Key 之一；二者可同时携带。', params: [{ name: 'page', type: 'number', required: false, description: '页码，默认 1' }, { name: 'pageSize', type: 'number', required: false, description: '每页，默认 20' }, { name: 'resourceType', type: 'string', required: false, description: 'agent/skill/mcp/app/dataset' }, { name: 'keyword', type: 'string', required: false, description: '关键字' }, { name: 'tags', type: 'string', required: false, description: '标签名筛选（格式以后端为准，可与 keyword 等组合）' }], responseExample: JSON.stringify({ code: 0, message: 'ok', data: { list: [{ resourceType: 'agent', resourceId: '1', resourceCode: 'course-advisor', displayName: '选课助手', status: 'published', tags: ['教务'], currentVersion: 'v1' }], total: 42, page: 1, pageSize: 20 } }, null, 2) },
    { method: 'GET', path: '/catalog/resources/{type}/{id}', description: '查询单个资源详情（逛市场）。头要求同 GET /catalog/resources；可与登录态同传 X-Api-Key。', params: [{ name: 'type', type: 'string', required: true, description: '资源类型' }, { name: 'id', type: 'string', required: true, description: '资源 ID' }], responseExample: JSON.stringify({ code: 0, message: 'ok', data: { resourceType: 'skill', resourceId: '9', resourceCode: 'weather-tool', displayName: '天气查询', status: 'published', currentVersion: 'v1' } }, null, 2) },
  ]},
  { id: 'resolve-invoke', label: '解析与调用', endpoints: [
    { method: 'POST', path: '/catalog/resolve', description: '执行向解析：将资源解析为可调用 endpoint/spec。**X-Api-Key 必填**（完整 secretPlain）；可与 Bearer 同传。另须 Key scope 含 resolve（或 *）；跨 owner 时尚需 Grant **或**资源 `accessPolicy` 为 `open_org` / `open_platform` 且满足网关短路条件（仍须 published；不改变 skill/dataset 的 invoke 边界）。', params: [{ name: 'resourceType', type: 'string', required: true, description: '资源类型' }, { name: 'resourceId', type: 'string', required: true, description: '资源 ID' }, { name: 'version', type: 'string', required: false, description: '版本号' }], responseExample: JSON.stringify({ code: 0, message: 'ok', data: { resourceType: 'agent', resourceId: '1', endpoint: 'https://gateway/invoke/agent/1', invokeType: 'http', version: 'v1' } }, null, 2) },
    { method: 'POST', path: '/invoke', description: '统一调用入口。**X-Api-Key 必填**。还须 Key scope 含 invoke（或 *）；跨 owner 时须 Grant 或符合 `accessPolicy` 短路。resourceType=**skill** 时网关**不接受**远程 invoke（技能走制品下载；可调用工具请注册为 MCP）。', params: [{ name: 'resourceType', type: 'string', required: true, description: '资源类型' }, { name: 'resourceId', type: 'string', required: true, description: '资源 ID' }, { name: 'payload', type: 'object', required: false, description: '业务输入' }], responseExample: JSON.stringify({ code: 0, message: 'ok', data: { requestId: 'req_1', traceId: 'tr_1', resourceType: 'agent', resourceId: '1', statusCode: 200, status: 'success', latencyMs: 124, body: '{\"answer\":\"ok\"}' } }, null, 2) },
    { method: 'POST', path: '/invoke-stream', description: '流式调用（SSE 等）。**X-Api-Key 必填**；权限模型与 /invoke 一致。', params: [{ name: 'resourceType', type: 'string', required: true, description: '资源类型' }, { name: 'resourceId', type: 'string', required: true, description: '资源 ID' }, { name: 'payload', type: 'object', required: false, description: '业务输入' }], responseExample: JSON.stringify({ code: 0, message: 'ok', data: {} }, null, 2) },
  ]},
  { id: 'grant-applications', label: '授权申请工单', endpoints: [
    { method: 'POST', path: '/grant-applications', description: '提交 Grant 申请工单。**须 X-User-Id**。通过后建立授权；提交会通知资源 owner 与平台管理员（与后端通知策略一致）。', params: [{ name: 'body', type: 'GrantApplicationRequest', required: true, description: '含 resourceType、resourceId、granteeApiKeyId、actions 等' }], responseExample: JSON.stringify({ code: 0, message: 'ok', data: { applicationId: 10001 } }, null, 2) },
    { method: 'GET', path: '/grant-applications/mine', description: '分页查询**我发起的**申请。**须 X-User-Id**。', params: [{ name: 'status', type: 'string', required: false, description: '状态筛选' }, { name: 'keyword / q', type: 'string', required: false, description: '关键字，二选一' }, { name: 'page', type: 'number', required: false, description: '页码' }, { name: 'pageSize', type: 'number', required: false, description: '每页条数' }], responseExample: JSON.stringify({ code: 0, message: 'ok', data: { list: [], total: 0, page: 1, pageSize: 20 } }, null, 2) },
    { method: 'GET', path: '/grant-applications/pending', description: '**待我审批**的申请列表。**须 X-User-Id**。可见范围由后端按操作者角色过滤：平台管理员全量；部门管理员仅 owner 属本部门的待办；开发者仅本人名下资源上的待办。**并非**仅平台管理员可见。', params: [{ name: 'status', type: 'string', required: false, description: '状态筛选' }, { name: 'keyword / q', type: 'string', required: false, description: '关键字' }, { name: 'page', type: 'number', required: false, description: '页码' }, { name: 'pageSize', type: 'number', required: false, description: '每页条数' }], responseExample: JSON.stringify({ code: 0, message: 'ok', data: { list: [], total: 0, page: 1, pageSize: 20 } }, null, 2) },
    { method: 'POST', path: '/grant-applications/{id}/approve', description: '审批通过。调用者须通过服务层校验（资源 owner / 全平台 reviewer / platform_admin 等与直接 Grant 管理能力一致）。', params: [{ name: 'id', type: 'number', required: true, description: '申请 ID（路径参数）' }], responseExample: JSON.stringify({ code: 0, message: 'ok', data: null }, null, 2) },
    { method: 'POST', path: '/grant-applications/{id}/reject', description: '驳回申请；body 含驳回原因。**权限同 approve**。', params: [{ name: 'id', type: 'number', required: true, description: '申请 ID' }, { name: 'reason', type: 'string', required: false, description: 'ResourceRejectRequest.reason' }], responseExample: JSON.stringify({ code: 0, message: 'ok', data: null }, null, 2) },
  ]},
  { id: 'owner-dashboard', label: 'Owner 资源成效', endpoints: [
    { method: 'GET', path: '/dashboard/owner-resource-stats', description: 'Owner 维度统计：**网关 invoke（call_log）**、**usage_record(action=invoke) 对照**、**技能包下载**等。**须 X-User-Id**；默认识别当前用户为 owner，管理角色可按后端策略传 ownerUserId。**调用量不等于门户内全部使用量**（见使用指南「调用数字的含义」）。', params: [{ name: 'periodDays', type: 'number', required: false, description: '统计天数，默认 7' }, { name: 'ownerUserId', type: 'number', required: false, description: '指定 owner 用户 ID（部门/平台管理员场景）' }], responseExample: JSON.stringify({ code: 0, message: 'ok', data: { ownerUserId: 1001, periodDays: 7, periodStart: '', periodEnd: '', gatewayInvokeTotal: 0, gatewayInvokeSuccess: 0, usageRecordInvokeTotal: 0, skillPackDownloadTotal: 0, gatewayInvokesByResourceType: [] } }, null, 2) },
  ]},
  { id: 'sandbox-sdk-grants', label: '沙箱/SDK/授权', endpoints: [
    { method: 'POST', path: '/sandbox/sessions', description: '创建沙箱会话（需 X-User-Id + X-Api-Key）', params: [{ name: 'ttlMinutes', type: 'number', required: false, description: '会话时长' }, { name: 'maxCalls', type: 'number', required: false, description: '最大调用次数' }], responseExample: JSON.stringify({ code: 0, message: 'ok', data: { sessionToken: 'sbx_xxx', maxCalls: 100, usedCalls: 0, status: 'active' } }, null, 2) },
    { method: 'POST', path: '/sdk/v1/invoke', description: 'SDK 稳定调用入口（X-Api-Key 必填）', params: [{ name: 'resourceType', type: 'string', required: true, description: '资源类型' }, { name: 'resourceId', type: 'string', required: true, description: '资源 ID' }], responseExample: JSON.stringify({ code: 0, message: 'ok', data: { requestId: 'sdk_req_1', traceId: 'sdk_tr_1', status: 'success' } }, null, 2) },
    { method: 'POST', path: '/resource-grants', description: '按 Grant 模型授权第三方 API Key 调用资源。若资源 accessPolicy 已允许 open_org/open_platform 短路，则可能无需本条；仍以网关校验为准。', params: [{ name: 'resourceType', type: 'string', required: true, description: '资源类型' }, { name: 'resourceId', type: 'string', required: true, description: '资源 ID' }, { name: 'granteeApiKeyId', type: 'string', required: true, description: '被授权 API Key ID' }, { name: 'actions', type: 'string[]', required: true, description: 'catalog/resolve/invoke/*' }, { name: 'expiresAt', type: 'string', required: false, description: '过期时间（ISO）' }], responseExample: JSON.stringify({ code: 0, message: 'ok', data: { id: 'grant_1001', resourceType: 'mcp', resourceId: '56', actions: ['catalog', 'resolve', 'invoke'] } }, null, 2) },
  ]},
];

const GUIDE_TOC: { id: string; label: string }[] = [
  { id: 'doc-intro', label: '简介' },
  { id: 'doc-roles', label: '账号与角色' },
  { id: 'doc-discover', label: '发现资源' },
  { id: 'doc-consume', label: '完成一次调用' },
  { id: 'doc-access-policy', label: '消费策略与授权' },
  { id: 'doc-publish', label: '发布资源' },
  { id: 'doc-types', label: '资源类型' },
  { id: 'doc-meta', label: '标签与版本' },
  { id: 'doc-metrics', label: '调用数字的含义' },
  { id: 'doc-faq', label: '常见问题' },
];

function CopyButton({ text, isDark }: { text: string; isDark: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <button type="button" onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }} className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-white/10 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`} title="复制">
      {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
    </button>
  );
}

function prosePara(theme: Theme, children: React.ReactNode) {
  return <p className={`text-[15px] leading-7 ${textSecondary(theme)}`}>{children}</p>;
}

function proseH2(theme: Theme, children: React.ReactNode) {
  return <h2 className={`scroll-mt-24 text-xl font-bold tracking-tight ${textPrimary(theme)}`}>{children}</h2>;
}

function proseH3(theme: Theme, children: React.ReactNode) {
  return <h3 className={`scroll-mt-24 mt-8 text-base font-semibold ${textPrimary(theme)}`}>{children}</h3>;
}

export interface ApiDocsPageProps { theme: Theme; fontSize: FontSize; }

export const ApiDocsPage: React.FC<ApiDocsPageProps> = ({ theme, fontSize }) => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const consoleRole: ConsoleRole = pathname.startsWith('/admin') ? 'admin' : 'user';
  const isDark = theme === 'dark';
  const [viewMode, setViewMode] = useState<'guide' | 'reference'>('guide');
  const [activeCat, setActiveCat] = useState(API_CATEGORIES[0].id);
  const category = API_CATEGORIES.find((c) => c.id === activeCat)!;

  const go = useCallback((page: string) => {
    navigate(buildPath(consoleRole, page));
  }, [navigate, consoleRole]);

  const scrollToId = useCallback((id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const tabBtn = (mode: 'guide' | 'reference', label: string) => (
    <button
      key={mode}
      type="button"
      onClick={() => setViewMode(mode)}
      className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
        viewMode === mode
          ? (isDark ? 'bg-white/10 text-white shadow-sm' : 'bg-white text-neutral-900 shadow-sm ring-1 ring-slate-200')
          : (isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900')
      }`}
    >
      {label}
    </button>
  );

  const docsToolbar = (
    <div className={`flex shrink-0 rounded-xl p-1 ${isDark ? 'bg-white/[0.06]' : 'bg-slate-200/80'}`}>
      {tabBtn('guide', '使用指南')}
      {tabBtn('reference', '接口参考')}
    </div>
  );

  return (
    <MgmtPageShell
      theme={theme}
      fontSize={fontSize}
      titleIcon={BookOpen}
      breadcrumbSegments={['开发者中心', '接入指南']}
      description="从浏览资源到完成调用的使用指南 · 接口与示例见「接口参考」"
      toolbar={docsToolbar}
      contentScroll="document"
    >
      <div className="min-h-0 w-full flex flex-col px-4 sm:px-6 pb-8">
        {viewMode === 'guide' && (
          <div
            className={`flex-1 min-h-0 flex rounded-[24px] overflow-hidden border ${
              isDark ? 'border-white/[0.06]' : 'border-slate-100'
            }`}
          >
            <div className={`hidden md:flex w-56 shrink-0 flex-col overflow-y-auto ${glassSidebar(theme)}`}>
              <div className="sticky top-0 p-4">
                <p className={`text-xs font-semibold uppercase tracking-wider ${textMuted(theme)}`}>本页目录</p>
                <nav className="mt-3 space-y-0.5 border-l-2 pl-3" style={{ borderColor: isDark ? 'rgba(16,185,129,0.35)' : 'rgba(16,185,129,0.45)' }}>
                  {GUIDE_TOC.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => scrollToId(item.id)}
                      className={`block w-full text-left py-1.5 text-[13px] transition-colors rounded-r-md pr-2 ${
                        isDark ? 'text-slate-400 hover:text-emerald-300' : 'text-slate-600 hover:text-emerald-700'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </nav>
              </div>
            </div>

            <div className="flex-1 min-w-0 overflow-y-auto">
              <article className={`mx-auto max-w-3xl px-4 py-6 sm:px-8 sm:py-10 ${isDark ? '' : ''}`}>
                <div className="md:hidden mb-6 flex flex-wrap gap-2">
                  {GUIDE_TOC.map((item) => (
                    <button key={item.id} type="button" onClick={() => scrollToId(item.id)} className={`rounded-full px-3 py-1 text-xs font-medium ${isDark ? 'bg-white/10 text-slate-300' : 'bg-slate-100 text-slate-700'}`}>
                      {item.label}
                    </button>
                  ))}
                </div>

                <section id="doc-intro" className="space-y-4">
                  {proseH2(theme, '这个平台能帮你做什么？')}
                  {prosePara(theme, (
                    <>
                      产品与后端契约以门户<strong className={textPrimary(theme)}> 数字化资产与可调用能力 </strong>为一体：统一注册、目录发现、按权消费。Agent / MCP 等走统一网关 <span className="font-mono">resolve</span> / <span className="font-mono">invoke</span>；技能包以制品下载为主（不提供 <span className="font-mono">skill</span> 的网关 invoke）；应用与数据集以发现、解析与接入为主。详细边界见产品锚点说明与《前端对接后端标准说明书》（后端 <span className="font-mono">docs/</span> 目录）。
                    </>
                  ))}
                  {prosePara(theme, (
                    <>
                      所有 HTTP 接口的前缀为上下文路径 <code className={`rounded px-1.5 py-0.5 font-mono text-sm ${isDark ? 'bg-white/10' : 'bg-slate-100'}`}>{API_CONTEXT_PREFIX}</code>
                      （例如完整地址形如 <code className={`rounded px-1.5 py-0.5 font-mono text-sm ${isDark ? 'bg-white/10' : 'bg-slate-100'}`}>https://你的域名{API_CONTEXT_PREFIX}/catalog/resources</code>）。
                    </>
                  ))}
                  <div className={`rounded-xl border px-4 py-3 text-sm ${isDark ? 'border-amber-500/25 bg-amber-500/10 text-amber-100/90' : 'border-amber-200 bg-amber-50 text-amber-950'}`}>
                    <p className="flex items-start gap-2 font-medium">
                      <AlertCircle size={16} className="mt-0.5 shrink-0" />
                      <span>
                        <strong className={textPrimary(theme)}>强统一：</strong>
                        浏览目录可用登录态（JWT）；<span className="font-mono">POST /catalog/resolve</span>、<span className="font-mono">POST /invoke</span>、<span className="font-mono">POST /invoke-stream</span> 均须带有效的{' '}
                        <span className="font-mono">X-Api-Key</span>（创建 Key 当次返回的完整 <span className="font-mono">secretPlain</span>），不能填列表掩码或记录 id。细则见「接口参考」。
                      </span>
                    </p>
                  </div>
                </section>

                <section id="doc-roles" className="mt-14 space-y-4">
                  {proseH2(theme, '账号与角色')}
                  {prosePara(theme, '登录后，你的能力取决于平台分配的角色：平台管理员负责全平台治理；部门管理员管理本部门的开发者与消费者；开发者负责五类资源的登记/维护及与自身资源相关的审核流；消费者使用已上架资源（目录浏览、Grant、个人 API Key 调用等），可申请开发者入驻，并进行个人资料与安全设置——不包含资源注册、发布与平台级审核。自助注册账号通常默认为消费者；若账号尚无开发者角色而需要登记资源，可先提交入驻申请，由管理员审批开通。')}
                  {prosePara(theme, '前端路由里的 admin / user 只是视图壳层，不是后端角色名：管理后台与「我的」工作台是两套导航域，与 platform_admin / reviewer / developer / user 等后端角色不同，判权以 JWT + 后端接口为准（见对接手册 §2.8）。')}
                  {prosePara(theme, '下文「完成一次调用」对个人开发者与师生用户同样适用：执行向（resolve / invoke / invoke-stream）都必须携带本人有效 API Key；仅浏览目录可主要靠登录态。调用他人名下资源时，在 Key 与 scope 之外还需要 Grant、或资源配置的访问策略允许短路（见「消费策略与授权」）。')}
                </section>

                <section id="doc-discover" className="mt-14 space-y-4">
                  {proseH2(theme, '在平台里发现资源')}
                  {prosePara(theme, '在侧栏进入「探索发现」或各资源市场，可按类型浏览已发布资源。需要程序化检索时，使用开放接口 GET /catalog/resources，支持类型、关键字、状态以及按标签名筛选（详见「接口参考 → 统一资源目录」）。')}
                  <div className="flex flex-wrap gap-2 pt-1">
                    <button type="button" onClick={() => go('hub')} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium ${btnSecondary(theme)}`}>
                      <Library size={16} /> 探索发现
                    </button>
                    <button type="button" onClick={() => navigate(buildUserResourceMarketUrl('skill'))} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium ${btnSecondary(theme)}`}>
                      <Library size={16} /> 技能市场
                    </button>
                  </div>
                </section>

                <section id="doc-consume" className="mt-14 space-y-4">
                  {proseH2(theme, '完成一次调用（调用方必读）')}
                  {proseH3(theme, '1. 准备 API Key')}
                  {prosePara(theme, '在「个人设置」中创建 API Key，并保存创建成功时返回的完整密钥；同时确认 Key 的 scope 覆盖 catalog / resolve / invoke（或使用通配，控制台新建通常会默认带全权限）。')}
                  {proseH3(theme, '2. 是否还需要授权？')}
                  {prosePara(theme, '平台按「API Key + Scope + Resource Grant」三层校验：仅有 Key 不足以调用他人名下的已发布资源——还需要针对你的 Key 的授权记录（Grant），或通过「我的授权申请」等流程审批通过后由系统自动建立。Grant 里填写的是 Key 的记录 id，不是密钥明文。')}
                  {proseH3(theme, '3. 解析与调用')}
                  {prosePara(theme, '两次请求都须在请求头带 X-Api-Key：先 POST /catalog/resolve 拿到可调用信息，再 POST /invoke（或流式用 POST /invoke-stream）传入 resourceType、resourceId 与业务 payload。需要固定版本时可在解析/调用体中携带 version。控制台「API 调试」试用时也请手动填好 Key（或由本地存储注入）。')}
                  <div className="flex flex-wrap gap-2 pt-1">
                    <button type="button" onClick={() => go('preferences')} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium ${btnSecondary(theme)}`}>
                      <KeyRound size={16} /> 个人设置（API Key）
                    </button>
                    <button type="button" onClick={() => go('grant-applications')} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium ${btnSecondary(theme)}`}>
                      <FileText size={16} /> 授权审批待办
                    </button>
                    <button type="button" onClick={() => go('my-grant-applications')} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium ${btnSecondary(theme)}`}>
                      <FileText size={16} /> 我的授权申请
                    </button>
                    <button type="button" onClick={() => go('api-playground')} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium ${btnSecondary(theme)}`}>
                      <Terminal size={16} /> API 调试
                    </button>
                    <button type="button" onClick={() => go('sdk-download')} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium ${btnSecondary(theme)}`}>
                      <Rocket size={16} /> SDK 下载
                    </button>
                  </div>
                </section>

                <section id="doc-access-policy" className="mt-14 space-y-4">
                  {proseH2(theme, '资源消费策略与授权')}
                  {prosePara(theme, '除 API Key scope 与 per-resource Grant 外，每条资源可有 accessPolicy（注册/更新时写入，默认 grant_required）：grant_required 须 Grant（及 Key scope）；open_org 在「Key 为用户 Key 且与资源 owner 同部门（menu_id）」时可免 Grant；open_platform 在租户内已认证 Key 且 scope 满足时可免 Grant。策略仅短路 Grant 校验，资源仍须 published，且不改变 skill 禁止 invoke、dataset 无统一 invoke 等产品边界（详见 PRODUCT_DEFINITION §4）。')}
                  {prosePara(theme, 'Grant 工单：提交 POST /grant-applications 后，待办会出现在「授权审批待办」中——资源 owner、全平台 reviewer、platform_admin 均可审批。通过后与直接 POST /resource-grants 等效建立授权。')}
                </section>

                <section id="doc-publish" className="mt-14 space-y-4">
                  {proseH2(theme, '发布资源（资源作者）')}
                  {prosePara(theme, '在「我的发布 / 资源中心」创建资源后，状态从草稿开始：提交审核 → 审核通过后进入 testing → **须再执行「发布」**才变为 published 并在目录中对调用方可见。请牢记：审核通过不等于已经上架。发布动作可由 owner、全平台 reviewer 或 platform_admin/admin 执行（与 Grant 代管范围一致）。')}
                  {prosePara(theme, '下架、版本管理与 accessPolicy 等也在同一工作流中维护；具体按钮以控制台当前菜单为准。')}
                  <div className="flex flex-wrap gap-2 pt-1">
                    <button type="button" onClick={() => go('resource-center')} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium ${btnSecondary(theme)}`}>
                      <Rocket size={16} /> 我的发布 · 资源中心
                    </button>
                  </div>
                </section>

                <section id="doc-types" className="mt-14 space-y-4">
                  {proseH2(theme, '五类资源怎么用？')}
                  <ul className={`list-disc space-y-2 pl-5 text-[15px] leading-7 ${textSecondary(theme)}`}>
                    <li><strong className={textPrimary(theme)}>agent</strong>：<span className="font-mono">resolve</span> 后 <span className="font-mono">invoke</span> / <span className="font-mono">invoke-stream</span>（已 published）。</li>
                    <li><strong className={textPrimary(theme)}>mcp</strong>：同上，流式场景用 <span className="font-mono">invoke-stream</span>。</li>
                    <li><strong className={textPrimary(theme)}>skill</strong>：<span className="font-mono">resolve</span> + 技能制品下载；网关<strong className={textPrimary(theme)}> 不接受 </strong><span className="font-mono">resourceType=skill</span> 的 <span className="font-mono">invoke</span>。远程可执行工具请注册为 <strong className={textPrimary(theme)}>mcp</strong>。</li>
                    <li><strong className={textPrimary(theme)}>app</strong>：以 <span className="font-mono">resolve</span> 获取 launch 信息为主；浏览器打开 launchUrl 可能不经过网关 invoke。若走 <span className="font-mono">invoke</span>，多为 redirect/票据语义。</li>
                    <li><strong className={textPrimary(theme)}>dataset</strong>：<span className="font-mono">resolve</span> 读元数据；无通用远程 <span className="font-mono">invoke</span> 执行模型。</li>
                  </ul>
                </section>

                <section id="doc-meta" className="mt-14 space-y-4">
                  {proseH2(theme, '标签与版本')}
                  {prosePara(theme, '目录列表接口可以返回每条资源的标签名字段 tags，并支持用 query tags 按标签名过滤——与用户侧看到的「目录标签」一致。数据集表单里的「标签」文案可能与目录标签来源不同：只有与平台标签库精确匹配的名字才会同时参与目录关联。')}
                  {prosePara(theme, '列表或详情中的 currentVersion 表示当前生效版本展示；若调用需要锁定某一版本，可在 resolve / invoke 请求中传入 version。')}
                  <div className="flex flex-wrap gap-2 pt-1">
                    <button type="button" onClick={() => setViewMode('reference')} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium ${isDark ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-100 text-emerald-800'}`}>
                      <Tag size={16} /> 在「接口参考」中查看目录参数
                    </button>
                  </div>
                </section>

                <section id="doc-metrics" className="mt-14 space-y-4">
                  {proseH2(theme, '调用数字的含义')}
                  {prosePara(theme, '监控与工作台常见的 call_log、usage_record（action=invoke）主要反映「统一网关远程调用」，不是门户内每一次「打开页面 / 下载技能包 / 仅 resolve」的全部使用量。技能包成功下载有单独埋点；控制台「资源成效统计」对接 GET /dashboard/owner-resource-stats，口径以后端聚合为准（详见 PRODUCT_DEFINITION §5）。')}
                </section>

                <section id="doc-faq" className="mt-14 space-y-4">
                  {proseH2(theme, '常见问题')}
                  {proseH3(theme, '调用返回 403？')}
                  <ol className={`list-decimal space-y-2 pl-5 text-[15px] leading-7 ${textSecondary(theme)}`}>
                    <li>确认 X-Api-Key 是否为创建时的完整 secretPlain。</li>
                    <li>检查 Key 的 scope 是否含 invoke（或通配）。</li>
                    <li>若资源不属于你，确认 Grant 或授权申请已通过且绑定的是该 Key 的 id。</li>
                    <li>确认资源已是 published。</li>
                  </ol>
                  {proseH3(theme, '健康检查 503？')}
                  {prosePara(theme, '若部署环境未启动消息队列等依赖，聚合健康检查可能整体不健康；可结合运维侧各子指示器排查，不一定表示业务接口全部不可用。')}
                </section>

                <footer className={`mt-16 border-t pt-8 ${isDark ? 'border-white/[0.08]' : 'border-slate-200'}`}>
                  <p className={`text-sm ${textMuted(theme)}`}>更完整的请求字段、响应示例与 Playground 联动请切换到「接口参考」。</p>
                </footer>
              </article>
            </div>
          </div>
        )}

        {viewMode === 'reference' && (
          <>
            <div
              className={`mb-4 shrink-0 rounded-xl border px-4 py-3 text-xs leading-relaxed ${
                isDark ? 'border-amber-500/25 bg-amber-500/10' : 'border-amber-200 bg-amber-50'
              }`}
            >
              <p className={`font-semibold ${isDark ? 'text-amber-100' : 'text-amber-950'}`}>X-Api-Key 填什么（与列表里看到的不同）</p>
              <p className={`mt-1.5 ${isDark ? 'text-amber-100/90' : 'text-amber-950/90'}`}>
                调用 <span className="font-mono">/catalog/resolve</span>、<span className="font-mono">/invoke</span>、<span className="font-mono">/invoke-stream</span>、<span className="font-mono">/sdk/v1/*</span> 等需{' '}
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
                  是否允许调用由多层条件共同决定，并非「有 Key 即可调」。
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
                  <li>访问<strong>非本人拥有</strong>的已发布资源时，除 scope 外还须具备 Grant（<span className="font-mono">POST /resource-grants</span> 或由工单审批），或资源 <span className="font-mono">accessPolicy</span> 允许在网关侧短路 Grant（仍须 published 与 scope）。待办由<strong>资源拥有者</strong>、<strong>全平台审核员 reviewer</strong>或<strong>平台超管</strong>处理；入口为「授权审批待办」与后台同源列表。</li>
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

            <div
              className={`flex-1 min-h-0 flex rounded-[24px] overflow-hidden border ${
                isDark ? 'border-white/[0.06]' : 'border-slate-100'
              }`}
            >
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

              <div className="flex-1 min-w-0 overflow-y-auto p-4 sm:p-6 space-y-4">
                <h2 className={`text-base font-bold ${textPrimary(theme)}`}>{category.label}</h2>
                {category.endpoints.map((ep, idx) => {
                  const mc = METHOD_COLORS[ep.method];
                  return (
                    <BentoCard key={idx} theme={theme}>
                      <div className="flex flex-wrap items-center gap-3 mb-3">
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${isDark ? mc.dark : mc.light}`}>{ep.method}</span>
                        <code className={`text-sm font-mono font-semibold ${textPrimary(theme)}`}>{API_CONTEXT_PREFIX}{ep.path}</code>
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
                        <button type="button" className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${isDark ? 'text-neutral-300 hover:text-neutral-300' : 'text-neutral-900 hover:text-neutral-800'}`} onClick={() => { window.dispatchEvent(new CustomEvent('navigate-to-playground', { detail: { method: ep.method, path: `${API_CONTEXT_PREFIX}${ep.path}` } })); }}>
                          <ExternalLink size={13} /> 在 Playground 中试用
                        </button>
                      </div>
                    </BentoCard>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </MgmtPageShell>
  );
};
