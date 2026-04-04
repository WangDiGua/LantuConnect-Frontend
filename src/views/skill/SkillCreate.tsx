import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  AlertCircle,
  Wrench,
  Settings,
  FileCheck,
  Server,
} from 'lucide-react';
import type { Theme, FontSize } from '../../types';
import type { AgentType, SourceType, DisplayTemplate } from '../../types/dto/agent';
import type { McpServer, SkillCreatePayload } from '../../types/dto/skill';
import { nativeInputClass } from '../../utils/formFieldClasses';
import { LantuSelect } from '../../components/common/LantuSelect';
import { btnPrimary, btnSecondary, btnGhost, canvasBodyBg, mainScrollCompositorClass, textPrimary, textSecondary, textMuted } from '../../utils/uiClasses';
import { GlassPanel } from '../../components/common/GlassPanel';
import { BentoCard } from '../../components/common/BentoCard';
import { useMessage } from '../../components/common/Message';
import { skillService } from '../../api/services/skill.service';

interface Props {
  theme: Theme;
  fontSize: FontSize;
  onBack: () => void;
  onSuccess?: (id: string) => void;
}

type Step = 1 | 2 | 3;

const STEPS = [
  { id: 1, label: '基本信息', icon: Wrench },
  { id: 2, label: '协议配置', icon: Settings },
  { id: 3, label: '确认提交', icon: FileCheck },
] as const;

const SOURCE_OPTIONS: { value: SourceType; label: string }[] = [
  { value: 'internal', label: '内部' },
  { value: 'partner', label: '合作�? },
  { value: 'cloud', label: '云服�? },
];

const AGENT_TYPE_OPTIONS: { value: AgentType; label: string }[] = [
  { value: 'mcp', label: 'MCP 协议' },
  { value: 'http_api', label: 'HTTP API' },
  { value: 'builtin', label: '内置' },
];

const SKILL_CATEGORY_OPTIONS = [
  { value: '', label: '暂不分类' },
  { value: '1', label: '校园业务' },
  { value: '2', label: '教学科研' },
  { value: '3', label: '办公效率' },
  { value: '4', label: '数据分析' },
  { value: '5', label: '生活服务' },
];

const DISPLAY_TEMPLATE_OPTIONS: { value: DisplayTemplate | ''; label: string }[] = [
  { value: '', label: '�? },
  { value: 'file', label: '文件' },
  { value: 'image', label: '图片' },
  { value: 'audio', label: '音频' },
  { value: 'video', label: '视频' },
  { value: 'answer', label: '回答' },
  { value: 'ai_answer', label: 'AI 回答' },
  { value: 'search_web', label: '网页搜索' },
  { value: 'search_file', label: '文件搜索' },
];

function toPinyin(str: string): string {
  return str
    .toLowerCase()
    .replace(/[\u4e00-\u9fa5]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '') || 'skill';
}

const springTransition = { type: 'spring' as const, stiffness: 400, damping: 30 };
const INPUT_FOCUS = 'focus:ring-2 focus:ring-neutral-900/20 focus:border-neutral-900/35';

export const SkillCreate: React.FC<Props> = ({ theme, fontSize: _fontSize, onBack, onSuccess }) => {
  const isDark = theme === 'dark';
  const { showMessage } = useMessage();
  const [step, setStep] = useState<Step>(1);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [mcpServers, setMcpServers] = useState<McpServer[]>([]);

  const labelCls = `text-sm font-medium ${textSecondary(theme)}`;
  const inputCls = `${nativeInputClass(theme)} ${INPUT_FOCUS}`;
  const mcpParentOptions = useMemo(
    () => [
      { value: '', label: '无（独立 Skill�? },
      ...mcpServers.map((s) => ({ value: String(s.id), label: s.displayName })),
    ],
    [mcpServers],
  );

  const [form, setForm] = useState({
    displayName: '',
    agentName: '',
    description: '',
    sourceType: 'internal' as SourceType,
    categoryId: '',
    agentType: 'mcp' as AgentType,
    parentId: '',
    specUrl: '',
    specApiKey: '',
    specTimeout: 30,
    displayTemplate: '' as DisplayTemplate | '',
    parametersSchema: '',
  });

  useEffect(() => {
    skillService.listMcpServers().then(setMcpServers).catch(() => {});
  }, []);

  const updateField = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setErrors(prev => {
      const next = { ...prev };
      delete next[key];
      delete next.submit;
      return next;
    });
  };

  const handleDisplayNameChange = (val: string) => {
    updateField('displayName', val);
    updateField('agentName', toPinyin(val) + '_skill');
  };

  const validateStep1 = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.displayName.trim()) errs.displayName = '请输入显示名�?;
    if (!form.agentName.trim()) errs.agentName = '请输入唯一标识';
    if (!form.description.trim()) errs.description = '请输入描�?;
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateStep2 = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.specUrl.trim()) errs.specUrl = '请输入服务地址';
    if (form.parametersSchema.trim()) {
      try {
        JSON.parse(form.parametersSchema);
      } catch {
        errs.parametersSchema = '参数 Schema 必须是合法的 JSON';
      }
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const goNext = () => {
    if (step === 1 && validateStep1()) setStep(2);
    if (step === 2 && validateStep2()) setStep(3);
  };

  const goBack = () => {
    if (step > 1) setStep((step - 1) as Step);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setErrors({});

    const payload: SkillCreatePayload = {
      displayName: form.displayName.trim(),
      agentName: form.agentName.trim(),
      description: form.description.trim(),
      agentType: form.agentType,
      sourceType: form.sourceType,
      specJson: {
        url: form.specUrl.trim(),
        ...(form.specApiKey.trim() ? { api_key: form.specApiKey.trim() } : {}),
        timeout: form.specTimeout,
      },
    };
    if (form.parentId) payload.parentId = Number(form.parentId);
    if (form.categoryId) payload.categoryId = Number(form.categoryId);
    if (form.displayTemplate) payload.displayTemplate = form.displayTemplate as DisplayTemplate;
    if (form.parametersSchema.trim()) {
      try { payload.parametersSchema = JSON.parse(form.parametersSchema); } catch { /* validated earlier */ }
    }

    try {
      const created = await skillService.create(payload);
      showMessage('Skill 注册成功', 'success');
      onSuccess?.(String(created.id));
      onBack();
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : '创建失败，请检查网络连接后重试';
      setErrors({ submit: errMsg });
      showMessage('Skill 注册失败: ' + errMsg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const summaryItems = useMemo(() => {
    const serverName = form.parentId ? mcpServers.find(s => s.id === Number(form.parentId))?.displayName ?? '�? : '�?;
    return [
      { label: '显示名称', value: form.displayName || '�? },
      { label: '唯一标识', value: form.agentName || '�? },
      { label: '描述', value: form.description || '�? },
      { label: '来源类型', value: SOURCE_OPTIONS.find(o => o.value === form.sourceType)?.label ?? form.sourceType },
      { label: '协议类型', value: AGENT_TYPE_OPTIONS.find(o => o.value === form.agentType)?.label ?? form.agentType },
      { label: '所�?MCP Server', value: serverName },
      { label: '服务地址', value: form.specUrl || '�? },
      { label: 'API Key', value: form.specApiKey ? '•••••�? : '未设�? },
      { label: '超时秒数', value: `${form.specTimeout}s` },
      { label: '展示模板', value: DISPLAY_TEMPLATE_OPTIONS.find(o => o.value === form.displayTemplate)?.label ?? '�? },
      { label: '参数 Schema', value: form.parametersSchema ? '已配�? : '未配�? },
    ];
  }, [form, mcpServers]);

  const renderStepIndicator = () => (
    <div className="mb-8 flex items-center justify-center gap-3">
      {STEPS.map((s, idx) => {
        const isActive = step === s.id;
        const isCompleted = step > s.id;
        const Icon = s.icon;
        return (
          <React.Fragment key={s.id}>
            <div className="flex flex-col items-center gap-2">
              <div className="relative w-10 h-10">
                {isActive && (
                  <motion.div
                    layoutId="skillStepBg"
                    className="absolute inset-0 rounded-full bg-neutral-900 ring-2 ring-neutral-500/40"
                    transition={springTransition}
                  />
                )}
                {isCompleted && !isActive && (
                  <div className="absolute inset-0 rounded-full bg-emerald-500" />
                )}
                {!isActive && !isCompleted && (
                  <div className={`absolute inset-0 rounded-full ${isDark ? 'bg-white/10' : 'bg-slate-200'}`} />
                )}
                <div className={`relative z-10 w-full h-full flex items-center justify-center ${isActive || isCompleted ? 'text-white' : 'text-slate-500'}`}>
                  {isCompleted ? <Check size={20} /> : <Icon size={18} />}
                </div>
              </div>
              <span className={`text-xs font-bold text-center max-w-[80px] ${
                isActive || isCompleted ? 'text-neutral-900 dark:text-neutral-300' : textMuted(theme)
              }`}>
                {s.label}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <motion.div
                className={`w-14 h-0.5 rounded-full transition-all duration-300 ${isCompleted ? 'bg-emerald-500' : isDark ? 'bg-white/10' : 'bg-slate-200'}`}
                initial={{ scaleX: 0.3 }}
                animate={{ scaleX: isCompleted ? 1 : 0.3 }}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );

  const renderStep1 = () => (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={springTransition} className="space-y-5">
      <BentoCard theme={theme} padding="md">
        <div className="space-y-5">
          <div>
            <label className={`${labelCls} mb-1.5 block`}>显示名称 *</label>
            <input
              type="text"
              placeholder="例如：天气查询工�?
              className={`${inputCls} ${errors.displayName ? '!border-red-500 !ring-red-500/20' : ''}`}
              value={form.displayName}
              onChange={e => handleDisplayNameChange(e.target.value)}
            />
            {errors.displayName && <p className="text-xs text-red-500 mt-1">{errors.displayName}</p>}
          </div>

          <div>
            <label className={`${labelCls} mb-1.5 block`}>唯一标识 (agentName) *</label>
            <input
              type="text"
              placeholder="自动生成，可手动修改"
              className={`${inputCls} font-mono text-sm ${errors.agentName ? '!border-red-500 !ring-red-500/20' : ''}`}
              value={form.agentName}
              onChange={e => updateField('agentName', e.target.value)}
            />
            {errors.agentName && <p className="text-xs text-red-500 mt-1">{errors.agentName}</p>}
          </div>

          <div>
            <label className={`${labelCls} mb-1.5 block`}>描述 *</label>
            <textarea
              rows={4}
              placeholder="描述�?Skill 的功能与用途�?
              className={`${inputCls} !min-h-[100px] resize-y ${errors.description ? '!border-red-500 !ring-red-500/20' : ''}`}
              value={form.description}
              onChange={e => updateField('description', e.target.value)}
            />
            {errors.description && <p className="text-xs text-red-500 mt-1">{errors.description}</p>}
          </div>

          <div className={`border-t pt-5 ${isDark ? 'border-white/[0.06]' : 'border-slate-100'}`}>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={`${labelCls} mb-1.5 block`}>来源类型</label>
                <LantuSelect
                  theme={theme}
                  triggerClassName={INPUT_FOCUS}
                  value={form.sourceType}
                  onChange={(v) => updateField('sourceType', v as SourceType)}
                  options={SOURCE_OPTIONS}
                />
              </div>
              <div>
                <label className={`${labelCls} mb-1.5 block`}>分类</label>
                <LantuSelect
                  theme={theme}
                  triggerClassName={INPUT_FOCUS}
                  value={form.categoryId}
                  onChange={(v) => updateField('categoryId', v)}
                  options={SKILL_CATEGORY_OPTIONS}
                />
              </div>
            </div>
          </div>
        </div>
      </BentoCard>

      <div className="flex justify-end pt-4">
        <button type="button" onClick={goNext} className={`${btnPrimary} px-8 inline-flex items-center gap-2`}>
          下一�?          <ArrowRight size={18} />
        </button>
      </div>
    </motion.div>
  );

  const renderStep2 = () => (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={springTransition} className="space-y-5">
      <BentoCard theme={theme} padding="md">
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={`${labelCls} mb-1.5 block`}>协议类型 *</label>
              <LantuSelect
                theme={theme}
                triggerClassName={INPUT_FOCUS}
                value={form.agentType}
                onChange={(v) => updateField('agentType', v as AgentType)}
                options={AGENT_TYPE_OPTIONS}
              />
            </div>
            <div>
              <label className={`${labelCls} mb-1.5 block`}>所�?MCP Server</label>
              <div className="flex items-center gap-2">
                <LantuSelect
                  theme={theme}
                  triggerClassName={INPUT_FOCUS}
                  value={form.parentId}
                  onChange={(v) => updateField('parentId', v)}
                  options={mcpParentOptions}
                />
                {mcpServers.length > 0 && <Server size={16} className={`shrink-0 ${textMuted(theme)}`} />}
              </div>
            </div>
          </div>

          <div className={`border-t pt-5 ${isDark ? 'border-white/[0.06]' : 'border-slate-100'}`}>
            <label className={`${labelCls} mb-1.5 block`}>服务地址 (URL) *</label>
            <input
              type="text"
              placeholder="https://api.example.com/regis/invoke"
              className={`${inputCls} ${errors.specUrl ? '!border-red-500 !ring-red-500/20' : ''}`}
              value={form.specUrl}
              onChange={e => updateField('specUrl', e.target.value)}
            />
            {errors.specUrl && <p className="text-xs text-red-500 mt-1">{errors.specUrl}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={`${labelCls} mb-1.5 block`}>API Key</label>
              <input type="password" placeholder="可�? className={inputCls} value={form.specApiKey} onChange={e => updateField('specApiKey', e.target.value)} />
            </div>
            <div>
              <label className={`${labelCls} mb-1.5 block`}>超时秒数</label>
              <input type="number" min={1} max={300} className={inputCls} value={form.specTimeout} onChange={e => updateField('specTimeout', Number(e.target.value) || 30)} />
            </div>
          </div>

          <div className={`border-t pt-5 ${isDark ? 'border-white/[0.06]' : 'border-slate-100'}`}>
            <label className={`${labelCls} mb-1.5 block`}>展示模板</label>
            <LantuSelect
              theme={theme}
              triggerClassName={INPUT_FOCUS}
              value={form.displayTemplate}
              onChange={(v) => updateField('displayTemplate', v as DisplayTemplate | '')}
              options={DISPLAY_TEMPLATE_OPTIONS}
            />
          </div>

          <div>
            <label className={`${labelCls} mb-1.5 block`}>参数 Schema (JSON)</label>
            <textarea
              rows={5}
              placeholder={'{\n  "type": "object",\n  "properties": { ... }\n}'}
              className={`${inputCls} !min-h-[120px] font-mono text-xs resize-y ${errors.parametersSchema ? '!border-red-500 !ring-red-500/20' : ''}`}
              value={form.parametersSchema}
              onChange={e => updateField('parametersSchema', e.target.value)}
            />
            {errors.parametersSchema && <p className="text-xs text-red-500 mt-1">{errors.parametersSchema}</p>}
          </div>
        </div>
      </BentoCard>

      <div className="flex justify-between pt-4">
        <button type="button" onClick={goBack} className={`${btnSecondary(theme)} inline-flex items-center gap-2`}>
          <ArrowLeft size={18} />
          上一�?        </button>
        <button type="button" onClick={goNext} className={`${btnPrimary} px-8 inline-flex items-center gap-2`}>
          下一�?          <ArrowRight size={18} />
        </button>
      </div>
    </motion.div>
  );

  const renderStep3 = () => (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={springTransition} className="space-y-5">
      <div className="text-center mb-2">
        <h3 className={`text-lg font-bold mb-1 ${textPrimary(theme)}`}>确认信息</h3>
        <p className={`text-sm ${textSecondary(theme)}`}>请检查以下信息，确认无误后提�?/p>
      </div>

      <BentoCard theme={theme} padding="sm">
        <div className={`divide-y ${isDark ? 'divide-white/[0.06]' : 'divide-slate-100'}`}>
          {summaryItems.map(item => (
            <div key={item.label} className="flex items-start justify-between px-2 py-3">
              <span className={`text-xs shrink-0 ${textMuted(theme)}`}>{item.label}</span>
              <span className={`text-sm font-medium text-right max-w-[60%] break-all ${textPrimary(theme)}`}>{item.value}</span>
            </div>
          ))}
        </div>
      </BentoCard>

      {errors.submit && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
          <AlertCircle size={16} className="text-red-500 shrink-0" />
          <span className="text-xs text-red-500">{errors.submit}</span>
        </div>
      )}

      <div className="flex justify-between pt-4">
        <button type="button" onClick={goBack} disabled={submitting} className={`${btnSecondary(theme)} inline-flex items-center gap-2 disabled:opacity-50`}>
          <ArrowLeft size={18} />
          上一�?        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className={`${btnPrimary} px-10 inline-flex items-center gap-2 disabled:opacity-50`}
        >
          {submitting && <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white" />}
          提交创建
        </button>
      </div>
    </motion.div>
  );

  return (
    <div className={`flex-1 flex flex-col min-h-0 overflow-hidden ${canvasBodyBg(theme)}`}>
      <div className={`shrink-0 z-20 border-b px-4 sm:px-6 py-4 flex items-center gap-4 backdrop-blur-xl ${
        isDark ? 'border-white/[0.06] bg-lantu-surface/80' : 'border-slate-200/40 bg-white/80'
      }`}>
        <button type="button" onClick={onBack} className={btnGhost(theme)}>
          <ArrowLeft size={20} />
        </button>
        <h2 className={`text-lg font-bold ${textPrimary(theme)}`}>注册�?Skill</h2>
      </div>

      <div className={`flex-1 min-h-0 overflow-y-auto custom-scrollbar px-2 sm:px-3 lg:px-4 py-4 sm:py-6 ${mainScrollCompositorClass}`}>
        <div className="w-full max-w-2xl mx-auto">
          {renderStepIndicator()}

          <GlassPanel theme={theme} padding="lg">
            <AnimatePresence mode="wait">
              {step === 1 && renderStep1()}
              {step === 2 && renderStep2()}
              {step === 3 && renderStep3()}
            </AnimatePresence>
          </GlassPanel>
        </div>
      </div>
    </div>
  );
};
