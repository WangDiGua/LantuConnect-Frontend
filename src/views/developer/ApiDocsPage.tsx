import React, { useState, useCallback, useEffect } from 'react';
import {
  FileText, ExternalLink, Copy, Check, ChevronRight, BookOpen, Library,
  KeyRound, Terminal, Rocket, Tag, AlertCircle, Puzzle,
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { Theme, FontSize } from '../../types';
import type { ConsoleRole } from '../../constants/consoleRoutes';
import { buildPath, buildUserResourceMarketUrl, inferConsoleRole, parseRoute } from '../../constants/consoleRoutes';
import { useUserRole } from '../../context/UserRoleContext';
import { unifiedResourceCenterPath } from '../../utils/unifiedResourceCenterPath';
import { BentoCard } from '../../components/common/BentoCard';
import {
  glassSidebar,
  textPrimary, textSecondary, textMuted,
  btnSecondary,
} from '../../utils/uiClasses';
import { MgmtPageShell } from '../userMgmt/MgmtPageShell';
import { env } from '../../config/env';

/** 后端 servlet context-path，与文档中的完整 URL 展示一致 */
const API_CONTEXT_PREFIX = env.VITE_API_BASE_URL.replace(/\/$/, '');
const PLAYGROUND_PREFILL_STORAGE_KEY = 'lantu_playground_prefill';

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
    { method: 'POST', path: '/user-settings/api-keys', description: '创建个人 API Key。成功时 data.secretPlain（或 plainKey）为完整可调用密钥，仅该次响应返回。须为 Key 配置 scope（catalog/resolve/invoke 或 *），否则网关提示 scope 不足；前端默认传 scopes:["*"]。已发布资源在具备 scope 的前提下可被任意调用方按网关规则使用。列表中的 maskedKey、prefix、id 均不能作为 X-Api-Key。', params: [{ name: 'name', type: 'string', required: true, description: '密钥名称' }, { name: 'scopes', type: 'string[]', required: false, description: '权限范围；不传时前端默认 ["*"]' }], responseExample: JSON.stringify({ code: 0, message: 'ok', data: { id: 'uuid', name: 'dev', prefix: 'sk_', scopes: ['*'], secretPlain: 'sk_' + 'a'.repeat(32) } }, null, 2) },
    { method: 'GET', path: '/user-settings/api-keys', description: '列出当前用户的 Key；仅掩码与前缀，不包含完整密钥。', params: [], responseExample: JSON.stringify({ code: 0, message: 'ok', data: [{ id: 'uuid', name: 'dev', maskedKey: 'sk_3****', prefix: 'sk_' }] }, null, 2) },
    { method: 'POST', path: '/user-settings/api-keys/{id}/revoke', description: '撤销 API Key。须 `password`（登录密码）；账户未设置密码时须先在个人设置修改密码。成功/失败均写入敏感操作审计。', params: [{ name: 'password', type: 'string', required: false, description: '登录密码' }], responseExample: JSON.stringify({ code: 0, message: 'ok', data: null }, null, 2) },
    { method: 'POST', path: '/user-settings/api-keys/{id}/rotate', description: '轮换 API Key 明文（库内仅存摘要，无法「找回」原串）。须校验登录密码；成功后返回新 `secretPlain`，旧明文立即失效。', params: [{ name: 'password', type: 'string', required: false, description: '登录密码' }], responseExample: JSON.stringify({ code: 0, message: 'ok', data: { id: 'uuid', name: 'dev', scopes: ['*'], secretPlain: 'sk_' + 'a'.repeat(32), expiresAt: null, revoked: false } }, null, 2) },
    { method: 'DELETE', path: '/user-settings/api-keys/{id}', description: '**已废弃**：HTTP 410 Gone；请改用 POST `/user-settings/api-keys/{id}/revoke`。', params: [], responseExample: JSON.stringify({ code: 4015, message: '请改用 POST .../revoke' }, null, 2) },
  ]},
  { id: 'auth', label: '认证 (Auth)', endpoints: [
    { method: 'POST', path: '/auth/login', description: '用户登录，返回 token / refreshToken / user', params: [{ name: 'username', type: 'string', required: true, description: '用户名/工号' }, { name: 'password', type: 'string', required: true, description: '密码' }], responseExample: JSON.stringify({ code: 0, message: 'ok', data: { token: 'eyJ...', refreshToken: 'rt_...', user: { id: '1001', username: 'alice', role: 'developer' } } }, null, 2) },
    { method: 'POST', path: '/auth/refresh', description: '使用 refreshToken 刷新 token', params: [{ name: 'refreshToken', type: 'string', required: true, description: '刷新令牌' }], responseExample: JSON.stringify({ code: 0, message: 'ok', data: { token: 'eyJ...', refreshToken: 'rt_new' } }, null, 2) },
  ]},
  { id: 'catalog', label: '统一资源目录', endpoints: [
    { method: 'GET', path: '/catalog/resources', description: '按 resourceType、keyword、status、tags、sortBy 等查询资源目录（逛市场）。列表项含创建者、目录聚合评分与评论数等；**skill** 为 **Context** 规范文档，列表/详情可含 **executionMode**（**context**）。须至少有登录态（Authorization → X-User-Id）或 X-Api-Key 之一；二者可同时携带。', params: [{ name: 'page', type: 'number', required: false, description: '页码，默认 1' }, { name: 'pageSize', type: 'number', required: false, description: '每页，默认 10' }, { name: 'resourceType', type: 'string', required: false, description: 'agent/skill/mcp/app/dataset' }, { name: 'keyword', type: 'string', required: false, description: '关键字' }, { name: 'status', type: 'string', required: false, description: '如 published' }, { name: 'sortBy', type: 'string', required: false, description: 'callCount / rating / publishedAt / name（以后端为准）' }, { name: 'sortOrder', type: 'string', required: false, description: 'asc / desc' }, { name: 'tags', type: 'string', required: false, description: '标签名筛选（格式以后端为准，可与 keyword 等组合）' }], responseExample: JSON.stringify({ code: 0, message: 'ok', data: { list: [{ resourceType: 'agent', resourceId: '1', resourceCode: 'course-advisor', displayName: '选课助手', status: 'published', tags: ['教务'], updateTime: '2026-04-01T10:00:00', createdBy: 1001, createdByName: 'alice', ratingAvg: 4.5, reviewCount: 12 }, { resourceType: 'skill', resourceId: '9', executionMode: 'context', displayName: '示例 Context 技能 A', status: 'published' }, { resourceType: 'skill', resourceId: '10', executionMode: 'context', displayName: '示例 Context 技能 B', status: 'published' }], total: 42, page: 1, pageSize: 10 } }, null, 2) },
    { method: 'GET', path: '/catalog/resources/{type}/{id}', description: '查询单个资源详情（目录项 + 解析字段，逛市场）。含 createdBy / createdByName 等。可选 query include=closure|bindings|bindingClosure 展开绑定闭包（Agent↔MCP、Skill↔MCP 等）。头要求同 GET /catalog/resources；可与登录态同传 X-Api-Key。', params: [{ name: 'type', type: 'string', required: true, description: '资源类型' }, { name: 'id', type: 'string', required: true, description: '资源 ID' }, { name: 'include', type: 'string', required: false, description: '如 closure、bindings、bindingClosure（逗号分隔，以后端为准）' }], responseExample: JSON.stringify({ code: 0, message: 'ok', data: { resourceType: 'skill', resourceId: '9', resourceCode: 'weather-tool', displayName: '天气查询', status: 'published', executionMode: 'context', createdBy: 1001, createdByName: 'alice', invokeType: 'portal_context', endpoint: null, tags: ['工具'] } }, null, 2) },
    { method: 'GET', path: '/catalog/resources/{type}/{id}/stats', description: '资源使用与口碑摘要（调用量、成功率、评分、收藏、趋势、相关推荐）。无评论时 rating 为 null；callTrend 为按日的 cnt 列表。头要求同 GET /catalog/resources。', params: [{ name: 'type', type: 'string', required: true, description: '资源类型' }, { name: 'id', type: 'string', required: true, description: '资源 ID' }], responseExample: JSON.stringify({ code: 0, message: 'ok', data: { callCount: 1200, successRate: 98.5, rating: 4.2, favoriteCount: 15, callTrend: [{ day: '2026-04-01', cnt: 40 }], relatedResources: [] } }, null, 2) },
    { method: 'GET', path: '/catalog/resources/trending', description: '热门/趋势资源（工作台「探索发现」等可用）；可按 resourceType 筛选。', params: [{ name: 'resourceType', type: 'string', required: false, description: 'agent/skill/mcp/...' }, { name: 'limit', type: 'number', required: false, description: '默认 10' }], responseExample: JSON.stringify({ code: 0, message: 'ok', data: [{ resourceType: 'agent', resourceId: '1', displayName: '示例' }] }, null, 2) },
    { method: 'GET', path: '/catalog/resources/search-suggestions', description: '目录搜索补全建议，参数 q 为前缀。', params: [{ name: 'q', type: 'string', required: true, description: '搜索前缀' }], responseExample: JSON.stringify({ code: 0, message: 'ok', data: [{ text: '选课', type: 'agent' }] }, null, 2) },
    { method: 'GET', path: '/catalog/apps/launch', description: '应用启动：匿名可访问，消费 resolve 下发的短期 launchToken 后 302 跳转真实 app_url；服务端校验 token 绑定的 Key 仍有效且具备 resolve 等所需 scope。', params: [{ name: 'token', type: 'string', required: true, description: 'launchToken' }], responseExample: 'HTTP 302 → appUrl' },
  ]},
  { id: 'reviews', label: '资源评论', endpoints: [
    { method: 'GET', path: '/reviews/page', description: '分页查询某资源的评论（替代全量 GET /reviews）。须至少有 X-User-Id（登录）或 X-Api-Key 之一，策略与 GET /catalog/resources 一致。', params: [{ name: 'targetType', type: 'string', required: true, description: 'agent/skill/mcp/app/dataset' }, { name: 'targetId', type: 'string | number', required: true, description: '资源 ID' }, { name: 'page', type: 'number', required: false, description: '页码' }, { name: 'pageSize', type: 'number', required: false, description: '每页条数' }], responseExample: JSON.stringify({ code: 0, message: 'ok', data: { list: [{ id: 1, targetType: 'mcp', targetId: 56, userId: 1002, userName: 'bob', rating: 5, content: '稳定可用', createTime: '2026-04-01T10:00:00' }], total: 3, page: 1, pageSize: 20 } }, null, 2) },
  ]},
  { id: 'resolve-invoke', label: '解析与调用', endpoints: [
    { method: 'POST', path: '/catalog/resolve', description: '执行向解析：将资源解析为 endpoint/spec。**X-Api-Key 必填**（完整 secretPlain）；可与 Bearer 同传。另须 Key scope 含 resolve（或 *）；**已发布**资源在网关侧对调用方开放。**skill** 为 **Context**：返回 `invokeType=portal_context`、规范正文与绑定 MCP；**不可**用 **POST /invoke**（`resourceType=skill` 将被拒绝）。可选 `include` 展开闭包，与 GET 详情一致。', params: [{ name: 'resourceType', type: 'string', required: true, description: '资源类型' }, { name: 'resourceId', type: 'string', required: true, description: '资源 ID' }, { name: 'version', type: 'string', required: false, description: '版本号' }, { name: 'include', type: 'string', required: false, description: '可选 closure / bindings / bindingClosure' }], responseExample: JSON.stringify({ code: 0, message: 'ok', data: { resourceType: 'agent', resourceId: '1', endpoint: 'https://gateway/invoke/agent/1', invokeType: 'http', version: 'v1' } }, null, 2) },
    { method: 'POST', path: '/invoke', description: '统一调用入口。**X-Api-Key 必填**。还须 Key scope 含 invoke（或 *）；**已发布**资源可被具备 scope 的调用方使用。**resourceType=skill 不支持**（技能仅目录/resolve 消费）。适用于 **agent**、**mcp** 等。**绑定展开**：`agent` 且存在 `agent_depends_mcp` 时，网关在转发前把绑定 MCP 的 `tools/list` 聚合写入 **`payload._lantu.bindingExpansion`**；另可在 **`payload` 或 `payload._lantu` 声明 `activeSkillIds`**（Skill 资源 id 列表），在开启 `merge-active-skill-mcps` 时合并各 Skill 上 `skill_depends_mcp`；仅 invoke `mcp` 不反向拉起 Agent。配置项 `lantu.gateway.binding-expansion` 可关闭。', params: [{ name: 'resourceType', type: 'string', required: true, description: '资源类型（不含 skill）' }, { name: 'resourceId', type: 'string', required: true, description: '资源 ID' }, { name: 'payload', type: 'object', required: false, description: '业务输入；展开时合并 _lantu.bindingExpansion（保留 payload._lantu 其它子键）；可选 activeSkillIds' }], responseExample: JSON.stringify({ code: 0, message: 'ok', data: { requestId: 'req_1', traceId: 'tr_1', resourceType: 'agent', resourceId: '1', statusCode: 200, status: 'success', latencyMs: 124, body: '{\"answer\":\"ok\"}' } }, null, 2) },
    { method: 'POST', path: '/invoke-stream', description: '流式调用（SSE 等）。**X-Api-Key 必填**；权限模型与 /invoke 一致。', params: [{ name: 'resourceType', type: 'string', required: true, description: '资源类型' }, { name: 'resourceId', type: 'string', required: true, description: '资源 ID' }, { name: 'payload', type: 'object', required: false, description: '业务输入' }], responseExample: JSON.stringify({ code: 0, message: 'ok', data: {} }, null, 2) },
    { method: 'POST', path: '/mcp/v1/resources/{resourceType}/{resourceId}/message', description: 'MCP JSON-RPC 兼容路径：请求体为单对象（method / params 等），与网关 invoke 的 payload 构造一致；**X-Api-Key 必填**。`Accept: text/event-stream` 或 query `stream=true` 时走 invoke-stream（仅上游为 MCP HTTP/SSE）。resourceType 多为 **mcp**；**skill** 不提供 MCP 协议路径（请用 catalog/resolve）。', params: [{ name: 'resourceType', type: 'string', required: true, description: '路径参数' }, { name: 'resourceId', type: 'string', required: true, description: '路径参数' }, { name: 'body', type: 'JSON-RPC object', required: true, description: '如 initialize、tools/list、tools/call' }], responseExample: JSON.stringify({ jsonrpc: '2.0', id: 1, result: {} }, null, 2) },
  ]},
  { id: 'developer', label: '开发者入驻与个人统计', endpoints: [
    { method: 'POST', path: '/developer/applications', description: '提交开发者入驻申请。**须 X-User-Id**。任意已登录用户可提交；通过后由 platform_admin / reviewer 审批并开通 developer 等平台能力（以后台策略为准）。', params: [{ name: 'body', type: 'DeveloperApplicationCreateRequest', required: true, description: '申请说明等字段' }], responseExample: JSON.stringify({ code: 0, message: 'ok', data: { id: 1, userId: 1001, status: 'pending' } }, null, 2) },
    { method: 'GET', path: '/developer/applications/me', description: '查询本人入驻申请历史（列表，按时间倒序）。', params: [], responseExample: JSON.stringify({ code: 0, message: 'ok', data: [] }, null, 2) },
    { method: 'GET', path: '/developer/my-statistics', description: '个人侧调用类摘要（控制台「开发者统计」个人视角；与 Owner 资源成效 GET /dashboard/owner-resource-stats 口径不同）。', params: [], responseExample: JSON.stringify({ code: 0, message: 'ok', data: { invokeCount: 0, favorites: 0 } }, null, 2) },
  ]},
  { id: 'resource-center-api', label: '资源登记（资源中心）', endpoints: [
    { method: 'POST', path: '/resource-center/resources', description: '登记五类资源之一（草稿）。**须 X-User-Id**。请求体为 ResourceUpsertRequest，详见 OpenAPI / 注册表单。', params: [{ name: 'body', type: 'ResourceUpsertRequest', required: true, description: 'resourceType、displayName、spec 等' }], responseExample: JSON.stringify({ code: 0, message: 'ok', data: { id: 101, resourceType: 'mcp', status: 'draft' } }, null, 2) },
    { method: 'GET', path: '/resource-center/resources/mine', description: '分页查询登记资源列表；默认仅含**当前用户**创建的资源（含平台/审核角色，不再返回全站）。可选 `forResourceId`：按**该资源创建者**过滤（须可管理该资源），用于代管编辑时绑定 MCP 等与后端校验一致。', params: [{ name: 'page', type: 'number', required: false, description: '默认 1' }, { name: 'pageSize', type: 'number', required: false, description: '默认 20' }, { name: 'resourceType', type: 'string', required: false, description: '' }, { name: 'status', type: 'string', required: false, description: '' }, { name: 'keyword', type: 'string', required: false, description: '' }, { name: 'forResourceId', type: 'number', required: false, description: '按指定资源的创建者过滤列表' }], responseExample: JSON.stringify({ code: 0, message: 'ok', data: { records: [], total: 0, page: 1, pageSize: 20 } }, null, 2) },
    { method: 'POST', path: '/resource-center/resources/{id}/submit', description: '提交审核（进入审核队列）；后续由 reviewer 等在 /audit/* 或统一审核列表处理。', params: [{ name: 'id', type: 'number', required: true, description: '资源主键' }], responseExample: JSON.stringify({ code: 0, message: 'ok', data: { id: 101, status: 'pending_review' } }, null, 2) },
    { method: 'POST', path: '/resource-center/resources/mcp/connectivity-probe', description: '登记 MCP 前可选：JSON-RPC initialize 短探测，验证 URL 可达（不写登记记录）。', params: [{ name: 'body', type: 'McpConnectivityProbeRequest', required: true, description: 'endpointUrl 等' }], responseExample: JSON.stringify({ code: 0, message: 'ok', data: { ok: true, latencyMs: 120 } }, null, 2) },
  ]},
  { id: 'user-activity', label: '个人用量与收藏', endpoints: [
    { method: 'GET', path: '/user/usage-records', description: '分页查询个人用量记录（门户行为埋点，不等同于网关 call_log 全量）。', params: [{ name: 'page', type: 'number', required: false, description: '' }, { name: 'pageSize', type: 'number', required: false, description: '' }, { name: 'type', type: 'string', required: false, description: '筛选类型' }], responseExample: JSON.stringify({ code: 0, message: 'ok', data: { records: [], total: 0, page: 1, pageSize: 20 } }, null, 2) },
    { method: 'GET', path: '/user/favorites', description: '我的收藏列表。', params: [], responseExample: JSON.stringify({ code: 0, message: 'ok', data: [] }, null, 2) },
    { method: 'GET', path: '/user/usage-stats', description: '个人用量汇总（工作台展示）。', params: [], responseExample: JSON.stringify({ code: 0, message: 'ok', data: {} }, null, 2) },
  ]},
  { id: 'owner-dashboard', label: 'Owner 资源成效', endpoints: [
    { method: 'GET', path: '/dashboard/owner-resource-stats', description: 'Owner 维度统计：**网关 invoke（call_log）**、**usage_record(action=invoke) 对照**等。**须 X-User-Id**；默认识别当前用户为 owner，管理角色可按后端策略传 ownerUserId。**调用量不等于门户内全部使用量**（见使用指南「调用数字的含义」）。', params: [{ name: 'periodDays', type: 'number', required: false, description: '统计天数，默认 7' }, { name: 'ownerUserId', type: 'number', required: false, description: '指定 owner 用户 ID（部门/平台管理员场景）' }], responseExample: JSON.stringify({ code: 0, message: 'ok', data: { ownerUserId: 1001, periodDays: 7, periodStart: '', periodEnd: '', gatewayInvokeTotal: 0, gatewayInvokeSuccess: 0, usageRecordInvokeTotal: 0, gatewayInvokesByResourceType: [] } }, null, 2) },
  ]},
  { id: 'sandbox-sdk-grants', label: '沙箱/SDK', endpoints: [
    { method: 'POST', path: '/sandbox/sessions', description: '创建沙箱会话（需 X-User-Id + X-Api-Key）', params: [{ name: 'ttlMinutes', type: 'number', required: false, description: '会话时长' }, { name: 'maxCalls', type: 'number', required: false, description: '最大调用次数' }], responseExample: JSON.stringify({ code: 0, message: 'ok', data: { sessionToken: 'sbx_xxx', maxCalls: 100, usedCalls: 0, status: 'active' } }, null, 2) },
    { method: 'POST', path: '/sdk/v1/invoke', description: 'SDK 稳定调用入口（X-Api-Key 必填）', params: [{ name: 'resourceType', type: 'string', required: true, description: '资源类型' }, { name: 'resourceId', type: 'string', required: true, description: '资源 ID' }], responseExample: JSON.stringify({ code: 0, message: 'ok', data: { requestId: 'sdk_req_1', traceId: 'sdk_tr_1', status: 'success' } }, null, 2) },
    { method: 'GET', path: '/sdk/v1/resources', description: '与 GET /catalog/resources 等价查询参数，但**必须**携带 X-Api-Key（适合集成方只走 Key 场景）。', params: [{ name: 'page', type: 'number', required: false, description: '' }, { name: 'pageSize', type: 'number', required: false, description: '' }, { name: 'resourceType', type: 'string', required: false, description: '' }], responseExample: JSON.stringify({ code: 0, message: 'ok', data: { records: [], total: 0, page: 1, pageSize: 10 } }, null, 2) },
  ]},
];

const GUIDE_TOC: { id: string; label: string }[] = [
  { id: 'doc-intro', label: '平台概览' },
  { id: 'doc-roles', label: '账号与组织' },
  { id: 'doc-console', label: '控制台导航' },
  { id: 'doc-debug-gateway', label: '调试与网关页' },
  { id: 'doc-onboarding', label: '开发者入驻' },
  { id: 'doc-keys', label: 'API Key' },
  { id: 'doc-api-keys-console', label: '密钥页与集成套餐' },
  { id: 'doc-discover', label: '发现与目录' },
  { id: 'doc-external-integration', label: '外部系统集成（AI 门户）' },
  { id: 'doc-gateway-bff-sdk', label: 'BFF 与 SDK 路径' },
  { id: 'doc-consume', label: '解析与调用' },
  { id: 'doc-access-policy', label: '目录与调用条件' },
  { id: 'doc-publish', label: '登记与上架' },
  { id: 'doc-types', label: '五类资源' },
  { id: 'doc-skill-context', label: 'Context 技能（Skill）' },
  { id: 'doc-activity', label: '用量与统计' },
  { id: 'doc-meta', label: '标签与可观测' },
  { id: 'doc-metrics', label: '数据口径' },
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

export interface ApiDocsGuideReferenceToolbarProps {
  theme: Theme;
  viewMode: 'guide' | 'reference';
  onViewModeChange: (mode: 'guide' | 'reference') => void;
}

/** 供「接入与文档」hub 与独立接入指南页共用：使用指南 / 接口参考 */
export const ApiDocsGuideReferenceToolbar: React.FC<ApiDocsGuideReferenceToolbarProps> = ({
  theme,
  viewMode,
  onViewModeChange,
}) => {
  const isDark = theme === 'dark';
  const tabBtn = (mode: 'guide' | 'reference', label: string) => (
    <button
      key={mode}
      type="button"
      onClick={() => onViewModeChange(mode)}
      className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
        viewMode === mode
          ? (isDark ? 'bg-white/10 text-white shadow-sm' : 'bg-white text-neutral-900 shadow-sm ring-1 ring-slate-200')
          : (isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900')
      }`}
    >
      {label}
    </button>
  );
  return (
    <div className={`flex shrink-0 rounded-xl p-1 ${isDark ? 'bg-white/[0.06]' : 'bg-slate-200/80'}`} role="tablist" aria-label="接入指南视图">
      {tabBtn('guide', '使用指南')}
      {tabBtn('reference', '接口参考')}
    </div>
  );
};

export interface ApiDocsPageProps {
  theme: Theme;
  fontSize: FontSize;
  /** 嵌入「接入与文档」hub：不包 MgmtPageShell，由 hub 统一面包屑与说明 */
  embedInHub?: boolean;
  /** hub 嵌入时由父级控制「使用指南 / 接口参考」（与 embedInHub 同用） */
  viewMode?: 'guide' | 'reference';
  onViewModeChange?: (mode: 'guide' | 'reference') => void;
}

export const ApiDocsPage: React.FC<ApiDocsPageProps> = ({
  theme,
  fontSize,
  embedInHub = false,
  viewMode: viewModeProp,
  onViewModeChange,
}) => {
  const navigate = useNavigate();
  const { pathname, hash } = useLocation();
  const { platformRole } = useUserRole();
  const routePage = parseRoute(pathname)?.page ?? '';
  const consoleRole: ConsoleRole = inferConsoleRole(routePage, platformRole);
  const isDark = theme === 'dark';
  const [viewModeInternal, setViewModeInternal] = useState<'guide' | 'reference'>('guide');
  const viewMode = viewModeProp ?? viewModeInternal;
  const setViewMode = onViewModeChange ?? setViewModeInternal;
  const [activeCat, setActiveCat] = useState(API_CATEGORIES[0].id);
  const category = API_CATEGORIES.find((c) => c.id === activeCat)!;

  const go = useCallback(
    (page: string) => {
      if (page === 'resource-center') {
        navigate(unifiedResourceCenterPath(platformRole));
        return;
      }
      if (page === 'mcp-integration') {
        navigate(`${buildPath(consoleRole, 'developer-tools')}?tab=gateway`);
        return;
      }
      if (page === 'api-playground') {
        navigate(buildPath(consoleRole, 'developer-tools'));
        return;
      }
      if (page === 'sdk-download') {
        navigate(`${buildPath(consoleRole, 'developer-docs')}?tab=sdk`);
        return;
      }
      navigate(buildPath(consoleRole, page));
    },
    [navigate, consoleRole, platformRole],
  );

  const openInPlayground = useCallback(
    (ep: ApiEndpoint) => {
      const detail = {
        method: ep.method,
        path: `${API_CONTEXT_PREFIX}${ep.path}`,
        createdAt: Date.now(),
      };
      try {
        localStorage.setItem(PLAYGROUND_PREFILL_STORAGE_KEY, JSON.stringify(detail));
      } catch {
        // ignore storage failure and still navigate
      }
      window.dispatchEvent(new CustomEvent('navigate-to-playground', { detail }));
      go('api-playground');
    },
    [go],
  );

  const scrollToId = useCallback((id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  useEffect(() => {
    if (viewMode !== 'guide') return;
    const id = hash?.replace(/^#/, '').trim();
    if (!id) return;
    requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }, [hash, viewMode]);

  const docsToolbar = (
    <ApiDocsGuideReferenceToolbar theme={theme} viewMode={viewMode} onViewModeChange={setViewMode} />
  );

  const mainContent = (
      <div className="min-h-0 w-full flex flex-col px-3 pb-8 sm:px-4 lg:px-5">
        {viewMode === 'guide' && (
          <div className="flex-1 min-h-0 flex w-full min-w-0 items-start gap-0 md:gap-1">
            <aside
              aria-label="本页目录"
              className={`hidden md:flex md:sticky md:top-6 md:z-10 w-52 shrink-0 flex-col border-r self-start lg:w-56 ${
                isDark ? 'border-white/[0.08] bg-transparent' : 'border-slate-200/70 bg-transparent'
              }`}
            >
              <div className="max-h-[min(100vh-6rem,100dvh-6rem)] overflow-y-auto overscroll-y-contain py-2 pl-0 pr-2 custom-scrollbar lg:pr-3">
                <p className={`text-xs font-semibold uppercase tracking-wider ${textMuted(theme)}`}>本页目录</p>
                <nav className="mt-3 space-y-0.5 border-l-2 pl-3" style={{ borderColor: isDark ? 'rgba(16,185,129,0.35)' : 'rgba(16,185,129,0.45)' }}>
                  {GUIDE_TOC.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => scrollToId(item.id)}
                      className={`block w-full text-left py-1.5 text-sm transition-colors rounded-r-md pr-2 ${
                        isDark ? 'text-slate-400 hover:text-emerald-300' : 'text-slate-600 hover:text-emerald-700'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </nav>
              </div>
            </aside>

            <div className="min-w-0 flex-1">
              <article className="w-full min-w-0 px-3 py-6 sm:px-4 sm:py-8 md:pl-4 md:pr-6 lg:pl-5 lg:pr-10 xl:pr-12">
                <div className="md:hidden mb-6 flex flex-wrap gap-2">
                  {GUIDE_TOC.map((item) => (
                    <button key={item.id} type="button" onClick={() => scrollToId(item.id)} className={`rounded-full px-3 py-1 text-xs font-medium ${isDark ? 'bg-white/10 text-slate-300' : 'bg-slate-100 text-slate-700'}`}>
                      {item.label}
                    </button>
                  ))}
                </div>

                <section id="doc-intro" className="space-y-4">
                  {proseH2(theme, '平台是做什么的？')}
                  {prosePara(theme, (
                    <>
                      本门户面向高校师生与信息化场景：把<strong className={textPrimary(theme)}>智能体、Context 技能、MCP 服务、应用与数据集</strong>统一登记进「资源中心」，经审核与发布后进入<strong className={textPrimary(theme)}>统一目录</strong>，供师生浏览与调用。教师团队沉淀的能力可被其他学院在合规前提下复用；学生或课题组用 API Key（具备对应 scope）即可调用已发布资源并做实验、编排应用，而无需每人重复对接一套网关细节。
                    </>
                  ))}
                  {prosePara(theme, (
                    <>
                      技术路径一句话：<strong className={textPrimary(theme)}>目录发现 → resolve 解析出 endpoint/spec → invoke / invoke-stream 走网关（agent、mcp 等）</strong>。应用类还可拿短期 <span className="font-mono">launchToken</span>，通过 <span className="font-mono">GET /catalog/apps/launch</span> 跳转真实地址。平台内技能（<span className="font-mono">skill</span>）为<strong className={textPrimary(theme)}> Context 规范</strong>：仅通过目录与 <span className="font-mono">POST /catalog/resolve</span> 获取 <span className="font-mono">contextPrompt</span> 与绑定 MCP，<strong className={textPrimary(theme)}>不可</strong> <span className="font-mono">POST /invoke</span>（<span className="font-mono">resourceType=skill</span>）。需要远程工具请登记 <span className="font-mono">mcp</span>。编排侧可用 resolve / 详情的 <span className="font-mono">include=closure</span> 拉取 Agent↔MCP、Skill↔MCP 绑定闭包。
                    </>
                  ))}
                  {prosePara(theme, (
                    <>
                      所有开放 API 的 URL 前缀为部署上下文路径 <code className={`rounded px-1.5 py-0.5 font-mono text-sm ${isDark ? 'bg-white/10' : 'bg-slate-100'}`}>{API_CONTEXT_PREFIX}</code>
                      （示例：<code className={`rounded px-1.5 py-0.5 font-mono text-sm ${isDark ? 'bg-white/10' : 'bg-slate-100'}`}>https://学校域名{API_CONTEXT_PREFIX}/catalog/resources</code>）。具体字段与校验以 <span className="font-mono">LantuConnect-Backend</span> 中 Controller、DTO 与 OpenAPI 为准。
                    </>
                  ))}
                  <div className={`rounded-xl border px-4 py-3 text-sm ${isDark ? 'border-amber-500/25 bg-amber-500/10 text-amber-100/90' : 'border-amber-200 bg-amber-50 text-amber-950'}`}>
                    <p className="flex items-start gap-2 font-medium">
                      <AlertCircle size={16} className="mt-0.5 shrink-0" />
                      <span>
                        <strong className={textPrimary(theme)}>务必记住：</strong>
                        浏览目录可以主要靠登录态（JWT）；但 <span className="font-mono">resolve</span>、<span className="font-mono">invoke</span>、<span className="font-mono">invoke-stream</span>、稳定 <span className="font-mono">/sdk/v1</span> 路径、沙箱创建等<strong className={textPrimary(theme)}>必须</strong>带有效 <span className="font-mono">X-Api-Key</span>，且值为创建时<strong>当次响应</strong>里的完整 <span className="font-mono">secretPlain</span>（不是掩码、前缀或行 id）。细则见「接口参考」顶部说明框。
                      </span>
                    </p>
                  </div>
                </section>

                <section id="doc-roles" className="mt-14 space-y-4">
                  {proseH2(theme, '账号、组织与平台角色')}
                  {prosePara(theme, (
                    <>
                      师生使用学校统一身份（学工号等）登录。学院/部门与全校组织架构树中的节点关联，影响「同院系开放」类策略（<span className="font-mono">open_org</span>，见下文）。
                    </>
                  ))}
                  {prosePara(theme, (
                    <>
                      平台在 JWT 中叠加<strong>平台角色</strong>，常见包括：<span className="font-mono">platform_admin</span>（超管）、<span className="font-mono">reviewer</span>（全平台审核员）、<span className="font-mono">developer</span>（可登记维护资源）、<span className="font-mono">user</span>（消费者：浏览市场、自建 Key 调用已发布资源等）。自助注册多从消费者开始；需要登记资源请走「开发者入驻」由审核员开通。
                    </>
                  ))}
                  {prosePara(theme, (
                    <>
                      网址里的 <span className="font-mono">/admin</span> 与 <span className="font-mono">/user</span> 只是<strong>控制台两套壳</strong>，不等于后端角色名；能否调用某接口以<strong>后端鉴权</strong>为准。
                    </>
                  ))}
                </section>

                <section id="doc-console" className="mt-14 space-y-4">
                  {proseH2(theme, '控制台里开发者常去哪？')}
                  <ul className={`list-disc space-y-2 pl-5 text-[15px] leading-7 ${textSecondary(theme)}`}>
                    <li><strong className={textPrimary(theme)}>工作台 / 探索发现</strong>：逛已发布资源；对接 <span className="font-mono">/catalog/resources</span>、<span className="font-mono">/trending</span>、<span className="font-mono">/search-suggestions</span>。</li>
                    <li><strong className={textPrimary(theme)}>我的发布 · 资源中心</strong>：草稿、提审、版本与托管技能维护；接口前缀 <span className="font-mono">/resource-center/resources</span>。</li>
                    <li><strong className={textPrimary(theme)}>开发者中心</strong>：本页、SDK、API 调试、开发者统计。</li>
                    <li><strong className={textPrimary(theme)}>个人设置</strong>：个人资料（页内 Tab 含偏好设置）、<strong className={textPrimary(theme)}>密钥与集成套餐</strong>（API Key 与资源白名单套餐）；直达路由 <span className="font-mono">profile</span>、<span className="font-mono">my-api-keys</span>（可用 <span className="font-mono">?tab=packages</span> 打开集成套餐标签），偏好 Tab 亦可使用 <span className="font-mono">preferences</span>。</li>
                    <li><strong className={textPrimary(theme)}>管理台</strong>（有权限时）：全平台目录、审核队列、用户与组织、监控配额等——与开发者相关的多为代管发布与审批。</li>
                  </ul>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <button type="button" onClick={() => go('hub')} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium ${btnSecondary(theme)}`}>
                      <Library size={16} /> 工作台
                    </button>
                    <button type="button" onClick={() => go('workspace')} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium ${btnSecondary(theme)}`}>
                      <Library size={16} /> 应用工作台
                    </button>
                    <button type="button" onClick={() => go('developer-statistics')} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium ${btnSecondary(theme)}`}>
                      <Library size={16} /> 开发者统计
                    </button>
                  </div>
                </section>

                <section id="doc-debug-gateway" className="mt-14 space-y-4">
                  {proseH2(theme, '「调试与网关」页怎么用？')}
                  {prosePara(theme, (
                    <>
                      开发者中心 → <strong className={textPrimary(theme)}>调试与网关</strong> 把三件事放在同一页：先试 HTTP、再看集成说明、最后用网关工具做目录与导出。
                    </>
                  ))}
                  <ul className={`list-disc space-y-2 pl-5 text-[15px] leading-7 ${textSecondary(theme)}`}>
                    <li>
                      <strong className={textPrimary(theme)}>API Playground</strong>：上方「HTTP 调试」里填 URL、Headers 与（可选）请求体，发请求后在右侧看状态码与响应体。
                    </li>
                    <li>
                      <strong className={textPrimary(theme)}>网关集成</strong>：同一页的第二个 Tab，阅读与外部系统、网关对接相关的说明与快捷入口。
                    </li>
                    <li>
                      <strong className={textPrimary(theme)}>网关调试</strong>：页面最下方，选择 API Key、勾选资源目录、试算与导出集成包（JSON）等。
                    </li>
                  </ul>
                  {prosePara(theme, (
                    <>
                      独立打开「API Playground」路由时，行为与嵌入 Hub 时一致；目录类接口（如 <span className="font-mono">GET /catalog/resources</span>、<span className="font-mono">/reviews/page</span>、<span className="font-mono">/catalog/resources/{'{type}'}/{'{id}'}/stats</span>）通常需要 <span className="font-mono">X-User-Id</span> 或 <span className="font-mono">X-Api-Key</span> 至少其一；执行向（如 <span className="font-mono">POST /catalog/resolve</span>、<span className="font-mono">/invoke</span>、<span className="font-mono">/invoke-stream</span>）须携带有效的 <span className="font-mono">X-Api-Key</span>。平台内 <span className="font-mono">skill</span> 为托管资源，需通过 resolve 使用 <span className="font-mono">contextPrompt</span> 等路径；其他资源类型需满足已发布、Key 有效且 scope 覆盖等网关条件。更细的接口路径与参数见本页「接口参考」与「API Key」章节。
                    </>
                  ))}
                  <div className="flex flex-wrap gap-2 pt-1">
                    <button type="button" onClick={() => go('api-playground')} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium ${btnSecondary(theme)}`}>
                      <Library size={16} /> 打开调试与网关
                    </button>
                  </div>
                </section>

                <section id="doc-onboarding" className="mt-14 space-y-4">
                  {proseH2(theme, '如何成为开发者？')}
                  {prosePara(theme, (
                    <>
                      侧栏「开发者入驻」提交申请。接口：<span className="font-mono">POST /developer/applications</span>（须 <span className="font-mono">X-User-Id</span>）；<span className="font-mono">GET /developer/applications/me</span> 查本人记录。审核员在管理端 <span className="font-mono">GET /developer/applications</span> 处理；通过后具备登记资源等能力（以后台策略为准）。
                    </>
                  ))}
                  <div className="flex flex-wrap gap-2 pt-1">
                    <button type="button" onClick={() => go('developer-onboarding')} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium ${btnSecondary(theme)}`}>
                      <Rocket size={16} /> 开发者入驻
                    </button>
                  </div>
                </section>

                <section id="doc-keys" className="mt-14 space-y-4">
                  {proseH2(theme, 'API Key：调用的钥匙')}
                  {prosePara(theme, (
                    <>
                      在「个人设置 → 密钥与集成套餐」页面创建。响应中的 <span className="font-mono">secretPlain</span>（或等价字段）<strong className={textPrimary(theme)}>仅出现一次</strong>，请立即安全保存。列表只有掩码与前缀。撤销/删除后无法找回明文，只能重建 Key 并重配集成环境变量与调用方配置。
                    </>
                  ))}
                  {prosePara(theme, (
                    <>
                      <strong className={textPrimary(theme)}>scope</strong>须覆盖当前动作（如 <span className="font-mono">catalog</span>、<span className="font-mono">resolve</span>、<span className="font-mono">invoke</span> 或用 <span className="font-mono">*</span>）。控制台新建 Key 通常默认全权限；历史空 scope 建议作废重建。管理端代建：<span className="font-mono">POST /user-mgmt/api-keys</span>，规则一致。
                    </>
                  ))}
                  <div className="flex flex-wrap gap-2 pt-1">
                    <button type="button" onClick={() => go('my-api-keys')} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium ${btnSecondary(theme)}`}>
                      <KeyRound size={16} /> 密钥与集成套餐
                    </button>
                  </div>
                  <h3 id="doc-api-keys-console" className={`scroll-mt-24 mt-8 text-base font-semibold ${textPrimary(theme)}`}>
                    「密钥与集成套餐」页怎么用？
                  </h3>
                  {prosePara(theme, (
                    <>
                      个人工作台 → <strong className={textPrimary(theme)}>密钥与集成套餐</strong> 分两个标签：<strong className={textPrimary(theme)}>API 密钥</strong> 创建与管理 <span className="font-mono">X-Api-Key</span>；<strong className={textPrimary(theme)}>集成套餐</strong> 维护资源白名单。将 Key <strong className={textPrimary(theme)}>绑定到某个套餐</strong>后，网关在校验 scope 等权限的前提下，<strong className={textPrimary(theme)}>优先按套餐内已上线资源</strong>裁剪可访问范围。
                    </>
                  ))}
                  {prosePara(theme, (
                    <>
                      创建 Key 时，响应里的完整密钥<strong className={textPrimary(theme)}>仅当次返回</strong>；若未保存，可在列表中<strong className={textPrimary(theme)}>验证登录密码后轮换</strong>以获取新明文（旧串立即作废）。新建 Key 通常会带上默认可调用权限（scope）。服务端只存摘要，列表中的掩码、前缀、id <strong className={textPrimary(theme)}>不能</strong>当作请求头里的 <span className="font-mono">X-Api-Key</span>；撤销后本条不再可用。
                    </>
                  ))}
                  {prosePara(theme, (
                    <>
                      <strong className={textPrimary(theme)}>有效期</strong>与后台「用户管理 · API Key」规则一致：按<strong className={textPrimary(theme)}>日历日</strong>递增；选择「永不过期」则不写过期时间字段。
                    </>
                  ))}
                  {prosePara(theme, (
                    <>
                      <strong className={textPrimary(theme)}>集成套餐（可选）</strong>：请先在<strong className={textPrimary(theme)}>集成套餐</strong>标签创建白名单并勾选<strong className={textPrimary(theme)}>已上线</strong>资源，再回到「API 密钥」绑定。绑定后网关按套餐优先匹配；未绑定时仅按 scope 等规则校验。
                    </>
                  ))}
                  {prosePara(theme, (
                    <>
                      创建成功后若要在本站「市场 / 网关调试」中试用，可使用页面上<strong className={textPrimary(theme)}>写入本机网关 Key</strong>，与 axios、Playground 等共用本地存储（勿在不可信环境使用）。
                    </>
                  ))}
                </section>

                <section id="doc-discover" className="mt-14 space-y-4">
                  {proseH2(theme, '发现资源：页面与接口')}
                  {prosePara(theme, (
                    <>
                      侧栏「探索发现」与各类市场对应已发布资源。程序化对接用 <span className="font-mono">GET /catalog/resources</span>（类型、关键字、状态、<span className="font-mono">tags</span>、排序等，见「接口参考」）。另可：<span className="font-mono">GET /catalog/resources/trending</span>、<span className="font-mono">GET /catalog/resources/search-suggestions?q=</span>；单条 <span className="font-mono">GET /catalog/resources/{'{type}'}/{'{id}'}</span>，<span className="font-mono">include</span> 可取 <span className="font-mono">observability</span>、<span className="font-mono">quality</span>、<span className="font-mono">tags</span>，以及 <span className="font-mono">closure</span> / <span className="font-mono">bindings</span> / <span className="font-mono">bindingClosure</span> 展开绑定图。
                    </>
                  ))}
                  {prosePara(theme, (
                    <>
                      浏览目录：登录态与有效 <span className="font-mono">X-Api-Key</span> 至少其一（可同时带），以后端网关策略为准。
                    </>
                  ))}
                  <div className="flex flex-wrap gap-2 pt-1">
                    <button type="button" onClick={() => go('hub')} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium ${btnSecondary(theme)}`}>
                      <Library size={16} /> 探索发现
                    </button>
                    <button type="button" onClick={() => navigate(buildUserResourceMarketUrl('agent'))} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium ${btnSecondary(theme)}`}>
                      <Library size={16} /> 智能体市场
                    </button>
                  </div>
                </section>

                <section id="doc-external-integration" className="mt-14 space-y-4">
                  {proseH2(theme, '外部系统集成（AI 门户）')}
                  {prosePara(theme, (
                    <>
                      若你的 <strong className={textPrimary(theme)}>React AI 门户</strong>与<strong className={textPrimary(theme)}>本注册平台不在同一工程</strong>，你是<strong className={textPrimary(theme)}>集成方</strong>：在本平台申请 API Key、按本文档调用统一网关；门户浏览器<strong className={textPrimary(theme)}>不要</strong>嵌入完整 <span className="font-mono">secretPlain</span>。
                    </>
                  ))}
                  {proseH3(theme, '推荐架构：自建 BFF')}
                  {prosePara(theme, (
                    <>
                      在<strong className={textPrimary(theme)}>AI 门户服务端</strong>实现一层 <strong className={textPrimary(theme)}>BFF（Backend For Frontend）</strong>：浏览器只带己方登录态访问 BFF；BFF 在服务器上保存 Lantu 下发的完整 <span className="font-mono">X-Api-Key</span>，再向本平台的 <span className="font-mono">POST /invoke</span>、<span className="font-mono">POST /invoke-stream</span> 等发起请求。密钥不进前端 bundle、不进用户可见存储。
                    </>
                  ))}
                  {proseH3(theme, '主调用路径（推荐）')}
                  <ol className={`list-decimal space-y-2 pl-5 text-[15px] leading-7 ${textSecondary(theme)}`}>
                    <li>
                      发现 <span className="font-mono">resourceType</span> / <span className="font-mono">resourceId</span>：可用 <span className="font-mono">GET /catalog/resources</span>，或由运营配置写入集成方配置。
                    </li>
                    <li>
                      可选 <span className="font-mono">POST /catalog/resolve</span>（须 <span className="font-mono">X-Api-Key</span>）：拿到 endpoint、<span className="font-mono">invokeType</span>、spec 等；请求体可带 <span className="font-mono">include</span>（如 <span className="font-mono">closure</span>、<span className="font-mono">bindings</span>、<span className="font-mono">bindingClosure</span>）预览绑定关系。亦可使用 <span className="font-mono">GET /catalog/resources/{'{type}'}/{'{id}'}?include=...</span>。
                    </li>
                    <li>
                      <strong className={textPrimary(theme)}>拉齐绑定 MCP 工具（给 LLM 的 tools 列表）</strong>：
                      <span className="font-mono"> GET /catalog/capabilities/tools?entryResourceType=&amp;entryResourceId=</span>（须 <span className="font-mono">X-Api-Key</span>），返回闭包内 MCP 的 <span className="font-mono">tools/list</span> 合并结果与 <span className="font-mono">routes</span>。
                      与<strong className={textPrimary(theme)}>外部门户自身的编排/多轮对话</strong>解耦：集成方若只需「按注册中心绑定关系」拿到工具表，应使用本接口；<strong className={textPrimary(theme)}>控制台「网关集成」导出 JSON</strong>仅为资源 id 快照，<strong className={textPrimary(theme)}>不等于</strong>运行时闭包。
                    </li>
                    <li>
                      <strong className={textPrimary(theme)}>同步调用</strong>：<span className="font-mono">POST /invoke</span>（JSON 请求/响应），适用于 <span className="font-mono">agent</span>、<span className="font-mono">mcp</span> 等；<span className="font-mono">skill</span> <strong className={textPrimary(theme)}>不支持</strong> invoke。
                    </li>
                    <li>
                      <strong className={textPrimary(theme)}>流式</strong>：在<strong className={textPrimary(theme)}>上游协议与网关实现允许</strong>时使用 <span className="font-mono">POST /invoke-stream</span>（<span className="font-mono">text/event-stream</span>）。流式入口主要面向 <span className="font-mono">invokeType=mcp</span> 且上游为 HTTP/SSE 的 MCP。<span className="font-mono">agent</span> 是否流式取决于解析结果与上游能力。
                    </li>
                  </ol>
                  {proseH3(theme, '绑定展开（invoke 时）')}
                  {prosePara(theme, (
                    <>
                      对 <span className="font-mono">POST /invoke</span>：当资源为 <span className="font-mono">agent</span> 且存在 <span className="font-mono">agent_depends_mcp</span> 时，网关可在转发前聚合绑定 MCP 的 <span className="font-mono">tools/list</span>，写入 <span className="font-mono">payload._lantu.bindingExpansion</span>；另可在 <span className="font-mono">payload</span> 或 <span className="font-mono">payload._lantu</span> 提供 <span className="font-mono">activeSkillIds</span>，在开启 <span className="font-mono">merge-active-skill-mcps</span> 时合并各 Skill 上 <span className="font-mono">skill_depends_mcp</span>（<span className="font-mono">GET …/capabilities/tools</span> 仍以 skill 为 entry 试算闭包，与 invoke 写入字段同源）。<strong className={textPrimary(theme)}>仅 invoke <span className="font-mono">mcp</span> 不会反向拉起 Agent</strong>。Key 须对被展开涉及的各 MCP 具备 invoke scope。可通过配置 <span className="font-mono">lantu.gateway.binding-expansion</span> 关闭（以后端为准）。
                    </>
                  ))}
                  {proseH3(theme, 'invoke-eligibility（控制台辅助）')}
                  {prosePara(theme, (
                    <>
                      <span className="font-mono">POST /user-settings/api-keys/{'{id}'}/invoke-eligibility</span> 便于控制台按 Key 批量查看资源是否在库中为 <span className="font-mono">published</span>。<strong className={textPrimary(theme)}>不等同</strong>网关一次完整 invoke 的全链路（scope、健康、熔断等仍以实际 <span className="font-mono">/invoke</span> 返回为准）。
                    </>
                  ))}
                  {proseH3(theme, '进阶路径')}
                  {prosePara(theme, (
                    <>
                      仅携带 Key、不依赖浏览器登录的集成可使用 <span className="font-mono">/sdk/v1/*</span>（与同路径根接口语义一致，须 <span className="font-mono">X-Api-Key</span>）。需要 MCP JSON-RPC 固定路径时可用 <span className="font-mono">POST /mcp/v1/resources/{'{resourceType}'}/{'{resourceId}'}/message</span>（详见「接口参考」）；多数 AI 门户仍推荐 BFF + <span className="font-mono">/invoke</span> / <span className="font-mono">/invoke-stream</span>。
                    </>
                  ))}
                  <h3 id="doc-gateway-bff-sdk" className={`scroll-mt-24 mt-8 text-base font-semibold ${textPrimary(theme)}`}>
                    BFF 与 SDK 路径（控制台「外部门户调用」）
                  </h3>
                  {prosePara(theme, (
                    <>
                      <strong className={textPrimary(theme)}>并不是「把注册中心里所有 Agent/MCP 一次性代过去」</strong>：网关不会按全目录批量调用；由<strong className={textPrimary(theme)}>外部门户 / BFF</strong>决定本次 <span className="font-mono">resourceId</span>。「发现」类接口针对<strong className={textPrimary(theme)}>一个入口</strong>（<span className="font-mono">entryResourceType + entryResourceId</span>）返回闭包工具表，不是全平台目录。在控制台需要<strong className={textPrimary(theme)}>勾选目录、试算闭包、导出联调 JSON</strong>，请用「调试与网关」→ API Playground 页底的网关调试区。
                    </>
                  ))}
                  <ol className={`list-decimal space-y-2 pl-5 text-[15px] leading-7 ${textSecondary(theme)}`}>
                    <li>
                      <strong className={textPrimary(theme)}>鉴权</strong>：在服务端保存 <span className="font-mono">X-Api-Key</span>，仅由服务端转发到网关。
                    </li>
                    <li>
                      <strong className={textPrimary(theme)}>发现（工具表）</strong>：<span className="font-mono">GET /sdk/v1/capabilities/tools</span>
                      ，query 须带<strong className={textPrimary(theme)}>一个</strong> <span className="font-mono">entryResourceType</span> 与 <span className="font-mono">entryResourceId</span>：返回从该入口出发的<strong className={textPrimary(theme)}>闭包内</strong>工具聚合，不是全市场列表。
                    </li>
                    <li>
                      <strong className={textPrimary(theme)}>Agent</strong>：<span className="font-mono">POST /sdk/v1/invoke</span>；流式 <span className="font-mono">POST /sdk/v1/invoke-stream</span>。
                    </li>
                    <li>
                      <strong className={textPrimary(theme)}>MCP 工具</strong>：JSON-RPC <span className="font-mono">POST /mcp/v1/resources/mcp/&lt;mcpResourceId&gt;/message</span>（不经统一 invoke 请求体）。
                    </li>
                  </ol>
                  {prosePara(theme, (
                    <>
                      根路径 <span className="font-mono">POST /invoke</span> 与 <span className="font-mono">POST /sdk/v1/invoke</span> 语义等价；新项目建议统一 <span className="font-mono">/sdk/v1/*</span>。
                    </>
                  ))}
                  {prosePara(theme, (
                    <>
                      <strong className={textPrimary(theme)}>invoke Agent 时挂载 Skill（可选）</strong>：在 <span className="font-mono">payload</span> 或 <span className="font-mono">payload._lantu</span> 提供 <span className="font-mono">activeSkillIds</span>；若开启 <span className="font-mono">merge-active-skill-mcps</span>，网关合并 Skill 依赖 MCP 与 Agent 绑定。
                    </>
                  ))}
                  {prosePara(theme, (
                    <>
                      参考实现：Nexus 门户 <span className="font-mono">lib/lantu-client.ts</span>（Agent 走 <span className="font-mono">/sdk/v1/invoke</span>，MCP 走 <span className="font-mono">/mcp/v1/…/message</span>）。
                    </>
                  ))}
                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => go('mcp-integration')}
                      className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium ${btnSecondary(theme)}`}
                    >
                      <Puzzle size={16} /> 网关集成工具（控制台）
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode('reference')}
                      className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium ${isDark ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-100 text-emerald-800'}`}
                    >
                      <FileText size={16} /> 接口参考 · 解析与调用
                    </button>
                  </div>
                </section>

                <section id="doc-consume" className="mt-14 space-y-4">
                  {proseH2(theme, '解析与调用（集成必读）')}
                  {proseH3(theme, '1. 标准两步')}
                  {prosePara(theme, (
                    <>
                      ① <span className="font-mono">POST /catalog/resolve</span>：<span className="font-mono">resourceType</span>、<span className="font-mono">resourceId</span>（可选 <span className="font-mono">version</span>、<span className="font-mono">include</span> 展开闭包），返回 endpoint、invoke 方式、spec、应用 launch 票据等；须完整 <span className="font-mono">X-Api-Key</span>。
                    </>
                  ))}
                  {prosePara(theme, (
                    <>
                      ② <span className="font-mono">POST /invoke</span> 或 <span className="font-mono">POST /invoke-stream</span>（在网关允许的前提下）：统一请求体，须 Key 与 invoke scope；<strong className={textPrimary(theme)}>不含</strong> <span className="font-mono">resourceType=skill</span>（Skill 仅走 ① resolve）。<strong className={textPrimary(theme)}>独立 AI 门户</strong>的推荐架构、流式边界与绑定展开详见上文<strong className={textPrimary(theme)}>「外部系统集成（AI 门户）」</strong>；本控制台「网关集成」工具页仅列出可 invoke 的 <strong className={textPrimary(theme)}>agent / mcp</strong> 目录与试算闭包；Skill 请见 API 文档「Context Skill」与 Skills 中心。
                    </>
                  ))}
                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setViewMode('guide');
                        setTimeout(() => scrollToId('doc-external-integration'), 0);
                      }}
                      className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium ${btnSecondary(theme)}`}
                    >
                      <Puzzle size={16} /> 外部系统集成（文档）
                    </button>
                    <button type="button" onClick={() => go('mcp-integration')} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium ${btnSecondary(theme)}`}>
                      <Terminal size={16} /> 网关集成工具
                    </button>
                  </div>
                  {proseH3(theme, '2. 应用如何打开')}
                  {prosePara(theme, (
                    <>
                      <span className="font-mono">resolve</span> 可能返回短期 <span className="font-mono">launchToken</span>。浏览器访问 <span className="font-mono">GET /catalog/apps/launch?token=...</span>（可匿名），服务端校验 Token 对应 Key 仍有效且具备 resolve 等所需 scope 后 302 到真实 <span className="font-mono">appUrl</span>。
                    </>
                  ))}
                  {proseH3(theme, '3. SDK 与沙箱')}
                  {prosePara(theme, (
                    <>
                      集成方可固定使用 <span className="font-mono">/sdk/v1/*</span>（须 Key），语义与同路径根接口一致。<span className="font-mono">POST /sandbox/sessions</span> 创建隔离会话（<span className="font-mono">X-User-Id</span> + <span className="font-mono">X-Api-Key</span>，角色含 developer/reviewer/admin 等）；<span className="font-mono">POST /sandbox/invoke</span> 带 <span className="font-mono">X-Sandbox-Token</span> 做限量试调，不等同生产配额。
                    </>
                  ))}
                  <div className="flex flex-wrap gap-2 pt-1">
                    <button type="button" onClick={() => go('api-playground')} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium ${btnSecondary(theme)}`}>
                      <Terminal size={16} /> API 调试
                    </button>
                    <button type="button" onClick={() => go('sdk-download')} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium ${btnSecondary(theme)}`}>
                      <Rocket size={16} /> SDK 下载
                    </button>
                  </div>
                </section>

                <section id="doc-access-policy" className="mt-14 space-y-4">
                  {proseH2(theme, '目录与调用条件')}
                  {prosePara(theme, (
                    <>
                      网关在校验<strong className={textPrimary(theme)}>有效 Key</strong>与<strong className={textPrimary(theme)}>scope</strong>（catalog / resolve / invoke）后，对已<strong className={textPrimary(theme)}>发布（published）</strong>的资源按统一规则开放调用；以当前环境网关实现为准。<strong className={textPrimary(theme)}>资源级 Grant / 逐资源「申请授权」已下线</strong>，调用<strong className={textPrimary(theme)}>不</strong>再依赖 <span className="font-mono">accessPolicy</span>（库字段 <span className="font-mono">access_policy</span>）做拦截；若 API 仍返回该字段，仅为<strong className={textPrimary(theme)}>历史兼容回显</strong>（迁移后多为 <span className="font-mono">open_platform</span>）。平台内 <span className="font-mono">skill</span> 为 <span className="font-mono">context</span>，仅目录/resolve 消费，<strong className={textPrimary(theme)}>不可</strong> invoke。
                    </>
                  ))}
                </section>

                <section id="doc-publish" className="mt-14 space-y-4">
                  {proseH2(theme, '登记、审核与上架')}
                  {prosePara(theme, (
                    <>
                      <span className="font-mono">POST /resource-center/resources</span> 创建草稿；<span className="font-mono">POST /resource-center/resources/{'{id}'}/submit</span> 提交审核。审核队列在管理端 <span className="font-mono">/audit/*</span> 等。审核通过后常进入可测状态，一般还需<strong>发布</strong>才 <span className="font-mono">published</span> 进目录——以本校控制台状态为准。
                    </>
                  ))}
                  {prosePara(theme, (
                    <>
                      <span className="font-mono">POST /resource-center/resources/mcp/connectivity-probe</span> 可在登记 MCP 前做短探测。Context 技能为规范 Markdown 与可选 MCP 绑定（见 OpenAPI）。下架、废弃、版本回滚等同族接口维护。
                    </>
                  ))}
                  <div className="flex flex-wrap gap-2 pt-1">
                    <button type="button" onClick={() => go('resource-center')} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium ${btnSecondary(theme)}`}>
                      <Rocket size={16} /> 我的发布 · 资源中心
                    </button>
                  </div>
                </section>

                <section id="doc-types" className="mt-14 space-y-4">
                  {proseH2(theme, '五类资源（开发者选型）')}
                  <ul className={`list-disc space-y-2 pl-5 text-[15px] leading-7 ${textSecondary(theme)}`}>
                    <li><strong className={textPrimary(theme)}>agent</strong>：智能体；主路径 <span className="font-mono">POST /invoke</span>；是否可走 <span className="font-mono">invoke-stream</span> 取决于解析出的上游协议与网关实现（勿默认均可流式）。</li>
                    <li><strong className={textPrimary(theme)}>mcp</strong>：可远程 JSON-RPC / SSE；流式用 <span className="font-mono">invoke-stream</span>。</li>
                    <li><strong className={textPrimary(theme)}>skill</strong>：<span className="font-mono">context</span> 规范文档 + 可选 <span className="font-mono">skill_depends_mcp</span>；通过 <span className="font-mono">GET /catalog</span> 与 <span className="font-mono">POST /catalog/resolve</span> 消费，<strong className={textPrimary(theme)}>不可</strong> <span className="font-mono">POST /invoke</span>。</li>
                    <li><strong className={textPrimary(theme)}>app</strong>：<span className="font-mono">resolve</span> + <span className="font-mono">launch</span> 跳转为主。</li>
                    <li><strong className={textPrimary(theme)}>dataset</strong>：元数据与目录为主，无统一 invoke 模型。</li>
                  </ul>
                </section>

                <section id="doc-skill-context" className="mt-14 space-y-4">
                  {proseH2(theme, 'Context 技能（Skill）')}
                  {prosePara(theme, (
                    <>
                      平台使用 <span className="font-mono">executionMode=context</span>：在资源中心填写规范 Markdown（<span className="font-mono">contextPrompt</span>）与 <span className="font-mono">parametersSchema</span>，可选绑定已发布 MCP（<span className="font-mono">skill_depends_mcp</span>）。对外仅通过目录与 <span className="font-mono">POST /catalog/resolve</span> 获取正文与绑定列表；<span className="font-mono">POST /invoke</span> 传入 <span className="font-mono">resourceType=skill</span> 将被拒绝。远程工具请登记 <span className="font-mono">mcp</span> 并 invoke MCP。
                    </>
                  ))}
                </section>

                <section id="doc-activity" className="mt-14 space-y-4">
                  {proseH2(theme, '个人用量与开发者统计')}
                  {prosePara(theme, (
                    <>
                      「我的用量 / 收藏」等对应 <span className="font-mono">/user/usage-records</span>、<span className="font-mono">/user/favorites</span>、<span className="font-mono">/user/usage-stats</span>。
                    </>
                  ))}
                  {prosePara(theme, (
                    <>
                      <span className="font-mono">GET /developer/my-statistics</span> 为个人摘要；Owner 资源成效用 <span className="font-mono">GET /dashboard/owner-resource-stats</span>。二者<strong className={textPrimary(theme)}>口径不同</strong>，请勿混读。
                    </>
                  ))}
                  <div id="doc-developer-stats" className="scroll-mt-24 space-y-3 rounded-xl border px-4 py-3 text-[15px] leading-7 border-slate-200/80 bg-slate-50/80 dark:border-white/10 dark:bg-white/[0.03]">
                    <p className={`font-semibold ${textPrimary(theme)}`}>控制台「开发者统计」页上的两块数字</p>
                    <p className={textSecondary(theme)}>
                      <strong className={textPrimary(theme)}>个人调用概览</strong>（<span className="font-mono">GET /developer/my-statistics</span>
                      ）：面向<strong>当前登录账号</strong>的调用摘要，含总调用、今日、错误率、延迟、Top 资源与 Key 等。
                    </p>
                    <p className={textSecondary(theme)}>
                      <strong className={textPrimary(theme)}>Owner 资源成效</strong>（<span className="font-mono">GET /dashboard/owner-resource-stats</span>
                      ）：按<strong>你作为资源 Owner</strong> 统计归属资源的网关调用与对应用量；周期可选，与上一块<strong>不是同一套口径</strong>，不能简单相加对比。
                    </p>
                    <p className={textSecondary(theme)}>
                      网关「调用」主要来自网关侧调用日志；「用量记录 invoke」来自应用侧埋点，用于与网关核对。浏览、仅 resolve、下载等不一定都记为 invoke，以接口与后端说明为准。更细的表与字段含义见下文「数据口径」。
                    </p>
                  </div>
                </section>

                <section id="doc-meta" className="mt-14 space-y-4">
                  {proseH2(theme, '标签、版本与可观测')}
                  {prosePara(theme, (
                    <>
                      目录可带 <span className="font-mono">tags</span> 并按标签库名字筛选。数据集自由文本须与标签库<strong>精确匹配</strong>才进入目录标签。<span className="font-mono">version</span> 锁定发布快照；<span className="font-mono">include=observability</span> 等展示健康/熔断摘要。
                    </>
                  ))}
                  <div className="flex flex-wrap gap-2 pt-1">
                    <button type="button" onClick={() => setViewMode('reference')} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium ${isDark ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-100 text-emerald-800'}`}>
                      <Tag size={16} /> 打开接口参考
                    </button>
                  </div>
                </section>

                <section id="doc-metrics" className="mt-14 space-y-4">
                  {proseH2(theme, '数据口径')}
                  {prosePara(theme, (
                    <>
                      <span className="font-mono">call_log</span> 反映<strong>网关远程调用</strong>；<span className="font-mono">usage_record</span> 反映门户行为。点开页面、仅 resolve、目录下载等不都会记为 invoke。请以控制台与接口字段为准。
                    </>
                  ))}
                </section>

                <section id="doc-faq" className="mt-14 space-y-4">
                  {proseH2(theme, '常见问题')}
                  {proseH3(theme, '403 或「scope 不允许」？')}
                  <ol className={`list-decimal space-y-2 pl-5 text-[15px] leading-7 ${textSecondary(theme)}`}>
                    <li><span className="font-mono">X-Api-Key</span> 是否为创建当次完整 <span className="font-mono">secretPlain</span>。</li>
                    <li>scope 是否覆盖当前动作。</li>
                    <li>资源是否 <span className="font-mono">published</span>。</li>
                    <li>跨账号调用时，资源是否已发布且 Key scope 覆盖当前动作。</li>
                    <li>应用 launch：Token 绑定 Key 被吊销会失败。</li>
                  </ol>
                  {proseH3(theme, '健康检查飘红？')}
                  {prosePara(theme, '聚合健康受 MQ 等依赖影响；可看子检查项或市场详情可观测信息。')}
                  {proseH3(theme, '密钥丢了？')}
                  {prosePara(theme, '无法找回明文；删旧建新，并更新集成方配置的完整密钥串。')}
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
                <span className="font-mono">X-Api-Key</span>。下文「API Key 与 scope」含完整规则与 403 排查。
              </p>
            </div>

            <div
              className={`mb-4 shrink-0 rounded-2xl border px-4 py-4 text-sm leading-relaxed space-y-4 ${
                isDark ? 'border-white/[0.08] bg-white/[0.03]' : 'border-slate-200 bg-white'
              }`}
            >
              <div>
                <h3 className={`text-sm font-bold ${textPrimary(theme)}`}>API Key 与 scope（详细）</h3>
                <p className={`mt-2 text-xs ${textSecondary(theme)}`}>
                  是否允许调用由多层条件共同决定，并非「有 Key 即可调」。
                </p>
              </div>
              <div>
                <h4 className={`text-xs font-semibold ${textPrimary(theme)}`}>1. 何种字符串可以作为 X-Api-Key</h4>
                <ul className={`mt-1.5 list-disc pl-4 text-xs space-y-1 ${textSecondary(theme)}`}>
                  <li>仅 <span className="font-mono">POST /user-settings/api-keys</span> 或 <span className="font-mono">POST /user-mgmt/api-keys</span> 成功响应中的 <span className="font-mono">data.secretPlain</span>（或等价完整明文字段，一般为 <span className="font-mono">sk_</span> 前缀 + 十六进制）。该值<strong>只在创建当次响应</strong>返回。</li>
                  <li>列表/详情中的 <span className="font-mono">maskedKey</span>、<span className="font-mono">prefix</span>、表主键 <span className="font-mono">id</span> 等均<strong>不能</strong>填入 <span className="font-mono">X-Api-Key</span>。网关将请求头整串与存库的 <span className="font-mono">key_hash</span> 比对。</li>
                  <li>个人设置侧撤销 Key 多为<strong>软删除</strong>（<span className="font-mono">status=revoked</span>），列表接口仍可能返回该记录；控制台列表仅展示未撤销项。明文丢失无法找回时只能删键再建。</li>
                </ul>
              </div>
              <div>
                <h4 className={`text-xs font-semibold ${textPrimary(theme)}`}>2. API Key scope（第二层）</h4>
                <ul className={`mt-1.5 list-disc pl-4 text-xs space-y-1 ${textSecondary(theme)}`}>
                  <li>目录、解析、调用要求 Key 具备网关认可的 <strong>scope</strong>，须覆盖 <span className="font-mono">catalog</span>、<span className="font-mono">resolve</span>、<span className="font-mono">invoke</span>（或 <span className="font-mono">catalog:*</span> 等形式及通配 <span className="font-mono">*</span>，以后端实现为准）。</li>
                  <li>创建时若未传 <span className="font-mono">scopes</span> 或被存成空数组，可能出现「API Key scope 不允许」等 403。<strong>本控制台偏好设置「新建」</strong>会默认附带 <span className="font-mono">scopes: [&quot;*&quot;]</span>；历史空 scope 的 Key 请撤销后重建。</li>
                  <li><strong>常见误区：</strong>目标动作需要 <span className="font-mono">invoke</span>，而 Key 的 scope 未覆盖，仍会 403。</li>
                </ul>
              </div>
              <div>
                <h4 className={`text-xs font-semibold ${textPrimary(theme)}`}>3. 已发布资源</h4>
                <ul className={`mt-1.5 list-disc pl-4 text-xs space-y-1 ${textSecondary(theme)}`}>
                  <li>资源须为 <span className="font-mono">published</span> 才会按平台规则对目录消费者开放；仍须满足各资源类型的调用边界（如 skill 须为托管形态且 Key 具备 invoke scope）。</li>
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
                  <li>若仍 403，确认目标资源已发布，并核对网关返回的具体错误码与文案。</li>
                  <li>顺带确认资源已 <span className="font-mono">published</span>，以及 RBAC / 管理接口头要求（本项目鉴权以实际网关为准）。</li>
                </ol>
              </div>
            </div>

            {/*
              外侧不用 overflow-hidden，否则 position:sticky 无法在页面滚动时相对视口固定侧栏。
              圆角拆到左右子元素，避免侧栏粘滞时被父级裁剪。
            */}
            <div
              className={`flex w-full flex-1 min-h-0 items-start rounded-[24px] border ${
                isDark ? 'border-white/[0.06]' : 'border-slate-100'
              }`}
            >
              <aside
                aria-label="API 分类"
                className={`sticky top-6 z-20 w-52 shrink-0 self-start rounded-l-[24px] ${glassSidebar(theme)}`}
              >
                <div className="max-h-[min(100vh-6rem,100dvh-6rem)] overflow-y-auto overscroll-y-contain p-3 space-y-1 custom-scrollbar">
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
                      <ChevronRight size={14} className={activeCat === cat.id ? 'opacity-100' : 'opacity-40'} aria-hidden />
                      <span className="truncate">{cat.label}</span>
                      <span className={`ml-auto text-xs px-1.5 py-0.5 rounded-md tabular-nums ${isDark ? 'bg-white/5 text-slate-500' : 'bg-slate-100 text-slate-400'}`}>{cat.endpoints.length}</span>
                    </button>
                  ))}
                </div>
              </aside>

              <div className="flex-1 min-w-0 rounded-r-[24px] p-4 sm:p-6 space-y-4">
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
                        <button type="button" className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${isDark ? 'text-neutral-300 hover:text-neutral-300' : 'text-neutral-900 hover:text-neutral-800'}`} onClick={() => openInPlayground(ep)}>
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
  );

  if (embedInHub) {
    return mainContent;
  }

  return (
    <MgmtPageShell
      theme={theme}
      fontSize={fontSize}
      titleIcon={BookOpen}
      breadcrumbSegments={['开发者中心', '接入指南']}
      description="面向师生的开发者导读：从入驻、登记资源到目录发现与网关调用；详请见正文与「接口参考」"
      toolbar={docsToolbar}
      contentScroll="document"
    >
      {mainContent}
    </MgmtPageShell>
  );
};
