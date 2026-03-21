import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  ArrowRight, 
  Check, 
  Zap, 
  Activity, 
  FileText, 
  Webhook, 
  Settings, 
  AlertCircle,
  Info,
  Eye,
  Sparkles,
  Rocket,
  MessageSquare
} from 'lucide-react';
import { Theme, FontSize, ThemeColor } from '../../types';
import type { Agent, AgentType } from '../../types/dto/agent';
import { nativeSelectClass, nativeInputClass } from '../../utils/formFieldClasses';
import { btnPrimary, btnSecondary } from '../../utils/uiClasses';
import { useCreateAgent, useUpdateAgent } from '../../hooks/queries/useAgent';
import { z } from 'zod';
import { ProgressBar } from '../../components/common/ProgressBar';
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
    description: '接收外部事件推送',
    icon: Webhook,
    category: '集成',
    preset: { type: 'WEBHOOK', config: { method: 'POST', authType: 'API_KEY', timeout: 60 } },
  },
];

const QUICK_PRESETS = [
  { label: '快速配置', config: { method: 'GET', authType: 'NONE', timeout: 30 } },
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
  name: z.string().min(1, '请输入 Agent 名称').max(50, '名称不能超过 50 个字符'),
  description: z.string().min(1, '请输入 Agent 描述'),
});

const configSchema = z.object({
  url: z.string().min(1, '请输入接口地址').url('接口地址必须以 http:// 或 https:// 开头'),
});

export const AgentCreate: React.FC<AgentCreateProps> = ({ theme, fontSize, themeColor = 'blue', onBack, onSuccess, editAgent }) => {
  const isDark = theme === 'dark';
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

  // 应用模板
  const applyTemplate = (template: AgentTemplate) => {
    setSelectedTemplate(template.id);
    setFormData({
      ...formData,
      type: template.preset.type,
      config: { ...formData.config, ...template.preset.config },
    });
    setCurrentStep('BASIC_INFO');
  };

  // 应用快速配置
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
      setErrors({ submit: err instanceof Error ? err.message : (isEditMode ? '保存失败，请检查网络连接后重试。' : '创建失败，请检查网络连接后重试。') });
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
      { id: 'TYPE_CONFIG', label: '配置详情' }
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
            const isSkipped = step.optional && selectedTemplate && index === 0;
            
            return (
              <React.Fragment key={step.id}>
                <div className="flex flex-col items-center gap-2">
                  <motion.div 
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                      isCompleted ? 'bg-emerald-500 text-white' : 
                      isActive ? `${tc.bg} text-white ring-2 ${tc.ring}` : 
                      isSkipped ? 'bg-slate-300 dark:bg-white/20 text-slate-500' :
                      'bg-slate-200 dark:bg-white/10 text-slate-500'
                    }`}
                    whileHover={!isActive && !isCompleted ? { scale: 1.1 } : {}}
                  >
                    {isCompleted ? <Check size={20} /> : isSkipped ? <Check size={20} className="opacity-50" /> : <span>{index + 1}</span>}
                  </motion.div>
                  <span className={`text-xs font-bold text-center max-w-[80px] ${isActive || isCompleted ? tc.text : 'text-slate-400'}`}>
                    {step.label}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <motion.div 
                    className={`w-16 h-0.5 rounded-full transition-all duration-300 ${
                      isCompleted ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-white/10'
                    }`}
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

  // 实时预览
  const renderPreview = () => {
    if (!showPreview) return null;
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`mt-6 p-4 rounded-xl border ${
          isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'
        }`}
      >
        <div className="flex items-center gap-2 mb-3">
          <Eye size={16} className={tc.text} />
          <span className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>实时预览</span>
        </div>
        <div className="space-y-2 text-xs">
          <div className="flex justify-between">
            <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>名称：</span>
            <span className={isDark ? 'text-white' : 'text-slate-900'}>{formData.name || '未填写'}</span>
          </div>
          <div className="flex justify-between">
            <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>类型：</span>
            <span className={isDark ? 'text-white' : 'text-slate-900'}>{formData.type}</span>
          </div>
          <div className="flex justify-between">
            <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>方法：</span>
            <span className={isDark ? 'text-white' : 'text-slate-900'}>{formData.config.method}</span>
          </div>
          <div className="flex justify-between">
            <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>认证：</span>
            <span className={isDark ? 'text-white' : 'text-slate-900'}>{formData.config.authType}</span>
          </div>
        </div>
      </motion.div>
    );
  };

  // 模板选择
  const renderTemplateSelect = () => (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="text-center mb-6">
        <h3 className={`text-lg font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>选择创建方式</h3>
        <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
          从模板快速开始，或选择空白创建
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        {AGENT_TEMPLATES.map((template) => (
          <motion.div
            key={template.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => applyTemplate(template)}
            className={`p-4 rounded-2xl border cursor-pointer transition-colors shadow-none ${
              selectedTemplate === template.id
                ? `border-${themeColor}-600 bg-${themeColor}-50 dark:bg-${themeColor}-500/10`
                : isDark
                  ? 'border-white/10 bg-[#1C1C1E]/30 hover:border-white/20'
                  : 'border-slate-200/80 bg-white hover:border-slate-300'
            }`}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className={`p-2 rounded-xl ${selectedTemplate === template.id ? tc.bg + ' text-white' : 'bg-slate-100 dark:bg-white/10 text-slate-500'}`}>
                <template.icon size={20} />
              </div>
              <div className="flex-1">
                <span className="font-bold">{template.name}</span>
                <span className={`ml-2 text-xs px-2 py-0.5 rounded-lg ${
                  isDark ? 'bg-white/10 text-slate-400' : 'bg-slate-100 text-slate-600'
                }`}>
                  {template.category}
                </span>
              </div>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">{template.description}</p>
          </motion.div>
        ))}
      </div>

      <div className="flex justify-end pt-4">
        <button 
          type="button"
          onClick={() => setCurrentStep('BASIC_INFO')}
          className={`${btnPrimary} px-8 inline-flex items-center gap-2`}
        >
          跳过模板，直接创建
          <ArrowRight size={18} />
        </button>
      </div>
    </motion.div>
  );

  const renderBasicInfo = () => (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="form-control w-full">
        <label className="label">
          <span className="label-text font-bold">Agent 名称</span>
          <span className="label-text-alt text-slate-400">{formData.name.length}/50</span>
        </label>
        <input 
          type="text" 
          placeholder="例如：学生办事助手" 
          className={`${nativeInputClass(theme)} ${errors.name ? '!border-red-500' : ''}`}
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        />
        {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
      </div>

      <div className="form-control w-full">
        <label className="label">
          <span className="label-text font-bold">Agent 描述</span>
        </label>
        <textarea 
          className={`${nativeInputClass(theme)} !min-h-[8rem] resize-y ${errors.description ? '!border-red-500' : ''}`} 
          placeholder="描述该 Agent 的功能、用途及核心逻辑..."
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        />
        {errors.description && <p className="text-xs text-red-500 mt-1">{errors.description}</p>}
      </div>

      {renderPreview()}

      <div className="flex justify-between pt-4">
        <button 
          type="button"
          onClick={() => setShowPreview(!showPreview)}
          className={`btn btn-ghost gap-2 ${showPreview ? tc.text : ''}`}
        >
          <Eye size={16} />
          {showPreview ? '隐藏预览' : '实时预览'}
        </button>
        <button 
          type="button"
          onClick={() => validateBasicInfo() && setCurrentStep('TYPE_SELECT')}
          className={`${btnPrimary} px-8 inline-flex items-center gap-2`}
        >
          下一步
          <ArrowRight size={18} />
        </button>
      </div>
    </motion.div>
  );

  const renderTypeSelect = () => {
    const types = [
      { id: 'REST_API', label: 'REST API', icon: Zap, desc: '标准的 HTTP/HTTPS 接口调用' },
      { id: 'MCP', label: 'MCP 协议', icon: Activity, desc: '基于 Model Context Protocol 的高性能通信' },
      { id: 'OPENAPI', label: 'OpenAPI', icon: FileText, desc: '导入 Swagger/OpenAPI 规范文档' },
      { id: 'WEBHOOK', label: 'Webhook', icon: Webhook, desc: '接收外部事件推送的回调接口' }
    ];

    return (
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="space-y-6"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {types.map((type) => (
            <div 
              key={type.id}
              role="button"
              tabIndex={0}
              onClick={() => setFormData({ ...formData, type: type.id })}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setFormData({ ...formData, type: type.id }); } }}
              className={`p-4 rounded-2xl border cursor-pointer transition-colors shadow-none ${
                formData.type === type.id
                  ? 'border-blue-600 bg-blue-50 dark:bg-blue-500/10'
                  : isDark
                    ? 'border-white/10 bg-[#1C1C1E]/30 hover:border-white/20'
                    : 'border-slate-200/80 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className={`p-2 rounded-xl ${formData.type === type.id ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-white/10 text-slate-500'}`}>
                  <type.icon size={20} />
                </div>
                <span className="font-bold">{type.label}</span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">{type.desc}</p>
            </div>
          ))}
        </div>

        <div className="flex justify-between pt-4">
          <button type="button" onClick={() => setCurrentStep('BASIC_INFO')} className={`${btnSecondary(theme)} inline-flex items-center gap-2`}>
            <ArrowLeft size={18} />
            上一步
          </button>
          <button type="button" onClick={() => setCurrentStep('TYPE_CONFIG')} className={`${btnPrimary} px-8 inline-flex items-center gap-2`}>
            下一步
            <ArrowRight size={18} />
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
      className="space-y-6"
    >
      <div className="alert alert-info bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20 text-blue-700 dark:text-blue-300 py-3">
        <Info size={18} />
        <span className="text-xs">您正在为 <strong>{formData.type}</strong> 类型配置接口详情。</span>
      </div>

      {/* 快速配置选项 */}
      <div className={`p-4 rounded-xl border ${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'}`}>
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={16} className={tc.text} />
          <span className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>快速配置</span>
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
      </div>

      <div className="form-control w-full">
        <label className="label">
          <span className="label-text font-bold">接口地址 (URL)</span>
        </label>
        <div className="join w-full">
          <select
            className={`${nativeSelectClass(theme)} join-item w-32 shrink-0 rounded-l-xl rounded-r-none border-r-0`}
            value={formData.config.method}
            onChange={(e) => setFormData({ ...formData, config: { ...formData.config, method: e.target.value } })}
          >
            <option>GET</option>
            <option>POST</option>
            <option>PUT</option>
            <option>DELETE</option>
          </select>
          <input
            type="text"
            placeholder="https://api.example.com/v1/..."
            className={`${nativeInputClass(theme)} join-item flex-1 !rounded-l-none !rounded-r-xl ${errors.url ? '!border-red-500' : ''}`}
            value={formData.config.url}
            onChange={(e) => setFormData({ ...formData, config: { ...formData.config, url: e.target.value } })}
          />
        </div>
        {errors.url && <p className="text-xs text-red-500 mt-1">{errors.url}</p>}
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="form-control w-full">
          <label className="label">
            <span className="label-text font-bold">身份验证</span>
          </label>
          <select
            className={nativeSelectClass(theme)}
            value={formData.config.authType}
            onChange={(e) => setFormData({ ...formData, config: { ...formData.config, authType: e.target.value } })}
          >
            <option value="NONE">无验证</option>
            <option value="BEARER">Bearer Token</option>
            <option value="API_KEY">API Key</option>
            <option value="BASIC">Basic Auth</option>
          </select>
        </div>
        <div className="form-control w-full">
          <label className="label">
            <span className="label-text font-bold">响应超时 (秒)</span>
          </label>
          <input 
            type="number" 
            className={nativeInputClass(theme)}
            value={formData.config.timeout}
            onChange={(e) => setFormData({ ...formData, config: { ...formData.config, timeout: parseInt(e.target.value) } })}
          />
        </div>
      </div>

      {renderPreview()}

      {errors.submit && (
        <div className="alert alert-error py-2">
          <AlertCircle size={16} />
          <span className="text-xs">{errors.submit}</span>
        </div>
      )}

      <div className="flex justify-between pt-4">
        <div className="flex gap-2">
          <button 
            type="button" 
            onClick={() => setShowPreview(!showPreview)}
            className={`btn btn-ghost gap-2 ${showPreview ? tc.text : ''}`}
          >
            <Eye size={16} />
            {showPreview ? '隐藏预览' : '实时预览'}
          </button>
          <button type="button" onClick={() => setCurrentStep('TYPE_SELECT')} className={`${btnSecondary(theme)} inline-flex items-center gap-2`}>
            <ArrowLeft size={18} />
            上一步
          </button>
        </div>
        <button type="button" onClick={handleSubmit} disabled={createMut.isPending || updateMut.isPending} className={`${btnPrimary} px-10 disabled:opacity-50`}>
          {isEditMode ? '保存修改' : '提交创建'}
        </button>
      </div>
    </motion.div>
  );

  const renderSubmitting = () => (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <span className="loading loading-spinner loading-lg text-primary mb-6"></span>
      <h3 className="text-xl font-bold mb-2">{isEditMode ? '正在保存修改' : '正在创建 Agent'}</h3>
      <p className="text-slate-500">{isEditMode ? '请稍候，正在保存您的修改...' : '请稍候，系统正在为您配置运行环境...'}</p>
    </div>
  );

  return (
    <div className={`flex-1 flex flex-col min-h-0 overflow-hidden ${
      isDark ? 'bg-[#000000]' : 'bg-[#F2F2F7]'
    }`}>
      <div className={`shrink-0 z-20 border-b px-4 sm:px-6 py-4 flex items-center gap-4 ${
        isDark ? 'border-white/10 bg-[#000000]' : 'border-slate-200/80 bg-[#F2F2F7]'
      }`}>
        <button type="button" onClick={onBack} className="btn btn-ghost btn-sm btn-circle">
          <ArrowLeft size={20} />
        </button>
        <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{isEditMode ? '编辑 Agent' : '创建新 Agent'}</h2>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-2 sm:px-3 lg:px-4 py-2 sm:py-3">
        <div className="w-full max-w-2xl mx-auto">
          {renderStepIndicator()}
          
          <div className={`rounded-2xl border overflow-hidden shadow-none ${
            isDark ? 'bg-[#1C1C1E] border-white/10' : 'bg-white border-slate-200/80'
          }`}>
            <div className="p-6 sm:p-8">
              <AnimatePresence mode="wait">
                {currentStep === 'TEMPLATE_SELECT' && renderTemplateSelect()}
                {currentStep === 'BASIC_INFO' && renderBasicInfo()}
                {currentStep === 'TYPE_SELECT' && renderTypeSelect()}
                {currentStep === 'TYPE_CONFIG' && renderTypeConfig()}
                {currentStep === 'SUBMITTING' && renderSubmitting()}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
