import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ChevronDown, Save, Send } from 'lucide-react';
import type { Theme, FontSize } from '../../types';
import type { ResourceType } from '../../types/dto/catalog';
import type { ResourceUpsertRequest } from '../../types/dto/resource-center';
import { resourceCenterService } from '../../api/services/resource-center.service';
import { tagService } from '../../api/services/tag.service';
import { useAuthStore } from '../../stores/authStore';
import { LantuSelect } from '../../components/common/LantuSelect';
import { filterTagsForResourceType } from '../../utils/marketTags';
import { bentoCard, btnPrimary, btnSecondary, canvasBodyBg, mainScrollCompositorClass, textMuted, textPrimary } from '../../utils/uiClasses';

interface Props {
  theme: Theme;
  fontSize: FontSize;
  showMessage: (msg: string, type: 'success' | 'error' | 'info' | 'warning') => void;
  resourceType: ResourceType;
  resourceId?: number;
  onBack: () => void;
}

const TYPE_LABEL: Record<ResourceType, string> = {
  agent: '智能体',
  skill: '技能',
  mcp: 'MCP',
  app: '应用',
  dataset: '数据集',
};

const DEFAULT_MCP_AUTH_CONFIG_JSON = '{\n  "method": "tools/call"\n}';
type McpRegisterMode = 'http_json' | 'http_sse' | 'websocket';
const DEFAULT_AGENT_SPEC_JSON = '{\n  "url": "http://localhost:8000/agent/invoke",\n  "timeout": 30\n}';
const DEFAULT_SKILL_SPEC_JSON = '{\n  "url": "http://localhost:7000/skill/execute",\n  "protocol": "rest",\n  "timeout": 30\n}';
const DEFAULT_SKILL_PARAMS_SCHEMA_JSON = '{\n  "type": "object",\n  "properties": {\n    "city": { "type": "string" }\n  },\n  "required": ["city"]\n}';

const TYPE_GUIDE: Record<ResourceType, string> = {
  agent: '用于注册可执行任务的智能体，建议先填写基础信息，再补充 spec 和系统提示词。',
  skill: '用于注册可复用能力组件，spec 和参数结构建议直接粘贴标准 JSON，便于后续调用。',
  mcp: '登记 MCP 接入信息并保存；提审与发布流程见操作手册 §3.1.1。',
  app: '用于注册外部应用入口，建议优先提供可直接访问的 URL，并选择正确的打开方式。',
  dataset: '用于登记数据资产，请尽量填写数据格式、规模和标签，方便检索与治理。',
};

function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function isValidWsUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'ws:' || url.protocol === 'wss:';
  } catch {
    return false;
  }
}

function inferMcpTransport(endpoint: string, authConfig?: Record<string, unknown>): 'http' | 'websocket' {
  const transport = typeof authConfig?.transport === 'string' ? authConfig.transport.toLowerCase() : '';
  if (transport === 'websocket') return 'websocket';
  const ep = endpoint.trim().toLowerCase();
  if (ep.startsWith('ws://') || ep.startsWith('wss://')) return 'websocket';
  return 'http';
}

function modeToTransport(mode: McpRegisterMode): 'http' | 'websocket' {
  return mode === 'websocket' ? 'websocket' : 'http';
}

function parseJsonObject(value: string, fieldLabel: string): { ok: boolean; data?: Record<string, unknown>; message: string } {
  try {
    const parsed = JSON.parse(value || '{}');
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { ok: false, message: `${fieldLabel} 必须是 JSON 对象` };
    }
    return { ok: true, data: parsed as Record<string, unknown>, message: '' };
  } catch {
    return { ok: false, message: `${fieldLabel} 不是合法 JSON` };
  }
}

function parseRelatedIds(value: string): { ids: number[]; invalidTokens: string[] } {
  const tokens = value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const invalidTokens: string[] = [];
  const ids = tokens
    .map((token) => {
      if (!/^\d+$/.test(token)) {
        invalidTokens.push(token);
        return 0;
      }
      return Number(token);
    })
    .filter((n) => Number.isFinite(n) && n > 0);
  return { ids, invalidTokens };
}

export const ResourceRegisterPage: React.FC<Props> = ({
  theme,
  showMessage,
  resourceType,
  resourceId,
  onBack,
}) => {
  const isDark = theme === 'dark';
  const user = useAuthStore((s) => s.user);
  const [tagOptions, setTagOptions] = useState<{ value: string; label: string }[]>([{ value: '', label: '不选' }]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    resourceCode: '',
    displayName: '',
    description: '',
    sourceType: 'internal',
    providerId: '',
    categoryId: '',
    endpoint: '',
    mcpRegisterMode: 'http_json' as McpRegisterMode,
    mcpTransport: 'http',
    protocol: 'mcp',
    authType: 'none',
    authConfigJson: DEFAULT_MCP_AUTH_CONFIG_JSON,
    appUrl: '',
    embedType: 'iframe',
    dataType: 'structured',
    format: 'json',
    recordCount: 0,
    fileSize: 0,
    tags: '',
    skillType: 'http_api',
    mode: 'TOOL',
    agentType: 'http_api',
    maxConcurrency: 10,
    systemPrompt: '',
    specJson: '{"url":"","timeout":30}',
    paramsSchemaJson: DEFAULT_SKILL_PARAMS_SCHEMA_JSON,
    relatedResourceIds: '',
  });

  useEffect(() => {
    let cancelled = false;
    tagService
      .list()
      .then((list) => {
        if (cancelled) return;
        const filtered = filterTagsForResourceType(Array.isArray(list) ? list : [], resourceType);
        setTagOptions([
          { value: '', label: '不选' },
          ...filtered.map((t) => ({ value: String(t.id), label: `${t.name}（id=${t.id}）` })),
        ]);
      })
      .catch(() => {
        if (!cancelled) setTagOptions([{ value: '', label: '不选' }]);
      });
    return () => {
      cancelled = true;
    };
  }, [resourceType]);

  useEffect(() => {
    if (!resourceId) return;
    let cancelled = false;
    setLoading(true);
    resourceCenterService.getById(resourceId)
      .then((item) => {
        if (cancelled) return;
        setForm((prev) => ({
          ...prev,
          resourceCode: item.resourceCode || '',
          displayName: item.displayName || '',
          description: item.description || '',
          sourceType: item.sourceType || 'internal',
          providerId: item.providerId ?? '',
          categoryId: item.categoryId ?? '',
          endpoint: item.endpoint || '',
          mcpRegisterMode:
            resourceType === 'mcp'
              ? (inferMcpTransport(
                  item.endpoint || '',
                  item.authConfig && typeof item.authConfig === 'object' && !Array.isArray(item.authConfig)
                    ? (item.authConfig as Record<string, unknown>)
                    : undefined,
                ) === 'websocket'
                ? 'websocket'
                : 'http_json')
              : prev.mcpRegisterMode,
          mcpTransport:
            resourceType === 'mcp'
              ? inferMcpTransport(
                  item.endpoint || '',
                  item.authConfig && typeof item.authConfig === 'object' && !Array.isArray(item.authConfig)
                    ? (item.authConfig as Record<string, unknown>)
                    : undefined,
                )
              : prev.mcpTransport,
          protocol: item.protocol || 'mcp',
          ...(resourceType === 'mcp'
            ? {
                authType: item.authType || 'none',
                authConfigJson:
                  item.authConfig && typeof item.authConfig === 'object'
                    ? JSON.stringify(item.authConfig, null, 2)
                    : DEFAULT_MCP_AUTH_CONFIG_JSON,
              }
            : {}),
          appUrl: item.appUrl || '',
          embedType: item.embedType || 'iframe',
          dataType: item.dataType || 'structured',
          format: item.format || 'json',
          recordCount: Number(item.recordCount ?? 0) || 0,
          fileSize: Number(item.fileSize ?? 0) || 0,
          tags: Array.isArray(item.tags) ? item.tags.join(',') : '',
        }));
      })
      .catch(() => {
        showMessage('加载资源详情失败，已进入空白表单', 'warning');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [resourceId, resourceType, showMessage]);

  const validate = useMemo(() => {
    if (!resourceId && !user?.id) return '请先登录后再注册资源';
    if (!form.resourceCode.trim()) return '请填写资源编码（resourceCode）';
    if (!form.displayName.trim()) return '请填写显示名称（displayName）';
    if (!/^[a-zA-Z0-9_-]{3,64}$/.test(form.resourceCode.trim())) {
      return '资源编码（resourceCode）需满足 3-64 位，仅支持字母、数字、下划线和短横线';
    }
    if (resourceType === 'mcp') {
      if (!form.endpoint.trim()) return '请填写服务地址（endpoint）';
      const activeTransport = modeToTransport(form.mcpRegisterMode);
      if (activeTransport === 'websocket') {
        if (!isValidWsUrl(form.endpoint.trim())) {
          return '当 transport=websocket 时，endpoint 必须是 ws:// 或 wss:// URL';
        }
      } else if (!isValidUrl(form.endpoint.trim())) {
        return '当 transport=http 时，endpoint 必须是 http:// 或 https:// URL';
      }
      if (form.protocol.trim() && form.protocol.trim().toLowerCase() !== 'mcp') {
        return 'MCP 资源 protocol 建议固定为 mcp';
      }
      const ac = form.authConfigJson.trim();
      if (ac) {
        const authParsed = parseJsonObject(form.authConfigJson, '鉴权配置（authConfig JSON）');
        if (!authParsed.ok) return authParsed.message;
      }
    }
    if (resourceType === 'agent') {
      if (!form.agentType.trim()) return '请填写智能体类型（agentType）';
      const specParsed = parseJsonObject(form.specJson, '规格配置（spec JSON）');
      if (!specParsed.ok) return specParsed.message;
      const specUrl = typeof specParsed.data?.url === 'string' ? specParsed.data.url.trim() : '';
      if (!specUrl) return '智能体规格配置（spec JSON）中必须包含 url';
      if (!isValidUrl(specUrl)) return '智能体规格配置中的 url 必须是有效的 http/https URL';
      const related = parseRelatedIds(form.relatedResourceIds);
      if (related.invalidTokens.length > 0) {
        return `关联资源 ID 仅支持正整数（逗号分隔），非法值：${related.invalidTokens.join(', ')}`;
      }
      if (!Number.isFinite(Number(form.maxConcurrency)) || Number(form.maxConcurrency) < 1 || Number(form.maxConcurrency) > 1000) {
        return '最大并发（maxConcurrency）必须在 1~1000 之间';
      }
    }
    if (resourceType === 'skill') {
      if (!form.skillType.trim()) return '请填写技能类型（skillType）';
      const specParsed = parseJsonObject(form.specJson, '规格配置（spec JSON）');
      if (!specParsed.ok) return specParsed.message;
      const specUrl = typeof specParsed.data?.url === 'string' ? specParsed.data.url.trim() : '';
      if (!specUrl) return '技能规格配置（spec JSON）中必须包含 url';
      if (!isValidUrl(specUrl)) return '技能规格配置中的 url 必须是有效的 http/https URL';
      const schemaParsed = parseJsonObject(form.paramsSchemaJson, '参数结构（parametersSchema JSON）');
      if (!schemaParsed.ok) return schemaParsed.message;
    }
    if (resourceType === 'app') {
      if (!form.appUrl.trim()) return '请填写应用地址（appUrl）';
      if (!isValidUrl(form.appUrl.trim())) return '应用地址（appUrl）必须是有效的 http/https URL';
      if (!form.embedType.trim()) return '请选择嵌入方式（embedType）';
      const related = parseRelatedIds(form.relatedResourceIds);
      if (related.invalidTokens.length > 0) {
        return `关联资源 ID 仅支持正整数（逗号分隔），非法值：${related.invalidTokens.join(', ')}`;
      }
    }
    if (resourceType === 'dataset') {
      if (!form.dataType.trim()) return '请填写数据类型（dataType）';
      if (!form.format.trim()) return '请填写数据格式（format）';
      if (Number(form.recordCount) < 0) return '记录数（recordCount）不能小于 0';
      if (Number(form.fileSize) < 0) return '文件大小（fileSize）不能小于 0';
    }
    return '';
  }, [form.agentType, form.appUrl, form.authConfigJson, form.dataType, form.displayName, form.embedType, form.endpoint, form.fileSize, form.format, form.maxConcurrency, form.mcpRegisterMode, form.paramsSchemaJson, form.protocol, form.recordCount, form.resourceCode, form.skillType, form.specJson, resourceId, resourceType, user?.id]);

  const buildPayload = (): ResourceUpsertRequest => {
    const providerIdRaw = resourceId ? (form.providerId.trim() || user?.id) : user?.id;
    const providerIdNum = Number(providerIdRaw);
    const categoryIdNum = Number(form.categoryId.trim());
    const baseFields = {
      resourceCode: form.resourceCode.trim(),
      displayName: form.displayName.trim(),
      description: form.description.trim() || undefined,
      sourceType: form.sourceType,
      ...(Number.isFinite(providerIdNum) && providerIdNum > 0 ? { providerId: providerIdNum } : {}),
      ...(form.categoryId.trim() && Number.isFinite(categoryIdNum) && categoryIdNum > 0 ? { categoryId: categoryIdNum } : {}),
    };
    if (resourceType === 'mcp') {
      const acTrim = form.authConfigJson.trim();
      let authConfig: Record<string, unknown> = {};
      if (acTrim) {
        const parsed = parseJsonObject(form.authConfigJson, '鉴权配置（authConfig JSON）');
        if (!parsed.ok) throw new Error(parsed.message);
        authConfig = parsed.data || {};
      }
      authConfig = { ...authConfig, transport: modeToTransport(form.mcpRegisterMode) };
      return {
        ...baseFields,
        resourceType: 'mcp',
        endpoint: form.endpoint.trim(),
        protocol: 'mcp',
        authType: form.authType || 'none',
        authConfig,
      };
    }
    if (resourceType === 'skill') {
      const parsedSpec = parseJsonObject(form.specJson, '规格配置（spec JSON）');
      const parsedSchema = parseJsonObject(form.paramsSchemaJson, '参数结构（parametersSchema JSON）');
      if (!parsedSpec.ok || !parsedSchema.ok) throw new Error(parsedSpec.ok ? parsedSchema.message : parsedSpec.message);
      return {
        ...baseFields,
        resourceType: 'skill',
        skillType: form.skillType.trim(),
        mode: form.mode,
        spec: parsedSpec.data || {},
        parametersSchema: parsedSchema.data || {},
      };
    }
    if (resourceType === 'agent') {
      const parsedSpec = parseJsonObject(form.specJson, '规格配置（spec JSON）');
      if (!parsedSpec.ok) throw new Error(parsedSpec.message);
      const agentRelated = parseRelatedIds(form.relatedResourceIds).ids;
      return {
        ...baseFields,
        resourceType: 'agent',
        agentType: form.agentType.trim(),
        mode: form.mode,
        spec: parsedSpec.data || {},
        maxConcurrency: Number(form.maxConcurrency) || 1,
        systemPrompt: form.systemPrompt || undefined,
        relatedResourceIds: agentRelated.length > 0 ? agentRelated : undefined,
      };
    }
    if (resourceType === 'app') {
      const appRelated = parseRelatedIds(form.relatedResourceIds).ids;
      return {
        ...baseFields,
        resourceType: 'app',
        appUrl: form.appUrl.trim(),
        embedType: form.embedType.trim(),
        relatedResourceIds: appRelated.length > 0 ? appRelated : undefined,
      };
    }
    return {
      ...baseFields,
      resourceType: 'dataset',
      dataType: form.dataType.trim(),
      format: form.format.trim(),
      recordCount: Number(form.recordCount) || 0,
      fileSize: Number(form.fileSize) || 0,
      tags: form.tags.split(',').map((s) => s.trim()).filter(Boolean),
    };
  };

  const save = async (submitAfterSave: boolean) => {
    if (validate) {
      showMessage(validate, 'error');
      return;
    }
    setLoading(true);
    try {
      let id = resourceId;
      const payload = buildPayload();
      if (resourceId) {
        const updated = await resourceCenterService.update(resourceId, payload);
        id = updated.id;
      } else {
        const created = await resourceCenterService.create(payload);
        id = created.id;
      }
      if (submitAfterSave && id) {
        await resourceCenterService.submit(id);
        showMessage('保存并提审成功（状态 pending_review）', 'success');
      } else {
        showMessage('保存成功', 'success');
      }
      onBack();
    } catch (err) {
      showMessage(err instanceof Error ? err.message : '保存失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`flex-1 overflow-y-auto custom-scrollbar ${mainScrollCompositorClass} ${canvasBodyBg(theme)}`}>
      <div className="px-3 py-4 sm:px-4 lg:px-5">
        <div className={`${bentoCard(theme)} overflow-hidden`}>
          <div className={`flex items-center justify-between border-b px-6 py-4 ${isDark ? 'border-white/[0.06]' : 'border-slate-100'}`}>
            <div className="max-w-3xl">
              <h2 className={`text-lg font-bold ${textPrimary(theme)}`}>
                {resourceId ? '编辑' : '注册'}{TYPE_LABEL[resourceType]}
              </h2>
              <p className={`mt-0.5 text-xs ${textMuted(theme)}`}>统一资源注册中心（/resource-center/resources）</p>
              <p className={`mt-2 text-xs leading-5 ${textMuted(theme)}`}>{TYPE_GUIDE[resourceType]}</p>
              {resourceType === 'mcp' && (
                <p className={`mt-1.5 text-xs ${textMuted(theme)}`}>
                  字段与步骤详解：
                  <code className="mx-1 rounded px-1 py-0.5 font-mono text-[11px] opacity-90">docs/frontend-resource-registration-runbook.md</code>
                  （§3.1）
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button type="button" className={btnSecondary(theme)} onClick={onBack}>
                <ArrowLeft size={15} />
                返回
              </button>
              <button type="button" className={btnGhostStyle(theme)} onClick={() => void save(false)} disabled={loading}>
                <Save size={15} />
                保存
              </button>
              <button type="button" className={btnPrimary} onClick={() => void save(true)} disabled={loading}>
                <Send size={15} />
                保存并提审
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 p-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <div
                className={`rounded-xl border px-3 py-2 text-xs ${
                  validate
                    ? isDark
                      ? 'border-amber-400/30 bg-amber-400/10 text-amber-200'
                      : 'border-amber-300 bg-amber-50 text-amber-800'
                    : isDark
                      ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200'
                      : 'border-emerald-300 bg-emerald-50 text-emerald-800'
                }`}
              >
                {validate || '表单校验通过，可直接保存或保存并提审'}
              </div>
            </div>
            <Field
              label="资源编码（resourceCode）*"
              hint={resourceType === 'mcp' ? '3-64 位；字母/数字/下划线/短横线' : '3-64 位；字母/数字/下划线/短横线，例如：agent_weather-tool'}
            >
              <input value={form.resourceCode} onChange={(e) => setForm((p) => ({ ...p, resourceCode: e.target.value }))} className={inputClass(isDark)} placeholder="例如：agent-weather-tool" />
            </Field>
            <Field
              label="显示名称（displayName）*"
              hint={resourceType === 'mcp' ? '列表与详情展示名' : '面向业务用户展示，建议使用易懂中文名称。'}
            >
              <input value={form.displayName} onChange={(e) => setForm((p) => ({ ...p, displayName: e.target.value }))} className={inputClass(isDark)} placeholder="例如：天气查询智能体" />
            </Field>
            <Field label="来源类型（sourceType）" hint={resourceType === 'mcp' ? '资源来源分类' : '表示资源来源归属，用于后续权限和审计。'}>
              <ThemedSelect
                isDark={isDark}
                value={form.sourceType}
                onChange={(value) => setForm((p) => ({ ...p, sourceType: value }))}
                options={[
                  { value: 'internal', label: '内部（internal）' },
                  { value: 'cloud', label: '云端（cloud）' },
                  { value: 'partner', label: '合作方（partner）' },
                  { value: 'department', label: '部门（department）' },
                ]}
              />
            </Field>
            <Field
              label="资源描述（description）"
              hint={resourceType === 'mcp' ? '用途与能力简述' : '说明该资源的用途、输入输出、适用场景，便于小白理解。'}
              full
            >
              <textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} rows={3} className={inputClass(isDark)} placeholder="例如：用于查询城市实时天气，输入城市名，返回温度和天气状态。" />
            </Field>
            <Field
              label="资源归属（providerId）"
              hint={resourceType === 'mcp' ? '新建时默认当前登录用户' : '文档 5.1：提供方即资源拥有者。新建时自动取当前登录用户 ID；编辑时沿用服务端记录（可与当前用户一致）。'}
              full
            >
              <div
                className={`rounded-xl border px-3 py-2 text-sm ${
                  isDark ? 'border-white/10 bg-white/[0.03] text-slate-200' : 'border-slate-200 bg-slate-50 text-slate-800'
                }`}
              >
                {resourceId ? (form.providerId || user?.id || '—') : (user?.id ?? '—')}
              </div>
            </Field>
            <Field
              label={`${TYPE_LABEL[resourceType]} 标签（categoryId）`}
              hint={
                resourceType === 'mcp'
                  ? '选填，标签 id'
                  : '选填。来自标签管理（GET /tags），按资源类型筛选；提交值为标签 id，供目录 categoryId 筛选。'
              }
            >
              <LantuSelect
                theme={theme}
                value={form.categoryId}
                onChange={(v) => setForm((p) => ({ ...p, categoryId: v }))}
                options={tagOptions}
                placeholder="不选标签"
              />
            </Field>

            {resourceType === 'mcp' && (
              <>
                <Field label="注册方式" hint="三种方式：HTTP JSON、HTTP+SSE、WebSocket">
                  <ThemedSelect
                    isDark={isDark}
                    value={form.mcpRegisterMode}
                    onChange={(value) => {
                      const nextMode = value as McpRegisterMode;
                      setForm((p) => ({
                        ...p,
                        mcpRegisterMode: nextMode,
                        mcpTransport: modeToTransport(nextMode),
                      }));
                    }}
                    options={[
                      { value: 'http_json', label: 'MCP over HTTP（JSON）' },
                      { value: 'http_sse', label: 'MCP over HTTP + SSE' },
                      { value: 'websocket', label: 'MCP over WebSocket' },
                    ]}
                  />
                </Field>
                <Field label="传输方式（transport）" hint="提交时自动写入 authConfig.transport">
                  <ThemedSelect
                    isDark={isDark}
                    value={modeToTransport(form.mcpRegisterMode)}
                    onChange={(value) =>
                      setForm((p) => ({
                        ...p,
                        mcpTransport: value as 'http' | 'websocket',
                        mcpRegisterMode: value === 'websocket' ? 'websocket' : 'http_json',
                      }))
                    }
                    options={[
                      { value: 'http', label: 'HTTP / SSE（http）' },
                      { value: 'websocket', label: 'WebSocket（websocket）' },
                    ]}
                  />
                </Field>
                <Field
                  label="服务地址（endpoint）*"
                  hint={modeToTransport(form.mcpRegisterMode) === 'websocket' ? '仅 ws:// 或 wss:// URL' : '仅 http:// 或 https:// URL'}
                  full
                >
                  <input
                    value={form.endpoint}
                    onChange={(e) => setForm((p) => ({ ...p, endpoint: e.target.value }))}
                    className={inputClass(isDark)}
                    placeholder={modeToTransport(form.mcpRegisterMode) === 'websocket' ? 'ws://localhost:5001/mcp' : 'http://localhost:5000/mcp'}
                  />
                </Field>
                <Field label="协议（protocol）" hint="对接类型，默认 mcp">
                  <input value="mcp" readOnly className={inputClass(isDark)} />
                </Field>
                <Field label="鉴权方式（authType）" hint="默认 none">
                  <ThemedSelect
                    isDark={isDark}
                    value={form.authType}
                    onChange={(value) => setForm((p) => ({ ...p, authType: value }))}
                    options={[
                      { value: 'none', label: '无鉴权（none）' },
                      { value: 'api_key', label: 'API Key（api_key）' },
                      { value: 'bearer', label: 'Bearer Token（bearer）' },
                    ]}
                  />
                </Field>
                <Field label="鉴权配置（authConfig）" hint="JSON 对象；提交时会自动写入 transport 字段" full>
                  <div className="mb-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      className={btnSecondary(theme)}
                      onClick={() =>
                        setForm((p) => ({
                          ...p,
                          authConfigJson:
                            modeToTransport(p.mcpRegisterMode) === 'websocket'
                              ? '{\n  "transport": "websocket",\n  "method": "tools/call"\n}'
                              : '{\n  "method": "tools/call"\n}'
                        }))
                      }
                    >
                      一键填入推荐示例
                    </button>
                  </div>
                  <textarea
                    value={form.authConfigJson}
                    onChange={(e) => setForm((p) => ({ ...p, authConfigJson: e.target.value }))}
                    rows={5}
                    className={`${inputClass(isDark)} font-mono text-xs`}
                    placeholder={DEFAULT_MCP_AUTH_CONFIG_JSON}
                  />
                </Field>
              </>
            )}

            {(resourceType === 'skill' || resourceType === 'agent') && (
              <>
                <Field
                  label={resourceType === 'skill' ? '技能类型（skillType）' : '智能体类型（agentType）'}
                  hint="通常为 http_api、workflow 等实现类型，请与执行引擎配置一致。"
                >
                  <input value={resourceType === 'skill' ? form.skillType : form.agentType} onChange={(e) => setForm((p) => ({ ...p, [resourceType === 'skill' ? 'skillType' : 'agentType']: e.target.value }))} className={inputClass(isDark)} placeholder="例如：http_api" />
                </Field>
                <Field label="运行模式（mode）" hint="例如 TOOL、CHAT；请与平台支持模式保持一致。">
                  <input value={form.mode} onChange={(e) => setForm((p) => ({ ...p, mode: e.target.value }))} className={inputClass(isDark)} placeholder="例如：TOOL" />
                </Field>
                <Field label="规格配置（spec JSON）" hint="填写有效 JSON，描述调用地址、超时、方法等运行配置。" full>
                  <div className="mb-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      className={btnSecondary(theme)}
                      onClick={() =>
                        setForm((p) => ({
                          ...p,
                          specJson: resourceType === 'skill' ? DEFAULT_SKILL_SPEC_JSON : DEFAULT_AGENT_SPEC_JSON,
                        }))
                      }
                    >
                      一键填入示例
                    </button>
                  </div>
                  <textarea value={form.specJson} onChange={(e) => setForm((p) => ({ ...p, specJson: e.target.value }))} rows={4} className={inputClass(isDark)} placeholder='例如：{"url":"https://api.demo.com/run","timeout":30}' />
                </Field>
                {resourceType === 'skill' && (
                  <Field label="参数结构（parametersSchema JSON）" hint="建议按 JSON Schema 规范填写，方便调用方生成参数表单。" full>
                    <div className="mb-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        className={btnSecondary(theme)}
                        onClick={() => setForm((p) => ({ ...p, paramsSchemaJson: DEFAULT_SKILL_PARAMS_SCHEMA_JSON }))}
                      >
                        一键填入示例
                      </button>
                    </div>
                    <textarea value={form.paramsSchemaJson} onChange={(e) => setForm((p) => ({ ...p, paramsSchemaJson: e.target.value }))} rows={4} className={inputClass(isDark)} placeholder='例如：{"type":"object","properties":{"city":{"type":"string"}}}' />
                  </Field>
                )}
                {resourceType === 'agent' && (
                  <>
                    <Field label="最大并发（maxConcurrency）" hint="控制同一时间可并行执行的任务数，建议从 5~20 起步。">
                      <input type="number" value={form.maxConcurrency} onChange={(e) => setForm((p) => ({ ...p, maxConcurrency: Number(e.target.value) || 1 }))} className={inputClass(isDark)} placeholder="例如：10" />
                    </Field>
                    <Field label="系统提示词（systemPrompt）" hint="定义该智能体的角色、边界和输出格式，影响回答质量。" full>
                      <textarea value={form.systemPrompt} onChange={(e) => setForm((p) => ({ ...p, systemPrompt: e.target.value }))} rows={3} className={inputClass(isDark)} placeholder="例如：你是企业知识库助手，请优先返回结构化摘要和来源链接。" />
                    </Field>
                    <Field label="关联资源 ID" hint="可选。填写依赖的 Skill 等资源 ID，逗号分隔。">
                      <input value={form.relatedResourceIds} onChange={(e) => setForm((p) => ({ ...p, relatedResourceIds: e.target.value }))} className={inputClass(isDark)} placeholder="例如：12, 34, 56" />
                    </Field>
                  </>
                )}
              </>
            )}

            {resourceType === 'app' && (
              <>
                <Field label="应用地址（appUrl）" hint="填写用户可访问的页面地址，建议使用 https。">
                  <input value={form.appUrl} onChange={(e) => setForm((p) => ({ ...p, appUrl: e.target.value }))} className={inputClass(isDark)} placeholder="例如：https://app.example.com" />
                </Field>
                <Field label="嵌入方式（embedType）" hint="iframe 适合内嵌，redirect 适合独立跳转。">
                  <ThemedSelect
                    isDark={isDark}
                    value={form.embedType}
                    onChange={(value) => setForm((p) => ({ ...p, embedType: value }))}
                    options={[
                      { value: 'iframe', label: '页面内嵌（iframe）' },
                      { value: 'redirect', label: '页面跳转（redirect）' },
                      { value: 'micro_frontend', label: '微前端（micro_frontend）' },
                    ]}
                  />
                </Field>
                <Field label="关联资源 ID" hint="可选。填写依赖的 Agent/Skill 等资源 ID，逗号分隔。">
                  <input value={form.relatedResourceIds} onChange={(e) => setForm((p) => ({ ...p, relatedResourceIds: e.target.value }))} className={inputClass(isDark)} placeholder="例如：12, 34, 56" />
                </Field>
              </>
            )}

            {resourceType === 'dataset' && (
              <>
                <Field label="数据类型（dataType）" hint="例如 structured、text、image，用于分类检索。">
                  <input value={form.dataType} onChange={(e) => setForm((p) => ({ ...p, dataType: e.target.value }))} className={inputClass(isDark)} placeholder="例如：structured" />
                </Field>
                <Field label="数据格式（format）" hint="例如 json、csv、parquet。">
                  <input value={form.format} onChange={(e) => setForm((p) => ({ ...p, format: e.target.value }))} className={inputClass(isDark)} placeholder="例如：json" />
                </Field>
                <Field label="记录数（recordCount）" hint="填写大致规模即可，便于容量评估。">
                  <input type="number" value={form.recordCount} onChange={(e) => setForm((p) => ({ ...p, recordCount: Number(e.target.value) || 0 }))} className={inputClass(isDark)} placeholder="例如：100000" />
                </Field>
                <Field label="文件大小KB（fileSize）" hint="用于评估存储与传输成本，单位为 KB。">
                  <input type="number" value={form.fileSize} onChange={(e) => setForm((p) => ({ ...p, fileSize: Number(e.target.value) || 0 }))} className={inputClass(isDark)} placeholder="例如：2048" />
                </Field>
                <Field label="标签（tags，逗号分隔）" hint="用于检索过滤，例如：客服,知识库,中文。" full>
                  <input value={form.tags} onChange={(e) => setForm((p) => ({ ...p, tags: e.target.value }))} className={inputClass(isDark)} placeholder="例如：天气,实时,公共服务" />
                </Field>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const Field: React.FC<{ label: string; hint?: string; children: React.ReactNode; full?: boolean }> = ({ label, hint, children, full }) => (
  <div className={full ? 'md:col-span-2' : ''}>
    <label className="mb-1 block text-xs font-medium text-slate-500">{label}</label>
    {children}
    {hint ? <p className="mt-1 text-[11px] leading-5 text-slate-400">{hint}</p> : null}
  </div>
);

interface SelectOption {
  value: string;
  label: string;
}

const ThemedSelect: React.FC<{
  isDark: boolean;
  value: string;
  onChange: (nextValue: string) => void;
  options: SelectOption[];
  disabled?: boolean;
}> = ({ isDark, value, onChange, options, disabled = false }) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const listboxId = useId();
  const selected = options.find((item) => item.value === value);

  useEffect(() => {
    if (!open) return;

    const handleOutsideClick = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', handleOutsideClick);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        className={`${inputClass(isDark)} flex items-center justify-between text-left ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          setOpen((prev) => !prev);
        }}
      >
        <span>{selected?.label ?? value}</span>
        <ChevronDown size={16} className={`${isDark ? 'text-slate-400' : 'text-slate-500'} transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          id={listboxId}
          role="listbox"
          className={`absolute z-30 mt-1 max-h-56 w-full overflow-auto rounded-xl border py-1 shadow-lg ${
            isDark ? 'border-white/10 bg-[#1a1f2e]' : 'border-slate-200 bg-white'
          }`}
        >
          {options.map((option) => {
            const active = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={active}
                className={`w-full px-3 py-2 text-left text-sm ${
                  active
                    ? isDark
                      ? 'bg-white/10 text-slate-100'
                      : 'bg-slate-100 text-slate-900'
                    : isDark
                      ? 'text-slate-300 hover:bg-white/5'
                      : 'text-slate-700 hover:bg-slate-50'
                }`}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

function inputClass(isDark: boolean): string {
  return `w-full rounded-xl border px-3 py-2 text-sm outline-none ${
    isDark ? 'border-white/10 bg-white/[0.04] text-slate-200' : 'border-slate-200 bg-white text-slate-700'
  }`;
}

function btnGhostStyle(theme: Theme): string {
  return `${btnSecondary(theme)} gap-1`;
}
