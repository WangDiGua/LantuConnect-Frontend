import React, { useState } from 'react';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import type { Theme, FontSize } from '../../types';
import type { Provider, AuthType, ProviderType } from '../../types/dto/provider';
import { providerService } from '../../api/services/provider.service';
import { nativeInputClass, nativeSelectClass } from '../../utils/formFieldClasses';

interface Props {
  theme: Theme;
  fontSize: FontSize;
  onBack: () => void;
  onSuccess?: (id: string) => void;
  showMessage?: (msg: string, type: 'success' | 'error' | 'info' | 'warning') => void;
  editProvider?: Provider;
}

const PROVIDER_TYPE_OPTIONS: { value: ProviderType; label: string }[] = [
  { value: 'internal', label: '自研产品' },
  { value: 'partner', label: '合作伙伴' },
  { value: 'cloud', label: '云平台' },
];

const AUTH_TYPE_OPTIONS: { value: AuthType; label: string }[] = [
  { value: 'none', label: '无认证' },
  { value: 'api_key', label: 'API Key' },
  { value: 'oauth2', label: 'OAuth 2.0' },
  { value: 'basic', label: 'Basic Auth' },
];

export const ProviderCreate: React.FC<Props> = ({ theme, onBack, onSuccess, showMessage, editProvider }) => {
  const dark = theme === 'dark';
  const isEditMode = !!editProvider;

  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState(() => {
    if (editProvider) {
      const ac = (editProvider.authConfig ?? {}) as Record<string, string>;
      return {
        providerCode: editProvider.providerCode,
        providerName: editProvider.providerName,
        providerType: editProvider.providerType,
        description: editProvider.description ?? '',
        authType: editProvider.authType,
        authConfig: {
          api_key: ac.api_key ?? '',
          client_id: ac.client_id ?? '',
          client_secret: ac.client_secret ?? '',
          username: ac.username ?? '',
          password: ac.password ?? '',
        },
        baseUrl: editProvider.baseUrl ?? '',
      };
    }
    return {
      providerCode: '',
      providerName: '',
      providerType: 'internal' as ProviderType,
      description: '',
      authType: 'none' as AuthType,
      authConfig: {
        api_key: '',
        client_id: '',
        client_secret: '',
        username: '',
        password: '',
      },
      baseUrl: '',
    };
  });

  const setField = <K extends keyof typeof form>(key: K, val: (typeof form)[K]) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  const setAuthField = (key: string, val: string) =>
    setForm((prev) => ({
      ...prev,
      authConfig: { ...prev.authConfig, [key]: val },
    }));

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.providerCode.trim()) errs.providerCode = '请输入提供商编码';
    if (!form.providerName.trim()) errs.providerName = '请输入提供商名称';
    if (form.authType === 'api_key' && !form.authConfig.api_key.trim())
      errs.api_key = '请输入 API Key';
    if (form.authType === 'oauth2') {
      if (!form.authConfig.client_id.trim()) errs.client_id = '请输入 Client ID';
      if (!form.authConfig.client_secret.trim()) errs.client_secret = '请输入 Client Secret';
    }
    if (form.authType === 'basic') {
      if (!form.authConfig.username.trim()) errs.username = '请输入用户名';
      if (!form.authConfig.password.trim()) errs.password = '请输入密码';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      let authConfig: Record<string, unknown> | undefined;
      if (form.authType === 'api_key') authConfig = { api_key: form.authConfig.api_key };
      else if (form.authType === 'oauth2')
        authConfig = { client_id: form.authConfig.client_id, client_secret: form.authConfig.client_secret };
      else if (form.authType === 'basic')
        authConfig = { username: form.authConfig.username, password: form.authConfig.password };

      const payload = {
        providerCode: form.providerCode.trim(),
        providerName: form.providerName.trim(),
        providerType: form.providerType,
        description: form.description.trim() || undefined,
        authType: form.authType,
        authConfig,
        baseUrl: form.baseUrl.trim() || undefined,
      };

      if (isEditMode && editProvider) {
        await providerService.update(editProvider.id, payload);
        showMessage?.('保存成功', 'success');
        onSuccess?.(String(editProvider.id));
      } else {
        const result = await providerService.create(payload);
        showMessage?.('创建成功', 'success');
        onSuccess?.(String(result.id));
      }
      onBack();
    } catch (err) {
      const msg = err instanceof Error ? err.message : (isEditMode ? '保存失败' : '创建失败');
      setErrors({ submit: msg });
      showMessage?.(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls = nativeInputClass(theme);
  const selectCls = nativeSelectClass(theme);
  const labelCls = `block text-sm font-semibold mb-1.5 ${dark ? 'text-slate-200' : 'text-slate-700'}`;
  const errCls = 'text-xs text-red-500 mt-1';

  return (
    <div className={`flex-1 flex flex-col min-h-0 overflow-hidden ${dark ? 'bg-[#000000]' : 'bg-[#F2F2F7]'}`}>
      {/* Header */}
      <div className={`shrink-0 z-20 border-b px-4 sm:px-6 py-4 flex items-center gap-4 ${
        dark ? 'border-white/10 bg-[#000000]' : 'border-slate-200/80 bg-[#F2F2F7]'
      }`}>
        <button type="button" onClick={onBack} className="btn btn-ghost btn-sm btn-circle">
          <ArrowLeft size={20} />
        </button>
        <h2 className={`text-lg font-bold ${dark ? 'text-white' : 'text-slate-900'}`}>{isEditMode ? '编辑 Provider' : '添加 Provider'}</h2>
      </div>

      {/* Form body */}
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-2 sm:px-3 lg:px-4 py-2 sm:py-3">
        <div className="w-full max-w-2xl mx-auto">
          <div className={`rounded-2xl border overflow-hidden shadow-none ${
            dark ? 'bg-[#1C1C1E] border-white/10' : 'bg-white border-slate-200/80'
          }`}>
            <div className="p-6 sm:p-8 space-y-5">
              {/* providerCode */}
              <div>
                <label className={labelCls}>提供商编码 <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  placeholder="例如：openai, baidu_wenxin"
                  className={inputCls}
                  value={form.providerCode}
                  onChange={(e) => setField('providerCode', e.target.value)}
                />
                {errors.providerCode && <p className={errCls}>{errors.providerCode}</p>}
              </div>

              {/* providerName */}
              <div>
                <label className={labelCls}>提供商名称 <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  placeholder="例如：OpenAI"
                  className={inputCls}
                  value={form.providerName}
                  onChange={(e) => setField('providerName', e.target.value)}
                />
                {errors.providerName && <p className={errCls}>{errors.providerName}</p>}
              </div>

              {/* providerType */}
              <div>
                <label className={labelCls}>提供商类型</label>
                <select
                  className={selectCls}
                  value={form.providerType}
                  onChange={(e) => setField('providerType', e.target.value as ProviderType)}
                >
                  {PROVIDER_TYPE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              {/* description */}
              <div>
                <label className={labelCls}>描述</label>
                <textarea
                  placeholder="提供商说明信息…"
                  rows={3}
                  className={`${inputCls} resize-none`}
                  value={form.description}
                  onChange={(e) => setField('description', e.target.value)}
                />
              </div>

              {/* authType */}
              <div>
                <label className={labelCls}>认证方式</label>
                <select
                  className={selectCls}
                  value={form.authType}
                  onChange={(e) => setField('authType', e.target.value as AuthType)}
                >
                  {AUTH_TYPE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              {/* Conditional auth fields */}
              {form.authType === 'api_key' && (
                <div className={`p-4 rounded-xl border ${dark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                  <label className={labelCls}>API Key <span className="text-red-500">*</span></label>
                  <input
                    type="password"
                    placeholder="输入 API Key"
                    className={inputCls}
                    value={form.authConfig.api_key}
                    onChange={(e) => setAuthField('api_key', e.target.value)}
                  />
                  {errors.api_key && <p className={errCls}>{errors.api_key}</p>}
                </div>
              )}

              {form.authType === 'oauth2' && (
                <div className={`p-4 rounded-xl border space-y-4 ${dark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                  <div>
                    <label className={labelCls}>Client ID <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      placeholder="输入 Client ID"
                      className={inputCls}
                      value={form.authConfig.client_id}
                      onChange={(e) => setAuthField('client_id', e.target.value)}
                    />
                    {errors.client_id && <p className={errCls}>{errors.client_id}</p>}
                  </div>
                  <div>
                    <label className={labelCls}>Client Secret <span className="text-red-500">*</span></label>
                    <input
                      type="password"
                      placeholder="输入 Client Secret"
                      className={inputCls}
                      value={form.authConfig.client_secret}
                      onChange={(e) => setAuthField('client_secret', e.target.value)}
                    />
                    {errors.client_secret && <p className={errCls}>{errors.client_secret}</p>}
                  </div>
                </div>
              )}

              {form.authType === 'basic' && (
                <div className={`p-4 rounded-xl border space-y-4 ${dark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                  <div>
                    <label className={labelCls}>用户名 <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      placeholder="输入用户名"
                      className={inputCls}
                      value={form.authConfig.username}
                      onChange={(e) => setAuthField('username', e.target.value)}
                    />
                    {errors.username && <p className={errCls}>{errors.username}</p>}
                  </div>
                  <div>
                    <label className={labelCls}>密码 <span className="text-red-500">*</span></label>
                    <input
                      type="password"
                      placeholder="输入密码"
                      className={inputCls}
                      value={form.authConfig.password}
                      onChange={(e) => setAuthField('password', e.target.value)}
                    />
                    {errors.password && <p className={errCls}>{errors.password}</p>}
                  </div>
                </div>
              )}

              {/* baseUrl */}
              <div>
                <label className={labelCls}>服务地址</label>
                <input
                  type="text"
                  placeholder="https://api.example.com"
                  className={inputCls}
                  value={form.baseUrl}
                  onChange={(e) => setField('baseUrl', e.target.value)}
                />
              </div>

              {/* Submit error */}
              {errors.submit && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                  <AlertCircle size={16} className="text-red-500 shrink-0" />
                  <span className="text-sm text-red-500">{errors.submit}</span>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={onBack} className="btn btn-ghost rounded-xl">
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="btn btn-primary rounded-xl px-8 shadow-lg shadow-blue-500/20"
                >
                  {submitting ? <span className="loading loading-spinner loading-sm" /> : (isEditMode ? '保存修改' : '提交创建')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
