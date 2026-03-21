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
import { nativeSelectClass, nativeInputClass } from '../../utils/formFieldClasses';
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
  { value: 'partner', label: '合作方' },
  { value: 'cloud', label: '云服务' },
];

const AGENT_TYPE_OPTIONS: { value: AgentType; label: string }[] = [
  { value: 'mcp', label: 'MCP 协议' },
  { value: 'http_api', label: 'HTTP API' },
  { value: 'builtin', label: '内置' },
];

const DISPLAY_TEMPLATE_OPTIONS: { value: DisplayTemplate | ''; label: string }[] = [
  { value: '', label: '无' },
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

export const SkillCreate: React.FC<Props> = ({ theme, fontSize: _fontSize, onBack, onSuccess }) => {
  const isDark = theme === 'dark';
  const [step, setStep] = useState<Step>(1);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [mcpServers, setMcpServers] = useState<McpServer[]>([]);

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
    if (!form.displayName.trim()) errs.displayName = '请输入显示名称';
    if (!form.agentName.trim()) errs.agentName = '请输入唯一标识';
    if (!form.description.trim()) errs.description = '请输入描述';
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
      onSuccess?.(String(created.id));
      onBack();
    } catch (err) {
      setErrors({ submit: err instanceof Error ? err.message : '创建失败，请检查网络连接后重试' });
    } finally {
      setSubmitting(false);
    }
  };

  const cardCls = `rounded-2xl border shadow-none ${isDark ? 'bg-[#1C1C1E] border-white/10' : 'bg-white border-slate-200/80'}`;
  const labelCls = `block text-xs font-semibold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`;
  const mutedCls = isDark ? 'text-slate-400' : 'text-slate-500';

  const summaryItems = useMemo(() => {
    const serverName = form.parentId ? mcpServers.find(s => s.id === Number(form.parentId))?.displayName ?? '—' : '无';
    return [
      { label: '显示名称', value: form.displayName || '—' },
      { label: '唯一标识', value: form.agentName || '—' },
      { label: '描述', value: form.description || '—' },
      { label: '来源类型', value: SOURCE_OPTIONS.find(o => o.value === form.sourceType)?.label ?? form.sourceType },
      { label: '协议类型', value: AGENT_TYPE_OPTIONS.find(o => o.value === form.agentType)?.label ?? form.agentType },
      { label: '所属 MCP Server', value: serverName },
      { label: '服务地址', value: form.specUrl || '—' },
      { label: 'API Key', value: form.specApiKey ? '••••••' : '未设置' },
      { label: '超时秒数', value: `${form.specTimeout}s` },
      { label: '展示模板', value: DISPLAY_TEMPLATE_OPTIONS.find(o => o.value === form.displayTemplate)?.label ?? '无' },
      { label: '参数 Schema', value: form.parametersSchema ? '已配置' : '未配置' },
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
              <motion.div
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                  isCompleted ? 'bg-emerald-500 text-white'
                    : isActive ? 'bg-blue-600 text-white ring-2 ring-blue-400/40'
                    : isDark ? 'bg-white/10 text-slate-500' : 'bg-slate-200 text-slate-500'
                }`}
                whileHover={!isActive && !isCompleted ? { scale: 1.1 } : {}}
              >
                {isCompleted ? <Check size={20} /> : <Icon size={18} />}
              </motion.div>
              <span className={`text-xs font-bold text-center max-w-[80px] ${
                isActive || isCompleted ? 'text-blue-600 dark:text-blue-400' : mutedCls
              }`}>
                {s.label}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <motion.div
                className={`w-14 h-0.5 rounded-full transition-all duration-300 ${
                  isCompleted ? 'bg-emerald-500' : isDark ? 'bg-white/10' : 'bg-slate-200'
                }`}
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
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
      <div>
        <label className={labelCls}>显示名称 *</label>
        <input
          type="text"
          placeholder="例如：天气查询工具"
          className={`${nativeInputClass(theme)} ${errors.displayName ? '!border-red-500' : ''}`}
          value={form.displayName}
          onChange={e => handleDisplayNameChange(e.target.value)}
        />
        {errors.displayName && <p className="text-xs text-red-500 mt-1">{errors.displayName}</p>}
      </div>

      <div>
        <label className={labelCls}>唯一标识 (agentName) *</label>
        <input
          type="text"
          placeholder="自动生成，可手动修改"
          className={`${nativeInputClass(theme)} font-mono text-sm ${errors.agentName ? '!border-red-500' : ''}`}
          value={form.agentName}
          onChange={e => updateField('agentName', e.target.value)}
        />
        {errors.agentName && <p className="text-xs text-red-500 mt-1">{errors.agentName}</p>}
      </div>

      <div>
        <label className={labelCls}>描述 *</label>
        <textarea
          rows={4}
          placeholder="描述该 Skill 的功能与用途…"
          className={`${nativeInputClass(theme)} !min-h-[100px] resize-y ${errors.description ? '!border-red-500' : ''}`}
          value={form.description}
          onChange={e => updateField('description', e.target.value)}
        />
        {errors.description && <p className="text-xs text-red-500 mt-1">{errors.description}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>来源类型</label>
          <select
            className={nativeSelectClass(theme)}
            value={form.sourceType}
            onChange={e => updateField('sourceType', e.target.value as SourceType)}
          >
            {SOURCE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>分类</label>
          <select className={nativeSelectClass(theme)} value={form.categoryId} onChange={e => updateField('categoryId', e.target.value)}>
            <option value="">暂不分类</option>
            <option value="1">校园业务</option>
            <option value="2">教学科研</option>
            <option value="3">办公效率</option>
            <option value="4">数据分析</option>
            <option value="5">生活服务</option>
          </select>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <button type="button" onClick={goNext} className="btn btn-primary px-8 gap-2 shadow-lg shadow-blue-500/20">
          下一步
          <ArrowRight size={18} />
        </button>
      </div>
    </motion.div>
  );

  const renderStep2 = () => (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>协议类型 *</label>
          <select
            className={nativeSelectClass(theme)}
            value={form.agentType}
            onChange={e => updateField('agentType', e.target.value as AgentType)}
          >
            {AGENT_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>所属 MCP Server</label>
          <div className="flex items-center gap-2">
            <select
              className={nativeSelectClass(theme)}
              value={form.parentId}
              onChange={e => updateField('parentId', e.target.value)}
            >
              <option value="">无（独立 Skill）</option>
              {mcpServers.map(s => <option key={s.id} value={s.id}>{s.displayName}</option>)}
            </select>
            {mcpServers.length > 0 && (
              <Server size={16} className={`shrink-0 ${mutedCls}`} />
            )}
          </div>
        </div>
      </div>

      <div>
        <label className={labelCls}>服务地址 (URL) *</label>
        <input
          type="text"
          placeholder="https://api.example.com/v1/tool"
          className={`${nativeInputClass(theme)} ${errors.specUrl ? '!border-red-500' : ''}`}
          value={form.specUrl}
          onChange={e => updateField('specUrl', e.target.value)}
        />
        {errors.specUrl && <p className="text-xs text-red-500 mt-1">{errors.specUrl}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>API Key</label>
          <input
            type="password"
            placeholder="可选"
            className={nativeInputClass(theme)}
            value={form.specApiKey}
            onChange={e => updateField('specApiKey', e.target.value)}
          />
        </div>
        <div>
          <label className={labelCls}>超时秒数</label>
          <input
            type="number"
            min={1}
            max={300}
            className={nativeInputClass(theme)}
            value={form.specTimeout}
            onChange={e => updateField('specTimeout', Number(e.target.value) || 30)}
          />
        </div>
      </div>

      <div>
        <label className={labelCls}>展示模板</label>
        <select
          className={nativeSelectClass(theme)}
          value={form.displayTemplate}
          onChange={e => updateField('displayTemplate', e.target.value as DisplayTemplate | '')}
        >
          {DISPLAY_TEMPLATE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      <div>
        <label className={labelCls}>参数 Schema (JSON)</label>
        <textarea
          rows={5}
          placeholder={'{\n  "type": "object",\n  "properties": { ... }\n}'}
          className={`${nativeInputClass(theme)} !min-h-[120px] font-mono text-xs resize-y ${errors.parametersSchema ? '!border-red-500' : ''}`}
          value={form.parametersSchema}
          onChange={e => updateField('parametersSchema', e.target.value)}
        />
        {errors.parametersSchema && <p className="text-xs text-red-500 mt-1">{errors.parametersSchema}</p>}
      </div>

      <div className="flex justify-between pt-4">
        <button type="button" onClick={goBack} className="btn btn-ghost gap-2">
          <ArrowLeft size={18} />
          上一步
        </button>
        <button type="button" onClick={goNext} className="btn btn-primary px-8 gap-2 shadow-lg shadow-blue-500/20">
          下一步
          <ArrowRight size={18} />
        </button>
      </div>
    </motion.div>
  );

  const renderStep3 = () => (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
      <div className="text-center mb-2">
        <h3 className={`text-lg font-bold mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>确认信息</h3>
        <p className={`text-sm ${mutedCls}`}>请检查以下信息，确认无误后提交</p>
      </div>

      <div className={`rounded-xl border divide-y ${isDark ? 'border-white/10 divide-white/10' : 'border-slate-200 divide-slate-100'}`}>
        {summaryItems.map(item => (
          <div key={item.label} className="flex items-start justify-between px-4 py-3">
            <span className={`text-xs shrink-0 ${mutedCls}`}>{item.label}</span>
            <span className={`text-sm font-medium text-right max-w-[60%] break-all ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {item.value}
            </span>
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
        <button type="button" onClick={goBack} disabled={submitting} className="btn btn-ghost gap-2">
          <ArrowLeft size={18} />
          上一步
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className="btn btn-primary px-10 gap-2 shadow-lg shadow-blue-500/20"
        >
          {submitting && <span className="loading loading-spinner loading-xs" />}
          提交创建
        </button>
      </div>
    </motion.div>
  );

  return (
    <div className={`flex-1 flex flex-col min-h-0 overflow-hidden ${isDark ? 'bg-[#000000]' : 'bg-[#F2F2F7]'}`}>
      <div className={`shrink-0 z-20 border-b px-4 sm:px-6 py-4 flex items-center gap-4 ${
        isDark ? 'border-white/10 bg-[#000000]' : 'border-slate-200/80 bg-[#F2F2F7]'
      }`}>
        <button type="button" onClick={onBack} className="btn btn-ghost btn-sm btn-circle">
          <ArrowLeft size={20} />
        </button>
        <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>注册新 Skill</h2>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-2 sm:px-3 lg:px-4 py-2 sm:py-3">
        <div className="w-full max-w-2xl mx-auto">
          {renderStepIndicator()}

          <div className={`${cardCls} overflow-hidden`}>
            <div className="p-6 sm:p-8">
              <AnimatePresence mode="wait">
                {step === 1 && renderStep1()}
                {step === 2 && renderStep2()}
                {step === 3 && renderStep3()}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
