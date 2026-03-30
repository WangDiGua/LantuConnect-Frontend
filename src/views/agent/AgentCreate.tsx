import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Zap,
  Activity,
  FileText,
  Webhook,
  AlertCircle,
  Info,
  Eye,
  Sparkles,
  MessageSquare,
} from 'lucide-react';
import { Theme, FontSize, ThemeColor } from '../../types';
import type { Agent, AgentType } from '../../types/dto/agent';
import { nativeInputClass } from '../../utils/formFieldClasses';
import { LantuSelect } from '../../components/common/LantuSelect';
import { btnPrimary, btnSecondary, btnGhost, canvasBodyBg, textPrimary, textSecondary, textMuted } from '../../utils/uiClasses';
import { useCreateAgent, useUpdateAgent } from '../../hooks/queries/useAgent';
import { useMessage } from '../../components/common/Message';
import { z } from 'zod';
import { ProgressBar } from '../../components/common/ProgressBar';
import { GlassPanel } from '../../components/common/GlassPanel';
import { BentoCard } from '../../components/common/BentoCard';
import { THEME_COLOR_CLASSES } from '../../constants/theme';

interface AgentCreateProps {
  theme: Theme;
  fontSize: FontSize;
  themeColor?: ThemeColor;
  onBack: () => void;
  onSuccess: (agentId: string) => void;
  editAgent?: Agent;
}

type Step = 'TEMPLATE_SELECT' | 'BASIC_INFO' | 'TYPE_SELECT' | 'TYPE_CONFIG' | 'SUBMITTING';

interface AgentTemplate {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  category: string;
  preset: {
    type: string;
    config: {
      method: string;
      authType: string;
      timeout: number;
    };
  };
}

const AGENT_TEMPLATES: AgentTemplate[] = [
  {
    id: 'chatbot',
    name: '对话助手',
    description: '适用于日常咨询与问答场景',
    icon: MessageSquare,
    category: '对话',
    preset: { type: 'REST_API', config: { method: 'POST', authType: 'NONE', timeout: 30 } },
  },
  {
    id: 'api_proxy',
    name: 'API 代理',
    description: '快速接入第三方 API 服务',
    icon: Zap,
    category: '集成',
    preset: { type: 'REST_API', config: { method: 'GET', authType: 'BEARER', timeout: 30 } },
  },
  {
    id: 'webhook',
    name: 'Webhook 接收',
    description: '接收外部事件推�?,
    icon: Webhook,
    category: '集成',
    preset: { type: 'WEBHOOK', config: { method: 'POST', authType: 'API_KEY', timeout: 60 } },
  },
];

const QUICK_PRESETS = [
  { label: '快速配�?, config: { method: 'GET', authType: 'NONE', timeout: 30 } },
  { label: '安全配置', config: { method: 'POST', authType: 'BEARER', timeout: 60 } },
  { label: '高性能', config: { method: 'GET', authType: 'API_KEY', timeout: 10 } },
];

const FORM_TYPE_TO_AGENT_TYPE: Record<string, AgentType> = {
  REST_API: 'http_api',
  MCP: 'mcp',
  OPENAPI: 'http_api',
  WEBHOOK: 'http_api',
};

const AGENT_TYPE_TO_FORM_TYPE: Record<string, string> = {
  http_api: 'REST_API',
  mcp: 'MCP',
  builtin: 'REST_API',
};

const basicInfoSchema = z.object({
  name: z.string().min(1, '请输�?Agent 名称').max(50, '名称不能超过 50 个字�?),
  description: z.string().min(1, '请输�?Agent 描述'),
});

const configSchema = z.object({
  url: z.string().min(1, '请输入接口地址').url('接口地址必须�?http:// �?https:// 开�?),
});

const springTransition = { type: 'spring' as const, stiffness: 400, damping: 30 };
const INPUT_FOCUS = 'focus:ring-2 focus:ring-neutral-900/20 focus:border-neutral-900/35';

export const AgentCreate: React.FC<AgentCreateProps> = ({ theme, fontSize, themeColor = 'blue', onBack, onSuccess, editAgent }) => {
  const isDark = theme === 'dark';
  const { showMessage } = useMessage();
  const tc = THEME_COLOR_CLASSES[themeColor];
  const isEditMode = !!editAgent;
  const [currentStep, setCurrentStep] = useState<Step>(isEditMode ? 'BASIC_INFO' : 'TEMPLATE_SELECT');
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [formData, setFormData] = useState(() => {
    if (editAgent) {
      const spec = editAgent.specJson || {};
      return {
        name: editAgent.displayName,
        description: editAgent.description,
        type: AGENT_TYPE_TO_FORM_TYPE[editAgent.agentType] || 'REST_API',
        config: {
          url: String(spec.url || ''),
          method: String(spec.method || 'GET'),
          authType: String(spec.authType || 'NONE'),
          timeout: Number(spec.timeout) || 30,
        },
      };
    }
    return {
      name: '',
      description: '',
      type: 'REST_API',
      config: { url: '', method: 'GET', authType: 'NONE', timeout: 30 },
    };
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const createMut = useCreateAgent();
  const updateMut = useUpdateAgent();

  const labelCls = `text-sm font-medium ${textSecondary(theme)}`;
  const inputCls = `${nativeInputClass(theme)} ${INPUT_FOCUS}`;
  const methodOptions = ['GET', 'POST', 'PUT', 'DELETE'].map((m) => ({ value: m, label: m }));
  const authTypeOptions = [
    { value: 'NONE', label: '无验�? },
    { value: 'BEARER', label: 'Bearer Token' },
    { value: 'API_KEY', label: 'API Key' },
    { value: 'BASIC', label: 'Basic Auth' },
  ];

  const applyTemplate = (template: AgentTemplate) => {
    setSelectedTemplate(template.id);
    setFormData({
      ...formData,
      type: template.preset.type,
      config: { ...formData.config, ...template.preset.config },
    });
    setCurrentStep('BASIC_INFO');
  };

  const applyQuickPreset = (preset: typeof QUICK_PRESETS[0]) => {
    setFormData({
      ...formData,
      config: { ...formData.config, ...preset.config },
    });
  };

  const validateBasicInfo = () => {
    const result = basicInfoSchema.safeParse({ name: formData.name, description: formData.description });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((e) => { fieldErrors[String(e.path[0])] = e.message; });
      setErrors(fieldErrors);
      return false;
    }
    setErrors({});
    return true;
  };

  const validateConfig = () => {
    const result = configSchema.safeParse({ url: formData.config.url });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((e) => { fieldErrors[String(e.path[0])] = e.message; });
      setErrors(fieldErrors);
      return false;
    }
    setErrors({});
    return true;
  };

  const handleSubmit = () => {
    if (!validateConfig()) return;

    setCurrentStep('SUBMITTING');

    const payload = {
      agentName: formData.name,
      displayName: formData.name,
      description: formData.description,
      agentType: FORM_TYPE_TO_AGENT_TYPE[formData.type] ?? 'http_api',
      sourceType: 'internal' as const,
      specJson: {
        url: formData.config.url,
        method: formData.config.method,
        authType: formData.config.authType,
        timeout: formData.config.timeout,
      },
      systemPrompt: `Endpoint: ${formData.config.url}`,
    };
    const onMutError = (err: Error) => {
      setCurrentStep('TYPE_CONFIG');
      const errMsg = err instanceof Error ? err.message : (isEditMode ? '保存失败，请检查网络连接后重试�? : '创建失败，请检查网络连接后重试�?);
      setErrors({ submit: errMsg });
      showMessage(isEditMode ? '保存失败: ' + errMsg : '创建失败: ' + errMsg, 'error');
    };

    if (isEditMode && editAgent) {
      updateMut.mutate(
        { id: editAgent.id, data: payload },
        { onSuccess: (agent) => onSuccess(String(agent.id)), onError: onMutError }
      );
    } else {
      createMut.mutate(payload, {
        onSuccess: (agent) => onSuccess(String(agent.id)),
        onError: onMutError,
      });
    }
  };

  const renderStepIndicator = () => {
    const steps = [
      { id: 'TEMPLATE_SELECT', label: '选择模板', optional: true },
      { id: 'BASIC_INFO', label: '基本信息' },
      { id: 'TYPE_SELECT', label: '类型选择' },
      { id: 'TYPE_CONFIG', label: '配置详情' },
    ];

    const currentStepIndex = steps.findIndex(s => s.id === currentStep);
    const progress = currentStep === 'SUBMITTING' ? 100 : ((currentStepIndex + 1) / steps.length) * 100;

    return (
      <div className="mb-8">
        <div className="flex items-center justify-center gap-4 mb-4">
          {steps.map((step, index) => {
            const stepIndex = steps.findIndex(s => s.id === currentStep);
            const isActive = currentStep === step.id || (currentStep === 'SUBMITTING' && index === steps.length - 1);
            const isCompleted = stepIndex > index || currentStep === 'SUBMITTING';
            const isSkipped = step.optional && !!selectedTemplate && index === 0;

            return (
              <React.Fragment key={step.id}>
                <div className="flex flex-col items-center gap-2">
                  <div className="relative w-10 h-10">
                    {isActive && (
                      <motion.div
                        layoutId="agentStepBg"
                        className="absolute inset-0 rounded-full bg-neutral-900 ring-2 ring-neutral-500/40"
                        transition={springTransition}
                      />
                    )}
                    {isCompleted && !isActive && (
                      <div className="absolute inset-0 rounded-full bg-emerald-500" />
                    )}
                    {!isActive && !isCompleted && (
                      <div className={`absolute inset-0 rounded-full ${isSkipped ? 'bg-slate-300 dark:bg-white/20' : isDark ? 'bg-white/10' : 'bg-slate-200'}`} />
                    )}
                    <div className={`relative z-10 w-full h-full flex items-center justify-center ${isActive || isCompleted ? 'text-white' : 'text-slate-500'}`}>
                      {isCompleted && !isActive ? <Check size={20} /> : isSkipped ? <Check size={20} className="opacity-50" /> : <span className="text-sm font-semibold">{index + 1}</span>}
                    </div>
                  </div>
                  <span className={`text-xs font-bold text-center max-w-[80px] ${isActive || isCompleted ? 'text-neutral-900 dark:text-neutral-300' : textMuted(theme)}`}>
                    {step.label}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <motion.div
                    className={`w-16 h-0.5 rounded-full transition-all duration-300 ${isCompleted ? 'bg-emerald-500' : isDark ? 'bg-white/10' : 'bg-slate-200'}`}
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: isCompleted ? 1 : 0.3 }}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
        <ProgressBar value={progress} theme={theme} themeColor={themeColor} showLabel={false} height="sm" />
      </div>
    );
  };

  const renderPreview = () => {
    if (!showPreview) return null;

    return (
      <BentoCard theme={theme} padding="sm" className="mt-6">
        <div className="flex items-center gap-2 mb-3">
          <Eye size={16} className="text-neutral-800" />
          <span className={`text-sm font-semibold ${textPrimary(theme)}`}>实时预览</span>
        </div>
        <div className="space-y-2 text-xs">
          {[
            { label: '名称', value: formData.name || '未填�? },
            { label: '类型', value: formData.type },
            { label: '方法', value: formData.config.method },
            { label: '认证', value: formData.config.authType },
          ].map(item => (
            <div key={item.label} className="flex justify-between">
              <span className={textSecondary(theme)}>{item.label}�?/span>
              <span className={textPrimary(theme)}>{item.value}</span>
            </div>
          ))}
        </div>
      </BentoCard>
    );
  };

  const renderTemplateSelect = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={springTransition}
      className="space-y-6"
    >
      <div className="text-center mb-6">
        <h3 className={`text-lg font-bold mb-2 ${textPrimary(theme)}`}>选择创建方式</h3>
        <p className={`text-sm ${textSecondary(theme)}`}>从模板快速开始，或选择空白创建</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        {AGENT_TEMPLATES.map((template) => (
          <BentoCard
            key={template.id}
            theme={theme}
            hover
            padding="sm"
            className={`cursor-pointer ${selectedTemplate === template.id ? 'ring-2 ring-neutral-900/35 border-neutral-800/25' : ''}`}
            onClick={() => applyTemplate(template)}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className={`p-2 rounded-xl ${selectedTemplate === template.id ? 'bg-neutral-900 text-white' : isDark ? 'bg-white/10 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                <template.icon size={20} />
              </div>
              <div className="flex-1">
                <span className={`font-bold ${textPrimary(theme)}`}>{template.name}</span>
                <span className={`ml-2 text-xs px-2 py-0.5 rounded-lg ${isDark ? 'bg-white/10 text-slate-400' : 'bg-slate-100 text-slate-600'}`}>
                  {template.category}
                </span>
              </div>
            </div>
            <p className={`text-xs leading-relaxed ${textMuted(theme)}`}>{template.description}</p>
          </BentoCard>
        ))}
      </div>

      <div className="flex justify-end pt-4">
        <button
          type="button"
          onClick={() => setCurrentStep('BASIC_INFO')}
          className={`${btnPrimary} px-8 inline-flex items-center gap-2`}
        >
          跳过模板，直接创�?          <ArrowRight size={18} />
        </button>
      </div>
    </motion.div>
  );

  const renderBasicInfo = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={springTransition}
      className="space-y-6"
    >
      <BentoCard theme={theme} padding="md">
        <div className="space-y-5">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className={labelCls}>Agent 名称</label>
              <span className={`text-xs ${textMuted(theme)}`}>{formData.name.length}/50</span>
            </div>
            <input
              type="text"
              placeholder="例如：学生办事助�?
              className={`${inputCls} ${errors.name ? '!border-red-500 !ring-red-500/20' : ''}`}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
          </div>

          <div>
            <label className={`${labelCls} mb-1.5 block`}>Agent 描述</label>
            <textarea
              className={`${inputCls} !min-h-[8rem] resize-y ${errors.description ? '!border-red-500 !ring-red-500/20' : ''}`}
              placeholder="描述�?Agent 的功能、用途及核心逻辑..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
            {errors.description && <p className="text-xs text-red-500 mt-1">{errors.description}</p>}
          </div>
        </div>
      </BentoCard>

      {renderPreview()}

      <div className="flex justify-between pt-4">
        <button
          type="button"
          onClick={() => setShowPreview(!showPreview)}
          className={`${btnGhost(theme)} gap-2 ${showPreview ? 'text-neutral-800' : ''}`}
        >
          <Eye size={16} />
          {showPreview ? '隐藏预览' : '实时预览'}
        </button>
        <button
          type="button"
          onClick={() => validateBasicInfo() && setCurrentStep('TYPE_SELECT')}
          className={`${btnPrimary} px-8 inline-flex items-center gap-2`}
        >
          下一�?          <ArrowRight size={18} />
        </button>
      </div>
    </motion.div>
  );

  const renderTypeSelect = () => {
    const types = [
      { id: 'REST_API', label: 'REST API', icon: Zap, desc: '标准�?HTTP/HTTPS 接口调用' },
      { id: 'MCP', label: 'MCP 协议', icon: Activity, desc: '基于 Model Context Protocol 的高性能通信' },
      { id: 'OPENAPI', label: 'OpenAPI', icon: FileText, desc: '导入 Swagger/OpenAPI 规范文档' },
      { id: 'WEBHOOK', label: 'Webhook', icon: Webhook, desc: '接收外部事件推送的回调接口' },
    ];

    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={springTransition}
        className="space-y-6"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {types.map((type) => (
            <BentoCard
              key={type.id}
              theme={theme}
              hover
              padding="sm"
              className={`cursor-pointer ${formData.type === type.id ? 'ring-2 ring-neutral-900/35 border-neutral-800/25' : ''}`}
              onClick={() => setFormData({ ...formData, type: type.id })}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className={`p-2 rounded-xl ${formData.type === type.id ? 'bg-neutral-900 text-white' : isDark ? 'bg-white/10 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                  <type.icon size={20} />
                </div>
                <span className={`font-bold ${textPrimary(theme)}`}>{type.label}</span>
              </div>
              <p className={`text-xs leading-relaxed ${textMuted(theme)}`}>{type.desc}</p>
            </BentoCard>
          ))}
        </div>

        <div className="flex justify-between pt-4">
          <button type="button" onClick={() => setCurrentStep('BASIC_INFO')} className={`${btnSecondary(theme)} inline-flex items-center gap-2`}>
            <ArrowLeft size={18} />
            上一�?          </button>
          <button type="button" onClick={() => setCurrentStep('TYPE_CONFIG')} className={`${btnPrimary} px-8 inline-flex items-center gap-2`}>
            下一�?            <ArrowRight size={18} />
          </button>
        </div>
      </motion.div>
    );
  };

  const renderTypeConfig = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={springTransition}
      className="space-y-6"
    >
      <BentoCard theme={theme} padding="sm">
        <div className="flex items-center gap-2">
          <Info size={18} className="text-neutral-800 shrink-0" />
          <span className={`text-xs ${textSecondary(theme)}`}>您正在为 <strong className={textPrimary(theme)}>{formData.type}</strong> 类型配置接口详情�?/span>
        </div>
      </BentoCard>

      <BentoCard theme={theme} padding="sm">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={16} className="text-neutral-800" />
          <span className={`text-sm font-semibold ${textPrimary(theme)}`}>快速配�?/span>
        </div>
        <div className="flex flex-wrap gap-2">
          {QUICK_PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => applyQuickPreset(preset)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                isDark
                  ? 'bg-white/10 text-slate-300 hover:bg-white/15'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </BentoCard>

      <BentoCard theme={theme} padding="md">
        <div className="space-y-5">
          <div>
            <label className={`${labelCls} mb-1.5 block`}>接口地址 (URL)</label>
            <div className="join w-full">
              <LantuSelect
                theme={theme}
                className="join-item w-32 shrink-0 min-w-0"
                triggerClassName={`${INPUT_FOCUS} rounded-l-xl rounded-r-none border-r-0`}
                value={formData.config.method}
                onChange={(v) => setFormData({ ...formData, config: { ...formData.config, method: v } })}
                options={methodOptions}
              />
              <input
                type="text"
                placeholder="https://api.example.com/api/invoke"
                className={`${inputCls} join-item flex-1 !rounded-l-none !rounded-r-xl ${errors.url ? '!border-red-500 !ring-red-500/20' : ''}`}
                value={formData.config.url}
                onChange={(e) => setFormData({ ...formData, config: { ...formData.config, url: e.target.value } })}
              />
            </div>
            {errors.url && <p className="text-xs text-red-500 mt-1">{errors.url}</p>}
          </div>

          <div className={`border-t pt-5 ${isDark ? 'border-white/[0.06]' : 'border-slate-100'}`}>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className={`${labelCls} mb-1.5 block`}>身份验证</label>
                <LantuSelect
                  theme={theme}
                  value={formData.config.authType}
                  onChange={(v) => setFormData({ ...formData, config: { ...formData.config, authType: v } })}
                  options={authTypeOptions}
                  triggerClassName={INPUT_FOCUS}
                />
              </div>
              <div>
                <label className={`${labelCls} mb-1.5 block`}>响应超时 (�?</label>
                <input
                  type="number"
                  className={inputCls}
                  value={formData.config.timeout}
                  onChange={(e) => setFormData({ ...formData, config: { ...formData.config, timeout: parseInt(e.target.value) } })}
                />
              </div>
            </div>
          </div>
        </div>
      </BentoCard>

      {renderPreview()}

      {errors.submit && (
        <BentoCard theme={theme} padding="sm" className="!border-red-500/30">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="text-red-500 shrink-0" />
            <span className="text-xs text-red-500">{errors.submit}</span>
          </div>
        </BentoCard>
      )}

      <div className="flex justify-between pt-4">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            className={`${btnGhost(theme)} gap-2 ${showPreview ? 'text-neutral-800' : ''}`}
          >
            <Eye size={16} />
            {showPreview ? '隐藏预览' : '实时预览'}
          </button>
          <button type="button" onClick={() => setCurrentStep('TYPE_SELECT')} className={`${btnSecondary(theme)} inline-flex items-center gap-2`}>
            <ArrowLeft size={18} />
            上一�?          </button>
        </div>
        <button type="button" onClick={handleSubmit} disabled={createMut.isPending || updateMut.isPending} className={`${btnPrimary} px-10 disabled:opacity-50`}>
          {isEditMode ? '保存修改' : '提交创建'}
        </button>
      </div>
    </motion.div>
  );

  const renderSubmitting = () => (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        className="w-12 h-12 rounded-full border-4 border-neutral-900/20 border-t-neutral-900 mb-6"
      />
      <h3 className={`text-xl font-bold mb-2 ${textPrimary(theme)}`}>{isEditMode ? '正在保存修改' : '正在创建 Agent'}</h3>
      <p className={textSecondary(theme)}>{isEditMode ? '请稍候，正在保存您的修改...' : '请稍候，系统正在为您配置运行环境...'}</p>
    </div>
  );

  return (
    <div className={`flex-1 flex flex-col min-h-0 overflow-hidden ${canvasBodyBg(theme)}`}>
      <div className={`shrink-0 z-20 border-b px-4 sm:px-6 py-4 flex items-center gap-4 backdrop-blur-xl ${
        isDark ? 'border-white/[0.06] bg-[#0c0f17]/80' : 'border-slate-200/40 bg-white/80'
      }`}>
        <button type="button" onClick={onBack} className={btnGhost(theme)}>
          <ArrowLeft size={20} />
        </button>
        <h2 className={`text-lg font-bold ${textPrimary(theme)}`}>{isEditMode ? '编辑 Agent' : '创建�?Agent'}</h2>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-2 sm:px-3 lg:px-4 py-4 sm:py-6">
        <div className="w-full max-w-2xl mx-auto">
          {renderStepIndicator()}

          <GlassPanel theme={theme} padding="lg">
            <AnimatePresence mode="wait">
              {currentStep === 'TEMPLATE_SELECT' && renderTemplateSelect()}
              {currentStep === 'BASIC_INFO' && renderBasicInfo()}
              {currentStep === 'TYPE_SELECT' && renderTypeSelect()}
              {currentStep === 'TYPE_CONFIG' && renderTypeConfig()}
              {currentStep === 'SUBMITTING' && renderSubmitting()}
            </AnimatePresence>
          </GlassPanel>
        </div>
      </div>
    </div>
  );
};
