import React, { useCallback, useEffect, useState } from 'react';
import { ArrowRight, Plus, RefreshCw, Server } from 'lucide-react';
import type { Theme, FontSize } from '../../types';
import { providerService } from '../../api/services/provider.service';
import type { ProviderType, AuthType } from '../../types/dto/provider';
import { PageError } from '../../components/common/PageError';
import { PageSkeleton } from '../../components/common/PageSkeleton';
import { EmptyState } from '../../components/common/EmptyState';
import { FilterSelect, SearchInput, Pagination } from '../../components/common';
import { nativeInputClass } from '../../utils/formFieldClasses';
import {
  bentoCard,
  btnGhost,
  btnPrimary,
  btnSecondary,
  fieldErrorText,
  inputBaseError,
  textMuted,
  textPrimary,
  textSecondary,
} from '../../utils/uiClasses';
import { MgmtPageShell } from '../userMgmt/MgmtPageShell';
import { formatDateTime } from '../../utils/formatDateTime';
import { providerStatusLabelZh, providerTypeLabelZh } from '../../utils/backendEnumLabels';
import { AutoHeightTextarea } from '../../components/common/AutoHeightTextarea';
import { useScrollPaginatedContentToTop } from '../../hooks/useScrollPaginatedContentToTop';

interface Props {
  theme: Theme;
  fontSize: FontSize;
  mode: 'list' | 'create';
  showMessage: (msg: string, type: 'success' | 'error' | 'info' | 'warning') => void;
  onOpenGrantManagement: () => void;
}

const TYPE_OPTIONS: Array<{ value: '' | ProviderType; label: string }> = [
  { value: '', label: '全部类型' },
  { value: 'internal', label: '内部' },
  { value: 'partner', label: '合作方' },
  { value: 'cloud', label: '云服务' },
];

const LIST_DESC = '仅维护 Provider 元数据，授权关系请走资源授权管理。';
const CREATE_DESC = 'Provider 页面只维护元数据；资源授权请在「资源授权管理」中执行。';

export const ProviderManagementPage: React.FC<Props> = ({
  theme,
  fontSize,
  mode,
  showMessage,
  onOpenGrantManagement,
}) => {
  const isDark = theme === 'dark';
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [rows, setRows] = useState<Array<{
    id: number;
    providerCode: string;
    providerName: string;
    providerType: string;
    status: string;
    updateTime: string;
  }>>([]);
  const [keyword, setKeyword] = useState('');
  const [providerType, setProviderType] = useState<'' | ProviderType>('');
  const [page, setPage] = useState(1);
  useScrollPaginatedContentToTop(page);
  const [total, setTotal] = useState(0);
  const pageSize = 20;

  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    providerCode: '',
    providerName: '',
    providerType: 'internal' as ProviderType,
    authType: 'none' as AuthType,
    baseUrl: '',
    description: '',
  });
  const [providerFieldErrors, setProviderFieldErrors] = useState<{ providerCode?: string; providerName?: string }>({});

  const loadData = useCallback(async () => {
    if (mode !== 'list') return;
    setLoading(true);
    setError(null);
    try {
      const data = await providerService.list({
        page,
        pageSize,
        keyword: keyword.trim() || undefined,
        providerType: providerType || undefined,
      });
      setRows(data.list.map((item) => ({
        id: item.id,
        providerCode: item.providerCode,
        providerName: item.providerName,
        providerType: item.providerType,
        status: item.status,
        updateTime: item.updateTime || item.createTime || '-',
      })));
      setTotal(data.total);
    } catch (err) {
      const e = err instanceof Error ? err : new Error('加载 Provider 列表失败');
      setError(e);
      setRows([]);
      setTotal(0);
      showMessage(e.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [keyword, mode, page, providerType, showMessage]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const createProvider = async () => {
    const next: { providerCode?: string; providerName?: string } = {};
    if (!form.providerCode.trim()) next.providerCode = '请填写 providerCode';
    if (!form.providerName.trim()) next.providerName = '请填写 providerName';
    if (Object.keys(next).length > 0) {
      setProviderFieldErrors(next);
      return;
    }
    setProviderFieldErrors({});
    setCreating(true);
    try {
      await providerService.create({
        providerCode: form.providerCode.trim(),
        providerName: form.providerName.trim(),
        providerType: form.providerType,
        authType: form.authType,
        baseUrl: form.baseUrl.trim() || undefined,
        description: form.description.trim() || undefined,
      });
      showMessage('Provider 创建成功', 'success');
      setProviderFieldErrors({});
      setForm({
        providerCode: '',
        providerName: '',
        providerType: 'internal',
        authType: 'none',
        baseUrl: '',
        description: '',
      });
    } catch (err) {
      showMessage(err instanceof Error ? err.message : 'Provider 创建失败', 'error');
    } finally {
      setCreating(false);
    }
  };

  if (mode === 'create') {
    return (
      <MgmtPageShell
        theme={theme}
        fontSize={fontSize}
        titleIcon={Plus}
        breadcrumbSegments={['Provider 管理', '新建 Provider']}
        description={CREATE_DESC}
        contentScroll="document"
      >
        <div className="px-4 sm:px-6 pb-8">
          <div className={`${bentoCard(theme)} overflow-hidden p-6`}>
            <div className="mt-0 grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <input
                  className={`${nativeInputClass(theme)}${providerFieldErrors.providerCode ? ` ${inputBaseError()}` : ''}`}
                  placeholder="providerCode"
                  value={form.providerCode}
                  onChange={(e) => {
                    const v = e.target.value;
                    setForm((prev) => ({ ...prev, providerCode: v }));
                    if (v.trim()) setProviderFieldErrors((p) => ({ ...p, providerCode: undefined }));
                  }}
                  aria-invalid={!!providerFieldErrors.providerCode}
                />
                {providerFieldErrors.providerCode ? (
                  <p className={`mt-1 ${fieldErrorText()} text-xs`} role="alert">
                    {providerFieldErrors.providerCode}
                  </p>
                ) : null}
              </div>
              <div>
                <input
                  className={`${nativeInputClass(theme)}${providerFieldErrors.providerName ? ` ${inputBaseError()}` : ''}`}
                  placeholder="providerName"
                  value={form.providerName}
                  onChange={(e) => {
                    const v = e.target.value;
                    setForm((prev) => ({ ...prev, providerName: v }));
                    if (v.trim()) setProviderFieldErrors((p) => ({ ...p, providerName: undefined }));
                  }}
                  aria-invalid={!!providerFieldErrors.providerName}
                />
                {providerFieldErrors.providerName ? (
                  <p className={`mt-1 ${fieldErrorText()} text-xs`} role="alert">
                    {providerFieldErrors.providerName}
                  </p>
                ) : null}
              </div>
              <FilterSelect value={form.providerType} onChange={(v) => setForm((prev) => ({ ...prev, providerType: v as ProviderType }))} options={TYPE_OPTIONS.filter((opt) => opt.value !== '') as Array<{ value: ProviderType; label: string }>} theme={theme} />
              <FilterSelect value={form.authType} onChange={(v) => setForm((prev) => ({ ...prev, authType: v as AuthType }))} options={[{ value: 'none', label: 'none' }, { value: 'api_key', label: 'api_key' }, { value: 'oauth2', label: 'oauth2' }, { value: 'basic', label: 'basic' }]} theme={theme} />
              <input className={`md:col-span-2 ${nativeInputClass(theme)}`} placeholder="baseUrl (optional)" value={form.baseUrl} onChange={(e) => setForm((prev) => ({ ...prev, baseUrl: e.target.value }))} />
              <AutoHeightTextarea className={`md:col-span-2 ${nativeInputClass(theme)} resize-none`} minRows={3} maxRows={12} placeholder="description (optional)" value={form.description} onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))} />
            </div>
            <div className="mt-4 flex items-center gap-2">
              <button type="button" className={btnPrimary} onClick={() => void createProvider()} disabled={creating} aria-label="创建 Provider">
                <Plus size={14} aria-hidden />
                {creating ? '创建中...' : '创建 Provider'}
              </button>
              <button type="button" className={btnSecondary(theme)} onClick={onOpenGrantManagement} aria-label="打开资源授权管理">
                去资源授权管理
                <ArrowRight size={14} aria-hidden />
              </button>
            </div>
          </div>
        </div>
      </MgmtPageShell>
    );
  }

  const listToolbar = (
    <div className="flex flex-wrap items-center justify-end gap-2 w-full">
      <button type="button" className={btnGhost(theme)} onClick={() => void loadData()} aria-label="刷新 Provider 列表">
        <RefreshCw size={14} aria-hidden />
        刷新
      </button>
      <button type="button" className={btnSecondary(theme)} onClick={onOpenGrantManagement} aria-label="打开资源授权管理">
        去授权管理
      </button>
    </div>
  );

  return (
    <MgmtPageShell
      theme={theme}
      fontSize={fontSize}
      titleIcon={Server}
      breadcrumbSegments={['Provider 管理', 'Provider 列表']}
      description={LIST_DESC}
      toolbar={listToolbar}
      contentScroll="document"
    >
      <div className="px-4 sm:px-6 pb-8">
        <div className={`${bentoCard(theme)} overflow-hidden`}>
          <div className={`px-6 py-3 border-b ${isDark ? 'border-white/[0.06]' : 'border-slate-100'}`}>
            <div className="flex flex-wrap items-center gap-2">
              <FilterSelect
                value={providerType}
                onChange={(v) => {
                  setProviderType(v as '' | ProviderType);
                  setPage(1);
                }}
                options={TYPE_OPTIONS}
                theme={theme}
                className="w-36"
              />
              <div className="flex-1 min-w-[220px]">
                <SearchInput
                  value={keyword}
                  onChange={(v) => {
                    setKeyword(v);
                    setPage(1);
                  }}
                  placeholder="搜索 provider 名称或编码"
                  theme={theme}
                />
              </div>
            </div>
          </div>

          <div className="p-4">
            {loading ? (
              <PageSkeleton type="table" rows={8} />
            ) : error ? (
              <PageError error={error} onRetry={() => void loadData()} retryLabel="重试加载 Provider 列表" />
            ) : rows.length === 0 ? (
              <EmptyState title="暂无 Provider" description="当前条件下没有可展示的 Provider 元数据。" />
            ) : (
              <div className="space-y-2">
                {rows.map((row) => (
                  <div key={row.id} className={`rounded-xl border px-3 py-2 ${isDark ? 'border-white/10 bg-white/[0.02]' : 'border-slate-200 bg-white'}`}>
                    <p className={`text-sm font-semibold ${textPrimary(theme)}`}>{row.providerName}</p>
                    <p className={`text-xs ${textSecondary(theme)}`}>
                      编码 {row.providerCode} · 类型 {providerTypeLabelZh(row.providerType)} · 状态 {providerStatusLabelZh(row.status)} · 更新{' '}
                      {row.updateTime === '-' ? '—' : formatDateTime(row.updateTime)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className={`border-t px-4 ${isDark ? 'border-white/[0.06]' : 'border-slate-100'}`}>
            <Pagination theme={theme} page={page} pageSize={pageSize} total={total} onChange={setPage} />
          </div>
        </div>
      </div>
    </MgmtPageShell>
  );
};
