import React, { useMemo, useState } from 'react';
import { ArrowLeft, Boxes, Loader2, Sparkles, Wand2 } from 'lucide-react';
import type { FontSize, Theme } from '../../types';
import { capabilityService } from '../../api/services/capability.service';
import type { CapabilityType, CapabilityImportSuggestionVO } from '../../types/dto/capability';
import { buildPath } from '../../constants/consoleRoutes';
import { MgmtPageShell } from '../userMgmt/MgmtPageShell';
import { AutoHeightTextarea } from '../../components/common/AutoHeightTextarea';
import { btnPrimary, btnSecondary, textMuted, textPrimary, textSecondary } from '../../utils/uiClasses';
import { inputBaseError } from '../../utils/uiClasses';

type Props = {
  theme: Theme;
  fontSize: FontSize;
  showMessage: (msg: string, type: 'success' | 'error' | 'info' | 'warning') => void;
  onBack: () => void;
};

type JsonFieldKey = 'inputSchema' | 'defaults' | 'authRefs' | 'capabilities';

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

export const CapabilityRegisterPage: React.FC<Props> = ({ theme, fontSize, showMessage, onBack }) => {
  const isDark = theme === 'dark';
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
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<'source' | 'displayName' | 'resourceCode' | JsonFieldKey, string>>>({});

  const legacyLinks = useMemo(
    () => ({
      agent: buildPath('user', 'agent-register'),
      skill: buildPath('user', 'skill-register'),
      mcp: buildPath('user', 'mcp-register'),
    }),
    [],
  );

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
      showMessage('能力类型已自动识别，可继续确认后创建', 'success');
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
      showMessage(mode === 'submit' ? '能力草稿已创建并提交审核' : '能力草稿已创建', 'success');
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
      breadcrumbSegments={['资源中心', '智能注册能力']}
      description="默认只填最少信息：粘贴一个 URL、配置 JSON 或 Prompt 描述，系统自动识别为 Skill / MCP / Agent。"
      toolbar={(
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button type="button" className={btnSecondary(theme)} onClick={onBack}>
            <ArrowLeft size={14} />
            返回资源中心
          </button>
          <div className={`text-xs ${textMuted(theme)}`}>高级模式仍保留在各类型登记页中</div>
        </div>
      )}
      contentScroll="document"
    >
      <div className="space-y-6 px-4 sm:px-6 pb-8">
        <section
          className={`rounded-[28px] border p-6 ${
            isDark ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-white'
          }`}
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl">
              <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
                isDark ? 'bg-sky-500/15 text-sky-200' : 'bg-sky-100 text-sky-900'
              }`}>
                <Sparkles size={14} />
                Capability V2
              </div>
              <h1 className={`mt-3 text-2xl font-bold ${textPrimary(theme)}`}>注册能力，而不是先选协议</h1>
              <p className={`mt-2 text-sm leading-relaxed ${textSecondary(theme)}`}>
                粘贴 URL、MCP 配置、模型端点、OpenAPI / Prompt 片段或一段能力描述。后台会先推断类型，再帮你补默认值。
              </p>
            </div>
            <div className={`rounded-2xl border px-4 py-3 text-xs leading-relaxed ${
              isDark ? 'border-white/10 bg-black/20 text-slate-300' : 'border-slate-200 bg-slate-50 text-slate-700'
            }`}>
              <p className="font-semibold">更短路径</p>
              <p className="mt-1">自动识别 → 人工确认 → 创建草稿 / 直接提审</p>
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
                placeholder={'例如：\n1. https://api.openai.com/v1/responses\n2. wss://example.com/mcp\n3. 你是一个 PPT 生成技能，请根据输入大纲输出页面结构'}
              />
              {fieldErrors.source ? <p className="mt-1 text-xs text-rose-500">{fieldErrors.source}</p> : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" className={btnPrimary} onClick={() => void handleDetect()} disabled={detecting}>
                {detecting ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
                自动识别
              </button>
              <button
                type="button"
                className={btnSecondary(theme)}
                onClick={() => setAdvancedOpen((prev) => !prev)}
              >
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
                <input value={runtimeMode} onChange={(event) => setRuntimeMode(event.target.value)} className={inputClass(isDark)} placeholder="例如 remote_agent / mcp_websocket / prompt_context" />
              </Field>
              <Field label="能力名称" error={fieldErrors.displayName}>
                <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} className={inputClass(isDark, !!fieldErrors.displayName)} placeholder="例如 Agent api.openai.com" />
              </Field>
              <Field label="能力编码" error={fieldErrors.resourceCode}>
                <input value={resourceCode} onChange={(event) => setResourceCode(event.target.value)} className={inputClass(isDark, !!fieldErrors.resourceCode)} placeholder="例如 openai-agent" />
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
                <div className={`rounded-2xl border px-4 py-3 text-xs ${isDark ? 'border-white/10 bg-black/20 text-slate-300' : 'border-slate-200 bg-slate-50 text-slate-700'}`}>
                  <p className="font-semibold">高级模式入口</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(['agent', 'mcp', 'skill'] as CapabilityType[]).map((type) => (
                      <a key={type} href={legacyLinks[type]} className={`${btnSecondary(theme)} no-underline`}>
                        打开 {typeLabel(type)} 专业登记页
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}

            <div className="mt-6 flex flex-wrap gap-2">
              <button type="button" className={btnSecondary(theme)} disabled={submitting != null} onClick={() => void handleSubmit('draft')}>
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
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      isDark ? 'bg-sky-500/15 text-sky-200' : 'bg-sky-100 text-sky-900'
                    }`}>
                      {typeLabel(suggestion.detectedType)}
                    </span>
                    <span className={`rounded-full px-2.5 py-1 text-xs ${
                      suggestion.confidence === 'high'
                        ? isDark
                          ? 'bg-emerald-500/15 text-emerald-200'
                          : 'bg-emerald-100 text-emerald-900'
                        : isDark
                          ? 'bg-amber-500/15 text-amber-200'
                          : 'bg-amber-100 text-amber-900'
                    }`}>
                      置信度 {suggestion.confidence}
                    </span>
                  </div>
                  <p className={`text-sm ${textSecondary(theme)}`}>{suggestion.reason}</p>
                  {suggestion.warnings?.length ? (
                    <div className={`rounded-2xl px-4 py-3 text-xs ${
                      isDark ? 'bg-amber-500/10 text-amber-100' : 'bg-amber-50 text-amber-900'
                    }`}>
                      {suggestion.warnings.join('\n')}
                    </div>
                  ) : null}
                </div>
              ) : (
                <p className={`mt-3 text-sm ${textMuted(theme)}`}>点击“自动识别”后，这里会显示建议类型、置信度和补出来的默认值。</p>
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
      <p className={`mt-1 text-xs ${textMuted(theme)}`}>保留给高级映射、鉴权和默认值，普通场景可以不展开。</p>
    </Field>
  );
}

function inputClass(isDark: boolean, invalid = false): string {
  const base = `w-full rounded-xl border px-3 py-2 text-sm outline-none ${
    isDark ? 'border-white/10 bg-white/[0.04] text-slate-200' : 'border-slate-200 bg-white text-slate-700'
  }`;
  return invalid ? `${base} ${inputBaseError()}` : base;
}
