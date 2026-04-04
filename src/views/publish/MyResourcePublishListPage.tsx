import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { X, type LucideIcon } from 'lucide-react';
import type { Theme, FontSize } from '../../types';
import type { ResourceType } from '../../types/dto/catalog';
import {
  bentoCard,
  btnPrimary,
  btnSecondary,
  statusBadgeClass,
  statusDot,
  statusLabel,
  textPrimary,
  textSecondary,
  textMuted,
} from '../../utils/uiClasses';
import type { DomainStatus } from '../../utils/uiClasses';
import { useMessage } from '../../components/common/Message';
import { Modal } from '../../components/common/Modal';
import { AnimatedList } from '../../components/common/AnimatedList';
import { EmptyState } from '../../components/common/EmptyState';
import { PageSkeleton } from '../../components/common/PageSkeleton';
import { PublishResourceCard } from '../../components/business/PublishResourceCard';
import { resourceCenterService } from '../../api/services/resource-center.service';
import { resourceCenterItemToMyPublishItem } from '../../utils/resourceCenterToMyPublishItem';
import type { MyPublishItem } from '../../types/dto/user-activity';
import { buildPath } from '../../constants/consoleRoutes';
import { RESOURCE_TYPE_LABEL_ZH, RESOURCE_TYPE_REGISTER_PAGE } from '../../constants/resourceTypes';
import { MgmtPageShell } from '../userMgmt/MgmtPageShell';
import { useUserRole } from '../../context/UserRoleContext';

export interface MyResourcePublishListConfig {
  titleIcon: LucideIcon;
  breadcrumbSegments: readonly [string, string];
  pageDesc: string;
  emptyTitle: string;
  emptyDescription: string;
  emptyActionNavigate: () => void;
  emptyActionLabel: string;
  detailModalTitle: string;
  callCountLabel: string;
}

interface Props {
  theme: Theme;
  fontSize: FontSize;
  resourceType: ResourceType;
  config: MyResourcePublishListConfig;
}

export const MyResourcePublishListPage: React.FC<Props> = ({ theme, fontSize, resourceType, config }) => {
  const isDark = theme === 'dark';
  const navigate = useNavigate();
  const { showMessage } = useMessage();
  const { platformRole, hasPermission } = useUserRole();
  const canAuditPending =
    platformRole === 'platform_admin' || platformRole === 'reviewer' || hasPermission('resource:audit');
  const canPublishFromTesting =
    platformRole === 'platform_admin' || platformRole === 'reviewer' || platformRole === 'developer';

  const [items, setItems] = useState<MyPublishItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [withdrawTarget, setWithdrawTarget] = useState<MyPublishItem | null>(null);
  const [withdrawSubmitting, setWithdrawSubmitting] = useState(false);
  const [viewTarget, setViewTarget] = useState<MyPublishItem | null>(null);

  const fetchData = useCallback(() => {
    setLoading(true);
    resourceCenterService
      .listMine({ page: 1, pageSize: 200, resourceType, sortOrder: 'desc' })
      .then((page) => setItems(page.list.map(resourceCenterItemToMyPublishItem)))
      .catch((err) => {
        console.error(err);
        showMessage(err instanceof Error ? err.message : '加载失败', 'error');
        setItems([]);
      })
      .finally(() => setLoading(false));
  }, [resourceType, showMessage]);

  const publishCardAuditProps = useMemo(
    () => ({
      canAuditPending,
      canPublishFromTesting,
      showMessage,
      onLifecycleMutated: fetchData,
    }),
    [canAuditPending, canPublishFromTesting, showMessage, fetchData],
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const confirmWithdraw = async (row: MyPublishItem) => {
    setWithdrawSubmitting(true);
    try {
      await resourceCenterService.withdraw(row.id);
      setWithdrawTarget(null);
      showMessage(`已撤回「${row.displayName}」的审核申请`, 'success');
      fetchData();
    } catch (err) {
      showMessage(err instanceof Error ? err.message : '撤回失败', 'error');
    } finally {
      setWithdrawSubmitting(false);
    }
  };

  const toolbar = (
    <span
      className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
        isDark ? 'bg-white/5 text-slate-400' : 'border border-slate-100 bg-slate-50 text-slate-500'
      }`}
    >
      共 {items.length} 个
    </span>
  );

  return (
    <>
      <MgmtPageShell
        theme={theme}
        fontSize={fontSize}
        titleIcon={config.titleIcon}
        breadcrumbSegments={config.breadcrumbSegments}
        description={config.pageDesc}
        toolbar={toolbar}
        contentScroll="document"
      >
        <div className="px-4 sm:px-6 pb-8">
          {loading ? (
            <PageSkeleton type="cards" />
          ) : items.length === 0 ? (
            <EmptyState
              title={config.emptyTitle}
              description={config.emptyDescription}
              action={
                <button type="button" className={btnPrimary} onClick={config.emptyActionNavigate}>
                  {config.emptyActionLabel}
                </button>
              }
            />
          ) : (
            <AnimatedList className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {items.map((row) => (
                <PublishResourceCard
                  key={row.id}
                  theme={theme}
                  item={row}
                  callCountLabel={config.callCountLabel}
                  onView={() => setViewTarget(row)}
                  onWithdraw={row.status === 'pending_review' ? () => setWithdrawTarget(row) : undefined}
                  {...publishCardAuditProps}
                />
              ))}
            </AnimatedList>
          )}
        </div>
      </MgmtPageShell>

      <AnimatePresence>
        {withdrawTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
            onClick={() => setWithdrawTarget(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className={`mx-4 w-full max-w-md p-6 ${bentoCard(theme)}`}
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 className={`text-lg font-bold ${textPrimary(theme)}`}>确认撤回</h3>
                <button
                  type="button"
                  onClick={() => setWithdrawTarget(null)}
                  className={`rounded-lg p-1.5 ${isDark ? 'hover:bg-white/10' : 'hover:bg-slate-100'}`}
                  aria-label="关闭"
                >
                  <X size={18} className={textMuted(theme)} aria-hidden />
                </button>
              </div>
              <p className={`mb-6 text-sm ${textSecondary(theme)}`}>
                确定要撤回 <strong>{withdrawTarget.displayName}</strong> 的审核申请吗？撤回后状态将恢复为草稿。
              </p>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setWithdrawTarget(null)} className={btnSecondary(theme)}>
                  取消
                </button>
                <button
                  type="button"
                  disabled={withdrawSubmitting}
                  onClick={() => void confirmWithdraw(withdrawTarget)}
                  className="rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-amber-600 disabled:opacity-60"
                >
                  {withdrawSubmitting ? '撤回中…' : '确认撤回'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Modal open={!!viewTarget} onClose={() => setViewTarget(null)} title={config.detailModalTitle} theme={theme} size="lg">
        {viewTarget && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: '名称', value: viewTarget.displayName, bold: true },
                { label: '状态', value: null, badge: true },
                { label: config.callCountLabel, value: String(viewTarget.callCount) },
                { label: '创建时间', value: viewTarget.createTime },
              ].map((cell) => (
                <div key={cell.label}>
                  <span className={`text-xs font-medium ${textMuted(theme)}`}>{cell.label}</span>
                  {cell.badge ? (
                    <div className="mt-1">
                      <span className={statusBadgeClass(viewTarget.status as DomainStatus, theme)}>
                        <span className={statusDot(viewTarget.status as DomainStatus)} />
                        {statusLabel(viewTarget.status as DomainStatus)}
                      </span>
                    </div>
                  ) : (
                    <p
                      className={`mt-0.5 text-sm ${cell.bold ? `font-semibold ${textPrimary(theme)}` : textSecondary(theme)}`}
                    >
                      {cell.value}
                    </p>
                  )}
                </div>
              ))}
            </div>
            <div>
              <span className={`text-xs font-medium ${textMuted(theme)}`}>描述</span>
              <p className={`mt-0.5 text-sm ${textSecondary(theme)}`}>{viewTarget.description}</p>
            </div>
            <div className="flex flex-wrap gap-2 pt-2">
              <button
                type="button"
                className={btnSecondary(theme)}
                onClick={() => navigate(buildPath('user', RESOURCE_TYPE_REGISTER_PAGE[resourceType], viewTarget.id))}
              >
                去编辑
              </button>
              <button
                type="button"
                className={btnPrimary}
                onClick={() => navigate(`${buildPath('user', 'resource-center')}?type=${resourceType}`)}
              >
                在统一资源中心打开
              </button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
};
