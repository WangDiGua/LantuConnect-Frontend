// @deprecated - This file is no longer used in the current routing. Replaced by unified resource management.
import React, { useState } from 'react';
import { ArrowLeft, AlertCircle, Loader2 } from 'lucide-react';
import type { Theme, FontSize } from '../../types';
import type { Dataset, DatasetCreatePayload, DatasetSourceType, DatasetDataType } from '../../types/dto/dataset';
import { datasetService } from '../../api/services/dataset.service';
import { nativeInputClass } from '../../utils/formFieldClasses';
import { LantuSelect } from '../../components/common/LantuSelect';
import { btnPrimary, btnSecondary, btnGhost, canvasBodyBg, textPrimary, textSecondary, textMuted } from '../../utils/uiClasses';
import { GlassPanel } from '../../components/common/GlassPanel';
import { BentoCard } from '../../components/common/BentoCard';

interface DatasetCreateProps {
  theme: Theme;
  fontSize: FontSize;
  onBack?: () => void;
  onSuccess?: (id: string) => void;
  showMessage?: (msg: string, type: 'success' | 'error' | 'info' | 'warning') => void;
  editDataset?: Dataset;
}

const INPUT_FOCUS = 'focus:ring-2 focus:ring-neutral-900/20 focus:border-neutral-900/35';

const DATASET_SOURCE_OPTIONS: { value: DatasetSourceType; label: string }[] = [
  { value: 'department', label: '部门数据' },
  { value: 'knowledge', label: '知识�? },
  { value: 'third_party', label: '第三�? },
];

const DATASET_DATA_TYPE_OPTIONS: { value: DatasetDataType; label: string }[] = [
  { value: 'document', label: '文档' },
  { value: 'structured', label: '结构�? },
  { value: 'image', label: '图片' },
  { value: 'audio', label: '音频' },
  { value: 'video', label: '视频' },
  { value: 'mixed', label: '混合' },
];

export const DatasetCreate: React.FC<DatasetCreateProps> = ({ theme, onBack, onSuccess, showMessage, editDataset }) => {
  const isDark = theme === 'dark';
  const isEditMode = !!editDataset;
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const labelCls = `text-sm font-medium ${textSecondary(theme)}`;
  const inputCls = `${nativeInputClass(theme)} ${INPUT_FOCUS}`;

  const [formData, setFormData] = useState<DatasetCreatePayload>(() => {
    if (editDataset) {
      return {
        datasetName: editDataset.datasetName,
        displayName: editDataset.displayName,
        description: editDataset.description,
        sourceType: editDataset.sourceType,
        dataType: editDataset.dataType,
        format: editDataset.format,
        recordCount: editDataset.recordCount,
        fileSize: editDataset.fileSize,
        tags: editDataset.tags,
        isPublic: editDataset.isPublic,
      };
    }
    return {
      datasetName: '',
      displayName: '',
      description: '',
      sourceType: 'department',
      dataType: 'document',
      format: '',
      recordCount: 0,
      fileSize: 0,
      tags: [],
      isPublic: false,
    };
  });
  const [tagsInput, setTagsInput] = useState(editDataset?.tags?.join(', ') ?? '');

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!formData.datasetName.trim()) errs.datasetName = '请输入数据集标识';
    if (!formData.displayName.trim()) errs.displayName = '请输入显示名�?;
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const tags = tagsInput.split(/[,，]/).map(s => s.trim()).filter(Boolean);
      const payload = { ...formData, tags };
      if (isEditMode && editDataset) {
        await datasetService.update(editDataset.id, payload);
        showMessage?.('数据集保存成�?, 'success');
        onSuccess?.(String(editDataset.id));
      } else {
        const ds = await datasetService.create(payload);
        showMessage?.('数据集注册成�?, 'success');
        onSuccess?.(String(ds.id));
      }
      onBack?.();
    } catch (err) {
      setErrors({ submit: err instanceof Error ? err.message : (isEditMode ? '保存失败，请重试' : '创建失败，请重试') });
      showMessage?.(isEditMode ? '数据集保存失�? : '数据集注册失�?, 'error');
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
        <h2 className={`text-lg font-bold ${textPrimary(theme)}`}>{isEditMode ? '编辑数据�? : '注册数据�?}</h2>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-2 sm:px-3 lg:px-4 py-4 sm:py-6">
        <div className="w-full max-w-2xl mx-auto">
          <GlassPanel theme={theme} padding="lg">
            <div className="space-y-6">
              <BentoCard theme={theme} padding="md">
                <div className="space-y-5">
                  <div>
                    <label className={`${labelCls} mb-1.5 block`}>数据集标�?<span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      placeholder="例如：student-records-2024"
                      className={`${inputCls} ${errors.datasetName ? '!border-red-500 !ring-red-500/20' : ''}`}
                      value={formData.datasetName}
                      onChange={(e) => update('datasetName', e.target.value)}
                    />
                    {errors.datasetName && <span className="text-xs text-red-500 mt-1 block">{errors.datasetName}</span>}
                  </div>

                  <div>
                    <label className={`${labelCls} mb-1.5 block`}>显示名称 <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      placeholder="例如：学生成绩数据集"
                      className={`${inputCls} ${errors.displayName ? '!border-red-500 !ring-red-500/20' : ''}`}
                      value={formData.displayName}
                      onChange={(e) => update('displayName', e.target.value)}
                    />
                    {errors.displayName && <span className="text-xs text-red-500 mt-1 block">{errors.displayName}</span>}
                  </div>

                  <div>
                    <label className={`${labelCls} mb-1.5 block`}>描述</label>
                    <textarea
                      className={`${inputCls} h-24 resize-none`}
                      placeholder="描述数据集的内容、用途�?
                      value={formData.description}
                      onChange={(e) => update('description', e.target.value)}
                    />
                  </div>
                </div>
              </BentoCard>

              <BentoCard theme={theme} padding="md">
                <div className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label className={`${labelCls} mb-1.5 block`}>来源类型</label>
                      <LantuSelect
                        theme={theme}
                        triggerClassName={INPUT_FOCUS}
                        value={formData.sourceType}
                        onChange={(v) => update('sourceType', v as DatasetSourceType)}
                        options={DATASET_SOURCE_OPTIONS}
                      />
                    </div>
                    <div>
                      <label className={`${labelCls} mb-1.5 block`}>数据类型</label>
                      <LantuSelect
                        theme={theme}
                        triggerClassName={INPUT_FOCUS}
                        value={formData.dataType}
                        onChange={(v) => update('dataType', v as DatasetDataType)}
                        options={DATASET_DATA_TYPE_OPTIONS}
                      />
                    </div>
                  </div>

                  <div className={`border-t pt-5 ${isDark ? 'border-white/[0.06]' : 'border-slate-100'}`}>
                    <label className={`${labelCls} mb-1.5 block`}>格式</label>
                    <input
                      type="text"
                      placeholder="例如：csv, json, pdf, docx"
                      className={inputCls}
                      value={formData.format}
                      onChange={(e) => update('format', e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label className={`${labelCls} mb-1.5 block`}>记录�?/label>
                      <input type="number" min={0} placeholder="0" className={inputCls} value={formData.recordCount ?? 0} onChange={(e) => update('recordCount', parseInt(e.target.value) || 0)} />
                    </div>
                    <div>
                      <label className={`${labelCls} mb-1.5 block`}>文件大小（字节）</label>
                      <input type="number" min={0} placeholder="0" className={inputCls} value={formData.fileSize ?? 0} onChange={(e) => update('fileSize', parseInt(e.target.value) || 0)} />
                    </div>
                  </div>
                </div>
              </BentoCard>

              <BentoCard theme={theme} padding="md">
                <div className="space-y-5">
                  <div>
                    <label className={`${labelCls} mb-1.5 block`}>标签</label>
                    <input
                      type="text"
                      placeholder="多个标签用逗号分隔，例如：教务,成绩,学生"
                      className={inputCls}
                      value={tagsInput}
                      onChange={(e) => setTagsInput(e.target.value)}
                    />
                    <span className={`text-xs mt-1 block ${textMuted(theme)}`}>多个标签用逗号分隔</span>
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
