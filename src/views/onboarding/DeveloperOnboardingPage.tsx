import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, LayoutDashboard, Send } from 'lucide-react';
import { PageSkeleton } from '../../components/common/PageSkeleton';
import { useAuthStore } from '../../stores/authStore';
import { useMessage } from '../../components/common/Message';
import { authService } from '../../api/services/auth.service';
import { developerApplicationService } from '../../api/services/developer-application.service';
import { tokenStorage } from '../../lib/security';
import { env } from '../../config/env';
import { defaultPath } from '../../constants/consoleRoutes';
import type { DeveloperApplicationCreateRequest, DeveloperApplicationVO } from '../../types/dto/developer-application';

function statusLabel(status: DeveloperApplicationVO['status']): string {
  if (status === 'pending') return '审核中';
  if (status === 'approved') return '已通过';
  if (status === 'rejected') return '已驳回';
  return '待处理';
}

function statusClass(status: DeveloperApplicationVO['status']): string {
  if (status === 'pending') return 'bg-amber-500/10 text-amber-500';
  if (status === 'approved') return 'bg-emerald-500/10 text-emerald-500';
  if (status === 'rejected') return 'bg-rose-500/10 text-rose-500';
  return 'bg-slate-500/10 text-slate-500';
}

export interface DeveloperOnboardingPageProps {
  /** true：嵌入 MainLayout 内容区，去掉全屏壳与重复入口按钮 */
  embedded?: boolean;
}

export const DeveloperOnboardingPage: React.FC<DeveloperOnboardingPageProps> = ({ embedded = false }) => {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { showMessage } = useMessage();

  const [loadingMine, setLoadingMine] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [mine, setMine] = useState<DeveloperApplicationVO | null>(null);
  const [form, setForm] = useState<DeveloperApplicationCreateRequest>({
    contactEmail: user?.email ?? '',
    contactPhone: user?.phone ?? '',
    companyName: '',
    applyReason: '',
  });

  useEffect(() => {
    let cancelled = false;
    setLoadingMine(true);
    developerApplicationService
      .getMine()
      .then((data) => {
        if (!cancelled) setMine(data);
      })
      .catch(() => {
        if (!cancelled) setMine(null);
      })
      .finally(() => {
        if (!cancelled) setLoadingMine(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const canSubmit = useMemo(() => {
    if (!form.contactEmail.trim() || !form.applyReason.trim()) return false;
    if (!mine) return true;
    return mine.status === 'rejected' || mine.status === 'unknown';
  }, [form.contactEmail, form.applyReason, mine]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    try {
      await developerApplicationService.create({
        contactEmail: form.contactEmail.trim(),
        contactPhone: form.contactPhone?.trim() || undefined,
        companyName: form.companyName?.trim() || undefined,
        applyReason: form.applyReason.trim(),
      });
      const latest = await developerApplicationService.getMine();
      setMine(latest);
      showMessage('入驻申请已提交，请等待审核', 'success');
    } catch (err) {
      showMessage(err instanceof Error ? err.message : '提交失败，请稍后重试', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const shellCls = embedded
    ? 'flex-1 min-h-0 p-4 sm:p-5'
    : 'min-h-screen bg-slate-50 p-4 dark:bg-lantu-canvas sm:p-6';

  return (
    <div className={shellCls}>
      <div className="mx-auto w-full max-w-3xl">
        <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/[0.06] dark:bg-lantu-card">
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">开发者入驻申请</h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            消费者（及尚未赋权的账号）可在此申请成为开发者。通过后，你将获得五类资源的登记、维护及与自身资源相关的审核与发布流程；未通过前仍可使用已上架资源与个人 API Key 等消费侧能力。
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/[0.06] dark:bg-lantu-card">
          {loadingMine ? (
            <PageSkeleton type="form" />
          ) : (
            <>
              {mine && (
                <div className="mb-5 rounded-xl border border-slate-200 p-4 dark:border-white/[0.08]">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-300">当前申请状态</span>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusClass(mine.status)}`}>
                      {statusLabel(mine.status)}
                    </span>
                  </div>
                  {mine.reviewComment && (
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">审核意见：{mine.reviewComment}</p>
                  )}
                </div>
              )}

              <form className="space-y-4" onSubmit={onSubmit}>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">联系邮箱</label>
                  <input
                    value={form.contactEmail}
                    onChange={(e) => setForm((prev) => ({ ...prev, contactEmail: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-neutral-700 dark:border-white/[0.08] dark:bg-white/[0.02] dark:text-slate-100"
                    placeholder="请输入可联系邮箱"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">联系电话（可选）</label>
                  <input
                    value={form.contactPhone ?? ''}
                    onChange={(e) => setForm((prev) => ({ ...prev, contactPhone: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-neutral-700 dark:border-white/[0.08] dark:bg-white/[0.02] dark:text-slate-100"
                    placeholder="请输入联系电话"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">单位/组织（可选）</label>
                  <input
                    value={form.companyName ?? ''}
                    onChange={(e) => setForm((prev) => ({ ...prev, companyName: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-neutral-700 dark:border-white/[0.08] dark:bg-white/[0.02] dark:text-slate-100"
                    placeholder="请输入单位或组织名称"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">申请原因</label>
                  <textarea
                    value={form.applyReason}
                    onChange={(e) => setForm((prev) => ({ ...prev, applyReason: e.target.value }))}
                    className="h-32 w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-neutral-700 dark:border-white/[0.08] dark:bg-white/[0.02] dark:text-slate-100"
                    placeholder="请说明你的使用场景、计划与预期收益"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="submit"
                    disabled={!canSubmit || submitting}
                    className="inline-flex items-center gap-2 rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                    提交申请
                  </button>
                  {!embedded && (
                    <>
                      <button
                        type="button"
                        onClick={() => navigate(defaultPath())}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-800 dark:border-white/[0.1] dark:text-slate-100"
                      >
                        <LayoutDashboard size={16} />
                        进入工作台（浏览资源与设置）
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          const accessToken = tokenStorage.get(env.VITE_TOKEN_KEY) ?? useAuthStore.getState().token;
                          try {
                            if (accessToken) await authService.logout(accessToken);
                          } catch {
                            /* still exit locally */
                          }
                          logout();
                          window.location.hash = '#/login';
                        }}
                        className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 dark:border-white/[0.1] dark:text-slate-300"
                      >
                        退出登录
                      </button>
                    </>
                  )}
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
