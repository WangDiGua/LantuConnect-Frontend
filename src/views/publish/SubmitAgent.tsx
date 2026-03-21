import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check, Rocket, Save, AlertCircle, Info } from 'lucide-react';
import type { Theme, FontSize } from '../../types';
import type { AgentType } from '../../types/dto/agent';
import { nativeInputClass } from '../../utils/formFieldClasses';

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

export const SubmitAgent: React.FC<Props> = ({ theme, fontSize }) => {
  const isDark = theme === 'dark';
  const [step, setStep] = useState<Step>(1);
  const [submitted, setSubmitted] = useState(false);
  const [savedDraft, setSavedDraft] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState({
    displayName: '',
    description: '',
    agentType: 'http_api' as AgentType,
    specUrl: '',
  });

  const updateField = <K extends keyof typeof form>(key: K, val: (typeof form)[K]) => {
    setForm(prev => ({ ...prev, [key]: val }));
    setErrors(prev => { const n = { ...prev }; delete n[key]; return n; });
  };

  const validateStep1 = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.displayName.trim()) errs.displayName = '请输入 Agent 名称';
    if (form.displayName.trim().length > 50) errs.displayName = '名称不能超过 50 个字符';
    if (!form.description.trim()) errs.description = '请输入 Agent 描述';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateStep2 = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.specUrl.trim()) errs.specUrl = '请输入接口地址';
    else if (!/^https?:\/\/.+/.test(form.specUrl.trim())) errs.specUrl = '请输入合法的 URL（以 http:// 或 https:// 开头）';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSaveDraft = () => {
    if (!validateStep1()) return;
    setSavedDraft(true);
    setTimeout(() => setSavedDraft(false), 2000);
  };

  const handleSubmitReview = () => {
    if (step === 1) {
      if (!validateStep1()) return;
      setStep(2);
      return;
    }
    if (!validateStep2()) return;
    setSubmitted(true);
  };

  const labelCls = `block text-xs font-semibold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`;

  if (submitted) {
    return (
      <div className={`flex-1 flex flex-col min-h-0 overflow-hidden ${isDark ? 'bg-[#000000]' : 'bg-[#F2F2F7]'}`}>
        <div className="flex-1 flex items-center justify-center">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`w-full max-w-md mx-4 p-8 rounded-2xl border text-center ${isDark ? 'bg-[#1C1C1E] border-white/10' : 'bg-white border-slate-200'}`}
          >
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <Check size={32} className="text-emerald-500" />
            </div>
            <h3 className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>提交成功</h3>
            <p className={`text-sm mb-6 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              您的 Agent「{form.displayName}」已提交审核，管理员将尽快处理。
            </p>
            <button
              onClick={() => { setSubmitted(false); setStep(1); setForm({ displayName: '', description: '', agentType: 'http_api', specUrl: '' }); }}
              className="px-6 py-2.5 rounded-xl text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            >
              继续提交
            </button>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex-1 flex flex-col min-h-0 overflow-hidden ${isDark ? 'bg-[#000000]' : 'bg-[#F2F2F7]'}`}>
      <div className={`shrink-0 z-20 border-b px-4 sm:px-6 py-4 flex items-center gap-4 ${isDark ? 'border-white/10 bg-[#000000]' : 'border-slate-200/80 bg-[#F2F2F7]'}`}>
        {step === 2 && (
          <button type="button" onClick={() => setStep(1)} className={`p-2 rounded-xl transition-colors ${isDark ? 'hover:bg-white/10' : 'hover:bg-slate-100'}`}>
            <ArrowLeft size={20} className={isDark ? 'text-white' : 'text-slate-900'} />
          </button>
        )}
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl ${isDark ? 'bg-orange-500/20' : 'bg-orange-50'}`}>
            <Rocket size={20} className={isDark ? 'text-orange-400' : 'text-orange-600'} />
          </div>
          <div>
            <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>提交 Agent</h2>
            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>填写基本信息后提交审核，审核通过后将对全校可用</p>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-2 sm:px-3 lg:px-4 py-4">
        <div className="w-full max-w-2xl mx-auto">
          {/* Step indicator */}
          <div className="mb-8 flex items-center justify-center gap-4">
            {[{ id: 1, label: '基本信息' }, { id: 2, label: '接口配置' }].map((s, i) => (
              <React.Fragment key={s.id}>
                <div className="flex flex-col items-center gap-2">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                    step > s.id ? 'bg-emerald-500 text-white'
                      : step === s.id ? 'bg-blue-600 text-white ring-2 ring-blue-400/40'
                      : isDark ? 'bg-white/10 text-slate-500' : 'bg-slate-200 text-slate-500'
                  }`}>
                    {step > s.id ? <Check size={20} /> : s.id}
                  </div>
                  <span className={`text-xs font-bold ${step >= s.id ? 'text-blue-600 dark:text-blue-400' : isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                    {s.label}
                  </span>
                </div>
                {i === 0 && (
                  <div className={`w-16 h-0.5 rounded-full ${step > 1 ? 'bg-emerald-500' : isDark ? 'bg-white/10' : 'bg-slate-200'}`} />
                )}
              </React.Fragment>
            ))}
          </div>

          <div className={`rounded-2xl border overflow-hidden ${isDark ? 'bg-[#1C1C1E] border-white/10' : 'bg-white border-slate-200/80'}`}>
            <div className="p-6 sm:p-8">
              <AnimatePresence mode="wait">
                {step === 1 && (
                  <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
                    <div className={`p-3 rounded-xl flex items-start gap-2.5 ${isDark ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-blue-50 border border-blue-200'}`}>
                      <Info size={16} className={isDark ? 'text-blue-400 shrink-0 mt-0.5' : 'text-blue-600 shrink-0 mt-0.5'} />
                      <span className={`text-xs ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>
                        来源类型自动设为「内部」，提交后状态为「待审核」。
                      </span>
                    </div>

                    <div>
                      <label className={labelCls}>Agent 名称 *</label>
                      <input
                        type="text"
                        placeholder="例如：课表查询助手"
                        className={`${nativeInputClass(theme)} ${errors.displayName ? '!border-red-500' : ''}`}
                        value={form.displayName}
                        onChange={e => updateField('displayName', e.target.value)}
                      />
                      <div className="flex justify-between mt-1">
                        {errors.displayName ? <p className="text-xs text-red-500">{errors.displayName}</p> : <span />}
                        <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{form.displayName.length}/50</span>
                      </div>
                    </div>

                    <div>
                      <label className={labelCls}>描述 *</label>
                      <textarea
                        rows={4}
                        placeholder="描述该 Agent 的功能、用途及核心逻辑..."
                        className={`${nativeInputClass(theme)} !min-h-[100px] resize-y ${errors.description ? '!border-red-500' : ''}`}
                        value={form.description}
                        onChange={e => updateField('description', e.target.value)}
                      />
                      {errors.description && <p className="text-xs text-red-500 mt-1">{errors.description}</p>}
                    </div>

                    <div>
                      <label className={labelCls}>Agent 类型</label>
                      <div className="grid grid-cols-3 gap-3">
                        {AGENT_TYPE_OPTIONS.map(opt => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => updateField('agentType', opt.value)}
                            className={`p-3 rounded-xl border text-left transition-colors ${
                              form.agentType === opt.value
                                ? isDark ? 'border-blue-500 bg-blue-500/10' : 'border-blue-500 bg-blue-50'
                                : isDark ? 'border-white/10 hover:border-white/20' : 'border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            <span className={`block text-sm font-semibold ${form.agentType === opt.value ? (isDark ? 'text-blue-400' : 'text-blue-700') : (isDark ? 'text-white' : 'text-slate-900')}`}>
                              {opt.label}
                            </span>
                            <span className={`block text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{opt.desc}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex justify-between pt-4">
                      <button
                        type="button"
                        onClick={handleSaveDraft}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                          savedDraft
                            ? 'bg-emerald-500 text-white'
                            : isDark ? 'bg-white/10 text-slate-300 hover:bg-white/15' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {savedDraft ? <Check size={16} /> : <Save size={16} />}
                        {savedDraft ? '已保存' : '保存草稿'}
                      </button>
                      <button
                        type="button"
                        onClick={() => { if (validateStep1()) setStep(2); }}
                        className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20"
                      >
                        下一步
                        <ArrowRight size={16} />
                      </button>
                    </div>
                  </motion.div>
                )}

                {step === 2 && (
                  <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
                    <div>
                      <label className={labelCls}>接口地址 (URL) *</label>
                      <input
                        type="text"
                        placeholder="https://api.example.com/v1/agent"
                        className={`${nativeInputClass(theme)} ${errors.specUrl ? '!border-red-500' : ''}`}
                        value={form.specUrl}
                        onChange={e => updateField('specUrl', e.target.value)}
                      />
                      {errors.specUrl && <p className="text-xs text-red-500 mt-1">{errors.specUrl}</p>}
                    </div>

                    {/* Summary */}
                    <div className={`rounded-xl border divide-y ${isDark ? 'border-white/10 divide-white/10' : 'border-slate-200 divide-slate-100'}`}>
                      {[
                        { label: '名称', value: form.displayName },
                        { label: '类型', value: AGENT_TYPE_OPTIONS.find(o => o.value === form.agentType)?.label ?? form.agentType },
                        { label: '来源', value: '内部' },
                        { label: '接口', value: form.specUrl || '—' },
                      ].map(item => (
                        <div key={item.label} className="flex items-center justify-between px-4 py-3">
                          <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{item.label}</span>
                          <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>{item.value}</span>
                        </div>
                      ))}
                    </div>

                    {errors.submit && (
                      <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40">
                        <AlertCircle size={16} className="text-red-500 shrink-0" />
                        <span className="text-xs text-red-600 dark:text-red-400">{errors.submit}</span>
                      </div>
                    )}

                    <div className="flex justify-between pt-4">
                      <button
                        type="button"
                        onClick={() => setStep(1)}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-colors ${isDark ? 'bg-white/10 text-slate-300 hover:bg-white/15' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                      >
                        <ArrowLeft size={16} />
                        上一步
                      </button>
                      <button
                        type="button"
                        onClick={handleSubmitReview}
                        className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-medium bg-orange-500 text-white hover:bg-orange-600 transition-colors shadow-lg shadow-orange-500/20"
                      >
                        <Rocket size={16} />
                        提交审核
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
