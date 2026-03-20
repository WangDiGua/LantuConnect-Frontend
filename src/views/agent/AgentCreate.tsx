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
  Settings, 
  AlertCircle,
  Info
} from 'lucide-react';
import { Theme, FontSize } from '../../types';
import { nativeSelectClass } from '../../utils/formFieldClasses';

interface AgentCreateProps {
  theme: Theme;
  fontSize: FontSize;
  onBack: () => void;
  onSuccess: (agentId: string) => void;
}

type Step = 'BASIC_INFO' | 'TYPE_SELECT' | 'TYPE_CONFIG' | 'SUBMITTING';

export const AgentCreate: React.FC<AgentCreateProps> = ({ theme, fontSize, onBack, onSuccess }) => {
  const isDark = theme === 'dark';
  const [currentStep, setCurrentStep] = useState<Step>('BASIC_INFO');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'REST_API',
    config: {
      url: '',
      method: 'GET',
      authType: 'NONE',
      timeout: 30,
    }
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateBasicInfo = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = '请输入 Agent 名称';
    if (formData.name.length > 50) newErrors.name = '名称不能超过 50 个字符';
    if (!formData.description.trim()) newErrors.description = '请输入 Agent 描述';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateConfig = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.config.url.trim()) newErrors.url = '请输入接口地址';
    if (!formData.config.url.startsWith('http')) newErrors.url = '接口地址必须以 http:// 或 https:// 开头';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateConfig()) return;
    
    setIsSubmitting(true);
    setCurrentStep('SUBMITTING');
    
    // Mock API call
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      // Simulate success
      onSuccess('new-agent-id-123');
    } catch (err) {
      setIsSubmitting(false);
      setCurrentStep('TYPE_CONFIG');
      setErrors({ submit: '创建失败，请检查网络连接后重试。' });
    }
  };

  const renderStepIndicator = () => {
    const steps = [
      { id: 'BASIC_INFO', label: '基本信息' },
      { id: 'TYPE_SELECT', label: '类型选择' },
      { id: 'TYPE_CONFIG', label: '配置详情' }
    ];

    return (
      <div className="flex items-center justify-center gap-4 mb-10">
        {steps.map((step, index) => {
          const isActive = currentStep === step.id || (currentStep === 'SUBMITTING' && index === 2);
          const isCompleted = steps.findIndex(s => s.id === currentStep) > index || currentStep === 'SUBMITTING';
          
          return (
            <React.Fragment key={step.id}>
              <div className="flex flex-col items-center gap-2">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                  isCompleted ? 'bg-emerald-500 text-white' : 
                  isActive ? 'bg-blue-600 text-white ring-1 ring-blue-400/50' : 
                  'bg-slate-200 dark:bg-white/10 text-slate-500'
                }`}>
                  {isCompleted ? <Check size={20} /> : <span>{index + 1}</span>}
                </div>
                <span className={`text-xs font-bold ${isActive || isCompleted ? 'text-blue-600' : 'text-slate-400'}`}>
                  {step.label}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div className={`w-16 h-0.5 rounded-full transition-all duration-300 ${
                  isCompleted ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-white/10'
                }`} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    );
  };

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
          className={`input input-bordered w-full ${errors.name ? 'input-error' : ''}`}
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        />
        {errors.name && <label className="label"><span className="label-text-alt text-error">{errors.name}</span></label>}
      </div>

      <div className="form-control w-full">
        <label className="label">
          <span className="label-text font-bold">Agent 描述</span>
        </label>
        <textarea 
          className={`textarea textarea-bordered h-32 ${errors.description ? 'textarea-error' : ''}`} 
          placeholder="描述该 Agent 的功能、用途及核心逻辑..."
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        ></textarea>
        {errors.description && <label className="label"><span className="label-text-alt text-error">{errors.description}</span></label>}
      </div>

      <div className="flex justify-end pt-4">
        <button 
          type="button"
          onClick={() => validateBasicInfo() && setCurrentStep('TYPE_SELECT')}
          className="btn btn-primary px-8 gap-2 shadow-lg shadow-blue-500/20"
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
          <button type="button" onClick={() => setCurrentStep('BASIC_INFO')} className="btn btn-ghost gap-2">
            <ArrowLeft size={18} />
            上一步
          </button>
          <button type="button" onClick={() => setCurrentStep('TYPE_CONFIG')} className="btn btn-primary px-8 gap-2 shadow-lg shadow-blue-500/20">
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
            className={`input input-bordered join-item flex-1 rounded-l-none rounded-r-xl ${errors.url ? 'input-error' : ''}`}
            value={formData.config.url}
            onChange={(e) => setFormData({ ...formData, config: { ...formData.config, url: e.target.value } })}
          />
        </div>
        {errors.url && <label className="label"><span className="label-text-alt text-error">{errors.url}</span></label>}
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
            className="input input-bordered w-full"
            value={formData.config.timeout}
            onChange={(e) => setFormData({ ...formData, config: { ...formData.config, timeout: parseInt(e.target.value) } })}
          />
        </div>
      </div>

      {errors.submit && (
        <div className="alert alert-error py-2">
          <AlertCircle size={16} />
          <span className="text-xs">{errors.submit}</span>
        </div>
      )}

      <div className="flex justify-between pt-4">
        <button type="button" onClick={() => setCurrentStep('TYPE_SELECT')} className="btn btn-ghost gap-2">
          <ArrowLeft size={18} />
          上一步
        </button>
        <button type="button" onClick={handleSubmit} className="btn btn-primary px-10 shadow-lg shadow-blue-500/20">
          提交创建
        </button>
      </div>
    </motion.div>
  );

  const renderSubmitting = () => (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <span className="loading loading-spinner loading-lg text-primary mb-6"></span>
      <h3 className="text-xl font-bold mb-2">正在创建 Agent</h3>
      <p className="text-slate-500">请稍候，系统正在为您配置运行环境...</p>
    </div>
  );

  return (
    <div className={`flex-1 flex flex-col min-h-0 overflow-hidden ${
      isDark ? 'bg-[#000000]' : 'bg-[#F2F2F7]'
    }`}>
      {/* Header：与 Agent 列表一致的扁平顶栏 */}
      <div className={`shrink-0 z-20 border-b px-4 sm:px-6 py-4 flex items-center gap-4 ${
        isDark ? 'border-white/10 bg-[#000000]' : 'border-slate-200/80 bg-[#F2F2F7]'
      }`}>
        <button type="button" onClick={onBack} className="btn btn-ghost btn-sm btn-circle">
          <ArrowLeft size={20} />
        </button>
        <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>创建新 Agent</h2>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-2 sm:px-3 lg:px-4 py-2 sm:py-3">
        <div className="w-full max-w-2xl mx-auto">
          {renderStepIndicator()}
          
          <div className={`rounded-2xl border overflow-hidden shadow-none ${
            isDark ? 'bg-[#1C1C1E] border-white/10' : 'bg-white border-slate-200/80'
          }`}>
            <div className="p-6 sm:p-8">
              <AnimatePresence mode="wait">
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
