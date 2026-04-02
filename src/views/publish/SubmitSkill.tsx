// @deprecated - This file is no longer used in the current routing. Replaced by unified resource management.
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check, Rocket, Save, AlertCircle, Info, Puzzle, Loader2 } from 'lucide-react';
import type { Theme, FontSize } from '../../types';
import type { AgentType } from '../../types/dto/agent';
import { skillService } from '../../api/services/skill.service';
import { nativeInputClass } from '../../utils/formFieldClasses';
import { btnPrimary, btnSecondary, canvasBodyBg, mainScrollCompositorClass, textPrimary, textSecondary, textMuted } from '../../utils/uiClasses';
import { GlassPanel } from '../../components/common/GlassPanel';
import { BentoCard } from '../../components/common/BentoCard';

interface Props {
  theme: Theme;
  fontSize: FontSize;
  onBack?: () => void;
}

type Step = 1 | 2;

const AGENT_TYPE_OPTIONS: { value: AgentType; label: string; desc: string }[] = [
  { value: 'http_api', label: 'HTTP API', desc: '标准 REST/HTTP 接口' },
  { value: 'mcp', label: 'MCP 协议', desc: 'Model Context Protocol' },
  { value: 'builtin', label: '内置', desc: '平台内置能力' },
];

const springTransition = { type: 'spring' as const, stiffness: 400, damping: 30 };
const INPUT_FOCUS = 'focus:ring-2 focus:ring-neutral-900/20 focus:border-neutral-900/35';

export const SubmitSkill: React.FC<Props> = ({ theme, fontSize }) => {
  const isDark = theme === 'dark';
  const [step, setStep] = useState<Step>(1);
  const [submitted, setSubmitted] = useState(false);
  const [savedDraft, setSavedDraft] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const labelCls = `text-sm font-medium ${textSecondary(theme)}`;
  const inputCls = `${nativeInputClass(theme)} ${INPUT_FOCUS}`;

  const [form, setForm] = useState({
    displayName: '',
    description: '',
    agentType: 'http_api' as AgentType,
    specUrl: '',
    parametersSchema: '',
  });

  const updateField = <K extends keyof typeof form>(key: K, val: (typeof form)[K]) => {
    setForm(prev => ({ ...prev, [key]: val }));
    setErrors(prev => { const n = { ...prev }; delete n[key]; return n; });
  };

  const validateStep1 = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.displayName.trim()) errs.displayName = '请输�?Skill 名称';
    if (form.displayName.trim().length > 50) errs.displayName = '名称不能超过 50 个字�?;
    if (!form.description.trim()) errs.description = '请输�?Skill 描述';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateStep2 = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.specUrl.trim()) errs.specUrl = '请输入接口地址';
    else if (!/^https?:\/\/.+/.test(form.specUrl.trim())) errs.specUrl = '请输入合法的 URL（以 http:// �?https:// 开头）';
    if (form.parametersSchema.trim()) {
      try { JSON.parse(form.parametersSchema); } catch { errs.parametersSchema = '参数 Schema 必须是合法的 JSON'; }
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const buildPayload = (status: 'draft' | 'pending_review') => ({
    agentName: form.displayName.trim().toLowerCase().replace(/\s+/g, '_'),
    displayName: form.displayName.trim(),
    description: form.description.trim(),
    agentType: form.agentType,
    sourceType: 'internal' as const,
    specJson: { url: form.specUrl.trim() },
    parametersSchema: form.parametersSchema.trim() ? JSON.parse(form.parametersSchema) : null,
    status,
  });

  const handleSaveDraft = async () => {
    if (!validateStep1()) return;
    setLoading(true);
    try {
      await skillService.create(buildPayload('draft'));
      setSavedDraft(true);
      setTimeout(() => setSavedDraft(false), 2000);
    } catch (e) {
      setErrors({ submit: e instanceof Error ? e.message : '保存草稿失败' });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReview = async () => {
    if (step === 1) {
      if (!validateStep1()) return;
      setStep(2);
      return;
    }
    if (!validateStep2()) return;
    setLoading(true);
    try {
      await skillService.create(buildPayload('pending_review'));
      setSubmitted(true);
    } catch (e) {
      setErrors({ submit: e instanceof Error ? e.message : '提交审核失败' });
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className={`flex-1 flex flex-col min-h-0 overflow-hidden ${canvasBodyBg(theme)}`}>
        <div className="flex-1 flex items-center justify-center">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={springTransition}
          >
            <GlassPanel theme={theme} padding="lg" className="w-full max-w-md mx-4 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <Check size={32} className="text-emerald-500" />
              </div>
              <h3 className={`text-xl font-bold mb-2 ${textPrimary(theme)}`}>提交成功</h3>
              <p className={`text-sm mb-6 ${textSecondary(theme)}`}>
                您的 Skill「{form.displayName}」已提交审核，管理员将尽快处理�?              </p>
              <button
                onClick={() => { setSubmitted(false); setStep(1); setForm({ displayName: '', description: '', agentType: 'http_api', specUrl: '', parametersSchema: '' }); }}
                className={btnPrimary}
              >
                继续提交
              </button>
            </GlassPanel>
          </motion.div>
        </div>
      </div>
    );
  }

  const renderStepIndicator = () => (
    <div className="mb-8 flex items-center justify-center gap-4">
      {[{ id: 1, label: '基本信息' }, { id: 2, label: '接口配置' }].map((s, i) => (
        <React.Fragment key={s.id}>
          <div className="flex flex-col items-center gap-2">
            <div className="relative w-10 h-10">
              {step === s.id && (
                <motion.div
                  layoutId="submitSkillStepBg"
                  className="absolute inset-0 rounded-full bg-neutral-900 ring-2 ring-neutral-500/40"
                  transition={springTransition}
                />
              )}
              {step > s.id && <div className="absolute inset-0 rounded-full bg-emerald-500" />}
              {step < s.id && <div className={`absolute inset-0 rounded-full ${isDark ? 'bg-white/10' : 'bg-slate-200'}`} />}
              <div className={`relative z-10 w-full h-full flex items-center justify-center ${step >= s.id ? 'text-white' : 'text-slate-500'}`}>
                {step > s.id ? <Check size={20} /> : <span className="text-sm font-semibold">{s.id}</span>}
              </div>
            </div>
            <span className={`text-xs font-bold ${step >= s.id ? 'text-neutral-900 dark:text-neutral-300' : textMuted(theme)}`}>
              {s.label}
            </span>
          </div>
          {i === 0 && (
            <div className={`w-16 h-0.5 rounded-full ${step > 1 ? 'bg-emerald-500' : isDark ? 'bg-white/10' : 'bg-slate-200'}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );

  return (
    <div className={`flex-1 flex flex-col min-h-0 overflow-hidden ${canvasBodyBg(theme)}`}>
      <div className={`shrink-0 z-20 border-b px-4 sm:px-6 py-4 flex items-center gap-4 backdrop-blur-xl ${
        isDark ? 'border-white/[0.06] bg-[#0c0f17]/80' : 'border-slate-200/40 bg-white/80'
      }`}>
        {step === 2 && (
          <button type="button" onClick={() => setStep(1)} className={`p-2 rounded-xl transition-colors ${isDark ? 'hover:bg-white/10' : 'hover:bg-slate-100'}`}>
            <ArrowLeft size={20} className={textPrimary(theme)} />
          </button>
        )}
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl ${isDark ? 'bg-neutral-900/20' : 'bg-neutral-100'}`}>
            <Puzzle size={20} className={isDark ? 'text-neutral-300' : 'text-neutral-900'} />
          </div>
          <div>
            <h2 className={`text-lg font-bold ${textPrimary(theme)}`}>提交 Skill</h2>
            <p className={`text-xs ${textSecondary(theme)}`}>填写基本信息后提交审核，审核通过后将对全校可�?/p>
          </div>
        </div>
      </div>

      <div className={`flex-1 min-h-0 overflow-y-auto custom-scrollbar px-2 sm:px-3 lg:px-4 py-4 sm:py-6 ${mainScrollCompositorClass}`}>
        <div className="w-full max-w-2xl mx-auto">
          {renderStepIndicator()}

          <GlassPanel theme={theme} padding="lg">
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={springTransition} className="space-y-5">
                  <BentoCard theme={theme} padding="sm" className="!border-neutral-900/20">
                    <div className="flex items-start gap-2.5">
                      <Info size={16} className="text-neutral-800 shrink-0 mt-0.5" />
                      <span className={`text-xs ${textSecondary(theme)}`}>来源类型自动设为「内部」，提交后状态为「待审核」�?/span>
                    </div>
                  </BentoCard>

                  <BentoCard theme={theme} padding="md">
                    <div className="space-y-5">
                      <div>
                        <label className={`${labelCls} mb-1.5 block`}>Skill 名称 *</label>
                        <input
                          type="text"
                          placeholder="例如：天气查询工�?
                          className={`${inputCls} ${errors.displayName ? '!border-red-500 !ring-red-500/20' : ''}`}
                          value={form.displayName}
                          onChange={e => updateField('displayName', e.target.value)}
                        />
                        <div className="flex justify-between mt-1">
                          {errors.displayName ? <p className="text-xs text-red-500">{errors.displayName}</p> : <span />}
                          <span className={`text-xs ${textMuted(theme)}`}>{form.displayName.length}/50</span>
                        </div>
                      </div>

                      <div>
                        <label className={`${labelCls} mb-1.5 block`}>描述 *</label>
                        <textarea
                          rows={4}
                          placeholder="描述�?Skill 的功能与用�?.."
                          className={`${inputCls} !min-h-[100px] resize-y ${errors.description ? '!border-red-500 !ring-red-500/20' : ''}`}
                          value={form.description}
                          onChange={e => updateField('description', e.target.value)}
                        />
                        {errors.description && <p className="text-xs text-red-500 mt-1">{errors.description}</p>}
                      </div>

                      <div className={`border-t pt-5 ${isDark ? 'border-white/[0.06]' : 'border-slate-100'}`}>
                        <label className={`${labelCls} mb-2 block`}>协议类型</label>
                        <div className="grid grid-cols-3 gap-3">
                          {AGENT_TYPE_OPTIONS.map(opt => (
                            <BentoCard
                              key={opt.value}
                              theme={theme}
                              hover
                              padding="sm"
                              className={`cursor-pointer text-left ${form.agentType === opt.value ? 'ring-2 ring-neutral-900/35 border-neutral-800/25' : ''}`}
                              onClick={() => updateField('agentType', opt.value)}
                            >
                              <span className={`block text-sm font-semibold ${form.agentType === opt.value ? 'text-neutral-900 dark:text-neutral-300' : textPrimary(theme)}`}>
                                {opt.label}
                              </span>
                              <span className={`block text-xs mt-0.5 ${textMuted(theme)}`}>{opt.desc}</span>
                            </BentoCard>
                          ))}
                        </div>
                      </div>
                    </div>
                  </BentoCard>

                  <div className="flex justify-between pt-4">
                    <button
                      type="button"
                      onClick={handleSaveDraft}
                      disabled={loading}
                      className={`${btnSecondary(theme)} inline-flex items-center gap-2 ${savedDraft ? '!bg-emerald-500 !text-white !border-emerald-500' : ''} disabled:opacity-50`}
                    >
                      {loading ? <Loader2 size={16} className="animate-spin" /> : savedDraft ? <Check size={16} /> : <Save size={16} />}
                      {savedDraft ? '已保�? : '保存草稿'}
                    </button>
                    <button
                      type="button"
                      onClick={() => { if (validateStep1()) setStep(2); }}
                      className={`${btnPrimary} inline-flex items-center gap-2`}
                    >
                      下一�?                      <ArrowRight size={16} />
                    </button>
                  </div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={springTransition} className="space-y-5">
                  <BentoCard theme={theme} padding="md">
                    <div className="space-y-5">
                      <div>
                        <label className={`${labelCls} mb-1.5 block`}>接口地址 (URL) *</label>
                        <input
                          type="text"
                          placeholder="https://api.example.com/regis/catalog/resolve"
                          className={`${inputCls} ${errors.specUrl ? '!border-red-500 !ring-red-500/20' : ''}`}
                          value={form.specUrl}
                          onChange={e => updateField('specUrl', e.target.value)}
                        />
                        {errors.specUrl && <p className="text-xs text-red-500 mt-1">{errors.specUrl}</p>}
                      </div>

                      <div>
                        <label className={`${labelCls} mb-1.5 block`}>参数 Schema (JSON, 可�?</label>
                        <textarea
                          rows={4}
                          placeholder={'{\n  "type": "object",\n  "properties": { ... }\n}'}
                          className={`${inputCls} !min-h-[100px] font-mono text-xs resize-y ${errors.parametersSchema ? '!border-red-500 !ring-red-500/20' : ''}`}
                          value={form.parametersSchema}
                          onChange={e => updateField('parametersSchema', e.target.value)}
                        />
                        {errors.parametersSchema && <p className="text-xs text-red-500 mt-1">{errors.parametersSchema}</p>}
                      </div>
                    </div>
                  </BentoCard>

                  <BentoCard theme={theme} padding="sm">
                    <div className={`divide-y ${isDark ? 'divide-white/[0.06]' : 'divide-slate-100'}`}>
                      {[
                        { label: '名称', value: form.displayName },
                        { label: '类型', value: AGENT_TYPE_OPTIONS.find(o => o.value === form.agentType)?.label ?? form.agentType },
                        { label: '来源', value: '内部' },
                        { label: '接口', value: form.specUrl || '�? },
                        { label: '参数 Schema', value: form.parametersSchema ? '已配�? : '未配�? },
                      ].map(item => (
                        <div key={item.label} className="flex items-center justify-between px-2 py-3">
                          <span className={`text-xs ${textMuted(theme)}`}>{item.label}</span>
                          <span className={`text-sm font-medium ${textPrimary(theme)}`}>{item.value}</span>
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
                    <button type="button" onClick={() => setStep(1)} className={`${btnSecondary(theme)} inline-flex items-center gap-2`}>
                      <ArrowLeft size={16} />
                      上一�?                    </button>
                    <button type="button" onClick={handleSubmitReview} disabled={loading} className={`${btnPrimary} inline-flex items-center gap-2 disabled:opacity-50`}>
                      {loading ? <Loader2 size={16} className="animate-spin" /> : <Rocket size={16} />}
                      提交审核
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </GlassPanel>
        </div>
      </div>
    </div>
  );
};
