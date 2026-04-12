import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Package, Plus, RefreshCw, Trash2 } from 'lucide-react';
import type { Theme, ThemeColor } from '../../types';
import type { ResourceType } from '../../types/dto/catalog';
import { userSettingsService } from '../../api/services/user-settings.service';
import { resourceCatalogService } from '../../api/services/resource-catalog.service';
import type { IntegrationPackageItemDTO, IntegrationPackageVO } from '../../types/dto/integration-package';
import type { UserIntegrationPackageOption } from '../../types/dto/user-settings';
import { btnPrimary, btnSecondary, textMuted, textPrimary, textSecondary, canvasBodyBg, mainScrollPadBottom } from '../../utils/uiClasses';
import { nativeInputClass } from '../../utils/formFieldClasses';
import { PageSkeleton } from '../../components/common/PageSkeleton';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { PageTitleTagline } from '../../components/common/PageTitleTagline';
import { BentoCard } from '../../components/common/BentoCard';
import { useLayoutChrome } from '../../context/LayoutChromeContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { buildPath, inferConsoleRole, parseRoute } from '../../constants/consoleRoutes';
import { useUserRole } from '../../context/UserRoleContext';
import {
  IntegrationPackageResourcePicker,
  type SelectedPackageResource,
} from './IntegrationPackageResourcePicker';

interface Props {
  theme: Theme;
  themeColor: ThemeColor;
  showMessage: (msg: string, type?: 'success' | 'error' | 'info') => void;
  /** 嵌入「密钥与集成套餐」总页时隐藏顶部大标题 */
  embeddedInHub?: boolean;
}

async function enrichLabels(items: IntegrationPackageItemDTO[]): Promise<SelectedPackageResource[]> {
  if (items.length === 0) return [];
  return Promise.all(
    items.map(async (item) => {
      try {
        const d = await resourceCatalogService.getByTypeAndId(
          item.resourceType as ResourceType,
          String(item.resourceId),
        );
        return {
          item,
          label: `${d.displayName}（${item.resourceType} #${item.resourceId}）`,
        };
      } catch {
        return { item, label: `${item.resourceType} #${item.resourceId}` };
      }
    }),
  );
}

export const UserIntegrationPackagePage: React.FC<Props> = ({ theme, showMessage, embeddedInHub = false }) => {
  const isDark = theme === 'dark';
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { platformRole } = useUserRole();
  const routePage = parseRoute(pathname)?.page ?? '';
  const consoleRole = inferConsoleRole(routePage, platformRole);
  const { chromePageTitle } = useLayoutChrome();
  const [list, setList] = useState<UserIntegrationPackageOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [pickerMountKey, setPickerMountKey] = useState(0);
  const [editing, setEditing] = useState<IntegrationPackageVO | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'active' | 'disabled'>('active');
  const [selectedRows, setSelectedRows] = useState<SelectedPackageResource[]>([]);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const catalogEnrichGen = useRef(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await userSettingsService.listIntegrationPackages();
      setList(rows);
    } catch (e) {
      showMessage(e instanceof Error ? e.message : '加载失败', 'error');
    } finally {
      setLoading(false);
    }
  }, [showMessage]);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    catalogEnrichGen.current += 1;
    setEditing(null);
    setName('');
    setDescription('');
    setStatus('active');
    setSelectedRows([]);
    setPickerMountKey((k) => k + 1);
    setModalOpen(true);
  };

  const openEdit = async (id: string) => {
    setSaving(true);
    try {
      const pkg = await userSettingsService.getIntegrationPackage(id);
      setEditing(pkg);
      setName(pkg.name);
      setDescription(pkg.description ?? '');
      setStatus(pkg.status === 'disabled' ? 'disabled' : 'active');
      const base = (pkg.items ?? []).map((item) => ({
        item,
        label: `${item.resourceType} #${item.resourceId}`,
      }));
      setSelectedRows(base);
      setPickerMountKey((k) => k + 1);
      const gen = ++catalogEnrichGen.current;
      setModalOpen(true);
      void enrichLabels(pkg.items ?? []).then((rows) => {
        if (gen !== catalogEnrichGen.current) return;
        setSelectedRows(rows);
      });
    } catch (e) {
      showMessage(e instanceof Error ? e.message : '加载套餐失败', 'error');
    } finally {
      setSaving(false);
    }
  };

  const save = async () => {
    const items = selectedRows.map((r) => r.item);
    if (!name.trim()) {
      showMessage('请填写套餐名称', 'error');
      return;
    }
    if (items.length === 0) {
      showMessage('请至少选择一条已上线资源', 'error');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await userSettingsService.updateIntegrationPackage(editing.id, {
          name: name.trim(),
          description: description.trim() || null,
          status,
          items,
        });
        showMessage('已保存', 'success');
      } else {
        await userSettingsService.createIntegrationPackage({
          name: name.trim(),
          description: description.trim() || null,
          status: 'active',
          items,
        });
        showMessage('已创建', 'success');
      }
      setModalOpen(false);
      await load();
    } catch (e) {
      showMessage(e instanceof Error ? e.message : '保存失败', 'error');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await userSettingsService.deleteIntegrationPackage(deleteId);
      showMessage('已删除', 'success');
      setDeleteId(null);
      await load();
    } catch (e) {
      showMessage(e instanceof Error ? e.message : '删除失败', 'error');
    }
  };

  return (
    <div className={`flex-1 overflow-y-auto ${canvasBodyBg(theme)}`}>
      <div className={`w-full min-h-0 ${mainScrollPadBottom}`}>
        {!embeddedInHub ? (
          <div className="flex min-w-0 items-center gap-3 mb-4">
            <div className={`shrink-0 rounded-xl p-2 ${isDark ? 'bg-white/10' : 'bg-slate-100'}`}>
              <Package size={22} className={textSecondary(theme)} />
            </div>
            <PageTitleTagline
              subtitleOnly
              theme={theme}
              title={chromePageTitle || '集成套餐'}
              tagline="把已上线资源收成白名单，再回「API 密钥」绑定到 Key。"
            />
          </div>
        ) : null}

        <BentoCard theme={theme}>
          <div className="flex flex-wrap gap-2 mb-4">
            <button type="button" className={btnPrimary} onClick={openCreate}>
              <Plus size={16} className="inline mr-1" aria-hidden />
              新建套餐
            </button>
            <button type="button" className={btnSecondary(theme)} onClick={() => void load()} disabled={loading}>
              <RefreshCw size={16} className="inline mr-1" aria-hidden />
              刷新
            </button>
            <button
              type="button"
              className={btnSecondary(theme)}
              onClick={() => navigate(`${buildPath(consoleRole, 'my-api-keys')}`)}
            >
              去绑定 API Key
            </button>
          </div>

          {loading ? (
            <PageSkeleton type="table" rows={3} />
          ) : (
            <div
              className={`rounded-2xl border overflow-hidden ${isDark ? 'border-white/10 bg-white/[0.02]' : 'border-slate-200 bg-white'}`}
            >
              <table className="min-w-full text-sm">
                <thead>
                  <tr className={isDark ? 'bg-white/[0.04]' : 'bg-slate-50'}>
                    <th className={`text-left px-3 py-2 ${textSecondary(theme)}`}>名称</th>
                    <th className={`text-left px-3 py-2 ${textSecondary(theme)}`}>状态</th>
                    <th className={`text-left px-3 py-2 ${textSecondary(theme)}`}>资源数</th>
                    <th className={`text-right px-3 py-2 ${textSecondary(theme)}`}>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((p) => (
                    <tr key={p.id} className={`border-t ${isDark ? 'border-white/10' : 'border-slate-100'}`}>
                      <td className={`px-3 py-2 ${textPrimary(theme)}`}>
                        <div className="font-medium">{p.name}</div>
                        <div className={`text-xs ${textMuted(theme)}`}>{p.id}</div>
                      </td>
                      <td className={`px-3 py-2 ${textMuted(theme)}`}>{p.status}</td>
                      <td className={`px-3 py-2 ${textMuted(theme)}`}>{p.itemCount ?? 0}</td>
                      <td className="px-3 py-2 text-right space-x-2">
                        <button type="button" className={btnSecondary(theme)} onClick={() => void openEdit(p.id)}>
                          编辑
                        </button>
                        <button type="button" className={btnSecondary(theme)} onClick={() => setDeleteId(p.id)}>
                          <Trash2 size={14} className="inline" aria-hidden />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {list.length === 0 ? (
                <p className={`px-3 py-6 text-sm text-center ${textMuted(theme)}`}>暂无套餐，可先新建再添加资源。</p>
              ) : null}
            </div>
          )}
        </BentoCard>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => !saving && setModalOpen(false)}
        title={editing ? '编辑集成套餐' : '新建集成套餐'}
        theme={theme}
        size="lg"
        footer={
          <>
            <button type="button" className={btnSecondary(theme)} onClick={() => setModalOpen(false)} disabled={saving}>
              取消
            </button>
            <button type="button" className={btnPrimary} onClick={() => void save()} disabled={saving}>
              {saving ? '保存中…' : '保存'}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <label className={`text-xs font-medium ${textSecondary(theme)}`}>名称</label>
            <input className={`mt-1 w-full ${nativeInputClass(theme)}`} value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className={`text-xs font-medium ${textSecondary(theme)}`}>说明</label>
            <input
              className={`mt-1 w-full ${nativeInputClass(theme)}`}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="可选"
            />
          </div>
          {editing ? (
            <div>
              <label className={`text-xs font-medium ${textSecondary(theme)}`}>状态</label>
              <select
                className={`mt-1 w-full ${nativeInputClass(theme)}`}
                value={status}
                onChange={(e) => setStatus(e.target.value === 'disabled' ? 'disabled' : 'active')}
              >
                <option value="active">active（可选中绑定 Key）</option>
                <option value="disabled">disabled（暂停使用）</option>
              </select>
            </div>
          ) : null}
          <IntegrationPackageResourcePicker
            key={pickerMountKey}
            theme={theme}
            active={modalOpen}
            value={selectedRows}
            onChange={setSelectedRows}
          />
        </div>
      </Modal>

      <ConfirmDialog
        open={deleteId != null}
        title="删除集成套餐？"
        message="将解除该套餐与 API Key 的绑定（Key 的 integration_package_id 会清空）。"
        confirmText="删除"
        variant="danger"
        onCancel={() => setDeleteId(null)}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  );
};
