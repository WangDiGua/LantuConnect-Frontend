import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import type { Theme, FontSize } from '../../types';
import type { ResourceType } from '../../types/dto/catalog';
import type { ResourceCenterItemVO, ResourceStatus, ResourceVersionVO } from '../../types/dto/resource-center';
import { resourceCenterService } from '../../api/services/resource-center.service';
import { resourceAuditService } from '../../api/services/resource-audit.service';
import { useUserRole } from '../../context/UserRoleContext';
import { RESOURCE_TYPES, RESOURCE_TYPE_LABEL_ZH } from '../../constants/resourceTypes';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { EmptyState } from '../../components/common/EmptyState';
import { PageError } from '../../components/common/PageError';
import { FilterSelect, Pagination, SearchInput } from '../../components/common';
import {
  bentoCard,
  bentoCardHover,
  btnGhost,
  btnPrimary,
  mgmtTableActionDanger,
  mgmtTableActionGhost,
  mgmtTableActionPositive,
  canvasBodyBg,
  mainScrollCompositorClass,
  statusBadgeClass,
  statusDot,
  statusLabel,
  textMuted,
  textPrimary,
  textSecondary,
} from '../../utils/uiClasses';
import { nullDisplay } from '../../utils/errorHandler';
import { formatDateTime } from '../../utils/formatDateTime';

interface Props {
  theme: Theme;
  fontSize: FontSize;
  showMessage: (msg: string, type: 'success' | 'error' | 'info' | 'warning') => void;
  resourceType?: ResourceType;
  allowTypeSwitch?: boolean;
  onTypeChange?: (type: ResourceType) => void;
  onNavigateRegister: (resourceType: ResourceType, id?: number) => void;
}

export const ResourceCenterManagementPage: React.FC<Props> = ({
  theme,
  showMessage,
  resourceType,
  allowTypeSwitch = false,
  onTypeChange,
  onNavigateRegister,
}) => {
  const isDark = theme === 'dark';
  const { platformRole } = useUserRole();
  const canPublish = platformRole === 'platform_admin';
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ResourceCenterItemVO[]>([]);
  const [versionTarget, setVersionTarget] = useState<ResourceCenterItemVO | null>(null);
  const [versions, setVersions] = useState<ResourceVersionVO[]>([]);
  const [newVersion, setNewVersion] = useState('v2');
  const [activeType, setActiveType] = useState<ResourceType>(resourceType ?? 'agent');
  const [runningActionKey, setRunningActionKey] = useState<string | null>(null);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ResourceStatus>('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loadError, setLoadError] = useState<Error | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ id: number; type: 'remove' | 'deprecate' } | null>(null);
  const PAGE_SIZE = 20;

  useEffect(() => {
    if (resourceType) setActiveType(resourceType);
  }, [resourceType]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const pageData = await resourceCenterService.listMine({
        page,
        pageSize: PAGE_SIZE,
        resourceType: activeType,
        keyword: keyword.trim() || undefined,
        status: statusFilter === 'all' ? undefined : statusFilter,
        sortBy: 'updateTime',
        sortOrder: 'desc',
      });
      setItems(pageData.list);
      setTotal(pageData.total);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('加载资源失败');
      setLoadError(error);
      setItems([]);
      setTotal(0);
      showMessage(error.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [activeType, keyword, page, showMessage, statusFilter]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const title = useMemo(() => {
    if (allowTypeSwitch) return '统一资源管理';
    return `${RESOURCE_TYPE_LABEL_ZH[activeType]}资源管理`;
  }, [allowTypeSwitch, activeType]);

  const openVersions = async (item: ResourceCenterItemVO) => {
    setVersionTarget(item);
    try {
      const data = await resourceCenterService.listVersions(item.id);
      setVersions(data);
    } catch {
      setVersions([]);
    }
  };

  const runAction = async (actionKey: string, action: () => Promise<void>, okText: string) => {
    setRunningActionKey(actionKey);
    try {
      await action();
      showMessage(okText, 'success');
      await fetchData();
    } catch (err) {
      showMessage(err instanceof Error ? err.message : '操作失败', 'error');
    } finally {
      setRunningActionKey(null);
    }
  };

  return (
    <div className={`flex-1 overflow-y-auto custom-scrollbar ${mainScrollCompositorClass} ${canvasBodyBg(theme)}`}>
      <div className="px-3 py-4 sm:px-4 lg:px-5">
        <div className={`${bentoCard(theme)} overflow-hidden`}>
          <div className={`flex items-center justify-between border-b px-6 py-4 ${isDark ? 'border-white/[0.06]' : 'border-slate-100'}`}>
            <div>
              <h2 className={`text-lg font-bold ${textPrimary(theme)}`}>{title}</h2>
              <p className={`mt-0.5 text-xs ${textMuted(theme)}`}>资源中心闭环：注册、提审、发布、版本、下线</p>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => void fetchData()} className={btnGhost(theme)}>
                <RefreshCw size={15} />
                刷新
              </button>
              <button type="button" onClick={() => onNavigateRegister(activeType)} className={btnPrimary}>
                <Plus size={15} />
                注册{RESOURCE_TYPE_LABEL_ZH[activeType]}
              </button>
            </div>
          </div>

          {allowTypeSwitch && (
            <div className={`flex flex-wrap items-center gap-2 border-b px-6 py-3 ${isDark ? 'border-white/[0.06]' : 'border-slate-100'}`}>
              {RESOURCE_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    setActiveType(type);
                    setPage(1);
                    onTypeChange?.(type);
                  }}
                  className={`rounded-xl px-3 py-1.5 text-sm font-medium transition-colors ${
                    type === activeType
                      ? 'bg-neutral-900 text-white'
                      : isDark
                        ? 'bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
                  }`}
                >
                  {RESOURCE_TYPE_LABEL_ZH[type]}
                </button>
              ))}
            </div>
          )}

          <div className={`px-6 py-3 border-b ${isDark ? 'border-white/[0.06]' : 'border-slate-100'}`}>
            <div className="flex flex-wrap items-center gap-2">
              <div className="w-40">
                <FilterSelect
                  value={statusFilter}
                  onChange={(value) => {
                    setStatusFilter(value as typeof statusFilter);
                    setPage(1);
                  }}
                  options={[
                    { value: 'all', label: '全部状态' },
                    { value: 'draft', label: '草稿' },
                    { value: 'pending_review', label: '待审核' },
                    { value: 'testing', label: '测试中' },
                    { value: 'published', label: '已发布' },
                    { value: 'rejected', label: '已驳回' },
                    { value: 'deprecated', label: '已下线' },
                  ]}
                  theme={theme}
                />
              </div>
              <div className="flex-1 min-w-[min(100%,220px)]">
                <SearchInput
                  value={keyword}
                  onChange={(value) => {
                    setKeyword(value);
                    setPage(1);
                  }}
                  placeholder="搜索名称、编码、标签..."
                  theme={theme}
                />
              </div>
            </div>
          </div>

          <div className="p-3">
            {loading ? (
              <div className={`py-10 text-center text-sm ${textMuted(theme)}`}>加载中…</div>
            ) : loadError ? (
              <PageError error={loadError} onRetry={() => void fetchData()} retryLabel="重试加载资源" />
            ) : items.length === 0 ? (
              <EmptyState
                title="暂无资源"
                description="当前筛选条件下没有资源，试试调整筛选或注册新资源。"
                action={(
                  <button type="button" onClick={() => onNavigateRegister(activeType)} className={btnPrimary}>
                    <Plus size={15} />
                    注册{RESOURCE_TYPE_LABEL_ZH[activeType]}
                  </button>
                )}
              />
            ) : (
              <div className="space-y-2">
                {items.map((item) => (
                  <div key={`${item.resourceType}-${item.id}`} className={`${bentoCardHover(theme)} p-4`}>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className={`truncate font-semibold ${textPrimary(theme)}`}>
                          {item.displayName}
                          <span className={`ml-2 rounded px-1.5 py-0.5 text-xs ${isDark ? 'bg-white/10 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                            {RESOURCE_TYPE_LABEL_ZH[item.resourceType]}
                          </span>
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          <span className={statusBadgeClass(item.status, theme)}>
                            <span className={statusDot(item.status)} />
                            {statusLabel(item.status)}
                          </span>
                          <span className={`text-xs ${textMuted(theme)}`}>
                            {nullDisplay(item.resourceCode)} · {nullDisplay(item.currentVersion, 'v1')}
                            {item.sourceType ? ` · ${item.sourceType}` : ''}
                            {item.ownerName ? ` · ${item.ownerName}` : ''}
                          </span>
                        </div>
                        <div className={`mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] ${textMuted(theme)}`}>
                          <span>创建: {nullDisplay(formatDateTime(item.createTime))}</span>
                          <span>更新: {nullDisplay(formatDateTime(item.updateTime))}</span>
                          {item.tags && item.tags.length > 0 && <span>标签: {item.tags.slice(0, 3).join(', ')}</span>}
                          {item.endpoint && <span className="font-mono">端点: {item.endpoint}</span>}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {(item.status === 'draft' || item.status === 'rejected') && (
                          <button type="button" onClick={() => onNavigateRegister(item.resourceType, item.id)} className={mgmtTableActionGhost(theme)}>
                            编辑
                          </button>
                        )}
                        {item.status !== 'pending_review' && (
                          <button type="button" onClick={() => void openVersions(item)} className={mgmtTableActionGhost(theme)}>
                            版本
                          </button>
                        )}
                        {(item.status === 'draft' || item.status === 'rejected' || item.status === 'deprecated') && (
                          <button
                            type="button"
                            disabled={runningActionKey === `submit-${item.id}`}
                            onClick={() => void runAction(`submit-${item.id}`, () => resourceCenterService.submit(item.id), '已提交审核')}
                            className={mgmtTableActionPositive(theme)}
                          >
                            {runningActionKey === `submit-${item.id}` ? '提交中…' : (item.status === 'rejected' || item.status === 'deprecated' ? '重新提交审核' : '提交审核')}
                          </button>
                        )}
                        {item.status === 'pending_review' && (
                          <button
                            type="button"
                            disabled={runningActionKey === `withdraw-${item.id}`}
                            onClick={() => void runAction(`withdraw-${item.id}`, () => resourceCenterService.withdraw(item.id), '已撤回到草稿')}
                            className={mgmtTableActionGhost(theme)}
                          >
                            {runningActionKey === `withdraw-${item.id}` ? '撤回中…' : '撤回审核'}
                          </button>
                        )}
                        {(item.status === 'testing' || item.status === 'published') && (
                          <button
                            type="button"
                            disabled={runningActionKey === `deprecate-${item.id}`}
                            onClick={() => setConfirmAction({ id: item.id, type: 'deprecate' })}
                            className={mgmtTableActionGhost(theme)}
                          >
                            {runningActionKey === `deprecate-${item.id}` ? '下线中…' : '下线'}
                          </button>
                        )}
                        {item.status === 'draft' && (
                          <button
                            type="button"
                            disabled={runningActionKey === `remove-${item.id}`}
                            onClick={() => setConfirmAction({ id: item.id, type: 'remove' })}
                            className={mgmtTableActionDanger}
                          >
                            {runningActionKey === `remove-${item.id}` ? '删除中…' : '删除'}
                          </button>
                        )}
                        {item.status === 'testing' && canPublish && (
                          <button
                            type="button"
                            disabled={runningActionKey === `publish-${item.id}`}
                            onClick={() => void runAction(`publish-${item.id}`, () => resourceAuditService.publish(item.id), '已发布上架')}
                            className={mgmtTableActionPositive(theme)}
                          >
                            {runningActionKey === `publish-${item.id}` ? '发布中…' : '发布上架'}
                          </button>
                        )}
                        {item.status === 'testing' && !canPublish && (
                          <span className={`text-xs ${textMuted(theme)}`}>待平台管理员发布</span>
                        )}
                      </div>
                    </div>
                    <p className={`mt-2 text-xs ${textSecondary(theme)}`}>{nullDisplay(item.description, '暂无描述')}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className={`px-4 border-t ${isDark ? 'border-white/[0.06]' : 'border-slate-100'}`}>
            <Pagination theme={theme} page={page} pageSize={PAGE_SIZE} total={total} onChange={setPage} />
          </div>
        </div>
      </div>

      <Modal
        open={!!versionTarget}
        onClose={() => setVersionTarget(null)}
        title={versionTarget ? `版本管理 · ${versionTarget.displayName}` : '版本管理'}
        theme={theme}
        size="lg"
      >
        {versionTarget && (
          <>
            <div className="space-y-2">
              {versions.length === 0 ? (
                <p className={`text-sm ${textMuted(theme)}`}>暂无版本记录</p>
              ) : (
                versions.map((ver) => (
                  <div key={ver.id} className={`flex items-center justify-between rounded-xl px-3 py-2 ${isDark ? 'bg-white/[0.04]' : 'bg-slate-50'}`}>
                    <span className={`text-sm ${textPrimary(theme)}`}>{ver.version} {ver.isCurrent ? '(当前)' : ''}</span>
                    {!ver.isCurrent && (
                      <button
                        type="button"
                        onClick={async () => {
                          await runAction(
                            `switch-version-${versionTarget.id}-${ver.version}`,
                            () => resourceCenterService.switchVersion(versionTarget.id, ver.version),
                            `已切换到 ${ver.version}`,
                          );
                          const latest = await resourceCenterService.listVersions(versionTarget.id);
                          setVersions(latest);
                        }}
                        className={btnGhost(theme)}
                      >
                        切换
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
            <div className="mt-3 flex items-center gap-2">
              <input
                value={newVersion}
                onChange={(e) => setNewVersion(e.target.value)}
                className={`flex-1 rounded-xl border px-3 py-2 text-sm ${isDark ? 'border-white/10 bg-white/[0.04] text-slate-200' : 'border-slate-200 bg-white text-slate-700'}`}
                placeholder="新版本号，如 v2"
              />
              <button
                type="button"
                onClick={async () => {
                  if (!newVersion.trim()) return;
                  await runAction(
                    `create-version-${versionTarget.id}`,
                    () => resourceCenterService.createVersion(versionTarget.id, { version: newVersion.trim(), makeCurrent: true }).then(() => undefined),
                    `已创建版本 ${newVersion}`,
                  );
                  const latest = await resourceCenterService.listVersions(versionTarget.id);
                  setVersions(latest);
                }}
                className={btnPrimary}
              >
                创建版本
              </button>
            </div>
          </>
        )}
      </Modal>
      <ConfirmDialog
        open={!!confirmAction}
        title={confirmAction?.type === 'remove' ? '删除资源' : '下线资源'}
        message={confirmAction?.type === 'remove' ? '确认删除该草稿资源？删除后不可恢复。' : '确认将该资源下线为 deprecated 状态？'}
        confirmText={confirmAction?.type === 'remove' ? '确认删除' : '确认下线'}
        variant="danger"
        loading={!!confirmAction && runningActionKey === `${confirmAction.type}-${confirmAction.id}`}
        onCancel={() => setConfirmAction(null)}
        onConfirm={() => {
          if (!confirmAction) return;
          const { id, type } = confirmAction;
          const actionKey = `${type}-${id}`;
          const action = type === 'remove'
            ? () => resourceCenterService.remove(id)
            : () => resourceCenterService.deprecate(id);
          const okText = type === 'remove' ? '已删除' : '已下线';
          void runAction(actionKey, action, okText).finally(() => setConfirmAction(null));
        }}
      />
    </div>
  );
};
