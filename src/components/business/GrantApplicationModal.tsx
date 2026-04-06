import React, { useEffect, useMemo, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import type { Theme } from '../../types';
import { Modal } from '../common/Modal';
import { LantuSelect } from '../common/LantuSelect';
import { nativeInputClass } from '../../utils/formFieldClasses';
import { btnPrimary, btnSecondary, textMuted, textPrimary, textSecondary } from '../../utils/uiClasses';
import { grantApplicationService } from '../../api/services';
import { userSettingsService } from '../../api/services/user-settings.service';
import type { UserApiKey } from '../../types/dto/user-settings';
import { buildPath } from '../../constants/consoleRoutes';
import { apiKeyScopesAllowGatewayFlow } from '../../utils/apiKeyScopes';
import { LantuDateTimePicker } from '../common/LantuDateTimePicker';
import { PageSkeleton } from '../common/PageSkeleton';
import { AutoHeightTextarea } from '../common/AutoHeightTextarea';

const ACTION_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'catalog', label: 'catalog（查询）' },
  { value: 'resolve', label: 'resolve（解析）' },
  { value: 'invoke', label: 'invoke（调用）' },
];

interface Props {
  open: boolean;
  onClose: () => void;
  theme: Theme;
  resourceType: string;
  resourceId: string | number;
  resourceName?: string;
  showMessage?: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

/** 与 docs/ai-handoff-docs：申请授权绑定的 apiKeyId 须为当前用户在 /user-settings/api-keys 下的 Key，非管理员 user-mgmt 全局 Key 管理（除非业务上同库同源）。 */
export const GrantApplicationModal: React.FC<Props> = ({
  open,
  onClose,
  theme,
  resourceType,
  resourceId,
  resourceName,
  showMessage,
}) => {
  const isDark = theme === 'dark';
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const consoleRole = pathname.startsWith('/admin') ? 'admin' : 'user';
  const [apiKeyId, setApiKeyId] = useState('');
  const [actions, setActions] = useState<string[]>(['catalog', 'resolve', 'invoke']);
  const [useCase, setUseCase] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [myKeys, setMyKeys] = useState<UserApiKey[]>([]);
  const [keysLoading, setKeysLoading] = useState(false);
  const [keysError, setKeysError] = useState<string | null>(null);

  const isSkillOrDataset = resourceType === 'skill' || resourceType === 'dataset';

  useEffect(() => {
    if (!open) return;
    setActions(isSkillOrDataset ? ['catalog', 'resolve'] : ['catalog', 'resolve', 'invoke']);
  }, [open, isSkillOrDataset]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setKeysLoading(true);
    setKeysError(null);
    userSettingsService
      .listApiKeys()
      .then((list) => {
        if (!cancelled) setMyKeys(Array.isArray(list) ? list : []);
      })
      .catch((e) => {
        if (!cancelled) setKeysError(e instanceof Error ? e.message : '加载我的 API Key 失败');
      })
      .finally(() => {
        if (!cancelled) setKeysLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const keySelectOptions = useMemo(
    () => [
      { value: '', label: '请选择…' },
      ...myKeys.map((k) => {
        const scopeOk = apiKeyScopesAllowGatewayFlow(k.scopes);
        return {
          value: k.id,
          label: `${k.name}（id=${k.id}${k.prefix ? ` · ${k.prefix}…` : ''}）${scopeOk ? '' : ' · scope 不足'}`,
        };
      }),
    ],
    [myKeys],
  );

  const goCreateUserApiKey = () => {
    onClose();
    navigate(buildPath('user', 'preferences'));
  };

  const handleSubmit = async () => {
    if (!apiKeyId.trim()) {
      showMessage?.('请选择或填写您的 API Key id（须为「偏好设置」中创建的 Key）', 'warning');
      return;
    }
    if (actions.length === 0) {
      showMessage?.('请至少选择一个操作权限', 'warning');
      return;
    }
    setSubmitting(true);
    try {
      await grantApplicationService.submit({
        resourceType,
        resourceId: Number(resourceId),
        apiKeyId: apiKeyId.trim(),
        actions,
        useCase: useCase.trim() || undefined,
        expiresAt: expiresAt.trim() || undefined,
      });
      showMessage?.(
        '授权申请已提交。资源拥有者、部门或平台管理员审批通过后，可在「个人资产 → 我的授权申请」查看状态并继续在市场获取资源（技能为制品下载，数据集为目录解析，Agent/MCP/App 等为 invoke）。',
        'success',
      );
      setApiKeyId('');
      setActions(isSkillOrDataset ? ['catalog', 'resolve'] : ['catalog', 'resolve', 'invoke']);
      setUseCase('');
      setExpiresAt('');
      onClose();
    } catch (err) {
      showMessage?.(err instanceof Error ? err.message : '提交授权申请失败', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`申请授权${resourceName ? ` — ${resourceName}` : ''}`}
      theme={theme}
      size="md"
    >
      <div className="space-y-4">
        <p className={`text-xs leading-relaxed ${textMuted(theme)}`}>
          选择你在「偏好设置」里创建的 Key 的<strong className={textPrimary(theme)}>记录 id</strong>。无 Key 时请先前往创建。
          <button
            type="button"
            onClick={() => {
              onClose();
              navigate(buildPath(consoleRole, 'api-docs'));
            }}
            className={`ml-1 underline font-medium ${isDark ? 'text-neutral-200' : 'text-neutral-900'}`}
          >
            X-Api-Key、scope 与 Grant 见 API 文档
          </button>
        </p>

        <div>
          <label className={`text-xs font-semibold block mb-1.5 ${textSecondary(theme)}`}>
            资源类型 / ID
          </label>
          <p className={`text-sm ${textMuted(theme)}`}>
            {resourceType} / {resourceId}
          </p>
        </div>

        {isSkillOrDataset && (
          <p className={`text-xs leading-relaxed rounded-lg border px-3 py-2 ${isDark ? 'border-amber-500/25 bg-amber-500/10 text-amber-100/90' : 'border-amber-200 bg-amber-50 text-amber-950/90'}`}>
            <strong className={textPrimary(theme)}>产品说明：</strong>
            技能包与数据集<strong className={textPrimary(theme)}>不提供</strong>与 Agent/MCP 相同的统一网关{' '}
            <span className="font-mono">/invoke</span>。技能通过{' '}
            <span className="font-mono">resolve</span> 与制品下载使用；数据集以目录与{' '}
            <span className="font-mono">resolve</span> 元数据为主。默认已取消勾选 invoke，避免误解审批范围。
          </p>
        )}

        <div>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
            <label className={`text-xs font-semibold ${textSecondary(theme)}`}>
              我的 API Key <span className="text-rose-500">*</span>
            </label>
            <button
              type="button"
              onClick={goCreateUserApiKey}
              className={`inline-flex items-center gap-1 text-xs font-medium ${
                isDark ? 'text-neutral-300 hover:text-neutral-300' : 'text-neutral-900 hover:text-neutral-800'
              }`}
            >
              <ExternalLink size={12} />
              去偏好设置创建
            </button>
          </div>
          {keysLoading ? (
            <div className="py-1"><PageSkeleton type="table" rows={2} /></div>
          ) : keysError ? (
            <p className="text-xs text-rose-500 mb-2">{keysError}</p>
          ) : null}
          {!keysLoading && myKeys.length === 0 && !keysError ? (
            <p className={`text-xs mb-2 ${textMuted(theme)}`}>
              暂无 Key，请先点击「去偏好设置创建」。
            </p>
          ) : null}
          <LantuSelect
            theme={theme}
            value={apiKeyId}
            onChange={setApiKeyId}
            options={keySelectOptions}
            placeholder="从列表选择 Key"
            disabled={keysLoading}
          />
          <p className={`mt-1.5 text-xs ${textMuted(theme)}`}>
            或手动填写 Key 的 id（须与上表某条记录一致）
          </p>
          <input
            className={`${nativeInputClass(theme)} mt-1 font-mono text-xs`}
            placeholder="手动粘贴 apiKey id"
            value={apiKeyId}
            onChange={(e) => setApiKeyId(e.target.value)}
          />
        </div>

        <div>
          <label className={`text-xs font-semibold block mb-1.5 ${textSecondary(theme)}`}>
            申请操作权限 <span className="text-rose-500">*</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {ACTION_OPTIONS.map((opt) => {
              const checked = actions.includes(opt.value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  className={`rounded-lg border px-2.5 py-1.5 text-xs transition-colors ${
                    checked
                      ? 'border-neutral-900 bg-neutral-900/10 text-neutral-800'
                      : isDark
                        ? 'border-white/10 text-slate-300 hover:bg-white/[0.06]'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                  onClick={() => {
                    setActions((prev) =>
                      prev.includes(opt.value)
                        ? prev.filter((a) => a !== opt.value)
                        : [...prev, opt.value],
                    );
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className={`text-xs font-semibold block mb-1.5 ${textSecondary(theme)}`}>
            使用场景说明
          </label>
          <AutoHeightTextarea
            minRows={3}
            maxRows={14}
            className={`${nativeInputClass(theme)} resize-none`}
            placeholder="简要描述使用场景和目的（可选）"
            value={useCase}
            onChange={(e) => setUseCase(e.target.value)}
          />
        </div>

        <div>
          <label className={`text-xs font-semibold block mb-1.5 ${textSecondary(theme)}`}>
            期望过期时间
          </label>
          <LantuDateTimePicker
            theme={theme}
            mode="datetime"
            value={expiresAt}
            onChange={setExpiresAt}
            ariaLabel="期望过期时间"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className={btnSecondary(theme)} onClick={onClose}>
            取消
          </button>
          <button type="button" className={btnPrimary} disabled={submitting} onClick={() => void handleSubmit()}>
            {submitting ? '提交中…' : '提交申请'}
          </button>
        </div>
      </div>
    </Modal>
  );
};
