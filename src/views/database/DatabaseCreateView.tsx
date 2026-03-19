import React, { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Theme, FontSize, ThemeColor } from '../../types';
import { THEME_COLOR_CLASSES } from '../../constants/theme';
import type { DatabaseItem } from './types';
import { nativeSelectClass } from '../../utils/formFieldClasses';

interface Props {
  theme: Theme;
  fontSize: FontSize;
  themeColor: ThemeColor;
  onBack: () => void;
  onSubmit: (item: DatabaseItem) => void;
}

export const DatabaseCreateView: React.FC<Props> = ({ theme, fontSize, themeColor, onBack, onSubmit }) => {
  const isDark = theme === 'dark';
  const tc = THEME_COLOR_CLASSES[themeColor];
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [creationMethod, setCreationMethod] = useState('控制台创建');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const now = new Date().toISOString().slice(0, 16).replace('T', ' ');
    const id = `db_${Date.now().toString(36)}`;
    onSubmit({
      id,
      name: name.trim(),
      description: description.trim() || '—',
      creationMethod,
      createdAt: now,
      updatedAt: now,
    });
  };

  return (
    <div
      className={`flex-1 flex flex-col min-h-0 overflow-hidden ${
        isDark ? 'bg-[#000000]' : 'bg-[#F2F2F7]'
      }`}
    >
      <div className="w-full flex-1 min-h-0 flex flex-col px-2 sm:px-3 lg:px-4 py-2 sm:py-3">
        <div
          className={`rounded-2xl border overflow-hidden flex-1 min-h-0 flex flex-col shadow-none ${
            isDark ? 'bg-[#1C1C1E] border-white/10' : 'bg-white border-slate-200/80'
          }`}
        >
          <div
            className={`shrink-0 flex items-center gap-3 px-4 sm:px-6 py-3 border-b ${
              isDark ? 'border-white/10' : 'border-slate-200'
            }`}
          >
            <button type="button" onClick={onBack} className="btn btn-ghost btn-sm btn-circle shrink-0">
              <ArrowLeft size={20} />
            </button>
            <h1 className={`text-lg font-bold truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>创建数据库</h1>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
            <form onSubmit={handleSubmit} className="p-4 sm:px-8 sm:py-6 lg:px-10 lg:py-8 w-full max-w-6xl">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-10 gap-y-5">
                <div className="form-control w-full gap-1 lg:col-span-2">
                  <label className="label py-0">
                    <span className="label-text font-bold">数据库名称</span>
                  </label>
                  <input
                    className="input input-bordered w-full"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="例如：教务业务库"
                    maxLength={80}
                    required
                  />
                </div>
                <div className="form-control w-full gap-1 lg:col-span-2">
                  <label className="label py-0">
                    <span className="label-text font-bold">描述</span>
                  </label>
                  <textarea
                    className="textarea textarea-bordered min-h-[100px] w-full"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="说明数据用途、表结构规范或接入方式"
                  />
                </div>
                <div className="form-control w-full gap-1">
                  <label className="label py-0">
                    <span className="label-text font-bold">创建方式</span>
                  </label>
                  <select
                    className={nativeSelectClass(theme)}
                    value={creationMethod}
                    onChange={(e) => setCreationMethod(e.target.value)}
                  >
                    <option value="控制台创建">控制台创建</option>
                    <option value="API 导入">API 导入</option>
                    <option value="模板克隆">模板克隆</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-wrap justify-end gap-2 mt-10 pt-6 border-t border-dashed border-slate-200/80 dark:border-white/10">
                <button type="button" onClick={onBack} className="btn btn-ghost">
                  取消
                </button>
                <button type="submit" className={`btn text-white border-0 ${tc.bg} shadow-lg ${tc.shadow}`}>
                  创建
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
