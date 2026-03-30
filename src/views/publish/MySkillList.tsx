import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Wrench, X, Loader2 } from 'lucide-react';
import type { Theme, FontSize } from '../../types';
import {
  canvasBodyBg,
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
import { PublishResourceCard } from '../../components/business/PublishResourceCard';
import { userActivityService } from '../../api/services/user-activity.service';
import type { MyPublishItem } from '../../types/dto/user-activity';
import { buildPath } from '../../constants/consoleRoutes';

interface Props {
  theme: Theme;
  fontSize: FontSize;
}

export const MySkillList: React.FC<Props> = ({ theme }) => {
  const isDark = theme === 'dark';
  const navigate = useNavigate();
  const { showMessage } = useMessage();
  const [skills, setSkills] = useState<MyPublishItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [withdrawTarget, setWithdrawTarget] = useState<MyPublishItem | null>(null);
  const [viewTarget, setViewTarget] = useState<MyPublishItem | null>(null);

  const fetchData = useCallback(() => {
    setLoading(true);
    userActivityService
      .getMySkills()
      .then((data) => setSkills(data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleWithdraw = (skill: MyPublishItem) => {
    setSkills((prev) =>
      prev.map((s) => (s.id === skill.id ? { ...s, status: 'draft' as MyPublishItem['status'] } : s)),
    );
    setWithdrawTarget(null);
    showMessage(`已撤回「${skill.displayName}」的审核申请`, 'success');
  };

  return (
    <div className={`flex min-h-0 flex-1 flex-col overflow-hidden ${canvasBodyBg(theme)}`}>
      <div
        className={`z-20 flex shrink-0 items-center justify-between border-b px-4 py-4 sm:px-6 ${
          isDark ? 'border-white/[0.06]' : 'border-slate-100'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className={`rounded-xl p-2 ${isDark ? 'bg-purple-500/15' : 'bg-purple-50'}`}>
            <Wrench size={20} className={isDark ? 'text-purple-400' : 'text-purple-600'} />
          </div>
          <div>
            <h2 className={`text-lg font-bold ${textPrimary(theme)}`}>我的 Skill</h2>
            <p className={`text-sm ${textMuted(theme)}`}>管理您提交的技能，跟踪审核进度</p>
          </div>
        </div>
        <span
          className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
            isDark ? 'bg-white/5 text-slate-400' : 'border border-slate-100 bg-slate-50 text-slate-500'
          }`}
        >
          共 {skills.length} 个
        </span>
      </div>

      <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 size={32} className={`animate-spin ${textMuted(theme)}`} />
            <p className={`mt-3 text-sm ${textMuted(theme)}`}>加载中…</p>
          </div>
        ) : skills.length === 0 ? (
          <EmptyState
            title="暂无已提交的 Skill"
            description="创建并提交后，可在此查看审核进度与发布状态。"
            action={
              <button
                type="button"
                className={btnPrimary}
                onClick={() => navigate(buildPath('user', 'submit-skill'))}
              >
                去提交新 Skill
              </button>
            }
          />
        ) : (
          <AnimatedList className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {skills.map((skill) => (
              <PublishResourceCard
                key={skill.id}
                theme={theme}
                item={skill}
                onView={() => setViewTarget(skill)}
                onWithdraw={() => setWithdrawTarget(skill)}
              />
            ))}
          </AnimatedList>
        )}
      </div>

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
                >
                  <X size={18} className={textMuted(theme)} />
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
                  onClick={() => handleWithdraw(withdrawTarget)}
                  className="rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-amber-600"
                >
                  确认撤回
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Modal open={!!viewTarget} onClose={() => setViewTarget(null)} title="Skill 详情" theme={theme} size="lg">
        {viewTarget && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: '名称', value: viewTarget.displayName, bold: true },
                { label: '状态', value: null, badge: true },
                { label: '调用次数', value: String(viewTarget.callCount) },
                { label: '创建时间', value: viewTarget.createTime },
              ].map((item) => (
                <div key={item.label}>
                  <span className={`text-xs font-medium ${textMuted(theme)}`}>{item.label}</span>
                  {item.badge ? (
                    <div className="mt-1">
                      <span className={statusBadgeClass(viewTarget.status as DomainStatus, theme)}>
                        <span className={statusDot(viewTarget.status as DomainStatus)} />
                        {statusLabel(viewTarget.status as DomainStatus)}
                      </span>
                    </div>
                  ) : (
                    <p
                      className={`mt-0.5 text-sm ${item.bold ? `font-semibold ${textPrimary(theme)}` : textSecondary(theme)}`}
                    >
                      {item.value}
                    </p>
                  )}
                </div>
              ))}
            </div>
            <div>
              <span className={`text-xs font-medium ${textMuted(theme)}`}>描述</span>
              <p className={`mt-0.5 text-sm ${textSecondary(theme)}`}>{viewTarget.description}</p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
