import React, { useState } from 'react';
import { ArrowLeft, AlertCircle, Loader2 } from 'lucide-react';
import type { Theme, FontSize } from '../../types';
import type { SmartApp, SmartAppCreatePayload, EmbedType } from '../../types/dto/smart-app';
import type { SourceType } from '../../types/dto/agent';
import { smartAppService } from '../../api/services/smart-app.service';
import { nativeInputClass, nativeSelectClass } from '../../utils/formFieldClasses';

interface AppCreateProps {
  theme: Theme;
  fontSize: FontSize;
  onBack?: () => void;
  onSuccess?: (id: string) => void;
  showMessage?: (msg: string, type: 'success' | 'error' | 'info' | 'warning') => void;
  editApp?: SmartApp;
}

export const AppCreate: React.FC<AppCreateProps> = ({ theme, onBack, onSuccess, showMessage, editApp }) => {
  const isDark = theme === 'dark';
  const isEditMode = !!editApp;
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState<SmartAppCreatePayload>(() => {
    if (editApp) {
      return {
        appName: editApp.appName,
        displayName: editApp.displayName,
        description: editApp.description,
        appUrl: editApp.appUrl,
        embedType: editApp.embedType,
        sourceType: editApp.sourceType as SourceType,
        icon: editApp.icon ?? '',
        isPublic: editApp.isPublic,
      };
    }
    return {
      appName: '',
      displayName: '',
      description: '',
      appUrl: '',
      embedType: 'iframe',
      sourceType: 'internal',
      icon: '',
      isPublic: false,
    };
  });

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!formData.appName.trim()) errs.appName = '请输入应用标识';
    if (!formData.displayName.trim()) errs.displayName = '请输入显示名称';
    if (!formData.appUrl.trim()) errs.appUrl = '请输入应用地址';
    else if (!/^https?:\/\/.+/.test(formData.appUrl)) errs.appUrl = '应用地址需以 http:// 或 https:// 开头';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const payload = { ...formData, icon: formData.icon || undefined };
      if (isEditMode && editApp) {
        await smartAppService.update(editApp.id, payload);
        showMessage?.('应用保存成功', 'success');
        onSuccess?.(String(editApp.id));
      } else {
        const app = await smartAppService.create(payload);
        showMessage?.('应用注册成功', 'success');
        onSuccess?.(String(app.id));
      }
      onBack?.();
    } catch (err) {
      setErrors({ submit: err instanceof Error ? err.message : (isEditMode ? '保存失败，请重试' : '创建失败，请重试') });
      showMessage?.(isEditMode ? '应用保存失败' : '应用注册失败', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const update = (key: string, value: unknown) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors(prev => { const n = { ...prev }; delete n[key]; return n; });
  };

  return (
    <div className={`flex-1 flex flex-col min-h-0 overflow-hidden ${isDark ? 'bg-[#000000]' : 'bg-[#F2F2F7]'}`}>
      <div className={`shrink-0 z-20 border-b px-4 sm:px-6 py-4 flex items-center gap-4 ${
        isDark ? 'border-white/10 bg-[#000000]' : 'border-slate-200/80 bg-[#F2F2F7]'
      }`}>
        <button type="button" onClick={onBack} className="btn btn-ghost btn-sm btn-circle">
          <ArrowLeft size={20} />
        </button>
        <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{isEditMode ? '编辑智能应用' : '注册智能应用'}</h2>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-2 sm:px-3 lg:px-4 py-2 sm:py-3">
        <div className="w-full max-w-2xl mx-auto">
          <div className={`rounded-2xl border overflow-hidden shadow-none ${
            isDark ? 'bg-[#1C1C1E] border-white/10' : 'bg-white border-slate-200/80'
          }`}>
            <div className="p-6 sm:p-8 space-y-6">
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text font-bold">应用标识 <span className="text-red-500">*</span></span>
                </label>
                <input
                  type="text"
                  placeholder="例如：course-schedule-app"
                  className={`${nativeInputClass(theme)} ${errors.appName ? 'ring-1 ring-red-500' : ''}`}
                  value={formData.appName}
                  onChange={(e) => update('appName', e.target.value)}
                />
                {errors.appName && <span className="text-xs text-red-500 mt-1">{errors.appName}</span>}
              </div>

              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text font-bold">显示名称 <span className="text-red-500">*</span></span>
                </label>
                <input
                  type="text"
                  placeholder="例如：课程表应用"
                  className={`${nativeInputClass(theme)} ${errors.displayName ? 'ring-1 ring-red-500' : ''}`}
                  value={formData.displayName}
                  onChange={(e) => update('displayName', e.target.value)}
                />
                {errors.displayName && <span className="text-xs text-red-500 mt-1">{errors.displayName}</span>}
              </div>

              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text font-bold">应用描述</span>
                </label>
                <textarea
                  className={`${nativeInputClass(theme)} h-24 resize-none`}
                  placeholder="描述该应用的功能和用途…"
                  value={formData.description}
                  onChange={(e) => update('description', e.target.value)}
                />
              </div>

              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text font-bold">应用地址 <span className="text-red-500">*</span></span>
                </label>
                <input
                  type="text"
                  placeholder="https://example.com/app"
                  className={`${nativeInputClass(theme)} ${errors.appUrl ? 'ring-1 ring-red-500' : ''}`}
                  value={formData.appUrl}
                  onChange={(e) => update('appUrl', e.target.value)}
                />
                <span className={`text-xs mt-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                  请输入完整的 URL，以 http:// 或 https:// 开头
                </span>
                {errors.appUrl && <span className="text-xs text-red-500 mt-1">{errors.appUrl}</span>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="form-control w-full">
                  <label className="label">
                    <span className="label-text font-bold">嵌入方式</span>
                  </label>
                  <select
                    className={nativeSelectClass(theme)}
                    value={formData.embedType}
                    onChange={(e) => update('embedType', e.target.value as EmbedType)}
                  >
                    <option value="iframe">iFrame 嵌入</option>
                    <option value="micro_frontend">微前端</option>
                    <option value="redirect">外链跳转</option>
                  </select>
                </div>
                <div className="form-control w-full">
                  <label className="label">
                    <span className="label-text font-bold">来源</span>
                  </label>
                  <select
                    className={nativeSelectClass(theme)}
                    value={formData.sourceType}
                    onChange={(e) => update('sourceType', e.target.value as SourceType)}
                  >
                    <option value="internal">自研</option>
                    <option value="partner">合作伙伴</option>
                  </select>
                </div>
              </div>

              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text font-bold">图标 URL</span>
                </label>
                <input
                  type="text"
                  placeholder="https://example.com/icon.png（可选）"
                  className={nativeInputClass(theme)}
                  value={formData.icon ?? ''}
                  onChange={(e) => update('icon', e.target.value)}
                />
              </div>

              <div className="form-control">
                <label className="label cursor-pointer justify-start gap-3">
                  <input
                    type="checkbox"
                    className="toggle toggle-primary toggle-sm"
                    checked={formData.isPublic ?? false}
                    onChange={(e) => update('isPublic', e.target.checked)}
                  />
                  <span className="label-text font-bold">是否公开</span>
                </label>
              </div>

              {errors.submit && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400">
                  <AlertCircle size={16} />
                  <span className="text-sm">{errors.submit}</span>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={onBack} className="btn btn-ghost rounded-xl">
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="btn btn-primary rounded-xl px-8 shadow-lg shadow-blue-500/20"
                >
                  {submitting && <Loader2 size={16} className="animate-spin mr-2" />}
                  {isEditMode ? '保存修改' : '提交注册'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
