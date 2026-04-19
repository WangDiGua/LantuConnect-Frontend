import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Boxes, CheckCircle2, ExternalLink, Loader2, RefreshCw, Sparkles, Wand2 } from 'lucide-react';

import { capabilityService } from '../../api/services/capability.service';
import { BindingClosureSection } from '../../components/business/BindingClosureSection';
import { AutoHeightTextarea } from '../../components/common/AutoHeightTextarea';
import { CapabilityWorkbench } from '../../components/capability/CapabilityWorkbench';
import { buildPath } from '../../constants/consoleRoutes';
import type { Theme, FontSize } from '../../types';
import type { CapabilityDetailVO, CapabilityImportSuggestionVO, CapabilityType } from '../../types/dto/capability';
import { inputBaseError } from '../../utils/uiClasses';
import { btnPrimary, btnSecondary, textMuted, textPrimary, textSecondary } from '../../utils/uiClasses';
import { MgmtPageShell } from '../userMgmt/MgmtPageShell';
import {
  getCapabilityRegisterManualTarget,
  getCapabilityRegisterResourceType,
  parseCapabilityRegisterRouteId,
} from './capabilityRegisterFlow';

type Props = {
  theme: Theme;
  fontSize: FontSize;
  showMessage: (msg: string, type: 'success' | 'error' | 'info' | 'warning') => void;
  onBack: () => void;
  routeId?: string;
};

type JsonFieldKey = 'inputSchema' | 'defaults' | 'authRefs' | 'capabilities';

const STATUS_LABEL_ZH: Record<string, string> = {
  draft: '草稿',
  pending_review: '待审核',
  testing: '测试中',
  published: '已发布',
  rejected: '已驳回',
  deprecated: '已下线',
};

function parseJsonObject(text: string, fieldLabel: string): Record<string, unknown> {
  if (!text.trim()) return {};
  const parsed = JSON.parse(text);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`${fieldLabel} 必须是 JSON 对象`);
  }
  return parsed as Record<string, unknown>;
}

function parseBindings(text: string): number[] {
  return text
    .split(',')
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isFinite(item) && item > 0);
}

function prettyJson(value: unknown): string {
  if (!value || typeof value !== 'object') return '{}';
  return JSON.stringify(value, null, 2);
}

function typeLabel(type: CapabilityType): string {
  if (type === 'skill') return 'Skill';
  if (type === 'mcp') return 'MCP';
  return 'Agent';
}

function statusLabel(status?: string): string {
  const key = String(status ?? '').trim().toLowerCase();
  if (!key) return '未设置';
  return STATUS_LABEL_ZH[key] ?? key;
}

function statusBadgeClass(theme: Theme, status?: string): string {
  const isDark = theme === 'dark';
  const key = String(status ?? '').trim().toLowerCase();
  if (key === 'published') return isDark ? 'bg-emerald-500/15 text-emerald-200' : 'bg-emerald-100 text-emerald-900';
  if (key === 'pending_review') return isDark ? 'bg-amber-500/15 text-amber-200' : 'bg-amber-100 text-amber-900';
  if (key === 'testing') return isDark ? 'bg-sky-500/15 text-sky-200' : 'bg-sky-100 text-sky-900';
  if (key === 'rejected') return isDark ? 'bg-rose-500/15 text-rose-200' : 'bg-rose-100 text-rose-900';
  return isDark ? 'bg-white/[0.08] text-slate-200' : 'bg-slate-100 text-slate-800';
}

function buildCapabilityRegisterUrl(capabilityId?: number | null, type?: CapabilityType | null): string {
  const base = buildPath('user', 'capability-register', capabilityId ?? undefined);
  if (!type) return base;
  const params = new URLSearchParams({ type: getCapabilityRegisterResourceType(type) });
  return `${base}?${params.toString()}`;
}

function summaryValue(value?: string | number | null, fallback = '未设置'): string {
  if (value == null) return fallback;
  const text = String(value).trim();
  return text ? text : fallback;
}

export const CapabilityRegisterPage: React.FC<Props> = ({ theme, fontSize, showMessage, onBack, routeId }) => {
  const navigate = useNavigate();
  const isDark = theme === 'dark';
  const capabilityId = useMemo(() => parseCapabilityRegisterRouteId(routeId), [routeId]);

  const [source, setSource] = useState('');
  const [suggestion, setSuggestion] = useState<CapabilityImportSuggestionVO | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [resourceCode, setResourceCode] = useState('');
  const [description, setDescription] = useState('');
  const [detectedType, setDetectedType] = useState<CapabilityType>('agent');
  const [runtimeMode, setRuntimeMode] = useState('');
  const [inputSchemaText, setInputSchemaText] = useState('{}');
  const [defaultsText, setDefaultsText] = useState('{}');
  const [authRefsText, setAuthRefsText] = useState('{}');
  const [capabilitiesText, setCapabilitiesText] = useState('{}');
  const [bindingsText, setBindingsText] = useState('');
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [submitting, setSubmitting] = useState<'draft' | 'submit' | null>(null);
  const [detecting, setDetecting] = useState(false);
  const [createdDetail, setCreatedDetail] = useState<CapabilityDetailVO | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [detailReloadSeed, setDetailReloadSeed] = useState(0);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<'source' | 'displayName' | 'resourceCode' | JsonFieldKey, string>>>({});

  const resultManualTarget = useMemo(
    () => (createdDetail ? getCapabilityRegisterManualTarget(createdDetail.capabilityType, createdDetail) : null),
    [createdDetail],
  );

  const resetComposer = () => {
    setSource('');
    setSuggestion(null);
    setDisplayName('');
    setResourceCode('');
    setDescription('');
    setDetectedType('agent');
    setRuntimeMode('');
    setInputSchemaText('{}');
    setDefaultsText('{}');
    setAuthRefsText('{}');
    setCapabilitiesText('{}');
    setBindingsText('');
    setAdvancedOpen(false);
    setFieldErrors({});
    setSubmitting(null);
    setDetecting(false);
  };

  const applySuggestion = (next: CapabilityImportSuggestionVO) => {
    setSuggestion(next);
    setDetectedType(next.detectedType);
    setDisplayName(next.displayName || '');
    setResourceCode(next.resourceCode || '');
    setDescription(next.description || '');
    setRuntimeMode(next.runtimeMode || '');
    setInputSchemaText(prettyJson(next.inputSchema));
    setDefaultsText(prettyJson(next.defaults));
    setAuthRefsText(prettyJson(next.authRefs));
    setCapabilitiesText(prettyJson(next.capabilities));
    setBindingsText((next.bindings ?? []).join(', '));
  };

  const openResourceCenter = (type: CapabilityType) => {
    navigate(`${buildPath('user', 'resource-center')}?type=${getCapabilityRegisterResourceType(type)}`);
  };

  const openManualRegister = (type: CapabilityType, detail?: CapabilityDetailVO | null) => {
    const target = getCapabilityRegisterManualTarget(type, detail);
    navigate(buildPath('user', target.registerPage, target.resourceId ?? undefined));
  };

  const startNewImport = () => {
    resetComposer();
    navigate(buildCapabilityRegisterUrl(undefined, createdDetail?.capabilityType ?? detectedType));
  };

  useEffect(() => {
    if (capabilityId == null) {
      setCreatedDetail(null);
      setDetailError('');
      setDetailLoading(false);
      return;
    }

    let cancelled = false;
    setDetailLoading(true);
    setDetailError('');

    void capabilityService
      .getCapability(capabilityId, 'bindingClosure')
      .then((detail) => {
        if (cancelled) return;
        setCreatedDetail(detail);
      })
      .catch((error) => {
        if (cancelled) return;
        setCreatedDetail(null);
        setDetailError(error instanceof Error ? error.message : '能力详情加载失败');
      })
      .finally(() => {
        if (cancelled) return;
        setDetailLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [capabilityId, detailReloadSeed]);

  const handleDetect = async () => {
    if (!source.trim()) {
      setFieldErrors((prev) => ({ ...prev, source: '请先粘贴 URL、JSON 或 Prompt 描述' }));
      return;
    }
    setDetecting(true);
    setFieldErrors((prev) => ({ ...prev, source: undefined }));
    try {
      const next = await capabilityService.importCapability({ source });
      applySuggestion(next);
      showMessage('能力类型已自动识别，可以继续确认后创建', 'success');
    } catch (error) {
      showMessage(error instanceof Error ? error.message : '自动识别失败', 'error');
    } finally {
      setDetecting(false);
    }
  };

  const handleSubmit = async (mode: 'draft' | 'submit') => {
    const nextErrors: Partial<Record<'source' | 'displayName' | 'resourceCode' | JsonFieldKey, string>> = {};
    if (!source.trim()) nextErrors.source = '请填写导入源';
    if (!displayName.trim()) nextErrors.displayName = '请填写能力名称';
    if (!resourceCode.trim()) nextErrors.resourceCode = '请填写能力编码';

    const parsedJson: Partial<Record<JsonFieldKey, Record<string, unknown>>> = {};
    for (const [key, label, text] of [
      ['inputSchema', '输入 Schema', inputSchemaText],
      ['defaults', '默认值', defaultsText],
      ['authRefs', '鉴权引用', authRefsText],
      ['capabilities', '能力配置', capabilitiesText],
    ] as const) {
      try {
        parsedJson[key] = parseJsonObject(text, label);
      } catch (error) {
        nextErrors[key] = error instanceof Error ? error.message : `${label} 解析失败`;
      }
    }

    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(mode);
    try {
      const created = await capabilityService.createCapability({
        source,
        detectedType,
        displayName: displayName.trim(),
        resourceCode: resourceCode.trim(),
        description: description.trim() || undefined,
        runtimeMode: runtimeMode.trim() || undefined,
        inputSchema: parsedJson.inputSchema,
        defaults: parsedJson.defaults,
        authRefs: parsedJson.authRefs,
        capabilities: parsedJson.capabilities,
        bindings: parseBindings(bindingsText),
        submitForAudit: mode === 'submit',
      });

      setCreatedDetail(created);
      setDetailError('');
      setSuggestion((prev) =>
        prev
          ? {
              ...prev,
              displayName: created.displayName,
              resourceCode: created.resourceCode,
              detectedType: created.capabilityType,
            }
          : prev,
      );
      navigate(buildCapabilityRegisterUrl(created.capabilityId, created.capabilityType));
      showMessage(
        mode === 'submit' ? '能力已创建并提交审核，可直接在下方试用或转入专业页继续完善' : '能力草稿已创建，可直接在下方试用或继续完善',
        'success',
      );
    } catch (error) {
      showMessage(error instanceof Error ? error.message : '创建能力失败', 'error');
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <MgmtPageShell
      theme={theme}
      fontSize={fontSize}
      titleIcon={Boxes}
      breadcrumbSegments={['资源中心', '智能导入能力']}
      description="先粘贴 URL、JSON、MCP 配置或 Prompt 描述，系统自动识别为 Skill / MCP / Agent；创建后直接进入结果页与统一试用台。"
      toolbar={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button type="button" className={btnSecondary(theme)} onClick={onBack}>
            <ArrowLeft size={14} />
            返回资源中心
          </button>
          <div className={`text-xs ${textMuted(theme)}`}>专业登记页仍保留，适合补充细粒度字段</div>
        </div>
      }
      contentScroll="document"
    >
      <div className="space-y-6 px-4 pb-8 sm:px-6">
        {capabilityId ? (
          <section
            className={`rounded-[28px] border p-6 ${
              isDark ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-white'
            }`}
          >
            {detailLoading && !createdDetail ? (
              <div className="flex min-h-40 items-center justify-center">
                <div className={`inline-flex items-center gap-2 text-sm ${textSecondary(theme)}`}>
                  <Loader2 size={16} className="animate-spin" />
                  正在加载能力结果与试用工作台...
                </div>
              </div>
            ) : detailError && !createdDetail ? (
              <div className="space-y-4">
                <div className={`rounded-2xl px-4 py-3 text-sm ${isDark ? 'bg-rose-500/10 text-rose-100' : 'bg-rose-50 text-rose-900'}`}>
                  {detailError}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className={btnSecondary(theme)}
                    onClick={() => setDetailReloadSeed((prev) => prev + 1)}
                  >
                    <RefreshCw size={14} />
                    重新加载
                  </button>
                  <button type="button" className={btnPrimary} onClick={startNewImport}>
                    <Sparkles size={14} />
                    继续智能导入
                  </button>
                </div>
              </div>
            ) : createdDetail ? (
              <>
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="max-w-2xl">
                    <div
                      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
                        isDark ? 'bg-emerald-500/15 text-emerald-200' : 'bg-emerald-100 text-emerald-900'
                      }`}
                    >
                      <CheckCircle2 size={14} />
                      导入已创建
                    </div>
                    <h1 className={`mt-3 text-2xl font-bold ${textPrimary(theme)}`}>
                      {createdDetail.displayName || '未命名能力'}
                    </h1>
                    <p className={`mt-2 text-sm leading-relaxed ${textSecondary(theme)}`}>
                      智能导入已经落成一条完整闭环。你现在可以直接在这里试用、查看绑定资源，或者切到对应的专业登记页继续补字段。
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" className={btnSecondary(theme)} onClick={() => openResourceCenter(createdDetail.capabilityType)}>
                      返回资源中心
                    </button>
                    <button type="button" className={btnSecondary(theme)} onClick={() => openManualRegister(createdDetail.capabilityType, createdDetail)}>
                      <ExternalLink size={14} />
                      {resultManualTarget?.resourceId != null ? `打开已绑定的${typeLabel(createdDetail.capabilityType)}专业页` : `打开${typeLabel(createdDetail.capabilityType)}专业页`}
                    </button>
                    <button type="button" className={btnPrimary} onClick={startNewImport}>
                      <Sparkles size={14} />
                      继续智能导入
                    </button>
                  </div>
                </div>

                <div className="mt-6 grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
                  <div className="space-y-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <SummaryItem theme={theme} label="能力类型" value={typeLabel(createdDetail.capabilityType)} />
                      <SummaryItem
                        theme={theme}
                        label="当前状态"
                        value={statusLabel(createdDetail.status)}
                        badgeClass={statusBadgeClass(theme, createdDetail.status)}
                      />
                      <SummaryItem theme={theme} label="能力编码" value={summaryValue(createdDetail.resourceCode)} mono />
                      <SummaryItem theme={theme} label="Capability ID" value={summaryValue(createdDetail.capabilityId)} mono />
                      <SummaryItem theme={theme} label="运行模式" value={summaryValue(createdDetail.runtimeMode)} mono />
                      <SummaryItem
                        theme={theme}
                        label="接入信息"
                        value={summaryValue(createdDetail.endpoint ?? createdDetail.invokeType ?? createdDetail.invokeMode)}
                        mono
                      />
                    </div>

                    <div
                      className={`rounded-2xl border px-4 py-3 text-xs leading-relaxed ${
                        isDark ? 'border-white/10 bg-black/20 text-slate-300' : 'border-slate-200 bg-slate-50 text-slate-700'
                      }`}
                    >
                      <p className="font-semibold">专业登记衔接</p>
                      <p className="mt-1">
                        {resultManualTarget?.resourceId != null
                          ? `已找到可继续维护的绑定资源 ID ${resultManualTarget.resourceId}，点击上方按钮会直接进入对应专业登记页。`
                          : '当前还没有可直接打开的绑定资源时，上方按钮会进入对应类型的专业登记页，你可以继续补充更细粒度的字段。'}
                      </p>
                    </div>

                    {createdDetail.bindingClosure?.length ? (
                      <BindingClosureSection theme={theme} items={createdDetail.bindingClosure} />
                    ) : (
                      <div
                        className={`rounded-2xl border px-4 py-3 text-xs leading-relaxed ${
                          isDark ? 'border-white/10 bg-white/[0.03] text-slate-300' : 'border-slate-200 bg-slate-50/80 text-slate-700'
                        }`}
                      >
                        还没有发现绑定闭包资源。你仍然可以先在右侧统一试用台验证，再决定是否切到专业登记页补充。
                      </div>
                    )}
                  </div>

                  <CapabilityWorkbench
                    theme={theme}
                    capabilityId={createdDetail.capabilityId}
                    capabilityType={createdDetail.capabilityType}
                    capabilityName={createdDetail.displayName}
                    defaultPayload={createdDetail.defaults}
                    showMessage={(msg, type = 'info') => showMessage(msg, type)}
                  />
                </div>
              </>
            ) : null}
          </section>
        ) : null}

        <section
          className={`rounded-[28px] border p-6 ${
            isDark ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-white'
          }`}
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl">
              <div
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
                  isDark ? 'bg-sky-500/15 text-sky-200' : 'bg-sky-100 text-sky-900'
                }`}
              >
                <Sparkles size={14} />
                Capability V2
              </div>
              <h2 className={`mt-3 text-2xl font-bold ${textPrimary(theme)}`}>先贴来源，再决定它该是 Agent、MCP 还是 Skill</h2>
              <p className={`mt-2 text-sm leading-relaxed ${textSecondary(theme)}`}>
                你可以粘贴 URL、MCP 配置、模型端点、OpenAPI / JSON、Prompt 片段，或者一段能力描述。系统会先识别类型，再帮你补齐最小可用字段。
              </p>
            </div>
            <div
              className={`rounded-2xl border px-4 py-3 text-xs leading-relaxed ${
                isDark ? 'border-white/10 bg-black/20 text-slate-300' : 'border-slate-200 bg-slate-50 text-slate-700'
              }`}
            >
              <p className="font-semibold">完整路径</p>
              <p className="mt-1">自动识别 → 人工确认 → 创建草稿 / 直接提审 → 结果页试用 → 转专业页继续维护</p>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <div>
              <label className={`mb-1.5 block text-xs font-semibold ${textSecondary(theme)}`}>导入源</label>
              <AutoHeightTextarea
                minRows={8}
                maxRows={24}
                value={source}
                onChange={(event) => setSource(event.target.value)}
                className={`${inputClass(isDark, !!fieldErrors.source)} resize-none font-mono text-xs`}
                placeholder={
                  '例如：\n1. https://api.openai.com/v1/responses\n2. wss://example.com/mcp\n3. 你是一个 PPT 生成技能，请根据输入大纲输出页面结构'
                }
              />
              {fieldErrors.source ? <p className="mt-1 text-xs text-rose-500">{fieldErrors.source}</p> : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" className={btnPrimary} onClick={() => void handleDetect()} disabled={detecting}>
                {detecting ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
                自动识别
              </button>
              <button type="button" className={btnSecondary(theme)} onClick={() => setAdvancedOpen((prev) => !prev)}>
                {advancedOpen ? '收起高级区' : '展开高级区'}
              </button>
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div
            className={`rounded-[28px] border p-6 ${
              isDark ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-white'
            }`}
          >
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="能力类型">
                <div className="flex flex-wrap gap-2">
                  {(['agent', 'mcp', 'skill'] as CapabilityType[]).map((type) => (
                    <button
                      key={type}
                      type="button"
                      className={`rounded-xl px-3 py-2 text-sm font-semibold ${
                        detectedType === type
                          ? isDark
                            ? 'bg-violet-500/20 text-white'
                            : 'bg-violet-100 text-violet-950'
                          : isDark
                            ? 'bg-white/[0.05] text-slate-300'
                            : 'bg-slate-100 text-slate-700'
                      }`}
                      onClick={() => setDetectedType(type)}
                    >
                      {typeLabel(type)}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="运行模式">
                <input
                  value={runtimeMode}
                  onChange={(event) => setRuntimeMode(event.target.value)}
                  className={inputClass(isDark)}
                  placeholder="例如 remote_agent / mcp_websocket / prompt_context"
                />
              </Field>
              <Field label="能力名称" error={fieldErrors.displayName}>
                <input
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  className={inputClass(isDark, !!fieldErrors.displayName)}
                  placeholder="例如 OpenAI Responses"
                />
              </Field>
              <Field label="能力编码" error={fieldErrors.resourceCode}>
                <input
                  value={resourceCode}
                  onChange={(event) => setResourceCode(event.target.value)}
                  className={inputClass(isDark, !!fieldErrors.resourceCode)}
                  placeholder="例如 openai-responses"
                />
              </Field>
              <Field label="描述" full>
                <AutoHeightTextarea
                  minRows={4}
                  maxRows={10}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  className={`${inputClass(isDark)} resize-none`}
                  placeholder="一句话说明这项能力要解决什么问题"
                />
              </Field>
            </div>

            {advancedOpen ? (
              <div className="mt-6 space-y-4">
                <JsonField
                  theme={theme}
                  isDark={isDark}
                  label="输入 Schema"
                  value={inputSchemaText}
                  onChange={setInputSchemaText}
                  error={fieldErrors.inputSchema}
                />
                <JsonField
                  theme={theme}
                  isDark={isDark}
                  label="默认值"
                  value={defaultsText}
                  onChange={setDefaultsText}
                  error={fieldErrors.defaults}
                />
                <JsonField
                  theme={theme}
                  isDark={isDark}
                  label="鉴权引用"
                  value={authRefsText}
                  onChange={setAuthRefsText}
                  error={fieldErrors.authRefs}
                />
                <JsonField
                  theme={theme}
                  isDark={isDark}
                  label="能力配置"
                  value={capabilitiesText}
                  onChange={setCapabilitiesText}
                  error={fieldErrors.capabilities}
                />
                <Field label="绑定资源 ID（逗号分隔）" full>
                  <input
                    value={bindingsText}
                    onChange={(event) => setBindingsText(event.target.value)}
                    className={inputClass(isDark)}
                    placeholder="例如 55, 89"
                  />
                </Field>
                <div
                  className={`rounded-2xl border px-4 py-3 text-xs ${
                    isDark ? 'border-white/10 bg-black/20 text-slate-300' : 'border-slate-200 bg-slate-50 text-slate-700'
                  }`}
                >
                  <p className="font-semibold">专业登记页入口</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(['agent', 'mcp', 'skill'] as CapabilityType[]).map((type) => (
                      <button key={type} type="button" className={btnSecondary(theme)} onClick={() => openManualRegister(type)}>
                        打开 {typeLabel(type)} 专业登记页
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}

            <div className="mt-6 flex flex-wrap gap-2">
              <button
                type="button"
                className={btnSecondary(theme)}
                disabled={submitting != null}
                onClick={() => void handleSubmit('draft')}
              >
                {submitting === 'draft' ? <Loader2 size={14} className="animate-spin" /> : null}
                创建草稿
              </button>
              <button type="button" className={btnPrimary} disabled={submitting != null} onClick={() => void handleSubmit('submit')}>
                {submitting === 'submit' ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                创建并提审
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <div
              className={`rounded-[28px] border p-6 ${
                isDark ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-white'
              }`}
            >
              <p className={`text-xs font-semibold uppercase tracking-wide ${textMuted(theme)}`}>识别结果</p>
              {suggestion ? (
                <div className="mt-3 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        isDark ? 'bg-sky-500/15 text-sky-200' : 'bg-sky-100 text-sky-900'
                      }`}
                    >
                      {typeLabel(suggestion.detectedType)}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs ${
                        suggestion.confidence === 'high'
                          ? isDark
                            ? 'bg-emerald-500/15 text-emerald-200'
                            : 'bg-emerald-100 text-emerald-900'
                          : isDark
                            ? 'bg-amber-500/15 text-amber-200'
                            : 'bg-amber-100 text-amber-900'
                      }`}
                    >
                      置信度 {suggestion.confidence}
                    </span>
                  </div>
                  <p className={`text-sm ${textSecondary(theme)}`}>{suggestion.reason}</p>
                  {suggestion.warnings?.length ? (
                    <div className={`rounded-2xl px-4 py-3 text-xs ${isDark ? 'bg-amber-500/10 text-amber-100' : 'bg-amber-50 text-amber-900'}`}>
                      {suggestion.warnings.join('\n')}
                    </div>
                  ) : null}
                </div>
              ) : (
                <p className={`mt-3 text-sm ${textMuted(theme)}`}>点击“自动识别”后，这里会显示建议类型、置信度和补出的默认值。</p>
              )}
            </div>

            <div
              className={`rounded-[28px] border p-6 ${
                isDark ? 'border-white/10 bg-black/20' : 'border-slate-200 bg-slate-50'
              }`}
            >
              <p className={`text-xs font-semibold uppercase tracking-wide ${textMuted(theme)}`}>适用场景</p>
              <ul className={`mt-3 space-y-2 text-sm ${textSecondary(theme)}`}>
                <li>URL 指向模型端点时，优先识别为 Agent。</li>
                <li>MCP 配置或 WebSocket / SSE 地址会优先识别为 MCP。</li>
                <li>Prompt、Schema、工具编排描述会优先识别为 Skill。</li>
                <li>不确定时不会直接误创建，而是先让你确认。</li>
              </ul>
            </div>
          </div>
        </section>
      </div>
    </MgmtPageShell>
  );
};

function Field({
  label,
  children,
  error,
  full = false,
}: {
  label: string;
  children: React.ReactNode;
  error?: string;
  full?: boolean;
}) {
  return (
    <div className={full ? 'md:col-span-2' : ''}>
      <label className="mb-1.5 block text-xs font-semibold">{label}</label>
      {children}
      {error ? <p className="mt-1 text-xs text-rose-500">{error}</p> : null}
    </div>
  );
}

function JsonField({
  theme,
  isDark,
  label,
  value,
  onChange,
  error,
}: {
  theme: Theme;
  isDark: boolean;
  label: string;
  value: string;
  onChange: (next: string) => void;
  error?: string;
}) {
  return (
    <Field label={label} error={error} full>
      <AutoHeightTextarea
        minRows={5}
        maxRows={18}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`${inputClass(isDark, !!error)} resize-none font-mono text-xs`}
      />
      <p className={`mt-1 text-xs ${textMuted(theme)}`}>用于高阶映射、鉴权和默认值补充，普通场景可以先不展开。</p>
    </Field>
  );
}

function SummaryItem({
  theme,
  label,
  value,
  mono = false,
  badgeClass,
}: {
  theme: Theme;
  label: string;
  value: string;
  mono?: boolean;
  badgeClass?: string;
}) {
  return (
    <div className={`rounded-2xl border px-4 py-3 ${theme === 'dark' ? 'border-white/10 bg-black/20' : 'border-slate-200 bg-slate-50/80'}`}>
      <p className={`text-[11px] font-semibold uppercase tracking-wide ${textMuted(theme)}`}>{label}</p>
      {badgeClass ? (
        <span className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${badgeClass}`}>{value}</span>
      ) : (
        <p className={`mt-2 text-sm ${mono ? 'font-mono' : ''} ${textPrimary(theme)}`}>{value}</p>
      )}
    </div>
  );
}

function inputClass(isDark: boolean, invalid = false): string {
  const base = `w-full rounded-xl border px-3 py-2 text-sm outline-none ${
    isDark ? 'border-white/10 bg-white/[0.04] text-slate-200' : 'border-slate-200 bg-white text-slate-700'
  }`;
  return invalid ? `${base} ${inputBaseError()}` : base;
}
