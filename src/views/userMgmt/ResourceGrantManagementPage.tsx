import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { KeyRound, Plus, RefreshCw, Search, ShieldCheck } from 'lucide-react';
import type { Theme, FontSize } from '../../types';
import { MgmtPageShell } from './MgmtPageShell';
import { nativeInputClass } from '../../utils/formFieldClasses';
import { TOOLBAR_ROW_LIST, toolbarSearchInputClass } from '../../utils/toolbarFieldClasses';
import { LantuSelect } from '../../components/common/LantuSelect';
import {
  btnGhost, btnPrimary, btnSecondary, fieldErrorText, iconMuted, inputBaseError, mgmtTableActionDanger,
  pageBlockStack, textMuted, textPrimary, textSecondary,
} from '../../utils/uiClasses';
import { resourceGrantService } from '../../api/services/resource-grant.service';
import { nullDisplay } from '../../utils/errorHandler';
import type { ResourceType } from '../../types/dto/catalog';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { Pagination } from '../../components/common';
import { EmptyState } from '../../components/common/EmptyState';
import { PageError } from '../../components/common/PageError';
import { PageSkeleton } from '../../components/common/PageSkeleton';
import { formatDateTime } from '../../utils/formatDateTime';
import { resolvePersonDisplay } from '../../utils/personDisplay';
import { resourceGrantActionsLabelZh, resourceGrantRecordStatusLabelZh } from '../../utils/backendEnumLabels';

interface Props {
  theme: Theme;
  fontSize: FontSize;
  showMessage: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

const RESOURCE_TYPE_OPTIONS: Array<{ value: ResourceType; label: string }> = [
  { value: 'agent', label: 'Agent' },
  { value: 'skill', label: 'Skill' },
  { value: 'mcp', label: 'MCP' },
  { value: 'app', label: 'App' },
  { value: 'dataset', label: 'Dataset' },
];

const ACTION_OPTIONS: Array<{ value: 'catalog' | 'resolve' | 'invoke' | '*'; label: string }> = [
  { value: 'catalog', label: 'catalog' },
  { value: 'resolve', label: 'resolve' },
  { value: 'invoke', label: 'invoke' },
  { value: '*', label: '*' },
];

export const ResourceGrantManagementPage: React.FC<Props> = ({ theme, fontSize, showMessage }) => {
  const isDark = theme === 'dark';
  const [resourceType, setResourceType] = useState<ResourceType>('agent');
  const [resourceId, setResourceId] = useState('');
  const [granteeApiKeyId, setGranteeApiKeyId] = useState('');
  const [actions, setActions] = useState<Array<'catalog' | 'resolve' | 'invoke' | '*'>>(['catalog', 'resolve', 'invoke']);
  const [expiresAt, setExpiresAt] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [rows, setRows] = useState<Array<{
    id: string;
    granteeApiKeyId?: string;
    granteeApiKeyPrefix?: string;
    actions?: string[];
    createdAt?: string;
    expiresAt?: string;
    status?: string;
    grantedBy?: string | number;
    grantedByName?: string;
  }>>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<Error | null>(null);
  const [granteeKeyword, setGranteeKeyword] = useState('');
  const [grantFieldErrors, setGrantFieldErrors] = useState<{
    resourceId?: string;
    granteeApiKeyId?: string;
    actions?: string;
  }>({});
  const PAGE_SIZE = 20;

  const canQuery = useMemo(() => resourceId.trim().length > 0, [resourceId]);

  const displayRows = useMemo(() => {
    const q = granteeKeyword.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => {
      const id = String(row.granteeApiKeyId ?? '').toLowerCase();
      const pre = String(row.granteeApiKeyPrefix ?? '').toLowerCase();
      return id.includes(q) || pre.includes(q);
    });
  }, [rows, granteeKeyword]);

  const fetchRows = useCallback(async () => {
    if (!resourceId.trim()) return;
    setLoading(true);
    setLoadError(null);
    try {
      const data = await resourceGrantService.list(resourceType, resourceId.trim(), {
        page,
        pageSize: PAGE_SIZE,
        sortBy: 'expiresAt',
        sortOrder: 'asc',
      });
      setRows(
        data.list.map((item) => {
          const rawItem = item as unknown as { status?: unknown };
          return ({
            status: typeof rawItem.status === 'string' ? rawItem.status : undefined,
          id: String(item.id),
          granteeApiKeyId: item.granteeApiKeyId,
          granteeApiKeyPrefix: item.granteeApiKeyPrefix,
          grantedBy: item.grantedBy,
          grantedByName: item.grantedByName,
          actions: item.actions ? [...item.actions] : [],
          createdAt: item.createdAt,
          expiresAt: item.expiresAt,
          });
        }),
      );
      setTotal(data.total);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('查询授权失败');
      setLoadError(error);
      setRows([]);
      setTotal(0);
      showMessage(error.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [page, resourceId, resourceType, showMessage]);

  const createGrant = useCallback(async () => {
    const next: { resourceId?: string; granteeApiKeyId?: string; actions?: string } = {};
    if (!resourceId.trim()) next.resourceId = '请填写 Resource ID';
    if (!granteeApiKeyId.trim()) next.granteeApiKeyId = '请填写 Grantee API Key ID';
    if (actions.length === 0) next.actions = '请至少选择一个授权动作';
    if (Object.keys(next).length > 0) {
      setGrantFieldErrors(next);
      return;
    }
    setGrantFieldErrors({});
    setSaving(true);
    try {
      await resourceGrantService.create({
        resourceType,
        resourceId: resourceId.trim(),
        granteeApiKeyId: granteeApiKeyId.trim(),
        actions: actions.includes('*') ? ['*'] : actions,
        expiresAt: expiresAt.trim() || undefined,
      });
      showMessage('授权创建成功', 'success');
      setGranteeApiKeyId('');
      setActions(['catalog', 'resolve', 'invoke']);
      setExpiresAt('');
      setPage(1);
      await fetchRows();
    } catch (err) {
      showMessage(err instanceof Error ? err.message : '创建授权失败', 'error');
    } finally {
      setSaving(false);
    }
  }, [actions, expiresAt, fetchRows, granteeApiKeyId, resourceId, resourceType, showMessage]);

  const revoke = useCallback(async () => {
    if (!deleteId) return;
    setRevoking(true);
    try {
      await resourceGrantService.remove(deleteId);
      showMessage('授权已撤销', 'success');
      setDeleteId(null);
      setPage(1);
      await fetchRows();
    } catch (err) {
      showMessage(err instanceof Error ? err.message : '撤销失败', 'error');
    } finally {
      setRevoking(false);
    }
  }, [deleteId, fetchRows, showMessage]);

  useEffect(() => {
    if (!canQuery) {
      setRows([]);
      setTotal(0);
      return;
    }
    void fetchRows();
  }, [canQuery, fetchRows]);

  return (
    <MgmtPageShell
      theme={theme}
      fontSize={fontSize}
      breadcrumbSegments={['用户管理', '资源授权管理']}
      titleIcon={ShieldCheck}
      toolbar={(
        <div className="flex items-center gap-2">
          <button type="button" className={btnGhost(theme)} onClick={() => void fetchRows()} disabled={!canQuery || loading}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            刷新
          </button>
        </div>
      )}
    >
      <div className={`px-4 sm:px-6 pb-6 ${pageBlockStack}`}>
        <section className={`rounded-2xl border p-4 ${isDark ? 'border-white/10 bg-white/[0.02]' : 'border-slate-200 bg-white'}`}>
          <h3 className={`text-sm font-semibold mb-3 ${textPrimary(theme)}`}>创建授权</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <LantuSelect
              theme={theme}
              value={resourceType}
              onChange={(v) => setResourceType(v as ResourceType)}
              options={RESOURCE_TYPE_OPTIONS}
            />
            <div>
              <input
                className={`${nativeInputClass(theme)}${grantFieldErrors.resourceId ? ` ${inputBaseError()}` : ''}`}
                placeholder="Resource ID"
                value={resourceId}
                onChange={(e) => {
                  setResourceId(e.target.value);
                  setGrantFieldErrors((p) => ({ ...p, resourceId: undefined }));
                }}
                aria-invalid={!!grantFieldErrors.resourceId}
              />
              {grantFieldErrors.resourceId ? (
                <p className={`mt-1 ${fieldErrorText()} text-xs`} role="alert">
                  {grantFieldErrors.resourceId}
                </p>
              ) : null}
            </div>
            <div className="md:col-span-2 space-y-1">
              <input
                className={`${nativeInputClass(theme)}${grantFieldErrors.granteeApiKeyId ? ` ${inputBaseError()}` : ''}`}
                placeholder="Grantee API Key ID（表主键，用于绑定授权）"
                value={granteeApiKeyId}
                onChange={(e) => {
                  setGranteeApiKeyId(e.target.value);
                  setGrantFieldErrors((p) => ({ ...p, granteeApiKeyId: undefined }));
                }}
                aria-invalid={!!grantFieldErrors.granteeApiKeyId}
              />
              {grantFieldErrors.granteeApiKeyId ? (
                <p className={`mt-1 ${fieldErrorText()} text-xs`} role="alert">
                  {grantFieldErrors.granteeApiKeyId}
                </p>
              ) : null}
              <p className={`text-[11px] ${textSecondary(theme)}`}>填写被授权 Key 的<strong>记录 id</strong>（非请求头明文）。<code className="font-mono">X-Api-Key</code> 与 <code className="font-mono">secretPlain</code> 说明见 API 文档。</p>
            </div>
            <input
              className={nativeInputClass(theme)}
              placeholder="过期时间（可选，ISO 格式）"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
            />
          </div>
          <div className="mt-3">
            <p className={`mb-2 text-xs ${textSecondary(theme)}`}>授权动作（actions）</p>
            <div className="flex flex-wrap items-center gap-2">
              {ACTION_OPTIONS.map((option) => {
                const checked = actions.includes(option.value);
                return (
                  <button
                    key={option.value}
                    type="button"
                    className={`rounded-lg border px-2.5 py-1.5 text-xs transition-colors ${
                      checked
                        ? 'border-neutral-900 bg-neutral-900/10 text-neutral-800'
                        : isDark
                          ? 'border-white/10 text-slate-300 hover:bg-white/[0.06]'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                    onClick={() => {
                      setGrantFieldErrors((p) => ({ ...p, actions: undefined }));
                      setActions((prev) => {
                        if (option.value === '*') return prev.includes('*') ? [] : ['*'];
                        const base = prev.filter((item) => item !== '*');
                        if (base.includes(option.value)) return base.filter((item) => item !== option.value);
                        return [...base, option.value];
                      });
                    }}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
            {grantFieldErrors.actions ? (
              <p className={`mt-2 ${fieldErrorText()} text-xs`} role="alert">
                {grantFieldErrors.actions}
              </p>
            ) : null}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <button type="button" className={btnPrimary} onClick={() => void createGrant()} disabled={saving}>
              <Plus size={14} />
              {saving ? '创建中…' : '新建授权'}
            </button>
            <button type="button" className={btnSecondary(theme)} onClick={() => void fetchRows()} disabled={!canQuery || loading}>
              <KeyRound size={14} />
              查询授权
            </button>
          </div>
        </section>

        <section className={`rounded-2xl border overflow-hidden ${isDark ? 'border-white/10 bg-white/[0.02]' : 'border-slate-200 bg-white'}`}>
          <div className={`px-4 py-3 border-b space-y-2 ${isDark ? 'border-white/10' : 'border-slate-100'}`}>
            <div>
              <p className={`text-sm font-semibold ${textPrimary(theme)}`}>授权列表</p>
              <p className={`text-xs ${textMuted(theme)}`}>resourceType={resourceType} / resourceId={resourceId || '-'}</p>
            </div>
            {rows.length > 0 && (
              <div className={`${TOOLBAR_ROW_LIST} min-w-0`}>
                <div className="relative min-w-0 flex-1 sm:max-w-xs">
                  <Search size={16} className={`absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${iconMuted(theme)}`} />
                  <input
                    type="search"
                    value={granteeKeyword}
                    onChange={(e) => setGranteeKeyword(e.target.value)}
                    placeholder="筛选 Key ID 或前缀（当前页）"
                    className={toolbarSearchInputClass(theme)}
                    aria-label="筛选被授权方"
                  />
                </div>
              </div>
            )}
          </div>
          <div className="divide-y divide-dashed divide-slate-200/60">
            {loading ? (
              <div className="px-2 py-2"><PageSkeleton type="table" rows={8} /></div>
            ) : loadError ? (
              <PageError error={loadError} onRetry={() => void fetchRows()} retryLabel="重试加载授权列表" />
            ) : rows.length === 0 ? (
              <div className="p-4">
                <EmptyState title="暂无授权记录" description="输入资源 ID 后可查询授权记录，或先创建新的授权。" />
              </div>
            ) : displayRows.length === 0 ? (
              <div className={`px-4 py-8 text-sm text-center ${textMuted(theme)}`}>当前页无匹配的 Key ID 或前缀</div>
            ) : (
              displayRows.map((row) => (
                <div key={row.id} className="px-4 py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${textPrimary(theme)}`}>{row.granteeApiKeyPrefix || '未返回 Key 前缀'}</p>
                    <p className={`text-xs truncate ${textSecondary(theme)}`}>
                      密钥 ID：{nullDisplay(row.granteeApiKeyId)} · 权限：{resourceGrantActionsLabelZh(row.actions ?? [])} · 状态：
                      {resourceGrantRecordStatusLabelZh(row.status)} · 授权人：
                      {resolvePersonDisplay({ names: [row.grantedByName], ids: [row.grantedBy] })} · 到期：
                      {formatDateTime(row.expiresAt)} · 创建：{formatDateTime(row.createdAt)}
                    </p>
                  </div>
                  <button type="button" className={mgmtTableActionDanger} onClick={() => setDeleteId(row.id)}>
                    撤销
                  </button>
                </div>
              ))
            )}
          </div>
          <div className={`px-4 border-t ${isDark ? 'border-white/10' : 'border-slate-100'}`}>
            <Pagination theme={theme} page={page} pageSize={PAGE_SIZE} total={total} onChange={setPage} />
          </div>
        </section>
      </div>

      <ConfirmDialog
        open={!!deleteId}
        title="撤销授权"
        message="确定撤销该资源调用授权吗？"
        confirmText="撤销"
        variant="danger"
        loading={revoking}
        onCancel={() => setDeleteId(null)}
        onConfirm={() => void revoke()}
      />
    </MgmtPageShell>
  );
};
