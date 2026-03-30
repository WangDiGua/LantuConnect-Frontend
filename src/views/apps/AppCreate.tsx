// @deprecated - This file is no longer used in the current routing. Replaced by unified resource management.
import React, { useState } from 'react';
import { ArrowLeft, AlertCircle, Loader2 } from 'lucide-react';
import type { Theme, FontSize } from '../../types';
import type { SmartApp, SmartAppCreatePayload, EmbedType } from '../../types/dto/smart-app';
import type { SourceType } from '../../types/dto/agent';
import { smartAppService } from '../../api/services/smart-app.service';
import { nativeInputClass } from '../../utils/formFieldClasses';
import { LantuSelect } from '../../components/common/LantuSelect';
import { btnPrimary, btnSecondary, btnGhost, canvasBodyBg, textPrimary, textSecondary, textMuted } from '../../utils/uiClasses';
import { GlassPanel } from '../../components/common/GlassPanel';
import { BentoCard } from '../../components/common/BentoCard';

interface AppCreateProps {
  theme: Theme;
  fontSize: FontSize;
  onBack?: () => void;
  onSuccess?: (id: string) => void;
  showMessage?: (msg: string, type: 'success' | 'error' | 'info' | 'warning') => void;
  editApp?: SmartApp;
}

const INPUT_FOCUS = 'focus:ring-2 focus:ring-neutral-900/20 focus:border-neutral-900/35';

const APP_EMBED_OPTIONS: { value: EmbedType; label: string }[] = [
  { value: 'iframe', label: 'iFrame 嵌入' },
  { value: 'micro_frontend', label: '微前�? },
  { value: 'redirect', label: '外链跳转' },
];

const APP_SOURCE_OPTIONS: { value: SourceType; label: string }[] = [
  { value: 'internal', label: '自研' },
  { value: 'partner', label: '合作伙伴' },
];

export const AppCreate: React.FC<AppCreateProps> = ({ theme, onBack, onSuccess, showMessage, editApp }) => {
  const isDark = theme === 'dark';
  const isEditMode = !!editApp;
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const labelCls = `text-sm font-medium ${textSecondary(theme)}`;
  const inputCls = `${nativeInputClass(theme)} ${INPUT_FOCUS}`;

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
    if (!formData.appName.trim()) errs.appName = '请输入应用标�?;
    if (!formData.displayName.trim()) errs.displayName = '请输入显示名�?;
    if (!formData.appUrl.trim()) errs.appUrl = '请输入应用地址';
    else if (!/^https?:\/\/.+/.test(formData.appUrl)) errs.appUrl = '应用地址需�?http:// �?https:// 开�?;
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
    <div className={`flex-1 flex flex-col min-h-0 overflow-hidden ${canvasBodyBg(theme)}`}>
      <div className={`shrink-0 z-20 border-b px-4 sm:px-6 py-4 flex items-center gap-4 backdrop-blur-xl ${
        isDark ? 'border-white/[0.06] bg-[#0c0f17]/80' : 'border-slate-200/40 bg-white/80'
      }`}>
        <button type="button" onClick={onBack} className={btnGhost(theme)}>
          <ArrowLeft size={20} />
        </button>
        <h2 className={`text-lg font-bold ${textPrimary(theme)}`}>{isEditMode ? '编辑智能应用' : '注册智能应用'}</h2>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-2 sm:px-3 lg:px-4 py-4 sm:py-6">
        <div className="w-full max-w-2xl mx-auto">
          <GlassPanel theme={theme} padding="lg">
            <div className="space-y-6">
              <BentoCard theme={theme} padding="md">
                <div className="space-y-5">
                  <div>
                    <label className={`${labelCls} mb-1.5 block`}>应用标识 <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      placeholder="例如：course-schedule-app"
                      className={`${inputCls} ${errors.appName ? '!border-red-500 !ring-red-500/20' : ''}`}
                      value={formData.appName}
                      onChange={(e) => update('appName', e.target.value)}
                    />
                    {errors.appName && <span className="text-xs text-red-500 mt-1 block">{errors.appName}</span>}
                  </div>

                  <div>
                    <label className={`${labelCls} mb-1.5 block`}>显示名称 <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      placeholder="例如：课程表应用"
                      className={`${inputCls} ${errors.displayName ? '!border-red-500 !ring-red-500/20' : ''}`}
                      value={formData.displayName}
                      onChange={(e) => update('displayName', e.target.value)}
                    />
                    {errors.displayName && <span className="text-xs text-red-500 mt-1 block">{errors.displayName}</span>}
                  </div>

                  <div>
                    <label className={`${labelCls} mb-1.5 block`}>应用描述</label>
                    <textarea
                      className={`${inputCls} h-24 resize-none`}
                      placeholder="描述该应用的功能和用途�?
                      value={formData.description}
                      onChange={(e) => update('description', e.target.value)}
                    />
                  </div>
                </div>
              </BentoCard>

              <BentoCard theme={theme} padding="md">
                <div className="space-y-5">
                  <div>
                    <label className={`${labelCls} mb-1.5 block`}>应用地址 <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      placeholder="https://example.com/app"
                      className={`${inputCls} ${errors.appUrl ? '!border-red-500 !ring-red-500/20' : ''}`}
                      value={formData.appUrl}
                      onChange={(e) => update('appUrl', e.target.value)}
                    />
                    <span className={`text-xs mt-1 block ${textMuted(theme)}`}>请输入完整的 URL，以 http:// �?https:// 开�?/span>
                    {errors.appUrl && <span className="text-xs text-red-500 mt-1 block">{errors.appUrl}</span>}
                  </div>

                  <div className={`border-t pt-5 ${isDark ? 'border-white/[0.06]' : 'border-slate-100'}`}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div>
                        <label className={`${labelCls} mb-1.5 block`}>嵌入方式</label>
                        <LantuSelect
                          theme={theme}
                          triggerClassName={INPUT_FOCUS}
                          value={formData.embedType}
                          onChange={(v) => update('embedType', v as EmbedType)}
                          options={APP_EMBED_OPTIONS}
                        />
                      </div>
                      <div>
                        <label className={`${labelCls} mb-1.5 block`}>来源</label>
                        <LantuSelect
                          theme={theme}
                          triggerClassName={INPUT_FOCUS}
                          value={formData.sourceType}
                          onChange={(v) => update('sourceType', v as SourceType)}
                          options={APP_SOURCE_OPTIONS}
                        />
                      </div>
                    </div>
                  </div>

                  <div className={`border-t pt-5 ${isDark ? 'border-white/[0.06]' : 'border-slate-100'}`}>
                    <label className={`${labelCls} mb-1.5 block`}>图标 URL</label>
                    <input
                      type="text"
                      placeholder="https://example.com/icon.png（可选）"
                      className={inputCls}
                      value={formData.icon ?? ''}
                      onChange={(e) => update('icon', e.target.value)}
                    />
                  </div>

                  <div className={`border-t pt-5 ${isDark ? 'border-white/[0.06]' : 'border-slate-100'}`}>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        className="toggle toggle-primary toggle-sm"
                        checked={formData.isPublic ?? false}
                        onChange={(e) => update('isPublic', e.target.checked)}
                      />
                      <span className={labelCls}>是否公开</span>
                    </label>
                  </div>
                </div>
              </BentoCard>

              {errors.submit && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                  <AlertCircle size={16} className="text-red-500 shrink-0" />
                  <span className="text-sm text-red-500">{errors.submit}</span>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={onBack} className={btnSecondary(theme)}>取消</button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting}
                  className={`${btnPrimary} px-8 disabled:opacity-50`}
                >
                  {submitting && <Loader2 size={16} className="animate-spin mr-2" />}
                  {isEditMode ? '保存修改' : '提交注册'}
                </button>
              </div>
            </div>
          </GlassPanel>
        </div>
      </div>
    </div>
  );
};
