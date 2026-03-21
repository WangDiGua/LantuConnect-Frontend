import React, { useState } from 'react';
import { ArrowLeft, AlertCircle, Loader2 } from 'lucide-react';
import type { Theme, FontSize } from '../../types';
import type { DatasetCreatePayload, DatasetSourceType, DatasetDataType } from '../../types/dto/dataset';
import { datasetService } from '../../api/services/dataset.service';
import { nativeInputClass, nativeSelectClass } from '../../utils/formFieldClasses';

interface DatasetCreateProps {
  theme: Theme;
  fontSize: FontSize;
  onBack?: () => void;
  onSuccess?: (id: string) => void;
  showMessage?: (msg: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

export const DatasetCreate: React.FC<DatasetCreateProps> = ({ theme, onBack, onSuccess, showMessage }) => {
  const isDark = theme === 'dark';
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState<DatasetCreatePayload>({
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
  });
  const [tagsInput, setTagsInput] = useState('');

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!formData.datasetName.trim()) errs.datasetName = '请输入数据集标识';
    if (!formData.displayName.trim()) errs.displayName = '请输入显示名称';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const tags = tagsInput.split(/[,，]/).map(s => s.trim()).filter(Boolean);
      const ds = await datasetService.create({ ...formData, tags });
      showMessage?.('数据集注册成功', 'success');
      onSuccess?.(String(ds.id));
      onBack?.();
    } catch (err) {
      setErrors({ submit: err instanceof Error ? err.message : '创建失败，请重试' });
      showMessage?.('数据集注册失败', 'error');
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
        <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>注册数据集</h2>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-2 sm:px-3 lg:px-4 py-2 sm:py-3">
        <div className="w-full max-w-2xl mx-auto">
          <div className={`rounded-2xl border overflow-hidden shadow-none ${
            isDark ? 'bg-[#1C1C1E] border-white/10' : 'bg-white border-slate-200/80'
          }`}>
            <div className="p-6 sm:p-8 space-y-6">
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text font-bold">数据集标识 <span className="text-red-500">*</span></span>
                </label>
                <input
                  type="text"
                  placeholder="例如：student-records-2024"
                  className={`${nativeInputClass(theme)} ${errors.datasetName ? 'ring-1 ring-red-500' : ''}`}
                  value={formData.datasetName}
                  onChange={(e) => update('datasetName', e.target.value)}
                />
                {errors.datasetName && <span className="text-xs text-red-500 mt-1">{errors.datasetName}</span>}
              </div>

              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text font-bold">显示名称 <span className="text-red-500">*</span></span>
                </label>
                <input
                  type="text"
                  placeholder="例如：学生成绩数据集"
                  className={`${nativeInputClass(theme)} ${errors.displayName ? 'ring-1 ring-red-500' : ''}`}
                  value={formData.displayName}
                  onChange={(e) => update('displayName', e.target.value)}
                />
                {errors.displayName && <span className="text-xs text-red-500 mt-1">{errors.displayName}</span>}
              </div>

              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text font-bold">描述</span>
                </label>
                <textarea
                  className={`${nativeInputClass(theme)} h-24 resize-none`}
                  placeholder="描述数据集的内容、用途…"
                  value={formData.description}
                  onChange={(e) => update('description', e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="form-control w-full">
                  <label className="label">
                    <span className="label-text font-bold">来源类型</span>
                  </label>
                  <select
                    className={nativeSelectClass(theme)}
                    value={formData.sourceType}
                    onChange={(e) => update('sourceType', e.target.value as DatasetSourceType)}
                  >
                    <option value="department">部门数据</option>
                    <option value="knowledge">知识库</option>
                    <option value="third_party">第三方</option>
                  </select>
                </div>
                <div className="form-control w-full">
                  <label className="label">
                    <span className="label-text font-bold">数据类型</span>
                  </label>
                  <select
                    className={nativeSelectClass(theme)}
                    value={formData.dataType}
                    onChange={(e) => update('dataType', e.target.value as DatasetDataType)}
                  >
                    <option value="document">文档</option>
                    <option value="structured">结构化</option>
                    <option value="image">图片</option>
                    <option value="audio">音频</option>
                    <option value="video">视频</option>
                    <option value="mixed">混合</option>
                  </select>
                </div>
              </div>

              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text font-bold">格式</span>
                </label>
                <input
                  type="text"
                  placeholder="例如：csv, json, pdf, docx"
                  className={nativeInputClass(theme)}
                  value={formData.format}
                  onChange={(e) => update('format', e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="form-control w-full">
                  <label className="label">
                    <span className="label-text font-bold">记录数</span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    placeholder="0"
                    className={nativeInputClass(theme)}
                    value={formData.recordCount ?? 0}
                    onChange={(e) => update('recordCount', parseInt(e.target.value) || 0)}
                  />
                </div>
                <div className="form-control w-full">
                  <label className="label">
                    <span className="label-text font-bold">文件大小（字节）</span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    placeholder="0"
                    className={nativeInputClass(theme)}
                    value={formData.fileSize ?? 0}
                    onChange={(e) => update('fileSize', parseInt(e.target.value) || 0)}
                  />
                </div>
              </div>

              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text font-bold">标签</span>
                </label>
                <input
                  type="text"
                  placeholder="多个标签用逗号分隔，例如：教务,成绩,学生"
                  className={nativeInputClass(theme)}
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                />
                <span className={`text-xs mt-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                  多个标签用逗号分隔
                </span>
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
                  提交注册
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
