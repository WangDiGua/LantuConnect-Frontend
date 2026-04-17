import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Play, Sparkles, Wrench } from 'lucide-react';

import { capabilityService } from '../../../api/services/capability.service';
import { resourceCatalogService } from '../../../api/services/resource-catalog.service';
import { GatewayApiKeyInput } from '../../common/GatewayApiKeyInput';
import { AutoHeightTextarea } from '../../common/AutoHeightTextarea';
import { MarketDetailSectionCard } from '../ResourceMarketDetailShell';
import { usePersistedGatewayApiKey } from '../../../hooks/usePersistedGatewayApiKey';
import type { Theme } from '../../../types';
import type { Skill } from '../../../types/dto/skill';
import type { ResourceBindingSummaryVO } from '../../../types/dto/catalog';
import { nativeInputClass } from '../../../utils/formFieldClasses';
import { mapInvokeFlowError } from '../../../utils/invokeError';
import { btnPrimary, btnSecondary, textMuted, textPrimary, textSecondary } from '../../../utils/uiClasses';
import {
  buildSchemaInputDraft,
  buildSimpleSchemaFields,
  buildSkillToolCatalog,
  type SkillToolOption,
} from './resourceTestingProfiles';

type Props = {
  theme: Theme;
  skill: Skill;
  bindingClosure?: ResourceBindingSummaryVO[];
  showMessage?: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
};

function stringifyJson(value: Record<string, unknown>): string {
  return JSON.stringify(value, null, 2);
}

function parseJsonObject(
  text: string,
): { ok: true; data: Record<string, unknown> } | { ok: false; message: string } {
  try {
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { ok: false, message: '请输入 JSON 对象。' };
    }
    return { ok: true, data: parsed as Record<string, unknown> };
  } catch {
    return { ok: false, message: 'JSON 格式不正确。' };
  }
}

function parseScalarValue(type: 'string' | 'number' | 'integer' | 'boolean', raw: string | boolean): string | number | boolean {
  if (type === 'boolean') {
    return Boolean(raw);
  }
  if (type === 'number' || type === 'integer') {
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return String(raw);
}

export const SkillQuickTestPanel: React.FC<Props> = ({ theme, skill, bindingClosure, showMessage }) => {
  const isDark = theme === 'dark';
  const [gatewayApiKeyDraft, setGatewayApiKeyDraft] = usePersistedGatewayApiKey();
  const schemaFields = useMemo(() => buildSimpleSchemaFields(skill.parametersSchema), [skill.parametersSchema]);
  const initialSchemaDraft = useMemo(() => buildSchemaInputDraft(schemaFields), [schemaFields]);
  const hasMcpBindings = useMemo(
    () => (bindingClosure ?? []).some((item) => String(item.resourceType ?? '').toLowerCase() === 'mcp'),
    [bindingClosure],
  );

  const [schemaValues, setSchemaValues] = useState<Record<string, unknown>>(initialSchemaDraft);
  const [rawJsonDraft, setRawJsonDraft] = useState(() => stringifyJson(initialSchemaDraft));
  const [resolveLoading, setResolveLoading] = useState(false);
  const [resolveOutput, setResolveOutput] = useState('');
  const [resolveError, setResolveError] = useState('');
  const [toolListLoading, setToolListLoading] = useState(false);
  const [toolRunLoading, setToolRunLoading] = useState(false);
  const [toolOptions, setToolOptions] = useState<SkillToolOption[]>([]);
  const [selectedTool, setSelectedTool] = useState('');
  const [toolArgsText, setToolArgsText] = useState('{}');
  const [toolOutput, setToolOutput] = useState('');
  const [toolWarnings, setToolWarnings] = useState<string[]>([]);

  useEffect(() => {
    setSchemaValues(initialSchemaDraft);
    setRawJsonDraft(stringifyJson(initialSchemaDraft));
    setResolveOutput('');
    setResolveError('');
    setToolOptions([]);
    setSelectedTool('');
    setToolArgsText('{}');
    setToolOutput('');
    setToolWarnings([]);
  }, [initialSchemaDraft, skill.id]);

  const currentInputPreview = useMemo(() => {
    if (schemaFields.length > 0) {
      return stringifyJson(schemaValues);
    }
    const parsed = parseJsonObject(rawJsonDraft);
    return parsed.ok ? stringifyJson(parsed.data) : rawJsonDraft;
  }, [rawJsonDraft, schemaFields.length, schemaValues]);

  const selectedToolMeta = useMemo(
    () => toolOptions.find((tool) => tool.name === selectedTool) ?? null,
    [selectedTool, toolOptions],
  );

  const handleSchemaFieldChange = useCallback(
    (key: string, type: 'string' | 'number' | 'integer' | 'boolean', value: string | boolean) => {
      setSchemaValues((prev) => ({
        ...prev,
        [key]: parseScalarValue(type, value),
      }));
    },
    [],
  );

  const handleResolvePreview = useCallback(async () => {
    const apiKey = gatewayApiKeyDraft.trim();
    if (!apiKey) {
      setResolveError('请先填写有效的 X-Api-Key，且该密钥需要具备 resolve scope。');
      return;
    }

    setResolveLoading(true);
    setResolveOutput('');
    setResolveError('');
    try {
      const resolved = await resourceCatalogService.resolve(
        { resourceType: 'skill', resourceId: String(skill.id), include: 'closure' },
        { headers: { 'X-Api-Key': apiKey } },
      );
      setResolveOutput(JSON.stringify(resolved, null, 2));
      showMessage?.('已拉取当前技能的上下文解析结果。', 'success');
    } catch (reason) {
      const message = mapInvokeFlowError(reason, 'resolve');
      setResolveError(message);
      showMessage?.(message, 'error');
    } finally {
      setResolveLoading(false);
    }
  }, [gatewayApiKeyDraft, showMessage, skill.id]);

  const handleLoadTools = useCallback(async () => {
    const apiKey = gatewayApiKeyDraft.trim();
    if (!apiKey) {
      setToolOutput('请先填写有效的 X-Api-Key，且该密钥需要具备 resolve 与 invoke scope。');
      return;
    }

    setToolListLoading(true);
    setToolOutput('');
    setToolWarnings([]);
    try {
      const session = await capabilityService.toolSession(
        Number(skill.id),
        { action: 'list_tools' },
        { headers: { 'X-Api-Key': apiKey } },
      );
      const nextTools = buildSkillToolCatalog(bindingClosure, session);
      setToolOptions(nextTools);
      setToolWarnings(session.warnings ?? []);
      if (nextTools.length > 0) {
        setSelectedTool(nextTools[0].name);
        setToolArgsText(stringifyJson(nextTools[0].defaultArguments));
      } else {
        setSelectedTool('');
        setToolArgsText('{}');
      }
      showMessage?.(nextTools.length > 0 ? '已加载该技能关联的可用工具。' : '当前技能没有可用的关联工具。', 'success');
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : '加载技能关联工具失败。';
      setToolOutput(message);
      showMessage?.(message, 'error');
    } finally {
      setToolListLoading(false);
    }
  }, [bindingClosure, gatewayApiKeyDraft, showMessage, skill.id]);

  const handleRunTool = useCallback(async () => {
    if (!selectedTool) {
      setToolOutput('请先加载并选择要运行的工具。');
      return;
    }
    const apiKey = gatewayApiKeyDraft.trim();
    if (!apiKey) {
      setToolOutput('请先填写有效的 X-Api-Key，且该密钥需要具备 resolve 与 invoke scope。');
      return;
    }
    const parsedArgs = parseJsonObject(toolArgsText);
    if (parsedArgs.ok === false) {
      setToolOutput(parsedArgs.message);
      return;
    }

    setToolRunLoading(true);
    setToolOutput('');
    try {
      const session = await capabilityService.toolSession(
        Number(skill.id),
        {
          action: 'call_tool',
          toolName: selectedTool,
          arguments: parsedArgs.data,
          timeoutSec: 60,
        },
        { headers: { 'X-Api-Key': apiKey } },
      );
      setToolWarnings(session.warnings ?? []);
      setToolOutput(session.toolCallResponse?.body || JSON.stringify(session, null, 2));
      showMessage?.('已完成技能关联工具试用。', 'success');
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : '运行技能关联工具失败。';
      setToolOutput(message);
      showMessage?.(message, 'error');
    } finally {
      setToolRunLoading(false);
    }
  }, [gatewayApiKeyDraft, selectedTool, showMessage, skill.id, toolArgsText]);

  return (
    <div className="space-y-5">
      <GatewayApiKeyInput
        theme={theme}
        id={`skill-quick-key-${skill.id}`}
        value={gatewayApiKeyDraft}
        onChange={setGatewayApiKeyDraft}
      />

      <MarketDetailSectionCard
        theme={theme}
        title="上下文预览"
        description="技能本体走 Context 规范。这里展示输入形态、上下文解析结果和绑定闭包，而不是把它伪装成普通 invoke 资源。"
        actions={(
          <button type="button" className={btnPrimary} onClick={() => void handleResolvePreview()} disabled={resolveLoading}>
            {resolveLoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            上下文预览
          </button>
        )}
      >
        <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-3">
            {schemaFields.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {schemaFields.map((field) => (
                  <label key={field.key} className="block">
                    <span className={`mb-1.5 block text-xs font-semibold ${textSecondary(theme)}`}>
                      {field.label}
                      {field.required ? ' *' : ''}
                    </span>
                    {field.type === 'boolean' ? (
                      <select
                        value={String(Boolean(schemaValues[field.key]))}
                        onChange={(event) => handleSchemaFieldChange(field.key, field.type, event.target.value === 'true')}
                        className={nativeInputClass(theme)}
                      >
                        <option value="false">false</option>
                        <option value="true">true</option>
                      </select>
                    ) : (
                      <input
                        type={field.type === 'string' ? 'text' : 'number'}
                        value={String(schemaValues[field.key] ?? field.defaultValue)}
                        onChange={(event) => handleSchemaFieldChange(field.key, field.type, event.target.value)}
                        className={nativeInputClass(theme)}
                      />
                    )}
                  </label>
                ))}
              </div>
            ) : (
              <div>
                <label className={`mb-1.5 block text-xs font-semibold ${textSecondary(theme)}`}>输入样例 JSON</label>
                <AutoHeightTextarea
                  minRows={7}
                  maxRows={18}
                  value={rawJsonDraft}
                  onChange={(event) => setRawJsonDraft(event.target.value)}
                  className={`${nativeInputClass(theme)} resize-none font-mono text-xs`}
                />
              </div>
            )}
            <div
              className={`rounded-2xl border px-4 py-3 text-sm leading-relaxed ${
                isDark ? 'border-fuchsia-500/20 bg-fuchsia-500/[0.06] text-fuchsia-100' : 'border-fuchsia-200 bg-fuchsia-50 text-fuchsia-950'
              }`}
            >
              这里的输入只是帮助你快速理解参数结构；真正的技能消费入口仍然是目录解析与上下文组装，而不是普通的 POST /invoke。
            </div>
          </div>

          <div
            className={`rounded-2xl border px-4 py-3 text-sm ${
              isDark ? 'border-white/10 bg-black/20 text-slate-100' : 'border-slate-200 bg-white text-slate-800'
            }`}
          >
            <p className={`text-xs font-semibold uppercase tracking-wide ${textMuted(theme)}`}>当前输入预览</p>
            <pre className="mt-2 overflow-auto whitespace-pre-wrap break-all text-xs">{currentInputPreview}</pre>
          </div>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-[0.7fr_1.3fr]">
          <div
            className={`rounded-2xl border px-4 py-3 text-sm ${
              isDark ? 'border-white/10 bg-white/[0.03] text-slate-200' : 'border-slate-200 bg-slate-50 text-slate-800'
            }`}
          >
            <p className={`text-xs font-semibold uppercase tracking-wide ${textMuted(theme)}`}>Context 摘要</p>
            <dl className="mt-3 space-y-2 text-sm">
              <div>
                <dt className={textMuted(theme)}>执行模式</dt>
                <dd className={`mt-1 ${textPrimary(theme)}`}>{skill.executionMode || 'context'}</dd>
              </div>
              <div>
                <dt className={textMuted(theme)}>绑定 MCP</dt>
                <dd className={`mt-1 ${textPrimary(theme)}`}>{(bindingClosure ?? []).filter((item) => item.resourceType === 'mcp').length}</dd>
              </div>
              <div>
                <dt className={textMuted(theme)}>参数字段</dt>
                <dd className={`mt-1 ${textPrimary(theme)}`}>{schemaFields.length > 0 ? schemaFields.length : '复杂 Schema / JSON 模式'}</dd>
              </div>
            </dl>
            {resolveError ? (
              <p className={`mt-3 whitespace-pre-wrap break-all text-sm ${isDark ? 'text-rose-200' : 'text-rose-700'}`}>{resolveError}</p>
            ) : null}
          </div>

          <div
            className={`rounded-2xl border px-4 py-3 text-sm ${
              isDark ? 'border-white/10 bg-black/20 text-slate-100' : 'border-slate-200 bg-white text-slate-800'
            }`}
          >
            <p className={`text-xs font-semibold uppercase tracking-wide ${textMuted(theme)}`}>resolve 结果</p>
            <pre className="mt-2 overflow-auto whitespace-pre-wrap break-all text-xs">{resolveOutput || '点击“上下文预览”后，会在这里展示技能当前的 contextPrompt、parametersSchema 与绑定闭包。'}</pre>
          </div>
        </div>
      </MarketDetailSectionCard>

      {hasMcpBindings ? (
        <MarketDetailSectionCard
          theme={theme}
          title="关联工具试用"
          description="如果这个技能绑定了 MCP，前端会把它们聚合成一组“这个技能可用的工具”，你不需要先理解 MCP 再去试。"
          actions={(
            <button type="button" className={btnPrimary} onClick={() => void handleLoadTools()} disabled={toolListLoading || toolRunLoading}>
              {toolListLoading ? <Loader2 size={14} className="animate-spin" /> : <Wrench size={14} />}
              {toolOptions.length > 0 ? '刷新工具列表' : '加载可用工具'}
            </button>
          )}
        >
          {toolWarnings.length > 0 ? (
            <div className={`rounded-2xl border px-4 py-3 text-sm ${isDark ? 'border-amber-500/20 bg-amber-500/[0.08] text-amber-100' : 'border-amber-200 bg-amber-50 text-amber-900'}`}>
              {toolWarnings.join('\n')}
            </div>
          ) : null}

          {toolOptions.length > 0 ? (
            <div className="mt-4 space-y-4">
              <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
                <div>
                  <label className={`mb-1.5 block text-xs font-semibold ${textSecondary(theme)}`}>技能可用工具</label>
                  <select
                    value={selectedTool}
                    onChange={(event) => {
                      const nextName = event.target.value;
                      setSelectedTool(nextName);
                      const nextTool = toolOptions.find((tool) => tool.name === nextName);
                      if (nextTool) {
                        setToolArgsText(stringifyJson(nextTool.defaultArguments));
                      }
                    }}
                    className={nativeInputClass(theme)}
                  >
                    {toolOptions.map((tool) => (
                      <option key={tool.name} value={tool.name}>
                        {tool.sourceLabel ? `${tool.name} · ${tool.sourceLabel}` : tool.name}
                      </option>
                    ))}
                  </select>
                  {selectedToolMeta?.sourceLabel ? (
                    <p className={`mt-2 text-xs ${textMuted(theme)}`}>来源：{selectedToolMeta.sourceLabel}</p>
                  ) : null}
                </div>
                <div>
                  <label className={`mb-1.5 block text-xs font-semibold ${textSecondary(theme)}`}>工具参数</label>
                  <AutoHeightTextarea
                    minRows={6}
                    maxRows={18}
                    value={toolArgsText}
                    onChange={(event) => setToolArgsText(event.target.value)}
                    className={`${nativeInputClass(theme)} resize-none font-mono text-xs`}
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button type="button" className={btnPrimary} onClick={() => void handleRunTool()} disabled={toolRunLoading || toolListLoading}>
                  {toolRunLoading ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                  运行工具
                </button>
              </div>
            </div>
          ) : (
            <div className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${isDark ? 'border-white/10 bg-white/[0.03] text-slate-200' : 'border-slate-200 bg-slate-50 text-slate-800'}`}>
              先加载工具列表；如果绑定关系有效，这里会自动汇总成“该技能可用的工具”。
            </div>
          )}

          <div
            className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${
              isDark ? 'border-white/10 bg-black/20 text-slate-100' : 'border-slate-200 bg-white text-slate-800'
            }`}
          >
            <p className={`text-xs font-semibold uppercase tracking-wide ${textMuted(theme)}`}>工具结果</p>
            <pre className="mt-2 overflow-auto whitespace-pre-wrap break-all text-xs">{toolOutput || '工具运行结果会显示在这里。'}</pre>
          </div>
        </MarketDetailSectionCard>
      ) : null}
    </div>
  );
};
